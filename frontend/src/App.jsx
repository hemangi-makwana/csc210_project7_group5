/**
 * ============================================================================
 * Root Application Component (src/App.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Defines client-side routing using react-router-dom Routes and Route.
 * - Wraps all views in a consistent application layout with Navbar and Footer.
 *
 * ROUTES CONFIGURED:
 * - /               -> Home (Dashboard & feature summary)
 * - /search         -> MentorSearch (Keyword-based mentor discovery)
 * - /recommendations-> Recommendations (Algorithmic priority queue suggestions)
 * - /booking        -> SessionBooking (FIFO queue booking scheduling)
 * - /history        -> LearningHistory (Completed sessions & peer reviews)
 * - /profile        -> SkillProfile (Personal taught/wanted skill management)
 * - /login          -> Login (Authentication & JWT issuance)
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar.jsx';
import { Home } from './pages/Home.jsx';
import { MentorSearch } from './pages/MentorSearch.jsx';
import { Recommendations } from './pages/Recommendations.jsx';
import { SessionBooking } from './pages/SessionBooking.jsx';
import { LearningHistory } from './pages/LearningHistory.jsx';
import { SkillProfile } from './pages/SkillProfile.jsx';
import { Login } from './pages/Login.jsx';

export function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Global Navigation Bar */}
      <Navbar />

      {/* Main Page Content Router */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<MentorSearch />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/booking" element={<SessionBooking />} />
          <Route path="/history" element={<LearningHistory />} />
          <Route path="/profile" element={<SkillProfile />} />
          <Route path="/login" element={<Login />} />
          {/* Fallback route for unknown URLs */}
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <footer className="footer">
        <p>
          🎓 <strong>CSC210 Group 5</strong> — Local Skill Exchange & Community Learning Platform &copy; 2026
        </p>
      </footer>
    </div>
  );
}

export default App;
