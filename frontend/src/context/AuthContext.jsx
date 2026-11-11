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
import { loginUser, registerUser, getMe } from '../api/auth.js';
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

  // Active view/interaction mode: 'learner' or 'teacher' (controls role-specific actions/views)
  const [mode, setModeState] = useState(() => {
    return localStorage.getItem('skillexchange_mode') || 'learner';
  });

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

        if (storedToken && storedUserData) {
          const parsedUser = JSON.parse(storedUserData);
          setUser(parsedUser);

          // If user object has an active_mode from PostgreSQL, sync it
          if (parsedUser.active_mode) {
            setModeState(parsedUser.active_mode);
            localStorage.setItem('skillexchange_mode', parsedUser.active_mode);
          }

          // Verify token against backend PostgreSQL to clear expired or invalid sessions
          try {
            const meRes = await getMe();
            if (meRes && meRes.user) {
              setUser(meRes.user);
              localStorage.setItem('user_data', JSON.stringify(meRes.user));
              if (meRes.user.active_mode) {
                setModeState(meRes.user.active_mode);
                localStorage.setItem('skillexchange_mode', meRes.user.active_mode);
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
    const response = await loginUser(email, password);

    if (response && response.token && response.user) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));

      const userMode = response.user.active_mode || 'learner';
      setModeState(userMode);
      localStorage.setItem('skillexchange_mode', userMode);

      setUser(response.user);
      setSessionExpired(false);
      return response.user;
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
      localStorage.setItem('token', response.token);
      localStorage.setItem('user_data', JSON.stringify(response.user));

      const userMode = response.user.active_mode || 'learner';
      setModeState(userMode);
      localStorage.setItem('skillexchange_mode', userMode);

      setUser(response.user);
      setSessionExpired(false);
      return response.user;
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
  const canTeach = user ? (user.can_teach !== false) : true;
  const canLearn = user ? (user.can_learn !== false) : true;
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
