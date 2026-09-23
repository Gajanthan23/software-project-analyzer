/**
 * pages/RegisterPage.jsx
 * 
 * Live registration page component wired to authService.register.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authService.register(formData);
      navigate('/verify-otp', {
        state: {
          email: formData.email,
          message: res.message || 'Verification code sent to your email.'
        }
      });
    } catch (err) {
      const msg = err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        (!err.response ? 'Cannot connect to backend server. Please ensure the Express backend is running on port 4000.' : 'Registration failed. Please check your details.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-100">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start analyzing GitHub repositories
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          ⚠ {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-slate-300">
            Full name
          </label>
          <input
            id="reg-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Jane Doe"
            className="input"
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className="input"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Min. 6 characters"
            className="input"
            required
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </Link>
      </p>
    </>
  );
}
