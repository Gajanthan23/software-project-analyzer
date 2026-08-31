/**
 * pages/ProjectOverviewPage.jsx
 *
 * /projects/:id — overall project summary.
 * Shows the overall Engineering Score and all category scores.
 *
 * Phase 2: static placeholder shell.
 * Real data: Phase 6 (GitHub metadata) + Phase 18 (scoring engine).
 * FACT / HEURISTIC / ML labels per Section 42.
 */

const categories = [
  { label: 'Complexity',    phase: 10, type: 'FACT',      icon: '⚡', path: 'complexity'      },
  { label: 'Code Quality',  phase: 11, type: 'HEURISTIC', icon: '✦', path: 'quality'          },
  { label: 'Testing',       phase: 12, type: 'FACT',      icon: '✓', path: 'testing'          },
  { label: 'Security',      phase: 15, type: 'HEURISTIC', icon: '⚿', path: 'security'         },
  { label: 'Architecture',  phase: 16, type: 'HEURISTIC', icon: '⬡', path: 'architecture'     },
  { label: 'Documentation', phase: 13, type: 'HEURISTIC', icon: '📄', path: 'quality'         },
  { label: 'Git Activity',  phase: 17, type: 'FACT',      icon: '⑃', path: 'git-history'      },
]

const typeColors = {
  FACT:      'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  HEURISTIC: 'bg-amber-500/15  text-amber-300   ring-amber-500/30',
  PREDICTION:'bg-violet-500/15 text-violet-300  ring-violet-500/30',
}

export default function ProjectOverviewPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      {/* Page title */}
      <div>
        <h1 className="page-title">Project Overview</h1>
        <p className="page-subtitle">
          Overall engineering score and per-category breakdown
        </p>
      </div>

      {/* Overall score — HEURISTIC (weighted formula, Section 18) */}
      <div className="card flex flex-col items-center gap-4 py-12 text-center
                      border-indigo-500/20 glow-indigo">
        <span className="badge ring-1 bg-amber-500/15 text-amber-300 ring-amber-500/30">
          HEURISTIC — Section 18 scoring formula
        </span>
        <p className="text-sm font-medium text-slate-400">Overall Engineering Score</p>
        <div className="relative flex items-center justify-center">
          <span className="text-7xl font-extrabold gradient-text">—</span>
          <span className="ml-2 text-2xl text-slate-500">/100</span>
        </div>
        <p className="text-xs text-slate-600">Available after Phase 18</p>
      </div>

      {/* Category scores grid */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Category Scores
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ label, phase, type, icon }) => (
            <div key={label}
                 className="card group hover:border-indigo-500/40 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-sm font-semibold text-slate-200">{label}</span>
                </div>
                <span className={`badge ring-1 text-[10px] ${typeColors[type]}`}>
                  {type}
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-bold text-slate-600">—</span>
                <span className="text-xs text-slate-600">Phase {phase}+</span>
              </div>
              {/* Score bar placeholder */}
              <div className="mt-3 h-1.5 rounded-full bg-[#1e1e3a]" />
            </div>
          ))}
        </div>
      </div>

      {/* ML Prediction — Section 22 */}
      <div className="card border-violet-500/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Predicted Engineering Maturity
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              ML PREDICTION — model output, not an objective fact (Section 22)
            </p>
          </div>
          <span className="badge ring-1 bg-violet-500/15 text-violet-300 ring-violet-500/30">
            ML PREDICTION
          </span>
        </div>
        <p className="mt-4 text-2xl font-bold text-slate-600">—</p>
        <p className="mt-1 text-xs text-slate-600">Available after Phase 24 (ML component)</p>
      </div>
    </div>
  )
}
