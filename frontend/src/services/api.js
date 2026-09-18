/**
 * services/api.js
 *
 * Axios base client.  All API modules import this instance so that:
 *   - The base URL is set once from the environment variable VITE_API_URL.
 *   - The JWT auth header is injected automatically once auth is implemented
 *     (Phase 5).
 *   - Error handling / response interceptors are in one place.
 *
 * NOTE (Phase 2): Auth interceptors are stubbed out — no real token logic yet.
 */

import axios from 'axios'

// ─── Create base instance ──────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 300_000,         // 300 s (5 minutes) — full repo cloning & static analysis can take >30s on slower networks
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor ──────────────────────────────────────────────────
// Phase 5 will populate this with: Authorization: Bearer <JWT>
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') // set in Phase 5
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor ────────────────────────────────────────────────
// Phase 5 will add: redirect to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login' &&
        window.location.pathname !== '/register'
      ) {
        window.location.href = '/login?expired=true'
      }
    }
    return Promise.reject(error)
  },
)

export default api
