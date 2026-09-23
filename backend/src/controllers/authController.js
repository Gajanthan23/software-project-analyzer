/**
 * controllers/authController.js
 * 
 * Request handlers for user registration, OTP email verification,
 * authentication, and profile fetching.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const otpModel = require('../models/otpModel');
const emailService = require('../services/emailService');
const { validateRegisterInput, validateLoginInput } = require('../utils/validation');
const logger = require('../utils/logger');

// Generate JWT token helper
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Generate 6-digit numeric OTP code helper
const generateOtpCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const authController = {
  /**
   * POST /api/auth/register
   * Creates an unverified user account and sends a 6-digit OTP code to their email.
   */
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      // 1. Validate payload
      const validation = validateRegisterInput({ name, email, password });
      if (!validation.isValid) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // 2. Check if email is already taken
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          status: 'error',
          message: 'An account with this email address already exists.'
        });
      }

      // 3. Hash password with bcrypt (salt rounds = 10)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 4. Save unverified user to database
      const newUser = await userModel.create({ name, email, passwordHash, isVerified: false });

      // 5. Generate and store OTP code (10 minutes TTL)
      const otpCode = generateOtpCode();
      await otpModel.deleteByUserIdAndPurpose(newUser.id, 'registration');
      await otpModel.create({
        userId: newUser.id,
        otpCode,
        purpose: 'registration',
        ttlMinutes: 10
      });

      // 6. Send OTP code via email service
      await emailService.sendOtpEmail(newUser.email, otpCode);

      logger.info(`New user registered (unverified): ${newUser.id}`);

      return res.status(201).json({
        status: 'success',
        message: 'Verification code sent to your email',
        data: {
          email: newUser.email
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/verify-otp
   * Verifies the 6-digit OTP code, marks user as verified, and issues JWT.
   */
  verifyOtp: async (req, res, next) => {
    try {
      const { email, otp } = req.body;

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Email address is required.'
        });
      }

      if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
        return res.status(400).json({
          status: 'error',
          message: 'A valid 6-digit verification code is required.'
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanOtp = otp.trim();

      // 1. Lookup user by email
      const user = await userModel.findByEmail(cleanEmail);
      if (!user) {
        return res.status(400).json({
          status: 'error',
          message: 'User not found or invalid email address.'
        });
      }

      // 2. If user is already verified
      if (user.is_verified) {
        const token = signToken(user.id);
        return res.status(200).json({
          status: 'success',
          message: 'Account is already verified.',
          data: {
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              is_verified: true,
              created_at: user.created_at
            }
          }
        });
      }

      // 3. Find active OTP record
      const otpRecord = await otpModel.findLatestByUserAndPurpose(user.id, 'registration');
      if (!otpRecord) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid or expired verification code. Please request a new code.'
        });
      }

      // 4. Check failed attempt limit (lock after 5 wrong attempts)
      if (otpRecord.attempts >= 5) {
        return res.status(400).json({
          status: 'error',
          message: 'Maximum verification attempts exceeded. Please request a new verification code.'
        });
      }

      // 5. Check expiry server-side
      if (new Date() > new Date(otpRecord.expires_at)) {
        return res.status(400).json({
          status: 'error',
          message: 'Verification code has expired. Please request a new verification code.'
        });
      }

      // 6. Compare hash
      const submittedHash = otpModel.hashOtp(cleanOtp);
      if (submittedHash !== otpRecord.otp_code_hash) {
        await otpModel.incrementAttempts(otpRecord.id);
        return res.status(400).json({
          status: 'error',
          message: 'Invalid verification code. Please check the code and try again.'
        });
      }

      // 7. Success: Mark user as verified & invalidate OTP records
      const verifiedUser = await userModel.verifyUser(user.id);
      await otpModel.deleteByUserIdAndPurpose(user.id, 'registration');

      // 8. Issue JWT token
      const token = signToken(verifiedUser.id);
      logger.info(`User email verified successfully: ${verifiedUser.id}`);

      return res.status(200).json({
        status: 'success',
        message: 'Email verified successfully',
        data: {
          token,
          user: {
            id: verifiedUser.id,
            name: verifiedUser.name,
            email: verifiedUser.email,
            is_verified: true,
            created_at: verifiedUser.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/resend-otp
   * Resends a fresh 6-digit OTP code to unverified user.
   */
  resendOtp: async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Email address is required.'
        });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await userModel.findByEmail(cleanEmail);

      if (!user) {
        return res.status(400).json({
          status: 'error',
          message: 'No account found with this email address.'
        });
      }

      if (user.is_verified) {
        return res.status(400).json({
          status: 'error',
          message: 'Account is already verified. Please sign in.'
        });
      }

      // Delete old OTPs, generate fresh OTP
      await otpModel.deleteByUserIdAndPurpose(user.id, 'registration');
      const otpCode = generateOtpCode();
      await otpModel.create({
        userId: user.id,
        otpCode,
        purpose: 'registration',
        ttlMinutes: 10
      });

      // Send fresh OTP email
      await emailService.sendOtpEmail(user.email, otpCode);

      logger.info(`OTP code resent to user: ${user.id}`);

      return res.status(200).json({
        status: 'success',
        message: 'Verification code resent successfully',
        data: {
          email: user.email
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
   * Authenticates user. Blocks login if account is unverified and triggers an auto-resend.
   */
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // 1. Validate payload
      const validation = validateLoginInput({ email, password });
      if (!validation.isValid) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // 2. Lookup user (includes password_hash and is_verified)
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password.'
        });
      }

      // 3. Compare passwords with bcrypt
      if (!user.password_hash) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password.'
        });
      }

      // 4. Check if account is verified
      if (!user.is_verified) {
        // Auto-trigger OTP resend
        await otpModel.deleteByUserIdAndPurpose(user.id, 'registration');
        const otpCode = generateOtpCode();
        await otpModel.create({
          userId: user.id,
          otpCode,
          purpose: 'registration',
          ttlMinutes: 10
        });
        await emailService.sendOtpEmail(user.email, otpCode);

        logger.info(`Unverified user attempted login. Auto-resent OTP: ${user.id}`);

        return res.status(403).json({
          status: 'error',
          code: 'ACCOUNT_NOT_VERIFIED',
          message: 'Please verify your email before logging in. A new verification code has been sent to your email.',
          data: {
            email: user.email,
            is_verified: false
          }
        });
      }

      // 5. Issue JWT
      const token = signToken(user.id);

      logger.info(`User logged in successfully: ${user.id}`);

      return res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            is_verified: user.is_verified,
            created_at: user.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/auth/me (Protected Route)
   */
  getMe: async (req, res) => {
    // req.user is set by requireAuth middleware
    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          is_verified: req.user.is_verified,
          created_at: req.user.created_at
        }
      }
    });
  }
};

module.exports = authController;
