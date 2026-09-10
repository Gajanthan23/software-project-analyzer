/**
 * backend/src/__tests__/githubUrlParser.test.js
 *
 * Phase 26: Unit tests for GitHub URL parsing & validation utility.
 */

const { parseGitHubUrl } = require('../../src/utils/githubUrlParser');

describe('parseGitHubUrl', () => {
  // ── Valid URLs ─────────────────────────────────────────────────────────────
  it('parses a clean https://github.com/owner/repo URL', () => {
    const result = parseGitHubUrl('https://github.com/facebook/react');
    expect(result.isValid).toBe(true);
    expect(result.owner).toBe('facebook');
    expect(result.name).toBe('react');
    expect(result.cleanUrl).toBe('https://github.com/facebook/react');
  });

  it('strips .git suffix from repo name', () => {
    const result = parseGitHubUrl('https://github.com/torvalds/linux.git');
    expect(result.isValid).toBe(true);
    expect(result.name).toBe('linux');
    expect(result.cleanUrl).toBe('https://github.com/torvalds/linux');
  });

  it('handles trailing slash in URL', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js/');
    expect(result.isValid).toBe(true);
    expect(result.owner).toBe('vercel');
    expect(result.name).toBe('next.js');
  });

  it('handles repos with hyphens and underscores', () => {
    const result = parseGitHubUrl('https://github.com/my-org/my_awesome-repo');
    expect(result.isValid).toBe(true);
    expect(result.owner).toBe('my-org');
    expect(result.name).toBe('my_awesome-repo');
  });

  it('handles repos with dots in name', () => {
    const result = parseGitHubUrl('https://github.com/vercel/next.js');
    expect(result.isValid).toBe(true);
    expect(result.name).toBe('next.js');
  });

  // ── Invalid URLs ───────────────────────────────────────────────────────────
  it('rejects null input', () => {
    const result = parseGitHubUrl(null);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it('rejects empty string', () => {
    const result = parseGitHubUrl('');
    expect(result.isValid).toBe(false);
  });

  it('rejects non-github domain', () => {
    const result = parseGitHubUrl('https://gitlab.com/owner/repo');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/github\.com/i);
  });

  it('rejects https://github.com with no owner/repo', () => {
    const result = parseGitHubUrl('https://github.com/');
    expect(result.isValid).toBe(false);
  });

  it('rejects URL with only owner and no repo', () => {
    const result = parseGitHubUrl('https://github.com/facebook');
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/owner and repository name/i);
  });

  it('rejects http:// (not https)', () => {
    const result = parseGitHubUrl('http://github.com/owner/repo');
    expect(result.isValid).toBe(false);
  });

  it('rejects plain text (not a URL)', () => {
    const result = parseGitHubUrl('just some text');
    expect(result.isValid).toBe(false);
  });
});
