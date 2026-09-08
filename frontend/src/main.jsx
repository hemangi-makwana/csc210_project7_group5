/**
 * ============================================================================
 * Application Entry Point (src/main.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Mounts the root React application onto the DOM element '#root'.
 * - Wraps the application with:
 *   1. BrowserRouter: Enables client-side HTML5 history routing.
 *   2. AuthProvider: Gives every page and component access to the global
 *      authentication state (user, login, logout, isLoading).
 * - Imports the global stylesheet (index.css).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { App } from './App.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
