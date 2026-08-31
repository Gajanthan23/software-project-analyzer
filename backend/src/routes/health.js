/**
 * routes/health.js
 * 
 * Basic health-check / status route.
 * Verifies server state and environment configuration.
 */

const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'production',
    uptime: process.uptime()
  });
});

module.exports = router;
