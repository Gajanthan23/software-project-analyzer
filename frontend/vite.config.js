import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Node.js backend (Phase 3) so we avoid CORS in dev
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Use jsdom to simulate browser DOM environment
    environment: 'jsdom',
    // Global test APIs (describe, it, expect) without explicit imports
    globals: true,
    // Run setup file before each test suite
    setupFiles: ['./src/test/setup.js'],
    // Coverage configuration
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**'],
    },
  },
})

