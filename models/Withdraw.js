const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please enter a withdrawal amount'],
      min: 1,
    },
    status: {
      type: String,
      enum: ['Processing', 'Approved', 'Rejected'],
      default: 'Processing',
    },
    bankDetails: {
      accountHolder: String,
      bankName: String,
      accountNumber: String,
    },
    adminNote: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Withdraw', withdrawSchema);
