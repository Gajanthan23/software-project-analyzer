/**
 * pages/ArchitecturePage.jsx
 *
 * Heuristic Architecture Pattern & Layering Violation Analyzer Dashboard — Phase 20
 * Explicitly labeled as HEURISTIC (Rule 16 & Section 42).
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#3b82f6'];

export default function ArchitecturePage() {
  const { id } = useParams();
  const [architecture, setArchitecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getLatestArchitecture(id);
      setArchitecture(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No architecture analysis found. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">⬡</div>
        <p className="mt-4 text-sm text-slate-400">Heuristically scanning folder hierarchy & layer import boundaries...</p>
      </div>
    );
  }

  if (error || !architecture) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error || 'No architecture data available.'}</p>
      </div>
    );
  }

  const detectedLayers = architecture.detected_layers || [];
  const problems = architecture.architectural_problems || [];
  const confidence = architecture.confidence_score || 0;
  const summary = architecture.structural_summary || {};
  const topFolders = summary.top_folders || [];

  // Build PieChart data from structural_summary.top_folders or detected_layers
  let chartData = [];
  if (Array.isArray(topFolders) && topFolders.length > 0) {
    chartData = topFolders.map(([folder, count]) => {
      const parts = folder.split('/');
      const shortName = parts.length > 2 ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}` : parts[parts.length - 1] || folder;
      return {
        name: shortName,
        value: typeof count === 'number' ? count : parseInt(count, 10) || 0
      };
    });
  } else if (typeof detectedLayers === 'object' && !Array.isArray(detectedLayers)) {
    chartData = Object.entries(detectedLayers).map(([layer, count]) => ({
      name: layer,
      value: typeof count === 'number' ? count : parseInt(count, 10) || 1
    }));
  } else if (Array.isArray(detectedLayers) && detectedLayers.length > 0) {
    chartData = detectedLayers.map((layer) => ({
      name: String(layer),
      value: 1
    }));
  }

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>⬡ Architecture & Pattern Analysis</span>
            <AnalysisTypeBadge type="heuristic" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Folder structure conventions & cross-layer import boundary analysis (Section 16 & Section 42)
          </p>
        </div>
        <span className="badge bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30 text-xs font-bold uppercase">
          HEURISTIC PATTERN DETECTOR
        </span>
      </div>

      {/* Detected Architecture Card */}
      <div className="card flex flex-col md:flex-row items-center justify-between gap-6 py-6 px-8 border-indigo-500/30 glow-indigo">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <AnalysisTypeBadge type="heuristic" />
            <span className="text-xs text-slate-500">Classification: {architecture.classification || 'HEURISTIC'}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-100">{architecture.detected_pattern || 'Flat / Unstructured'}</h2>
          <p className="text-xs text-slate-400 max-w-md">
            {typeof architecture.analysis_notes === 'string'
              ? architecture.analysis_notes
              : 'Pattern inferred from directory naming conventions.'}
          </p>

          {/* Detected Layer Badges */}
          {Array.isArray(detectedLayers) && detectedLayers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2">
              <span className="text-[11px] text-slate-500 font-bold uppercase mr-1">Detected Layers:</span>
              {detectedLayers.map((layer, idx) => (
                <span key={idx} className="badge bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 text-[10px] font-bold">
                  📁 {layer}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-black text-indigo-400">{confidence}%</div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Confidence Score</span>
          </div>

          <div className="text-center border-l border-[#1e1e3a] pl-6">
            <div className="text-3xl font-bold text-red-400">{architecture.layer_violations_count || problems.length || 0}</div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Layer Violations</span>
          </div>
        </div>
      </div>

      {/* Layer Distribution & Architectural Problems */}
      <div className="grid gap-6 md:grid-cols-2">

        {/* Layer Breakdown Chart */}
        <div className="card border-indigo-500/20">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
            <span>Top Directory Source File Breakdown</span>
            <AnalysisTypeBadge type="heuristic" />
          </h2>

          {chartData.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No explicit architectural layers detected in folder hierarchy.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Architectural Problems & Layering Violations */}
        <div className="card">
          <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
            <span>Architectural Problems & Anti-Patterns ({problems.length})</span>
            <AnalysisTypeBadge type="heuristic" />
          </h2>

          {problems.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-3xl">🏛️</span>
              <p className="mt-3 text-xs font-semibold text-emerald-400">Clean architectural boundaries! No layering violations detected.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {problems.map((prob, i) => (
                <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>⚠</span>
                      <span>{prob.type || 'Architectural Violation'}</span>
                    </span>
                    {prob.file && (
                      <span className="font-mono text-[10px] text-red-400">
                        {prob.file}:{prob.line || 1}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 mt-1 leading-relaxed">{prob.description || prob.message || prob}</p>
                  {prob.recommendation && (
                    <p className="mt-2 text-[11px] text-indigo-300 font-semibold">
                      💡 {prob.recommendation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
