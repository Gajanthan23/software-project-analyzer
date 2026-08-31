/**
 * utils/db.js
 * 
 * PostgreSQL client configuration using `pg` Connection Pool.
 * Reads connection string from DATABASE_URL environment variable.
 */

const { Pool } = require('pg');
const logger = require('./logger');

// Initialize Pool. The pg library automatically handles connection details when passed connectionString.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add reasonable connection pool limits for dev/prod
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Event listener for active client errors to prevent crash
pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  /**
   * Run a SQL query with parameters.
   * Logs query execution for debug.
   * 
   * @param {string} text SQL Query Text
   * @param {Array} params Query parameters
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.info('Executed SQL query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error(`PostgreSQL query error on query: ${text}`, error);
      throw error;
    }
  },
  
  // Expose the pool directly for transaction support when needed
  pool,
};
