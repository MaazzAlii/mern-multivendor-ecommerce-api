const mongoose = require('mongoose');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const PlatformSettings = require('../models/PlatformSettings');
const getStripe = require('../utils/stripe');
const sendEmail = require('../utils/mailer');

const SHIPPING_FLAT_RATE = 150;

/**
 * Groups cart items by shop and computes per-shop pricing.
 * Throws (via ErrorHandler passed to next) if any product is missing or under-stocked.
 */
async function buildShopGroups(items, next) {
  const groups = new Map(); // shopId -> { items: [...], itemsPrice }

  for (const cartItem of items) {
    const product = await Product.findById(cartItem.productId);
    if (!product) {
      next(new ErrorHandler(`Product not found: ${cartItem.productId}`, 404));
      return null;
    }
    if (product.stock < cartItem.quantity) {
      next(new ErrorHandler(`Insufficient stock for "${product.name}"`, 400));
      return null;
    }

    const shopId = product.shop.toString();
    if (!groups.has(shopId)) {
      groups.set(shopId, { items: [], itemsPrice: 0 });
    }

    const group = groups.get(shopId);
    const lineTotal = product.discountPrice * cartItem.quantity;
    group.items.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0] || '',
      quantity: cartItem.quantity,
      price: product.discountPrice,
    });
    group.itemsPrice += lineTotal;
  }

  return groups;
}

// @desc    Checkout the cart. Splits items across shops into one Order per shop,
//          sharing a checkoutGroupId. Supports Cash On Delivery (immediate) or
//          Card (creates a single Stripe Checkout Session covering every shop).
// @route   POST /api/v1/checkout
// @access  Private
exports.checkout = catchAsyncErrors(async (req, res, next) => {
  const { items, shippingAddress, paymentMethod, couponCode } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return next(new ErrorHandler('items array is required', 400));
  }
  if (!shippingAddress?.address1 || !shippingAddress?.city || !shippingAddress?.zipCode || !shippingAddress?.country) {
    return next(new ErrorHandler('A complete shippingAddress is required', 400));
  }
  if (!['Card', 'Cash On Delivery'].includes(paymentMethod)) {
    return next(new ErrorHandler('paymentMethod must be "Card" or "Cash On Delivery"', 400));
  }

  const groups = await buildShopGroups(items, next);
  if (groups === null) return; // buildShopGroups already responded with an error

  // Coupons are validated and applied server-side only — the client sends just the
  // code, never a discount amount, so a buyer can't manipulate what gets charged.
  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ name: couponCode.toUpperCase(), isActive: true });
    if (!coupon) return next(new ErrorHandler('Invalid or expired coupon code', 400));
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      return next(new ErrorHandler('This coupon has expired', 400));
    }
    const shopKey = coupon.shop.toString();
    if (!groups.has(shopKey)) {
      return next(new ErrorHandler('This coupon does not apply to any shop in your cart', 400));
    }
    const group = groups.get(shopKey);
    if (group.itemsPrice < coupon.minAmount) {
      return next(new ErrorHandler(`This coupon requires a minimum order of Rs ${coupon.minAmount}`, 400));
    }
  }

  const checkoutGroupId = new mongoose.Types.ObjectId().toString();
  const createdOrders = [];

  for (const [shopId, group] of groups.entries()) {
    const shippingPrice = SHIPPING_FLAT_RATE;
    let discountAmount = 0;
    let appliedCouponCode;

    if (coupon && shopId === coupon.shop.toString()) {
      discountAmount = Math.round(group.itemsPrice * (coupon.discountPercent / 100));
      if (coupon.maxAmount) discountAmount = Math.min(discountAmount, coupon.maxAmount);
      appliedCouponCode = coupon.name;

      // Spread the discount proportionally across each line item so the amount
      // charged via Stripe (computed from these same items below) matches exactly.
      const ratio = discountAmount / group.itemsPrice;
      group.items = group.items.map((item) => ({ ...item, price: Math.round(item.price * (1 - ratio) * 100) / 100 }));
    }

    const totalPrice = group.itemsPrice - discountAmount + shippingPrice;

    // Platform Commission: Commission applies to net itemsPrice (after coupon). Shipping passes through to seller untouched.
    const settings = await PlatformSettings.getSettings();
    const commissionAmount = Math.round((group.itemsPrice - discountAmount) * (settings.commissionPercent / 100));
    const sellerEarnings = group.itemsPrice - discountAmount - commissionAmount + shippingPrice;

    const order = await Order.create({
      checkoutGroupId,
      buyer: req.user.id,
      shop: shopId,
      items: group.items,
      shippingAddress,
      itemsPrice: group.itemsPrice,
      shippingPrice,
      totalPrice,
      couponCode: appliedCouponCode,
      discountAmount,
      commissionAmount,
      sellerEarnings,
      paymentInfo: { method: paymentMethod, status: 'Not Paid' },
    });
    createdOrders.push(order);
  }

  if (paymentMethod === 'Cash On Delivery') {
    // No payment gate — reduce stock immediately.
    for (const group of groups.values()) {
      for (const item of group.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity, soldOut: item.quantity },
        });
      }
    }

    for (const order of createdOrders) {
      sendEmail({
        to: req.user.email,
        subject: `Order Placed Successfully (#${order._id})`,
        html: `
          <h1>Order Confirmation</h1>
          <p>Hi ${req.user.name},</p>
          <p>Your Cash On Delivery order <strong>#${order._id}</strong> has been successfully placed!</p>
          <p><strong>Total Amount:</strong> Rs ${order.totalPrice}</p>
          <p>Thank you for shopping with us!</p>
        `,
      });
    }
    return res.status(201).json({ success: true, checkoutGroupId, orders: createdOrders });
  }

  // Card payment: create ONE Stripe Checkout Session covering every shop's items.
  const stripe = getStripe();
  const currency = process.env.STRIPE_CURRENCY || 'pkr';
  const lineItems = [];
  for (const group of groups.values()) {
    for (const item of group.items) {
      lineItems.push({
        price_data: {
          currency,
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      });
    }
    lineItems.push({
      price_data: {
        currency,
        product_data: { name: 'Shipping' },
        unit_amount: Math.round(SHIPPING_FLAT_RATE * 100),
      },
      quantity: 1,
    });
  }

  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  let clientUrl = origin || process.env.CLIENT_URL || 'http://localhost:5173';
  if (!clientUrl.startsWith('http://') && !clientUrl.startsWith('https://')) {
    clientUrl = `https://${clientUrl}`;
  }
  clientUrl = clientUrl.replace(/\/+$/, '');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    metadata: { checkoutGroupId },
    success_url: `${clientUrl}/order-success?checkoutGroupId=${checkoutGroupId}`,
    cancel_url: `${clientUrl}/checkout`,
  });

  await Order.updateMany({ checkoutGroupId }, { 'paymentInfo.stripeSessionId': session.id });

  res.status(201).json({ success: true, checkoutGroupId, stripeUrl: session.url });
});

