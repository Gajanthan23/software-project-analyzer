/**
 * routes/authRoutes.js
 * 
 * Express route definitions for authentication and OTP verification endpoints.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { otpResendRateLimiter, otpVerifyRateLimiter } = require('../middleware/rateLimiter');

// Public auth & verification routes
router.post('/register', authController.register);
router.post('/verify-otp', otpVerifyRateLimiter, authController.verifyOtp);
router.post('/resend-otp', otpResendRateLimiter, authController.resendOtp);
router.post('/login', authController.login);

// Protected auth route
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
