/**
 * ============================================================================
 * Authentication Context (src/context/AuthContext.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Manages the global login state and active Learner/Teacher mode.
 * - Stores the user object, active_mode ('learner' | 'teacher'), and capabilities.
 * - Restores sessions from localStorage and persists mode changes to PostgreSQL.
 * - Provides mode toggling (Learner ⇄ Teacher) for the entire application.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser } from '../api/auth.js';
import { updateUserProfile } from '../api/skills.js';

// Create the Context object
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the application and provides authentication state,
 * active learner/teacher mode, and user capabilities to all children.
 */
export function AuthProvider({ children }) {
  // Current logged in user object, or null if logged out
  const [user, setUser] = useState(null);

  // Active view/interaction mode: 'learner' or 'teacher'
  const [mode, setModeState] = useState(() => {
    return localStorage.getItem('skillexchange_mode') || 'learner';
  });

  // Loading state while checking localStorage on initial application startup
  const [isLoading, setIsLoading] = useState(true);

  /**
   * On initial component mount, check localStorage for an existing JWT token
   * and saved user profile to persist the login across browser refreshes.
   */
  useEffect(() => {
    function restoreSession() {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUserData = localStorage.getItem('user_data');

        if (storedToken && storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          setUser(parsedUser);

          // If user object has an active_mode from PostgreSQL, sync it
          if (parsedUser.active_mode) {
            setModeState(parsedUser.active_mode);
            localStorage.setItem('skillexchange_mode', parsedUser.active_mode);
          }
        }
      } catch (error) {
        console.error('Failed to restore session from localStorage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  /**
   * Sets the active mode ('learner' | 'teacher').
   * Persists immediately to localStorage and synchronizes with PostgreSQL.
   */
  async function setMode(newMode) {
    const validMode = newMode === 'teacher' ? 'teacher' : 'learner';
    setModeState(validMode);
    localStorage.setItem('skillexchange_mode', validMode);

    if (user && user.id) {
      const updatedUser = { ...user, active_mode: validMode };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));

      try {
        await updateUserProfile(user.id, { active_mode: validMode });
      } catch (err) {
        console.warn('Could not persist mode switch to server, kept local:', err.message);
      }
    }
  }

  /**
   * Toggles between 'learner' and 'teacher' modes.
   */
  function toggleMode() {
    const nextMode = mode === 'teacher' ? 'learner' : 'teacher';
    setMode(nextMode);
  }

  /**
   * Updates user capabilities (can_teach, can_learn) and persists to PostgreSQL.
   */
  async function updateCapabilities({ canTeach, canLearn }) {
    if (!user || !user.id) return;
    const payload = {};
    if (canTeach !== undefined) payload.can_teach = Boolean(canTeach);
    if (canLearn !== undefined) payload.can_learn = Boolean(canLearn);

    const updatedUser = {
      ...user,
      can_teach: payload.can_teach !== undefined ? payload.can_teach : user.can_teach,
      can_learn: payload.can_learn !== undefined ? payload.can_learn : user.can_learn,
    };
    setUser(updatedUser);
    localStorage.setItem('user_data', JSON.stringify(updatedUser));

    try {
      await updateUserProfile(user.id, payload);
    } catch (err) {
      console.warn('Could not persist capabilities to server:', err.message);
    }
  }

  /**
   * Locally updates cached user object in state and localStorage.
   */
  function updateLocalUser(newUserData) {
    setUser(prev => {
      const merged = { ...prev, ...newUserData };
      localStorage.setItem('user_data', JSON.stringify(merged));
      return merged;
    });
  }

  /**
   * Logs in a user with email and password.
   */
  async function login(email, password) {
    setIsLoading(true);
    try {
      const response = await loginUser(email, password);

      if (response && response.token && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));

        const userMode = response.user.active_mode || 'learner';
        setModeState(userMode);
        localStorage.setItem('skillexchange_mode', userMode);

        setUser(response.user);
        return response.user;
      } else {
        throw new Error('Invalid response from server during login');
      }
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Registers a user and starts their authenticated session.
   */
  async function register(name, email, password, role, extraFields = {}) {
    setIsLoading(true);
    try {
      const response = await registerUser({ name, email, password, role, ...extraFields });
      if (response && response.token && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));

        const userMode = response.user.active_mode || 'learner';
        setModeState(userMode);
        localStorage.setItem('skillexchange_mode', userMode);

        setUser(response.user);
        return response.user;
      }
      throw new Error('Invalid response from server during registration');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Logs out the current user.
   */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
  }

  const isTeacher = mode === 'teacher';
  const isLearner = mode === 'learner';
  const canTeach = user ? (user.can_teach !== false) : true;
  const canLearn = user ? (user.can_learn !== false) : true;

  // Value bundle shared with all consuming components
  const contextValue = {
    user: user,
    mode: mode,
    setMode: setMode,
    toggleMode: toggleMode,
    isTeacher: isTeacher,
    isLearner: isLearner,
    canTeach: canTeach,
    canLearn: canLearn,
    updateCapabilities: updateCapabilities,
    updateLocalUser: updateLocalUser,
    login: login,
    register: register,
    logout: logout,
    isLoading: isLoading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom helper hook to consume the AuthContext in any component.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
