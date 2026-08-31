/**
 * components/Sidebar.jsx
 *
 * Left sidebar rendered inside ProjectLayout for all /projects/:id/* routes.
 * Shows the project name and sub-page navigation.
 * Phase 2: project name is a placeholder — real data comes in Phase 6+.
 */

import { NavLink, useParams } from 'react-router-dom'

const subPages = [
  {
    to: '',               // /projects/:id  (index)
    label: 'Overview',
    icon: '▣',
    description: 'Overall score & summary',
  },
  {
    to: 'complexity',
    label: 'Complexity',
    icon: '⚡',
    description: 'Cyclomatic complexity',
  },
  {
    to: 'quality',
    label: 'Code Quality',
    icon: '✦',
    description: 'Duplication & maintainability',
  },
  {
    to: 'testing',
    label: 'Testing',
    icon: '✓',
    description: 'Tests & coverage',
  },
  {
    to: 'security',
    label: 'Security',
    icon: '⚿',
    description: 'Security findings',
  },
  {
    to: 'architecture',
    label: 'Architecture',
    icon: '⬡',
    description: 'Patterns & structure',
  },
  {
    to: 'git-history',
    label: 'Git History',
    icon: '⑃',
    description: 'Commits & contributors',
  },
  {
    to: 'recommendations',
    label: 'Recommendations',
    icon: '→',
    description: 'Prioritised improvements',
  },
]

export default function Sidebar() {
  const { id } = useParams()

  return (
    <aside className="fixed left-0 top-16 hidden h-[calc(100vh-4rem)] w-60
                      flex-col border-r border-[#1e1e3a] bg-[#0a0a16] lg:flex">

      {/* Project identity header */}
      <div className="border-b border-[#1e1e3a] px-4 py-5">
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Project
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-100">
          {/* Real project name injected in Phase 6 */}
          project-{id}
        </p>
        {/* Score badge placeholder */}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 rounded-full bg-[#1e1e3a]">
            <div className="h-1.5 w-3/4 rounded-full bg-gradient-to-r
                            from-indigo-500 to-violet-500" />
          </div>
          <span className="text-xs font-bold text-indigo-400">—/100</span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {subPages.map(({ to, label, icon }) => {
          const fullPath = to
            ? `/projects/${id}/${to}`
            : `/projects/${id}`

          return (
            <NavLink
              key={label}
              to={fullPath}
              end={to === ''}     // only match exactly for the index route
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
                 transition-all duration-150 group
                 ${isActive
                   ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                   : 'text-slate-400 hover:bg-[#1e1e3a] hover:text-slate-200'
                 }`
              }
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1e1e3a] px-4 py-4">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2 text-xs text-slate-500
                     transition-colors hover:text-indigo-400"
        >
          ← Back to Dashboard
        </NavLink>
      </div>
    </aside>
  )
}
