/**
 * ============================================================================
 * Route-Level Error Boundary (src/components/ErrorBoundary.jsx)
 * ============================================================================
 * Protects routes from rendering completely blank screens if any child
 * component throws a runtime error. Provides user-friendly recovery actions.
 */

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const pageName = this.props.pageName || 'this page';
      return (
        <div className="page" style={{ maxWidth: '680px', margin: '4rem auto', padding: '0 1rem' }}>
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '2.5rem 2rem',
              border: '1.5px solid var(--color-danger, #ef4444)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: '#ef4444',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>
              Something went wrong loading {pageName}
            </h2>

            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
              An unexpected display issue prevented this view from loading completely. You can reload the view or return to the dashboard.
            </p>

            {this.state.error && process.env.NODE_ENV !== 'production' && (
              <div
                style={{
                  textAlign: 'left',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  fontSize: '0.8rem',
                  color: 'var(--color-danger)',
                  fontFamily: 'monospace',
                  marginBottom: '1.5rem',
                  overflowX: 'auto',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.5rem', fontWeight: '600' }}
              >
                Reload View
              </button>
              <a
                href="/"
                className="btn btn-secondary"
                style={{ padding: '0.65rem 1.5rem', fontWeight: '600' }}
              >
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
