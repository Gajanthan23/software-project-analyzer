/**
 * pages/NotFoundPage.jsx — 404 catch-all
 */
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
         style={{ background: 'var(--surface-bg)' }}>

      {/* Glow */}
      <div aria-hidden="true"
           className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <p className="relative text-8xl font-extrabold gradient-text">404</p>
      <h1 className="relative mt-4 text-2xl font-bold text-slate-200">
        Page not found
      </h1>
      <p className="relative mt-2 text-sm text-slate-500 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link to="/dashboard"
            className="btn-primary relative mt-8">
        ← Back to Dashboard
      </Link>
    </div>
  )
}