// @desc    Stripe webhook — marks orders paid and decrements stock once payment is confirmed.
// @route   POST /api/v1/webhook/stripe
// @access  Public (verified via Stripe signature)
exports.stripeWebhook = catchAsyncErrors(async (req, res, next) => {
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return next(new ErrorHandler(`Webhook signature verification failed: ${err.message}`, 400));
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { checkoutGroupId } = session.metadata;

    const orders = await Order.find({ checkoutGroupId, 'paymentInfo.status': 'Not Paid' }).populate('buyer', 'name email');

    for (const order of orders) {
      order.paymentInfo.status = 'Paid';
      order.paymentInfo.stripePaymentIntentId = session.payment_intent;
      order.paidAt = new Date();
      await order.save();

      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity, soldOut: item.quantity },
        });
      }

      if (order.buyer && order.buyer.email) {
        sendEmail({
          to: order.buyer.email,
          subject: `Payment Confirmed & Order Placed (#${order._id})`,
          html: `
            <h1>Payment Confirmation</h1>
            <p>Hi ${order.buyer.name || 'Customer'},</p>
            <p>Payment for order <strong>#${order._id}</strong> has been confirmed!</p>
            <p><strong>Total Paid:</strong> Rs ${order.totalPrice}</p>
            <p>Thank you for shopping with us!</p>
          `,
        });
      }
    }
  }

  res.status(200).json({ received: true });
});

// @desc    Get all orders from one checkout (used on the order-success page)
// @route   GET /api/v1/orders/group/:checkoutGroupId
// @access  Private
exports.getOrdersByGroup = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ checkoutGroupId: req.params.checkoutGroupId, buyer: req.user.id }).populate(
    'shop',
    'name'
  );
  res.status(200).json({ success: true, orders });
});

// @desc    Get the logged-in buyer's orders
// @route   GET /api/v1/orders/me
// @access  Private
exports.myOrders = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find({ buyer: req.user.id }).populate('shop', 'name').sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: orders.length, orders });
});

// @desc    Get orders for the logged-in seller's shop
// @route   GET /api/v1/orders/shop
// @access  Private/Seller
exports.getShopOrders = catchAsyncErrors(async (req, res, next) => {
  const Shop = require('../models/Shop');
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('You have not created a shop yet', 404));
  }

  const orders = await Order.find({ shop: shop._id }).populate('buyer', 'name email').sort({ createdAt: -1 });
  const revenue = orders
    .filter((o) => o.paymentInfo.status === 'Paid' || o.paymentInfo.method === 'Cash On Delivery')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  res.status(200).json({ success: true, count: orders.length, revenue, orders });
});

