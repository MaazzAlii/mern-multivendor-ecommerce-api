const express = require('express');
const { registerUser, loginUser, getUserDetails, addAddress } = require('../controllers/authController');
const { isAuthenticatedUser } = require('../middleware/auth');

const router = express.Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/me').get(isAuthenticatedUser, getUserDetails);
router.route('/me/address').post(isAuthenticatedUser, addAddress);

module.exports = router;
