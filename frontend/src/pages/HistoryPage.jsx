/**
 * pages/HistoryPage.jsx — /history
 * Phase 2: placeholder. Real data: Phase 21 (analysis history).
 *
 * Will display (Section 26):
 *   FACT — All past analysis runs for this user
 *   FACT — Score trend chart per project over time
 */
export default function HistoryPage() {
  return (
    <div className="space-y-8 pt-8 animate-slide-up">
      <div>
        <h1 className="page-title">Analysis History</h1>
        <p className="page-subtitle">
          Track how your projects&apos; engineering quality has improved over time
        </p>
      </div>

      <div className="placeholder-panel">
        <span className="text-4xl">📈</span>
        <p className="mt-4 text-sm font-medium text-slate-400">
          No history yet
        </p>
        <p className="mt-1 text-xs text-slate-600 max-w-xs">
          Every analysis run is recorded. Score trends per project will appear
          here after <strong className="text-slate-500">Phase 21</strong>.
        </p>
      </div>

      {/* Score trend chart placeholder */}
      <div className="card">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Score Over Time — <span className="text-slate-700">FACT · Recharts · Phase 21</span>
        </p>
        <div className="flex h-56 items-center justify-center rounded-lg
                        border border-dashed border-[#1e1e3a]">
          <span className="text-xs text-slate-600">
            Score trend line chart renders in Phase 21
          </span>
        </div>
      </div>
    </div>
  )
}
