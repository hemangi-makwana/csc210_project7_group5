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

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { loginUser, registerUser, getMe } from '../api/auth.js';
import { updateUserProfile } from '../api/skills.js';

// Create the Context object
const AuthContext = createContext(null);

function normalizeUserCapabilities(u, fallbackMode) {
  if (!u) return null;
  const validMode =
    fallbackMode === 'teacher' || fallbackMode === 'learner'
      ? fallbackMode
      : u.active_mode === 'teacher'
      ? 'teacher'
      : 'learner';
  return {
    ...u,
    active_mode: validMode,
    can_teach: true,
    can_learn: true,
  };
}

/**
 * AuthProvider wraps the application and provides authentication state,
 * active learner/teacher mode, and user capabilities to all children.
 */
export function AuthProvider({ children }) {
  // Current logged in user object, or null if logged out
  const [user, setUser] = useState(null);

  // Active view/interaction mode: 'learner' or 'teacher' (controls role-specific actions/views)
  const [mode, setModeState] = useState(() => {
    const saved = localStorage.getItem('skillexchange_mode');
    return saved === 'teacher' ? 'teacher' : 'learner';
  });

  const userSwitchedModeRef = useRef(false);

  // Independent Visual Theme: 'light' or 'dark' (Default is LIGHT MODE)
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('skillexchange_theme') || 'light';
  });

  // Loading state while checking localStorage on initial application startup
  const [isLoading, setIsLoading] = useState(true);

  // Session expiration flag for clear recovery handling
  const [sessionExpired, setSessionExpired] = useState(false);

  function clearSessionExpired() {
    setSessionExpired(false);
  }

  /**
   * On initial component mount, check localStorage for an existing JWT token
   * and saved user profile to persist the login across browser refreshes.
   * Validates the session with the backend to clear expired sessions early.
   */
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUserData = localStorage.getItem('user_data');
        const storedMode = localStorage.getItem('skillexchange_mode');

        if (storedToken && storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          const initialMode =
            storedMode === 'teacher' || storedMode === 'learner'
              ? storedMode
              : parsedUser.active_mode === 'teacher'
              ? 'teacher'
              : 'learner';
          const normalizedLocal = normalizeUserCapabilities(parsedUser, initialMode);
          setUser(normalizedLocal);
          setModeState(initialMode);
          localStorage.setItem('skillexchange_mode', initialMode);
          localStorage.setItem('user_data', JSON.stringify(normalizedLocal));

          // Verify token against backend PostgreSQL to clear expired or invalid sessions
          try {
            const meRes = await getMe();
            if (meRes && meRes.user) {
              const latestMode = userSwitchedModeRef.current
                ? (localStorage.getItem('skillexchange_mode') === 'teacher' ? 'teacher' : 'learner')
                : (storedMode === 'teacher' || storedMode === 'learner'
                    ? storedMode
                    : meRes.user.active_mode === 'teacher'
                    ? 'teacher'
                    : 'learner');
              const normalizedServer = normalizeUserCapabilities(meRes.user, latestMode);
              setUser(normalizedServer);
              localStorage.setItem('user_data', JSON.stringify(normalizedServer));
              if (!userSwitchedModeRef.current) {
                setModeState(latestMode);
                localStorage.setItem('skillexchange_mode', latestMode);
              }
            }
          } catch (verifyErr) {
            if (verifyErr.status === 401 || (verifyErr.message && verifyErr.message.toLowerCase().includes('expired'))) {
              console.warn('[AuthContext] Session expired or invalid, clearing local session.');
              localStorage.removeItem('token');
              localStorage.removeItem('user_data');
              setUser(null);
              setSessionExpired(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore session from localStorage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    function handleUnauthorized() {
      setUser(null);
      setSessionExpired(true);
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  /**
   * Synchronize root data-mode and data-theme attributes for global styling.
   * - data-mode controls role-specific views and dashboard features
   * - data-theme controls visual surface presentation (light vs dark mode)
   */
  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('skillexchange_theme', theme);
  }, [theme]);

  /**
   * Sets the visual theme ('light' | 'dark').
   * Persisted independently of role mode.
   */
  function setTheme(newTheme) {
    const validTheme = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(validTheme);
  }

  /**
   * Accessible theme toggle between Light and Dark mode.
   */
  function toggleTheme() {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }


  /**
   * Sets the active mode ('learner' | 'teacher').
   * Persists immediately to localStorage and synchronizes with PostgreSQL.
   * Every account (demo or personal) can freely switch in either direction.
   */
  async function setMode(newMode) {
    const validMode = String(newMode || '').toLowerCase() === 'teacher' ? 'teacher' : 'learner';
    userSwitchedModeRef.current = true;
    setModeState(validMode);
    localStorage.setItem('skillexchange_mode', validMode);

    let currentUserId = user?.id;
    setUser((prev) => {
      if (!prev) return prev;
      currentUserId = prev.id;
      const updatedUser = normalizeUserCapabilities(prev, validMode);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      return updatedUser;
    });

    if (currentUserId) {
      try {
        await updateUserProfile(currentUserId, {
          active_mode: validMode,
          can_teach: true,
          can_learn: true,
        });
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
  async function updateCapabilities() {
    if (!user || !user.id) return;
    const payload = { can_teach: true, can_learn: true };

    const updatedUser = normalizeUserCapabilities(user, mode);
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
    setUser((prev) => {
      const merged = normalizeUserCapabilities({ ...prev, ...newUserData }, newUserData?.active_mode || mode);
      localStorage.setItem('user_data', JSON.stringify(merged));
      return merged;
    });
  }

  /**
   * Logs in a user with email and password.
   */
  async function login(email, password) {
    const response = await loginUser(email, password);

    if (response && response.token && response.user) {
      const userMode = response.user.active_mode === 'teacher' ? 'teacher' : 'learner';
      const normalized = normalizeUserCapabilities(response.user, userMode);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user_data', JSON.stringify(normalized));

      userSwitchedModeRef.current = false;
      setModeState(userMode);
      localStorage.setItem('skillexchange_mode', userMode);

      setUser(normalized);
      setSessionExpired(false);
      return normalized;
    } else {
      throw new Error('Invalid response from server during login');
    }
  }

  /**
   * Registers a user and starts their authenticated session.
   */
  async function register(name, email, password, role, extraFields = {}) {
    const response = await registerUser({ name, email, password, role, ...extraFields });
    if (response && response.token && response.user) {
      const userMode = response.user.active_mode === 'teacher' ? 'teacher' : 'learner';
      const normalized = normalizeUserCapabilities(response.user, userMode);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user_data', JSON.stringify(normalized));

      userSwitchedModeRef.current = false;
      setModeState(userMode);
      localStorage.setItem('skillexchange_mode', userMode);

      setUser(normalized);
      setSessionExpired(false);
      return normalized;
    }
    throw new Error('Invalid response from server during registration');
  }

  /**
   * Logs out the current user.
   */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
    setSessionExpired(false);
  }

  const [isOnline, setIsOnline] = useState(false);

  // Authenticated presence heartbeat: updates PostgreSQL presence map every 25 seconds
  useEffect(() => {
    let timer = null;
    let isCancelled = false;

    async function sendPresenceHeartbeat() {
      const token = localStorage.getItem('token');
      if (!token || !user) {
        setIsOnline(false);
        return;
      }
      try {
        const res = await fetch('/api/presence/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (!isCancelled) {
          setIsOnline(res.ok);
        }
      } catch (err) {
        if (!isCancelled) {
          setIsOnline(false);
        }
      }
    }

    if (user) {
      sendPresenceHeartbeat();
      timer = setInterval(sendPresenceHeartbeat, 25000);
    } else {
      setIsOnline(false);
    }

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [user]);

  const isTeacher = mode === 'teacher';
  const isLearner = mode === 'learner';
  const canTeach = true;
  const canLearn = true;
  // Designated Sole Reviewer: strictly authenticated account for kailashsampath15@gmail.com
  const isReviewer = Boolean(
    user &&
    user.email &&
    user.email.trim().toLowerCase() === 'kailashsampath15@gmail.com'
  );
  const isDarkMode = theme === 'dark';

  // Value bundle shared with all consuming components
  const contextValue = {
    user: user,
    mode: mode,
    setMode: setMode,
    toggleMode: toggleMode,
    theme: theme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    isDarkMode: isDarkMode,
    isTeacher: isTeacher,
    isLearner: isLearner,
    canTeach: canTeach,
    canLearn: canLearn,
    isReviewer: isReviewer,
    isOnline: isOnline,
    updateCapabilities: updateCapabilities,
    updateLocalUser: updateLocalUser,
    login: login,
    register: register,
    logout: logout,
    isLoading: isLoading,
    isAuthenticated: !!user,
    sessionExpired: sessionExpired,
    clearSessionExpired: clearSessionExpired,
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
