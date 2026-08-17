const ErrorHandler = require('../utils/ErrorHandler');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  if (err.name === 'CastError') {
    err = new ErrorHandler(`Resource not found. Invalid: ${err.path}`, 400);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map((value) => value.message)
      .join(', ');
    err = new ErrorHandler(message, 400);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err = new ErrorHandler(`Duplicate value entered for ${field} field`, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    err = new ErrorHandler('JSON Web Token is invalid. Try again', 401);
  }

  if (err.name === 'TokenExpiredError') {
    err = new ErrorHandler('JSON Web Token has expired. Please log in again', 401);
  }

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};
