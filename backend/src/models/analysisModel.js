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

