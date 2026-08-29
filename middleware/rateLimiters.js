const rateLimit = require('express-rate-limit');

// Strict rate limiter for sensitive authentication & password endpoints (10 requests / 15 mins)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter for standard endpoints (200 requests / 15 mins)
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.originalUrl.includes('/webhook/stripe'),
});

module.exports = {
  authLimiter,
  generalApiLimiter,
};
