const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Withdraw = require('../models/Withdraw');
const Shop = require('../models/Shop');
const Order = require('../models/Order');

// @desc    Request a withdrawal of shop earnings
// @route   POST /api/v1/withdraw/new
// @access  Private/Seller
exports.createWithdrawRequest = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) return next(new ErrorHandler('You have not created a shop yet', 404));

  const { amount, bankDetails } = req.body;
  if (!amount || amount <= 0) {
    return next(new ErrorHandler('Please enter a valid withdrawal amount', 400));
  }

  // Available balance = revenue from delivered/paid orders minus amounts already
  // requested (Processing or Approved), so a seller can't over-withdraw.
  const deliveredOrders = await Order.find({ shop: shop._id, status: 'Delivered' });
  const totalEarnings = deliveredOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  const priorWithdrawals = await Withdraw.find({ shop: shop._id, status: { $in: ['Processing', 'Approved'] } });
  const alreadyWithdrawn = priorWithdrawals.reduce((sum, w) => sum + w.amount, 0);

  const available = totalEarnings - alreadyWithdrawn;
  if (amount > available) {
    return next(new ErrorHandler(`Requested amount exceeds available balance (${available.toFixed(2)})`, 400));
  }

  const withdraw = await Withdraw.create({
    seller: req.user.id,
    shop: shop._id,
    amount,
    bankDetails,
  });

  res.status(201).json({ success: true, withdraw });
});

// @desc    Get the logged-in seller's withdrawal history + available balance
// @route   GET /api/v1/withdraws/mine
// @access  Private/Seller
exports.getMyWithdrawals = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) return next(new ErrorHandler('You have not created a shop yet', 404));

  const deliveredOrders = await Order.find({ shop: shop._id, status: 'Delivered' });
  const totalEarnings = deliveredOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  const withdrawals = await Withdraw.find({ shop: shop._id }).sort({ createdAt: -1 });
  const alreadyWithdrawn = withdrawals
    .filter((w) => w.status !== 'Rejected')
    .reduce((sum, w) => sum + w.amount, 0);

  res.status(200).json({
    success: true,
    withdrawals,
    totalEarnings,
    availableBalance: totalEarnings - alreadyWithdrawn,
  });
});

// @desc    Get all withdrawal requests across the platform
// @route   GET /api/v1/admin/withdraws
// @access  Private/Admin
exports.getAllWithdrawals = catchAsyncErrors(async (req, res, next) => {
  const withdrawals = await Withdraw.find()
    .populate('shop', 'name')
    .populate('seller', 'name email')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, withdrawals });
});

// @desc    Approve or reject a withdrawal request
// @route   PUT /api/v1/admin/withdraw/:id
// @access  Private/Admin
exports.updateWithdrawStatus = catchAsyncErrors(async (req, res, next) => {
  const { status, adminNote } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) {
    return next(new ErrorHandler('Status must be Approved or Rejected', 400));
  }

  const withdraw = await Withdraw.findById(req.params.id);
  if (!withdraw) return next(new ErrorHandler('Withdrawal request not found', 404));

  withdraw.status = status;
  if (adminNote) withdraw.adminNote = adminNote;
  await withdraw.save();

  res.status(200).json({ success: true, withdraw });
});
