/**
 * ============================================================================
 * Authentication Context (src/context/AuthContext.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Manages the global login state across the entire React application.
 * - Stores the current user object and an isLoading flag using plain useState.
 * - Automatically restores the user session from localStorage when the app reloads.
 * - Provides login() and logout() functions to update both React state and localStorage.
 *
 * WHY WE USE REACT CONTEXT INSTEAD OF REDUX:
 * - React Context is built into React and requires zero extra dependencies.
 * - For a student-built app, managing user session state with Context + useState
 *   is much simpler to explain, test, and defend during a viva exam.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser } from '../api/auth.js';

// Create the Context object
const AuthContext = createContext(null);

/**
 * AuthProvider wraps the application and provides authentication state to all children.
 */
export function AuthProvider({ children }) {
  // Current logged in user object, or null if logged out
  const [user, setUser] = useState(null);

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
          // Parse and restore the saved user object into state
          const parsedUser = JSON.parse(storedUserData);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error('Failed to restore session from localStorage:', error);
        // Clear corrupted storage items
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  /**
   * Logs in a user with email and password.
   * Calls the auth API, saves token and user data to localStorage, and updates state.
   * 
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} The logged-in user object
   */
  async function login(email, password) {
    setIsLoading(true);
    try {
      const response = await loginUser(email, password);

      if (response && response.token && response.user) {
        // Save auth token and serialized user data to browser storage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user_data', JSON.stringify(response.user));

        // Update React state so all components re-render with new user
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
   * Logs out the current user.
   * Clears localStorage credentials and resets user state to null.
   */
  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_data');
    setUser(null);
  }

  // Value bundle shared with all consuming components
  const contextValue = {
    user: user,
    login: login,
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
 * Example usage: const { user, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
