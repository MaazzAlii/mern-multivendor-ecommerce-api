const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Order = require('../models/Order');

// @desc    Platform-wide dashboard stats
// @route   GET /api/v1/admin/stats
// @access  Private/Admin
exports.getDashboardStats = catchAsyncErrors(async (req, res, next) => {
  const [userCount, sellerCount, shopCount, productCount, orderCount, paidOrders] = await Promise.all([
    User.countDocuments({ role: 'buyer' }),
    User.countDocuments({ role: 'seller' }),
    Shop.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.find({ 'paymentInfo.status': 'Paid' }),
  ]);

  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  res.status(200).json({
    success: true,
    stats: { userCount, sellerCount, shopCount, productCount, orderCount, totalRevenue },
  });
});

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private/Admin
exports.getAllUsers = catchAsyncErrors(async (req, res, next) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: users.length, users });
});

// @desc    Delete a user
// @route   DELETE /api/v1/admin/user/:id
// @access  Private/Admin
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }
  await user.deleteOne();
  res.status(200).json({ success: true, message: 'User deleted successfully' });
});

// @desc    Get all shops
// @route   GET /api/v1/admin/shops
// @access  Private/Admin
exports.getAllShopsAdmin = catchAsyncErrors(async (req, res, next) => {
  const shops = await Shop.find().populate('owner', 'name email').sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: shops.length, shops });
});

// @desc    Delete a shop (also removes its products)
// @route   DELETE /api/v1/admin/shop/:id
// @access  Private/Admin
exports.deleteShopAdmin = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findById(req.params.id);
  if (!shop) {
    return next(new ErrorHandler('Shop not found', 404));
  }
  await Product.deleteMany({ shop: shop._id });
  await shop.deleteOne();
  res.status(200).json({ success: true, message: 'Shop and its products deleted successfully' });
});

// @desc    Get all products platform-wide
// @route   GET /api/v1/admin/products
// @access  Private/Admin
exports.getAllProductsAdmin = catchAsyncErrors(async (req, res, next) => {
  const products = await Product.find().populate('shop', 'name').sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: products.length, products });
});

const PlatformSettings = require('../models/PlatformSettings');

// @desc    Get platform settings
// @route   GET /api/v1/admin/settings
// @access  Private/Admin
exports.getPlatformSettings = catchAsyncErrors(async (req, res, next) => {
  const settings = await PlatformSettings.getSettings();
  res.status(200).json({ success: true, settings });
});

// @desc    Update platform settings
// @route   PUT /api/v1/admin/settings
// @access  Private/Admin
exports.updatePlatformSettings = catchAsyncErrors(async (req, res, next) => {
  const { commissionPercent } = req.body;
  if (commissionPercent === undefined || commissionPercent < 0 || commissionPercent > 100) {
    return next(new ErrorHandler('commissionPercent must be a number between 0 and 100', 400));
  }

  let settings = await PlatformSettings.getSettings();
  settings.commissionPercent = commissionPercent;
  await settings.save();

  res.status(200).json({ success: true, settings });
});
