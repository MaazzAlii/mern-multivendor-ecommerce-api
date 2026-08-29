const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const cloudinary = require('../utils/cloudinary');

// @desc    Upload one or more images (sent as base64 data URLs) to Cloudinary
// @route   POST /api/v1/upload
// @access  Private
// Body: { images: "data:image/png;base64,..." } or { images: ["data:...", "data:..."] }
exports.uploadImages = catchAsyncErrors(async (req, res, next) => {
  const { images } = req.body;

  if (!images) {
    return next(new ErrorHandler('Please provide at least one image', 400));
  }

  const list = Array.isArray(images) ? images : [images];

  if (list.length > 8) {
    return next(new ErrorHandler('You can upload a maximum of 8 images at a time', 400));
  }

  const uploaded = [];
  for (const image of list) {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'multivendor-ecommerce',
      resource_type: 'image',
    });
    uploaded.push({ url: result.secure_url, publicId: result.public_id });
  }

  res.status(201).json({
    success: true,
    urls: uploaded.map((u) => u.url),
    images: uploaded,
  });
});

// @desc    Delete an uploaded image from Cloudinary
// @route   DELETE /api/v1/upload
// @access  Private
// Body: { publicId: "multivendor-ecommerce/xyz" }
exports.deleteImage = catchAsyncErrors(async (req, res, next) => {
  const { publicId } = req.body;
  if (!publicId) {
    return next(new ErrorHandler('publicId is required', 400));
  }
  await cloudinary.uploader.destroy(publicId);
  res.status(200).json({ success: true, message: 'Image deleted' });
});
