const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Return = require('../models/Return');
const Order = require('../models/Order');
const Shop = require('../models/Shop');

// @desc    Request a return for a delivered order
// @route   POST /api/v1/return/new
// @access  Private
exports.requestReturn = catchAsyncErrors(async (req, res, next) => {
  const { orderId, reason } = req.body;

  if (!orderId || !reason) {
    return next(new ErrorHandler('orderId and reason are required', 400));
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return next(new ErrorHandler('Order not found', 404));
  }

  if (order.buyer.toString() !== req.user.id) {
    return next(new ErrorHandler('Not authorized to request a return for this order', 403));
  }

  if (order.status !== 'Delivered') {
    return next(new ErrorHandler('Returns can only be requested for delivered orders', 400));
  }

  const returnDoc = await Return.create({
    order: order._id,
    buyer: req.user.id,
    reason,
  });

  res.status(201).json({ success: true, return: returnDoc });
});

// @desc    Get buyer's own return requests
// @route   GET /api/v1/returns/mine
// @access  Private
exports.getMyReturns = catchAsyncErrors(async (req, res, next) => {
  const returns = await Return.find({ buyer: req.user.id })
    .populate({ path: 'order', populate: { path: 'shop', select: 'name' } })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: returns.length, returns });
});

// @desc    Get returns for seller's shop
// @route   GET /api/v1/returns/shop
// @access  Private/Seller
exports.getShopReturns = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('You have not created a shop yet', 404));
  }

  const shopOrders = await Order.find({ shop: shop._id }).select('_id');
  const orderIds = shopOrders.map((o) => o._id);

  const returns = await Return.find({ order: { $in: orderIds } })
    .populate('buyer', 'name email')
    .populate('order')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: returns.length, returns });
});

// @desc    Get all return requests platform-wide (Admin)
// @route   GET /api/v1/admin/returns
// @access  Private/Admin
exports.getAllReturns = catchAsyncErrors(async (req, res, next) => {
  const returns = await Return.find()
    .populate('buyer', 'name email')
    .populate({ path: 'order', populate: { path: 'shop', select: 'name' } })
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: returns.length, returns });
});

// @desc    Update return request status (Seller or Admin)
// @route   PUT /api/v1/return/:id
// @access  Private/Seller or Admin
exports.updateReturnStatus = catchAsyncErrors(async (req, res, next) => {
  const { status, sellerNote } = req.body;
  if (!['Approved', 'Rejected', 'Refunded'].includes(status)) {
    return next(new ErrorHandler('Invalid return status', 400));
  }

  const returnDoc = await Return.findById(req.params.id).populate('order');
  if (!returnDoc) {
    return next(new ErrorHandler('Return request not found', 404));
  }

  if (req.user.role !== 'admin') {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop || returnDoc.order.shop.toString() !== shop._id.toString()) {
      return next(new ErrorHandler('Not authorized to update this return request', 403));
    }
  }

  returnDoc.status = status;
  if (sellerNote !== undefined) returnDoc.sellerNote = sellerNote;

  await returnDoc.save();
  res.status(200).json({ success: true, return: returnDoc });
});
