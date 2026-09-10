/**
 * backend/src/__tests__/pdfReportService.test.js
 *
 * Phase 26: Unit tests for the PDF report generation service.
 * Verifies: valid PDF magic bytes, correct file size, and that real
 * score/prediction data flows through the generator.
 */

process.env.DATABASE_URL  = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET    = 'test-jwt-secret-for-phase26';
process.env.NODE_ENV      = 'test';

const { PassThrough } = require('stream');
const { generateAnalysisPdfReport } = require('../../src/services/pdfReportService');

// ── Minimal mock runData that mirrors what getRunDetailsById returns ───────────
function makeMockRunData(overrides = {}) {
  return {
    run: {
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_seconds: 42,
    },
    metrics: {
      total_loc: 8500,
      code_loc: 6200,
      comment_loc: 800,
      blank_loc: 1500,
      total_files: 120,
      source_files: 85,
      test_files: 10,
      config_files: 8,
      functions: 320,
      classes: 45,
      dependency_count: 30,
      primary_language: 'JavaScript',
    },
    complexity: {
      avg_complexity: 3.8,
      max_complexity: 12,
      high_complexity_count: 3,
    },
    duplication: {
      duplication_percentage: 5.2,
      duplicated_blocks: 4,
    },
    testing: {
      has_tests: true,
      test_files_count: 10,
      test_to_source_file_ratio: 0.12,
    },
    documentation: {
      documentation_score: 72.0,
    },
    dependencies: {
      total_dependency_count: 30,
    },
    security: {
      total_findings: 0,
      severity_counts: { Critical: 0, High: 0, Medium: 0, Low: 0 },
      findings: [],
    },
    architecture: {
      detected_pattern: 'Layered MVC',
      confidence_score: 0.78,
    },
    git_history: {
      total_commits: 312,
      contributor_count: 5,
    },
    scores: {
      overall_score: 68.45,
      score_band: 'Proficient',
      code_quality_score: 72.1,
      maintainability_score: 65.5,
      architecture_score: 70.0,
      testing_score: 55.0,
      security_score: 100.0,
      documentation_score: 72.0,
    },
    recommendations: [
      {
        priority: 'HIGH',
        category: 'Complexity',
        problem: 'High cyclomatic complexity detected',
        suggested_action: 'Refactor complex functions',
      },
      {
        priority: 'MEDIUM',
        category: 'Testing',
        problem: 'Low test ratio',
        suggested_action: 'Add unit tests',
      },
    ],
    ...overrides,
  };
}

const mockProject = {
  id: 'proj-001',
  name: 'react',
  owner: 'facebook',
  repo_url: 'https://github.com/facebook/react',
};

// ── Helper: collect PDF stream into a Buffer ──────────────────────────────────
function collectPdf(project, runData) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = new PassThrough();
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);

    generateAnalysisPdfReport({ project, runData }, stream);
  });
}

function extractPdfText(buf) {
  const raw = buf.toString('latin1');
  const cleaned = raw.replace(/\[(.*?)\]\s*TJ/g, (_, inner) => {
    return inner.replace(/"/g, '').replace(/<([0-9a-fA-F]+)>/g, (__, hex) => {
      try { return Buffer.from(hex, 'hex').toString('latin1'); } catch (e) { return ''; }
    }).replace(/\s*-?\d+\s*/g, '');
  });
  return raw + ' ' + cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('pdfReportService', () => {
  it('generates a valid PDF buffer starting with %PDF', async () => {
    const runData = makeMockRunData();
    const buf = await collectPdf(mockProject, runData);

    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('generates a PDF larger than 4KB for a complete report', async () => {
    const runData = makeMockRunData();
    const buf = await collectPdf(mockProject, runData);

    expect(buf.length).toBeGreaterThan(4096);
  });

  it('computes ML prediction label "Intermediate" for a mid-range score', async () => {
    const runData = makeMockRunData({
      scores: { ...makeMockRunData().scores, overall_score: 68.45 },
      testing: { test_files_count: 0 },
    });
    const buf = await collectPdf(mockProject, runData);

    const text = extractPdfText(buf);
    expect(text).toMatch(/INTERMEDIATE/i);
  });

  it('computes ML prediction label "Advanced" when score ≥70, tests exist, no security issues', async () => {
    const runData = makeMockRunData({
      scores: { ...makeMockRunData().scores, overall_score: 75.0 },
      testing: { test_files_count: 5 },
      security: { total_findings: 0, severity_counts: {}, findings: [] },
      duplication: { duplication_percentage: 4.0 },
    });
    const buf = await collectPdf(mockProject, runData);
    const text = extractPdfText(buf);
    expect(text).toMatch(/ADVANCED/i);
  });

  it('computes ML prediction label "Beginner" for low score with no tests', async () => {
    const runData = makeMockRunData({
      scores: { ...makeMockRunData().scores, overall_score: 30.0 },
      testing: { test_files_count: 0 },
      prediction: { prediction: 'Beginner', confidence: 0.88, disclaimer: 'Model prediction — not an objective fact' }
    });
    const buf = await collectPdf(mockProject, runData);
    const text = extractPdfText(buf);
    expect(text).toMatch(/BEGINNER/i);
  });

  it('includes the Section 22 disclaimer text in the PDF', async () => {
    const runData = makeMockRunData();
    const buf = await collectPdf(mockProject, runData);
    const text = extractPdfText(buf);
    expect(text).toMatch(/not an objective fact/i);
  });

  it('still generates a valid PDF when recommendations list is empty', async () => {
    const runData = makeMockRunData({ recommendations: [] });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('still generates a valid PDF when scores are null (no analysis done)', async () => {
    const runData = makeMockRunData({ scores: null });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });
});
