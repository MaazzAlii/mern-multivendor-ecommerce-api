const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

// @desc    Send a message in a conversation
// @route   POST /api/v1/message/new
// @access  Private
// Body: { conversationId, text, images }
exports.createMessage = catchAsyncErrors(async (req, res, next) => {
  const { conversationId, text, images } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return next(new ErrorHandler('Conversation not found', 404));

  if (!conversation.members.some((m) => String(m) === req.user.id)) {
    return next(new ErrorHandler('You are not part of this conversation', 403));
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: req.user.id,
    text: text || '',
    images: images || [],
  });

  conversation.lastMessage = text || (images?.length ? 'Sent an image' : '');
  conversation.lastMessageId = message._id;

  // Bump the unread counter for every other member of the conversation
  const currentCounts = conversation.unreadCount || new Map();
  conversation.members.forEach((memberId) => {
    const key = String(memberId);
    if (key !== req.user.id) {
      currentCounts.set(key, (currentCounts.get(key) || 0) + 1);
    }
  });
  conversation.unreadCount = currentCounts;

  await conversation.save();

  res.status(201).json({ success: true, message });
});

// @desc    Get all messages in a conversation (and mark them as read for the caller)
// @route   GET /api/v1/messages/:conversationId
// @access  Private
exports.getMessages = catchAsyncErrors(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation) return next(new ErrorHandler('Conversation not found', 404));

  if (!conversation.members.some((m) => String(m) === req.user.id)) {
    return next(new ErrorHandler('You are not part of this conversation', 403));
  }

  const messages = await Message.find({ conversation: req.params.conversationId }).sort({ createdAt: 1 });

  await Message.updateMany(
    { conversation: req.params.conversationId, sender: { $ne: req.user.id } },
    { seen: true }
  );

  const counts = conversation.unreadCount || new Map();
  counts.set(req.user.id, 0);
  conversation.unreadCount = counts;
  await conversation.save();

  res.status(200).json({ success: true, messages });
});
