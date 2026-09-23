/**
 * pages/TestingPage.jsx
 *
 * Automated Test Suite & Coverage Dashboard
 * Powered by test structure scanner & coverage report parser.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { projectService } from '../services/projectService';
import AnalysisTypeBadge from '../components/AnalysisTypeBadge';

export default function TestingPage() {
  const { id } = useParams();
  const [testing, setTesting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await projectService.getLatestTesting(id);
      setTesting(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No testing analysis found. Please run an analysis first.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="placeholder-panel py-20 animate-pulse">
        <div className="text-4xl">✓</div>
        <p className="mt-4 text-sm text-slate-400">Scanning repository test files & coverage reports...</p>
      </div>
    );
  }

  if (error || !testing) {
    return (
      <div className="placeholder-panel py-20 border-red-500/30 bg-red-500/10">
        <p className="text-sm font-semibold text-red-300">⚠ {error || 'No testing data available.'}</p>
      </div>
    );
  }

  const hasTests = testing.has_tests;
  const testRatio = (floatVal(testing.test_to_source_file_ratio) * 100).toFixed(1);
  const frameworks = testing.test_frameworks || [];

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            <span>✓ Testing Suite & Quality Assurance</span>
            <AnalysisTypeBadge type="fact" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Test directory structure, test-to-source file ratio, and coverage report inspection
          </p>
        </div>
        <span className={`badge ${hasTests ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30'} text-xs font-bold`}>
          {hasTests ? '✓ TEST SUITE DETECTED' : '⚠ NO TESTS DETECTED'}
        </span>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Test Suite Status</span>
          <p className={`mt-2 text-2xl font-bold ${hasTests ? 'text-emerald-400' : 'text-red-400'}`}>
            {hasTests ? 'Active' : 'Missing'}
          </p>
          <span className="text-[10px] text-slate-600">{hasTests ? 'Automated test suite present' : 'No test files found'}</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Test Files Count</span>
          <p className="mt-2 text-3xl font-extrabold text-indigo-400">{testing.test_files_count || 0}</p>
          <span className="text-[10px] text-slate-600">Source files: {testing.source_files_count || 0}</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Test-to-Source File Ratio</span>
          <p className="mt-2 text-3xl font-extrabold text-amber-400">{testRatio}%</p>
          <span className="text-[10px] text-slate-600">Benchmark: &gt; 20%</span>
        </div>

        <div className="card">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Code Coverage</span>
          <p className="mt-2 text-2xl font-bold text-slate-400">
            {testing.has_coverage_report ? `${testing.coverage_percentage}%` : 'Unavailable'}
          </p>
          <span className="text-[10px] text-slate-600">{testing.coverage_message || 'Coverage report unavailable'}</span>
        </div>
      </div>

      {/* Test Frameworks */}
      {frameworks.length > 0 && (
        <div className="card border-indigo-500/20">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
            Detected Test Frameworks & Utilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {frameworks.map((fw) => (
              <span key={fw} className="badge bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/30 px-3 py-1.5 text-xs font-bold">
                🧪 {fw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Test Files List */}
      <div className="card">
        <h2 className="text-sm font-bold text-slate-200 mb-4 flex items-center justify-between">
          <span>Detected Test Files ({testing.test_files?.length || 0})</span>
          <AnalysisTypeBadge type="fact" />
        </h2>

        {!testing.test_files || testing.test_files.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No test files detected in repository.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {testing.test_files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md border border-[#1e1e3a] bg-[#0a0a16] px-3 py-2 text-xs font-mono text-slate-300">
                <span className="text-emerald-400">✓</span>
                <span className="truncate">{file}</span>
              </div>
            ))}
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
