/**
 * ============================================================================
 * Learning History & Reviews Page (src/pages/LearningHistory.jsx)
 * ============================================================================
 * Displays session history for both learner and mentor roles.
 * Supports peer reviews and 5-star ratings without decorative emojis.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSessions, submitSessionReview } from '../api/sessions.js';
import { StarRating } from '../components/StarRating.jsx';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { HistoryIcon, CalendarIcon, CheckIcon } from '../components/Icons.jsx';

export function LearningHistory() {
  const { user, isTeacher } = useAuth();

  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Review modal / inline state
  const [reviewingSessionId, setReviewingSessionId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  async function fetchHistory() {
    const activeUserId = user ? user.id : 'usr_002';
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getUserSessions(activeUserId);
      const list = response.sessions || [];
      setSessionList(list);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load session history.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [user]);

  function startReview(session) {
    setReviewingSessionId(session.id);
    setReviewRating(5);
    setReviewComment('');
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!reviewingSessionId) return;

    setIsSubmittingReview(true);
    setErrorMessage(null);

    try {
      const payload = {
        sessionId: reviewingSessionId,
        rating: reviewRating,
        comment: reviewComment,
      };

      const response = await submitSessionReview(payload);
      setSuccessMessage(response.message || 'Review submitted successfully! Reputation score updated.');

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
    <div className="page" style={{ maxWidth: '850px' }}>
      <div className="page-header">
        <h1 className="page-title">
          {isTeacher ? 'Teaching & Mentorship History' : 'Learning History & Reviews'}
        </h1>
        <p className="page-subtitle">
          Track completed sessions, view feedback, and evaluate mentoring interactions.
        </p>
      </div>

      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={fetchHistory} />}

      {isLoading && <Loader message="Fetching session records..." />}

      {!isLoading && !errorMessage && sessionList.length === 0 && (
        <EmptyState
          icon={<HistoryIcon size={36} />}
          title="No session history found"
          description="You haven't scheduled or completed any mentoring sessions yet."
          actionButton={
            <Link to="/booking" className="btn btn-primary btn-sm">
              Schedule a Session
            </Link>
          }
        />
      )}

      {!isLoading && !errorMessage && sessionList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sessionList.map((session) => {
            const partner = session.mentor || session.learner || { name: 'Peer Partner' };
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
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                      Session with {partner.name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {formattedDate}
                    </p>
                  </div>

                  <span className={`badge ${
                    session.status === 'completed'
                      ? 'badge-volunteer'
                      : session.status === 'confirmed'
                      ? 'badge-student'
                      : 'badge-professional'
                  }`}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </span>
                </div>

                {session.topic && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Topic: </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{session.topic}</span>
                  </div>
                )}

                {session.notes && (
                  <p style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-secondary)',
                    marginBottom: '0.75rem',
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <strong>Notes:</strong> {session.notes}
                  </p>
                )}

                {/* Existing Review Display */}
                {session.review ? (
                  <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem',
                    marginTop: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>Review:</span>
                      <StarRating rating={session.review.rating} />
                    </div>
                    {session.review.comment && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        "{session.review.comment}"
                      </p>
                    )}
                  </div>
                ) : isCompleted && reviewingSessionId !== session.id ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      onClick={() => startReview(session)}
                      className="btn btn-sm btn-outline"
                    >
                      Leave a Review & Rating
                    </button>
                  </div>
                ) : null}

                {/* Inline Review Form */}
                {reviewingSessionId === session.id && (
                  <form onSubmit={handleReviewSubmit} style={{
                    marginTop: '1rem',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-primary)'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
                      Evaluate Session with {partner.name}
                    </h4>

                    <div className="form-group">
                      <label className="form-label">Rating (1 to 5 Stars)</label>
                      <StarRating
                        rating={reviewRating}
                        isInteractive={true}
                        onRatingChange={(newRating) => setReviewRating(newRating)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="review-comment">
                        Feedback / Review
                      </label>
                      <textarea
                        id="review-comment"
                        className="form-textarea"
                        rows="2"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience (e.g. Clear explanations, practical examples)..."
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isSubmittingReview}
                      >
                        {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReviewingSessionId(null)}
                        className="btn btn-secondary btn-sm"
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
