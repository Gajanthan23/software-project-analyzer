/**
 * services/analyzerService.js
 *
 * HTTP client that calls the Python FastAPI analyzer microservice.
 * Used by the Node backend to trigger analysis and retrieve results.
 */

const http = require('http');
const logger = require('../utils/logger');

const ANALYZER_BASE_URL = process.env.ANALYZER_URL || 'http://localhost:8000';
const ANALYZER_TIMEOUT_MS = parseInt(process.env.ANALYZER_TIMEOUT_MS || '300000', 10); // 5 min default

/**
 * Makes an HTTP POST request to the Python analyzer /analyze endpoint.
 * Uses Node's built-in http module to avoid adding axios as a dep on the backend
 * (we already use it on the frontend).
 *
 * @param {string} repositoryPath  — Absolute path of the cloned repo on disk.
 * @returns {Promise<object>}       — Full analysis response JSON from FastAPI.
 */
const callAnalyzer = (repositoryPath) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ repository_path: repositoryPath });

    const url = new URL('/analyze', ANALYZER_BASE_URL);
    const options = {
      hostname: url.hostname,
      port:     url.port || 8000,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: ANALYZER_TIMEOUT_MS,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 400) {
          let detail = data;
          try { detail = JSON.parse(data).detail || data; } catch (_) {}
          const err = new Error(`Analyzer returned ${res.statusCode}: ${detail}`);
          err.status = res.statusCode;
          return reject(err);
        }
        try {
          resolve(JSON.parse(data));
        } catch (parseErr) {
          reject(new Error(`Analyzer response was not valid JSON: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Analyzer request timed out after ${ANALYZER_TIMEOUT_MS / 1000}s`));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        reject(new Error('Python analyzer service is not reachable. Is it running on port 8000?'));
      } else {
        reject(err);
      }
    });

    req.write(body);
    req.end();
  });
};

/**
 * GET /health check against the analyzer.
 * Returns true if the analyzer is up, false otherwise.
 */
const checkAnalyzerHealth = () => {
  return new Promise((resolve) => {
    const url = new URL('/health', ANALYZER_BASE_URL);
    const req = http.get({ hostname: url.hostname, port: url.port || 8000, path: '/health', timeout: 3000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
};

module.exports = { callAnalyzer, checkAnalyzerHealth };
