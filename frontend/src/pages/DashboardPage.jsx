/**
 * pages/DashboardPage.jsx
 *
 * Main landing page after login.
 * Phase 2: static shell showing:
 *   - Hero section with repository URL input (no submit yet — Phase 6)
 *   - Stat cards (hardcoded zeros — real data Phase 6+)
 *   - Recent analyses table (empty — Phase 21)
 *
 * FACT / HEURISTIC / ML labels are already placed here so future phases
 * know exactly where each data type must be displayed (Section 42).
 */
import { Link } from 'react-router-dom'

// ── Stat card component (local, Phase 2 only) ─────────────────────────────
function StatCard({ label, value, note, accent = 'indigo' }) {
  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    violet: 'from-violet-500 to-violet-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber:  'from-amber-500 to-amber-600',
  }
  return (
    <div className="card group hover:border-indigo-500/40 transition-colors duration-200">
      <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className={`mt-2 bg-gradient-to-r ${colors[accent]} bg-clip-text
                     text-3xl font-bold text-transparent`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-600">{note}</p>}
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-10 pt-8 animate-slide-up">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section>
        <span className="badge bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30">
          Phase 6 — GitHub integration coming soon
        </span>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-100">
          Analyze any{' '}
          <span className="gradient-text">GitHub repository</span>
        </h1>
        <p className="mt-3 max-w-xl text-slate-400">
          Enter a public GitHub URL to receive a comprehensive report on
          complexity, code quality, testing, security, architecture, and more.
        </p>

        {/* Repository URL input — submit wired in Phase 6 */}
        <form
          className="mt-6 flex max-w-2xl gap-3"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            id="repo-url-input"
            type="url"
            placeholder="https://github.com/owner/repository"
            className="input flex-1 text-sm"
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            title="GitHub integration available in Phase 6"
          >
            ⚡ Analyze
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-600">
          Only public repositories are supported. Private repos require OAuth (planned).
        </p>
      </section>

      {/* ── Overview stats (FACT — populated Phase 6+) ───────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Your Overview
          <span className="ml-2 badge bg-slate-800 text-slate-500">FACT</span>
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Projects analyzed" value="0"   note="Phase 6+" accent="indigo" />
          <StatCard label="Analyses run"       value="0"   note="Phase 6+" accent="violet" />
          <StatCard label="Avg. overall score" value="—"   note="Phase 18+" accent="emerald" />
          <StatCard label="Findings detected"  value="—"   note="Phase 15+" accent="amber" />
        </div>
      </section>

      {/* ── Recent analyses (populated Phase 21) ─────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Recent Analyses
          </h2>
          <Link to="/history"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            View all →
          </Link>
        </div>

        <div className="placeholder-panel">
          <div className="text-4xl">📊</div>
          <p className="mt-4 text-sm font-medium text-slate-400">
            No analyses yet
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Enter a GitHub URL above to run your first analysis
            (available from Phase 6)
          </p>
        </div>
      </section>

      {/* ── Score band legend (Section 18) ───────────────────────────────── */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Score Bands <span className="text-slate-600">(project-defined — Section 18)</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            { range: '90–100', label: 'Excellent',         color: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30' },
            { range: '75–89',  label: 'Advanced',          color: 'bg-indigo-500/20  text-indigo-300  ring-indigo-500/30'  },
            { range: '60–74',  label: 'Proficient',        color: 'bg-blue-500/20    text-blue-300    ring-blue-500/30'    },
            { range: '40–59',  label: 'Developing',        color: 'bg-amber-500/20   text-amber-300   ring-amber-500/30'   },
            { range: '0–39',   label: 'Needs Improvement', color: 'bg-red-500/20     text-red-300     ring-red-500/30'     },
          ].map(({ range, label, color }) => (
            <span key={range}
                  className={`badge ring-1 ${color} px-3 py-1 text-xs`}>
              {range} — {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
