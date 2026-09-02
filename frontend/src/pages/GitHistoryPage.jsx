/**
 * pages/GitHistoryPage.jsx
 *
 * Git Commit Log & Contributor Telemetry Dashboard — Phase 20
 * Powered by Git subprocess log parser & GitHub REST API (Phase 17 engine).
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

export default function GitHistoryPage() {
  const { id } = useParams();
  const [git, setGit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getLatestGit(id);
      setGit(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No git history analysis found. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">⑃</div>
        <p className="mt-4 text-sm text-slate-400">Parsing Git commit graph & contributor logs...</p>
      </div>
    );
  }

  if (error || !git) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error || 'No git history data available.'}</p>
      </div>
    );
  }

  const contributors = git.top_contributors || [];

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>⑃ Git History & Contributor Activity</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Commit logs parsed from local clone + PRs/Issues fetched via GitHub REST API (Section 17)
          </p>
        </div>
        <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 text-xs">
          Age: {git.repository_age_days || 0} days
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total Commits</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{git.total_commits?.toLocaleString() || 0}</p>
          <span className="text-[10px] text-slate-600">First: {git.first_commit_date ? new Date(git.first_commit_date).toLocaleDateString() : 'N/A'}</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Contributors</span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">{git.contributor_count || 0}</p>
          <span className="text-[10px] text-slate-600">Distinct commit authors</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Recent Activity (30d)</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{git.recent_commits_30d || 0}</p>
          <span className="text-[10px] text-slate-600">Last 90d: {git.recent_commits_90d || 0} commits</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">GitHub Issues & PRs</span>
          <p className="mt-2 text-2xl font-bold text-violet-400">
            {git.open_issues_count || 0} Issues / {git.open_prs_count || 0} PRs
          </p>
          <span className="text-[10px] text-slate-600">Fetched via GitHub REST API</span>
        </div>
      </div>

      {/* Shallow Clone Warning if applicable */}
      {git.analysis_notes && git.analysis_notes.includes('shallow') && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          ℹ Note: Repository cloned with shallow depth (`--depth 1`). Commit history count reflects the shallow snapshot.
        </div>
      )}

      {/* Top Contributors Table */}
      <div className="card">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Top Repository Contributors</span>
          <AnalysisTypeBadge type="fact" />
        </h2>

        {contributors.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No contributor activity records available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-[#1e1e3a] bg-[#0a0a16] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contributor Username</th>
                  <th className="py-3 px-4 text-right">Commit Count</th>
                  <th className="py-3 px-4 text-right">Commit Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e3a]">
                {contributors.map((c, i) => {
                  let name = c.author || c.name || c.login || 'Anonymous';
                  if (name.includes('<')) name = name.split('<')[0].trim();
                  if (name.includes('@')) name = name.split('@')[0].trim();
                  if (!name) name = 'Anonymous';

                  const pct = git.total_commits > 0 ? ((c.commits / git.total_commits) * 100).toFixed(1) : '0.0';
                  return (
                    <tr key={i} className="hover:bg-[#14142b] transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-300 flex items-center gap-2">
                        <span className="text-slate-500">👤</span>
                        <span>{name}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-100">{c.commits}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
