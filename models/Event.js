const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter the event name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please enter a description'],
    },
    category: {
      type: String,
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
      required: [true, 'Please enter the event (deal) price'],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [{ type: String }],
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    // Optionally link back to the source product so stock/orders can be reconciled
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: [true, 'Please set when the event ends'],
    },
    soldOut: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// An event is "running" only while now is between startDate and endDate
eventSchema.virtual('status').get(function () {
  const now = Date.now();
  if (now < this.startDate.getTime()) return 'Upcoming';
  if (now > this.endDate.getTime()) return 'Ended';
  return 'Running';
});

eventSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);
