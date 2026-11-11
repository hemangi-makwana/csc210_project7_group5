/**
 * ============================================================================
 * Learning History & Peer Reviews Page (src/pages/LearningHistory.jsx)
 * ============================================================================
 * Strictly separates Learner vs Teacher histories according to active mode:
 * - Learner mode shows only sessions where the user was the learner.
 * - Teacher mode shows only sessions where the user was the teacher.
 * - Provides Accept / Decline actions for teachers on pending requests.
 * - Provides Mark Completed action for accepted sessions.
 * - Shows feedback form only to learner on completed sessions (1 review limit).
 * - Displays coordination conversation link and decline reason transparency.
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getUserSessions,
  submitSessionReview,
  acceptSession,
  declineSession,
  completeSession,
} from '../api/sessions.js';
import { StarRating } from '../components/StarRating.jsx';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { HistoryIcon, CalendarIcon, CheckIcon, MessageIcon } from '../components/Icons.jsx';

export function LearningHistory() {
  const { user, isTeacher, isLearner, setMode } = useAuth();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');

  // Synchronize view query param with active mode if specified
  useEffect(() => {
    if (viewParam === 'teaching' && !isTeacher) {
      setMode('teacher');
    } else if (viewParam === 'learning' && isTeacher) {
      setMode('learner');
    }
  }, [viewParam, isTeacher, setMode]);

  // Active role view: locked strictly to current active mode
  const currentRole = isTeacher ? 'teacher' : 'learner';
  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Review state (Learners on completed sessions)
  const [reviewingSessionId, setReviewingSessionId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewFormError, setReviewFormError] = useState(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Decline modal state
  const [decliningSessionId, setDecliningSessionId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);

  const fetchHistory = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getUserSessions(user.id, currentRole);
      // Strictly isolate role records: teaching sessions only in teacher mode, learning sessions only in learner mode
      const list = isTeacher
        ? (response.teachingSessions || [])
        : (response.learningSessions || []);
      setSessionList(list);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load session history.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isTeacher, currentRole]);

  useEffect(() => {
    // Immediately clear previous role's sessions so mode switching never mixes histories
    setSessionList([]);
    fetchHistory();
  }, [fetchHistory]);

  // Teacher Accept action
  async function handleAcceptSession(sessionId) {
    setErrorMessage(null);
    try {
      await acceptSession(sessionId);
      setSuccessMessage('Session booking accepted! The learner has been notified.');
      await fetchHistory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to accept session booking.');
    }
  }

  // Teacher Decline action
  async function handleDeclineSession(e) {
    e.preventDefault();
    if (!decliningSessionId) return;

    setIsDeclining(true);
    setErrorMessage(null);

    try {
      await declineSession(decliningSessionId, declineReason.trim());
      setSuccessMessage('Session booking declined. Coordination thread closed.');
      setDecliningSessionId(null);
      setDeclineReason('');
      await fetchHistory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to decline session booking.');
    } finally {
      setIsDeclining(false);
    }
  }

  // Mark Completed action
  async function handleCompleteSession(sessionId) {
    setErrorMessage(null);
    try {
      await completeSession(sessionId);
      setSuccessMessage('Session marked as completed! Feedback is now unlocked for the learner.');
      await fetchHistory();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark session completed.');
    }
  }

  function startReview(session) {
    setReviewingSessionId(session.id);
    setReviewRating(5);
    setReviewComment('');
    setReviewFormError(null);
  }

  async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!reviewingSessionId) return;

    const numRating = Number(reviewRating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      setReviewFormError('Please select a star rating between 1 and 5.');
      return;
    }

    const trimmedComment = (reviewComment || '').trim();
    if (!trimmedComment) {
      setReviewFormError('Please share brief written feedback about your session.');
      return;
    }
    if (trimmedComment.length > 1000) {
      setReviewFormError('Written feedback must be 1000 characters or fewer.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewFormError(null);
    setErrorMessage(null);

    try {
      const payload = {
        sessionId: reviewingSessionId,
        rating: numRating,
        comment: trimmedComment,
      };

      const response = await submitSessionReview(payload);
      const updatedRep = response.updatedReputation !== undefined && response.updatedReputation !== null
        ? Number(response.updatedReputation)
        : null;
      const repNote = updatedRep !== null && !Number.isNaN(updatedRep)
        ? ` Teacher's updated reputation score is ★ ${updatedRep.toFixed(2)}.`
        : '';

      setSuccessMessage(
        `${response.message || 'Review submitted!'}${repNote}`
      );

      setSessionList((prevSessions) =>
        prevSessions.map((sess) => {
          if (sess.id === reviewingSessionId) {
            const nextMentor = sess.mentor
              ? {
                  ...sess.mentor,
                  reputation_score: updatedRep !== null ? updatedRep : sess.mentor.reputation_score,
                  review_count: (Number(sess.mentor.review_count) || 0) + 1,
                }
              : sess.mentor;
            return {
              ...sess,
              mentor: nextMentor,
              review: {
                id: response.review?.id || `rev_${Date.now()}`,
                rating: numRating,
                comment: trimmedComment,
                created_at: response.review?.created_at || new Date().toISOString(),
              },
            };
          }
          return sess;
        })
      );

      setReviewingSessionId(null);
      setReviewComment('');
    } catch (error) {
      setReviewFormError(error.message || 'Failed to submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
  }

  // Compute teacher's review summary from teaching sessions when in Teacher mode
  const receivedReviews = isTeacher
    ? sessionList.filter((s) => s.review && Number(s.review.rating) >= 1)
    : [];
  const latestTeacherRep = isTeacher && sessionList.length > 0 && sessionList[0].mentor?.reputation_score
    ? Number(sessionList[0].mentor.reputation_score)
    : (user?.reputation_score ? Number(user.reputation_score) : null);

  return (
    <div className="page" style={{ maxWidth: '850px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: '800' }}>
          {isTeacher ? 'Teaching Sessions & History' : 'Learning Sessions & History'}
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--color-text-muted)' }}>
          {isTeacher
            ? 'Manage incoming booking requests from learners, conduct scheduled sessions, and review student feedback.'
            : 'Track upcoming sessions, coordinate with your mentors, and leave evaluations for completed sessions.'}
        </p>
      </div>

      {/* Teacher Reputation & Feedback Summary Banner */}
      {isTeacher && !isLoading && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
              Your Teaching Reputation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
              <StarRating
                rating={receivedReviews.length > 0 && latestTeacherRep ? latestTeacherRep : 0}
                count={receivedReviews.length}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
            <div>
              <strong>{sessionList.filter((s) => s.status === 'completed').length}</strong> Completed Sessions
            </div>
            <div>
              <strong>{receivedReviews.length}</strong> Student {receivedReviews.length === 1 ? 'Review' : 'Reviews'}
            </div>
          </div>
        </div>
      )}

      {successMessage && <SuccessState message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={fetchHistory} />}

      {isLoading && <Loader message={`Loading ${currentRole} session records...`} />}

      {!isLoading && !errorMessage && sessionList.length === 0 && (
        <EmptyState
          icon={<HistoryIcon size={36} />}
          title={isTeacher ? 'No teaching sessions found' : 'No learning sessions found'}
          description={
            isTeacher
              ? 'You have no teaching requests or sessions yet. Verify your skills to receive mentorship bookings.'
              : 'You have not booked any mentorship sessions yet. Explore available courses or mentors to start learning!'
          }
          actionButton={
            isTeacher ? (
              <Link to="/teacher-verification" className="btn btn-primary btn-sm">
                Go to Teacher Verification
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
            const partner = isTeacher
              ? (session.learner || { name: 'Student' })
              : (session.mentor || { name: 'Teacher' });

            const formattedDate = new Date(session.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const isPending = session.status === 'pending' || session.status === 'queued';
            const isAccepted = session.status === 'accepted' || session.status === 'confirmed';
            const isCompleted = session.status === 'completed';
            const isDeclined = session.status === 'declined';

            return (
              <div key={session.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: isTeacher ? 'rgba(124, 58, 237, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                        color: isTeacher ? 'var(--color-teacher)' : 'var(--color-learner)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '1rem',
                      }}
                    >
                      {(partner.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                          {isTeacher ? `Student: ${partner.name}` : `Teacher: ${partner.name}`}
                        </h3>
                        {isLearner && partner.reputation_score !== undefined && (
                          <span
                            style={{
                              fontSize: '0.76rem',
                              fontWeight: '600',
                              color: '#f59e0b',
                              backgroundColor: 'rgba(245, 158, 11, 0.12)',
                              padding: '0.12rem 0.5rem',
                              borderRadius: '9999px',
                            }}
                            title="Teacher's current bounded reputation score"
                          >
                            {Number(partner.review_count) > 0
                              ? `★ ${Number(partner.reputation_score).toFixed(2)} (${partner.review_count})`
                              : 'No reviews yet'}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        {formattedDate} • <strong>{isTeacher ? 'Teaching Session' : 'Learning Session'}</strong>
                      </p>
                    </div>
                  </div>

                  <span className={`status-chip ${session.status}`}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </span>
                </div>

                {session.topic && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Topic: </span>
                    <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>{session.topic}</span>
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

                {/* Declined Reason Display */}
                {isDeclined && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      fontSize: '0.88rem',
                      color: 'var(--color-danger)',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <strong>Session Declined:</strong> {session.declined_reason || 'Teacher was unavailable at requested time.'} (Coordination thread closed)
                  </div>
                )}

                {/* Action Buttons: Accept / Decline (Teachers) */}
                {isTeacher && isPending && (
                  <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAcceptSession(session.id)}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                    >
                      ✓ Accept Booking
                    </button>
                    <button
                      onClick={() => setDecliningSessionId(session.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      Decline...
                    </button>
                    <Link
                      to={session.conversation_id ? `/messages?conversationId=${session.conversation_id}` : `/messages?userId=${encodeURIComponent(partner.id)}`}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <MessageIcon size={16} />
                      Coordinate in Chat
                    </Link>
                  </div>
                )}

                {/* Learner Pending Coordination */}
                {isLearner && isPending && (
                  <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <Link
                      to={session.conversation_id ? `/messages?conversationId=${session.conversation_id}` : `/messages?userId=${encodeURIComponent(partner.id)}`}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <MessageIcon size={16} />
                      Coordinate in Chat
                    </Link>
                  </div>
                )}

                {/* Mark Completed & Live Session Actions (for Accepted sessions) */}
                {isAccepted && (
                  <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleCompleteSession(session.id)}
                      className="btn btn-outline btn-sm"
                      style={{ fontWeight: '700' }}
                    >
                      Mark Session Completed
                    </button>
                    <Link
                      to={session.conversation_id ? `/messages?conversationId=${session.conversation_id}` : `/messages?userId=${encodeURIComponent(partner.id)}`}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <MessageIcon size={16} />
                      Chat with {partner.name}
                    </Link>
                    <Link
                      to={session.conversation_id ? `/messages?conversationId=${session.conversation_id}&startCall=video` : `/messages?userId=${encodeURIComponent(partner.id)}&startCall=video`}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      📹 Start / Join Session Call
                    </Link>
                  </div>
                )}

                {/* Existing Review Display */}
                {session.review ? (
                  <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem 1rem',
                    marginTop: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {isTeacher ? 'Feedback from Learner:' : 'Your Submitted Evaluation:'}
                        </span>
                        <StarRating rating={session.review.rating} />
                      </div>
                      {session.review.created_at && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          Reviewed {new Date(session.review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {session.review.comment && (
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
                        "{session.review.comment}"
                      </p>
                    )}
                  </div>
                ) : isLearner && isCompleted && reviewingSessionId !== session.id ? (
                  <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => startReview(session)}
                      className="btn btn-sm btn-primary"
                    >
                      Leave Rating & Feedback
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Share your rating and written review for this completed session.
                    </span>
                  </div>
                ) : isTeacher && isCompleted && !session.review ? (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Session completed • Awaiting learner feedback
                  </div>
                ) : null}

                {/* Inline Review Form (Only Learner on completed session, 1 review limit) */}
                {isLearner && isCompleted && !session.review && reviewingSessionId === session.id && (
                  <form onSubmit={handleReviewSubmit} style={{
                    marginTop: '1rem',
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-primary)'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '0.25rem', color: 'var(--color-text-primary)' }}>
                      Evaluate Completed Session with {partner.name}
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.85rem' }}>
                      One evaluation is permitted per completed session. Your rating updates {partner.name}&apos;s mentor reputation.
                    </p>

                    {reviewFormError && (
                      <div
                        style={{
                          padding: '0.6rem 0.85rem',
                          marginBottom: '0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: 'var(--color-danger)',
                          fontSize: '0.83rem',
                          fontWeight: '600',
                        }}
                      >
                        {reviewFormError}
                      </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label" style={{ fontWeight: '600' }}>Rating (1 to 5 Stars)</label>
                      <StarRating
                        rating={reviewRating}
                        isInteractive={true}
                        showLabel={true}
                        onRatingChange={(newRating) => {
                          setReviewRating(newRating);
                          if (reviewFormError) setReviewFormError(null);
                        }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label className="form-label" htmlFor={`review-comment-${session.id}`} style={{ fontWeight: '600' }}>
                          Written Feedback
                        </label>
                        <span style={{ fontSize: '0.75rem', color: reviewComment.length > 1000 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          {reviewComment.length} / 1000
                        </span>
                      </div>
                      <textarea
                        id={`review-comment-${session.id}`}
                        className="form-textarea"
                        rows="3"
                        maxLength={1000}
                        value={reviewComment}
                        onChange={(e) => {
                          setReviewComment(e.target.value);
                          if (reviewFormError) setReviewFormError(null);
                        }}
                        placeholder="Share what went well during your session (e.g., clear explanations, practical code walkthroughs, helpful Q&A)..."
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
                        onClick={() => {
                          setReviewingSessionId(null);
                          setReviewFormError(null);
                        }}
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

      {/* Decline Reason Modal */}
      {decliningSessionId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.75rem' }}>
              Decline Session Request
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Please provide a polite reason for declining this request. The learner will be notified and the coordination thread will be closed.
            </p>
            <form onSubmit={handleDeclineSession}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: '600' }}>Reason for Declining</label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g., Schedule conflict at requested time; please reschedule for next week..."
                  className="form-textarea"
                  rows={3}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDecliningSessionId(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeclining}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                >
                  {isDeclining ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
