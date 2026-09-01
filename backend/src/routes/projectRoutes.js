/**
 * routes/projectRoutes.js
 * 
 * Express router for project management endpoints.
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth } = require('../middleware/auth');

// Protect all project endpoints with JWT authentication
router.use(requireAuth);

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);

// Phase 7 debug endpoint (protected)
router.post('/:id/download-debug', projectController.downloadDebugProject);

module.exports = router;
