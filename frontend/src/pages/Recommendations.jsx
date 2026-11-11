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
  const { user, isAuthenticated, isTeacher, setMode } = useAuth();
  const [recommendationList, setRecommendationList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function fetchRecommendations() {
    if (isTeacher) return;
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
  }, [user, isTeacher]);

  if (isTeacher) {
    return (
      <div className="page" style={{ maxWidth: '720px', marginTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            color: 'var(--color-learner)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <SparklesIcon size={32} />
          </div>
          <h2 className="page-title" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Mentor Recommendations
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Mentor recommendations are reserved for <strong>Learner Mode</strong> to help students discover qualified teachers for their desired skills.
          </p>
          <button
            onClick={() => setMode('learner')}
            className="btn btn-primary"
            style={{ margin: '0 auto' }}
          >
            Switch to Learner Mode
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Mentor Recommendations</h1>
        <p className="page-subtitle">
          Discover recommended mentors ranked by skill overlap, community reputation ratings, and peer proximity.
        </p>
      </div>



      {!isAuthenticated && (
        <div className="alert alert-info">
          <span>You are viewing default recommendations. <Link to="/login" style={{ fontWeight: '600' }}>Log in</Link> to get matches tailored to your wanted skills.</span>
        </div>
      )}

      {isLoading && <Loader message="Loading recommended mentors..." />}

      {errorMessage && !isLoading && (
        <ErrorState message={errorMessage} onRetry={fetchRecommendations} />
      )}

      {!isLoading && !errorMessage && recommendationList.length === 0 && (
        <EmptyState
          icon={<SparklesIcon size={36} />}
          title="No recommendations currently available"
          description="Add learning goals to your profile to discover mentors teaching those topics."
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
            Top {recommendationList.length} recommended mentors for your learning goals
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
                review_count: mentor.review_count !== undefined ? mentor.review_count : (rec.review_count !== undefined ? rec.review_count : null),
                skills: mentor.skills || rec.skills || (mentor.teaches ? mentor.teaches.map(t => ({ skill_name: t, type: 'teach' })) : []),
              };

              return (
                <ProfileCard
                  key={mentorObj.id || index}
                  user={mentorObj}
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
