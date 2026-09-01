/**
 * services/githubService.js
 * 
 * GitHub REST API client for fetching public repository metadata,
 * language statistics, file structure, and README documentation.
 */

const logger = require('../utils/logger');

const GITHUB_API_BASE = 'https://api.github.com';

const getHeaders = () => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Software-Project-Complexity-Analyzer'
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && token.trim().length > 0) {
    headers['Authorization'] = `token ${token.trim()}`;
  }

  return headers;
};

const handleGitHubError = (response, owner, name) => {
  if (response.status === 404) {
    const error = new Error(`Repository '${owner}/${name}' not found or is private.`);
    error.status = 404;
    throw error;
  }

  if (response.status === 403 || response.status === 429) {
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    if (rateLimitRemaining === '0') {
      const error = new Error('GitHub API rate limit exceeded. Please configure a GITHUB_TOKEN in your environment.');
      error.status = 429;
      throw error;
    }
    const error = new Error('Access to repository forbidden or private.');
    error.status = 403;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`GitHub API request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
};

const githubService = {
  /**
   * Fetch complete repository metadata bundle.
   */
  fetchRepoData: async (owner, name) => {
    logger.info(`Fetching GitHub metadata for ${owner}/${name}...`);

    const headers = getHeaders();

    // 1. Fetch Repository Details
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}`, { headers });
    handleGitHubError(repoRes, owner, name);
    const repoData = await repoRes.json();

    // Verify it is not a private repo if accessed unauthenticated
    if (repoData.private) {
      const error = new Error(`Repository '${owner}/${name}' is private. Only public repositories are supported.`);
      error.status = 403;
      throw error;
    }

    // 2. Fetch Language Breakdown
    let languages = {};
    try {
      const langRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}/languages`, { headers });
      if (langRes.ok) {
        languages = await langRes.json();
      }
    } catch (err) {
      logger.warn(`Failed to fetch languages for ${owner}/${name}`, err);
    }

    // 3. Fetch Top-Level File Structure
    let contents = [];
    try {
      const contentsRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}/contents`, { headers });
      if (contentsRes.ok) {
        const rawContents = await contentsRes.json();
        if (Array.isArray(rawContents)) {
          contents = rawContents.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type, // 'file' or 'dir'
            size: item.size
          }));
        }
      }
    } catch (err) {
      logger.warn(`Failed to fetch file structure for ${owner}/${name}`, err);
    }

    // 4. Fetch README if present
    let readme = null;
    try {
      const readmeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${name}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        readme = {
          name: readmeData.name,
          path: readmeData.path,
          size: readmeData.size,
          download_url: readmeData.download_url
        };
      }
    } catch (err) {
      logger.warn(`No README found or error fetching README for ${owner}/${name}`, err);
    }

    return {
      repo_url: repoData.html_url,
      owner: repoData.owner.login,
      name: repoData.name,
      description: repoData.description || '',
      default_branch: repoData.default_branch || 'main',
      stars_count: repoData.stargazers_count || 0,
      forks_count: repoData.forks_count || 0,
      open_issues_count: repoData.open_issues_count || 0,
      is_archived: repoData.archived || false,
      languages,
      file_structure: contents,
      readme,
      pushed_at: repoData.pushed_at,
      created_at: repoData.created_at
    };
  }
};

module.exports = githubService;
