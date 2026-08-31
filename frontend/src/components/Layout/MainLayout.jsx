/**
 * components/Layout/MainLayout.jsx
 *
 * Wraps all authenticated top-level pages: Dashboard, History, Compare.
 * Renders the fixed Navbar + a scrollable content area below it.
 */

import { Outlet } from 'react-router-dom'
import Navbar from '../Navbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-bg)' }}>
      <Navbar />
      {/* pt-16 offsets the fixed 64px navbar */}
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-12 animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
