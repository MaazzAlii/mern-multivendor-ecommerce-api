const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // A single checkout that spans multiple shops is split into one Order document
    // per shop, all sharing the same checkoutGroupId so they can be displayed together.
    checkoutGroupId: {
      type: String,
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      address1: { type: String, required: true },
      address2: String,
      city: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Processing',
    },
    paymentInfo: {
      method: { type: String, enum: ['Card', 'Cash On Delivery'], required: true },
      status: { type: String, enum: ['Paid', 'Not Paid'], default: 'Not Paid' },
      stripeSessionId: { type: String },
      stripePaymentIntentId: { type: String },
    },
    paidAt: Date,
    deliveredAt: Date,
    couponCode: {
      type: String,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    commissionAmount: {
      type: Number,
      default: 0,
    },
    sellerEarnings: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
