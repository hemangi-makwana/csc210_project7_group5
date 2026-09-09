/**
 * ============================================================================
 * UI Feedback & Status Components (src/components/Feedback.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Provides consistent, reusable feedback states for all application pages:
 *   1. Loader: Spinning indicator while data is being fetched.
 *   2. EmptyState: Visual message when no items/results are found.
 *   3. ErrorState: Clear error banner with optional retry button.
 *   4. SuccessState: Confirmation banner for successful user actions.
 *   5. DemoBanner: Prominently displays when mock fallback data is in use.
 *
 * WHY THIS IS IMPORTANT FOR VIVA:
 * - Centralizing UI feedback ensures consistent user experience across the app.
 * - The DemoBanner fulfills the professor-facing requirement for absolute transparency
 *   during live demos if the backend is not actively running.
 */

import React from 'react';

/**
 * Animated loading spinner with an optional status label.
 */
export function Loader({ message = 'Loading data...' }) {
  return (
    <div className="loader-container">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}

/**
 * Message shown when a list, query, or table has zero results.
 */
export function EmptyState({ icon = '🔍', title = 'No results found', description = 'Try adjusting your search query or filters.', actionButton = null }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionButton && <div style={{ marginTop: '1rem' }}>{actionButton}</div>}
    </div>
  );
}

/**
 * Error alert box with error description and optional retry action.
 */
export function ErrorState({ message = 'An unexpected error occurred.', onRetry = null }) {
  return (
    <div className="alert alert-error">
      <span>⚠️ <strong>Error:</strong> {message}</span>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="btn btn-sm btn-outline" 
          style={{ marginLeft: 'auto' }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Success alert box for confirmations (e.g. Profile updated, Session booked).
 */
export function SuccessState({ message = 'Operation completed successfully!' }) {
  return (
    <div className="alert alert-success">
      <span>✅ {message}</span>
    </div>
  );
}

/**
 * Prominent banner displayed when data is served from local mock fallback.
 * Guarantees that examiners always know whether live backend or demo mock data is active.
 */
export function DemoBanner({ isDemo = true }) {
  if (!isDemo) return null;

  return (
    <div className="demo-banner">
      <span className="demo-banner-badge">Offline Mode</span>
      <span>
        <strong>Backend Offline:</strong> Displaying simulated local data.
      </span>
    </div>
  );
}
