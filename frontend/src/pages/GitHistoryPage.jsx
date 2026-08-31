/**
 * pages/GitHistoryPage.jsx — /projects/:id/git-history
 * Phase 2: placeholder shell. Real data: Phase 17.
 *
 * Will display (Section 17):
 *   FACT — Total commits, contributors, repo age
 *   FACT — Commit frequency / recent activity
 *   FACT — Activity timeline chart (Recharts)
 *   FACT — Branches, PRs, issues (from GitHub API)
 */
export default function GitHistoryPage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="page-title">Git History</h1>
        <p className="page-subtitle">
          Commit activity, contributors, and repository evolution over time
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total commits',    hint: 'FACT — GitHub API' },
          { label: 'Contributors',     hint: 'FACT — GitHub API' },
          { label: 'Repository age',   hint: 'FACT — GitHub API' },
          { label: 'Commits / month',  hint: 'FACT — GitHub API' },
        ].map(({ label, hint }) => (
          <div key={label} className="card">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-600">—</p>
            <p className="mt-1 text-[10px] text-slate-700">{hint}</p>
          </div>
        ))}
      </div>

      {/* Activity timeline */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Commit Activity Timeline
          <span className="ml-2 text-[10px] text-slate-700">FACT — Recharts, Phase 17</span>
        </p>
        <div className="flex h-48 items-center justify-center rounded-lg
                        border border-dashed border-[#1e1e3a]">
          <span className="text-xs text-slate-600">Timeline chart renders in Phase 17</span>
        </div>
      </div>

      <div className="placeholder-panel">
        <span className="text-3xl">⑃</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Contributor breakdown and branch information here
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Populated in <strong className="text-slate-500">Phase 17</strong>
        </p>
      </div>
    </div>
  )
}
