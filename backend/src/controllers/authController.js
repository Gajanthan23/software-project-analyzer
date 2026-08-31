/**
 * controllers/authController.js
 * 
 * Request handlers for user registration, authentication, and profile fetching.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const { validateRegisterInput, validateLoginInput } = require('../utils/validation');
const logger = require('../utils/logger');

// Generate JWT token helper
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const authController = {
  /**
   * POST /api/auth/register
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

      // 4. Save user to database
      const newUser = await userModel.create({ name, email, passwordHash });

      // 5. Issue JWT
      const token = signToken(newUser.id);

      logger.info(`New user registered successfully: ${newUser.id}`);

      return res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: {
          token,
          user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            created_at: newUser.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/auth/login
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

      // 2. Lookup user (includes password_hash)
      const user = await userModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password.'
        });
      }

      // 3. Compare passwords with bcrypt
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password.'
        });
      }

      // 4. Issue JWT
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
          created_at: req.user.created_at
        }
      }
    });
  }
};

module.exports = authController;
