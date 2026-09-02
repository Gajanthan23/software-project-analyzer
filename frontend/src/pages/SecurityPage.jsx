/**
 * pages/SecurityPage.jsx
 *
 * Static Security Analysis & Vulnerability Findings Dashboard — Phase 20
 * Powered by TruffleHog secret scanning & Semgrep rule pattern engine (Phase 15).
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

const SEVERITY_COLORS = {
  Critical: 'bg-red-500/20 text-red-300 ring-red-500/40 border-red-500/30',
  High:     'bg-amber-500/20 text-amber-300 ring-amber-500/40 border-amber-500/30',
  Medium:   'bg-indigo-500/20 text-indigo-300 ring-indigo-500/40 border-indigo-500/30',
  Low:      'bg-slate-800 text-slate-300 ring-slate-700 border-slate-700',
};

export default function SecurityPage() {
  const { id } = useParams();
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getLatestSecurity(id);
      setSecurity(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No security analysis found. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">⚿</div>
        <p className="mt-4 text-sm text-slate-400">Running static security pattern scanning & entropy check...</p>
      </div>
    );
  }

  if (error || !security) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error || 'No security data available.'}</p>
      </div>
    );
  }

  const findings = security.findings || [];
  const counts = security.severity_counts || {};

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>⚿ Security Analysis & Secret Scanning</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Hardcoded credentials, dangerous functions, and SQL injection patterns (Section 15 Rule 15)
          </p>
        </div>
        <span className={`badge ${findings.length > 0 ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'} text-xs font-bold`}>
          {findings.length} POTENTIAL ISSUES DETECTED
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total Findings</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{security.total_findings || 0}</p>
          <span className="text-[10px] text-slate-600">Static AST issues</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Critical</span>
          <p className="mt-2 text-3xl font-extrabold text-red-500">{counts.Critical || 0}</p>
          <span className="text-[10px] text-slate-600">Immediate action</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">High</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{counts.High || 0}</p>
          <span className="text-[10px] text-slate-600">High priority</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Medium</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{counts.Medium || 0}</p>
          <span className="text-[10px] text-slate-600">Medium priority</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Low</span>
          <p className="mt-2 text-3xl font-extrabold text-slate-400">{counts.Low || 0}</p>
          <span className="text-[10px] text-slate-600">Best practice</span>
        </div>
      </div>

      {/* Security Findings List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span>Security Findings Report ({findings.length})</span>
          <span className="text-xs text-slate-500">Every finding is titled "Potential security issue..." per Section 15</span>
        </h2>

        {findings.length === 0 ? (
          <div className="card py-10 text-center border-emerald-500/30 bg-emerald-500/10">
            <span className="text-3xl">🛡️</span>
            <p className="mt-2 text-sm font-semibold text-emerald-300">No static security vulnerabilities detected!</p>
            <p className="mt-1 text-xs text-emerald-400/70">No hardcoded API secrets, dangerous eval/exec calls, or SQL injections found.</p>
          </div>
        ) : (
          findings.map((f, i) => (
            <div key={i} className="card border-l-4 border-l-amber-500 hover:border-amber-500/60 transition-all">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ring-1 text-[10px] font-bold uppercase ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.Low}`}>
                      {f.severity}
                    </span>
                    <span className="badge bg-slate-800 text-slate-400 ring-1 ring-slate-700 text-[10px]">
                      {f.category}
                    </span>
                    <span className="text-xs font-mono text-indigo-400">
                      {f.file_path}:{f.line_number}
                    </span>
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-100">{f.title}</h3>
                </div>

                <span className="text-xs font-mono text-slate-500">
                  Rule ID: <code>{f.rule_id}</code>
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-300 leading-relaxed">{f.description}</p>

              {f.recommendation && (
                <div className="mt-3 rounded-md bg-[#0a0a16] border border-[#1e1e3a] p-3 text-xs text-indigo-300">
                  <strong className="text-indigo-400">💡 Recommendation: </strong>
                  {f.recommendation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
}
