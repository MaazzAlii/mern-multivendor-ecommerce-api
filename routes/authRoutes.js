const express = require('express');
const {
  registerUser,
  loginUser,
  getUserDetails,
  addAddress,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} = require('../controllers/authController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { isAuthenticatedUser } = require('../middleware/auth');

const router = express.Router();

router.route('/register').post(
  validate([
    body('name').notEmpty().withMessage('Please enter your name'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password should be at least 6 characters'),
    body('role').optional().isIn(['buyer', 'seller', 'admin']).withMessage('Invalid role specified'),
  ]),
  registerUser
);

router.route('/login').post(
  validate([
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Please enter your password'),
  ]),
  loginUser
);
router.route('/verify-email/:token').get(verifyEmail);
router.route('/resend-verification').post(isAuthenticatedUser, resendVerificationEmail);
router.route('/forgot-password').post(forgotPassword);
router.route('/reset-password/:token').put(resetPassword);
router.route('/me').get(isAuthenticatedUser, getUserDetails).put(isAuthenticatedUser, updateProfile);
router.route('/me/password').put(isAuthenticatedUser, changePassword);
router.route('/me/address').post(isAuthenticatedUser, addAddress);

module.exports = router;
