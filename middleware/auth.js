const jwt = require('jsonwebtoken');
const catchAsyncErrors = require('./catchAsyncErrors');
const ErrorHandler = require('../utils/ErrorHandler');
const User = require('../models/User');

exports.isAuthenticatedUser = catchAsyncErrors(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorHandler('Please log in to access this resource', 401));
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decodedData.id);

    if (!req.user) {
      return next(new ErrorHandler('User belonging to this token no longer exists', 401));
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ErrorHandler('Access token expired', 401));
    }
    return next(new ErrorHandler('Invalid access token', 401));
  }
});

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ErrorHandler(`Role: ${req.user.role} is not allowed to access this resource`, 403));
    }
    next();
  };
};
