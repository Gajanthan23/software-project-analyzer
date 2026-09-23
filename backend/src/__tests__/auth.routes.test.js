/**
 * backend/src/__tests__/auth.routes.test.js
 *
 * Integration tests for authentication and OTP verification flow:
 * - POST /api/auth/register (creates unverified user, sends OTP, does NOT return JWT)
 * - POST /api/auth/verify-otp (verifies OTP, marks user verified, returns JWT)
 * - POST /api/auth/resend-otp (resends fresh OTP code)
 * - POST /api/auth/login (blocks unverified users with 403 & auto-resends OTP)
 */

// ── Mock env vars BEFORE any require ──────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret-for-phase26';
process.env.JWT_EXPIRES_IN = '1d';
process.env.OTP_SECRET = 'test-otp-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';

// ── Mock DB module ─────────────────────────────────────────────────────────────
jest.mock('../../src/utils/db', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() },
}));

// ── Mock Logger module ─────────────────────────────────────────────────────────
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ── Mock Email Service to avoid sending real emails ────────────────────────────
jest.mock('../../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue({ success: true, mode: 'mock' }),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../../src/utils/db');
const otpModel = require('../../src/models/otpModel');
const emailService = require('../../src/services/emailService');

// Build the Express app
const express = require('express');
const authRoutes = require('../../src/routes/authRoutes');
const errorHandler = require('../../src/middleware/errorHandler');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

let app;

beforeEach(() => {
  app = buildApp();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('201: registers an unverified user and sends OTP, but does NOT return a token', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })               // findByEmail -> no existing user
      .mockResolvedValueOnce({                            // userModel.create (is_verified = false)
        rows: [{
          id: 'uuid-001',
          name: 'Alice',
          email: 'alice@example.com',
          is_verified: false,
          created_at: new Date().toISOString(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] })               // otpModel.deleteByUserIdAndPurpose
      .mockResolvedValueOnce({                            // otpModel.create
        rows: [{
          id: 'otp-001',
          user_id: 'uuid-001',
          purpose: 'registration',
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempts: 0,
        }],
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'securepass' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/verification code sent/i);
    expect(res.body.data.email).toBe('alice@example.com');
    expect(res.body.data.token).toBeUndefined(); // Token must NOT be issued on register
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith('alice@example.com', expect.any(String));
  });

  it('400: returns error when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'a@b.com', password: 'pass123' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.errors).toContain('Name is required.');
  });

  it('409: returns conflict when email already exists', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'existing', email: 'taken@example.com' }],
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Carol', email: 'taken@example.com', password: 'pass123' });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/verify-otp', () => {
  it('200: successfully verifies correct OTP, sets is_verified=true, and returns JWT', async () => {
    const sampleOtp = '123456';
    const sampleHash = otpModel.hashOtp(sampleOtp);

    db.query
      .mockResolvedValueOnce({                           // findByEmail
        rows: [{
          id: 'uuid-001',
          name: 'Alice',
          email: 'alice@example.com',
          is_verified: false,
          created_at: new Date().toISOString(),
        }],
      })
      .mockResolvedValueOnce({                           // findLatestByUserAndPurpose
        rows: [{
          id: 'otp-001',
          user_id: 'uuid-001',
          otp_code_hash: sampleHash,
          purpose: 'registration',
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempts: 0,
        }],
      })
      .mockResolvedValueOnce({                           // userModel.verifyUser
        rows: [{
          id: 'uuid-001',
          name: 'Alice',
          email: 'alice@example.com',
          is_verified: true,
          created_at: new Date().toISOString(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] });              // otpModel.deleteByUserIdAndPurpose

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'alice@example.com', otp: sampleOtp });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.is_verified).toBe(true);
  });

  it('400: fails when OTP code is incorrect', async () => {
    const correctHash = otpModel.hashOtp('123456');

    db.query
      .mockResolvedValueOnce({                           // findByEmail
        rows: [{
          id: 'uuid-001',
          name: 'Alice',
          email: 'alice@example.com',
          is_verified: false,
        }],
      })
      .mockResolvedValueOnce({                           // findLatestByUserAndPurpose
        rows: [{
          id: 'otp-001',
          user_id: 'uuid-001',
          otp_code_hash: correctHash,
          purpose: 'registration',
          expires_at: new Date(Date.now() + 600000).toISOString(),
          attempts: 0,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ attempts: 1 }] }); // incrementAttempts

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'alice@example.com', otp: '654321' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid verification code/i);
  });

  it('400: fails when OTP code has expired', async () => {
    const sampleHash = otpModel.hashOtp('123456');

    db.query
      .mockResolvedValueOnce({                           // findByEmail
        rows: [{ id: 'uuid-001', email: 'alice@example.com', is_verified: false }],
      })
      .mockResolvedValueOnce({                           // findLatestByUserAndPurpose (expired 5 mins ago)
        rows: [{
          id: 'otp-001',
          user_id: 'uuid-001',
          otp_code_hash: sampleHash,
          purpose: 'registration',
          expires_at: new Date(Date.now() - 300000).toISOString(),
          attempts: 0,
        }],
      });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'alice@example.com', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/code has expired/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/resend-otp', () => {
  it('200: resends a fresh OTP code to unverified user', async () => {
    db.query
      .mockResolvedValueOnce({                           // findByEmail
        rows: [{ id: 'uuid-001', email: 'alice@example.com', is_verified: false }],
      })
      .mockResolvedValueOnce({ rows: [] })               // deleteByUserIdAndPurpose
      .mockResolvedValueOnce({                            // create new OTP
        rows: [{ id: 'otp-002', user_id: 'uuid-001', attempts: 0 }],
      });

    const res = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/resent successfully/i);
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith('alice@example.com', expect.any(String));
  });

  it('400: rejects resend if account is already verified', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'uuid-001', email: 'alice@example.com', is_verified: true }],
    });

    const res = await request(app)
      .post('/api/auth/resend-otp')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already verified/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('403: blocks login for unverified user and auto-resends OTP', async () => {
    const passwordHash = await bcrypt.hash('correctpass', 10);

    db.query
      .mockResolvedValueOnce({                           // findByEmail (unverified)
        rows: [{
          id: 'uuid-002',
          name: 'Dave',
          email: 'dave@example.com',
          password_hash: passwordHash,
          is_verified: false,
        }],
      })
      .mockResolvedValueOnce({ rows: [] })               // deleteByUserIdAndPurpose
      .mockResolvedValueOnce({                            // create new OTP
        rows: [{ id: 'otp-003', user_id: 'uuid-002', attempts: 0 }],
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dave@example.com', password: 'correctpass' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_NOT_VERIFIED');
    expect(res.body.message).toMatch(/verify your email/i);
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith('dave@example.com', expect.any(String));
  });

  it('200: returns token on valid credentials for verified user', async () => {
    const passwordHash = await bcrypt.hash('correctpass', 10);

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'uuid-002',
        name: 'Dave',
        email: 'dave@example.com',
        password_hash: passwordHash,
        is_verified: true,
        created_at: new Date().toISOString(),
      }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dave@example.com', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.is_verified).toBe(true);
  });
});
