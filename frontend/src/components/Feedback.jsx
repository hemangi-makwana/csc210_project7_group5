/**
 * ============================================================================
 * UI Feedback & Status Components (src/components/Feedback.jsx)
 * ============================================================================
 * Clean, consistent feedback states without decorative emojis.
 */

import React from 'react';
import { CheckIcon, CloseIcon } from './Icons.jsx';

/**
 * Animated loading spinner with an optional status label.
 */
export function Loader({ message = 'Loading data...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem', gap: '1rem', color: 'var(--color-text-muted)' }}>
      <div style={{
        width: '36px',
        height: '36px',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: '0.92rem' }}>{message}</p>
    </div>
  );
}

/**
 * Message shown when a list, query, or table has zero results.
 */
export function EmptyState({ icon = null, title = 'No results found', description = 'Try adjusting your search query or filters.', actionButton = null }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1.5rem',
      backgroundColor: 'var(--color-surface)',
      border: '1px dashed var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      color: 'var(--color-text-muted)'
    }}>
      {icon && <div style={{ display: 'inline-flex', marginBottom: '0.75rem', color: 'var(--color-text-disabled)' }}>{icon}</div>}
      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', marginBottom: '0.35rem' }}>{title}</h3>
      <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto', color: 'var(--color-text-muted)' }}>{description}</p>
      {actionButton && <div style={{ marginTop: '1.25rem' }}>{actionButton}</div>}
    </div>
  );
}

/**
 * Error alert box with error description and optional retry action.
 */
export function ErrorState({ message = 'An unexpected error occurred.', onRetry = null }) {
  return (
    <div className="alert alert-error">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
        <CloseIcon size={18} />
        <span><strong>Error:</strong> {message}</span>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="btn btn-sm btn-outline" 
          style={{ marginLeft: 'auto', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fca5a5' }}
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <CheckIcon size={18} />
        <span>{message}</span>
      </div>
    </div>
  );
}

/**
 * Prominent banner displayed when data is served from local mock fallback.
 */
export function DemoBanner({ isDemo = true }) {
  if (!isDemo) return null;

  return (
    <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
      <span className="badge badge-student" style={{ marginRight: '0.5rem' }}>Offline Demo</span>
      <span>Displaying simulated local data because backend is not responding.</span>
    </div>
  );
}
