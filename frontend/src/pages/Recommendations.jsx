/**
 * ============================================================================
 * Mentor Recommendations Page (src/pages/Recommendations.jsx)
 * ============================================================================
 * Displays all eligible verified mentors matching the learner's saved
 * learning interests and skill requests, ranked from strongest to weakest
 * with pagination ("Load more") so every match is reachable.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getRecommendations } from '../api/recommendations.js';
import { ProfileCard } from '../components/ProfileCard.jsx';
import { Loader, EmptyState, ErrorState } from '../components/Feedback.jsx';
import { SparklesIcon } from '../components/Icons.jsx';

const PAGE_SIZE = 6;

export function Recommendations() {
  const { user, isAuthenticated, isTeacher, setMode } = useAuth();
  const [recommendationList, setRecommendationList] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [emptyMessage, setEmptyMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function fetchRecommendations() {
    if (isTeacher) return;
    const activeUserId = user ? user.id : 'usr_002';
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getRecommendations(activeUserId);
      const items = Array.isArray(response.recommendations) ? response.recommendations : [];
      setRecommendationList(items);
      setVisibleCount(PAGE_SIZE);
      setEmptyMessage(response.message || null);
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
            Mentor recommendations are reserved for <strong>Learner Mode</strong> to help students discover verified teachers for their learning goals.
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

  const visibleRecommendations = recommendationList.slice(0, visibleCount);
  const remainingCount = Math.max(0, recommendationList.length - visibleRecommendations.length);

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Mentor Recommendations</h1>
        <p className="page-subtitle">
          Discover verified mentors who match your learning interests and skill requests.
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
          title="No matching mentors found"
          description={emptyMessage || 'Add learning interests to your profile or submit a skill request to discover verified mentors.'}
          actionButton={
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/profile" className="btn btn-primary btn-sm">
                Update Learning Interests
              </Link>
              <Link to="/requests" className="btn btn-secondary btn-sm">
                Request a Skill
              </Link>
            </div>
          }
        />
      )}

      {!isLoading && !errorMessage && recommendationList.length > 0 && (
        <>
          <div style={{ marginBottom: '1.25rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Showing {visibleRecommendations.length} of {recommendationList.length} matching {recommendationList.length === 1 ? 'mentor' : 'mentors'}
          </div>

          <div className="grid grid-cols-2" style={{ gap: '1.5rem', marginBottom: remainingCount > 0 ? '1.5rem' : '3rem' }}>
            {visibleRecommendations.map((rec, index) => {
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
                skill_entries: mentor.skill_entries || (Array.isArray(mentor.skills) ? mentor.skills : []),
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

          {remainingCount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              >
                Load more ({remainingCount} remaining)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVisibleCount(recommendationList.length)}
              >
                Show all {recommendationList.length}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
