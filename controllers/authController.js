const crypto = require('crypto');
const catchAsyncErrors = require('../middleware/catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const sendEmail = require('../utils/mailer');

const sendToken = async (user, statusCode, res) => {
  const accessToken = user.getJWTToken();
  const rawRefreshToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

  const days = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS, 10) || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
  });

  res.status(statusCode).json({
    success: true,
    user: { _id: user._id, name: user.name, email: user.email, role: user.role, shop: user.shop },
    token: accessToken,
    accessToken,
    refreshToken: rawRefreshToken,
  });
};

// @desc    Register a new user (buyer or seller)
// @route   POST /api/v1/register
// @access  Public
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return next(new ErrorHandler('Please enter name, email, and password', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler('User with this email already exists', 400));
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');

  const user = await User.create({
    name,
    email,
    password,
    role: role === 'seller' ? 'seller' : 'buyer',
    emailVerificationToken: hashedVerificationToken,
    emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000,
  });

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const verificationUrl = `${clientUrl}/verify-email/${verifyToken}`;

  sendEmail({
    to: user.email,
    subject: 'Email Verification',
    html: `
      <h1>Verify Your Email</h1>
      <p>Thank you for registering! Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `,
  });

  await sendToken(user, 201, res);
});

// @desc    Log in a user
// @route   POST /api/v1/login
// @access  Public
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler('Please enter email and password', 400));
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  await sendToken(user, 200, res);
});

// @desc    Get logged-in user's profile
// @route   GET /api/v1/me
// @access  Private
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('shop', 'name');
  res.status(200).json({ success: true, user });
});

// @desc    Add a shipping address to the logged-in user's profile
// @route   POST /api/v1/me/address
// @access  Private
exports.addAddress = catchAsyncErrors(async (req, res, next) => {
  const { address1, city, zipCode, country, address2, addressType } = req.body;

  if (!address1 || !city || !zipCode || !country) {
    return next(new ErrorHandler('address1, city, zipCode, and country are required', 400));
  }

  const user = await User.findById(req.user.id);
  user.addresses.push({ address1, address2, city, zipCode, country, addressType });
  await user.save();

  res.status(200).json({ success: true, addresses: user.addresses });
});

// @desc    Update logged-in user's profile (name, avatar)
// @route   PUT /api/v1/me
// @access  Private
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
  const { name, avatar } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  if (name !== undefined) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();

  res.status(200).json({ success: true, user });
});

// @desc    Change logged-in user's password
// @route   PUT /api/v1/me/password
// @access  Private
exports.changePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler('Please provide currentPassword and newPassword', 400));
  }

  if (newPassword.length < 6) {
    return next(new ErrorHandler('Password should be at least 6 characters', 400));
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  const isMatched = await user.comparePassword(currentPassword);
  if (!isMatched) {
    return next(new ErrorHandler('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password updated' });
});

// @desc    Forgot password (request reset link email)
// @route   POST /api/v1/forgot-password
// @access  Public
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new ErrorHandler('Please enter an email address', 400));
  }

  const genericResponse = {
    success: true,
    message: 'If that email is registered, a reset link has been sent.',
  };

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

  const message = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Please click the link below to reset your password:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>This link is valid for 15 minutes. If you did not request this, please ignore this email.</p>
  `;

  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html: message,
  });

  if (!emailResult.success) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler('Email could not be sent. Please try again later.', 500));
  }

  res.status(200).json(genericResponse);
});

// @desc    Reset password using token
// @route   PUT /api/v1/reset-password/:token
// @access  Public
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return next(new ErrorHandler('Please provide a new password', 400));
  }

  if (newPassword.length < 6) {
    return next(new ErrorHandler('Password should be at least 6 characters', 400));
  }

  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired reset token', 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();

  res.status(200).json({ success: true, message: 'Password has been reset' });
});

// @desc    Verify email address using token
// @route   GET /api/v1/verify-email/:token
// @access  Public
exports.verifyEmail = catchAsyncErrors(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired verification token', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  await user.save();

  res.status(200).json({ success: true, message: 'Email verified successfully' });
});

// @desc    Resend email verification link
// @route   POST /api/v1/resend-verification
// @access  Private
exports.resendVerificationEmail = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new ErrorHandler('Email is already verified', 400));
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;

  await user.save({ validateBeforeSave: false });

  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const verificationUrl = `${clientUrl}/verify-email/${verifyToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Email Verification',
    html: `
      <h1>Verify Your Email</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}">${verificationUrl}</a>
    `,
  });

  res.status(200).json({ success: true, message: 'Verification email sent' });
});

// @desc    Refresh access token and rotate refresh token
// @route   POST /api/v1/refresh-token
// @access  Public
exports.refreshAccessToken = catchAsyncErrors(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new ErrorHandler('Refresh token is required', 400));
  }

  const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const tokenDoc = await RefreshToken.findOne({
    tokenHash: incomingHash,
    revoked: false,
    expiresAt: { $gt: Date.now() },
  });

  if (!tokenDoc) {
    return next(new ErrorHandler('Invalid or expired refresh token', 401));
  }

  tokenDoc.revoked = true;
  await tokenDoc.save();

  const user = await User.findById(tokenDoc.user);
  if (!user) {
    return next(new ErrorHandler('User no longer exists', 401));
  }

  const newAccessToken = user.getJWTToken();
  const newRawRefreshToken = crypto.randomBytes(40).toString('hex');
  const newHash = crypto.createHash('sha256').update(newRawRefreshToken).digest('hex');

  const days = parseInt(process.env.JWT_REFRESH_EXPIRE_DAYS, 10) || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: newHash,
    expiresAt,
  });

  res.status(200).json({
    success: true,
    token: newAccessToken,
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken,
  });
});

// @desc    Log out user by revoking current refresh token
// @route   POST /api/v1/logout
// @access  Private
exports.logout = catchAsyncErrors(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await RefreshToken.findOneAndUpdate({ tokenHash }, { revoked: true });
  }

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// @desc    Log out from all active sessions
// @route   POST /api/v1/logout-all
// @access  Private
exports.logoutAllSessions = catchAsyncErrors(async (req, res, next) => {
  await RefreshToken.updateMany({ user: req.user.id, revoked: false }, { revoked: true });
  res.status(200).json({ success: true, message: 'Logged out from all sessions' });
});
