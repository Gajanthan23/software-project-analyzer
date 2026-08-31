/**
 * components/Navbar.jsx
 *
 * Top navigation bar with user state and logout.
 */

import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const IconGrid = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z
         M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z
         M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z
         M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const IconClock = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconScale = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1
         m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5
         m0 16H9m3 0h3" />
  </svg>
);

const navLinks = [
  { to: '/dashboard',  label: 'Dashboard', icon: <IconGrid />  },
  { to: '/history',    label: 'History',   icon: <IconClock /> },
  { to: '/compare',    label: 'Compare',   icon: <IconScale /> },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    navigate('/login');
  };

  const initial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[#1e1e3a] bg-[#080812]/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-900/40 transition-all duration-200 group-hover:shadow-indigo-700/50">
            <span className="text-sm font-bold text-white">⬡</span>
          </div>
          <span className="text-sm font-bold tracking-tight">
            <span className="gradient-text">Software</span>
            <span className="text-slate-300"> Analyzer</span>
          </span>
        </NavLink>

        {/* ── Nav links ────────────────────────────────────────────────────── */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-slate-400 hover:bg-[#1e1e3a] hover:text-slate-200'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── User profile & Logout ────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <span className="hidden text-xs text-slate-300 font-medium md:block">
                {currentUser.name}
              </span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-800/50 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{initial}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-2"
                title="Sign Out"
              >
                Logout
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn-secondary text-xs py-1.5 px-3">
              Sign In
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
