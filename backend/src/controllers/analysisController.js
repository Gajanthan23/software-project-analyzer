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

          // 12. Save security findings to DB (Phase 15)
          let savedSecurity = [];
          if (analyzerResponse.security && analyzerResponse.security.status === 'ok') {
            savedSecurity = await analysisModel.saveSecurityFindings(
              run.id,
              projectId,
              analyzerResponse.security
            );
            logger.info(`Run ${run.id}: ${savedSecurity.length} security_findings rows saved`);
          }

          // 13. Save architecture metrics to DB (Phase 16)
          let savedArchitecture = null;
          if (analyzerResponse.architecture && analyzerResponse.architecture.status === 'ok') {
            savedArchitecture = await analysisModel.saveArchitectureMetrics(
              run.id,
              projectId,
              analyzerResponse.architecture
            );
            logger.info(`Run ${run.id}: architecture_metrics row saved (id=${savedArchitecture.id})`);
          }

          // 14. Save git metrics to DB (Phase 17)
          let savedGit = null;
          if (analyzerResponse.git_history && analyzerResponse.git_history.status === 'ok') {
            const gitData = { ...analyzerResponse.git_history };

            // Enrich with GitHub REST API metadata for full repository fidelity
            if (project.api_contributors && project.api_contributors.length > 0 && (!gitData.top_contributors || gitData.top_contributors.length <= 1)) {
              gitData.top_contributors = project.api_contributors;
              gitData.contributor_count = Math.max(gitData.contributor_count || 0, project.api_contributors.length);
            }

            if (project.created_at && (!gitData.first_commit_date || gitData.is_shallow_clone)) {
              gitData.first_commit_date = project.created_at;
              const pushedDate = project.pushed_at || project.updated_at || new Date().toISOString();
              gitData.latest_commit_date = pushedDate;
              const ageDays = Math.max(1, Math.floor((new Date(pushedDate) - new Date(project.created_at)) / (1000 * 60 * 60 * 24)));
              gitData.repository_age_days = ageDays;
            }

            const githubStats = {
              open_issues_count: project.open_issues_count || 0,
              open_prs_count: project.open_prs_count || 0,
            };
            savedGit = await analysisModel.saveGitMetrics(
              run.id,
              projectId,
              gitData,
              githubStats
            );
            logger.info(`Run ${run.id}: git_metrics row saved (id=${savedGit.id})`);
          }

          // 15. Save quality scores to DB (Phase 18)
          let savedScores = null;
          if (analyzerResponse.scores && analyzerResponse.scores.status === 'ok') {
            savedScores = await analysisModel.saveQualityScores(
              run.id,
              projectId,
              analyzerResponse.scores
            );
            logger.info(`Run ${run.id}: quality_scores row saved (id=${savedScores.id}, overall=${savedScores.overall_score})`);
          }

          // 16. Save recommendations to DB (Phase 19)
          let savedRecommendations = [];
          if (Array.isArray(analyzerResponse.recommendations)) {
            savedRecommendations = await analysisModel.saveRecommendations(
              run.id,
              projectId,
              analyzerResponse.recommendations
            );
            logger.info(`Run ${run.id}: ${savedRecommendations.length} recommendations rows saved`);
          }

          return { analyzerResponse, savedMetrics, savedComplexity, savedDuplication, savedTesting, savedDocumentation, savedDependencies, savedSecurity, savedArchitecture, savedGit, savedScores, savedRecommendations };
        }
      );

      // 17. Mark completed
      const completedRun = await analysisModel.updateRunStatus(run.id, 'completed');

      return res.status(200).json({
        status:  'success',
        message: 'Repository analysis completed successfully.',
        data: {
          run: completedRun,
          repository:     analysisResult.analyzerResponse.repository,
          metrics:        analysisResult.analyzerResponse.metrics,
          complexity:     analysisResult.analyzerResponse.complexity,
          duplication:    analysisResult.analyzerResponse.duplication,
          testing:        analysisResult.analyzerResponse.testing,
          documentation:  analysisResult.analyzerResponse.documentation,
          dependencies:   analysisResult.analyzerResponse.dependencies,
          security:       analysisResult.analyzerResponse.security,
          architecture:   analysisResult.analyzerResponse.architecture,
          git_history:    analysisResult.analyzerResponse.git_history,
          scores:         analysisResult.analyzerResponse.scores,
          recommendations: analysisResult.analyzerResponse.recommendations,
          // Placeholders for future phases — forward what the analyzer returned
          prediction:     analysisResult.analyzerResponse.prediction,
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
      const security = await analysisModel.getLatestSecurityForProject(projectId);
      const architecture = await analysisModel.getLatestArchitectureForProject(projectId);
      const git_history = await analysisModel.getLatestGitForProject(projectId);
      const scores = await analysisModel.getLatestScoresForProject(projectId);
      const recommendations = await analysisModel.getLatestRecommendationsForProject(projectId);

      if (!metrics && !complexity && !duplication && !testing && !documentation && !dependencies && !security && !architecture && !git_history && !scores && !recommendations.length) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { metrics, complexity, duplication, testing, documentation, dependencies, security, architecture, git_history, scores, recommendations },
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

  /**
   * GET /api/projects/:id/analyses/latest/security
   * Returns the most recent completed security_findings rows for a project.
   */
  getLatestSecurity: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const security = await analysisModel.getLatestSecurityForProject(projectId);
      if (!security) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed security analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { security },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/architecture
   * Returns the most recent completed architecture_metrics row for a project.
   */
  getLatestArchitecture: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const architecture = await analysisModel.getLatestArchitectureForProject(projectId);
      if (!architecture) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed architecture analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { architecture },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/git-history
   * Returns the most recent completed git_metrics row for a project.
   */
  getLatestGit: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const git_history = await analysisModel.getLatestGitForProject(projectId);
      if (!git_history) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed git history analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { git_history },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/scores
   * Returns the most recent completed quality_scores row for a project.
   */
  getLatestScores: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const scores = await analysisModel.getLatestScoresForProject(projectId);
      if (!scores) {
        return res.status(404).json({
          status:  'error',
          message: 'No completed quality scores analysis found for this project. Run an analysis first.',
        });
      }

      return res.status(200).json({
        status: 'success',
        data:   { scores },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id/analyses/latest/recommendations
   * Returns the most recent completed recommendations rows for a project.
   */
  getLatestRecommendations: async (req, res, next) => {
    try {
      const { id: projectId } = req.params;
      const project = await projectModel.findByIdAndUser(projectId, req.user.id);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found.' });
      }

      const recommendations = await analysisModel.getLatestRecommendationsForProject(projectId);
      return res.status(200).json({
        status: 'success',
        results: recommendations.length,
        data:   { recommendations },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = analysisController;
