/**
 * utils/githubUrlParser.js
 * 
 * Validates and extracts owner and repository name from GitHub URLs.
 * Accepts formats:
 *   - https://github.com/owner/repo
 *   - https://github.com/owner/repo.git
 *   - https://github.com/owner/repo/
 */

const parseGitHubUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') {
    return { isValid: false, error: 'Repository URL is required.' };
  }

  const trimmed = urlStr.trim();

  // Basic format check
  if (!trimmed.startsWith('https://github.com/')) {
    return {
      isValid: false,
      error: 'Invalid URL format. URL must start with https://github.com/'
    };
  }

  try {
    const parsed = new URL(trimmed);
    
    if (parsed.hostname !== 'github.com') {
      return { isValid: false, error: 'Only GitHub repositories (github.com) are supported.' };
    }

    // Pathname split: /owner/repo or /owner/repo.git
    const pathSegments = parsed.pathname
      .split('/')
      .filter(segment => segment.length > 0);

    if (pathSegments.length < 2) {
      return {
        isValid: false,
        error: 'Invalid GitHub URL. Must contain both owner and repository name (e.g. https://github.com/owner/repository).'
      };
    }

    const owner = pathSegments[0];
    let name = pathSegments[1];

    // Strip trailing .git if present
    if (name.endsWith('.git')) {
      name = name.slice(0, -4);
    }

    // Validate owner and repo naming characters (alphanumeric, hyphen, underscore, dot)
    const validPattern = /^[a-zA-Z0-9_.-]+$/;
    if (!validPattern.test(owner) || !validPattern.test(name)) {
      return {
        isValid: false,
        error: 'Invalid characters in repository owner or name.'
      };
    }

    const cleanUrl = `https://github.com/${owner}/${name}`;

    return {
      isValid: true,
      owner,
      name,
      cleanUrl
    };
  } catch (err) {
    return { isValid: false, error: 'Malformed URL provided.' };
  }
};

module.exports = { parseGitHubUrl };
