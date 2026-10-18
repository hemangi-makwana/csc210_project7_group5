/**
 * ============================================================================
 * Notifications Center Page (src/pages/Notifications.jsx)
 * ============================================================================
 * Displays notifications for matched course requests, booking confirmations,
 * reviews, and platform updates. Allows marking items as read.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../api/notifications.js';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { BellIcon, CheckIcon } from '../components/Icons.jsx';

export function Notifications() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  async function loadNotifications() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getMyNotifications();
      setNotifications(res.notifications || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  async function handleMarkRead(id) {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSuccessMessage('All notifications marked as read.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark all as read.');
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="page" style={{ maxWidth: '850px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Stay updated with course request matches, session bookings, and community milestones.
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn btn-sm btn-outline">
            Mark All as Read
          </button>
        )}
      </div>

      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={loadNotifications} />}

      {!user && (
        <div className="alert alert-info">
          <span>Please <Link to="/login" style={{ fontWeight: '600' }}>log in</Link> to view your personal notifications.</span>
        </div>
      )}

      {isLoading && <Loader message="Fetching notifications..." />}

      {!isLoading && user && notifications.length === 0 && (
        <EmptyState
          icon={<BellIcon size={36} />}
          title="No notifications yet"
          description="When a teacher fulfills a course request or a peer books a session with you, your alerts will appear here."
        />
      )}

      {!isLoading && notifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="card"
              style={{
                backgroundColor: notif.is_read ? 'var(--color-surface)' : 'var(--color-surface-elevated)',
                borderLeft: notif.is_read ? '1px solid var(--color-border)' : '4px solid var(--color-primary)',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.4rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                  {notif.title}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                  {new Date(notif.created_at).toLocaleString()}
                </span>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                {notif.message}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                {notif.link ? (
                  <Link
                    to={notif.link.replace('/skills/search?query=', '/search?query=')}
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.8rem' }}
                  >
                    View Details →
                  </Link>
                ) : (
                  <div />
                )}

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
