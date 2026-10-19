/**
 * ============================================================================
 * Login Page (src/pages/Login.jsx)
 * ============================================================================
 * Redesigned with a prominent brand banner introducing SkillExchange,
 * dark blue card aesthetics, password reveal toggle, and demo quick-fill helpers.
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BRAND } from '../constants/brand.js';
import brandLogo from '../assets/logo.png';
import { ErrorState } from '../components/Feedback.jsx';
import { EyeIcon, EyeOffIcon } from '../components/Icons.jsx';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      setErrorMessage(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickFill(demoEmail, demoPassword) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage(null);
  }

  return (
    <div className="auth-page-container">
      {/* Prominent Brand Hero Banner */}
      <section className="auth-hero-banner">
        <div className="auth-hero-logo-wrapper">
          <img
            src={brandLogo}
            alt="Skill Exchange"
            className="auth-hero-logo"
          />
        </div>
        <span className="auth-hero-badge">Peer-to-Peer Learning Platform</span>
        <h1 className="auth-hero-tagline">{BRAND.tagline}</h1>
        <p className="auth-hero-desc">
          {BRAND.description}
        </p>
      </section>

      {/* Login Card Form */}
      <div className="auth-card-wrapper">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 className="auth-card-title">Welcome Back</h2>
            <p className="auth-card-sub">Sign in to your account to continue to your dashboard</p>
          </div>

          {errorMessage && <ErrorState message={errorMessage} />}

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className="input-with-action">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Quick-fill helpers for evaluation / testing */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--color-border)',
            fontSize: '0.82rem',
            color: 'var(--color-text-muted)'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
              Quick Fill Demo Accounts:
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleQuickFill('sarah.lin@example.com', 'password123')}
              >
                Teacher (Sarah Lin)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleQuickFill('alex.rivera@example.com', 'password123')}
              >
                Learner (Alex Rivera)
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handleQuickFill('maya.chen@example.com', 'password123')}
              >
                Volunteer (Maya Chen)
              </button>
            </div>
          </div>

          {/* Register switch link */}
          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)'
          }}>
            Don&apos;t have an account yet?{' '}
            <Link to="/register" style={{ fontWeight: '600', color: 'var(--color-accent)' }}>
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
