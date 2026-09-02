/**
 * services/projectService.js
 * 
 * Frontend API client service for repository projects.
 */

import api from './api';

export const projectService = {
  /**
   * Submit a new GitHub repository URL to create/add a project.
   */
  createProject: async (repoUrl) => {
    const response = await api.post('/projects', { repoUrl });
    return response.data;
  },

  /**
   * Fetch all projects for the logged-in user.
   */
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data.data.projects;
  },

  /**
   * Fetch a project by ID.
   */
  getProjectById: async (id) => {
    const response = await api.get(`/projects/${id}`);
    return response.data.data.project;
  },

  /**
   * Phase 7 debug endpoint to verify downloading and workspace cleanup.
   */
  downloadDebug: async (id) => {
    const response = await api.post(`/projects/${id}/download-debug`);
    return response.data;
  },

  /**
   * Trigger full analysis run for a project (Phases 9–19).
   */
  triggerAnalysis: async (id) => {
    const response = await api.post(`/projects/${id}/analyze`, {}, { timeout: 300_000 });
    return response.data;
  },

  /**
   * Fetch all completed analysis metrics for a project.
   */
  getLatestMetrics: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest`);
    return response.data.data;
  },

  /**
   * Fetch latest complexity analysis metrics.
   */
  getLatestComplexity: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/complexity`);
    return response.data.data.complexity;
  },

  /**
   * Fetch latest duplication metrics.
   */
  getLatestDuplication: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/duplication`);
    return response.data.data.duplication;
  },

  /**
   * Fetch latest testing metrics.
   */
  getLatestTesting: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/testing`);
    return response.data.data.testing;
  },

  /**
   * Fetch latest documentation metrics.
   */
  getLatestDocumentation: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/documentation`);
    return response.data.data.documentation;
  },

  /**
   * Fetch latest dependency metrics.
   */
  getLatestDependencies: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/dependencies`);
    return response.data.data.dependencies;
  },

  /**
   * Fetch latest security findings.
   */
  getLatestSecurity: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/security`);
    return response.data.data.security;
  },

  /**
   * Fetch latest architecture pattern & layering violations.
   */
  getLatestArchitecture: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/architecture`);
    return response.data.data.architecture;
  },

  /**
   * Fetch latest git commit history & contributor metrics.
   */
  getLatestGit: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/git-history`);
    return response.data.data.git_history;
  },

  /**
   * Fetch latest quality scores.
   */
  getLatestScores: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/scores`);
    return response.data.data.scores;
  },

  /**
   * Fetch latest actionable recommendations.
   */
  getLatestRecommendations: async (id) => {
    const response = await api.get(`/projects/${id}/analyses/latest/recommendations`);
    return response.data.data.recommendations;
  },

  /**
   * Fetch all analysis runs history.
   */
  getAnalysisRuns: async (id) => {
    const response = await api.get(`/projects/${id}/analyses`);
    return response.data.data.runs;
  }
};
