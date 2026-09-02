/**
 * models/analysisModel.js
 *
 * DB queries for analysis_runs and code_metrics tables (Phase 9).
 */

const db = require('../utils/db');
const logger = require('../utils/logger');

const analysisModel = {
  /**
   * Create a new analysis run record in 'pending' state.
   */
  createRun: async (projectId) => {
    const result = await db.query(
      `INSERT INTO analysis_runs (project_id, status, started_at)
       VALUES ($1, 'pending', NOW())
       RETURNING id, project_id, status, started_at`,
      [projectId]
    );
    return result.rows[0];
  },

  /**
   * Update a run's status (running → completed / failed).
   */
  updateRunStatus: async (runId, status, errorMessage = null) => {
    const result = await db.query(
      `UPDATE analysis_runs
       SET status = $2,
           completed_at = CASE WHEN $2::varchar IN ('completed', 'failed') THEN NOW() ELSE NULL END,
           error_message = $3
       WHERE id = $1
       RETURNING id, project_id, status, started_at, completed_at, error_message`,
      [runId, status, errorMessage]
    );
    return result.rows[0];
  },

  /**
   * Save code metrics for a completed run.
   */
  saveCodeMetrics: async (runId, projectId, metrics) => {
    const result = await db.query(
      `INSERT INTO code_metrics (
         run_id, project_id,
         total_files, source_files, test_files, config_files,
         documentation_files, other_files,
         total_loc, code_loc, comment_loc, blank_loc,
         functions, classes, modules, directory_depth, dependency_count,
         primary_language, languages, analysis_tool
       ) VALUES (
         $1, $2,
         $3, $4, $5, $6,
         $7, $8,
         $9, $10, $11, $12,
         $13, $14, $15, $16, $17,
         $18, $19, $20
       )
       RETURNING *`,
      [
        runId, projectId,
        metrics.total_files     || 0,
        metrics.source_files    || 0,
        metrics.test_files      || 0,
        metrics.config_files    || 0,
        metrics.documentation_files || 0,
        metrics.other_files     || 0,
        metrics.total_loc       || 0,
        metrics.code_loc        || 0,
        metrics.comment_loc     || 0,
        metrics.blank_loc       || 0,
        metrics.functions       || 0,
        metrics.classes         || 0,
        metrics.modules         || 0,
        metrics.directory_depth || 0,
        metrics.dependency_count || 0,
        metrics.primary_language || 'Unknown',
        JSON.stringify(metrics.languages || {}),
        metrics.analysis_tool  || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Get the latest code_metrics row for a project (most recent completed run).
   */
  getLatestMetricsForProject: async (projectId) => {
    const result = await db.query(
      `SELECT cm.*
       FROM code_metrics cm
       JOIN analysis_runs ar ON ar.id = cm.run_id
       WHERE cm.project_id = $1
         AND ar.status = 'completed'
       ORDER BY cm.created_at DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  /**
   * Save cyclomatic complexity metrics for a completed run.
   */
  saveComplexityMetrics: async (runId, projectId, complexity) => {
    const result = await db.query(
      `INSERT INTO complexity_metrics (
         run_id, project_id,
         total_functions, avg_complexity, max_complexity,
         high_complexity_count, high_complexity_threshold,
         complexity_distribution, top_complex_functions, file_complexity,
         analysis_tool
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7,
         $8, $9, $10,
         $11
       )
       RETURNING *`,
      [
        runId, projectId,
        complexity.total_functions || 0,
        complexity.avg_complexity || 0.0,
        complexity.max_complexity || 0,
        complexity.high_complexity_count || 0,
        complexity.high_complexity_threshold || 10,
        JSON.stringify(complexity.complexity_distribution || {}),
        JSON.stringify(complexity.top_complex_functions || []),
        JSON.stringify(complexity.file_complexity || []),
        complexity.analysis_tool || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Get latest complexity metrics row for a project.
   */
  getLatestComplexityForProject: async (projectId) => {
    const result = await db.query(
      `SELECT cx.*
       FROM complexity_metrics cx
       JOIN analysis_runs ar ON ar.id = cx.run_id
       WHERE cx.project_id = $1
         AND ar.status = 'completed'
       ORDER BY cx.created_at DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  /**
   * Save duplication metrics for a completed run.
   */
  saveDuplicationMetrics: async (runId, projectId, duplication) => {
    const result = await db.query(
      `INSERT INTO duplication_metrics (
         run_id, project_id,
         duplicated_blocks, duplicated_loc, duplication_percentage,
         duplicated_files_count, duplicated_files, duplicate_instances,
         recommendations, analysis_tool
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8,
         $9, $10
       )
       RETURNING *`,
      [
        runId, projectId,
        duplication.duplicated_blocks || 0,
        duplication.duplicated_loc || 0,
        duplication.duplication_percentage || 0.0,
        duplication.duplicated_files_count || 0,
        JSON.stringify(duplication.duplicated_files || []),
        JSON.stringify(duplication.duplicate_instances || []),
        JSON.stringify(duplication.recommendations || []),
        duplication.analysis_tool || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Get latest duplication metrics row for a project.
   */
  getLatestDuplicationForProject: async (projectId) => {
    const result = await db.query(
      `SELECT dp.*
       FROM duplication_metrics dp
       JOIN analysis_runs ar ON ar.id = dp.run_id
       WHERE dp.project_id = $1
         AND ar.status = 'completed'
       ORDER BY dp.created_at DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  /**
   * Save testing suite & coverage metrics for a completed run.
   */
  saveTestingMetrics: async (runId, projectId, testing) => {
    const result = await db.query(
      `INSERT INTO testing_metrics (
         run_id, project_id,
         has_tests, test_files_count, source_files_count,
         test_to_source_file_ratio, test_loc, source_loc,
         test_to_source_loc_ratio, test_frameworks,
         has_coverage_report, coverage_percentage, coverage_status,
         coverage_message, test_directories, test_files,
         analysis_tool
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8,
         $9, $10,
         $11, $12, $13,
         $14, $15, $16,
         $17
       )
       RETURNING *`,
      [
        runId, projectId,
        testing.has_tests || false,
        testing.test_files_count || 0,
        testing.source_files_count || 0,
        testing.test_to_source_file_ratio || 0.0,
        testing.test_loc || 0,
        testing.source_loc || 0,
        testing.test_to_source_loc_ratio || 0.0,
        JSON.stringify(testing.test_frameworks || []),
        testing.has_coverage_report || false,
        testing.coverage_percentage !== undefined ? testing.coverage_percentage : null,
        testing.coverage_status || 'unavailable',
        testing.coverage_message || 'Coverage data unavailable',
        JSON.stringify(testing.test_directories || []),
        JSON.stringify(testing.test_files || []),
        testing.analysis_tool || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Get latest testing metrics row for a project.
   */
  getLatestTestingForProject: async (projectId) => {
    const result = await db.query(
      `SELECT tm.*
       FROM testing_metrics tm
       JOIN analysis_runs ar ON ar.id = tm.run_id
       WHERE tm.project_id = $1
         AND ar.status = 'completed'
       ORDER BY tm.created_at DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  /**
   * Save documentation metrics for a completed run.
   */
  saveDocumentationMetrics: async (runId, projectId, doc) => {
    const result = await db.query(
      `INSERT INTO documentation_metrics (
         run_id, project_id,
         classification, documentation_score, score_breakdown,
         has_readme, readme_file, readme_size_bytes, readme_sections,
         has_docs_dir, docs_files_count, docs_sample_files,
         governance_files, comment_density_pct, recommendations,
         analysis_notes, analysis_tool
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12,
         $13, $14, $15,
         $16, $17
       )
       RETURNING *`,
      [
        runId, projectId,
        doc.classification || 'HEURISTIC',
        doc.documentation_score || 0.0,
        JSON.stringify(doc.score_breakdown || {}),
        doc.has_readme || false,
        doc.readme_file || null,
        doc.readme_size_bytes || 0,
        JSON.stringify(doc.readme_sections || {}),
        doc.has_docs_dir || false,
        doc.docs_files_count || 0,
        JSON.stringify(doc.docs_sample_files || []),
        JSON.stringify(doc.governance_files || {}),
        doc.comment_density_pct || 0.0,
        JSON.stringify(doc.recommendations || []),
        doc.analysis_notes || null,
        doc.analysis_tool || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Get latest documentation metrics row for a project.
   */
  getLatestDocumentationForProject: async (projectId) => {
    const result = await db.query(
      `SELECT dm.*
       FROM documentation_metrics dm
       JOIN analysis_runs ar ON ar.id = dm.run_id
       WHERE dm.project_id = $1
         AND ar.status = 'completed'
       ORDER BY dm.created_at DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  /**
   * Save dependency metrics for a completed run.
   */
  saveDependencyMetrics: async (runId, projectId, deps) => {
    const result = await db.query(
      `INSERT INTO dependency_metrics (
         run_id, project_id,
         production_dependency_count, dev_dependency_count, total_dependency_count,
         ecosystems, manifest_files, dependencies_by_file, top_dependencies,
         recommendations, vulnerability_notes, analysis_tool
       ) VALUES (
         $1, $2,
         $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12
       )
       RETURNING *`,
      [
        runId, projectId,
        deps.production_dependency_count || 0,
        deps.dev_dependency_count || 0,
        deps.total_dependency_count || 0,
        JSON.stringify(deps.ecosystems || []),
        JSON.stringify(deps.manifest_files || []),
        JSON.stringify(deps.dependencies_by_file || {}),
        JSON.stringify(deps.top_dependencies || []),
        JSON.stringify(deps.recommendations || []),
        deps.vulnerability_notes || null,
        deps.analysis_tool || null,
      ]
    );
    return result.rows[0];
  },

  /**
   * Get latest dependency metrics row for a project.
   */
  getLatestDependencyForProject: async (projectId) => {
    const result = await db.query(
      `SELECT dep.*
       FROM dependency_metrics dep
       JOIN analysis_runs ar ON ar.id = dep.run_id
       WHERE dep.project_id = $1
         AND ar.status = 'completed'
       ORDER BY dep.created_at DESC
       LIMIT 1`,
      [projectId]
    );
    return result.rows[0] || null;
  },

  /**
   * Get all analysis runs for a project (newest first).
   */
  getRunsForProject: async (projectId) => {
    const result = await db.query(
      `SELECT id, project_id, status, error_message, started_at, completed_at
       FROM analysis_runs
       WHERE project_id = $1
       ORDER BY started_at DESC`,
      [projectId]
    );
    return result.rows;
  },
};

module.exports = analysisModel;

