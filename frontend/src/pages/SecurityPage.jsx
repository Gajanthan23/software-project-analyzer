/**
 * pages/SecurityPage.jsx — /projects/:id/security
 * Phase 2: placeholder shell. Real data: Phase 15 (security analysis).
 *
 * Will display (Section 15):
 *   HEURISTIC — Security findings (bandit / semgrep output)
 *   HEURISTIC — Severity distribution: Critical / High / Medium / Low
 *   HEURISTIC — Per-finding: file, line, category, description, recommendation
 *
 * UI will clearly state: "Potential security issue" — NOT "Proven vulnerability"
 */

const severities = [
  { label: 'Critical', color: 'bg-red-500/20    text-red-300    ring-red-500/30'    },
  { label: 'High',     color: 'bg-orange-500/20 text-orange-300 ring-orange-500/30' },
  { label: 'Medium',   color: 'bg-amber-500/20  text-amber-300  ring-amber-500/30'  },
  { label: 'Low',      color: 'bg-blue-500/20   text-blue-300   ring-blue-500/30'   },
]

export default function SecurityPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Security Analysis</h1>
        <p className="page-subtitle">
          Static analysis findings — potential issues, not proven vulnerabilities
        </p>
      </div>

      {/* Disclaimer banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10
                      px-4 py-3 text-xs text-amber-300">
        ⚠ All findings are labelled <strong>HEURISTIC</strong>. Static analysis
        identifies <em>potential</em> security issues. Manual review is always required.
        This tool never claims to prove a vulnerability exists (Section 15).
      </div>

      {/* Severity summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {severities.map(({ label, color }) => (
          <div key={label} className="card text-center">
            <span className={`badge ring-1 ${color} mb-3`}>{label}</span>
            <p className="text-3xl font-bold text-slate-600">—</p>
            <p className="mt-1 text-[10px] text-slate-700">Phase 15+</p>
          </div>
        ))}
      </div>

      <div className="placeholder-panel">
        <span className="text-3xl">⚿</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Security findings table (file, line, category, severity) here
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Powered by bandit (Python) + semgrep in{' '}
          <strong className="text-slate-500">Phase 15</strong>
        </p>
      </div>
    </div>
  )
}
