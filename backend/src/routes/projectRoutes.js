/**
 * routes/projectRoutes.js
 * 
 * Express router for project management endpoints.
 */

const express = require('express');
const router = express.Router();
const projectController  = require('../controllers/projectController');
const analysisController = require('../controllers/analysisController');
const { requireAuth } = require('../middleware/auth');

// Protect all project endpoints with JWT authentication
router.use(requireAuth);

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);

// Phase 7 debug endpoint (protected, dev-only)
router.post('/:id/download-debug', projectController.downloadDebugProject);

// Phase 9–19 analysis pipeline endpoints (protected)
router.post('/:id/analyze',                     analysisController.runAnalysis);
router.get('/:id/analyses',                     analysisController.listRuns);
router.get('/:id/analyses/latest',              analysisController.getLatestMetrics);
router.get('/:id/analyses/latest/complexity',   analysisController.getLatestComplexity);
router.get('/:id/analyses/latest/duplication',  analysisController.getLatestDuplication);
router.get('/:id/analyses/latest/testing',      analysisController.getLatestTesting);
router.get('/:id/analyses/latest/documentation',analysisController.getLatestDocumentation);
router.get('/:id/analyses/latest/dependencies', analysisController.getLatestDependencies);
router.get('/:id/analyses/latest/security',     analysisController.getLatestSecurity);
router.get('/:id/analyses/latest/architecture', analysisController.getLatestArchitecture);
router.get('/:id/analyses/latest/git-history',   analysisController.getLatestGit);
router.get('/:id/analyses/latest/scores',        analysisController.getLatestScores);
router.get('/:id/analyses/latest/recommendations',analysisController.getLatestRecommendations);
router.get('/:id/analyses/:analysisId',          analysisController.getAnalysisById);

module.exports = router;
