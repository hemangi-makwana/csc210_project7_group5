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

import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getUserSessions,
  completeSession,
} from '../api/sessions.js';
import { StarRating } from '../components/StarRating.jsx';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { HistoryIcon, MessageIcon } from '../components/Icons.jsx';

export function LearningHistory() {
  const { user, isTeacher, isLearner, setMode } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const prevViewParamRef = useRef(null);
  const prevIsTeacherRef = useRef(isTeacher);

  // Synchronize URL ?view= param and active mode without blocking the header mode toggle:
  // - If the user clicked the Learner/Teacher toggle in TopHeader (isTeacher changed), update ?view= to match.
  // - If the user navigated to a specific ?view=teaching or ?view=learning link, align mode to that link.
  useEffect(() => {
    const modeChanged = prevIsTeacherRef.current !== isTeacher;
    const viewChanged = prevViewParamRef.current !== viewParam;

    if (modeChanged) {
      prevIsTeacherRef.current = isTeacher;
      const targetView = isTeacher ? 'teaching' : 'learning';
      if (viewParam !== targetView) {
        prevViewParamRef.current = targetView;
        setSearchParams({ view: targetView }, { replace: true });
      }
      return;
    }

    if (viewChanged) {
      prevViewParamRef.current = viewParam;
      if (viewParam === 'teaching' && !isTeacher) {
        prevIsTeacherRef.current = true;
        setMode('teacher');
      } else if (viewParam === 'learning' && isTeacher) {
        prevIsTeacherRef.current = false;
        setMode('learner');
      }
    }
  }, [viewParam, isTeacher, setMode, setSearchParams]);

  // Active role view: locked strictly to current active mode
  const currentRole = isTeacher ? 'teacher' : 'learner';
  const [sessionList, setSessionList] = useState([]);
  const [pendingIncomingCount, setPendingIncomingCount] = useState(0);
  const [anonymousFeedback, setAnonymousFeedback] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchHistory = React.useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getUserSessions(user.id, currentRole);
      if (isTeacher) {
        const allTeaching = response.teachingSessions || [];
        const pendingReqs = response.incomingRequests || allTeaching.filter(
          (s) => s.status === 'pending' || s.status === 'queued'
        );
        const nonPendingTeaching = response.acceptedTeachingSessions || allTeaching.filter(
          (s) => s.status !== 'pending' && s.status !== 'queued'
        );
        setPendingIncomingCount(pendingReqs.length);
        setSessionList(nonPendingTeaching);
        setAnonymousFeedback(Array.isArray(response.anonymousFeedback) ? response.anonymousFeedback : []);
        setFeedbackSummary(response.feedbackSummary || null);
      } else {
        setPendingIncomingCount(0);
        setSessionList(response.learningSessions || []);
        setAnonymousFeedback([]);
        setFeedbackSummary(null);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load session history.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isTeacher, currentRole]);

  useEffect(() => {
    // Immediately clear previous role's sessions so mode switching never mixes histories
    setSessionList([]);
    setPendingIncomingCount(0);
    setAnonymousFeedback([]);
    setFeedbackSummary(null);
    fetchHistory();
  }, [fetchHistory]);

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

  const teacherReviewCount = feedbackSummary?.reviewCount ?? anonymousFeedback.length;
  const teacherReputation = feedbackSummary?.reputationScore ?? null;

  return (
    <div className="page" style={{ maxWidth: '850px' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.8rem', fontWeight: '800' }}>
          {isTeacher ? 'Teaching Sessions & History' : 'Learning Sessions & History'}
        </h1>
        <p className="page-subtitle" style={{ color: 'var(--color-text-muted)' }}>
          {isTeacher
            ? 'Conduct accepted teaching sessions, join live calls, and review anonymous learner feedback. Pending learner requests are managed in Incoming Learner Requests.'
            : 'Track upcoming sessions, coordinate with your mentors, and give feedback on completed sessions.'}
        </p>
      </div>

      {/* Pending Incoming Learner Requests Notice for Teachers */}
      {isTeacher && !isLoading && pendingIncomingCount > 0 && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderLeft: '4px solid var(--color-teacher)',
            backgroundColor: 'rgba(124, 58, 237, 0.08)',
          }}
        >
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
              You have {pendingIncomingCount} pending learner {pendingIncomingCount === 1 ? 'request' : 'requests'} awaiting review
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
              Review and accept or decline new learner booking requests in the dedicated Incoming Learner Requests section.
            </div>
          </div>
          <Link to="/requests" className="btn btn-primary btn-sm">
            Go to Incoming Learner Requests ({pendingIncomingCount})
          </Link>
        </div>
      )}

      {/* Teacher Reputation & Anonymous Feedback Summary */}
      {isTeacher && !isLoading && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: teacherReviewCount > 0 ? '1rem' : 0,
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>
                Your Teaching Reputation
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
                <StarRating
                  rating={teacherReviewCount > 0 && teacherReputation ? teacherReputation : 0}
                  count={teacherReviewCount}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <div>
                <strong>{sessionList.filter((s) => s.status === 'completed').length}</strong> Completed Sessions
              </div>
              <div>
                <strong>{teacherReviewCount}</strong> Learner {teacherReviewCount === 1 ? 'Evaluation' : 'Evaluations'}
              </div>
            </div>
          </div>

          {teacherReviewCount > 0 && feedbackSummary && (
            <>
              {Array.isArray(feedbackSummary.dimensionBreakdown) && feedbackSummary.dimensionBreakdown.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                  {feedbackSummary.dimensionBreakdown.map((d) => (
                    <div
                      key={d.key}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>{d.label}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '9999px', backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.max(0, Math.min(100, (Number(d.average) / 5) * 100))}%`,
                              height: '100%',
                              backgroundColor: Number(d.average) >= 4 ? 'var(--color-emerald, #10b981)' : '#f59e0b',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {Number(d.average).toFixed(1)} / 5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {Array.isArray(feedbackSummary.improvementAreas) && feedbackSummary.improvementAreas.length > 0 ? (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-text-primary)', marginBottom: '0.4rem' }}>
                    Areas to improve
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {feedbackSummary.improvementAreas.map((a) => (
                      <li key={a.key} style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                        <strong>{a.label}</strong> ({Number(a.average).toFixed(1)} / 5): {a.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
                  Learners rate every area highly. Keep up the great work!
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Anonymous learner feedback list (teacher view) */}
      {isTeacher && !isLoading && anonymousFeedback.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Learner Feedback</h2>
          <p className="card-subtitle" style={{ marginBottom: '0.9rem' }}>
            Feedback is shown anonymously. Learner names are never attached to individual evaluations.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {anonymousFeedback.map((fb) => (
              <div
                key={fb.id}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>Anonymous Learner</span>
                    <StarRating rating={fb.rating} showScore={false} />
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{fb.rating} / 5</span>
                    {fb.topic && (
                      <span style={{ fontSize: '0.74rem', padding: '0.1rem 0.5rem', borderRadius: '9999px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--color-primary)', fontWeight: '600' }}>
                        {fb.topic}
                      </span>
                    )}
                  </div>
                  {fb.created_at && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                {fb.comment && (
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
                    â€œ{fb.comment}â€
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {successMessage && <SuccessState message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={fetchHistory} />}

      {isLoading && <Loader message={`Loading ${currentRole} session records...`} />}

      {!isLoading && !errorMessage && sessionList.length === 0 && (
        <EmptyState
          icon={<HistoryIcon size={36} />}
          title={isTeacher ? 'No accepted or completed teaching sessions yet' : 'No learning sessions found'}
          description={
            isTeacher
              ? pendingIncomingCount > 0
                ? `You have ${pendingIncomingCount} pending learner ${pendingIncomingCount === 1 ? 'request' : 'requests'} waiting in Incoming Learner Requests. Accept a request there to schedule your teaching session!`
                : 'You have no accepted or completed teaching sessions yet. Check Incoming Learner Requests for new learner requests or verify your skills.'
              : 'You have not booked any mentorship sessions yet. Explore available courses or mentors to start learning!'
          }
          actionButton={
            isTeacher ? (
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/requests" className="btn btn-primary btn-sm">
                  View Incoming Learner Requests{pendingIncomingCount > 0 ? ` (${pendingIncomingCount})` : ''}
                </Link>
                <Link to="/teacher-verification" className="btn btn-secondary btn-sm">
                  Teacher Verification
                </Link>
              </div>
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
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)', margin: 0 }}>
                        {isTeacher ? `Student: ${partner.name}` : `Teacher: ${partner.name}`}
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        {formattedDate} â€¢ <strong>{isTeacher ? 'Teaching Session' : 'Learning Session'}</strong>
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

                {/* Learner: submitted evaluation (exact star value) or link to dedicated feedback page */}
                {isLearner && isCompleted && session.review && (
                  <div style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem 1rem',
                    marginTop: '0.85rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          Your feedback:
                        </span>
                        <StarRating rating={Number(session.review.rating)} showScore={false} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                          {Number(session.review.rating)} / 5
                        </span>
                      </div>
                      <Link to={`/sessions/${encodeURIComponent(session.id)}/feedback`} className="btn btn-sm btn-outline">
                        View Feedback
                      </Link>
                    </div>
                    {session.review.comment && (
                      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', fontStyle: 'italic', margin: 0 }}>
                        â€œ{session.review.comment}â€
                      </p>
                    )}
                  </div>
                )}

                {isLearner && isCompleted && !session.review && (
                  <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link
                      to={`/sessions/${encodeURIComponent(session.id)}/feedback`}
                      className="btn btn-sm btn-primary"
                    >
                      Give Session Feedback
                    </Link>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      Rate this session and answer five quick questions.
                    </span>
                  </div>
                )}

                {/* Teacher: no per-session learner attribution of feedback (privacy) */}
                {isTeacher && isCompleted && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Session completed â€¢ Learner feedback appears anonymously in your feedback summary above.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
