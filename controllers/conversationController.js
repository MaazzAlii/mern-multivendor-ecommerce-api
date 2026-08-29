const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Conversation = require('../models/Conversation');
const Shop = require('../models/Shop');

// @desc    Start (or fetch existing) conversation between a buyer and a shop
// @route   POST /api/v1/conversation/new
// @access  Private
// Body: { shopId }
exports.createConversation = catchAsyncErrors(async (req, res, next) => {
  const { shopId } = req.body;
  const shop = await Shop.findById(shopId);
  if (!shop) return next(new ErrorHandler('Shop not found', 404));

  const existing = await Conversation.findOne({
    shop: shopId,
    members: { $all: [req.user.id, shop.owner] },
  });
  if (existing) return res.status(200).json({ success: true, conversation: existing });

  const conversation = await Conversation.create({
    members: [req.user.id, shop.owner],
    shop: shopId,
  });

  res.status(201).json({ success: true, conversation });
});

// @desc    Get all conversations the logged-in user is a member of
// @route   GET /api/v1/conversations
// @access  Private
exports.getMyConversations = catchAsyncErrors(async (req, res, next) => {
  const conversations = await Conversation.find({ members: req.user.id })
    .populate('members', 'name avatar role')
    .populate('shop', 'name logoUrl')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, conversations });
});

// @desc    Get all conversations belonging to the logged-in seller's shop
// @route   GET /api/v1/conversations/shop
// @access  Private/Seller
exports.getShopConversations = catchAsyncErrors(async (req, res, next) => {
  const shop = await Shop.findOne({ owner: req.user.id });
  if (!shop) return next(new ErrorHandler('You have not created a shop yet', 404));

  const conversations = await Conversation.find({ shop: shop._id })
    .populate('members', 'name avatar role')
    .sort({ updatedAt: -1 });

  res.status(200).json({ success: true, conversations });
});