// @desc    Update order status (seller of that order's shop only)
// @route   PUT /api/v1/order/:id/status
// @access  Private/Seller
exports.updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
  const { status } = req.body;
  if (!['Processing', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
    return next(new ErrorHandler('Invalid status value', 400));
  }

  const Shop = require('../models/Shop');
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ErrorHandler('Order not found', 404));
  }

  const shop = await Shop.findById(order.shop);
  if (!shop || shop.owner.toString() !== req.user.id) {
    return next(new ErrorHandler('Not authorized to update this order', 403));
  }

  order.status = status;
  if (status === 'Delivered') {
    order.deliveredAt = new Date();
    if (order.paymentInfo.method === 'Cash On Delivery') {
      order.paymentInfo.status = 'Paid';
      order.paidAt = new Date();
    }
  }
  await order.save();

  await order.populate('buyer', 'name email');
  if (order.buyer && order.buyer.email) {
    if (status === 'Shipped') {
      sendEmail({
        to: order.buyer.email,
        subject: `Your Order Has Shipped! (#${order._id})`,
        html: `
          <h1>Order Shipped</h1>
          <p>Hi ${order.buyer.name || 'Customer'},</p>
          <p>Great news! Your order <strong>#${order._id}</strong> has been shipped and is on its way to you.</p>
        `,
      });
    } else if (status === 'Delivered') {
      sendEmail({
        to: order.buyer.email,
        subject: `Your Order Has Been Delivered! (#${order._id})`,
        html: `
          <h1>Order Delivered</h1>
          <p>Hi ${order.buyer.name || 'Customer'},</p>
          <p>Your order <strong>#${order._id}</strong> has been successfully delivered. Enjoy your purchase!</p>
        `,
      });
    }
  }

  res.status(200).json({ success: true, order });
});

// @desc    Get all orders platform-wide (admin)
// @route   GET /api/v1/admin/orders
// @access  Private/Admin
exports.getAllOrdersAdmin = catchAsyncErrors(async (req, res, next) => {
  const orders = await Order.find().populate('buyer', 'name email').populate('shop', 'name').sort({ createdAt: -1 });
  const totalRevenue = orders
    .filter((o) => o.paymentInfo.status === 'Paid')
    .reduce((sum, o) => sum + o.totalPrice, 0);

  res.status(200).json({ success: true, count: orders.length, totalRevenue, orders });
});

// @desc    Cancel an order (buyer only, when in Processing status)
// @route   PUT /api/v1/order/:id/cancel
// @access  Private
exports.cancelOrder = catchAsyncErrors(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(new ErrorHandler('Order not found', 404));
  }

  if (order.buyer.toString() !== req.user.id) {
    return next(new ErrorHandler('Not authorized to cancel this order', 403));
  }

  if (order.status !== 'Processing') {
    return next(
      new ErrorHandler(
        'Order can only be cancelled while in Processing status. Request a return instead if already shipped.',
        400
      )
    );
  }

  order.status = 'Cancelled';

  // Restore stock for cancelled items
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, soldOut: -item.quantity },
    });
  }

  await order.save();
  res.status(200).json({ success: true, order });
});

// @desc    Get shop analytics (revenue over time, top products, order status breakdown)
// @route   GET /api/v1/analytics/shop
// @access  Private/Seller
exports.getShopAnalytics = catchAsyncErrors(async (req, res, next) => {
  const Shop = require('../models/Shop');
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('You have not created a shop yet', 404));
  }

  const days = Math.max(1, parseInt(req.query.days, 10) || 30);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const shopId = shop._id;

  const revenueOverTime = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        createdAt: { $gte: startDate },
        status: { $ne: 'Cancelled' },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        revenue: 1,
        orders: 1,
      },
    },
  ]);

  const topProducts = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        createdAt: { $gte: startDate },
        status: { $ne: 'Cancelled' },
      },
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 0,
        name: '$_id',
        unitsSold: 1,
        revenue: 1,
      },
    },
  ]);

  const statusCounts = await Order.aggregate([
    {
      $match: {
        shop: shopId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const statusBreakdown = {
    Processing: 0,
    Shipped: 0,
    Delivered: 0,
    Cancelled: 0,
  };
  for (const item of statusCounts) {
    if (item._id) {
      statusBreakdown[item._id] = item.count;
    }
  }

  res.status(200).json({
    success: true,
    revenueOverTime,
    topProducts,
    statusBreakdown,
  });
});
