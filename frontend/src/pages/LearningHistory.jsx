/**
 * ============================================================================
 * Learning History & Reviews Page (src/pages/LearningHistory.jsx)
 * ============================================================================
 * Displays session history for both learner and mentor roles.
 * Supports peer reviews and 5-star ratings without decorative emojis.
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserSessions, submitSessionReview } from '../api/sessions.js';
import { StarRating } from '../components/StarRating.jsx';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { HistoryIcon, CalendarIcon, CheckIcon } from '../components/Icons.jsx';

export function LearningHistory() {
  const { user, isTeacher } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: 'learning' (as learner) or 'teaching' (as teacher/mentor)
  const viewParam = searchParams.get('view');
  const [activeTab, setActiveTab] = useState(
    viewParam === 'teaching' ? 'teaching' : (viewParam === 'learning' ? 'learning' : (isTeacher ? 'teaching' : 'learning'))
  );

  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Review modal / inline state
  const [reviewingSessionId, setReviewingSessionId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Synchronize tab state if URL query param changes
  useEffect(() => {
    if (viewParam === 'teaching' || viewParam === 'learning') {
      setActiveTab(viewParam);
    }
  }, [viewParam]);

  function switchTab(tab) {
    setActiveTab(tab);
    setSearchParams({ view: tab });
  }

  async function fetchHistory() {
    const activeUserId = user ? user.id : 'usr_002';
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const roleQuery = activeTab === 'teaching' ? 'teacher' : 'learner';
      const response = await getUserSessions(activeUserId, roleQuery);
      // Backend returns filtered sessions and specific learning/teaching arrays
      const list = activeTab === 'teaching'
        ? (response.teachingSessions || response.sessions || [])
        : (response.learningSessions || response.sessions || []);
      setSessionList(list);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load session history.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, [user, activeTab]);

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
      setSuccessMessage(response.message || 'Review submitted successfully! Mentor reputation score updated.');

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
          Session History & Peer Reviews
        </h1>
        <p className="page-subtitle">
          Track completed sessions, review mentor evaluations, and inspect feedback from your community exchanges.
        </p>
      </div>

      {/* Role-Separated Tab Switcher */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => switchTab('learning')}
          className={`btn ${activeTab === 'learning' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Learning History (as Learner)
        </button>
        <button
          type="button"
          onClick={() => switchTab('teaching')}
          className={`btn ${activeTab === 'teaching' ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1, justifyContent: 'center' }}
        >
          Teaching History (as Mentor)
        </button>
      </div>

      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={fetchHistory} />}

      {isLoading && <Loader message={`Fetching ${activeTab === 'teaching' ? 'teaching' : 'learning'} session records...`} />}

      {!isLoading && !errorMessage && sessionList.length === 0 && (
        <EmptyState
          icon={<HistoryIcon size={36} />}
          title={activeTab === 'teaching' ? 'No teaching sessions found' : 'No learning sessions found'}
          description={activeTab === 'teaching'
            ? "You haven't conducted any mentoring sessions for students yet. Offer skills or check course requests to start teaching."
            : "You haven't scheduled or completed any learning sessions as a student yet."}
          actionButton={
            activeTab === 'teaching' ? (
              <Link to="/requests" className="btn btn-primary btn-sm">
                Browse Learner Requests
              </Link>
            ) : (
              <Link to="/booking" className="btn btn-primary btn-sm">
                Schedule a Session
              </Link>
            )
          }
        />
      )}

      {!isLoading && !errorMessage && sessionList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {sessionList.map((session) => {
            // Strictly query the opposite participant:
            // In Learning History, partner is mentor.
            // In Teaching History, partner is learner.
            const partner = activeTab === 'teaching'
              ? (session.learner || { name: 'Student' })
              : (session.mentor || { name: 'Mentor' });

            const formattedDate = new Date(session.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isCompleted = session.status === 'completed';
            const partnerAvatar = partner.avatar_url
              ? (partner.avatar_url.startsWith('http') ? partner.avatar_url : partner.avatar_url)
              : null;

            return (
              <div key={session.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {partnerAvatar ? (
                      <img
                        src={partnerAvatar}
                        alt={partner.name}
                        style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(99, 102, 241, 0.2)',
                          color: '#818cf8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '1rem',
                        }}
                      >
                        {(partner.name || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                        {activeTab === 'teaching' ? `Student: ${partner.name}` : `Mentor: ${partner.name}`}
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        {formattedDate} • <span style={{ color: activeTab === 'teaching' ? '#a78bfa' : '#60a5fa' }}>{activeTab === 'teaching' ? 'Teaching Session' : 'Learning Session'}</span>
                      </p>
                    </div>
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
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        {activeTab === 'teaching' ? 'Feedback from Student:' : 'Your Evaluation:'}
                      </span>
                      <StarRating rating={session.review.rating} />
                    </div>
                    {session.review.comment && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        "{session.review.comment}"
                      </p>
                    )}
                  </div>
                ) : activeTab === 'learning' && isCompleted && reviewingSessionId !== session.id ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      onClick={() => startReview(session)}
                      className="btn btn-sm btn-outline"
                    >
                      Leave a Review & Rating
                    </button>
                  </div>
                ) : null}

                {/* Inline Review Form (Learners rating their mentors) */}
                {activeTab === 'learning' && reviewingSessionId === session.id && (
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
