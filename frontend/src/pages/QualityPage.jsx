/**
 * pages/QualityPage.jsx
 *
 * Code Quality & Duplication Analysis Dashboard — Phase 20
 * Powered by jscpd / line hash clone detection algorithm (Phase 11 engine).
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

export default function QualityPage() {
  const { id } = useParams();
  const [duplication, setDuplication] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dupData, mData] = await Promise.all([
        projectService.getLatestDuplication(id).catch(() => null),
        projectService.getLatestMetrics(id).then(res => res.metrics).catch(() => null)
      ]);
      setDuplication(dupData);
      setMetrics(mData);
    } catch (err) {
      setError(err.response?.data?.message || 'No code quality data available.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">✦</div>
        <p className="mt-4 text-sm text-slate-400">Loading Code Duplication & LOC Quality metrics...</p>
      </div>
    );
  }

  const dupPct = floatVal(duplication?.duplication_percentage);
  const codeLoc = metrics?.code_loc || 0;
  const commentLoc = metrics?.comment_loc || 0;
  const commentDensity = codeLoc > 0 ? ((commentLoc / (codeLoc + commentLoc)) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>✦ Code Quality & Duplication</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            LOC metrics, comment density, and duplicate block detection (Hash-based clone scanner)
          </p>
        </div>
        <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 text-xs">
          Duplication: {dupPct}%
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total Source LOC</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{metrics?.total_loc?.toLocaleString() || 0}</p>
          <span className="text-[10px] text-slate-600">Code: {codeLoc.toLocaleString()}</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Comment Density</span>
          <p className="mt-2 text-3xl font-extrabold text-emerald-400">{commentDensity}%</p>
          <span className="text-[10px] text-slate-600">Comments: {commentLoc.toLocaleString()} LOC</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Duplicated LOC</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{duplication?.duplicated_loc?.toLocaleString() || 0}</p>
          <span className="text-[10px] text-slate-600">Duplication Rate: {dupPct}%</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Duplicated Blocks</span>
          <p className="mt-2 text-3xl font-extrabold text-violet-400">{duplication?.duplicated_blocks || 0}</p>
          <span className="text-[10px] text-slate-600">Identical code clones</span>
        </div>
      </div>

      {/* Duplicated Files Table */}
      <div className="card">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Detected Code Clones & Duplicated Instances</span>
          <AnalysisTypeBadge type="fact" />
        </h2>

        {!duplication?.duplicate_instances || duplication.duplicate_instances.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-2xl">✨</span>
            <p className="mt-2 text-xs font-semibold text-emerald-400">Clean codebase! No significant duplicate code blocks detected.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-[#1e1e3a] bg-[#0a0a16] text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">First Instance</th>
                  <th className="py-3 px-4">Second Instance</th>
                  <th className="py-3 px-4 text-center">LOC Cloned</th>
                  <th className="py-3 px-4">Sample Snippet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e3a]">
                {duplication.duplicate_instances.map((inst, i) => (
                  <tr key={i} className="hover:bg-[#14142b] transition-colors">
                    <td className="py-3 px-4 font-mono text-indigo-300">
                      {inst.file_a} <span className="text-slate-500">(L{inst.start_line_a})</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-300">
                      {inst.file_b} <span className="text-slate-500">(L{inst.start_line_b})</span>
                    </td>
                    <td className="py-3 px-4 text-center font-extrabold text-slate-100">
                      {inst.lines || inst.duplicated_lines || 5}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      <code>{inst.snippet || 'identical logic block'}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function floatVal(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0.0;
  return 0.0;
}
