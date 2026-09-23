/**
 * frontend/src/__tests__/LoginPage.test.jsx
 *
 * Phase 26: Tests for LoginPage component.
 * Covers: form rendering, input state, submit flow, error display, nav on success.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import LoginPage from '../pages/LoginPage';

// Mock authService so no real HTTP calls are made
vi.mock('../services/authService', () => ({
  authService: {
    login: vi.fn(),
    isAuthenticated: vi.fn(() => false),
    logout: vi.fn(),
    getCurrentUser: vi.fn(() => null),
  },
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { authService } from '../services/authService';

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
});

describe('LoginPage — rendering', () => {
  it('renders the Sign In heading', () => {
    renderLogin();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('renders email and password input fields', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the Sign In submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });
});

describe('LoginPage — form interactions', () => {
  it('updates email field value when user types', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'alice@example.com');
    expect(emailInput).toHaveValue('alice@example.com');
  });

  it('updates password field value when user types', async () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, 'mypassword');
    expect(passwordInput).toHaveValue('mypassword');
  });
});

describe('LoginPage — submit success', () => {
  it('calls authService.login with email and password on submit', async () => {
    authService.login.mockResolvedValueOnce({ status: 'success' });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'correctpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'correctpass',
      });
    });
  });

  it('navigates to /dashboard on successful login', async () => {
    authService.login.mockResolvedValueOnce({ status: 'success' });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'correctpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});

describe('LoginPage — error handling', () => {
  it('displays error message when login fails with server error', async () => {
    authService.login.mockRejectedValueOnce({
      response: { data: { message: 'Invalid email or password.' } },
    });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('displays fallback error when server returns no message', async () => {
    authService.login.mockRejectedValueOnce(new Error('Network error'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/cannot connect to backend server|login failed/i)).toBeInTheDocument();
    });
  });

  it('re-enables Submit button after a failed attempt', async () => {
    authService.login.mockRejectedValueOnce({
      response: { data: { message: 'Bad credentials.' } },
    });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'a@a.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });
});
