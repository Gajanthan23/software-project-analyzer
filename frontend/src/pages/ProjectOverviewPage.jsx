/**
 * pages/ProjectOverviewPage.jsx
 *
 * Overall project overview dashboard & analysis trigger controller.
 * Displays real scores, category sub-scores, telemetry metrics, and analysis run status.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

export default function ProjectOverviewPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [latestData, setLatestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState(null); // null | 'queued' | 'running' | 'completed' | 'failed'
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch project details and latest analysis metrics in parallel
      const proj = await projectService.getProjectById(id);
      setProject(proj);

      try {
        const metricsData = await projectService.getLatestMetrics(id);
        setLatestData(metricsData);
      } catch (err) {
        // No analysis completed yet
        setLatestData(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    try {
      setAnalyzing(true);
      setAnalysisStatus('running');
      setError(null);

      const res = await projectService.triggerAnalysis(id);
      setAnalysisStatus('completed');
      
      // Reload page data to render updated scores & metrics
      await loadData();
    } catch (err) {
      setAnalysisStatus('failed');
      setError(err.response?.data?.message || 'Analysis failed. Please check repository access.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">⚡</div>
        <p className="mt-4 text-sm text-slate-400">Loading project telemetry & quality scores...</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error}</p>
      </div>
    );
  }

  const scores = latestData?.scores;
  const metrics = latestData?.metrics;
  const repository = latestData?.repository;
  const security = latestData?.security;
  const testing = latestData?.testing;
  const architecture = latestData?.architecture;

  return (
    <div className="space-y-8 animate-slide-up">

      {/* ── Status Banner (Section 32) ────────────────────────────────────── */}
      {analysisStatus === 'running' && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="animate-spin text-lg">⚡</span>
            <span className="text-sm font-medium text-indigo-300">
              Analysis pipeline active: Parsing AST, calculating metrics, scanning security & computing quality scores...
            </span>
          </div>
          <span className="badge bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 text-xs">
            STATUS: RUNNING
          </span>
        </div>
      )}

      {analysisStatus === 'failed' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300 flex items-center justify-between">
          <span>⚠ Analysis run failed: {error}</span>
          <span className="badge bg-red-500/20 text-red-300">STATUS: FAILED</span>
        </div>
      )}

      {/* ── Project Header ────────────────────────────────────────────────── */}
      <div className="card border-indigo-500/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 text-xs">
                {project.owner}
              </span>
              <AnalysisTypeBadge type="fact" />
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-100">{project.name}</h1>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">{project.description || 'No description provided.'}</p>
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              🔗 {project.repo_url} ↗
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="card-elevated text-center py-2 px-3">
                <span className="text-[10px] uppercase text-slate-500">Stars</span>
                <p className="text-base font-bold text-amber-400">⭐ {project.stars_count}</p>
              </div>
              <div className="card-elevated text-center py-2 px-3">
                <span className="text-[10px] uppercase text-slate-500">Forks</span>
                <p className="text-base font-bold text-indigo-400">🍴 {project.forks_count}</p>
              </div>
            </div>

            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 shadow-lg shadow-indigo-500/25"
            >
              {analyzing ? (
                <>
                  <span className="animate-spin">⚡</span>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>⚡</span>
                  {scores ? 'Re-run Analysis' : 'Run Full Analysis'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Language Breakdown */}
        {project.languages && Object.keys(project.languages).length > 0 && (
          <div className="mt-6 border-t border-[#1e1e3a] pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Languages <span className="text-[10px] text-slate-600">(FACT — GitHub API)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(project.languages).map(([lang, bytes]) => (
                <span key={lang} className="badge bg-slate-800 text-slate-300 ring-1 ring-slate-700 px-3 py-1 text-xs">
                  {lang}: <strong className="text-indigo-400 ml-1">{bytes.toLocaleString()} bytes</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Overall Quality Score Card ────────────────────────────────────── */}
      {scores ? (
        <div className="card flex flex-col md:flex-row items-center justify-between gap-6 py-8 px-8 border-indigo-500/30 glow-indigo bg-gradient-to-r from-[#0d0d24] via-[#111130] to-[#0d0d24]">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <AnalysisTypeBadge type="heuristic" />
              <span className="text-xs text-slate-500">Section 18 Quality Scoring Methodology</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">Overall Software Quality Score</h2>
            <p className="text-xs text-slate-400 max-w-md">
              Weighted calculation: Code Quality (25%), Maintainability (20%), Architecture (20%), Testing (15%), Security (10%), Documentation (10%).
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-6xl font-black gradient-text tracking-tight">
                {scores.overall_score}
              </div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Out of 100</span>
            </div>

            <div className="flex flex-col gap-2">
              <span className="badge ring-1 bg-indigo-500/20 text-indigo-300 ring-indigo-500/40 text-sm px-4 py-1.5 font-bold uppercase tracking-wider">
                {scores.score_band}
              </span>
              <span className="text-[10px] text-slate-500 text-center">
                Score Band Classification
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="placeholder-panel py-10">
          <div className="text-4xl">📊</div>
          <p className="mt-3 text-sm font-semibold text-slate-300">No analysis data available yet</p>
          <p className="mt-1 text-xs text-slate-500">Click "Run Full Analysis" above to trigger static code parsing & multi-dimensional scoring.</p>
        </div>
      )}

      {/* ── Category Sub-Scores Grid ──────────────────────────────────────── */}
      {scores && scores.sub_scores && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Quality Sub-Scores Breakdown
            </h2>
            <AnalysisTypeBadge type="heuristic" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: 'code_quality',   label: 'Code Quality',   weight: '25%', icon: '✦', link: 'quality',      score: scores.sub_scores.code_quality },
              { key: 'maintainability',label: 'Maintainability',weight: '20%', icon: '⚡', link: 'complexity',   score: scores.sub_scores.maintainability },
              { key: 'architecture',   label: 'Architecture',   weight: '20%', icon: '⬡', link: 'architecture', score: scores.sub_scores.architecture },
              { key: 'testing',        label: 'Testing Suite',  weight: '15%', icon: '✓', link: 'testing',      score: scores.sub_scores.testing },
              { key: 'security',       label: 'Security',       weight: '10%', icon: '⚿', link: 'security',     score: scores.sub_scores.security },
              { key: 'documentation',  label: 'Documentation',  weight: '10%', icon: '📄', link: 'quality',      score: scores.sub_scores.documentation },
            ].map(({ key, label, weight, icon, link, score }) => {
              const val = floatVal(score);
              const color = val >= 75 ? 'from-emerald-500 to-emerald-400' : val >= 60 ? 'from-indigo-500 to-indigo-400' : val >= 40 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400';

              return (
                <Link
                  key={key}
                  to={`/projects/${id}/${link}`}
                  className="card group hover:border-indigo-500/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{icon}</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">{label}</h3>
                        <span className="text-[10px] text-slate-500">Weight: {weight}</span>
                      </div>
                    </div>
                    <span className="text-2xl font-extrabold text-slate-100">{val}</span>
                  </div>

                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-[#1e1e3a] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Key Repository Facts Telemetry Grid ───────────────────────────── */}
      {metrics && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Repository Telemetry Facts
            </h2>
            <AnalysisTypeBadge type="fact" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Total Lines of Code</span>
              <p className="mt-2 text-2xl font-bold text-indigo-400">{metrics.total_loc?.toLocaleString() || 0}</p>
              <span className="text-[10px] text-slate-600">Code: {metrics.code_loc?.toLocaleString() || 0}</span>
            </div>

            <div className="card">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Source Files</span>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{repository?.source_files || 0}</p>
              <span className="text-[10px] text-slate-600">Total: {repository?.total_files || 0}</span>
            </div>

            <div className="card">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Security Findings</span>
              <p className="mt-2 text-2xl font-bold text-amber-400">{security?.total_findings || 0}</p>
              <span className="text-[10px] text-slate-600">Static Scan Issues</span>
            </div>

            <div className="card">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Architectural Pattern</span>
              <p className="mt-2 text-lg font-bold text-violet-400 truncate">{architecture?.detected_pattern || 'Flat'}</p>
              <span className="text-[10px] text-slate-600">Confidence: {architecture?.confidence_score || 0}%</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function floatVal(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val) || 0.0;
  return 0.0;
}
