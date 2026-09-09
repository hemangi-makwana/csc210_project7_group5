/**
 * ============================================================================
 * Login Page (src/pages/Login.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Provides the login interface for users to sign into the platform.
 * - Calls the login() function provided by AuthContext (NOT api/auth.js directly).
 * - Includes 1-click quick-fill buttons for demo student/professional/volunteer accounts
 *   so the viva live demonstration can be executed quickly without typing.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState } from '../components/Feedback.jsx';

export function Login() {
  const navigate = useNavigate();
  // Obtain the login function from AuthContext
  const { login } = useAuth();

  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  /**
   * Handles form submit by invoking AuthContext's login() method.
   */
  async function handleLoginSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Call AuthContext login method which updates context state & localStorage
      await login(email, password);
      // Redirect to home dashboard upon successful login
      navigate('/');
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Helper function to pre-fill credentials for quick live demonstration during viva.
   */
  function handleQuickFill(fillEmail, fillPassword) {
    setEmail(fillEmail);
    setPassword(fillPassword);
    setErrorMessage(null);
  }

  return (
    <div className="page" style={{ maxWidth: '480px', marginTop: '1rem' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">🔐 Welcome Back</h1>
        <p className="page-subtitle">Sign in to access your skills, bookings, and recommendations.</p>
      </div>

      {errorMessage && <ErrorState message={errorMessage} />}

      <div className="card">
        <form onSubmit={handleLoginSubmit} className="form">
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address:
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah.lin@example.com"
              required
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password:
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Access Account Helpers */}
        <div style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px dashed var(--color-border)',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
            Quick access:
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleQuickFill('sarah.lin@example.com', 'password123')}
              className="btn btn-sm btn-outline"
            >
              👩‍🏫 Professional
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('alex.rivera@example.com', 'password123')}
              className="btn btn-sm btn-outline"
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('maya.chen@example.com', 'password123')}
              className="btn btn-sm btn-outline"
            >
              🤝 Volunteer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
