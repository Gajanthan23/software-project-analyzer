/**
 * pages/TestingPage.jsx — /projects/:id/testing
 * Phase 2: placeholder shell. Real data: Phase 12 (testing analysis).
 *
 * Will display (Section 12):
 *   FACT — Test files count, test LOC, test-to-source ratio
 *   FACT — Detected test frameworks
 *   FACT — Coverage % when a coverage report is present
 *   NOTE — "Coverage data unavailable" shown when no report found
 *          (never estimated — Section 12 rule)
 */
export default function TestingPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Testing Analysis</h1>
        <p className="page-subtitle">
          Test files, frameworks, coverage, and testing quality indicators
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Test files',           hint: 'FACT — Phase 12' },
          { label: 'Test LOC',             hint: 'FACT — Phase 12' },
          { label: 'Test/source ratio',    hint: 'FACT — Phase 12' },
          { label: 'Testing score',        hint: 'HEURISTIC — Phase 18' },
        ].map(({ label, hint }) => (
          <div key={label} className="card">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-600">—</p>
            <p className="mt-1 text-[10px] text-slate-700">{hint}</p>
          </div>
        ))}
      </div>

      {/* Coverage — shows real data OR explicit "unavailable" — never estimated */}
      <div className="card border-amber-500/20">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-300">Code Coverage</p>
          <span className="badge ring-1 bg-emerald-500/15 text-emerald-300 ring-emerald-500/30">
            FACT
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-600">—</p>
        <p className="mt-1 text-xs text-amber-400/80">
          ⚠ If no coverage report is found, this will display
          &quot;Coverage data unavailable&quot; — never estimated (Section 12)
        </p>
      </div>

      <div className="placeholder-panel">
        <span className="text-3xl">✓</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Test framework detection and test file breakdown here
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Populated in <strong className="text-slate-500">Phase 12</strong>
        </p>
      </div>
    </div>
  )
}
