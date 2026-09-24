/**
 * pages/DashboardPage.jsx
 * 
 * Main landing page for analyzing GitHub repositories.
 * Wired to projectService.createProject & getProjects.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { authService } from '../services/authService';

function StatCard({ label, value, note, accent = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber:  'from-amber-500 to-amber-600',
  };
  return (
    <div className="card group hover:border-indigo-500/40 transition-colors duration-200">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`mt-2 bg-gradient-to-r ${colors[accent]} bg-clip-text text-3xl font-bold text-transparent`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-600">{note}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load user's projects on mount
  useEffect(() => {
    fetchUserProjects();
  }, []);

  const fetchUserProjects = async () => {
    try {
      if (authService.isAuthenticated()) {
        const list = await projectService.getProjects();
        setProjects(list || []);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const res = await projectService.createProject(repoUrl);
      const newProject = res.data.project;
      setRepoUrl('');
      // Navigate to project detail overview
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to process repository. Check the URL and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pt-8 animate-slide-up">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section>
        <span className="badge bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
          Phase 6 — GitHub Integration Active
        </span>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-100">
          Analyze any{' '}
          <span className="gradient-text">GitHub repository</span>
        </h1>
        <p className="mt-3 max-w-xl text-slate-400">
          Enter a public GitHub URL to retrieve metadata, structure, and prepare it for static complexity analysis.
        </p>

        {/* Error notification */}
        {error && (
          <div className="mt-4 max-w-2xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            ⚠ {error}
          </div>
        )}

        {/* Repository URL input */}
        <form className="mt-6 flex max-w-2xl gap-3" onSubmit={handleSubmit}>
          <input
            id="repo-url-input"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repository"
            className="input flex-1 text-sm"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? 'Validating...' : '⚡ Analyze'}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-600">
          Supported format: <code>https://github.com/owner/repository</code> (Public repositories only).
        </p>
      </section>

      {/* ── Overview stats ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Your Overview
          <span className="ml-2 badge bg-slate-800 text-slate-500">FACT</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Projects added" value={projects.length.toString()} note="Saved in PostgreSQL" accent="indigo" />
          <StatCard label="Analyses run" value="0" note="Phase 8+" accent="violet" />
          <StatCard label="Avg. overall score" value="—" note="Phase 18+" accent="emerald" />
          <StatCard label="Findings detected" value="—" note="Phase 15+" accent="amber" />
        </div>
      </section>

      {/* ── Recent projects table ─────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Your Repositories ({projects.length})
          </h2>
          <Link to="/history" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            View all →
          </Link>
        </div>

        {loadingProjects ? (
          <div className="placeholder-panel py-12">
            <p className="text-sm text-slate-400">Loading your repositories...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="placeholder-panel">
            <div className="text-4xl">📊</div>
            <p className="mt-4 text-sm font-medium text-slate-400">
              No repositories added yet
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Enter a public GitHub URL above to add your first project
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((proj) => (
              <div key={proj.id} className="card group hover:border-indigo-500/40 transition-all">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {proj.owner}
                  </span>
                  <span className="badge bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/30 text-[10px]">
                    ⭐ {proj.stars_count}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-100 truncate">
                  {proj.name}
                </h3>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2 h-8">
                  {proj.description || 'No description available.'}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-[#1e1e3a] pt-3">
                  <span className="text-xs text-slate-500">
                    Branch: <code className="text-slate-400">{proj.default_branch}</code>
                  </span>
                  <Link
                    to={`/projects/${proj.id}`}
                    className="btn-secondary text-xs py-1 px-2.5"
                  >
                    View Project →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Score band legend ────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Score Bands <span className="text-slate-600">(project-defined — Section 18)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { range: '90–100', label: 'Excellent',         color: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30' },
            { range: '75–89',  label: 'Advanced',          color: 'bg-indigo-500/20  text-indigo-300  ring-indigo-500/30'  },
            { range: '60–74',  label: 'Proficient',        color: 'bg-blue-500/20    text-blue-300    ring-blue-500/30'    },
            { range: '40–59',  label: 'Developing',        color: 'bg-amber-500/20   text-amber-300   ring-amber-500/30'   },
            { range: '0–39',   label: 'Needs Improvement', color: 'bg-red-500/20     text-red-300     ring-red-500/30'     },
          ].map(({ range, label, color }) => (
            <span key={range} className={`badge ring-1 ${color} px-3 py-1 text-xs`}>
              {range} — {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
