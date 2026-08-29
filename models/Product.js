const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const variantOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g. "Medium" or "Red"
    priceModifier: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    sku: { type: String, default: '' },
  },
  { _id: true }
);

const variantGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Size" or "Color"
    options: [variantOptionSchema],
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter the product name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please enter a description'],
    },
    category: {
      type: String,
      required: [true, 'Please enter a category'],
      trim: true,
    },
    tags: [{ type: String }],
    originalPrice: {
      type: Number,
    },
    discountPrice: {
      type: Number,
      required: [true, 'Please enter the selling price'],
    },
    stock: {
      type: Number,
      required: [true, 'Please enter stock quantity'],
      min: 0,
    },
    images: [{ type: String }],
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    soldOut: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    ratings: {
      type: Number,
      default: 0,
    },
    variants: [variantGroupSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
