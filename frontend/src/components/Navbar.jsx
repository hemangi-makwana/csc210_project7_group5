/**
 * ============================================================================
 * Navbar Component (src/components/Navbar.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Renders the top navigation header across all pages.
 * - Links to Home, Search Mentors, Recommendations, Book Session, and Learning History.
 * - Dynamically updates according to authentication state:
 *   - Logged in: Displays "Welcome, {user.name}", a "My Profile" link, and a "Logout" button.
 *   - Logged out: Displays a "Login" button and hides profile-specific links.
 */

import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  /**
   * Handles user logout click.
   */
  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Brand Logo & Title */}
        <Link to="/" className="navbar-brand">
          <span className="navbar-brand-icon">🎓</span>
          <span>SkillExchange</span>
        </Link>

        {/* Navigation Links */}
        <ul className="navbar-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/search" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Search Mentors
            </NavLink>
          </li>
          <li>
            <NavLink to="/recommendations" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Recommendations
            </NavLink>
          </li>
          <li>
            <NavLink to="/booking" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Book Session
            </NavLink>
          </li>
          <li>
            <NavLink to="/history" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
              Learning History
            </NavLink>
          </li>
          {isAuthenticated && (
            <li>
              <NavLink to="/profile" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
                My Profile
              </NavLink>
            </li>
          )}
        </ul>

        {/* Auth Section: User Greeting / Login / Logout */}
        <div className="navbar-auth">
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="navbar-user-greeting">
                👋 Welcome, <strong>{user.name}</strong>
              </span>
              <button onClick={handleLogout} className="btn btn-sm btn-outline">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
