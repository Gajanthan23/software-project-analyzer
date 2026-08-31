/**
 * middleware/auth.js
 * 
 * Middleware for validating incoming JWT authorization tokens.
 * Attaches decoded user identity to `req.user`.
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const userModel = require('../models/userModel');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. Authorization header missing or malformed.'
      });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      logger.error('JWT_SECRET missing in environment variables');
      return res.status(500).json({ status: 'error', message: 'Internal server configuration error.' });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret);

    // Ensure user still exists in database
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Attach user payload to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ status: 'error', message: 'Invalid authentication token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 'error', message: 'Authentication token has expired.' });
    }

    logger.error('Error verifying auth middleware token', error);
    return res.status(500).json({ status: 'error', message: 'Failed to authenticate request.' });
  }
};

module.exports = { requireAuth };
