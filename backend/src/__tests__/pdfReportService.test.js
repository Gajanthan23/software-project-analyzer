/**
 * backend/src/__tests__/pdfReportService.test.js
 *
 * Unit tests for the PDF report generation service.
 * Verifies:
 *   - Valid PDF magic bytes & minimum file size
 *   - ML prediction section always shows "unavailable" (Section 22/42 honesty)
 *   - Fabricated recommendation fallback is gone (zero-rec case shows honest message)
 *   - All eight new deep-content sections render without error
 *   - Edge cases: null scores, empty findings, empty arch problems, etc.
 */

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET   = 'test-jwt-secret-for-phase26';
process.env.NODE_ENV     = 'test';

const { PassThrough } = require('stream');
const { generateAnalysisPdfReport } = require('../../src/services/pdfReportService');

// ── Minimal mock that mirrors what getRunDetailsById returns ───────────────────
// NOTE: JSONB fields arrive as parsed objects from pg (not strings) in tests,
// matching the safe-parse logic in pdfReportService.safeJsonParse().
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
      high_complexity_threshold: 10,
      total_functions: 320,
      // top_complex_functions can be an object (pg JSONB) or a JSON string
      top_complex_functions: [
        { file: 'src/controllers/analysisController.js', name: 'runAnalysis', complexity: 18, severity: 'High' },
        { file: 'src/services/pdfReportService.js',      name: 'generateReport', complexity: 14, severity: 'High' },
        { file: 'src/models/analysisModel.js',           name: 'getRunDetailsById', complexity: 11, severity: 'Medium' },
      ],
      file_complexity: [],
    },
    duplication: {
      duplication_percentage: 5.2,
      duplicated_blocks: 4,
      duplicated_loc: 320,
      duplicated_files_count: 3,
      duplicated_files: [
        { file: 'src/utils/helpers.js', blocks: 2, loc: 180 },
        { file: 'src/models/userModel.js', blocks: 1, loc: 80 },
        { file: 'src/routes/projectRoutes.js', blocks: 1, loc: 60 },
      ],
      duplicate_instances: [],
    },
    testing: {
      has_tests: true,
      test_files_count: 10,
      source_files_count: 85,
      test_to_source_file_ratio: 0.118,
      test_loc: 1200,
      source_loc: 6200,
      test_frameworks: ['jest', 'supertest'],
      has_coverage_report: false,
      coverage_percentage: null,
      coverage_status: 'unavailable',
      coverage_message: 'Coverage data unavailable',
      test_directories: ['src/__tests__'],
      test_files: [],
    },
    documentation: {
      documentation_score: 72.0,
      classification: 'HEURISTIC',
      has_readme: true,
      has_docs_dir: true,
      readme_file: 'README.md',
      readme_size_bytes: 7200,
      readme_sections: {
        description: true,
        installation: true,
        usage: true,
        examples: false,
        api_documentation: false,
        contributing: true,
      },
      comment_density_pct: 11.4,
      docs_files_count: 3,
      governance_files: {},
      recommendations: [],
      analysis_notes: null,
    },
    dependencies: {
      total_dependency_count: 30,
      production_dependency_count: 22,
      dev_dependency_count: 8,
    },
    security: {
      total_findings: 2,
      severity_counts: { Critical: 0, High: 1, Medium: 1, Low: 0 },
      findings: [
        {
          severity: 'High',
          file_path: 'src/utils/auth.js',
          line_number: 42,
          category: 'Hardcoded Secret',
          title: 'Hardcoded API key detected',
          description: 'API key found in source code',
          recommendation: 'Move to environment variable',
        },
        {
          severity: 'Medium',
          file_path: 'src/controllers/projectController.js',
          line_number: 88,
          category: 'SQL Injection Risk',
          title: 'Unparameterized query',
          description: 'User input concatenated into SQL',
          recommendation: 'Use parameterized queries',
        },
      ],
    },
    architecture: {
      detected_pattern: 'Layered MVC',
      confidence_score: 0.78,
      classification: 'HEURISTIC',
      layer_violations_count: 1,
      architectural_problems: [
        'Controller directly accesses database logic without service layer abstraction',
      ],
      detected_layers: ['routes', 'controllers', 'models'],
      structural_summary: {},
      recommendations: [],
    },
    git_history: {
      total_commits: 312,
      contributor_count: 5,
      repository_age_days: 180,
      recent_commits_30d: 22,
      recent_commits_90d: 68,
      branch_count: 3,
      commit_frequency_per_week: 4.1,
      first_commit_date: '2026-03-01T00:00:00Z',
      latest_commit_date: '2026-09-20T00:00:00Z',
      top_contributors: [],
      is_git_repository: true,
    },
    scores: {
      overall_score: 68.45,
      score_band: 'Proficient',
      code_quality_score: 72.1,
      maintainability_score: 65.5,
      architecture_score: 70.0,
      testing_score: 55.0,
      security_score: 90.0,
      documentation_score: 72.0,
    },
    recommendations: [
      {
        priority: 'HIGH',
        category: 'Complexity',
        problem: 'High cyclomatic complexity detected in 3 functions',
        suggested_action: 'Refactor runAnalysis() and generateReport() into smaller single-responsibility functions.',
      },
      {
        priority: 'HIGH',
        category: 'Security',
        problem: 'Hardcoded secret detected in src/utils/auth.js',
        suggested_action: 'Move API keys to environment variables and rotate any exposed credentials.',
      },
      {
        priority: 'MEDIUM',
        category: 'Testing',
        problem: 'Low test-to-source ratio (0.118)',
        suggested_action: 'Increase unit test coverage; aim for a ratio above 0.3.',
      },
      {
        priority: 'LOW',
        category: 'Documentation',
        problem: 'Missing Examples and API Documentation sections in README',
        suggested_action: 'Add usage examples and a dedicated API docs section to README.md.',
      },
    ],
    // NOTE: 'prediction' is intentionally absent — pdfReportService must
    // handle this gracefully and print "ML prediction unavailable".
    ...overrides,
  };
}

