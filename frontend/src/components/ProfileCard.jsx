/**
 * ============================================================================
 * ProfileCard Component (src/components/ProfileCard.jsx)
 * ============================================================================
 * Renders mentor and peer summary cards with verified teacher skill badges,
 * domain tags, star ratings, and direct booking actions.
 * Free of decorative emojis; uses clean SVG badges.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './StarRating.jsx';
import { VerifiedBadgeIcon } from './Icons.jsx';

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

  // Separate taught skills and wanted skills
  const taughtSkills = (user.skills || []).filter(s => typeof s === 'string' || s.type === 'teach');
  const wantedSkills = (user.skills || []).filter(s => typeof s !== 'string' && s.type === 'learn');

  const avatarSrc = user.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:5000${user.avatar_url}`)
    : null;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header: Avatar, Name, Role Badge, Demo Badge, and Star Rating */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={user.name || 'User'}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--color-border)',
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '1.1rem',
                border: '1px solid rgba(99, 102, 241, 0.4)',
              }}
            >
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
              {user.name}
            </h3>
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                {user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Peer Mentor'}
              </span>
              {user.is_demo && (
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    fontSize: '0.7rem',
                  }}
                  title="Curated database-backed demo profile"
                >
                  Demo Profile
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <StarRating rating={user.reputation_score || user.reputationScore || 5.0} />
        </div>
      </div>

      {/* Algorithmic Match Score (from MaxHeap recommendation engine) */}
      {matchScore !== null && (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.45rem 0.75rem',
          fontSize: '0.82rem',
          color: '#34d399',
          marginBottom: '0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span><strong>Match Score:</strong></span>
          <span style={{ fontWeight: '700' }}>{matchScore}%</span>
        </div>
      )}

      {/* Bio / Headline */}
      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem', flex: 1, lineHeight: 1.5 }}>
        {user.bio || user.profile_summary || 'Community mentor exchanging technical and academic skills.'}
      </p>

      {/* Match Reason (if provided) */}
      {matchReason && (
        <div style={{
          fontSize: '0.82rem',
          color: '#7dd3fc',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          border: '1px solid rgba(14, 165, 233, 0.25)',
          padding: '0.45rem 0.65rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1rem'
        }}>
          {matchReason}
        </div>
      )}

      {/* Taught Skills with Teacher Verification Badges */}
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Teaches:
        </span>
        <div className="chip-container">
          {taughtSkills.length > 0 ? (
            taughtSkills.map((skill, index) => {
              const skillName = typeof skill === 'string' ? skill : skill.skill_name;
              const skillLevel = typeof skill === 'string' ? user.level : skill.level;
              // STRICT REQUIREMENT: Only show verified badge when API says is_verified === true
              const isVerified = typeof skill === 'object' && Boolean(skill.is_verified);

              return (
                <span key={skill.id || index} className="chip">
                  <span>{skillName}</span>
                  {skillLevel && <span className="chip-level">{skillLevel}</span>}
                  {isVerified && (
                    <span
                      className="badge badge-verified"
                      title="Verified Teacher: Passed domain verification quiz"
                    >
                      <VerifiedBadgeIcon size={12} />
                      <span>Verified</span>
                    </span>
                  )}
                </span>
              );
            })
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No teachable skills listed
            </span>
          )}
        </div>
      </div>

      {/* Wanted Skills Section */}
      {wantedSkills.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Wants to learn:
          </span>
          <div className="chip-container">
            {wantedSkills.map((skill, index) => (
              <span key={skill.id || index} className="chip" style={{ backgroundColor: 'var(--color-bg)' }}>
                <span>{skill.skill_name}</span>
                {skill.level && <span className="chip-level">{skill.level}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', gap: '0.5rem' }}>
        <Link
          to={`/booking?mentorId=${encodeURIComponent(user.id || user.userId || '')}&mentorName=${encodeURIComponent(user.name || '')}`}
          className="btn btn-primary"
          style={{ flex: 1, textAlign: 'center' }}
        >
          Book Session
        </Link>
        <Link
          to={`/messages?userId=${encodeURIComponent(user.id || user.userId || '')}&name=${encodeURIComponent(user.name || '')}`}
          className="btn btn-secondary"
          style={{ flex: 1, textAlign: 'center' }}
        >
          Message
        </Link>
      </div>
    </div>
  );
}
