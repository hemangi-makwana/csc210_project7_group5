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
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected', 'disconnected', 'checking'

  useEffect(() => {
    let isMounted = true;

    async function checkDbHealth() {
      try {
        const res = await fetch('/api/health/db');
        if (isMounted) {
          if (res.ok) {
            setDbStatus('connected');
          } else {
            setDbStatus('disconnected');
          }
        }
      } catch (e) {
        if (isMounted) setDbStatus('disconnected');
      }
    }

    checkDbHealth();
    const dbInterval = setInterval(checkDbHealth, 25000);
    return () => {
      isMounted = false;
      clearInterval(dbInterval);
    };
  }, []);

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

      {/* Right: DB indicator, Notifications & User Profile */}
      <div className="top-header-right">
        {/* Truthful Database Health Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: '600',
            backgroundColor: dbStatus === 'connected' ? 'rgba(16, 185, 129, 0.12)' : (dbStatus === 'disconnected' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.12)'),
            color: dbStatus === 'connected' ? '#34d399' : (dbStatus === 'disconnected' ? '#f87171' : '#94a3b8'),
            border: `1px solid ${dbStatus === 'connected' ? 'rgba(16, 185, 129, 0.25)' : (dbStatus === 'disconnected' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(148, 163, 184, 0.25)')}`,
          }}
          title={dbStatus === 'connected' ? 'PostgreSQL local database is connected and active' : (dbStatus === 'disconnected' ? 'PostgreSQL database is currently disconnected' : 'Checking database status...')}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: dbStatus === 'connected' ? '#10b981' : (dbStatus === 'disconnected' ? '#ef4444' : '#94a3b8'),
              boxShadow: dbStatus === 'connected' ? '0 0 6px #10b981' : 'none',
            }}
          />
          <span>{dbStatus === 'connected' ? 'PostgreSQL Live' : (dbStatus === 'disconnected' ? 'DB Offline' : 'Checking DB')}</span>
        </div>

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
              {user.avatar_url ? (
                <img
                  src={user.avatar_url.startsWith('http') ? user.avatar_url : user.avatar_url}
                  alt={user.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                getInitials(user.name)
              )}
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
