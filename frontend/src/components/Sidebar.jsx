/**
 * components/Sidebar.jsx
 *
 * Left sidebar rendered inside ProjectLayout for all /projects/:id/* routes.
 * Shows real project name, quality score badge, and sub-page navigation.
 */

import React, { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';

const subPages = [
  {
    to: '',               // /projects/:id (index)
    label: 'Overview',
    icon: '▣',
    description: 'Overall score & summary',
  },
  {
    to: 'complexity',
    label: 'Complexity',
    icon: '⚡',
    description: 'Cyclomatic complexity',
  },
  {
    to: 'quality',
    label: 'Code Quality',
    icon: '✦',
    description: 'Duplication & maintainability',
  },
  {
    to: 'testing',
    label: 'Testing',
    icon: '✓',
    description: 'Tests & coverage',
  },
  {
    to: 'security',
    label: 'Security',
    icon: '⚿',
    description: 'Security findings',
  },
  {
    to: 'architecture',
    label: 'Architecture',
    icon: '⬡',
    description: 'Patterns & structure',
  },
  {
    to: 'git-history',
    label: 'Git History',
    icon: '⑃',
    description: 'Commits & contributors',
  },
  {
    to: 'recommendations',
    label: 'Recommendations',
    icon: '💡',
    description: 'Prioritised improvements',
  },
  {
    to: 'history',
    label: 'History',
    icon: '⏱',
    description: 'Past analysis runs & trends',
  },
];

export default function Sidebar() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [score, setScore] = useState(null);

  useEffect(() => {
    if (id) {
      projectService.getProjectById(id)
        .then(setProject)
        .catch(() => {});

      projectService.getLatestScores(id)
        .then(s => setScore(s?.overall_score))
        .catch(() => {});
    }
  }, [id]);

  const scoreVal = score ? parseFloat(score) : null;

  return (
    <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-60 flex-col border-r border-[#1e1e3a] bg-[#0a0a16] lg:flex z-20">

      {/* Project identity header */}
      <div className="border-b border-[#1e1e3a] px-4 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Repository Project
        </p>
        <p className="mt-1 truncate text-sm font-bold text-slate-100" title={project?.name || id}>
          {project ? project.name : `Project ${id.substring(0, 8)}...`}
        </p>
        
        {/* Score badge */}
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#1e1e3a] overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
              style={{ width: scoreVal ? `${Math.min(100, Math.max(0, scoreVal))}%` : '0%' }}
            />
          </div>
          <span className="text-xs font-extrabold text-indigo-400">
            {scoreVal !== null ? `${scoreVal}/100` : '—/100'}
          </span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {subPages.map(({ to, label, icon }) => {
          const fullPath = to ? `/projects/${id}/${to}` : `/projects/${id}`;

          return (
            <NavLink
              key={label}
              to={fullPath}
              end={to === ''}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-[#1e1e3a] hover:text-slate-200'
                }`
              }
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1e1e3a] px-4 py-4">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-indigo-400"
        >
          ← Back to Dashboard
        </NavLink>
      </div>
    </aside>
  );
}
