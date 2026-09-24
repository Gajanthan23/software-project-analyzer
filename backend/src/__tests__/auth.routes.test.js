/**
 * backend/src/__tests__/auth.routes.test.js
 *
 * Phase 26: Integration tests for POST /api/auth/register and POST /api/auth/login.
 * DB layer is fully mocked — no live PostgreSQL connection required.
 */

// ── Mock env vars BEFORE any require ──────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET    = 'test-jwt-secret-for-phase26';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV      = 'test';
process.env.PORT          = '4001';

// ── Mock the DB module so no real PostgreSQL is needed ────────────────────────
jest.mock('../../src/utils/db', () => ({
  query: jest.fn(),
  pool:  { end: jest.fn() },
}));

// ── Mock the logger to suppress output during tests ──────────────────────────
jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
}));

const request  = require('supertest');
const bcrypt   = require('bcryptjs');
const db       = require('../../src/utils/db');

// Build the Express app (without starting the server)
const express  = require('express');
const cors     = require('cors');
const authRoutes    = require('../../src/routes/authRoutes');
const errorHandler  = require('../../src/middleware/errorHandler');

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
  it('201: registers a new user and returns token', async () => {
    // findByEmail → no existing user
    db.query
      .mockResolvedValueOnce({ rows: [] })               // findByEmail
      .mockResolvedValueOnce({                            // userModel.create
        rows: [{
          id: 'uuid-001',
          name: 'Alice',
          email: 'alice@example.com',
          created_at: new Date().toISOString(),
        }],
      });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'securepass' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('alice@example.com');
  });

  it('400: returns error when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'a@b.com', password: 'pass123' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.errors).toContain('Name is required.');
  });

  it('400: returns error when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'notanemail', password: 'pass123' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('A valid email address is required.');
  });

  it('400: returns error when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bob', email: 'b@b.com', password: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('Password must be at least 6 characters long.');
  });

  it('409: returns conflict when email already exists', async () => {
    // findByEmail returns an existing user
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
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('200: returns token on valid credentials', async () => {
    const passwordHash = await bcrypt.hash('correctpass', 10);

    db.query
      .mockResolvedValueOnce({                           // findByEmail (with hash)
        rows: [{
          id: 'uuid-002',
          name: 'Dave',
          email: 'dave@example.com',
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
        }],
      })
      .mockResolvedValueOnce({                           // findById (requireAuth lookup)
        rows: [{
          id: 'uuid-002',
          name: 'Dave',
          email: 'dave@example.com',
        }],
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dave@example.com', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
  });

  it('401: returns error on wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpass', 10);

    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'uuid-003',
        email: 'eve@example.com',
        password_hash: passwordHash,
      }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'eve@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('401: returns error when user does not exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'somepass' });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it('400: returns validation error when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '', password: 'somepass' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('A valid email address is required.');
  });

  it('400: returns validation error when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u@u.com', password: undefined });

    expect(res.status).toBe(400);
    expect(res.body.errors).toContain('Password is required.');
  });
});
