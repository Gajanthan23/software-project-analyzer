/**
 * components/Layout/ProjectLayout.jsx
 *
 * Layout for all /projects/:id/* sub-pages.
 * Renders the fixed Navbar + the 240px left Sidebar + the main content area.
 * On screens < lg the sidebar is hidden (mobile-friendly expansion comes later).
 */

import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'
import Sidebar from '../Sidebar'

export default function ProjectLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-bg)' }}>
      <Navbar />
      <Sidebar />

      {/* Content: offset by navbar (top) and sidebar (left on lg+) */}
      <main className="pt-16 lg:pl-60 animate-fade-in">
        <div className="px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
