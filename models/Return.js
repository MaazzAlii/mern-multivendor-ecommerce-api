const mongoose = require('mongoose');

const returnSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      required: [true, 'Please enter a reason for the return'],
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Rejected', 'Refunded'],
      default: 'Requested',
    },
    sellerNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Return', returnSchema);
