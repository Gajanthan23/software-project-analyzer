/**
 * pages/ComparePage.jsx — /compare
 * Phase 2: placeholder. Real data: Phase 22 (project comparison).
 *
 * Will display (Section 25):
 *   HEURISTIC — Side-by-side score comparison for 2+ projects
 *   HEURISTIC — Recharts radar / bar chart
 */
export default function ComparePage() {
  const metrics = ['Complexity', 'Quality', 'Testing', 'Security', 'Architecture', 'Overall']

  return (
    <div className="space-y-8 pt-8 animate-slide-up">
      <div>
        <h1 className="page-title">Project Comparison</h1>
        <p className="page-subtitle">
          Compare engineering scores across two or more analyzed projects
        </p>
      </div>

      {/* Project selectors */}
      <div className="grid gap-4 sm:grid-cols-2">
        {['Project A', 'Project B'].map((label) => (
          <div key={label} className="card">
            <p className="text-xs text-slate-500 mb-2">{label}</p>
            <select
              className="input text-sm"
              disabled
              title="Available after Phase 22"
            >
              <option>Select a project — Phase 22</option>
            </select>
          </div>
        ))}
      </div>

      {/* Comparison table skeleton */}
      <div className="card overflow-hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Score Comparison
          <span className="ml-2 text-slate-700">HEURISTIC · Phase 22</span>
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e3a]">
              <th className="pb-2 text-left text-xs font-medium text-slate-500">Metric</th>
              <th className="pb-2 text-center text-xs font-medium text-indigo-400">Project A</th>
              <th className="pb-2 text-center text-xs font-medium text-violet-400">Project B</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e3a]">
            {metrics.map((m) => (
              <tr key={m} className="opacity-30">
                <td className="py-2.5 text-slate-400">{m}</td>
                <td className="py-2.5 text-center font-bold text-slate-600">—</td>
                <td className="py-2.5 text-center font-bold text-slate-600">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="placeholder-panel">
        <span className="text-3xl">⚖</span>
        <p className="mt-3 text-sm font-medium text-slate-400">
          Select two analyzed projects to compare
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Radar chart comparison in <strong className="text-slate-500">Phase 22</strong>
        </p>
      </div>
    </div>
  )
}
