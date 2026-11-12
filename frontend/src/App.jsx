/**
 * ============================================================================
 * Root Application Component (src/App.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Manages application layout with responsive left Sidebar and TopHeader.
 * - Handles client-side routing.
 * - When an unauthenticated user opens '/', renders Login first with prominent brand banner.
 * - After successful login, renders the Dashboard with summary cards.
 * - Left sidebar navigation replaces the old top navbar.
 */

import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { BRAND } from './constants/brand.js';
import { Sidebar } from './components/Sidebar.jsx';
import { TopHeader } from './components/TopHeader.jsx';
import { Home } from './pages/Home.jsx';
import { MentorSearch } from './pages/MentorSearch.jsx';
import { Recommendations } from './pages/Recommendations.jsx';
import { SessionBooking } from './pages/SessionBooking.jsx';
import { LearningHistory } from './pages/LearningHistory.jsx';
import { SkillProfile } from './pages/SkillProfile.jsx';
import { CourseRequests } from './pages/CourseRequests.jsx';
import { Notifications } from './pages/Notifications.jsx';
import { Messages } from './pages/Messages.jsx';
import { TeacherVerification } from './pages/TeacherVerification.jsx';
import { AvailableCourses } from './pages/AvailableCourses.jsx';
import ReviewerPortal from './pages/ReviewerPortal.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { Loader } from './components/Feedback.jsx';


export function App() {
  const { isAuthenticated, isLoading, sessionExpired } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Pure auth routes that use full-screen banner layout
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const searchParams = new URLSearchParams(location.search);
  const isDedicatedCallTab =
    location.pathname === '/call' ||
    (location.pathname === '/messages' && searchParams.get('callTab') === '1');

  // Initial application startup while validating stored session in localStorage/backend
  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <Loader message="Loading SkillExchange..." />
      </div>
    );
  }

  // When unauthenticated or session has expired, guide user through auth with clear recovery path
  if (!isAuthenticated) {
    if (!isAuthRoute) {
      const isRoot = location.pathname === '/';
      const redirectParam = !isRoot ? `redirect=${encodeURIComponent(location.pathname + location.search)}` : '';
      const expiredParam = sessionExpired ? 'expired=true' : '';
      const queryParts = [redirectParam, expiredParam].filter(Boolean).join('&');
      const targetQuery = queryParts ? `?${queryParts}` : '';

      return (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to={`/login${targetQuery}`} replace />} />
        </Routes>
      );
    }

    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (isDedicatedCallTab) {
    return (
      <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#050811' }}>
        <Routes>
          <Route path="/call" element={<Messages forceCallTab={true} />} />
          <Route path="/messages" element={<Messages forceCallTab={true} />} />
          <Route path="*" element={<Messages forceCallTab={true} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main App Workspace */}
      <div className="main-wrapper">
        {/* Top Header with Mode Switcher & Profile */}
        <TopHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Dynamic Route Content */}
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<AvailableCourses />} />
            <Route path="/search" element={<MentorSearch />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/booking" element={<SessionBooking />} />
            <Route path="/history" element={<LearningHistory />} />
            <Route path="/profile" element={<SkillProfile />} />
            <Route
              path="/teacher-verification"
              element={
                <ErrorBoundary pageName="Teacher Verification">
                  <TeacherVerification />
                </ErrorBoundary>
              }
            />
            <Route path="/reviewer" element={<ReviewerPortal />} />
            <Route path="/reviewer-portal" element={<Navigate to="/reviewer" replace />} />
            <Route path="/requests" element={<CourseRequests />} />

            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/call" element={<Messages forceCallTab={true} />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/register" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Global Clean Dark Footer */}
        <footer style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem'
        }}>
          <p>
            {BRAND.footerText} &copy; {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
