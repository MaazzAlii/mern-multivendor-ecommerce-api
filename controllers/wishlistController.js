const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const User = require('../models/User');
const Product = require('../models/Product');

// @desc    Get the logged-in user's wishlist (populated with product data)
// @route   GET /api/v1/wishlist
// @access  Private
exports.getWishlist = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'wishlist',
    populate: { path: 'shop', select: 'name' },
  });
  res.status(200).json({ success: true, wishlist: user.wishlist });
});

// @desc    Add a product to the logged-in user's wishlist
// @route   POST /api/v1/wishlist/:productId
// @access  Private
exports.addToWishlist = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.productId);
  if (!product) return next(new ErrorHandler('Product not found', 404));

  const user = await User.findById(req.user.id);
  if (!user.wishlist.some((id) => String(id) === req.params.productId)) {
    user.wishlist.push(product._id);
    await user.save();
  }

  res.status(200).json({ success: true, wishlist: user.wishlist });
});

// @desc    Remove a product from the logged-in user's wishlist
// @route   DELETE /api/v1/wishlist/:productId
// @access  Private
exports.removeFromWishlist = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  user.wishlist = user.wishlist.filter((id) => String(id) !== req.params.productId);
  await user.save();
  res.status(200).json({ success: true, wishlist: user.wishlist });
});
