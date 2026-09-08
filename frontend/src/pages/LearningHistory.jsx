/**
 * ============================================================================
 * Learning History & Reviews Page (src/pages/LearningHistory.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Displays the user's completed, confirmed, and pending mentoring sessions.
 * - Replaces any hardcoded placeholder with the real user.id from AuthContext.
 * - Allows learners to rate (1-5 stars) and review completed sessions.
 *
 * BACKEND DSA CONNECTION:
 * - Submitting ratings updates user reputation scores and modifies relationship
 *   edge weights in the backend Mentor Network Graph.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSessions, submitSessionReview } from '../api/sessions.js';
import { StarRating } from '../components/StarRating.jsx';
import { Loader, EmptyState, ErrorState, SuccessState, DemoBanner } from '../components/Feedback.jsx';

export function LearningHistory() {
  const { user } = useAuth();

  // State variables
  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Review modal / inline submission state
  const [reviewingSessionId, setReviewingSessionId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  /**
   * Fetches session history for the current user ID.
   */
  async function fetchHistory() {
    const activeUserId = user ? user.id : 'usr_002';

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getUserSessions(activeUserId);
      const list = response.sessions || [];
      setSessionList(list);
      setIsDemo(!!response.isMock);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load session history.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [user]);

  /**
   * Opens review form for a specific completed session.
   */
  function startReview(session) {
    setReviewingSessionId(session.id);
    setReviewRating(5);
    setReviewComment('');
  }

  /**
   * Submits peer review and star rating to the backend.
   */
  async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!reviewingSessionId) return;

    setIsSubmittingReview(true);
    setErrorMessage(null);

    try {
      const payload = {
        session_id: reviewingSessionId,
        rating: reviewRating,
        comment: reviewComment,
      };

      const response = await submitSessionReview(payload);
      setSuccessMessage(response.message || 'Review submitted successfully! Reputation score updated.');

      // Update local session list so review immediately shows
      setSessionList(prevSessions =>
        prevSessions.map(sess => {
          if (sess.id === reviewingSessionId) {
            return {
              ...sess,
              review: { rating: reviewRating, comment: reviewComment },
            };
          }
          return sess;
        })
      );

      setReviewingSessionId(null);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <div className="page">
      {/* Demo Banner */}
      <DemoBanner isDemo={isDemo} />

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">📜 Learning History & Reviews</h1>
        <p className="page-subtitle">
          Track completed milestones, upcoming sessions, and peer evaluations.
        </p>
      </div>

      {/* Feedback Alerts */}
      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={fetchHistory} />}

      {/* Loading State */}
      {isLoading && <Loader message="Fetching your learning history..." />}

      {/* Empty State */}
      {!isLoading && !errorMessage && sessionList.length === 0 && (
        <EmptyState
          icon="📚"
          title="No session history found"
          description="You haven't scheduled or completed any mentoring sessions yet."
          actionButton={
            <Link to="/booking" className="btn btn-primary btn-sm">
              Schedule Your First Session
            </Link>
          }
        />
      )}

      {/* Session List */}
      {!isLoading && !errorMessage && sessionList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sessionList.map((session) => {
            const partner = session.mentor || session.learner || { name: 'Peer Mentor' };
            const formattedDate = new Date(session.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isCompleted = session.status === 'completed';

            return (
              <div key={session.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-main)' }}>
                      Session with {partner.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      🗓️ {formattedDate}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`badge ${
                    session.status === 'completed'
                      ? 'badge-volunteer'
                      : session.status === 'confirmed'
                      ? 'badge-student'
                      : 'badge-professional'
                  }`}>
                    {session.status}
                  </span>
                </div>

                {/* Session Notes */}
                {session.notes && (
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', backgroundColor: 'var(--color-surface-hover)', padding: '0.6rem 0.85rem', borderRadius: 'var(--border-radius-sm)' }}>
                    📝 <strong>Notes:</strong> {session.notes}
                  </p>
                )}

                {/* Existing Review or Review CTA */}
                {session.review ? (
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius-sm)',
                    padding: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Your Review:</span>
                      <StarRating rating={session.review.rating} />
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      "{session.review.comment}"
                    </p>
                  </div>
                ) : isCompleted && reviewingSessionId !== session.id ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      onClick={() => startReview(session)}
                      className="btn btn-sm btn-outline"
                    >
                      ⭐ Leave a Review & Rating
                    </button>
                  </div>
                ) : null}

                {/* Review Form (if currently reviewing this session) */}
                {reviewingSessionId === session.id && (
                  <form onSubmit={handleReviewSubmit} style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--color-primary)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--color-primary-light)' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.5rem', color: '#1e40af' }}>
                      Rate & Review Session with {partner.name}
                    </h4>

                    {/* Interactive Star Selection */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Rating (click stars):
                      </label>
                      <StarRating
                        rating={reviewRating}
                        isInteractive={true}
                        onRatingChange={(newScore) => setReviewRating(newScore)}
                      />
                    </div>

                    {/* Review Comments */}
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <textarea
                        className="form-textarea"
                        rows="2"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Write feedback about the mentor's explanations, helpfulness, and pacing..."
                        required
                        style={{ minHeight: '70px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" className="btn btn-sm btn-primary" disabled={isSubmittingReview}>
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewingSessionId(null)}
                        className="btn btn-sm btn-outline"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
