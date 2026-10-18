/**
 * ============================================================================
 * Registration Page (src/pages/Register.jsx)
 * ============================================================================
 * Visual styling aligned with reference Image 2.
 * Includes password confirmation, visibility toggles, role selector, and mode options.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { BRAND } from '../constants/brand.js';
import { ErrorState } from '../components/Feedback.jsx';
import { EyeIcon, EyeOffIcon } from '../components/Icons.jsx';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [activeMode, setActiveMode] = useState('learner');
  const [canTeach, setCanTeach] = useState(true);
  const [canLearn, setCanLearn] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }

    setIsLoading(true);
    try {
      await register(name, email, password, role, {
        active_mode: activeMode,
        can_teach: canTeach,
        can_learn: canLearn,
      });
      navigate('/');
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-page-container">
      {/* Prominent Brand Hero Banner */}
      <section className="auth-hero-banner" style={{ padding: '2.5rem 1.5rem 2rem' }}>
        <span className="auth-hero-badge">Join the Community</span>
        <h1 className="auth-hero-title" style={{ fontSize: '2.25rem' }}>
          Start sharing and learning with{' '}
          <span className="auth-hero-brand">{BRAND.name}</span>
        </h1>
        <p className="auth-hero-desc">
          {BRAND.description}
        </p>
      </section>

      {/* Registration Card Form */}
      <div className="auth-card-wrapper" style={{ padding: '2rem 1.5rem 3rem' }}>
        <div className="auth-card" style={{ maxWidth: '500px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 className="auth-card-title">Create Account</h2>
            <p className="auth-card-sub">
              Join {BRAND.name} to exchange skills, book mentors, and master new topics
            </p>
          </div>

          {errorMessage && <ErrorState message={errorMessage} />}

          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="register-name">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                required
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-email">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '0' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-password">
                  Password
                </label>
                <div className="input-with-action">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-confirm-password">
                  Confirm Password
                </label>
                <div className="input-with-action">
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="register-role">
                Community Role
              </label>
              <select
                id="register-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="student">Student — Learning and peer tutoring</option>
                <option value="professional">Professional — Industry mentor</option>
                <option value="volunteer">Volunteer — Community educator</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Preferred Mode</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="active_mode"
                    value="learner"
                    checked={activeMode === 'learner'}
                    onChange={() => setActiveMode('learner')}
                  />
                  <span>Learner Mode</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="radio"
                    name="active_mode"
                    value="teacher"
                    checked={activeMode === 'teacher'}
                    onChange={() => setActiveMode('teacher')}
                  />
                  <span>Teacher Mode</span>
                </label>
              </div>
              <small style={{ color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                You can switch between learner and teacher modes anytime from the top bar.
              </small>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.75rem' }}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)'
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: '600', color: 'var(--color-accent)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}