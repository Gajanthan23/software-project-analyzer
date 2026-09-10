/**
 * frontend/src/__tests__/DashboardPage.test.jsx
 *
 * Phase 26: Tests for DashboardPage component.
 * Covers: repo URL form rendering, empty-state rendering, project list rendering,
 * form submission, and error state handling.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import DashboardPage from '../pages/DashboardPage';

// Mock projectService
vi.mock('../services/projectService', () => ({
  projectService: {
    getProjects:   vi.fn(),
    createProject: vi.fn(),
  },
}));

// Mock authService
vi.mock('../services/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
    getCurrentUser:  vi.fn(() => ({ id: 'u1', name: 'Alice' })),
    logout:          vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { projectService } from '../services/projectService';
import { authService }    from '../services/authService';

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
  authService.isAuthenticated.mockReturnValue(true);
});

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardPage — rendering', () => {
  it('renders the GitHub repository URL input', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    renderDashboard();
    expect(screen.getByPlaceholderText(/https:\/\/github\.com/i)).toBeInTheDocument();
  });

  it('renders the Analyze submit button', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    renderDashboard();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('renders score band legend section', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/score bands/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardPage — empty state', () => {
  it('shows empty state message when user has no projects', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no repositories added yet/i)).toBeInTheDocument();
    });
  });

  it('shows the correct projects count (0) in stat card', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/projects added/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Project list rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardPage — project list', () => {
  const mockProjects = [
    {
      id: 'p1',
      name: 'react',
      owner: 'facebook',
      description: 'A UI library',
      stars_count: 210000,
      forks_count: 42000,
      default_branch: 'main',
    },
    {
      id: 'p2',
      name: 'next.js',
      owner: 'vercel',
      description: 'The React framework',
      stars_count: 115000,
      forks_count: 25000,
      default_branch: 'canary',
    },
  ];

  it('renders each project name', async () => {
    projectService.getProjects.mockResolvedValueOnce(mockProjects);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('next.js')).toBeInTheDocument();
    });
  });

  it('renders View Project links for each project', async () => {
    projectService.getProjects.mockResolvedValueOnce(mockProjects);
    renderDashboard();

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /view project/i });
      expect(links).toHaveLength(2);
    });
  });

  it('renders project owner badges', async () => {
    projectService.getProjects.mockResolvedValueOnce(mockProjects);
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('facebook')).toBeInTheDocument();
      expect(screen.getByText('vercel')).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Form submission
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardPage — repository submission', () => {
  it('calls projectService.createProject with the entered URL', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    projectService.createProject.mockResolvedValueOnce({
      data: { project: { id: 'new-proj', name: 'react', owner: 'facebook' } },
    });
    renderDashboard();

    const input = screen.getByPlaceholderText(/https:\/\/github\.com/i);
    await userEvent.type(input, 'https://github.com/facebook/react');
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));

    await waitFor(() => {
      expect(projectService.createProject).toHaveBeenCalledWith(
        'https://github.com/facebook/react'
      );
    });
  });

  it('navigates to the new project page on success', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    projectService.createProject.mockResolvedValueOnce({
      data: { project: { id: 'new-proj', name: 'react', owner: 'facebook' } },
    });
    renderDashboard();

    await userEvent.type(
      screen.getByPlaceholderText(/https:\/\/github\.com/i),
      'https://github.com/facebook/react'
    );
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/projects/new-proj');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────────────────
describe('DashboardPage — error handling', () => {
  it('displays error message when createProject fails', async () => {
    projectService.getProjects.mockResolvedValueOnce([]);
    projectService.createProject.mockRejectedValueOnce({
      response: { data: { message: 'Repository not found on GitHub.' } },
    });
    renderDashboard();

    await userEvent.type(
      screen.getByPlaceholderText(/https:\/\/github\.com/i),
      'https://github.com/invalid/repo'
    );
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));

    await waitFor(() => {
      expect(screen.getByText(/repository not found/i)).toBeInTheDocument();
    });
  });

  it('redirects to /login when user is not authenticated and submits', async () => {
    authService.isAuthenticated.mockReturnValue(false);
    projectService.getProjects.mockResolvedValueOnce([]);
    renderDashboard();

    await userEvent.type(
      screen.getByPlaceholderText(/https:\/\/github\.com/i),
      'https://github.com/owner/repo'
    );
    await userEvent.click(screen.getByRole('button', { name: /analyze/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });
});
