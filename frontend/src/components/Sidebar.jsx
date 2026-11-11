/**
 * ============================================================================
 * Left Navigation Sidebar (src/components/Sidebar.jsx)
 * ============================================================================
 * Left navigation panel inspired by skillsxchange.vercel.app.
 * Dynamically adjusts sections and labels based on Learner vs Teacher active mode.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BRAND } from '../constants/brand.js';
import logoLight from '../assets/logo-light.png';
import logoDark from '../assets/logo-dark.png';
import {
  DashboardIcon,
  SkillsIcon,
  SearchIcon,
  SparklesIcon,
  CalendarIcon,
  RequestIcon,
  BellIcon,
  HistoryIcon,
  MessageIcon,
  LogoutIcon,
  SwitchModeIcon,
  CloseIcon,
  VerifiedBadgeIcon,
  ShieldCheckIcon,
  UserIcon,
} from './Icons.jsx';


export function Sidebar({ isOpen, onClose }) {
  const { user, mode, theme, isDarkMode, isTeacher, isLearner, isReviewer, toggleMode, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            zIndex: 95,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <NavLink to="/" className="sidebar-brand" onClick={onClose} aria-label="Skill Exchange Home">
            <img
              src={isDarkMode ? logoDark : logoLight}
              alt="Skill Exchange"
              className="sidebar-brand-logo"
            />
          </NavLink>
          {isOpen && (
            <button
              onClick={onClose}
              className="mobile-toggle-btn"
              aria-label="Close navigation"
            >
              <CloseIcon size={20} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <span className="sidebar-nav-heading">Main Navigation</span>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <DashboardIcon size={19} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/courses"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <SkillsIcon size={19} />
            <span>Available Courses</span>
          </NavLink>

          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <UserIcon size={19} />
            <span>{isTeacher ? 'Offered Skills & Profile' : 'My Skills & Profile'}</span>
          </NavLink>

          {/* Mode-Specific Tools Section */}
          <span className="sidebar-nav-heading">
            {isTeacher ? 'Teaching Tools' : 'Learning Tools'}
          </span>

          {isLearner ? (
            <>
              <NavLink
                to="/search"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <SearchIcon size={19} />
                <span>Find Mentors</span>
              </NavLink>

              <NavLink
                to="/recommendations"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <SparklesIcon size={19} />
                <span>Recommendations</span>
              </NavLink>

              <NavLink
                to="/booking"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <CalendarIcon size={19} />
                <span>Book Mentor Session</span>
              </NavLink>

              <NavLink
                to="/requests"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <RequestIcon size={19} />
                <span>Request a Skill</span>
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/teacher-verification"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <VerifiedBadgeIcon size={19} />
                <span>Teacher Verification</span>
              </NavLink>

              <NavLink
                to="/requests"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <RequestIcon size={19} />
                <span>Incoming Learner Requests</span>
              </NavLink>

              <NavLink
                to="/history?view=teaching"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <CalendarIcon size={19} />
                <span>Teaching Sessions</span>
              </NavLink>
            </>
          )}

          {/* Reviewer Portal: strictly visible only to sole authorized reviewer account */}
          {isReviewer && (
            <>
              <span className="sidebar-nav-heading">Reviewer Administration</span>
              <NavLink
                to="/reviewer"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <ShieldCheckIcon size={19} />
                <span>Reviewer Portal</span>
              </NavLink>
            </>
          )}

          {/* Shared Communication & History Section */}
          <span className="sidebar-nav-heading">Communication & History</span>

          <NavLink
            to="/messages"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <MessageIcon size={19} />
            <span>Messages</span>
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <BellIcon size={19} />
            <span>Notifications</span>
          </NavLink>

          <NavLink
            to={isTeacher ? '/history?view=teaching' : '/history?view=learning'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <HistoryIcon size={19} />
            <span>{isTeacher ? 'Teaching History' : 'Learning History'}</span>
          </NavLink>
        </nav>


        {/* Sidebar Footer with Mode Switch & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-mode-indicator">
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                Active Mode
              </div>
              <div style={{ fontWeight: '700', color: isTeacher ? 'var(--color-teacher)' : 'var(--color-learner)', textTransform: 'capitalize' }}>
                {mode} Mode
              </div>
            </div>
            <button
              onClick={toggleMode}
              className="btn btn-sm btn-outline"
              title={`Switch to ${isTeacher ? 'Learner' : 'Teacher'} mode`}
              style={{ padding: '0.35rem 0.65rem', gap: '0.35rem', fontSize: '0.78rem' }}
            >
              <SwitchModeIcon size={14} />
              <span>Switch</span>
            </button>
          </div>

          {user && (
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Sign out of your account"
            >
              <LogoutIcon size={18} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
