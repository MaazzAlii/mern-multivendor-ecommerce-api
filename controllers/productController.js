const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Order = require('../models/Order');

// @desc    Get all active products (supports ?keyword=, ?category=, ?shop=, ?page=, ?limit=, ?sort=, ?minPrice=, ?maxPrice=)
// @route   GET /api/v1/products
// @access  Public
exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const filter = { isActive: true };
  if (req.query.keyword) filter.name = { $regex: req.query.keyword, $options: 'i' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.shop) filter.shop = req.query.shop;

  if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
    filter.discountPrice = {};
    if (req.query.minPrice !== undefined && req.query.minPrice !== '') {
      filter.discountPrice.$gte = Number(req.query.minPrice);
    }
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== '') {
      filter.discountPrice.$lte = Number(req.query.maxPrice);
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limitParam = parseInt(req.query.limit, 10) || 12;
  const limit = Math.min(50, Math.max(1, limitParam));

  let sortOption = { createdAt: -1 };
  if (req.query.sort === 'price_asc') {
    sortOption = { discountPrice: 1 };
  } else if (req.query.sort === 'price_desc') {
    sortOption = { discountPrice: -1 };
  } else if (req.query.sort === 'rating') {
    sortOption = { ratings: -1 };
  } else if (req.query.sort === 'newest') {
    sortOption = { createdAt: -1 };
  }

  const totalCount = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalCount / limit);

  const products = await Product.find(filter)
    .populate('shop', 'name')
    .sort(sortOption)
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    success: true,
    products,
    page,
    totalPages,
    totalCount,
  });
});

// @desc    Get a single product
// @route   GET /api/v1/product/:id
// @access  Public
exports.getProductDetails = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('shop', 'name ratings');
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }

  const productObj = product.toObject();
  if (req.user?.role !== 'admin') {
    productObj.reviews = (productObj.reviews || []).filter((r) => !r.isHidden);
  }

  res.status(200).json({ success: true, product: productObj });
});

// @desc    Create a product under the logged-in seller's shop
// @route   POST /api/v1/product/new
// @access  Private/Seller
exports.createProduct = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('Create your shop before adding products', 400));
  }

  const product = await Product.create({ ...req.body, shop: shop._id });
  res.status(201).json({ success: true, product });
});

// @desc    Get all products belonging to the logged-in seller's shop
// @route   GET /api/v1/products/mine
// @access  Private/Seller
exports.getMyProducts = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) {
    return next(new ErrorHandler('You have not created a shop yet', 404));
  }
  const products = await Product.find({ shop: shop._id }).sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: products.length, products });
});

// @desc    Update a product (owner's shop only)
// @route   PUT /api/v1/product/:id
// @access  Private/Seller
exports.updateProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('shop', 'owner');
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }
  if (product.shop.owner.toString() !== req.user.id) {
    return next(new ErrorHandler('Not authorized to update this product', 403));
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, product: updated });
});

// @desc    Delete a product (owner's shop only)
// @route   DELETE /api/v1/product/:id
// @access  Private/Seller
exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const product = await Product.findById(req.params.id).populate('shop', 'owner');
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }
  if (product.shop.owner.toString() !== req.user.id) {
    return next(new ErrorHandler('Not authorized to delete this product', 403));
  }

  await product.deleteOne();
  res.status(200).json({ success: true, message: 'Product deleted successfully' });
});

// @desc    Add a review to a product. Only allowed if the buyer has a
//          Delivered order containing this product ("verified purchase").
// @route   POST /api/v1/product/:id/review
// @access  Private
exports.createReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating) {
    return next(new ErrorHandler('rating is required', 400));
  }

  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }

  const verifiedPurchase = await Order.findOne({
    buyer: req.user.id,
    status: 'Delivered',
    'items.product': product._id,
  });

  if (!verifiedPurchase) {
    return next(
      new ErrorHandler('You can only review products from orders that have been delivered to you', 403)
    );
  }

  const alreadyReviewed = product.reviews.find((r) => r.user.toString() === req.user.id);
  if (alreadyReviewed) {
    return next(new ErrorHandler('You have already reviewed this product', 400));
  }

  product.reviews.push({ user: req.user.id, name: req.user.name, rating, comment });
  product.ratings = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
  await product.save();

  res.status(201).json({ success: true, product });
});

// @desc    Get related products (same category first, top up with same shop)
// @route   GET /api/v1/product/:id/related
// @access  Public
exports.getRelatedProducts = catchAsyncErrors(async (req, res, next) => {
  const currentProduct = await Product.findById(req.params.id);
  if (!currentProduct) {
    return next(new ErrorHandler('Product not found', 404));
  }

  let products = await Product.find({
    _id: { $ne: currentProduct._id },
    category: currentProduct.category,
    isActive: true,
  })
    .populate('shop', 'name')
    .sort({ ratings: -1 })
    .limit(6);

  if (products.length < 6) {
    const existingIds = [currentProduct._id, ...products.map((p) => p._id)];
    const additionalCount = 6 - products.length;

    const shopProducts = await Product.find({
      _id: { $nin: existingIds },
      shop: currentProduct.shop,
      isActive: true,
    })
      .populate('shop', 'name')
      .sort({ ratings: -1 })
      .limit(additionalCount);

    products = [...products, ...shopProducts];
  }

  res.status(200).json({ success: true, products });
});

// @desc    Toggle or set review visibility (Admin only)
// @route   PUT /api/v1/admin/product/:productId/review/:reviewId/visibility
// @access  Private/Admin
exports.toggleReviewVisibility = catchAsyncErrors(async (req, res, next) => {
  const { productId, reviewId } = req.params;
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorHandler('Product not found', 404));
  }

  const review = product.reviews.id(reviewId);
  if (!review) {
    return next(new ErrorHandler('Review not found', 404));
  }

  if (typeof req.body.isHidden === 'boolean') {
    review.isHidden = req.body.isHidden;
  } else {
    review.isHidden = !review.isHidden;
  }

  await product.save();
  res.status(200).json({ success: true, review });
});
