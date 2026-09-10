/**
 * backend/src/__tests__/project.routes.test.js
 *
 * Phase 26: Integration tests for project creation and GitHub URL validation.
 * DB layer and external GitHub service are fully mocked.
 */

process.env.DATABASE_URL  = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET    = 'test-jwt-secret-for-phase26';
process.env.JWT_EXPIRES_IN = '1d';
process.env.NODE_ENV      = 'test';

// ── Mock DB ───────────────────────────────────────────────────────────────────
jest.mock('../../src/utils/db', () => ({
  query: jest.fn(),
  pool:  { end: jest.fn() },
}));

// ── Mock logger ───────────────────────────────────────────────────────────────
jest.mock('../../src/utils/logger', () => ({
  info:  jest.fn(),
  warn:  jest.fn(),
  error: jest.fn(),
}));

// ── Mock external GitHub service ──────────────────────────────────────────────
jest.mock('../../src/services/githubService', () => ({
  fetchRepoData: jest.fn(),
}));

// ── Mock repository downloader (not needed for these tests) ───────────────────
jest.mock('../../src/services/repositoryDownloader', () => ({
  withWorkspace: jest.fn(),
}));

// ── Mock analyzer service ─────────────────────────────────────────────────────
jest.mock('../../src/services/analyzerService', () => ({
  callAnalyzer: jest.fn(),
}));

const request       = require('supertest');
const jwt           = require('jsonwebtoken');
const express       = require('express');
const db            = require('../../src/utils/db');
const githubService = require('../../src/services/githubService');
const projectRoutes = require('../../src/routes/projectRoutes');
const errorHandler  = require('../../src/middleware/errorHandler');

// Build a test Express app
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectRoutes);
  app.use(errorHandler);
  return app;
}

// Helper: create a valid JWT for a fake user
function makeAuthToken(userId = 'user-001') {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Helper: mock the DB user lookup performed by requireAuth
function mockAuthUser(userId = 'user-001') {
  db.query.mockResolvedValueOnce({
    rows: [{ id: userId, name: 'Test User', email: 'test@example.com' }],
  });
}

let app;

beforeEach(() => {
  app = buildApp();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/projects — Create Project
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/projects', () => {
  it('201: creates a project with a valid GitHub URL', async () => {
    const token = makeAuthToken();

    // requireAuth: findById
    mockAuthUser();

    // githubService returns mock metadata
    githubService.fetchRepoData.mockResolvedValueOnce({
      owner: 'facebook',
      name: 'react',
      description: 'A declarative UI library',
      default_branch: 'main',
      stars_count: 210000,
      forks_count: 42000,
      languages: { JavaScript: 99 },
      open_issues_count: 1000,
      is_archived: false,
      file_structure: [],
      readme: { path: 'README.md' },
      pushed_at: '2024-01-01T00:00:00Z',
    });

    // projectModel.create — upsert or insert
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'proj-001',
        user_id: 'user-001',
        repo_url: 'https://github.com/facebook/react',
        owner: 'facebook',
        name: 'react',
        description: 'A declarative UI library',
        default_branch: 'main',
        stars_count: 210000,
        forks_count: 42000,
        languages: { JavaScript: 99 },
        created_at: new Date().toISOString(),
      }],
    });

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoUrl: 'https://github.com/facebook/react' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.project.name).toBe('react');
    expect(res.body.data.project.owner).toBe('facebook');
  });

  it('400: rejects a non-GitHub URL', async () => {
    const token = makeAuthToken();
    mockAuthUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoUrl: 'https://gitlab.com/owner/repo' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toMatch(/github\.com/i);
  });

  it('400: rejects a URL with only owner (no repo name)', async () => {
    const token = makeAuthToken();
    mockAuthUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ repoUrl: 'https://github.com/facebook' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('400: rejects missing repoUrl field', async () => {
    const token = makeAuthToken();
    mockAuthUser();

    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('401: rejects request with no Authorization header', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ repoUrl: 'https://github.com/owner/repo' });

    expect(res.status).toBe(401);
  });

  it('401: rejects request with invalid/malformed JWT', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', 'Bearer not.a.valid.token')
      .send({ repoUrl: 'https://github.com/owner/repo' });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/projects — List Projects
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/projects', () => {
  it('200: returns empty array when user has no projects', async () => {
    const token = makeAuthToken();
    mockAuthUser();

    // projectModel.findByUser — empty
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.projects).toEqual([]);
    expect(res.body.results).toBe(0);
  });

  it('200: returns project list for authenticated user', async () => {
    const token = makeAuthToken();
    mockAuthUser();

    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'p1', name: 'react',   owner: 'facebook', stars_count: 200000 },
        { id: 'p2', name: 'next.js', owner: 'vercel',   stars_count: 110000 },
      ],
    });

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.projects).toHaveLength(2);
    expect(res.body.data.projects[0].name).toBe('react');
  });

  it('401: requires authentication', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});
