/**
 * models/userModel.js
 * 
 * PostgreSQL data access queries for the `users` table.
 */

const db = require('../utils/db');

const userModel = {
  /**
   * Create a new user in the database.
   * Returns created user object excluding password_hash.
   */
  create: async ({ name, email, passwordHash, isVerified = false }) => {
    const query = `
      INSERT INTO users (name, email, password_hash, is_verified)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, is_verified, created_at;
    `;
    const result = await db.query(query, [name, email.toLowerCase().trim(), passwordHash, isVerified]);
    return result.rows[0];
  },

  /**
   * Find a user by email (includes password_hash for credential verification).
   */
  findByEmail: async (email) => {
    const query = `
      SELECT id, name, email, password_hash, is_verified, created_at
      FROM users
      WHERE LOWER(email) = LOWER($1);
    `;
    const result = await db.query(query, [email.trim()]);
    return result.rows[0];
  },

  /**
   * Find a user by ID (excludes password_hash).
   */
  findById: async (id) => {
    const query = `
      SELECT id, name, email, is_verified, created_at
      FROM users
      WHERE id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  /**
   * Mark user as verified in database.
   */
  verifyUser: async (id) => {
    const query = `
      UPDATE users
      SET is_verified = true
      WHERE id = $1
      RETURNING id, name, email, is_verified, created_at;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
};

module.exports = userModel;
