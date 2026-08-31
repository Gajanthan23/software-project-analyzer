/**
 * pages/RegisterPage.jsx
 * Phase 2: static form shell — no API call yet (Phase 5).
 */
import { Link } from 'react-router-dom'

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start analyzing GitHub repositories
        </p>
      </div>

      {/* Phase 2 notice */}
      <div className="mb-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10
                      px-4 py-3 text-xs text-indigo-300">
        🔒 Auth logic added in <strong>Phase 5</strong>. Form is UI-only for now.
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label htmlFor="reg-name"
                 className="mb-1.5 block text-sm font-medium text-slate-300">
            Full name
          </label>
          <input
            id="reg-name"
            type="text"
            placeholder="Jane Doe"
            className="input"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="reg-email"
                 className="mb-1.5 block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            className="input"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="reg-password"
                 className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            placeholder="Min. 8 characters"
            className="input"
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn-primary w-full justify-center">
          Create Account
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login"
              className="font-medium text-indigo-400 hover:text-indigo-300
                         transition-colors">
          Sign in
        </Link>
      </p>
    </>
  )
}
