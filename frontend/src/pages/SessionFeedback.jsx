/**
 * ============================================================================
 * Session Feedback Page (src/pages/SessionFeedback.jsx)
 * ============================================================================
 * Dedicated learner feedback page for a single completed session.
 * - Route: /sessions/:sessionId/feedback
 * - Only the learner who attended the session can open and submit it (enforced by the API).
 * - Feedback is only available for completed sessions; pending, accepted, declined,
 *   and cancelled sessions show a clear explanation instead of the form.
 * - One submission per session: an already-submitted evaluation is shown read-only.
 * - Collects an exact 1-5 overall star rating plus five short structured questions
 *   and optional written comments. The selected star value is sent and stored as-is.
 * - After submission, confirms the feedback was recorded without showing the
 *   teacher's updated reputation score.
 * - Feedback is stored separately from chat messages.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSessionFeedback, submitSessionReview } from '../api/sessions.js';
import { StarRating } from '../components/StarRating.jsx';
import { Loader, ErrorState } from '../components/Feedback.jsx';
import { CheckIcon, HistoryIcon, CalendarIcon } from '../components/Icons.jsx';

const SCALE_OPTIONS = [
  { value: 1, label: 'Poor' },
  { value: 2, label: 'Fair' },
  { value: 3, label: 'Good' },
  { value: 4, label: 'Very good' },
  { value: 5, label: 'Excellent' },
];

// Fallback question set (the API returns the authoritative list)
const DEFAULT_QUESTIONS = [
  { key: 'clarity', label: 'Teaching Clarity', question: "How clear and easy to follow were the teacher's explanations?" },
  { key: 'interaction', label: 'Interaction & Q&A', question: 'How well did the teacher encourage questions and two-way interaction?' },
  { key: 'preparation', label: 'Session Preparation', question: 'How well-prepared and organized was the teacher for this session?' },
  { key: 'materials', label: 'Usefulness of Materials', question: 'How useful and relevant were the examples, exercises, or materials shared?' },
  { key: 'engagement', label: 'Respectful & Engaged', question: 'Was the teacher respectful, patient, and actively engaged throughout?' },
];

const STATUS_MESSAGES = {
  pending: 'This session request is still waiting for the teacher to respond. Feedback opens once the session is completed.',
  queued: 'This session request is still waiting for the teacher to respond. Feedback opens once the session is completed.',
  accepted: 'This session has been accepted but is not completed yet. Feedback opens once the session is marked completed.',
  confirmed: 'This session is confirmed but not completed yet. Feedback opens once the session is marked completed.',
  declined: 'This session request was declined, so there is no session to give feedback on.',
  cancelled: 'This session was cancelled, so feedback is not available.',
};

function formatSessionDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ScaleSelector({ name, value, onChange, disabled = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}
    >
      {SCALE_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '9999px',
              border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
              backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
              color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
              fontSize: '0.82rem',
              fontWeight: isSelected ? '700' : '500',
              cursor: disabled ? 'default' : 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease',
            }}
          >
            <span style={{ fontWeight: '700' }}>{opt.value}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SessionFeedback() {
  const { sessionId } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [canSubmit, setCanSubmit] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  const [overallRating, setOverallRating] = useState(0);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);

  const loadFeedbackContext = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await getSessionFeedback(sessionId);
      setSession(res.session || null);
      if (Array.isArray(res.questions) && res.questions.length > 0) {
        setQuestions(res.questions);
      }
      setCanSubmit(Boolean(res.canSubmitFeedback));
      setExistingReview(res.review || null);
    } catch (err) {
      setLoadError(err.message || 'Could not load this session.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadFeedbackContext();
  }, [loadFeedbackContext]);

  function setAnswer(key, value) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    const exactRating = Number(overallRating);
    if (!Number.isInteger(exactRating) || exactRating < 1 || exactRating > 5) {
      setFormError('Please choose an overall star rating from 1 to 5.');
      return;
    }

    const unanswered = questions.filter((q) => !Number.isInteger(answers[q.key]));
    if (unanswered.length > 0) {
      setFormError(`Please answer every question. Missing: ${unanswered.map((q) => q.label).join(', ')}.`);
      return;
    }

    const trimmedComment = comment.trim();
    if (trimmedComment.length > 1000) {
      setFormError('Written comments must be 1000 characters or fewer.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const structured = {};
      for (const q of questions) {
        structured[q.key] = answers[q.key];
      }
      const res = await submitSessionReview({
        sessionId,
        rating: exactRating,
        comment: trimmedComment,
        questions: structured,
      });
      setSubmittedReview(
        res.review || {
          rating: exactRating,
          comment: trimmedComment,
          questions: structured,
        }
      );
      setCanSubmit(false);
    } catch (err) {
      const msg = err.message || 'Failed to submit feedback.';
      setFormError(msg);
      // If the server reports a duplicate or ineligible state, refresh the page context
      if (/already been submitted|only be submitted|Only the learner/i.test(msg)) {
        loadFeedbackContext();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const teacherName = session?.mentor?.name || 'your teacher';
  const reviewToShow = submittedReview || existingReview;

  return (
    <div className="page" style={{ maxWidth: '760px' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link
          to="/history?view=learning"
          className="btn btn-sm btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <HistoryIcon size={15} />
          <span>Back to Learning History</span>
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <h1 className="page-title">Session Feedback</h1>
        <p className="page-subtitle">
          Tell us how your session went. Your answers help teachers improve and are shared with them without your name.
        </p>
      </div>

      {isLoading && <Loader message="Loading session details..." />}

      {!isLoading && loadError && <ErrorState message={loadError} onRetry={loadFeedbackContext} />}

      {!isLoading && !loadError && session && (
        <>
          {/* Session summary */}
          <div
            className="card"
            style={{
              padding: '1.1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-soft, rgba(37, 99, 235, 0.15))',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.05rem',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                <span>{teacherName.charAt(0).toUpperCase()}</span>
                {session.mentor?.avatar_url && (
                  <img
                    src={session.mentor.avatar_url}
                    alt={teacherName}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                  {session.topic || 'Learning Session'}
                </div>
                <div style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                  with {teacherName}
                  {session.scheduled_at && (
                    <>
                      {' '}
                      • <CalendarIcon size={13} /> {formatSessionDate(session.scheduled_at)}
                    </>
                  )}
                </div>
              </div>
            </div>
            <span className={`status-chip ${session.status}`}>
              {session.status ? session.status.charAt(0).toUpperCase() + session.status.slice(1) : ''}
            </span>
          </div>

          {/* Confirmation / already-submitted view */}
          {reviewToShow && (
            <div className="card" style={{ padding: '1.5rem' }}>
              {submittedReview && (
                <div
                  role="status"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.8rem 1rem',
                    marginBottom: '1.1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: 'var(--color-text-primary)',
                    fontWeight: '600',
                    fontSize: '0.92rem',
                  }}
                >
                  <CheckIcon size={18} />
                  <span>Thank you! Your feedback for this session has been recorded.</span>
                </div>
              )}

              <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>
                {submittedReview ? 'Your submitted feedback' : 'You already submitted feedback for this session'}
              </h2>
              <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
                Each completed session can be evaluated once. Your feedback is shared with {teacherName} without your name.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>
                  Overall rating:
                </span>
                <StarRating rating={Number(reviewToShow.rating)} showScore={false} />
                <span style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  {Number(reviewToShow.rating)} / 5
                </span>
              </div>

              {reviewToShow.questions && Object.keys(reviewToShow.questions).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {questions.map((q) => {
                    const val = reviewToShow.questions[q.key];
                    if (!val) return null;
                    const label = SCALE_OPTIONS.find((o) => o.value === Number(val))?.label || '';
                    return (
                      <div
                        key={q.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.55rem 0.8rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.86rem',
                        }}
                      >
                        <span style={{ color: 'var(--color-text-secondary)' }}>{q.label}</span>
                        <span style={{ fontWeight: '700', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                          {val} / 5 · {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {reviewToShow.comment && (
                <p
                  style={{
                    fontSize: '0.9rem',
                    color: 'var(--color-text-secondary)',
                    fontStyle: 'italic',
                    margin: '0 0 1rem',
                  }}
                >
                  “{reviewToShow.comment}”
                </p>
              )}

              <Link to="/history?view=learning" className="btn btn-primary btn-sm">
                Return to Learning History
              </Link>
            </div>
          )}

          {/* Ineligible session explanation */}
          {!reviewToShow && !canSubmit && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 className="card-title" style={{ marginBottom: '0.35rem' }}>
                Feedback isn’t available for this session
              </h2>
              <p className="card-subtitle" style={{ marginBottom: '1rem' }}>
                {STATUS_MESSAGES[session.status] || 'Feedback can only be submitted for completed sessions.'}
              </p>
              <Link to="/history?view=learning" className="btn btn-outline btn-sm">
                Back to Learning History
              </Link>
            </div>
          )}

          {/* Feedback form */}
          {!reviewToShow && canSubmit && (
            <form className="card" onSubmit={handleSubmit} style={{ padding: '1.5rem' }} noValidate>
              <div className="form-group" style={{ marginBottom: '1.4rem' }}>
                <label className="form-label" style={{ fontWeight: '700', display: 'block', marginBottom: '0.4rem' }}>
                  Overall, how would you rate this session?
                </label>
                <StarRating
                  rating={overallRating}
                  isInteractive={true}
                  showLabel={true}
                  onRatingChange={(value) => {
                    setOverallRating(value);
                    if (formError) setFormError(null);
                  }}
                />
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                  {overallRating > 0 ? `Selected: ${overallRating} of 5 stars` : 'Select from 1 (poor) to 5 (excellent) stars.'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginBottom: '1.4rem' }}>
                {questions.map((q, index) => (
                  <fieldset
                    key={q.key}
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.9rem 1rem',
                      margin: 0,
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    <legend
                      style={{
                        padding: '0 0.35rem',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {index + 1}. {q.label}
                    </legend>
                    <div style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)', marginBottom: '0.6rem' }}>
                      {q.question}
                    </div>
                    <ScaleSelector
                      name={q.label}
                      value={answers[q.key]}
                      onChange={(v) => setAnswer(q.key, v)}
                      disabled={isSubmitting}
                    />
                  </fieldset>
                ))}
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" htmlFor="session-feedback-comment" style={{ fontWeight: '700' }}>
                    Anything else you’d like to share? <span style={{ fontWeight: '400', color: 'var(--color-text-muted)' }}>(optional)</span>
                  </label>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: comment.length > 1000 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                    }}
                  >
                    {comment.length} / 1000
                  </span>
                </div>
                <textarea
                  id="session-feedback-comment"
                  className="form-textarea"
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="What went well, and what could make the next session even better?"
                  disabled={isSubmitting}
                />
              </div>

              {formError && (
                <div
                  role="alert"
                  style={{
                    padding: '0.65rem 0.9rem',
                    marginBottom: '1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--color-danger)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}
                >
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
                <Link to="/history?view=learning" className="btn btn-secondary">
                  Cancel
                </Link>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.85rem', marginBottom: 0 }}>
                Feedback can be submitted once per session and is shared with your teacher without your name.
              </p>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default SessionFeedback;

