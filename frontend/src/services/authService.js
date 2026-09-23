/**
 * services/authService.js
 * 
 * Frontend API client service for user authentication and OTP verification.
 */

import api from './api';

export const authService = {
  /**
   * Register a new user account. Returns verification message and email (no token).
   */
  register: async ({ name, email, password }) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },

  /**
   * Verify OTP code sent to user email.
   * On success, stores token and user in localStorage.
   */
  verifyOtp: async ({ email, otp }) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    const { token, user } = response.data.data;
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  /**
   * Resend a fresh OTP verification code.
   */
  resendOtp: async ({ email }) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },

  /**
   * Log in an existing user.
   */
  login: async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data.data;
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    return response.data;
  },

  /**
   * Fetch current authenticated user profile (/api/auth/me).
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    const user = response.data.data.user;
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    return user;
  },

  /**
   * Log out the current user.
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get stored current user object from localStorage.
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Check if token is present in localStorage.
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};
