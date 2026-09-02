/**
 * pages/ComplexityPage.jsx
 *
 * Cyclomatic Complexity Analysis Dashboard — Phase 20
 * Powered by lizard AST parser (Phase 10 engine).
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ComplexityPage() {
  const { id } = useParams();
  const [complexity, setComplexity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getLatestComplexity(id);
      setComplexity(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No complexity analysis found. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">⚡</div>
        <p className="mt-4 text-sm text-slate-400">Loading Cyclomatic Complexity AST metrics...</p>
      </div>
    );
  }

  if (error || !complexity) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error || 'No complexity data available.'}</p>
      </div>
    );
  }

  const dist = complexity.complexity_distribution || {};
  const chartData = [
    { range: 'Low (1-5)',       count: dist['1_5'] || 0,   color: '#10b981' },
    { range: 'Moderate (6-10)', count: dist['6_10'] || 0,  color: '#6366f1' },
    { range: 'High (11-20)',    count: dist['11_20'] || 0, color: '#f59e0b' },
    { range: 'Very High (21+)', count: dist['21_plus'] || 0,color: '#ef4444' },
  ];

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>⚡ Cyclomatic Complexity</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Control flow decision point analysis (Lizard AST Engine)
          </p>
        </div>
        <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 text-xs">
          Threshold: &gt; {complexity.high_complexity_threshold || 10}
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total Functions</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{complexity.total_functions?.toLocaleString() || 0}</p>
          <span className="text-[10px] text-slate-600">Parsed across files</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Average Complexity</span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">{complexity.avg_complexity || 0.0}</p>
          <span className="text-[10px] text-slate-600">Optimal: &lt; 5.0</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Max Complexity</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{complexity.max_complexity || 0}</p>
          <span className="text-[10px] text-slate-600">Highest single function</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">High Complexity Functions</span>
          <p className="mt-2 text-3xl font-extrabold text-red-400">{complexity.high_complexity_count || 0}</p>
          <span className="text-[10px] text-slate-600">Complexity &gt; 10</span>
        </div>
      </div>

      {/* Complexity Distribution Chart (Recharts) */}
      <div className="card border-indigo-500/20">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Function Complexity Distribution Histogram</span>
          <AnalysisTypeBadge type="fact" />
        </h2>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <XAxis dataKey="range" stroke="#94a3b8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Complex Functions Table */}
      <div className="card">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Most Complex Functions (Ranked by Cyclomatic Complexity)</span>
          <span className="text-xs text-slate-500">Top {complexity.top_complex_functions?.length || 0}</span>
        </h2>

        {!complexity.top_complex_functions || complexity.top_complex_functions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No complex functions found exceeding threshold.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-[#1e1e3a] bg-[#0a0a16] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Function Name</th>
                  <th className="py-3 px-4">File Path</th>
                  <th className="py-3 px-4 text-center">Line</th>
                  <th className="py-3 px-4 text-right">Complexity</th>
                  <th className="py-3 px-4 text-center">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e3a]">
                {complexity.top_complex_functions.map((func, i) => {
                  const comp = func.cyclomatic_complexity || func.complexity || 0;
                  const isHigh = comp > 10;
                  return (
                    <tr key={i} className="hover:bg-[#14142b] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-300">{func.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{func.file_path}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{func.line_number || func.line}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-100">{comp}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`badge ${isHigh ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30' : 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30'}`}>
                          {isHigh ? 'HIGH RISK' : 'MODERATE'}
                        </span>
                      </td>
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
