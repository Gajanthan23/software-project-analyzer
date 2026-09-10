/**
 * frontend/src/__tests__/RegisterPage.test.jsx
 *
 * Phase 26: Tests for RegisterPage component.
 * Covers: form rendering, input changes, submit success, error display.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import RegisterPage from '../pages/RegisterPage';

vi.mock('../services/authService', () => ({
  authService: {
    register:        vi.fn(),
    isAuthenticated: vi.fn(() => false),
    logout:          vi.fn(),
    getCurrentUser:  vi.fn(() => null),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { authService } from '../services/authService';

function renderRegister() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
});

describe('RegisterPage — rendering', () => {
  it('renders the Create Account heading', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders name, email, and password fields', () => {
    renderRegister();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the Create Account submit button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders a Sign in link', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });
});

describe('RegisterPage — form interactions', () => {
  it('updates name field on typing', async () => {
    renderRegister();
    const nameInput = screen.getByLabelText(/full name/i);
    await userEvent.type(nameInput, 'Alice');
    expect(nameInput).toHaveValue('Alice');
  });

  it('updates email field on typing', async () => {
    renderRegister();
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'alice@example.com');
    expect(emailInput).toHaveValue('alice@example.com');
  });

  it('updates password field on typing', async () => {
    renderRegister();
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(passwordInput, 'securepass');
    expect(passwordInput).toHaveValue('securepass');
  });
});

describe('RegisterPage — submit success', () => {
  it('calls authService.register with correct payload', async () => {
    authService.register.mockResolvedValueOnce({ status: 'success' });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'securepass');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(authService.register).toHaveBeenCalledWith({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'securepass',
      });
    });
  });

  it('navigates to /dashboard after successful registration', async () => {
    authService.register.mockResolvedValueOnce({ status: 'success' });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Alice');
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'securepass');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});

describe('RegisterPage — error handling', () => {
  it('displays error message when registration fails', async () => {
    authService.register.mockRejectedValueOnce({
      response: { data: { message: 'An account with this email address already exists.' } },
    });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'taken@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass123');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
    });
  });

  it('shows validation error from errors array when available', async () => {
    authService.register.mockRejectedValueOnce({
      response: { data: { errors: ['Password must be at least 6 characters long.'] } },
    });
    renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'b@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'ab');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('shows fallback error message on network failure', async () => {
    authService.register.mockRejectedValueOnce(new Error('Network Error'));
    renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'b@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'pass12');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
    });
  });
});
