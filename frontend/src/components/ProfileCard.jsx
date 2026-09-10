/**
 * ============================================================================
 * ProfileCard Component (src/components/ProfileCard.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Renders a mentor or peer profile summary card.
 * - Displays name, community role badge, star rating, bio, and skills list with levels.
 * - Provides a "Book Session" button to start scheduling mentorship.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './StarRating.jsx';

/**
 * Formats the role name into a clean badge CSS class.
 */
function getRoleBadgeClass(role) {
  switch ((role || '').toLowerCase()) {
    case 'professional':
      return 'badge-professional';
    case 'volunteer':
      return 'badge-volunteer';
    default:
      return 'badge-student';
  }
}

export function ProfileCard({ user, matchScore = null, matchReason = null }) {
  if (!user) return null;

  // Separate taught skills and wanted skills (supports both object and string format)
  const taughtSkills = (user.skills || []).filter(s => typeof s === 'string' || s.type === 'teach');
  const wantedSkills = (user.skills || []).filter(s => typeof s !== 'string' && s.type === 'learn');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header: Name, Role Badge, and Optional Algorithmic Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-text-main)' }}>
            {user.name}
          </h3>
          <span className={`badge ${getRoleBadgeClass(user.role)}`} style={{ marginTop: '0.25rem' }}>
            {user.role || 'Peer Mentor'}
          </span>
        </div>

        {/* Reputation Rating */}
        <div>
          <StarRating rating={user.reputation_score || user.reputationScore || 5.0} />
        </div>
      </div>

      {/* Algorithmic Match Score (if coming from Recommendation Engine) */}
      {matchScore !== null && (
        <div style={{
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: 'var(--border-radius-sm)',
          padding: '0.4rem 0.75rem',
          fontSize: '0.82rem',
          color: '#166534',
          marginBottom: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🎯 <strong>Match Score:</strong></span>
          <span style={{ fontWeight: '700' }}>{matchScore}%</span>
        </div>
      )}

      {/* Bio / Description */}
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem', flex: 1 }}>
        {user.bio || 'Community learner and mentor sharing technical and academic skills.'}
      </p>

      {/* Match Reason (if available from recommendations) */}
      {matchReason && (
        <p style={{ fontSize: '0.82rem', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '0.4rem 0.6rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
          💡 {matchReason}
        </p>
      )}

      {/* Taught Skills Section */}
      <div style={{ marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
          Teaches:
        </span>
        <div className="chip-container">
          {taughtSkills.length > 0 ? (
            taughtSkills.map((skill, index) => {
              const skillName = typeof skill === 'string' ? skill : skill.skill_name;
              const skillLevel = typeof skill === 'string' ? user.level : skill.level;
              return (
                <span key={skill.id || index} className="chip">
                  {skillName}
                  {skillLevel && <span className="chip-level">{skillLevel}</span>}
                </span>
              );
            })
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No taught skills listed</span>
          )}
        </div>
      </div>

      {/* Wanted Skills Section */}
      {wantedSkills.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Wants to learn:
          </span>
          <div className="chip-container">
            {wantedSkills.map((skill, index) => (
              <span key={skill.id || index} className="chip chip-secondary">
                {skill.skill_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer: Book Session */}
      <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        <Link
          to={`/booking?mentorId=${user.id}&mentorName=${encodeURIComponent(user.name)}`}
          className="btn btn-primary btn-sm"
          style={{ width: '100%' }}
        >
          📅 Book Mentoring Session
        </Link>
      </div>
    </div>
  );
}
