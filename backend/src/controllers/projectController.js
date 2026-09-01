/**
 * controllers/projectController.js
 * 
 * Handlers for project creation, listing, and detail retrieval.
 */

const { parseGitHubUrl } = require('../utils/githubUrlParser');
const githubService = require('../services/githubService');
const projectModel = require('../models/projectModel');
const logger = require('../utils/logger');

const projectController = {
  /**
   * POST /api/projects
   * Validates GitHub URL, fetches repository metadata from GitHub API,
   * and saves the project record in PostgreSQL.
   */
  createProject: async (req, res, next) => {
    try {
      const { repoUrl } = req.body;

      // 1. Validate GitHub URL
      const urlValidation = parseGitHubUrl(repoUrl);
      if (!urlValidation.isValid) {
        return res.status(400).json({
          status: 'error',
          message: urlValidation.error
        });
      }

      const { owner, name, cleanUrl } = urlValidation;

      // 2. Fetch metadata from GitHub REST API
      const meta = await githubService.fetchRepoData(owner, name);

      // 3. Save / Upsert in Database
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
   * Returns all projects for the authenticated user.
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
   * Returns a specific project by ID for the authenticated user.
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
  }
};

module.exports = projectController;
