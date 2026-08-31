/**
 * utils/logger.js
 * 
 * Standard utility wrapper around console.log for consistent formatting of info,
 * warn, and error levels.
 */

const formatMessage = (level, message, meta = '') => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
};

const logger = {
  info: (message, meta) => {
    console.log(formatMessage('INFO', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatMessage('WARN', message, meta));
  },
  error: (message, error) => {
    const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error;
    console.error(formatMessage('ERROR', message, errorDetails));
  }
};

module.exports = logger;
