/**
 * App.jsx — Root router configuration
 *
 * Route hierarchy:
 *
 *   /                         → redirect to /dashboard
 *   /login                    → AuthLayout > LoginPage
 *   /register                 → AuthLayout > RegisterPage
 *   /dashboard                → MainLayout > DashboardPage
 *   /history                  → MainLayout > HistoryPage
 *   /compare                  → MainLayout > ComparePage
 *   /projects/:id             → MainLayout > ProjectLayout > ProjectOverviewPage
 *   /projects/:id/complexity  → MainLayout > ProjectLayout > ComplexityPage
 *   /projects/:id/quality     → MainLayout > ProjectLayout > QualityPage
 *   /projects/:id/testing     → MainLayout > ProjectLayout > TestingPage
 *   /projects/:id/security    → MainLayout > ProjectLayout > SecurityPage
 *   /projects/:id/architecture→ MainLayout > ProjectLayout > ArchitecturePage
 *   /projects/:id/git-history → MainLayout > ProjectLayout > GitHistoryPage
 *   /projects/:id/recommendations → MainLayout > ProjectLayout > RecommendationsPage
 *   *                         → NotFoundPage
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Layouts
import AuthLayout    from './components/Layout/AuthLayout'
import MainLayout    from './components/Layout/MainLayout'
import ProjectLayout from './components/Layout/ProjectLayout'

// Auth pages
import LoginPage     from './pages/LoginPage'
import RegisterPage  from './pages/RegisterPage'
import VerifyOtpPage from './pages/VerifyOtpPage'

// Top-level pages
import DashboardPage from './pages/DashboardPage'
import HistoryPage   from './pages/HistoryPage'
import ComparePage   from './pages/ComparePage'

// Project sub-pages
import ProjectOverviewPage   from './pages/ProjectOverviewPage'
import ComplexityPage        from './pages/ComplexityPage'
import QualityPage           from './pages/QualityPage'
import TestingPage           from './pages/TestingPage'
import SecurityPage          from './pages/SecurityPage'
import ArchitecturePage      from './pages/ArchitecturePage'
import GitHistoryPage        from './pages/GitHistoryPage'
import RecommendationsPage   from './pages/RecommendationsPage'

// Utility pages
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Root redirect ───────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Public auth routes ──────────────────────────────────────────── */}
        <Route element={<AuthLayout />}>
          <Route path="/login"      element={<LoginPage />}     />
          <Route path="/register"   element={<RegisterPage />}  />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
        </Route>

        {/* ── Main app routes (Navbar only) ───────────────────────────────── */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/history"   element={<HistoryPage />}   />
          <Route path="/compare"   element={<ComparePage />}   />

          {/* Project sub-routes (Navbar + Sidebar) */}
          <Route path="/projects/:id" element={<ProjectLayout />}>
            <Route index                     element={<ProjectOverviewPage />} />
            <Route path="complexity"         element={<ComplexityPage />}      />
            <Route path="quality"            element={<QualityPage />}         />
            <Route path="testing"            element={<TestingPage />}         />
            <Route path="security"           element={<SecurityPage />}        />
            <Route path="architecture"       element={<ArchitecturePage />}    />
            <Route path="git-history"        element={<GitHistoryPage />}      />
            <Route path="recommendations"    element={<RecommendationsPage />} />
            <Route path="history"            element={<HistoryPage />}         />
          </Route>
        </Route>

        {/* ── 404 ─────────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </BrowserRouter>
  )
}
