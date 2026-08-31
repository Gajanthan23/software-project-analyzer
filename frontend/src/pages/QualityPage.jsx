/**
 * pages/QualityPage.jsx — /projects/:id/quality
 * Phase 2: placeholder shell. Real data: Phases 11 (duplication) + 18 (score).
 *
 * Will display (Sections 11, 12):
 *   FACT      — Duplicated blocks, duplicated LOC, duplication %
 *   FACT      — Code organization metrics
 *   HEURISTIC — Maintainability score
 *   HEURISTIC — Quality findings
 */
export default function QualityPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Code Quality</h1>
        <p className="page-subtitle">
          Maintainability, duplication, and code organization
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Duplicated blocks',  hint: 'FACT — Phase 11'        },
          { label: 'Duplicated LOC',     hint: 'FACT — Phase 11'        },
          { label: 'Duplication ratio',  hint: 'FACT — Phase 11'        },
          { label: 'Maintainability',    hint: 'HEURISTIC — Phase 18'   },
          { label: 'Code quality score', hint: 'HEURISTIC — Phase 18'   },
          { label: 'Quality findings',   hint: 'HEURISTIC — Phase 19'   },
        ].map(({ label, hint }) => (
          <div key={label} className="card">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-600">—</p>
            <p className="mt-1 text-[10px] text-slate-700">{hint}</p>
          </div>
        ))}
      </div>

      <div className="placeholder-panel">
        <span className="text-3xl">✦</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Duplication hotspots and quality findings will appear here
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Populated in <strong className="text-slate-500">Phase 11</strong> —
          using established duplication-detection tools
        </p>
      </div>
    </div>
  )
}
