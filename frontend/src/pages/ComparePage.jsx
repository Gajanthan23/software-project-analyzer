/**
 * pages/ComparePage.jsx — /compare
 * Side-by-side Project Quality & Metric Comparison
 *
 * Overview:
 *   - Allows user to pick 2+ analyzed projects
 *   - Side-by-side scores & key telemetry metric table
 *   - Recharts Grouped Bar Chart & Radar Chart for sub-scores comparison
 *   - Classification badges (FACT / HEURISTIC / ML)
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
];

export default function ComparePage() {
  const [allProjects, setAllProjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparedData, setComparedData] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState(null);
  const [chartView, setChartView] = useState('both'); // 'bar' | 'radar' | 'both'

  // Fetch all user projects on mount
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoadingProjects(true);
        const projects = await projectService.getProjects();
        setAllProjects(projects);

        // Pre-select first 2 projects if available
        if (projects.length >= 2) {
          setSelectedIds([projects[0].id, projects[1].id]);
        } else if (projects.length === 1) {
          setSelectedIds([projects[0].id]);
        }
      } catch (err) {
        console.error('Failed to fetch projects for comparison:', err);
        setError('Failed to load project list.');
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  // Whenever selectedIds change, fetch comparison payload
  useEffect(() => {
    async function fetchComparison() {
      if (selectedIds.length === 0) {
        setComparedData([]);
        return;
      }
      try {
        setLoadingCompare(true);
        setError(null);
        const data = await projectService.compareProjects(selectedIds);
        setComparedData(data);
      } catch (err) {
        console.error('Failed to compare projects:', err);
        setError(err.response?.data?.message || 'Failed to compare selected projects.');
      } finally {
        setLoadingCompare(false);
      }
    }
    fetchComparison();
  }, [selectedIds]);

  // Handle dropdown selection changes
  const handleSelectProject = (index, newId) => {
    const updated = [...selectedIds];
    if (newId) {
      updated[index] = newId;
    } else {
      updated.splice(index, 1);
    }
    // Filter out duplicates
    const unique = Array.from(new Set(updated));
    setSelectedIds(unique);
  };

  // Add another project column (up to 4)
  const handleAddSlot = () => {
    if (selectedIds.length >= 4) return;
    // Find first project not already selected
    const unselected = allProjects.find(p => !selectedIds.includes(p.id));
    if (unselected) {
      setSelectedIds([...selectedIds, unselected.id]);
    }
  };

  // Remove a project slot
  const handleRemoveSlot = (index) => {
    const updated = [...selectedIds];
    updated.splice(index, 1);
    setSelectedIds(updated);
  };

  // Metrics for side-by-side charts
  const chartMetrics = [
    { key: 'overall',         label: 'Overall Score' },
    { key: 'code_quality',    label: 'Code Quality' },
    { key: 'maintainability', label: 'Maintainability' },
    { key: 'complexity',     label: 'Complexity' },
    { key: 'architecture',    label: 'Architecture' },
    { key: 'testing',         label: 'Testing' },
    { key: 'security',        label: 'Security' },
    { key: 'documentation',   label: 'Documentation' },
  ];

  // Recharts Bar & Radar data format
  const chartData = useMemo(() => {
    if (!comparedData || comparedData.length === 0) return [];

    return chartMetrics.map(({ key, label }) => {
      const row = { metric: label };
      comparedData.forEach((proj) => {
        const projName = `${proj.owner}/${proj.name}`;
        row[projName] = proj.has_analysis && proj.scores ? (proj.scores[key] || 0) : 0;
      });
      return row;
    });
  }, [comparedData]);

  // Helper to determine best score highlight in table
  const getBestScoreIdx = (scoreKey, isHigherBetter = true) => {
    if (!comparedData || comparedData.length < 2) return -1;
    let bestVal = isHigherBetter ? -Infinity : Infinity;
    let bestIdx = -1;

    comparedData.forEach((p, idx) => {
      if (!p.has_analysis) return;
      let val = 0;
      if (p.scores && p.scores[scoreKey] !== undefined) {
        val = p.scores[scoreKey];
      } else if (p.metrics && p.metrics[scoreKey] !== undefined) {
        val = p.metrics[scoreKey];
      } else if (p[scoreKey] !== undefined) {
        val = p[scoreKey];
      }

      if (isHigherBetter ? val > bestVal : val < bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });

    return bestVal !== (isHigherBetter ? -Infinity : Infinity) ? bestIdx : -1;
  };

  return (
    <div className="space-y-8 pt-8 animate-slide-up">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">Project Comparison</h1>
            <AnalysisTypeBadge type="heuristic" />
          </div>
          <p className="page-subtitle">
            Side-by-side engineering quality analysis & score breakdown across analyzed repositories
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-[#13132b] p-1 rounded-lg border border-[#1e1e3a] text-xs">
          <button
            onClick={() => setChartView('both')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              chartView === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dual View
          </button>
          <button
            onClick={() => setChartView('bar')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              chartView === 'bar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bar Chart
          </button>
          <button
            onClick={() => setChartView('radar')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              chartView === 'radar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Radar Chart
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* ── Project Selection Slots Grid ─────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Select Repositories to Compare ({selectedIds.length} Selected)
          </h2>
          {selectedIds.length < 4 && allProjects.length > selectedIds.length && (
            <button
              onClick={handleAddSlot}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
            >
              + Add Project Column
            </button>
          )}
        </div>

        {loadingProjects ? (
          <div className="py-6 text-center text-sm text-slate-500">Loading project list...</div>
        ) : allProjects.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-slate-400 text-sm mb-3">No analyzed projects found in your repository list.</p>
            <Link to="/dashboard" className="btn-primary text-xs">
              Go to Dashboard to Add & Analyze Repositories
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {selectedIds.map((id, index) => {
              const selectedProj = allProjects.find(p => p.id === id);
              const color = PROJECT_COLORS[index % PROJECT_COLORS.length];

              return (
                <div
                  key={`slot-${index}`}
                  className="p-3 rounded-lg border border-[#1e1e3a] bg-[#0b0c16] space-y-2 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>
                      Project {String.fromCharCode(65 + index)}
                    </span>
                    {selectedIds.length > 2 && (
                      <button
                        onClick={() => handleRemoveSlot(index)}
                        className="text-slate-500 hover:text-red-400 text-xs transition-colors"
                        title="Remove project"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    className="input text-xs py-2 w-full bg-[#131424] border-[#252642] text-slate-200"
                    value={id}
                    onChange={(e) => handleSelectProject(index, e.target.value)}
                  >
                    {allProjects.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={selectedIds.includes(p.id) && p.id !== id}
                      >
                        {p.owner}/{p.name}
                      </option>
                    ))}
                  </select>

                  {selectedProj && (
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                      <span className="truncate">{selectedProj.primary_language || 'Repo'}</span>
                      <Link
                        to={`/projects/${selectedProj.id}`}
                        className="text-indigo-400 hover:underline"
                      >
                        View Dashboard →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Comparison Views & Charts ────────────────────────────────────── */}
      {loadingCompare ? (
        <div className="card py-16 text-center text-slate-400 animate-pulse">
          Analyzing and aggregating side-by-side metrics...
        </div>
      ) : comparedData.length < 2 ? (
        <div className="card py-12 text-center text-slate-400">
          <span className="text-4xl block mb-3">⚖️</span>
          <p className="text-base font-semibold text-slate-200">Select at least two projects to compare</p>
          <p className="text-xs text-slate-500 mt-1">
            Choose two or more repositories from the dropdown selectors above to inspect side-by-side scores and radar profiles.
          </p>
        </div>
      ) : (
        <>
          {/* Charts Row / Grid */}
          <div className={`grid gap-6 ${chartView === 'both' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Bar Chart */}
            {(chartView === 'both' || chartView === 'bar') && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Quality Sub-Scores Comparison (Bar Chart)
                  </h3>
                  <AnalysisTypeBadge type="heuristic" />
                </div>

                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" vertical={false} />
                      <XAxis
                        dataKey="metric"
                        stroke="#64748b"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                      />
                      <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      {comparedData.map((proj, idx) => (
                        <Bar
                          key={proj.project_id}
                          dataKey={`${proj.owner}/${proj.name}`}
                          fill={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Radar Chart */}
            {(chartView === 'both' || chartView === 'radar') && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Multi-Dimensional Profile Overlay (Radar)
                  </h3>
                  <AnalysisTypeBadge type="heuristic" />
                </div>

                <div className="h-80 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData.filter(d => d.metric !== 'OverallScore')}>
                      <PolarGrid stroke="#1e1e3a" />
                      <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <PolarRadiusAxis domain={[0, 100]} stroke="#475569" tick={false} axisLine={false} />
                      {comparedData.map((proj, idx) => (
                        <Radar
                          key={proj.project_id}
                          name={`${proj.owner}/${proj.name}`}
                          dataKey={`${proj.owner}/${proj.name}`}
                          stroke={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                          fill={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                          fillOpacity={0.25}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ── Side-by-side Score & Metric Matrix Table ──────────────────── */}
          <div className="card overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Comprehensive Metrics & Sub-Scores Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Green highlights indicate best performance across compared projects
                </p>
              </div>
              <AnalysisTypeBadge type="heuristic" />
            </div>

            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#1e1e3a] text-xs font-medium text-slate-400">
                  <th className="pb-3 min-w-[180px]">Metric / Quality Area</th>
                  {comparedData.map((proj, idx) => (
                    <th key={proj.project_id} className="pb-3 text-center min-w-[140px]">
                      <span className="font-bold block" style={{ color: PROJECT_COLORS[idx % PROJECT_COLORS.length] }}>
                        {proj.owner}/{proj.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {proj.primary_language}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e3a]">
                {/* Overall Score */}
                <tr className="bg-indigo-500/5">
                  <td className="py-3 font-semibold text-slate-200">Overall Score</td>
                  {comparedData.map((proj, idx) => {
                    const isBest = getBestScoreIdx('overall_score', true) === idx;
                    return (
                      <td key={proj.project_id} className="py-3 text-center">
                        {proj.has_analysis ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-base font-extrabold ${isBest ? 'text-emerald-400' : 'text-slate-100'}`}>
                              {proj.overall_score.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{proj.score_band}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">Not Analyzed</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Sub-scores */}
                {chartMetrics.filter(m => m.key !== 'overall').map(({ key, label }) => {
                  const bestIdx = getBestScoreIdx(key, true);

                  return (
                    <tr key={key} className="hover:bg-[#13132a]/40 transition-colors">
                      <td className="py-2.5 text-slate-300 font-medium">{label}</td>
                      {comparedData.map((proj, idx) => {
                        const isBest = bestIdx === idx && proj.has_analysis;
                        const val = proj.has_analysis && proj.scores ? proj.scores[key] : null;

                        return (
                          <td key={proj.project_id} className="py-2.5 text-center">
                            {val !== null && val !== undefined ? (
                              <span className={`font-semibold ${isBest ? 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded' : 'text-slate-300'}`}>
                                {val.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Section Header: Telemetry & Repository Facts */}
                <tr className="bg-[#121327]">
                  <td colSpan={comparedData.length + 1} className="py-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Repository Telemetry Facts
                  </td>
                </tr>

                {/* Total Lines of Code */}
                <tr>
                  <td className="py-2.5 text-slate-300">Total Lines of Code (LOC)</td>
                  {comparedData.map((proj) => (
                    <td key={proj.project_id} className="py-2.5 text-center text-slate-300">
                      {proj.has_analysis && proj.metrics?.total_loc ? proj.metrics.total_loc.toLocaleString() : '—'}
                    </td>
                  ))}
                </tr>

                {/* Code LOC */}
                <tr>
                  <td className="py-2.5 text-slate-300">Code LOC</td>
                  {comparedData.map((proj) => (
                    <td key={proj.project_id} className="py-2.5 text-center text-slate-300">
                      {proj.has_analysis && proj.metrics?.code_loc ? proj.metrics.code_loc.toLocaleString() : '—'}
                    </td>
                  ))}
                </tr>

                {/* Source Files */}
                <tr>
                  <td className="py-2.5 text-slate-300">Source Files</td>
                  {comparedData.map((proj) => (
                    <td key={proj.project_id} className="py-2.5 text-center text-slate-300">
                      {proj.has_analysis && proj.metrics ? `${proj.metrics.source_files} / ${proj.metrics.total_files}` : '—'}
                    </td>
                  ))}
                </tr>

                {/* Architectural Pattern */}
                <tr>
                  <td className="py-2.5 text-slate-300">Architectural Pattern</td>
                  {comparedData.map((proj) => (
                    <td key={proj.project_id} className="py-2.5 text-center text-slate-300">
                      {proj.has_analysis && proj.metrics?.detected_pattern ? (
                        <span className="text-xs bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded font-mono">
                          {proj.metrics.detected_pattern}
                        </span>
                      ) : '—'}
                    </td>
                  ))}
                </tr>

                {/* Security Findings */}
                <tr>
                  <td className="py-2.5 text-slate-300">Security Findings</td>
                  {comparedData.map((proj, idx) => {
                    const bestIdx = getBestScoreIdx('security_findings_count', false);
                    const isBest = bestIdx === idx && proj.has_analysis;
                    const count = proj.has_analysis ? proj.metrics?.security_findings_count : null;

                    return (
                      <td key={proj.project_id} className="py-2.5 text-center">
                        {count !== null && count !== undefined ? (
                          <span className={`font-semibold ${count === 0 ? 'text-emerald-400' : 'text-amber-400'} ${isBest ? 'underline' : ''}`}>
                            {count} issue(s)
                          </span>
                        ) : '—'}
                      </td>
                    );
                  })}
                </tr>

                {/* Total Commits */}
                <tr>
                  <td className="py-2.5 text-slate-300">Total Git Commits</td>
                  {comparedData.map((proj) => (
                    <td key={proj.project_id} className="py-2.5 text-center text-slate-300">
                      {proj.has_analysis && proj.metrics?.total_commits ? proj.metrics.total_commits : '—'}
                    </td>
                  ))}
                </tr>

                {/* Dependency Count */}
                <tr>
                  <td className="py-2.5 text-slate-300">Declared Dependencies</td>
                  {comparedData.map((proj) => (
                    <td key={proj.project_id} className="py-2.5 text-center text-slate-300">
                      {proj.has_analysis && proj.metrics?.dependency_count !== undefined ? proj.metrics.dependency_count : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
