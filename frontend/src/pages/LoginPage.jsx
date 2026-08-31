/**
 * pages/LoginPage.jsx
 * Phase 2: static form shell — no API call yet (Phase 5).
 */
import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to analyze your repositories
        </p>
      </div>

      {/* Phase 2 notice */}
      <div className="mb-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10
                      px-4 py-3 text-xs text-indigo-300">
        🔒 Auth logic added in <strong>Phase 5</strong>. Form is UI-only for now.
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="login-email"
                 className="mb-1.5 block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            className="input"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="login-password"
                 className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            placeholder="••••••••"
            className="input"
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn-primary w-full justify-center">
          Sign In
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link to="/register"
              className="font-medium text-indigo-400 hover:text-indigo-300
                         transition-colors">
          Register
        </Link>
      </p>
    </>
  )
}
