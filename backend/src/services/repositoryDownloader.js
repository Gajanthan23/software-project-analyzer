/**
 * services/repositoryDownloader.js
 * 
 * Secure repository cloning service.
 * - Downloads public repositories into isolated temporary workspaces.
 * - Enforces download timeout limits and maximum disk size limits.
 * - Guarantees workspace cleanup after analysis.
 * - NEVER executes code inside the downloaded repository.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');

const execFileAsync = util.promisify(execFile);

// Config defaults
const DEFAULT_TIMEOUT_MS = parseInt(process.env.ANALYSIS_TIMEOUT_SECONDS || '300', 10) * 1000;
const MAX_REPO_SIZE_MB = parseInt(process.env.MAX_REPO_SIZE_MB || '500', 10);
const MAX_REPO_SIZE_BYTES = MAX_REPO_SIZE_MB * 1024 * 1024;

/**
 * Recursively calculates directory size and total file count.
 */
const calculateDirStats = (dirPath) => {
  let totalBytes = 0;
  let totalFiles = 0;

  const traverse = (currentPath) => {
    let entries = [];
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      // Skip .git internal objects directory from size calculation if desired, or count everything
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          totalBytes += stats.size;
          totalFiles += 1;
        } catch (e) {
          // ignore unreadable files
        }
      }
    }
  };

  traverse(dirPath);
  return { totalBytes, totalFiles };
};

const repositoryDownloader = {
  /**
   * Create an isolated temporary workspace folder.
   */
  createWorkspace: async () => {
    const uniqueId = crypto.randomUUID();
    const baseTmpDir = path.join(os.tmpdir(), 'software-analyzer-workspaces');
    
    if (!fs.existsSync(baseTmpDir)) {
      fs.mkdirSync(baseTmpDir, { recursive: true });
    }

    const workspacePath = path.join(baseTmpDir, `analysis-${uniqueId}`);
    fs.mkdirSync(workspacePath, { recursive: true });
    return workspacePath;
  },

  /**
   * Clone repository into target workspace directory.
   */
  cloneRepository: async (repoUrl, workspacePath) => {
    logger.info(`Starting secure clone of ${repoUrl} into ${workspacePath}...`);

    try {
      // Use execFile instead of exec to prevent shell injection attacks
      await execFileAsync('git', [
        'clone',
        '--depth', '100',
        '--single-branch',
        repoUrl,
        workspacePath
      ], {
        timeout: DEFAULT_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024 // 10MB stdout buffer limit
      });
    } catch (error) {
      if (error.killed || error.signal === 'SIGTERM') {
        const err = new Error(`Repository download timed out after ${DEFAULT_TIMEOUT_MS / 1000} seconds.`);
        err.status = 408;
        throw err;
      }

      const errMsg = error.stderr || error.message || '';
      if (errMsg.includes('not found') || errMsg.includes('Could not resolve host')) {
        const err = new Error('Network failure or repository URL invalid.');
        err.status = 404;
        throw err;
      }

      const err = new Error(`Failed to clone repository: ${errMsg.slice(0, 200)}`);
      err.status = 500;
      throw err;
    }

    // 1. Inspect directory statistics
    const stats = calculateDirStats(workspacePath);
    logger.info(`Clone finished. Total files: ${stats.totalFiles}, Size: ${(stats.totalBytes / (1024 * 1024)).toFixed(2)} MB`);

    // 2. Check for empty repository
    // Note: readdir returns .git dir too. If total files excluding .git is 0:
    if (stats.totalFiles === 0) {
      const err = new Error('Repository found, but contains no source files.');
      err.status = 400;
      throw err;
    }

    // 3. Enforce maximum size limit
    if (stats.totalBytes > MAX_REPO_SIZE_BYTES) {
      const sizeMB = (stats.totalBytes / (1024 * 1024)).toFixed(2);
      const err = new Error(`Repository size (${sizeMB} MB) exceeds maximum allowed limit of ${MAX_REPO_SIZE_MB} MB.`);
      err.status = 413;
      throw err;
    }

    return stats;
  },

  /**
   * Safely and recursively removes a temporary workspace folder.
   */
  cleanupWorkspace: async (workspacePath) => {
    if (!workspacePath || !fs.existsSync(workspacePath)) {
      return true;
    }

    try {
      logger.info(`Cleaning up temporary workspace: ${workspacePath}`);
      fs.rmSync(workspacePath, { recursive: true, force: true });
      return true;
    } catch (err) {
      logger.error(`Failed to cleanup workspace ${workspacePath}`, err);
      return false;
    }
  },

  /**
   * Helper execution wrapper that guarantees cleanup via try/finally block.
   */
  withWorkspace: async (repoUrl, analysisCallback) => {
    const workspacePath = await repositoryDownloader.createWorkspace();
    try {
      const stats = await repositoryDownloader.cloneRepository(repoUrl, workspacePath);
      return await analysisCallback(workspacePath, stats);
    } finally {
      await repositoryDownloader.cleanupWorkspace(workspacePath);
    }
  }
};

module.exports = repositoryDownloader;
