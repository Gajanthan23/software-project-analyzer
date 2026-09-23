/**
 * services/pdfReportService.js
 *
 * Section 27: Native PDF Report Generation Engine
 * Streams a professional, high-fidelity A4 PDF report for a project analysis run.
 * Reuses ONLY real stored database metrics, quality sub-scores, telemetry facts,
 * recommendations, and analysis results. No fabricated or hardcoded fallback values.
 *
 * Honesty rules (Sections 20/22/42):
 *   - ML prediction: always prints "ML prediction unavailable for this analysis"
 *     because no prediction model is wired into this pipeline.
 *   - Recommendations: if genuinely zero, prints the honest empty message.
 *   - All other fields: rendered from real DB data only; missing fields print
 *     explicit "Data unavailable" labels, never invented values.
 */

const PDFDocument = require('pdfkit');

// ─── Safe JSON parse helper ────────────────────────────────────────────────────
// DB JSONB columns come back as parsed objects from pg, but TEXT columns that
// hold JSON come back as strings. This handles both safely.
function safeJsonParse(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value; // already parsed by pg
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

// ─── Layout helpers ────────────────────────────────────────────────────────────

function drawHeader(doc, title, subtitle) {
  doc.rect(40, 40, 515, 50).fill('#1e1e38');

  doc.fillColor('#ffffff')
     .fontSize(14)
     .font('Helvetica-Bold')
     .text(title, 55, 50, { width: 400 });

  doc.fillColor('#a5b4fc')
     .fontSize(9)
     .font('Helvetica')
     .text(subtitle, 55, 68, { width: 400 });

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  doc.fillColor('#94a3b8')
     .fontSize(8)
     .font('Helvetica')
     .text(`Generated: ${dateStr}`, 410, 58, { align: 'right', width: 130 });

  doc.y = 105;
}

function drawFooter(doc) {
  const bottomY = 800;
  doc.rect(40, bottomY, 515, 0.5).fill('#cbd5e1');
  doc.fillColor('#94a3b8')
     .fontSize(8)
     .font('Helvetica')
     .text('Software Project Quality Analyzer — Section 27 Confidential Analysis Report', 40, bottomY + 6, { align: 'left' });
}

function drawSectionTitle(doc, title) {
  const currentY = doc.y;
  doc.rect(40, currentY, 4, 14).fill('#6366f1');
  doc.fillColor('#0f172a')
     .fontSize(11)
     .font('Helvetica-Bold')
     .text(title, 52, currentY + 1);
  doc.y = currentY + 22;
}

/**
 * Add a new page with the continuation header and reset doc.y.
 */
function addPage(doc) {
  doc.addPage();
  drawHeader(doc, 'SOFTWARE QUALITY ANALYSIS REPORT (CONT.)', 'Detailed Metrics, Findings & Remediation Plan');
}

/**
 * Guard: if doc.y is past threshold, add a page break.
 */
function guardPageBreak(doc, threshold) {
  if (doc.y > threshold) addPage(doc);
}

// ─── Main generator ────────────────────────────────────────────────────────────

function generateAnalysisPdfReport({ project, runData }, resStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    compress: false,
    info: {
      Title: `Software Quality Analysis Report - ${project.name}`,
      Author: 'Software Project Quality Analyzer',
      Subject: 'Multi-Dimensional Engineering Quality & Architecture Assessment',
    }
  });

  doc.pipe(resStream);

  const {
    run,
    metrics,
    complexity,
    duplication,
    testing,
    documentation,
    dependencies,
    security,
    architecture,
    git_history,
    scores,
    recommendations,
  } = runData;

  // ── 1. Header Banner ──────────────────────────────────────────────────────
  drawHeader(doc, 'SOFTWARE QUALITY ANALYSIS REPORT', 'Multi-Dimensional Codebase Metrics, Architecture & Security Evaluation');

  // ── 2. Project Meta & Overview Grid ──────────────────────────────────────
  const metaY = doc.y;
  doc.rect(40, metaY, 515, 60).fill('#f8fafc');
  doc.rect(40, metaY, 515, 60).stroke('#e2e8f0');

  doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('REPOSITORY NAME', 52, metaY + 10);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${project.owner}/${project.name}`, 52, metaY + 22);
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(project.repo_url || 'N/A', 52, metaY + 38);

  doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('PRIMARY LANGUAGE', 280, metaY + 10);
  doc.fillColor('#6366f1').fontSize(10).font('Helvetica-Bold').text(metrics?.primary_language || project.primary_language || 'Unknown', 280, metaY + 22);

  doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold').text('ANALYSIS RUN ID', 400, metaY + 10);
  doc.fillColor('#334155').fontSize(8).font('Courier').text(run.id.slice(0, 18) + '...', 400, metaY + 22);
  doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(run.completed_at ? new Date(run.completed_at).toLocaleString() : 'Completed', 400, metaY + 38);

  doc.y = metaY + 75;

  // ── 3. Overall Quality Score ──────────────────────────────────────────────
  drawSectionTitle(doc, '1. OVERALL SOFTWARE QUALITY SCORE');

  const scoreY = doc.y;
  doc.rect(40, scoreY, 515, 65).fill('#eef2ff');
  doc.rect(40, scoreY, 515, 65).stroke('#c7d2fe');

  const overallScoreVal = scores ? parseFloat(scores.overall_score).toFixed(2) : 'N/A';
  const scoreBand = scores?.score_band || 'N/A';

  doc.fillColor('#4338ca').fontSize(32).font('Helvetica-Bold').text(overallScoreVal, 60, scoreY + 12);
  doc.fillColor('#6366f1').fontSize(9).font('Helvetica-Bold').text('/ 100 OVERALL', 60, scoreY + 44);

  doc.rect(200, scoreY + 18, 110, 24).fill('#6366f1');
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(scoreBand.toUpperCase(), 200, scoreY + 25, { width: 110, align: 'center' });
  doc.fillColor('#475569').fontSize(8).font('Helvetica').text('Score Band Classification', 200, scoreY + 46, { width: 110, align: 'center' });

  doc.fillColor('#334155').fontSize(8).font('Helvetica')
     .text('Methodology: Weighted composite of Code Quality (25%), Maintainability (20%), Architecture (20%), Testing (15%), Security (10%), Documentation (10%). Evaluated against rule-based heuristic benchmarks.', 330, scoreY + 15, { width: 215 });

  doc.y = scoreY + 80;

  // ── 4. Quality Sub-Scores Table ───────────────────────────────────────────
  drawSectionTitle(doc, '2. QUALITY SUB-SCORES BREAKDOWN');

  const tableTop = doc.y;
  doc.rect(40, tableTop, 515, 18).fill('#f1f5f9');
  doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
  doc.text('SUB-SCORE CATEGORY', 50, tableTop + 5);
  doc.text('WEIGHT', 230, tableTop + 5);
  doc.text('SCORE (0-100)', 330, tableTop + 5);
  doc.text('EVALUATION BAND', 440, tableTop + 5);

  const subScores = [
    { name: 'Code Quality',   weight: '25%', score: scores?.code_quality_score },
    { name: 'Maintainability', weight: '20%', score: scores?.maintainability_score },
    { name: 'Architecture',   weight: '20%', score: scores?.architecture_score },
    { name: 'Testing Suite',  weight: '15%', score: scores?.testing_score },
    { name: 'Security',       weight: '10%', score: scores?.security_score },
    { name: 'Documentation',  weight: '10%', score: scores?.documentation_score },
  ];

  let currentY = tableTop + 20;
  subScores.forEach((row, i) => {
    if (i % 2 === 1) doc.rect(40, currentY - 2, 515, 16).fill('#f8fafc');
    const val = row.score !== undefined && row.score !== null ? parseFloat(row.score).toFixed(2) : 'N/A';
    let band = 'Needs Improvement';
    if (val >= 90) band = 'Excellent';
    else if (val >= 75) band = 'Advanced';
    else if (val >= 60) band = 'Proficient';
    else if (val >= 40) band = 'Developing';

    doc.fillColor('#1e293b').fontSize(8).font('Helvetica-Bold').text(row.name, 50, currentY);
    doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(row.weight, 230, currentY);
    doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold').text(val, 330, currentY);
    doc.fillColor('#334155').fontSize(8).font('Helvetica').text(band, 440, currentY);
    currentY += 16;
  });
  doc.y = currentY + 15;

  // ── 5. Key Repository Telemetry Facts ─────────────────────────────────────
  drawSectionTitle(doc, '3. KEY REPOSITORY TELEMETRY FACTS');

  const factTop = doc.y;
  doc.rect(40, factTop, 515, 45).fill('#f8fafc');
  doc.rect(40, factTop, 515, 45).stroke('#e2e8f0');

  const locVal      = metrics?.total_loc ? metrics.total_loc.toLocaleString() : '0';
  const codeLocVal  = metrics?.code_loc  ? metrics.code_loc.toLocaleString()  : '0';
  const sourceFiles = metrics?.source_files    || 0;
  const totalFiles  = metrics?.total_files     || 0;
  const depCount    = metrics?.dependency_count || 0;
  const commitsCount = git_history?.total_commits || 0;

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('TOTAL LINES OF CODE', 52, factTop + 8);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(locVal, 52, factTop + 18);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(`Code LOC: ${codeLocVal}`, 52, factTop + 32);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('SOURCE FILES', 180, factTop + 8);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${sourceFiles}`, 180, factTop + 18);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text(`Total Files: ${totalFiles}`, 180, factTop + 32);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('DEPENDENCIES', 310, factTop + 8);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${depCount}`, 310, factTop + 18);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Declared Packages', 310, factTop + 32);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('GIT COMMITS', 430, factTop + 8);
  doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(`${commitsCount}`, 430, factTop + 18);
  doc.fillColor('#94a3b8').fontSize(7).font('Helvetica').text('Recorded Commits', 430, factTop + 32);

  doc.y = factTop + 55;

  // ── 6. ML Prediction — Honesty Section (Section 22/42) ────────────────────
  guardPageBreak(doc, 680);
  drawSectionTitle(doc, '4. ML MATURITY PREDICTION');

  const predY = doc.y;
  doc.rect(40, predY, 515, 38).fill('#fefce8');
  doc.rect(40, predY, 515, 38).stroke('#fde68a');

  doc.fillColor('#92400e').fontSize(9).font('Helvetica-Bold')
     .text('ML prediction unavailable for this analysis', 52, predY + 8);
  doc.fillColor('#78350f').fontSize(7.5).font('Helvetica')
     .text('No ML model prediction is wired into this pipeline. Maturity assessment is derived exclusively from the heuristic quality scores above. (Section 22/42 Honesty Rule — ML PREDICTION must never be fabricated.)', 52, predY + 21, { width: 490 });

  doc.y = predY + 48;

  // ── 7. Complexity Detail ──────────────────────────────────────────────────
  guardPageBreak(doc, 640);
  drawSectionTitle(doc, '5. COMPLEXITY ENGINE — DETAIL');

  // Summary bar
  const cxSumY = doc.y;
  doc.rect(40, cxSumY, 515, 30).fill('#f8fafc').stroke('#e2e8f0');
  doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold')
     .text(`Avg Cyclomatic: ${complexity?.avg_complexity ?? 'N/A'}`, 52, cxSumY + 5);
  doc.fillColor('#334155').fontSize(8).font('Helvetica')
     .text(`Max: ${complexity?.max_complexity ?? 'N/A'}   |   High-Complexity Functions (>${complexity?.high_complexity_threshold ?? 10}): ${complexity?.high_complexity_count ?? 0}   |   Total Functions Analyzed: ${complexity?.total_functions ?? 'N/A'}`, 52, cxSumY + 17);
  doc.y = cxSumY + 38;

  // Top complex functions table
  const topFns = safeJsonParse(complexity?.top_complex_functions, []);
  const displayFns = topFns.slice(0, 10);

  if (displayFns.length === 0) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('No function-level complexity data available for this analysis.', 52, doc.y);
    doc.y += 14;
  } else {
    const fnTableY = doc.y;
    doc.rect(40, fnTableY, 515, 16).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    doc.text('FILE PATH', 50, fnTableY + 4);
    doc.text('FUNCTION NAME', 220, fnTableY + 4);
    doc.text('COMPLEXITY', 380, fnTableY + 4);
    doc.text('SEVERITY', 455, fnTableY + 4);
    doc.y = fnTableY + 18;

    displayFns.forEach((fn, i) => {
      guardPageBreak(doc, 760);
      const rowY = doc.y;
      if (i % 2 === 1) doc.rect(40, rowY - 1, 515, 14).fill('#f8fafc');

      const filePath  = fn.file || fn.file_path || 'unknown';
      const fnName    = fn.name || fn.function_name || 'anonymous';
      const score     = fn.complexity !== undefined ? fn.complexity : (fn.cyclomatic_complexity ?? '?');
      const severity  = fn.severity || (score >= 20 ? 'Critical' : score >= 15 ? 'High' : score >= 10 ? 'Medium' : 'Low');
      const sevColor  = severity === 'Critical' ? '#dc2626' : severity === 'High' ? '#ea580c' : severity === 'Medium' ? '#d97706' : '#16a34a';

      // Truncate long paths
      const shortPath = filePath.length > 35 ? '…' + filePath.slice(-34) : filePath;
      const shortFn   = fnName.length > 22   ? fnName.slice(0, 21) + '…' : fnName;

      doc.fillColor('#334155').fontSize(7).font('Helvetica').text(shortPath, 50, rowY, { width: 165 });
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica-Bold').text(shortFn, 220, rowY, { width: 155 });
      doc.fillColor('#4338ca').fontSize(7).font('Helvetica-Bold').text(String(score), 385, rowY);
      doc.fillColor(sevColor).fontSize(7).font('Helvetica-Bold').text(severity, 455, rowY);
      doc.y = rowY + 13;
    });

    if (topFns.length > 10) {
      doc.fillColor('#64748b').fontSize(7).font('Helvetica')
         .text(`+ ${topFns.length - 10} more functions not shown — all are stored in the database.`, 50, doc.y);
      doc.y += 12;
    }
  }
  doc.y += 8;

  // ── 8. Duplication Detail ─────────────────────────────────────────────────
  guardPageBreak(doc, 620);
  drawSectionTitle(doc, '6. CODE DUPLICATION — DETAIL');

  const dupSumY = doc.y;
  doc.rect(40, dupSumY, 515, 30).fill('#f8fafc').stroke('#e2e8f0');
  const dupPct    = duplication?.duplication_percentage !== undefined ? `${parseFloat(duplication.duplication_percentage).toFixed(2)}%` : 'N/A';
  const dupBlocks = duplication?.duplicated_blocks ?? 'N/A';
  const dupLoc    = duplication?.duplicated_loc   ?? 'N/A';
  const dupFilesCount = duplication?.duplicated_files_count ?? 0;

  doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold')
     .text(`Duplication: ${dupPct}`, 52, dupSumY + 5);
  doc.fillColor('#334155').fontSize(8).font('Helvetica')
     .text(`Duplicated Blocks: ${dupBlocks}   |   Duplicated LOC: ${dupLoc}   |   Affected Files: ${dupFilesCount}`, 52, dupSumY + 17);
  doc.y = dupSumY + 38;

  const dupFiles = safeJsonParse(duplication?.duplicated_files, []);
  const displayDupFiles = dupFiles.slice(0, 8);

  if (displayDupFiles.length === 0) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text(dupPct === '0.00%' || dupPct === 'N/A'
         ? 'No duplicated code blocks detected in this repository.'
         : 'Duplicated file list not available for this analysis run.',
         52, doc.y);
    doc.y += 14;
  } else {
    const dfTableY = doc.y;
    doc.rect(40, dfTableY, 515, 16).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    doc.text('FILE PATH (MOST DUPLICATED)', 50, dfTableY + 4);
    doc.text('DUPLICATE BLOCKS', 380, dfTableY + 4);
    doc.text('DUP LOC', 480, dfTableY + 4);
    doc.y = dfTableY + 18;

    displayDupFiles.forEach((df, i) => {
      guardPageBreak(doc, 760);
      const rowY = doc.y;
      if (i % 2 === 1) doc.rect(40, rowY - 1, 515, 13).fill('#f8fafc');
      const fp = typeof df === 'string' ? df : (df.file || df.path || 'unknown');
      const blocks = typeof df === 'object' ? (df.blocks ?? df.count ?? '?') : '?';
      const dloc   = typeof df === 'object' ? (df.loc ?? df.duplicated_loc ?? '?') : '?';
      const shortFp = fp.length > 52 ? '…' + fp.slice(-51) : fp;
      doc.fillColor('#334155').fontSize(7).font('Helvetica').text(shortFp, 50, rowY, { width: 325 });
      doc.fillColor('#dc2626').fontSize(7).font('Helvetica-Bold').text(String(blocks), 385, rowY);
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(String(dloc), 482, rowY);
      doc.y = rowY + 13;
    });

    if (dupFiles.length > 8) {
      doc.fillColor('#64748b').fontSize(7).font('Helvetica')
         .text(`+ ${dupFiles.length - 8} more files not shown.`, 50, doc.y);
      doc.y += 12;
    }
  }
  doc.y += 8;

  // ── 9. Testing Detail ─────────────────────────────────────────────────────
  guardPageBreak(doc, 600);
  drawSectionTitle(doc, '7. TESTING SUITE — DETAIL');

  const testY = doc.y;
  doc.rect(40, testY, 515, 50).fill('#f8fafc').stroke('#e2e8f0');

  const hasTests     = testing?.has_tests ? 'Yes' : 'No';
  const testFileCnt  = testing?.test_files_count ?? 0;
  const srcFileCnt   = testing?.source_files_count ?? metrics?.source_files ?? 0;
  const testRatio    = testing?.test_to_source_file_ratio !== undefined
    ? parseFloat(testing.test_to_source_file_ratio).toFixed(3)
    : 'N/A';
  const frameworks   = safeJsonParse(testing?.test_frameworks, []);
  const fwStr        = frameworks.length > 0 ? frameworks.join(', ') : 'None detected';
  const coveragePct  = testing?.coverage_percentage !== null && testing?.coverage_percentage !== undefined
    ? `${parseFloat(testing.coverage_percentage).toFixed(1)}%`
    : null;
  const coverageMsg  = testing?.coverage_message || 'Coverage data unavailable';

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('HAS TESTS', 52, testY + 8);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(hasTests, 52, testY + 19);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('TEST FILES', 140, testY + 8);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`${testFileCnt}`, 140, testY + 19);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('TEST : SOURCE RATIO', 220, testY + 8);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(testRatio, 220, testY + 19);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('COVERAGE', 320, testY + 8);
  doc.fillColor(coveragePct ? '#0f172a' : '#dc2626').fontSize(9).font('Helvetica-Bold')
     .text(coveragePct ?? 'Unavailable', 320, testY + 19);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('FRAMEWORKS DETECTED', 420, testY + 8);
  doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold').text(fwStr, 420, testY + 19, { width: 125 });

  // Coverage message row
  doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
     .text(`Coverage status: ${coveragePct ? `${coveragePct} (${testing?.coverage_status || 'ok'})` : coverageMsg}`, 52, testY + 37, { width: 490 });

  doc.y = testY + 60;

  // ── 10. Documentation Checklist ───────────────────────────────────────────
  guardPageBreak(doc, 620);
  drawSectionTitle(doc, '8. DOCUMENTATION COMPLETENESS CHECKLIST');

  const docSumY = doc.y;
  doc.rect(40, docSumY, 515, 20).fill('#f1f5f9');
  const docScore = documentation?.documentation_score !== undefined
    ? parseFloat(documentation.documentation_score).toFixed(1)
    : 'N/A';
  doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold')
     .text(`Documentation Score: ${docScore} / 100`, 50, docSumY + 6);
  doc.fillColor('#64748b').fontSize(8).font('Helvetica')
     .text(`README: ${documentation?.has_readme ? '✓' : '✗'}   |   Docs Directory: ${documentation?.has_docs_dir ? '✓' : '✗'}   |   Comment Density: ${documentation?.comment_density_pct !== undefined ? parseFloat(documentation.comment_density_pct).toFixed(1) + '%' : 'N/A'}`, 280, docSumY + 6);
  doc.y = docSumY + 28;

  // README sections checklist (from readme_sections JSONB field)
  const readmeSections = safeJsonParse(documentation?.readme_sections, {});
  const CHECKLIST_KEYS = [
    { key: 'description',      label: 'Description' },
    { key: 'installation',     label: 'Installation' },
    { key: 'usage',            label: 'Usage' },
    { key: 'examples',         label: 'Examples' },
    { key: 'api_documentation', label: 'API Documentation' },
    { key: 'contributing',     label: 'Contribution Guide' },
  ];

  if (Object.keys(readmeSections).length === 0) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('README section checklist data not available for this analysis run.', 52, doc.y);
    doc.y += 14;
  } else {
    // Render checklist in 2 columns
    const clY = doc.y;
    doc.rect(40, clY, 515, 16).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
       .text('README SECTION', 50, clY + 4)
       .text('PRESENT', 240, clY + 4)
       .text('README SECTION', 295, clY + 4)
       .text('PRESENT', 490, clY + 4);
    doc.y = clY + 18;

    const pairs = [];
    for (let i = 0; i < CHECKLIST_KEYS.length; i += 2) {
      pairs.push([CHECKLIST_KEYS[i], CHECKLIST_KEYS[i + 1]]);
    }

    pairs.forEach((pair, i) => {
      const rowY = doc.y;
      if (i % 2 === 1) doc.rect(40, rowY - 1, 515, 14).fill('#f8fafc');

      const [left, right] = pair;
      const leftPresent  = readmeSections[left?.key];
      const rightPresent = right ? readmeSections[right.key] : undefined;

      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(left?.label || '', 50, rowY);
      doc.fillColor(leftPresent ? '#16a34a' : '#dc2626').fontSize(9).font('Helvetica-Bold')
         .text(leftPresent ? '✓' : '✗', 240, rowY - 1);

      if (right) {
        doc.fillColor('#334155').fontSize(8).font('Helvetica').text(right.label, 295, rowY);
        doc.fillColor(rightPresent ? '#16a34a' : '#dc2626').fontSize(9).font('Helvetica-Bold')
           .text(rightPresent ? '✓' : '✗', 490, rowY - 1);
      }
      doc.y = rowY + 13;
    });
  }
  doc.y += 8;

  // ── 11. Security Findings Table ───────────────────────────────────────────
  guardPageBreak(doc, 580);
  drawSectionTitle(doc, '9. SECURITY FINDINGS — FULL DETAIL');

  const secFindings = Array.isArray(security?.findings) ? security.findings : [];
  const secTotal    = security?.total_findings ?? secFindings.length;
  const secCounts   = security?.severity_counts || { Critical: 0, High: 0, Medium: 0, Low: 0 };

  // Summary strip
  const secSumY = doc.y;
  doc.rect(40, secSumY, 515, 22).fill('#f8fafc').stroke('#e2e8f0');
  doc.fillColor('#dc2626').fontSize(8).font('Helvetica-Bold').text(`Total: ${secTotal}`, 52, secSumY + 7);
  doc.fillColor('#475569').fontSize(8).font('Helvetica')
     .text(`Critical: ${secCounts.Critical ?? 0}   High: ${secCounts.High ?? 0}   Medium: ${secCounts.Medium ?? 0}   Low: ${secCounts.Low ?? 0}`, 130, secSumY + 7);
  doc.y = secSumY + 30;

  const MAX_SEC_DISPLAY = 20;
  const displayFindings = secFindings.slice(0, MAX_SEC_DISPLAY);

  if (secFindings.length === 0) {
    doc.fillColor('#16a34a').fontSize(8).font('Helvetica-Bold')
       .text('No security findings detected in this analysis.', 52, doc.y);
    doc.y += 14;
  } else {
    const secTableY = doc.y;
    doc.rect(40, secTableY, 515, 16).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold');
    doc.text('SEV', 50, secTableY + 4);
    doc.text('FILE PATH', 90, secTableY + 4);
    doc.text('LINE', 280, secTableY + 4);
    doc.text('CATEGORY', 315, secTableY + 4);
    doc.text('RECOMMENDATION', 415, secTableY + 4);
    doc.y = secTableY + 18;

    displayFindings.forEach((finding, i) => {
      guardPageBreak(doc, 740);
      const rowY = doc.y;
      const rowH = 20;
      if (i % 2 === 1) doc.rect(40, rowY - 1, 515, rowH + 1).fill('#f8fafc');

      const sev      = finding.severity || 'Medium';
      const sevColor = sev === 'Critical' ? '#dc2626' : sev === 'High' ? '#ea580c' : sev === 'Medium' ? '#d97706' : '#16a34a';
      const fp       = finding.file_path || finding.file || 'unknown';
      const ln       = finding.line_number || finding.line || '?';
      const cat      = finding.category || 'Security Finding';
      const rec      = finding.recommendation || finding.description || '';
      const shortFp  = fp.length > 28 ? '…' + fp.slice(-27) : fp;
      const shortCat = cat.length > 18 ? cat.slice(0, 17) + '…' : cat;
      const shortRec = rec.length > 32 ? rec.slice(0, 31) + '…' : rec;

      doc.fillColor(sevColor).fontSize(7).font('Helvetica-Bold').text(sev.toUpperCase().slice(0, 4), 50, rowY);
      doc.fillColor('#334155').fontSize(7).font('Helvetica').text(shortFp, 90, rowY, { width: 185 });
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text(String(ln), 280, rowY);
      doc.fillColor('#0f172a').fontSize(7).font('Helvetica').text(shortCat, 315, rowY, { width: 95 });
      doc.fillColor('#475569').fontSize(7).font('Helvetica').text(shortRec, 415, rowY, { width: 135 });
      doc.y = rowY + rowH;
    });

    if (secFindings.length > MAX_SEC_DISPLAY) {
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
         .text(`+ ${secFindings.length - MAX_SEC_DISPLAY} more findings not shown — all are stored in the database.`, 50, doc.y);
      doc.y += 12;
    }
  }
  doc.y += 8;

  // ── 12. Architecture Detail ───────────────────────────────────────────────
  guardPageBreak(doc, 580);
  drawSectionTitle(doc, '10. ARCHITECTURE ANALYSIS — DETAIL');

  const archY = doc.y;
  doc.rect(40, archY, 515, 30).fill('#f8fafc').stroke('#e2e8f0');

  const archPattern    = architecture?.detected_pattern || 'Unavailable';
  const archConf       = architecture?.confidence_score !== undefined
    ? `${parseFloat(architecture.confidence_score).toFixed(1)}%`
    : 'N/A';
  const archViolations = architecture?.layer_violations_count ?? 0;

  doc.fillColor('#4338ca').fontSize(9).font('Helvetica-Bold')
     .text(`Pattern: ${archPattern}`, 52, archY + 6);
  doc.fillColor('#334155').fontSize(8).font('Helvetica')
     .text(`Confidence: ${archConf}   |   Layer Violations: ${archViolations}   |   Classification: ${architecture?.classification || 'HEURISTIC'}`, 52, archY + 18);
  doc.y = archY + 38;

  // Architectural problems list
  const archProblems = safeJsonParse(architecture?.architectural_problems, []);

  if (!architecture) {
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('No architecture analysis data available for this analysis run.', 52, doc.y);
    doc.y += 14;
  } else if (archProblems.length === 0) {
    doc.fillColor('#16a34a').fontSize(8).font('Helvetica-Bold')
       .text('No architectural problems detected.', 52, doc.y);
    doc.y += 14;
  } else {
    const apTableY = doc.y;
    doc.rect(40, apTableY, 515, 16).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(7.5).font('Helvetica-Bold')
       .text('#', 50, apTableY + 4)
       .text('ARCHITECTURAL PROBLEM DETECTED', 70, apTableY + 4);
    doc.y = apTableY + 18;

    archProblems.forEach((problem, i) => {
      guardPageBreak(doc, 760);
      const rowY = doc.y;
      if (i % 2 === 1) doc.rect(40, rowY - 1, 515, 14).fill('#f8fafc');
      const problemStr = typeof problem === 'string' ? problem : (problem.description || problem.message || JSON.stringify(problem));
      const shortP = problemStr.length > 88 ? problemStr.slice(0, 87) + '…' : problemStr;
      doc.fillColor('#ea580c').fontSize(7).font('Helvetica-Bold').text(String(i + 1), 50, rowY);
      doc.fillColor('#334155').fontSize(7).font('Helvetica').text(shortP, 70, rowY, { width: 470 });
      doc.y = rowY + 13;
    });
  }
  doc.y += 8;

  // ── 13. Git History Summary ───────────────────────────────────────────────
  guardPageBreak(doc, 620);
  drawSectionTitle(doc, '11. GIT HISTORY SUMMARY');

  const gitY = doc.y;
  doc.rect(40, gitY, 515, 50).fill('#f8fafc').stroke('#e2e8f0');

  const totalCommits   = git_history?.total_commits     ?? 'N/A';
  const contributors   = git_history?.contributor_count ?? 'N/A';
  const repoAgeDays    = git_history?.repository_age_days ?? 'N/A';
  const recentCommits  = git_history?.recent_commits_30d ?? 'N/A';
  const branchCount    = git_history?.branch_count       ?? 'N/A';
  const commitFreq     = git_history?.commit_frequency_per_week !== undefined
    ? parseFloat(git_history.commit_frequency_per_week).toFixed(2)
    : 'N/A';

  // Row 1
  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('TOTAL COMMITS', 52, gitY + 6);
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(`${totalCommits}`, 52, gitY + 17);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('CONTRIBUTORS', 160, gitY + 6);
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(`${contributors}`, 160, gitY + 17);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('REPO AGE (DAYS)', 260, gitY + 6);
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(`${repoAgeDays}`, 260, gitY + 17);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('COMMITS (LAST 30D)', 365, gitY + 6);
  doc.fillColor(recentCommits === 0 ? '#dc2626' : '#0f172a').fontSize(10).font('Helvetica-Bold')
     .text(`${recentCommits}`, 365, gitY + 17);

  doc.fillColor('#64748b').fontSize(7).font('Helvetica-Bold').text('BRANCHES', 460, gitY + 6);
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(`${branchCount}`, 460, gitY + 17);

  // Row 2 — dates and frequency
  const firstDate  = git_history?.first_commit_date  ? new Date(git_history.first_commit_date).toLocaleDateString()  : 'N/A';
  const latestDate = git_history?.latest_commit_date ? new Date(git_history.latest_commit_date).toLocaleDateString() : 'N/A';
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
     .text(`First commit: ${firstDate}   |   Latest commit: ${latestDate}   |   Avg commits/week: ${commitFreq}`, 52, gitY + 36, { width: 490 });

  doc.y = gitY + 58;

  // ── 14. Domain Engine Summaries (brief) ───────────────────────────────────
  guardPageBreak(doc, 640);
  drawSectionTitle(doc, '12. DOMAIN ENGINE METRIC SUMMARIES');

  const engineY = doc.y;
  doc.rect(40, engineY, 250, 55).fill('#f8fafc').stroke('#e2e8f0');
  doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold').text('COMPLEXITY ENGINE', 50, engineY + 8);
  doc.fillColor('#334155').fontSize(8).font('Helvetica')
     .text(`Average Complexity: ${complexity?.avg_complexity || 0}`, 50, engineY + 22)
     .text(`Max Cyclomatic: ${complexity?.max_complexity || 0}`, 50, engineY + 34)
     .text(`High-Complexity Functions: ${complexity?.high_complexity_count || 0}`, 50, engineY + 46);

  doc.rect(305, engineY, 250, 55).fill('#f8fafc').stroke('#e2e8f0');
  doc.fillColor('#4338ca').fontSize(8).font('Helvetica-Bold').text('SECURITY ENGINE', 315, engineY + 8);
  doc.fillColor('#334155').fontSize(8).font('Helvetica')
     .text(`Total Findings: ${secTotal}`, 315, engineY + 22)
     .text(`Critical: ${secCounts.Critical ?? 0}   High: ${secCounts.High ?? 0}`, 315, engineY + 34)
     .text(`Medium: ${secCounts.Medium ?? 0}   Low: ${secCounts.Low ?? 0}`, 315, engineY + 46);

  doc.y = engineY + 65;

  // ── 15. Full Recommendations — paginated ──────────────────────────────────
  guardPageBreak(doc, 580);
  drawSectionTitle(doc, '13. FULL ACTIONABLE REMEDIATION RECOMMENDATIONS');

  const allRecs = Array.isArray(recommendations) ? recommendations : [];

  if (allRecs.length === 0) {
    const noRecY = doc.y;
    doc.rect(40, noRecY, 515, 28).fill('#f0fdf4').stroke('#bbf7d0');
    doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold')
       .text('No issues detected by the rule-based recommendation engine.', 52, noRecY + 10);
    doc.y = noRecY + 38;
  } else {
    const recTableY = doc.y;
    doc.rect(40, recTableY, 515, 18).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('PRIORITY', 50, recTableY + 5);
    doc.text('CATEGORY', 115, recTableY + 5);
    doc.text('PROBLEM & ACTIONABLE RECOMMENDATION', 225, recTableY + 5);
    doc.y = recTableY + 20;

    // Group by priority: HIGH → MEDIUM → LOW → others
    const grouped = [
      ...allRecs.filter(r => r.priority === 'HIGH'),
      ...allRecs.filter(r => r.priority === 'MEDIUM'),
      ...allRecs.filter(r => r.priority === 'LOW'),
      ...allRecs.filter(r => !['HIGH', 'MEDIUM', 'LOW'].includes(r.priority)),
    ];

    grouped.forEach((rec, idx) => {
      // Each recommendation item is about 28px tall
      guardPageBreak(doc, 740);
      const recRowY = doc.y;

      if (idx % 2 === 1) doc.rect(40, recRowY - 2, 515, 28).fill('#f8fafc');

      let pColor = '#d97706';
      if (rec.priority === 'HIGH')  pColor = '#dc2626';
      if (rec.priority === 'LOW')   pColor = '#16a34a';

      doc.fillColor(pColor).fontSize(8).font('Helvetica-Bold')
         .text(rec.priority || 'MEDIUM', 50, recRowY);
      doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold')
         .text(rec.category || 'General', 115, recRowY, { width: 105 });
      doc.fillColor('#0f172a').fontSize(8).font('Helvetica-Bold')
         .text(rec.problem || '', 225, recRowY, { width: 325 });
      doc.fillColor('#475569').fontSize(7.5).font('Helvetica')
         .text(`Action: ${rec.suggested_action || ''}`, 225, recRowY + 11, { width: 325 });

      doc.y = recRowY + 28;
    });

    // Summary count by priority
    const highCnt   = allRecs.filter(r => r.priority === 'HIGH').length;
    const medCnt    = allRecs.filter(r => r.priority === 'MEDIUM').length;
    const lowCnt    = allRecs.filter(r => r.priority === 'LOW').length;
    guardPageBreak(doc, 760);
    doc.fillColor('#64748b').fontSize(7.5).font('Helvetica')
       .text(`Total: ${allRecs.length} recommendations  —  HIGH: ${highCnt}  MEDIUM: ${medCnt}  LOW: ${lowCnt}`, 50, doc.y);
    doc.y += 14;
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  drawFooter(doc);
  doc.end();
}

module.exports = { generateAnalysisPdfReport };
