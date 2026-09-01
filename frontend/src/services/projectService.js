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
  }
};
