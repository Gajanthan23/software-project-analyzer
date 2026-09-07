/**
 * pages/HistoryPage.jsx
 *
 * Analysis History & Score Trends Page — Phase 21 (Section 24 & Section 26)
 * Displays past analysis runs, chronological score trend charts (Recharts),
 * score deltas, and historical run inspection drill-downs.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

export default function HistoryPage() {
  const { id } = useParams();
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState('overall_score');
  const [selectedRun, setSelectedRun] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getAnalysisRuns(id);
      setRuns(data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analysis history.');
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await projectService.triggerAnalysis(id);
      await fetchHistory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to re-analyze repository.');
    } finally {
      setReanalyzing(false);
    }
  };

  const handleOpenDetails = async (runId) => {
    try {
      setModalLoading(true);
      const details = await projectService.getAnalysisRunDetails(id, runId);
      setSelectedRun(details);
    } catch (err) {
      alert('Failed to load run details.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 text-slate-400">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-sm font-medium">Fetching analysis history & score trend timeline...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
        <p className="text-lg font-bold">⚠ Error Loading History</p>
        <p className="mt-1 text-sm">{error}</p>
        <button
          onClick={fetchHistory}
          className="mt-4 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-semibold hover:bg-red-500/30"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  // Filter completed runs for chart
  const completedRuns = runs.filter(r => r.status === 'completed' && r.overall_score !== null);
  
  // Format chart data (chronological: oldest to newest)
  const chartData = [...completedRuns].reverse().map((run, idx) => {
    const date = new Date(run.completed_at || run.started_at);
    const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      runIndex: idx + 1,
      runId: run.id.substring(0, 8),
      fullId: run.id,
      timestamp: `${dateStr} ${timeStr}`,
      overall_score: parseFloat(run.overall_score || 0),
      code_quality: parseFloat(run.code_quality_score || 0),
      maintainability: parseFloat(run.maintainability_score || 0),
      complexity: parseFloat(run.complexity_score || 0),
      architecture: parseFloat(run.architecture_score || 0),
      testing: parseFloat(run.testing_score || 0),
      security: parseFloat(run.security_score || 0),
      documentation: parseFloat(run.documentation_score || 0),
      score_band: run.score_band || 'N/A',
      total_loc: run.total_loc || 0,
    };
  });

  // Telemetry Calculations
  const latestRun = completedRuns[0];
  const previousRun = completedRuns[1];
  const latestScore = latestRun ? parseFloat(latestRun.overall_score || 0) : null;
  const prevScore = previousRun ? parseFloat(previousRun.overall_score || 0) : null;
  
  let scoreDelta = null;
  if (latestScore !== null && prevScore !== null) {
    scoreDelta = parseFloat((latestScore - prevScore).toFixed(2));
  }

  const avgScore = completedRuns.length > 0
    ? (completedRuns.reduce((sum, r) => sum + parseFloat(r.overall_score || 0), 0) / completedRuns.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-8 pb-12">

      {/* Header Bar */}
      <div className="flex flex-col gap-4 border-b border-[#1e1e3a] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>⏱ Analysis History & Trends</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Chronological audit log of repository analysis runs, quality score trajectories, and version metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to={`/projects/${id}/compare`}
            className="btn btn-secondary text-xs"
          >
            ⚖ Compare Runs
          </Link>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className="btn btn-primary text-xs flex items-center gap-2"
          >
            {reanalyzing ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>🔄 Re-analyze Repo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Telemetry Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total Runs</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{runs.length}</p>
          <span className="text-[10px] text-slate-600">{completedRuns.length} Completed Runs</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Latest Score</span>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-extrabold text-emerald-400">
              {latestScore !== null ? latestScore : '—'}
            </p>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
          <span className="text-[10px] text-slate-600">{latestRun?.score_band || 'Needs Analysis'}</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Score Trajectory Delta</span>
          <p className={`mt-2 text-3xl font-extrabold ${scoreDelta > 0 ? 'text-emerald-400' : scoreDelta < 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {scoreDelta !== null ? (scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta) : '—'}
          </p>
          <span className="text-[10px] text-slate-600">Compared to previous run</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Historical Average</span>
          <p className="mt-2 text-3xl font-extrabold text-violet-400">{avgScore}</p>
          <span className="text-[10px] text-slate-600">Across {completedRuns.length} runs</span>
        </div>
      </div>

      {/* Score Trend Chart Section (Recharts per Section 26) */}
      <div className="card space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📈 Software Quality Score Trend Over Time</span>
            </h2>
            <p className="text-xs text-slate-400">Chronological score trajectory per analysis run</p>
          </div>

          {/* Metric selector tabs */}
          <div className="flex flex-wrap gap-1 bg-[#0a0a16] p-1 rounded-lg border border-[#1e1e3a]">
            {[
              { id: 'overall_score', label: 'Overall Score' },
              { id: 'code_quality', label: 'Code Quality' },
              { id: 'architecture', label: 'Architecture' },
              { id: 'security', label: 'Security' },
              { id: 'complexity', label: 'Complexity' },
              { id: 'testing', label: 'Testing' },
              { id: 'documentation', label: 'Docs' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  activeMetric === m.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e1e3a]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length < 2 ? (
          <div className="py-12 text-center text-slate-500 bg-[#080814] rounded-lg border border-dashed border-[#1e1e3a]">
            <p className="text-sm font-semibold">Need at least 2 completed analysis runs to visualize trend chart.</p>
            <p className="mt-1 text-xs">Run a new analysis to start recording score history progression over time.</p>
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip activeMetric={activeMetric} />} />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke="#6366f1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#scoreColor)"
                  dot={{ r: 4, fill: '#818cf8', strokeWidth: 2, stroke: '#1e1e3a' }}
                  activeDot={{ r: 7, fill: '#a5b4fc', stroke: '#6366f1', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Analysis Runs History Table */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Analysis Runs History Log</h2>
          <span className="text-xs text-slate-500">{runs.length} total recorded runs</span>
        </div>

        {runs.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            No analysis runs recorded yet. Click "Re-analyze Repo" to trigger your first analysis run.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0e0e24] text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#1e1e3a]">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Overall Score</th>
                  <th className="py-3 px-4">Lines of Code</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e3a]">
                {runs.map(run => {
                  const dateStr = new Date(run.started_at).toLocaleString();
                  const durationSec = run.duration_seconds
                    ? `${Math.round(run.duration_seconds)}s`
                    : '—';

                  const scoreVal = run.overall_score !== null ? parseFloat(run.overall_score) : null;

                  return (
                    <tr key={run.id} className="hover:bg-[#12122c] transition-colors">
                      <td className="py-3 px-4 font-mono text-indigo-300 font-medium">
                        {run.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {dateStr}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {durationSec}
                      </td>
                      <td className="py-3 px-4">
                        {scoreVal !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{scoreVal}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getBandStyle(run.score_band)}`}>
                              {run.score_band}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {run.total_loc ? run.total_loc.toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetails(run.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded border border-indigo-500/30 transition-all"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Run Details Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-xl border border-[#1e1e3a] bg-[#0c0c1e] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  Historical Run Details ({selectedRun.run.id.substring(0, 8)})
                </h3>
                <p className="text-xs text-slate-400">
                  Executed on {new Date(selectedRun.run.started_at).toLocaleString()} • Duration: {Math.round(selectedRun.run.duration_seconds || 0)}s
                </p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-slate-400 hover:text-slate-100 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {selectedRun.scores && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#141432] p-4 rounded-lg border border-indigo-500/30">
                  <div>
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Overall Score</span>
                    <p className="text-3xl font-extrabold text-indigo-300">{selectedRun.scores.overall_score}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs font-bold ${getBandStyle(selectedRun.scores.score_band)}`}>
                    {selectedRun.scores.score_band}
                  </span>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-2">Sub-Score Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Code Quality', score: selectedRun.scores.code_quality_score },
                    { label: 'Maintainability', score: selectedRun.scores.maintainability_score },
                    { label: 'Architecture', score: selectedRun.scores.architecture_score },
                    { label: 'Testing', score: selectedRun.scores.testing_score },
                    { label: 'Security', score: selectedRun.scores.security_score },
                    { label: 'Documentation', score: selectedRun.scores.documentation_score },
                  ].map(s => (
                    <div key={s.label} className="bg-[#101026] p-3 rounded-lg border border-[#1e1e3a]">
                      <span className="text-[11px] text-slate-400">{s.label}</span>
                      <p className="text-lg font-bold text-slate-100 mt-1">{s.score ?? '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRun.metrics && (
              <div className="border-t border-[#1e1e3a] pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Metrics Snapshot</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-300">
                  <div>Total LOC: <strong className="text-indigo-300">{selectedRun.metrics.total_loc?.toLocaleString()}</strong></div>
                  <div>Source Files: <strong className="text-emerald-300">{selectedRun.metrics.source_files}</strong></div>
                  <div>Test Files: <strong className="text-amber-300">{selectedRun.metrics.test_files}</strong></div>
                  <div>Language: <strong className="text-violet-300">{selectedRun.metrics.primary_language}</strong></div>
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-[#1e1e3a] pt-4">
              <button
                onClick={() => setSelectedRun(null)}
                className="btn btn-secondary text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Recharts Custom Tooltip Component
function CustomTooltip({ active, payload, label, activeMetric }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    const metricLabels = {
      overall_score: 'Overall Score',
      code_quality: 'Code Quality',
      architecture: 'Architecture',
      security: 'Security',
      complexity: 'Complexity',
      testing: 'Testing',
      documentation: 'Documentation',
    };

    return (
      <div className="rounded-lg border border-[#1e1e3a] bg-[#0d0d24] p-3 shadow-xl text-xs space-y-1">
        <p className="font-bold text-indigo-300">{data.timestamp} ({data.runId})</p>
        <p className="text-slate-200">
          <span className="text-slate-400">{metricLabels[activeMetric] || activeMetric}:</span>{' '}
          <strong className="text-emerald-400">{value}</strong> / 100
        </p>
        <p className="text-[10px] text-slate-500">Total LOC: {data.total_loc?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

function StatusBadge({ status }) {
  if (status === 'completed') {
    return <span className="badge bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30">Completed</span>;
  }
  if (status === 'running') {
    return <span className="badge bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 animate-pulse">Running</span>;
  }
  return <span className="badge bg-red-500/20 text-red-300 ring-1 ring-red-500/30">Failed</span>;
}

function getBandStyle(band) {
  switch (band) {
    case 'Excellent':
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    case 'Advanced':
      return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    case 'Proficient':
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    case 'Developing':
      return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
    default:
      return 'bg-red-500/20 text-red-300 border border-red-500/30';
  }
}
