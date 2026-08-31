/**
 * pages/ArchitecturePage.jsx — /projects/:id/architecture
 * Phase 2: placeholder shell. Real data: Phase 16.
 *
 * Will display (Section 16):
 *   HEURISTIC — Detected pattern (Layered / MVC / Modular …)
 *   HEURISTIC — Confidence % (heuristic/probabilistic, not absolute)
 *   HEURISTIC — Dependency graph visualization
 *   HEURISTIC — Architectural findings / anti-patterns
 */
export default function ArchitecturePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Architecture Analysis</h1>
        <p className="page-subtitle">
          Detected patterns, dependency relationships, and structural findings
        </p>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10
                      px-4 py-3 text-xs text-indigo-300">
        ℹ Architecture detection is <strong>HEURISTIC</strong> — probabilistic,
        not absolute. Confidence scores reflect pattern matching, not ground truth (Section 16).
      </div>

      {/* Detected pattern card */}
      <div className="card border-indigo-500/20 text-center py-10">
        <span className="badge ring-1 bg-amber-500/15 text-amber-300 ring-amber-500/30">
          HEURISTIC
        </span>
        <p className="mt-4 text-sm text-slate-400">Detected Architecture</p>
        <p className="mt-2 text-3xl font-bold text-slate-600">—</p>
        <p className="mt-1 text-xs text-slate-600">
          Confidence: — %  ·  Available in Phase 16
        </p>
      </div>

      {/* Dependency graph placeholder */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Dependency Relationships
        </p>
        <div className="flex h-56 items-center justify-center rounded-lg
                        border border-dashed border-[#1e1e3a]">
          <span className="text-xs text-slate-600">
            Dependency graph visualization — Phase 16
          </span>
        </div>
      </div>

      <div className="placeholder-panel">
        <span className="text-3xl">⬡</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Architectural findings and anti-pattern detection here
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Populated in <strong className="text-slate-500">Phase 16</strong>
        </p>
      </div>
    </div>
  )
}
