/**
 * pages/ProjectOverviewPage.jsx
 *
 * /projects/:id — overall project summary.
 * Displays real project details fetched from projectService.getProjectById.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';

const categories = [
  { label: 'Complexity',    phase: 10, type: 'FACT',      icon: '⚡', path: 'complexity'      },
  { label: 'Code Quality',  phase: 11, type: 'HEURISTIC', icon: '✦', path: 'quality'          },
  { label: 'Testing',       phase: 12, type: 'FACT',      icon: '✓', path: 'testing'          },
  { label: 'Security',      phase: 15, type: 'HEURISTIC', icon: '⚿', path: 'security'         },
  { label: 'Architecture',  phase: 16, type: 'HEURISTIC', icon: '⬡', path: 'architecture'     },
  { label: 'Documentation', phase: 13, type: 'HEURISTIC', icon: '📄', path: 'quality'         },
  { label: 'Git Activity',  phase: 17, type: 'FACT',      icon: '⑃', path: 'git-history'      },
];

const typeColors = {
  FACT:      'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  HEURISTIC: 'bg-amber-500/15  text-amber-300   ring-amber-500/30',
  PREDICTION:'bg-violet-500/15 text-violet-300  ring-violet-500/30',
};

export default function ProjectOverviewPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjectById(id);
      setProject(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20">
        <p className="text-sm text-slate-400">Loading project metadata...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error || 'Project not found.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Project identity header */}
      <div className="card border-indigo-500/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 text-xs">
              {project.owner}
            </span>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-100">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">{project.description || 'No description provided.'}</p>
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
            >
              🔗 {project.repo_url} ↗
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="card-elevated text-center py-2 px-4">
              <span className="text-xs text-slate-500">Stars</span>
              <p className="text-lg font-bold text-amber-400">⭐ {project.stars_count}</p>
            </div>
            <div className="card-elevated text-center py-2 px-4">
              <span className="text-xs text-slate-500">Forks</span>
              <p className="text-lg font-bold text-indigo-400">🍴 {project.forks_count}</p>
            </div>
            <div className="card-elevated text-center py-2 px-4">
              <span className="text-xs text-slate-500">Branch</span>
              <p className="text-sm font-bold text-slate-300"><code>{project.default_branch}</code></p>
            </div>
          </div>
        </div>

        {/* Language Breakdown */}
        {project.languages && Object.keys(project.languages).length > 0 && (
          <div className="mt-6 border-t border-[#1e1e3a] pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Detected Languages <span className="text-[10px] text-slate-600">(FACT — GitHub API)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(project.languages).map(([lang, bytes]) => (
                <span key={lang} className="badge bg-slate-800 text-slate-300 ring-1 ring-slate-700 px-3 py-1">
                  {lang}: <strong className="text-indigo-400 ml-1">{bytes.toLocaleString()} bytes</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overall score circle placeholder */}
      <div className="card flex flex-col items-center gap-4 py-12 text-center border-indigo-500/20 glow-indigo">
        <span className="badge ring-1 bg-amber-500/15 text-amber-300 ring-amber-500/30">
          HEURISTIC — Section 18 scoring formula
        </span>
        <p className="text-sm font-medium text-slate-400">Overall Engineering Score</p>
        <div className="relative flex items-center justify-center">
          <span className="text-7xl font-extrabold gradient-text">—</span>
          <span className="ml-2 text-2xl text-slate-500">/100</span>
        </div>
        <p className="text-xs text-slate-600">Available after Phase 18</p>
      </div>

      {/* Category scores grid */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Category Scores
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ label, phase, type, icon }) => (
            <div key={label} className="card group hover:border-indigo-500/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-slate-200">{label}</span>
                </div>
                <span className={`badge ring-1 text-[10px] ${typeColors[type]}`}>
                  {type}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-600">—</span>
                <span className="text-xs text-slate-600">Phase {phase}+</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[#1e1e3a]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
