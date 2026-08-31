/**
 * components/Layout/AuthLayout.jsx
 *
 * Full-screen centered layout for /login and /register.
 * No navbar — auth pages are standalone.
 * Background uses a radial gradient glow to give depth.
 */

import { Outlet, Link } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: 'var(--surface-bg)' }}
    >
      {/* Background glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px]
                        -translate-x-1/2 rounded-full
                        bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px]
                        rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Logo */}
      <Link
        to="/dashboard"
        className="relative mb-8 flex items-center gap-2.5 group"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl
                        bg-gradient-to-br from-indigo-500 to-violet-600
                        shadow-xl shadow-indigo-900/50
                        transition-transform duration-200 group-hover:scale-105">
          <span className="text-lg font-bold text-white">⬡</span>
        </div>
        <span className="text-lg font-bold tracking-tight">
          <span className="gradient-text">Software</span>
          <span className="text-slate-300"> Analyzer</span>
        </span>
      </Link>

      {/* Auth card */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-[#1e1e3a] bg-[#0f0f1e] p-8
                        shadow-2xl shadow-black/40">
          <Outlet />
        </div>
      </div>

      {/* Footer note */}
      <p className="relative mt-8 text-center text-xs text-slate-600">
        Software Project Complexity &amp; Quality Analyzer — Phase 2
      </p>
    </div>
  )
}
