import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorState } from '../components/Feedback.jsx';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await register(name, email, password, role);
      navigate('/');
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '480px', marginTop: '1rem' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Create your account</h1>
        <p className="page-subtitle">Join the Skill Exchange community.</p>
      </div>
      {errorMessage && <ErrorState message={errorMessage} />}
      <div className="card">
        <form onSubmit={handleRegisterSubmit} className="form">
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Name</label>
            <input id="register-name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email Address</label>
            <input id="register-email" type="email" className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input id="register-password" type="password" className="form-input" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
            <small>Use at least 6 characters.</small>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="register-role">I am a</label>
            <select id="register-role" className="form-input" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="student">Student</option>
              <option value="professional">Professional</option>
              <option value="volunteer">Volunteer</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--color-border)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}