/**
 * jest.config.js
 *
 * Phase 26: Jest configuration for backend unit + integration tests.
 * Uses Node test environment; mocks db layer to avoid needing a live DB.
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  // Reset modules between tests to avoid state bleed
  resetModules: true,
  clearMocks: true,
  // Set a reasonable timeout for route integration tests
  testTimeout: 15000,
  // Coverage (optional; run with --coverage flag)
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/utils/initDb.js',
    '!src/utils/logger.js',
  ],
  // Setup file that runs before each suite
  setupFilesAfterEnv: [],
};
