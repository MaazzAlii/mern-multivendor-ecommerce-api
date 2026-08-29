const express = require('express');
const router = express.Router();
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/auth');
const {
  createConversation,
  getMyConversations,
  getShopConversations,
} = require('../controllers/conversationController');

router.route('/conversation/new').post(isAuthenticatedUser, createConversation);
router.route('/conversations').get(isAuthenticatedUser, getMyConversations);
router.route('/conversations/shop').get(isAuthenticatedUser, authorizeRoles('seller'), getShopConversations);

module.exports = router;