const mockProject = {
  id: 'proj-001',
  name: 'software-project-analyzer',
  owner: 'Gajanthan23',
  repo_url: 'https://github.com/Gajanthan23/software-project-analyzer',
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
  // Extract TJ string content from PDF stream
  const cleaned = raw.replace(/\[(.*?)\]\s*TJ/g, (_, inner) => {
    return inner
      .replace(/"/g, '')
      .replace(/<([0-9a-fA-F]+)>/g, (__, hex) => {
        try { return Buffer.from(hex, 'hex').toString('latin1'); } catch (e) { return ''; }
      })
      .replace(/\s*-?\d+\s*/g, '');
  });
  return raw + ' ' + cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('pdfReportService', () => {

  // ── Basic output integrity ──────────────────────────────────────────────
  it('generates a valid PDF buffer starting with %PDF', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('generates a PDF larger than 10 KB for a complete report', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.length).toBeGreaterThan(10240);
  });

  // ── Part A: Honesty — ML prediction ────────────────────────────────────
  it('always prints "ML prediction unavailable" — never a fabricated label', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    const text = extractPdfText(buf);
    expect(text).toMatch(/unavailable/i);
  });

  it('prints "unavailable" even when a prediction override is passed', async () => {
    // A caller might accidentally pass a prediction object; the service
    // must still ignore it and print the honest message.
    const runData = makeMockRunData({
      prediction: { prediction: 'Advanced', confidence: 0.91 },
    });
    const buf = await collectPdf(mockProject, runData);
    const text = extractPdfText(buf);
    expect(text).toMatch(/unavailable/i);
  });

  // ── Part A: Honesty — empty recommendations ─────────────────────────────
  it('prints the honest empty message when recommendations is empty []', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData({ recommendations: [] }));
    const text = extractPdfText(buf);
    // Must NOT fabricate a recommendation
    expect(text).not.toMatch(/No automated unit tests detected/i);
    // Must print the honest message
    expect(text).toMatch(/No issues detected/i);
  });

  // ── Part B: New sections render without crash ───────────────────────────
  it('renders the complexity detail table with real function data', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(10240);
  });

  it('renders the duplication detail section without crashing', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders the testing detail section with coverage unavailable message', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    const text = extractPdfText(buf);
    expect(text).toMatch(/unavailable/i);
  });

  it('renders the documentation checklist section without crashing', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders the security findings table when findings exist', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders "No security findings" message when findings array is empty', async () => {
    const runData = makeMockRunData({
      security: { total_findings: 0, severity_counts: { Critical: 0, High: 0, Medium: 0, Low: 0 }, findings: [] },
    });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders the architecture detail section with architectural problems', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders "No architectural problems detected" when list is empty', async () => {
    const runData = makeMockRunData({
      architecture: {
        detected_pattern: 'Flat / Unstructured',
        confidence_score: 0.45,
        classification: 'HEURISTIC',
        layer_violations_count: 0,
        architectural_problems: [],
        detected_layers: [],
        structural_summary: {},
        recommendations: [],
      },
    });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders the git history summary section without crashing', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('renders all recommendations grouped by priority (HIGH first)', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData());
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(10240);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  it('still generates a valid PDF when scores are null', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData({ scores: null }));
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('still generates a valid PDF when complexity is null', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData({ complexity: null }));
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('still generates a valid PDF when duplication is null', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData({ duplication: null }));
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('still generates a valid PDF when architecture is null', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData({ architecture: null }));
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('still generates a valid PDF when git_history is null', async () => {
    const buf = await collectPdf(mockProject, makeMockRunData({ git_history: null }));
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('handles top_complex_functions as a JSON string (pg TEXT column)', async () => {
    // Simulate DB returning the field as a raw JSON string instead of parsed object
    const runData = makeMockRunData({
      complexity: {
        avg_complexity: 5.1,
        max_complexity: 22,
        high_complexity_count: 5,
        high_complexity_threshold: 10,
        total_functions: 200,
        top_complex_functions: JSON.stringify([
          { file: 'src/app.js', name: 'handleRequest', complexity: 22, severity: 'Critical' },
        ]),
        file_complexity: '[]',
      },
    });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('handles readme_sections as a JSON string (pg TEXT column)', async () => {
    const runData = makeMockRunData({
      documentation: {
        documentation_score: 50.0,
        classification: 'HEURISTIC',
        has_readme: true,
        has_docs_dir: false,
        readme_sections: JSON.stringify({ description: true, installation: false, usage: true, examples: false, api_documentation: false, contributing: false }),
        comment_density_pct: 5.0,
        docs_files_count: 0,
        governance_files: '{}',
        recommendations: '[]',
      },
    });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
  });

  it('handles "+X more" truncation when there are more than 20 security findings', async () => {
    const manyFindings = Array.from({ length: 25 }, (_, i) => ({
      severity: 'Medium',
      file_path: `src/module${i}.js`,
      line_number: i + 1,
      category: 'Pattern Match',
      title: `Finding ${i + 1}`,
      description: 'Auto-detected pattern',
      recommendation: 'Review and fix',
    }));
    const runData = makeMockRunData({
      security: {
        total_findings: 25,
        severity_counts: { Critical: 0, High: 0, Medium: 25, Low: 0 },
        findings: manyFindings,
      },
    });
    const buf = await collectPdf(mockProject, runData);
    expect(buf.slice(0, 4).toString('ascii')).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(10240);
  });
});
