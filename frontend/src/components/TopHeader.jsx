/**
 * ============================================================================
 * Top Navigation Header (src/components/TopHeader.jsx)
 * ============================================================================
 * Houses the prominent Learner/Teacher Mode Switcher, notification badge,
 * mobile drawer toggle, and user initials profile pill.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyNotifications } from '../api/notifications.js';
import { MenuIcon, BellIcon, UserIcon } from './Icons.jsx';

/**
 * Returns initials from full name (e.g. "Kailash Sampath" -> "KS").
 */
function getInitials(name) {
  if (!name || typeof name !== 'string') return 'SE';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function TopHeader({ onToggleSidebar }) {
  const { user, mode, setMode, isTeacher, isLearner } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationCount() {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await getMyNotifications();
        if (isMounted && res && Array.isArray(res.notifications)) {
          const unread = res.notifications.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        // Silently tolerate when user is not logged in or backend is loading
      }
    }

    loadNotificationCount();
    const interval = setInterval(loadNotificationCount, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  return (
    <header className="top-header">
      {/* Left: Mobile Toggle & Context Indicator */}
      <div className="top-header-left">
        <button
          onClick={onToggleSidebar}
          className="mobile-toggle-btn"
          aria-label="Toggle navigation menu"
        >
          <MenuIcon size={22} />
        </button>

        {/* Clear Learner / Teacher Mode Switcher */}
        <div className="mode-switch-control" role="group" aria-label="Role Mode Switcher">
          <button
            type="button"
            onClick={() => setMode('learner')}
            className={`mode-switch-btn ${isLearner ? 'active learner' : ''}`}
            aria-pressed={isLearner}
            title="Switch to Learner Mode — explore skills, book mentors, and request courses"
          >
            Learner
          </button>
          <button
            type="button"
            onClick={() => setMode('teacher')}
            className={`mode-switch-btn ${isTeacher ? 'active teacher' : ''}`}
            aria-pressed={isTeacher}
            title="Switch to Teacher Mode — manage teachable skills, pass verification quizzes, and mentor peers"
          >
            Teacher
          </button>
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="top-header-right">
        {/* Notifications Icon with Badge */}
        <Link
          to="/notifications"
          className="header-icon-btn"
          title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          aria-label="View notifications"
        >
          <BellIcon size={19} />
          {unreadCount > 0 && (
            <span className="header-badge-count">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Pill */}
        {user ? (
          <Link to="/profile" className="header-user-pill" title="View and edit your profile">
            <div className="avatar-circle">
              {getInitials(user.name)}
            </div>
            <span className="header-user-name">{user.name}</span>
          </Link>
        ) : (
          <Link to="/login" className="btn btn-sm btn-primary">
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
