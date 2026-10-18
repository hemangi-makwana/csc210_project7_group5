/**
 * ============================================================================
 * Mentor Recommendations Page (src/pages/Recommendations.jsx)
 * ============================================================================
 * Displays algorithmic mentor matches and recommendations ranked by composite
 * affinity (skill overlap, reputation rating, and network proximity).
 * Free of emojis; removes "personalized" descriptor as requested.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRecommendations } from '../api/recommendations.js';
import { ProfileCard } from '../components/ProfileCard.jsx';
import { Loader, EmptyState, ErrorState } from '../components/Feedback.jsx';
import { SparklesIcon, SkillsIcon } from '../components/Icons.jsx';

export function Recommendations() {
  const { user, isAuthenticated } = useAuth();
  const [recommendationList, setRecommendationList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function fetchRecommendations() {
    const activeUserId = user ? user.id : 'usr_002';
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getRecommendations(activeUserId);
      const items = response.recommendations || [];
      setRecommendationList(items);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load recommendations.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Mentor Recommendations</h1>
        <p className="page-subtitle">
          Discover recommended mentors ranked by skill overlap, community reputation ratings, and peer proximity.
        </p>
      </div>

      {/* Algorithmic Context Note */}
      <div style={{
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        border: '1px solid rgba(79, 70, 229, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        fontSize: '0.88rem',
        color: '#c7d2fe',
        marginBottom: '2rem',
        lineHeight: 1.5,
      }}>
        <strong>Algorithmic Ranking:</strong> Candidate mentors are ranked by a priority score combining skill compatibility, peer ratings, and network proximity.
      </div>

      {!isAuthenticated && (
        <div className="alert alert-info">
          <span>You are viewing default recommendations. <Link to="/login" style={{ fontWeight: '600' }}>Log in</Link> to get matches tailored to your wanted skills.</span>
        </div>
      )}

      {isLoading && <Loader message="Computing mentor recommendation rankings..." />}

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={fetchRecommendations} />
      )}

      {!isLoading && !errorMessage && recommendationList.length === 0 && (
        <EmptyState
          icon={<SparklesIcon size={36} />}
          title="No recommendations currently available"
          description="Add more learning goals to your profile to help the matching algorithm find compatible teachers."
          actionButton={
            <Link to="/profile" className="btn btn-primary btn-sm">
              Update Wanted Skills
            </Link>
          }
        />
      )}

      {!isLoading && !errorMessage && recommendationList.length > 0 && (
        <>
          <div style={{ marginBottom: '1.25rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Top {recommendationList.length} recommended mentors for your profile
          </div>

          <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: '3rem' }}>
            {recommendationList.map((rec, index) => {
              const mentorObj = {
                id: rec.userId || rec.id,
                name: rec.name,
                role: rec.role,
                bio: rec.bio || rec.profile_summary,
                reputation_score: rec.reputationScore || rec.reputation_score,
                skills: rec.skills || (rec.teaches ? rec.teaches.map(t => ({ skill_name: t, type: 'teach' })) : []),
              };

              return (
                <ProfileCard
                  key={mentorObj.id || index}
                  user={mentorObj}
                  matchScore={rec.matchScore ? Math.round(rec.matchScore * 100) : (rec.score ? Math.round(rec.score * 10) : 85)}
                  matchReason={rec.matchReason || rec.reason || null}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
