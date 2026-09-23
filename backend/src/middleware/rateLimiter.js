/**
 * middleware/rateLimiter.js
 * 
 * Rate limiting middleware enforcing Section 29 requirements:
 * - 10 analysis submissions per 15-minute window per IP.
 * - 100 general API requests per 15-minute window per IP.
 */

const rateLimit = require('express-rate-limit');

const analysisRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 analysis requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many repository analysis requests from this IP. Please try again after 15 minutes.'
  }
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many API requests from this IP. Please try again later.'
  }
});

const otpResendRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 resend requests per 15-minute window
  keyGenerator: (req) => {
    return req.body && req.body.email ? req.body.email.toLowerCase().trim() : req.ip;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many OTP resend requests. Please try again after 15 minutes.'
  }
});

const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 verification attempts per 15-minute window
  keyGenerator: (req) => {
    return req.body && req.body.email ? req.body.email.toLowerCase().trim() : req.ip;
  },
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many verification attempts. Please try again after 15 minutes.'
  }
});


module.exports = { analysisRateLimiter, apiRateLimiter, otpResendRateLimiter, otpVerifyRateLimiter };

