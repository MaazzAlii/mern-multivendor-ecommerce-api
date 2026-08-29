const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Always [buyerUserId, sellerUserId] — kept as generic "members" so either
    // side can look up their threads with a single $in query.
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
    },
    lastMessage: {
      type: String,
      default: '',
    },
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    // Per-member unread counters, keyed by user id string
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

conversationSchema.index({ members: 1, shop: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
