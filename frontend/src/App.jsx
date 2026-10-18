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
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Pure auth routes that use full-screen banner layout
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  // If unauthenticated user opens root '/', display Login directly
  const showLoginAtRoot = !isLoading && !isAuthenticated && location.pathname === '/';

  if (isAuthRoute || showLoginAtRoot) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
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
            <Route path="/search" element={<MentorSearch />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/booking" element={<SessionBooking />} />
            <Route path="/history" element={<LearningHistory />} />
            <Route path="/profile" element={<SkillProfile />} />
            <Route path="/requests" element={<CourseRequests />} />
            <Route path="/notifications" element={<Notifications />} />
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
