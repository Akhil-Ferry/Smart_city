const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Rate limiting middleware
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for certain IPs or conditions
      const skipIPs = (process.env.RATE_LIMIT_SKIP_IPS || '').split(',');
      return skipIPs.includes(req.ip);
    }
  };

  return rateLimit({ ...defaults, ...options });
};

// Strict rate limiter for authentication endpoints
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again in 15 minutes.'
  },
  skipSuccessfulRequests: true
});

// API rate limiter
const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});

// Speed limiter - slows down requests when approaching rate limit
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: () => 500, // add 500ms delay per request after delayAfter
  maxDelayMs: 5000, // maximum delay of 5 seconds
  validate: { delayMs: false }, // disable the warning
});

// File upload rate limiter
const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded. Please try again in an hour.'
  }
});

// Search rate limiter
const searchRateLimit = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 search requests per minute
  message: {
    success: false,
    message: 'Search limit exceeded. Please slow down your requests.'
  }
});

module.exports = {
  authRateLimit,
  apiRateLimit,
  speedLimiter,
  uploadRateLimit,
  searchRateLimit,
  createRateLimiter
};