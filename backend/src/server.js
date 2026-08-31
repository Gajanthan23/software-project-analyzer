/**
 * server.js
 * 
 * Entry point for the Node.js Express API.
 * Configures basic security/utility middleware and starts the server listener.
 */

// Load environment variables early
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const logger = require('./utils/logger');
const healthRouter = require('./routes/health');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*', // Allow all origins for initial scaffolding (refined in later phases)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger middleware for incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api/auth', authRoutes);

// Standard 404 Route handler for unmatched API routes
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
});

// ─── Error Handling ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Server Start ───────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Express server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown helpers
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received. Shutting down gracefully.');
  server.close(() => {
    logger.info('Process terminated.');
  });
});

process.on('SIGINT', () => {
  logger.warn('SIGINT received. Shutting down gracefully.');
  server.close(() => {
    logger.info('Process terminated.');
  });
});
