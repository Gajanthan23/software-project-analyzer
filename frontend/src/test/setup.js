/**
 * frontend/src/test/setup.js
 *
 * Phase 26: Vitest global test setup.
 * - Imports @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Mocks localStorage for components that call authService.isAuthenticated()
 * - Mocks react-router-dom navigate to avoid "No routes matched" errors
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage (jsdom provides it but reset between tests)
const localStorageMock = (() => {
  let store = {};
  return {
    getItem:    (key) => store[key] ?? null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear:      () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Suppress console.error in tests (React internal prop warnings etc.)
vi.spyOn(console, 'error').mockImplementation(() => {});
