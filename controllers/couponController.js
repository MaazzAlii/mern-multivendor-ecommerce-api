const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Coupon = require('../models/Coupon');
const Shop = require('../models/Shop');

const getMyShop = async (userId) => {
  const shop = await Shop.findOne({ owner: userId });
  return shop;
};

// @desc    Create a coupon for the logged-in seller's shop
// @route   POST /api/v1/coupon/new
// @access  Private/Seller
exports.createCoupon = catchAsyncErrors(async (req, res, next) => {
  const shop = await getMyShop(req.user.id);
  if (!shop) return next(new ErrorHandler('Create your shop before adding a coupon', 400));

  const existing = await Coupon.findOne({ name: req.body.name?.toUpperCase() });
  if (existing) return next(new ErrorHandler('A coupon with this code already exists', 400));

  const coupon = await Coupon.create({ ...req.body, shop: shop._id });
  res.status(201).json({ success: true, coupon });
});

// @desc    Get all coupons for the logged-in seller's shop
// @route   GET /api/v1/coupons/mine
// @access  Private/Seller
exports.getMyCoupons = catchAsyncErrors(async (req, res, next) => {
  const shop = await getMyShop(req.user.id);
  if (!shop) return next(new ErrorHandler('You have not created a shop yet', 404));

  const coupons = await Coupon.find({ shop: shop._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, coupons });
});

// @desc    Delete a coupon (owner only)
// @route   DELETE /api/v1/coupon/:id
// @access  Private/Seller
exports.deleteCoupon = catchAsyncErrors(async (req, res, next) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) return next(new ErrorHandler('Coupon not found', 404));

  const shop = await getMyShop(req.user.id);
  if (!shop || String(coupon.shop) !== String(shop._id)) {
    return next(new ErrorHandler('You are not allowed to delete this coupon', 403));
  }

  await coupon.deleteOne();
  res.status(200).json({ success: true, message: 'Coupon deleted' });
});

// @desc    Validate a coupon code against a shop + cart amount (used at checkout)
// @route   GET /api/v1/coupon/value/:name
// @access  Public
exports.getCouponValue = catchAsyncErrors(async (req, res, next) => {
  const coupon = await Coupon.findOne({ name: req.params.name.toUpperCase(), isActive: true });
  if (!coupon) return next(new ErrorHandler('Invalid or expired coupon code', 404));

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return next(new ErrorHandler('This coupon has expired', 400));
  }

  res.status(200).json({ success: true, coupon });
});
