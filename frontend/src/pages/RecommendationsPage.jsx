/**
 * pages/RecommendationsPage.jsx
 *
 * Actionable Software Quality Recommendation Dashboard — Phase 20
 * Powered by rule-based remediation generator (Phase 19 engine).
 * Explicitly labeled as HEURISTIC (Section 42).
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

const PRIORITY_BADGES = {
  HIGH:   'bg-red-500/20 text-red-300 ring-1 ring-red-500/40 border-red-500/30',
  MEDIUM: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 border-amber-500/30',
  LOW:    'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40 border-indigo-500/30',
};

export default function RecommendationsPage() {
  const { id } = useParams();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getLatestRecommendations(id);
      setRecommendations(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'No recommendations found. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">💡</div>
        <p className="mt-4 text-sm text-slate-400">Evaluating telemetry rules & synthesizing quality recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error}</p>
      </div>
    );
  }

  const highPriority   = recommendations.filter(r => r.priority === 'HIGH');
  const mediumPriority = recommendations.filter(r => r.priority === 'MEDIUM');
  const lowPriority    = recommendations.filter(r => r.priority === 'LOW');

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>💡 Actionable Recommendations</span>
            <AnalysisTypeBadge type="heuristic" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Rule-based quality remediation suggestions prioritized by impact (Section 19)
          </p>
        </div>
        <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 text-xs font-bold">
          {recommendations.length} REMEDIATION ACTIONS
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div className="card py-12 text-center border-emerald-500/30 bg-emerald-500/10">
          <span className="text-4xl">🌟</span>
          <p className="mt-3 text-base font-bold text-emerald-300">Excellent Repository Health!</p>
          <p className="mt-1 text-xs text-emerald-400/80">No high, medium, or low priority quality remediation rules were triggered.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* High Priority Group */}
          {highPriority.length > 0 && (
            <RecommendationGroup
              title="High Priority Remediations"
              count={highPriority.length}
              items={highPriority}
              badgeColor="bg-red-500/20 text-red-300 ring-red-500/40"
            />
          )}

          {/* Medium Priority Group */}
          {mediumPriority.length > 0 && (
            <RecommendationGroup
              title="Medium Priority Improvements"
              count={mediumPriority.length}
              items={mediumPriority}
              badgeColor="bg-amber-500/20 text-amber-300 ring-amber-500/40"
            />
          )}

          {/* Low Priority Group */}
          {lowPriority.length > 0 && (
            <RecommendationGroup
              title="Low Priority Optimizations"
              count={lowPriority.length}
              items={lowPriority}
              badgeColor="bg-indigo-500/20 text-indigo-300 ring-indigo-500/40"
            />
          )}
        </div>
      )}

    </div>
  );
}

function RecommendationGroup({ title, count, items, badgeColor }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">{title}</h2>
        <span className={`badge ring-1 text-[10px] ${badgeColor}`}>{count}</span>
      </div>

      <div className="space-y-4">
        {items.map((r, i) => (
          <div key={i} className="card hover:border-indigo-500/50 transition-all space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`badge ring-1 text-[10px] font-bold uppercase ${PRIORITY_BADGES[r.priority] || PRIORITY_BADGES.MEDIUM}`}>
                  {r.priority} PRIORITY
                </span>
                <span className="badge bg-slate-800 text-slate-300 ring-1 ring-slate-700 text-[10px]">
                  {r.category}
                </span>
              </div>
              <AnalysisTypeBadge type="heuristic" />
            </div>

            <h3 className="text-base font-bold text-slate-100">{r.problem}</h3>

            <p className="text-xs text-slate-300 leading-relaxed">{r.explanation}</p>

            <div className="rounded-md bg-[#0a0a16] border border-[#1e1e3a] p-3 text-xs text-indigo-300">
              <strong className="text-indigo-400">➡️ Suggested Action: </strong>
              {r.suggested_action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
