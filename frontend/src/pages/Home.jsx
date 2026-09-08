/**
 * ============================================================================
 * Home / Dashboard Page (src/pages/Home.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Serves as the landing and overview dashboard of the Skill Exchange platform.
 * - Displays quick platform metrics and core feature cards.
 * - Highlights the specific Data Structures & Algorithms (DSA) powering each feature.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="page">
      {/* Hero Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#ffffff',
        padding: '2.5rem 2rem',
        borderRadius: 'var(--border-radius-lg)',
        marginBottom: '2.5rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <span style={{
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60a5fa',
            padding: '0.3rem 0.8rem',
            borderRadius: 'var(--border-radius-full)',
            fontSize: '0.85rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            CSC210 Computer Science Project
          </span>

          <h1 style={{ fontSize: '2.25rem', fontWeight: '800', marginTop: '1rem', marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Local Skill Exchange & Community Learning Platform
          </h1>

          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Connect with peer mentors, exchange technical and academic skills, and build community reputation — powered by deterministic Data Structures and Algorithms.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/search" className="btn btn-primary btn-lg">
              🔍 Find a Mentor
            </Link>
            <Link to="/recommendations" className="btn btn-outline" style={{ color: '#ffffff', borderColor: '#475569' }}>
              🎯 View Recommendations
            </Link>
            {!isAuthenticated && (
              <Link to="/login" className="btn btn-secondary btn-lg">
                🚀 Login to Start
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-3" style={{ marginBottom: '2.5rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>⚡</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-primary)' }}>O(1)</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Instant Hash Table Skill Lookup</div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🌐</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-success)' }}>O(V + E)</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Graph BFS/DFS Network Discovery</div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🏆</div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-warning)' }}>O(k log n)</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Max-Heap Recommendation Ranking</div>
        </div>
      </div>

      {/* Feature Exploration Grid with DSA Callouts */}
      <div className="page-header">
        <h2 className="page-title">Platform Features & DSA Architecture</h2>
        <p className="page-subtitle">Each core capability is engineered with academic data structures at its foundation.</p>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Feature 1: Skill Search */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>🔍 Mentor Search</h3>
            <span className="badge badge-student">Hash Table</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginBottom: '1rem' }}>
            Search mentors teaching specific skills with instant O(1) keyword indexing without performing slow sequential table scans.
          </p>
          <Link to="/search" className="btn btn-outline btn-sm">
            Explore Search →
          </Link>
        </div>

        {/* Feature 2: Recommendation Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>🎯 Recommendation Engine</h3>
            <span className="badge badge-professional">Max-Heap</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginBottom: '1rem' }}>
            Ranks candidate mentors based on composite affinity score (skill overlap, reputation rating, and network distance) using a priority queue.
          </p>
          <Link to="/recommendations" className="btn btn-outline btn-sm">
            View Recommendations →
          </Link>
        </div>

        {/* Feature 3: Session Scheduling */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>📅 Session Booking Pipeline</h3>
            <span className="badge badge-volunteer">FIFO Queue</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginBottom: '1rem' }}>
            Processes incoming 1:1 and group booking requests in strict chronological order to avoid race conditions and double-booking conflicts.
          </p>
          <Link to="/booking" className="btn btn-outline btn-sm">
            Book a Session →
          </Link>
        </div>

        {/* Feature 4: Learning History & Reviews */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 className="card-title" style={{ margin: 0 }}>📜 Learning History & Reviews</h3>
            <span className="badge badge-student">Graph Network</span>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.92rem', marginBottom: '1rem' }}>
            Tracks learning milestones and completed sessions. Submitting ratings updates peer edge weights and verified reputation scores.
          </p>
          <Link to="/history" className="btn btn-outline btn-sm">
            View History →
          </Link>
        </div>
      </div>
    </div>
  );
}
