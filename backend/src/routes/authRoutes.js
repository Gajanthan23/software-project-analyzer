/**
 * routes/authRoutes.js
 * 
 * Express route definitions for authentication endpoints.
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Public auth routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected auth route
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
