/**
 * models/otpModel.js
 * 
 * PostgreSQL data access queries for the `otp_verifications` table.
 */

const crypto = require('crypto');
const db = require('../utils/db');

const getSecret = () => process.env.OTP_SECRET || process.env.JWT_SECRET || 'default_otp_secret';

const otpModel = {
  /**
   * Hash an OTP code using HMAC-SHA256 with a server secret.
   * Ensures raw codes are never stored in plain text.
   * 
   * @param {string} otpCode 
   * @returns {string} Hex hash string
   */
  hashOtp: (otpCode) => {
    return crypto
      .createHmac('sha256', getSecret())
      .update(String(otpCode).trim())
      .digest('hex');
  },

  /**
   * Store a hashed OTP code for a user.
   */
  create: async ({ userId, otpCode, purpose = 'registration', ttlMinutes = 10 }) => {
    const otpHash = otpModel.hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const query = `
      INSERT INTO otp_verifications (user_id, otp_code_hash, purpose, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, purpose, expires_at, attempts, created_at;
    `;
    const result = await db.query(query, [userId, otpHash, purpose, expiresAt]);
    return result.rows[0];
  },

  /**
   * Find the latest active OTP verification record for a user and purpose.
   */
  findLatestByUserAndPurpose: async (userId, purpose = 'registration') => {
    const query = `
      SELECT id, user_id, otp_code_hash, purpose, expires_at, attempts, created_at
      FROM otp_verifications
      WHERE user_id = $1 AND purpose = $2
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await db.query(query, [userId, purpose]);
    return result.rows[0];
  },

  /**
   * Increment failed attempt count for an OTP record.
   */
  incrementAttempts: async (id) => {
    const query = `
      UPDATE otp_verifications
      SET attempts = attempts + 1
      WHERE id = $1
      RETURNING attempts;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  /**
   * Delete or invalidate all OTP records for a user and purpose.
   */
  deleteByUserIdAndPurpose: async (userId, purpose = 'registration') => {
    const query = `
      DELETE FROM otp_verifications
      WHERE user_id = $1 AND purpose = $2;
    `;
    await db.query(query, [userId, purpose]);
  },
};

module.exports = otpModel;
