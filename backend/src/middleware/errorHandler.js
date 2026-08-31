/**
 * middleware/errorHandler.js
 * 
 * Global error-handling middleware for Express.js.
 * Formats errors and logs them securely (hiding stack traces in production).
 */

const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  logger.error(`API Error on ${req.method} ${req.url}`, err);

  const statusCode = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
