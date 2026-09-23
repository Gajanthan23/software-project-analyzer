/**
 * pages/SecurityPage.jsx
 *
 * Static Security Analysis & Vulnerability Findings Dashboard
 * Powered by secret scanning & static security rule pattern engine.
 * Enhanced with user-friendly risk explanations, build artifact filters, and code remediations.
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

const CATEGORY_ICONS = {
  'Hardcoded Secret': '🔑',
  'Dangerous Function': '⚡',
  'SQL Injection': '🛡️',
  'Insecure Auth': '🔒',
  'Unsafe Configuration': '⚙️',
};

export default function SecurityPage() {
  const { id } = useParams();
  const [security, setSecurity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [hideArtifacts, setHideArtifacts] = useState(true);
  const [expandedGuidance, setExpandedGuidance] = useState({});

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

  const toggleGuidance = (index) => {
    setExpandedGuidance((prev) => ({ ...prev, [index]: !prev[index] }));
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

  const rawFindings = security.findings || [];
  const counts = security.severity_counts || {};

  // Check if a file path belongs to auto-generated build/test artifacts
  const checkIsArtifact = (f) => {
    if (typeof f.is_generated_artifact === 'boolean') return f.is_generated_artifact;
    const p = (f.file_path || f.file || '').toLowerCase();
    return (
      p.includes('playwright-report') ||
      p.includes('test-results') ||
      p.includes('coverage/') ||
      p.includes('dist/') ||
      p.includes('build/') ||
      p.includes('.next/')
    );
  };

  // Apply User Filters
  const filteredFindings = rawFindings.filter((f) => {
    const isArtifact = checkIsArtifact(f);
    if (hideArtifacts && isArtifact) return false;

    if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchFile = (f.file_path || f.file || '').toLowerCase().includes(q);
      const matchTitle = (f.title || '').toLowerCase().includes(q);
      const matchDesc = (f.description || '').toLowerCase().includes(q);
      if (!matchFile && !matchTitle && !matchDesc) return false;
    }

    return true;
  });

  const artifactCount = rawFindings.filter(checkIsArtifact).length;
  const categoriesList = Array.from(new Set(rawFindings.map((f) => f.category).filter(Boolean)));

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>⚿ Security Advisor & Vulnerability Analysis</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Hardcoded credentials, dangerous code execution, and static pattern security checks
          </p>
        </div>
        <span className={`badge ${rawFindings.length > 0 ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30'} text-xs font-bold`}>
          {filteredFindings.length} Active Findings
        </span>
      </div>

      {/* Beginner Guidance Callout */}
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-r from-[#0d0d26] to-[#121238] p-5 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-indigo-500/20 p-3 text-2xl">💡</div>
          <div>
            <h3 className="text-sm font-bold text-indigo-300">How to Understand Your Security Findings</h3>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Every finding flagged below is a <strong>potential security risk</strong> detected by static pattern analysis.
              Static scanners look for patterns like dynamic <code>eval()</code> calls or hardcoded secrets.
              {artifactCount > 0 && (
                <span> Auto-generated test reports (e.g. <code>playwright-report/</code>) can produce benign alerts — use the toggle below to focus on your core application code.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Total Findings</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{rawFindings.length}</p>
          <span className="text-[10px] text-slate-600">{rawFindings.length - artifactCount} in Source Code</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Critical</span>
          <p className="mt-2 text-3xl font-extrabold text-red-500">{counts.Critical || 0}</p>
          <span className="text-[10px] text-slate-600">Immediate action required</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">High</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{counts.High || 0}</p>
          <span className="text-[10px] text-slate-600">High priority refactoring</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Medium</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{counts.Medium || 0}</p>
          <span className="text-[10px] text-slate-600">Medium priority</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Low</span>
          <p className="mt-2 text-3xl font-extrabold text-slate-400">{counts.Low || 0}</p>
          <span className="text-[10px] text-slate-600">Best practice hygiene</span>
        </div>
      </div>

      {/* Interactive Controls & Filter Toolbar */}
      <div className="rounded-xl border border-[#1e1e3a] bg-[#0c0c1d] p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search findings by file, title, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[#1e1e3a] bg-[#14142b] px-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Generated Artifact Filter Toggle */}
          <button
            onClick={() => setHideArtifacts(!hideArtifacts)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
              hideArtifacts
                ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30'
                : 'border-[#1e1e3a] bg-[#14142b] text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{hideArtifacts ? '✓ Hiding Test & Build Reports' : '👁 Showing All Artifacts'}</span>
            {artifactCount > 0 && (
              <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] text-indigo-200">
                {artifactCount} hidden
              </span>
            )}
          </button>
        </div>

        {/* Severity & Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1e1e3a] pt-3 text-xs">
          
          {/* Severity Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Severity:</span>
            {['ALL', 'Critical', 'High', 'Medium', 'Low'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`rounded-md px-2.5 py-1 font-semibold text-[11px] transition-all ${
                  selectedSeverity === sev
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#14142b] text-slate-400 hover:bg-[#1a1a38] hover:text-slate-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          {categoriesList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Category:</span>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`rounded-md px-2.5 py-1 font-semibold text-[11px] transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#14142b] text-slate-400 hover:bg-[#1a1a38] hover:text-slate-200'
                }`}
              >
                ALL
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-md px-2.5 py-1 font-semibold text-[11px] transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-[#14142b] text-slate-400 hover:bg-[#1a1a38] hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Security Findings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200">
            Filtered Findings ({filteredFindings.length} of {rawFindings.length})
          </h2>
          {hideArtifacts && artifactCount > 0 && (
            <span className="text-xs text-slate-500">
              ({artifactCount} test/build report items hidden)
            </span>
          )}
        </div>

        {filteredFindings.length === 0 ? (
          <div className="card py-12 text-center border-emerald-500/30 bg-emerald-500/10">
            <span className="text-4xl">🛡️</span>
            <p className="mt-3 text-base font-semibold text-emerald-300">0 static security issues or hardcoded secrets detected in repository source files.</p>
            <p className="mt-1 text-xs text-emerald-400/70">
              {hideArtifacts
                ? 'All primary source code files are clean! (Click "Showing All Artifacts" above if you wish to inspect generated report files).'
                : 'No hardcoded secrets, dangerous eval execution, or SQL injections found.'}
            </p>
          </div>
        ) : (
          filteredFindings.map((f, i) => {
            const isArtifact = checkIsArtifact(f);
            const isExpanded = expandedGuidance[i];

            return (
              <div
                key={i}
                className={`card border-l-4 transition-all hover:shadow-lg ${
                  isArtifact
                    ? 'border-l-slate-600 opacity-80 hover:opacity-100'
                    : f.severity === 'Critical'
                    ? 'border-l-red-500 hover:border-red-400'
                    : f.severity === 'High'
                    ? 'border-l-amber-500 hover:border-amber-400'
                    : 'border-l-indigo-500 hover:border-indigo-400'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge ring-1 text-[10px] font-bold uppercase ${SEVERITY_COLORS[f.severity] || SEVERITY_COLORS.Low}`}>
                        {f.severity}
                      </span>
                      <span className="badge bg-slate-800 text-slate-300 ring-1 ring-slate-700 text-[10px] flex items-center gap-1">
                        <span>{CATEGORY_ICONS[f.category] || '🔍'}</span>
                        <span>{f.category}</span>
                      </span>

                      {/* File Source Type Badge */}
                      {isArtifact ? (
                        <span className="badge bg-slate-800/80 text-slate-400 ring-1 ring-slate-700 text-[10px]">
                          📦 Generated Test Artifact
                        </span>
                      ) : (
                        <span className="badge bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 text-[10px] font-bold">
                          📁 Source Code File
                        </span>
                      )}

                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {f.file_path || f.file}:{f.line_number || f.line}
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-base font-bold text-slate-100">{f.title}</h3>
                  </div>

                  <span className="text-xs font-mono text-slate-500">
                    Rule ID: <code className="text-slate-400">{f.rule_id}</code>
                  </span>
                </div>

                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{f.description}</p>

                {/* Plain-English Explanation Callout */}
                {f.explanation && (
                  <div className="mt-3 rounded-lg border border-indigo-500/20 bg-[#0a0a1a] p-3 text-xs text-indigo-200">
                    <span className="font-bold text-indigo-400">❓ Why this matters: </span>
                    {f.explanation}
                  </div>
                )}

                {/* Code Remediation Guide (Bad vs Good Code) */}
                <div className="mt-3">
                  <button
                    onClick={() => toggleGuidance(i)}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <span>{isExpanded ? '▼ Hide Code Fix Example' : '▶ How to Fix This (Code Example)'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 rounded-lg border border-[#1e1e3a] bg-[#070714] p-4 space-y-3">
                      
                      {/* Bad Code */}
                      <div>
                        <span className="text-[11px] font-bold text-red-400 flex items-center gap-1">
                          <span>❌ Insecure Code Pattern (Bad)</span>
                        </span>
                        <pre className="mt-1 rounded border border-red-500/20 bg-red-950/20 p-2.5 font-mono text-[11px] text-red-300 overflow-x-auto">
                          <code>{f.remediation_bad || f.recommendation || '// Insecure dynamic evaluation'}</code>
                        </pre>
                      </div>

                      {/* Good Code */}
                      <div>
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <span>✅ Secure Code Pattern (Good)</span>
                        </span>
                        <pre className="mt-1 rounded border border-emerald-500/20 bg-emerald-950/20 p-2.5 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                          <code>{f.remediation_good || '// Parameterized or sanitized implementation'}</code>
                        </pre>
                      </div>

                    </div>
                  )}
                </div>

                {/* Action Recommendation */}
                {f.recommendation && (
                  <div className="mt-3 rounded-md bg-[#0d0d22] border border-[#1e1e3a] p-3 text-xs text-slate-300">
                    <strong className="text-amber-400">🛠 Actionable Recommendation: </strong>
                    {f.recommendation}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
