const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const User = require('../models/User');

// @desc    Get all shops
// @route   GET /api/v1/shops
// @access  Public
exports.getAllShops = catchAsyncErrors(async (req, res, next) => {
  const shops = await Shop.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: shops.length, shops });
});

// @desc    Get a single shop with its products
// @route   GET /api/v1/shop/:id
// @access  Public
exports.getShopDetails = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findById(req.params.id);
  if (!shop) {
    return next(new ErrorHandler('Shop not found', 404));
  }

  const products = await Product.find({ shop: shop._id, isActive: true }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, shop, products });
});

// @desc    Create a shop for the logged-in seller (one per seller)
// @route   POST /api/v1/shop/new
// @access  Private/Seller
exports.createShop = catchAsyncErrors(async (req, res, next) => {
  const { name, description, address, logoUrl } = req.body;

  if (!name) {
    return next(new ErrorHandler('Shop name is required', 400));
  }

  const existing = await Shop.findOne({ owner: req.user.id });
  if (existing) {
    return next(new ErrorHandler('You already have a shop', 400));
  }

  const shop = await Shop.create({ name, description, address, logoUrl, owner: req.user.id });

  await User.findByIdAndUpdate(req.user.id, { shop: shop._id });

  res.status(201).json({ success: true, shop });
});

// @desc    Get the logged-in seller's own shop
// @route   GET /api/v1/shop/mine
// @access  Private/Seller
exports.getMyShop = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('You have not created a shop yet', 404));
  }
  res.status(200).json({ success: true, shop });
});

// @desc    Update the logged-in seller's shop
// @route   PUT /api/v1/shop/mine
// @access  Private/Seller
exports.updateMyShop = catchAsyncErrors(async (req, res, next) => {
  let shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('You have not created a shop yet', 404));
  }
  shop = await Shop.findByIdAndUpdate(shop._id, req.body, { new: true, runValidators: true });
  res.status(200).json({ success: true, shop });
});
