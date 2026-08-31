/**
 * pages/ComplexityPage.jsx — /projects/:id/complexity
 * Phase 2: placeholder shell. Real data: Phase 10 (complexity analysis).
 *
 * Will display (Section 10):
 *   FACT  — Average / max cyclomatic complexity (radon / lizard)
 *   FACT  — Most complex functions table
 *   FACT  — Complexity distribution chart (Recharts histogram)
 *   FACT  — High-complexity file list
 */
export default function ComplexityPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Complexity Analysis</h1>
        <p className="page-subtitle">
          Cyclomatic complexity, function length, and hot-spot detection
        </p>
      </div>

      {/* Metric summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Avg. Complexity',      hint: 'FACT — radon/lizard' },
          { label: 'Max Complexity',       hint: 'FACT — radon/lizard' },
          { label: 'High-risk functions',  hint: 'FACT — complexity > 10' },
          { label: 'Complexity score',     hint: 'HEURISTIC — Phase 18' },
        ].map(({ label, hint }) => (
          <div key={label} className="card">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-600">—</p>
            <p className="mt-1 text-[10px] text-slate-700">{hint}</p>
          </div>
        ))}
      </div>

      {/* Most complex functions table */}
      <div className="placeholder-panel">
        <span className="text-3xl">⚡</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Most complex functions will appear here
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Populated in <strong className="text-slate-500">Phase 10</strong> using
          radon (Python) and lizard (multi-language) — no manual parsing
        </p>
      </div>

      {/* Complexity distribution chart placeholder */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Complexity Distribution
          <span className="ml-2 text-[10px] text-slate-700">
            FACT — Recharts histogram, Phase 10
          </span>
        </p>
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg
                        border border-dashed border-[#1e1e3a]">
          <span className="text-xs text-slate-600">Chart renders in Phase 10</span>
        </div>
      </div>
    </div>
  )
}
