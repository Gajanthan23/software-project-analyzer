/**
 * controllers/analysisController.js
 *
 * Handles the full Phase 9 end-to-end analysis pipeline:
 *   POST /api/projects/:id/analyze
 *     1. Load project from DB (ownership check)
 *     2. Create analysis_run row (status: pending → running)
 *     3. Clone repo via repositoryDownloader.withWorkspace()
 *     4. Call Python analyzer /analyze inside the workspace
 *     5. Save code_metrics row to DB
 *     6. Mark run completed (or failed)
 *     7. Return results — workspace is cleaned up by try/finally in withWorkspace
 *
 *   GET /api/projects/:id/analyses          → list runs for a project
 *   GET /api/projects/:id/analyses/latest   → latest metrics for a project
 */

const projectModel  = require('../models/projectModel');
const analysisModel = require('../models/analysisModel');
const repositoryDownloader = require('../services/repositoryDownloader');
const { callAnalyzer }     = require('../services/analyzerService');
const logger = require('../utils/logger');

const analysisController = {
  /**
   * POST /api/projects/:id/analyze
   * Full pipeline: download → analyze → store → return.
   */
  runAnalysis: async (req, res, next) => {
    const { id: projectId } = req.params;
    let run = null;

    try {
      // 1. Verify project belongs to this user
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      // 2. Create run record (pending)
      run = await analysisModel.createRun(projectId);
      logger.info(`Analysis run ${run.id} created for project ${project.owner}/${project.name}`);

      // 3. Mark running
      await analysisModel.updateRunStatus(run.id, 'running');

      // 4. Clone → analyze → store (workspace cleaned up automatically by withWorkspace)
      const analysisResult = await repositoryDownloader.withWorkspace(
        project.repo_url,
        async (workspacePath, downloadStats) => {
          logger.info(`Run ${run.id}: workspace ready at ${workspacePath} (${downloadStats.totalFiles} files)`);

          // 5. Call Python analyzer
          const analyzerResponse = await callAnalyzer(workspacePath);
          logger.info(`Run ${run.id}: analyzer responded, primary_language=${analyzerResponse.repository?.primary_language}`);

          // 6. Save metrics to DB
          const metricsPayload = {
            ...analyzerResponse.metrics,
            // Merge file-structure fields from repository section
            total_files:         analyzerResponse.repository.total_files,
            source_files:        analyzerResponse.repository.source_files,
            test_files:          analyzerResponse.repository.test_files,
            config_files:        analyzerResponse.repository.config_files,
            documentation_files: analyzerResponse.repository.documentation_files,
            other_files:         analyzerResponse.repository.other_files,
            modules:             analyzerResponse.repository.modules,
            directory_depth:     analyzerResponse.repository.directory_depth,
            primary_language:    analyzerResponse.repository.primary_language,
            languages:           analyzerResponse.repository.languages,
          };

          const savedMetrics = await analysisModel.saveCodeMetrics(run.id, projectId, metricsPayload);
          logger.info(`Run ${run.id}: code_metrics row saved (id=${savedMetrics.id})`);

          // 7. Save complexity metrics to DB (Phase 10)
          let savedComplexity = null;
          if (analyzerResponse.complexity && analyzerResponse.complexity.status === 'ok') {
            savedComplexity = await analysisModel.saveComplexityMetrics(
              run.id,
              projectId,
              analyzerResponse.complexity
            );
            logger.info(`Run ${run.id}: complexity_metrics row saved (id=${savedComplexity.id})`);
          }

          // 8. Save duplication metrics to DB (Phase 11)
          let savedDuplication = null;
          if (analyzerResponse.duplication && analyzerResponse.duplication.status === 'ok') {
            savedDuplication = await analysisModel.saveDuplicationMetrics(
              run.id,
              projectId,
              analyzerResponse.duplication
            );
            logger.info(`Run ${run.id}: duplication_metrics row saved (id=${savedDuplication.id})`);
          }

          // 9. Save testing metrics to DB (Phase 12)
          let savedTesting = null;
          if (analyzerResponse.testing && analyzerResponse.testing.status === 'ok') {
            savedTesting = await analysisModel.saveTestingMetrics(
              run.id,
              projectId,
              analyzerResponse.testing
            );
            logger.info(`Run ${run.id}: testing_metrics row saved (id=${savedTesting.id})`);
          }

          // 10. Save documentation metrics to DB (Phase 13)
          let savedDocumentation = null;
          if (analyzerResponse.documentation && analyzerResponse.documentation.status === 'ok') {
            savedDocumentation = await analysisModel.saveDocumentationMetrics(
              run.id,
              projectId,
              analyzerResponse.documentation
            );
            logger.info(`Run ${run.id}: documentation_metrics row saved (id=${savedDocumentation.id})`);
          }

          // 11. Save dependency metrics to DB (Phase 14)
          let savedDependencies = null;
          if (analyzerResponse.dependencies && analyzerResponse.dependencies.status === 'ok') {
            savedDependencies = await analysisModel.saveDependencyMetrics(
              run.id,
              projectId,
              analyzerResponse.dependencies
            );
            logger.info(`Run ${run.id}: dependency_metrics row saved (id=${savedDependencies.id})`);
          }

          return { analyzerResponse, savedMetrics, savedComplexity, savedDuplication, savedTesting, savedDocumentation, savedDependencies };
        }
      );

      // 12. Mark completed
      const completedRun = await analysisModel.updateRunStatus(run.id, 'completed');

      return res.status(200).json({
        status:  'success',
        message: 'Repository analysis completed successfully.',
        data: {
          run: completedRun,
          repository:    analysisResult.analyzerResponse.repository,
          metrics:       analysisResult.analyzerResponse.metrics,
          complexity:    analysisResult.analyzerResponse.complexity,
          duplication:   analysisResult.analyzerResponse.duplication,
          testing:       analysisResult.analyzerResponse.testing,
          documentation: analysisResult.analyzerResponse.documentation,
          dependencies:  analysisResult.analyzerResponse.dependencies,
          // Placeholders for future phases — forward what the analyzer returned
          security:      analysisResult.analyzerResponse.security,
          architecture:  analysisResult.analyzerResponse.architecture,
          git_history:   analysisResult.analyzerResponse.git_history,
          scores:        analysisResult.analyzerResponse.scores,
          prediction:    analysisResult.analyzerResponse.prediction,
          recommendations: analysisResult.analyzerResponse.recommendations,
        },
      });

    } catch (error) {
      // Mark run as failed if we managed to create one
      if (run) {
        await analysisModel.updateRunStatus(run.id, 'failed', error.message).catch(() => {});
        logger.error(`Analysis run ${run.id} failed: ${error.message}`);
      }
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses
   * Returns all analysis run records for a project.
   */
  listRuns: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const runs = await analysisModel.getRunsForProject(projectId);
      return res.status(200).json({
        status:  'success',
        results: runs.length,
        data:    { runs },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest
   * Returns the most recent completed metrics rows for a project.
   */
  getLatestMetrics: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const metrics = await analysisModel.getLatestMetricsForProject(projectId);
      const complexity = await analysisModel.getLatestComplexityForProject(projectId);
      const duplication = await analysisModel.getLatestDuplicationForProject(projectId);
      const testing = await analysisModel.getLatestTestingForProject(projectId);
      const documentation = await analysisModel.getLatestDocumentationForProject(projectId);
      const dependencies = await analysisModel.getLatestDependencyForProject(projectId);

      if (!metrics && !complexity && !duplication && !testing && !documentation && !dependencies) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { metrics, complexity, duplication, testing, documentation, dependencies },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/complexity
   * Returns the most recent completed complexity_metrics row for a project.
   */
  getLatestComplexity: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const complexity = await analysisModel.getLatestComplexityForProject(projectId);
      if (!complexity) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed complexity analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { complexity },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/duplication
   * Returns the most recent completed duplication_metrics row for a project.
   */
  getLatestDuplication: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const duplication = await analysisModel.getLatestDuplicationForProject(projectId);
      if (!duplication) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed duplication analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { duplication },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/testing
   * Returns the most recent completed testing_metrics row for a project.
   */
  getLatestTesting: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const testing = await analysisModel.getLatestTestingForProject(projectId);
      if (!testing) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed testing analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { testing },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/documentation
   * Returns the most recent completed documentation_metrics row for a project.
   */
  getLatestDocumentation: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const documentation = await analysisModel.getLatestDocumentationForProject(projectId);
      if (!documentation) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed documentation analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { documentation },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/dependencies
   * Returns the most recent completed dependency_metrics row for a project.
   */
  getLatestDependencies: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const dependencies = await analysisModel.getLatestDependencyForProject(projectId);
      if (!dependencies) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed dependency analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { dependencies },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = analysisController;
