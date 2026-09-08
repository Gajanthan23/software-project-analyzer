/**
 * controllers/projectController.js
 * 
 * Handlers for project creation, listing, detail retrieval, and Phase 7 debug clone.
 */

const { parseGitHubUrl } = require('../utils/githubUrlParser');
const githubService = require('../services/githubService');
const repositoryDownloader = require('../services/repositoryDownloader');
const projectModel = require('../models/projectModel');
const analysisModel = require('../models/analysisModel');
const logger = require('../utils/logger');
const fs = require('fs');

const projectController = {
  /**
   * POST /api/projects
   */
  createProject: async (req, res, next) => {
    try {
      const { repoUrl } = req.body;

      const urlValidation = parseGitHubUrl(repoUrl);
      if (!urlValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          message: urlValidation.error
        });
      }

      const { owner, name, cleanUrl } = urlValidation;

      const meta = await githubService.fetchRepoData(owner, name);

      const project = await projectModel.create({
        userId: req.user.id,
        repoUrl: cleanUrl,
        owner: meta.owner,
        name: meta.name,
        description: meta.description,
        defaultBranch: meta.default_branch,
        starsCount: meta.stars_count,
        forksCount: meta.forks_count,
        languages: meta.languages
      });

      logger.info(`Project '${meta.owner}/${meta.name}' created/updated for user ${req.user.id}`);

      return res.status(201).json({
        status: 'success',
        message: 'Project repository validated and added successfully.',
        data: {
          project,
          github_metadata: {
            open_issues_count: meta.open_issues_count,
            is_archived: meta.is_archived,
            file_structure: meta.file_structure,
            has_readme: !!meta.readme,
            readme_info: meta.readme,
            pushed_at: meta.pushed_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects
   */
  getProjects: async (req, res, next) => {
    try {
      const projects = await projectModel.findByUser(req.user.id);

      return res.status(200).json({
        status: 'success',
        results: projects.length,
        data: { projects }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/projects/:id
   */
  getProjectById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const project = await projectModel.findByIdAndUser(id, req.user.id);

      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found.'
        });
      }

      return res.status(200).json({
        status: 'success',
        data: { project }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/projects/:id/download-debug
   * TEMPORARY PHASE 7 DEBUG ENDPOINT.
   * Clones project repository into an isolated temporary workspace,
   * counts total files, verifies disk presence, and cleans up workspace.
   */
  downloadDebugProject: async (req, res, next) => {
    try {
      const { id } = req.params;
      const project = await projectModel.findByIdAndUser(id, req.user.id);

      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found.'
        });
      }

      let verifiedInCallback = false;
      let downloadStats = null;
      let usedWorkspacePath = '';

      // Execute within temporary workspace with guaranteed cleanup
      const result = await repositoryDownloader.withWorkspace(project.repo_url, async (workspacePath, stats) => {
        usedWorkspacePath = workspacePath;
        downloadStats = stats;

        // Verify workspace exists on disk during execution
        verifiedInCallback = fs.existsSync(workspacePath);
        logger.info(`Phase 7 Debug Callback: Workspace ${workspacePath} verified on disk? ${verifiedInCallback}`);

        return {
          workspace_active: verifiedInCallback,
          total_files: stats.totalFiles,
          total_bytes: stats.totalBytes
        };
      });

      // Confirm cleanup happened after callback returned
      const existsAfterCleanup = fs.existsSync(usedWorkspacePath);

      return res.status(200).json({
        status: 'success',
        message: 'Phase 7 Download & Cleanup verification completed successfully.',
        data: {
          project_id: project.id,
          project_name: `${project.owner}/${project.name}`,
          repo_url: project.repo_url,
          download_stats: {
            total_files: downloadStats.totalFiles,
            total_size_mb: (downloadStats.totalBytes / (1024 * 1024)).toFixed(2)
          },
          verification: {
            workspace_created_and_verified: result.workspace_active,
            workspace_cleaned_up: !existsAfterCleanup,
            workspace_path_used: usedWorkspacePath
          }
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/projects/compare
   * Side-by-side metric comparison across 2+ projects (Phase 22).
   */
  compareProjects: async (req, res, next) => {
    try {
      const { projectIds, analysisIds, ids } = req.body;
      const targetIds = projectIds || analysisIds || ids;

      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Please provide an array of projectIds to compare.'
        });
      }

      // Limit max projects to 5 for UI performance
      const selectedIds = targetIds.slice(0, 5);

      const comparisonData = await analysisModel.getComparisonDataForProjects(selectedIds, req.user.id);

      return res.status(200).json({
        status: 'success',
        results: comparisonData.length,
        data: {
          projects: comparisonData
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = projectController;
