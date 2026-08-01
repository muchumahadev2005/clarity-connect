const rateLimit = require('express-rate-limit');

/**
 * Creates a reusable rate limiter middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests per window
 * @param {string} message - Error message to return
 */
const createLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests, please try again later.') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      status: 429,
      error: 'Too Many Requests',
      message
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
      res.status(options.statusCode).json(options.message);
    }
  });
};

// Specialized limiters for different parts of the app
const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,              // 5 attempts max (brute force protection)
  'Too many login or OTP attempts. Please try again after 15 minutes.'
);

const messageLimiter = createLimiter(
  1 * 60 * 1000,  // 1 minute
  20,             // 20 messages per minute
  'You are sending messages too quickly. Please wait a moment.'
);

const generalApiLimiter = createLimiter(
  1 * 60 * 1000,  // 1 minute
  60,             // 60 requests per minute
  'Too many API requests. Please slow down.'
);

/**
 * Rate limiter for sending anonymous emails
 * Limits to 10 requests per minute per IP
 * Prevents email flooding/spam
 */
const sendAnonymousEmailLimiter = createLimiter(
  60 * 1000,      // 1 minute
  10,             // 10 requests per minute
  'Too many email send requests. Please try again in 1 minute.'
);

const publicMessageLimiter = createLimiter(
  1 * 60 * 1000,  // 1 minute
  5,              // 5 requests per minute max (prevent automated scanning/guessing)
  'Too many requests to read this secure link. Please wait a moment.'
);

module.exports = {
  createLimiter,
  authLimiter,
  messageLimiter,
  generalApiLimiter,
  sendAnonymousEmailLimiter,
  publicMessageLimiter,
};
