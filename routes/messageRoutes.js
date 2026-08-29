const express = require('express');
const router = express.Router();
const { isAuthenticatedUser } = require('../middleware/auth');
const { createMessage, getMessages } = require('../controllers/messageController');

router.route('/message/new').post(isAuthenticatedUser, createMessage);
router.route('/messages/:conversationId').get(isAuthenticatedUser, getMessages);

module.exports = router;
