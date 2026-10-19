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
              const mentor = rec.mentor || rec;
              const mentorObj = {
                id: mentor.userId || mentor.id || rec.userId || rec.id,
                name: mentor.name || rec.name || 'Community Mentor',
                role: mentor.role || rec.role,
                bio: mentor.bio || mentor.profile_summary || rec.bio,
                avatar_url: mentor.avatar_url || rec.avatar_url || null,
                is_demo: mentor.is_demo !== undefined ? mentor.is_demo : Boolean(rec.is_demo),
                reputation_score: mentor.reputationScore || mentor.reputation_score || rec.reputationScore || 5.0,
                skills: mentor.skills || rec.skills || (mentor.teaches ? mentor.teaches.map(t => ({ skill_name: t, type: 'teach' })) : []),
              };

              // Ensure score is strictly between 0% and 100% (never impossible values like 800%)
              let rawScore = rec.matchScore !== undefined ? rec.matchScore : (rec.score !== undefined ? rec.score : 85);
              if (rawScore > 0 && rawScore <= 1.0) {
                rawScore = rawScore * 100;
              }
              const displayScore = Math.min(100, Math.max(0, Math.round(rawScore)));

              return (
                <ProfileCard
                  key={mentorObj.id || index}
                  user={mentorObj}
                  matchScore={displayScore}
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
