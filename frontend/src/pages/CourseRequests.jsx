/**
 * ============================================================================
 * Course & Skill Requests & Incoming Learner Requests (src/pages/CourseRequests.jsx)
 * ============================================================================
 * - In Teacher Mode: Displays the dedicated "Incoming Learner Requests" section
 *   for pending 1:1 learner session bookings (with Accept / Decline / Chat actions),
 *   followed by open community skill requests.
 * - In Learner Mode: Allows learners to request any legitimate course or skill
 *   (including skills not yet in the approved catalog), offering spelling
 *   suggestions when close to an existing catalog skill while still allowing
 *   submission as a new pending skill request.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createCourseRequest,
  getMyCourseRequests,
  getAllCourseRequests,
  respondToCourseRequest,
} from '../api/courseRequests.js';
import { getSkillCatalog } from '../api/skills.js';
import {
  getUserSessions,
  acceptSession,
  declineSession,
} from '../api/sessions.js';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { RequestIcon, CheckIcon, SkillsIcon, MessageIcon, CalendarIcon } from '../components/Icons.jsx';

const CATEGORIES = [
  'Programming & Software',
  'Data Science & AI',
  'Cloud & DevOps',
  'UI/UX & Design',
  'Academics & Mathematics',
  'Social Sciences & Psychology',
  'Sports & Athletics',
  'Arts & Creative',
  'Productivity & Analytics',
  'Languages & Communication',
  'Other / Interdisciplinary',
];

function levenshteinDistance(s1, s2) {
  const a = (s1 || '').toLowerCase().trim();
  const b = (s2 || '').toLowerCase().trim();
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function CourseRequests() {
  const { user, isAuthenticated, isTeacher } = useAuth();

  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [requestsList, setRequestsList] = useState([]);
  const [incomingBookings, setIncomingBookings] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [acceptedSessionBanner, setAcceptedSessionBanner] = useState(null);

  // New Request Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [titleSuggestion, setTitleSuggestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Teacher 1:1 booking decline modal state
  const [decliningSessionId, setDecliningSessionId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclining, setIsDeclining] = useState(false);
  const [processingSessionId, setProcessingSessionId] = useState(null);

  // Teacher community course request response inline state
  const [respondingToId, setRespondingToId] = useState(null);
  const [teacherResponseMessage, setTeacherResponseMessage] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const loadRequests = useCallback(async (tab = activeTab) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const promises = [
        tab === 'my' && user ? getMyCourseRequests() : getAllCourseRequests(),
        getSkillCatalog().catch(() => ({ catalog: [] })),
      ];
      if (isTeacher && user?.id) {
        promises.push(getUserSessions(user.id, 'teacher').catch(() => ({ teachingSessions: [], incomingRequests: [] })));
      }

      const [reqRes, catRes, teacherSessRes] = await Promise.all(promises);
      setRequestsList(reqRes.courseRequests || reqRes.requests || []);
      setCatalog(catRes.catalog || []);

      if (isTeacher && teacherSessRes) {
        const pendingList =
          teacherSessRes.incomingRequests ||
          (teacherSessRes.teachingSessions || []).filter(
            (s) => s.status === 'pending' || s.status === 'queued'
          );
        setIncomingBookings(pendingList);
      } else {
        setIncomingBookings([]);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load requests.');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, user, isTeacher]);

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, user, isTeacher, loadRequests]);

  // Teacher Accept 1:1 Learner Booking Request
  async function handleAcceptBooking(session) {
    if (!session?.id) return;
    setProcessingSessionId(session.id);
    setErrorMessage(null);
    setAcceptedSessionBanner(null);
    try {
      await acceptSession(session.id);
      setIncomingBookings((prev) => prev.filter((item) => item.id !== session.id));
      setAcceptedSessionBanner({
        id: session.id,
        topic: session.topic || 'Mentoring Session',
        learnerName: session.learner?.name || 'Learner',
      });
      setSuccessMessage(
        `Accepted session request from ${session.learner?.name || 'Learner'} for "${session.topic || 'Mentoring Session'}". It is now in your Teaching Sessions!`
      );
    } catch (err) {
      setErrorMessage(err.message || 'Failed to accept learner booking request.');
    } finally {
      setProcessingSessionId(null);
    }
  }

  // Teacher Decline 1:1 Learner Booking Request
  async function handleDeclineBooking(event) {
    event.preventDefault();
    if (!decliningSessionId) return;
    setIsDeclining(true);
    setErrorMessage(null);
    try {
      await declineSession(decliningSessionId, declineReason.trim());
      setIncomingBookings((prev) => prev.filter((item) => item.id !== decliningSessionId));
      setSuccessMessage('Learner booking request declined. The learner has been notified.');
      setDecliningSessionId(null);
      setDeclineReason('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to decline learner booking request.');
    } finally {
      setIsDeclining(false);
    }
  }

  async function submitCourseRequestPayload(finalTitle, selectedCategory = category) {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await createCourseRequest({
        title: finalTitle,
        description: description.trim(),
        category: selectedCategory,
      });

      setSuccessMessage(res.message || `Course request for "${finalTitle}" submitted successfully!`);
      setTitle('');
      setDescription('');
      setTitleSuggestion(null);
      setShowCreateModal(false);
      await loadRequests(activeTab);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit course request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateRequest(event, forceAsNewSkill = false) {
    if (event) event.preventDefault();
    const cleanTitle = title.trim().replace(/\s+/g, ' ');
    if (!cleanTitle || cleanTitle.length < 2) {
      setErrorMessage('Please enter a course or skill title (at least 2 characters).');
      return;
    }

    const cleanLower = cleanTitle.toLowerCase();
    const exactMatch = catalog.find((c) => c.name.toLowerCase() === cleanLower);

    if (exactMatch) {
      setTitleSuggestion(null);
      await submitCourseRequestPayload(exactMatch.name, exactMatch.category || category);
      return;
    }

    // If not an exact catalog match, check if it's a close spelling typo of a catalog skill
    if (!forceAsNewSkill) {
      let closest = null;
      let minDistance = Infinity;
      const maxThreshold = cleanLower.length >= 8 ? 3 : 2;
      for (const item of catalog) {
        const dist = levenshteinDistance(cleanLower, item.name);
        if (dist <= maxThreshold && dist < minDistance) {
          minDistance = dist;
          closest = item;
        }
      }

      if (closest && titleSuggestion?.name !== closest.name) {
        setTitleSuggestion(closest);
        return;
      }
    }

    // Submit as a legitimate pending course request even when absent from the approved catalog
    setTitleSuggestion(null);
    await submitCourseRequestPayload(cleanTitle, category);
  }

  async function handleSendTeacherResponse(requestId) {
    if (!requestId) return;
    setIsSubmittingResponse(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await respondToCourseRequest(requestId, teacherResponseMessage);
      setSuccessMessage(res.message || 'Response sent! The learner has been notified.');
      setRespondingToId(null);
      setTeacherResponseMessage('');
      loadRequests(activeTab);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit response.');
    } finally {
      setIsSubmittingResponse(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '960px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">
            {isTeacher ? 'Incoming Learner Requests' : 'Course & Skill Requests'}
          </h1>
          <p className="page-subtitle">
            {isTeacher
              ? 'Review and accept or decline pending 1:1 learner session requests, or offer to teach open community skill requests.'
              : 'Cannot find a skill or verified mentor yet? Request any skill here — even topics not yet in the catalog — to get notified when a mentor offers it.'}
          </p>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => {
              setShowCreateModal(!showCreateModal);
              setTitleSuggestion(null);
              setErrorMessage(null);
            }}
            className="btn btn-primary"
            style={{ gap: '0.4rem' }}
          >
            <RequestIcon size={18} />
            <span>Request a Skill</span>
          </button>
        )}
      </div>

      {successMessage && <SuccessState message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={() => loadRequests(activeTab)} />}

      {/* Banner linking to Teaching Sessions after accepting a learner request */}
      {isTeacher && acceptedSessionBanner && (
        <div
          className="card"
          style={{
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderLeft: '4px solid var(--color-success)',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontWeight: '700', color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
              Session Accepted: &ldquo;{acceptedSessionBanner.topic}&rdquo; with {acceptedSessionBanner.learnerName}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
              This session has moved to your Teaching Sessions &amp; History where you can launch live calls or mark it completed.
            </div>
          </div>
          <Link to="/history?view=teaching" className="btn btn-primary btn-sm">
            View in Teaching Sessions →
          </Link>
        </div>
      )}

      {/* Create Request Form Drawer / Modal */}
      {showCreateModal && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Request a Course or Skill</h2>
            <button
              onClick={() => {
                setShowCreateModal(false);
                setTitleSuggestion(null);
              }}
              className="btn btn-sm btn-outline"
            >
              Cancel
            </button>
          </div>
          <p className="card-subtitle">
            Request any legitimate skill or course topic. If it is not yet in our curated catalog, it will be saved as a pending skill request for teachers to fulfill.
          </p>

          <form onSubmit={(e) => handleCreateRequest(e, false)}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-title">Skill or Course Title</label>
              <input
                id="req-title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleSuggestion) setTitleSuggestion(null);
                }}
                placeholder="e.g. Football, Machine Learning, Photography, Astrophysics, Rust..."
                required
              />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="req-cat">Domain / Category</label>
                <select
                  id="req-cat"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="req-desc">Description / Desired Goals</label>
                <textarea
                  id="req-desc"
                  className="form-textarea"
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What concepts or practical goals would you like covered?"
                />
              </div>
            </div>

            {titleSuggestion && (
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                fontSize: '0.88rem',
              }}>
                <div>
                  <strong>Spelling suggestion:</strong> Did you mean{' '}
                  <strong>&ldquo;{titleSuggestion.name}&rdquo;</strong> ({titleSuggestion.category}) in the catalog, or do you want to request{' '}
                  <strong>&ldquo;{title.trim()}&rdquo;</strong> as a new skill?
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      const suggestedName = titleSuggestion.name;
                      const suggestedCat = titleSuggestion.category || category;
                      setTitle(suggestedName);
                      setTitleSuggestion(null);
                      submitCourseRequestPayload(suggestedName, suggestedCat);
                    }}
                    className="btn btn-sm btn-primary"
                  >
                    Use &ldquo;{titleSuggestion.name}&rdquo;
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={(e) => handleCreateRequest(e, true)}
                    className="btn btn-sm btn-secondary"
                  >
                    Request &ldquo;{title.trim()}&rdquo; as New Skill
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Post Request'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setTitleSuggestion(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEDICATED INCOMING LEARNER SESSION REQUESTS SECTION (Teacher Mode) */}
      {isTeacher && (
        <div style={{ marginBottom: '2.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: 'var(--color-text-primary)' }}>
                Pending 1:1 Learner Session Requests ({incomingBookings.length})
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                Direct session booking requests from learners waiting for your acceptance or decline.
              </p>
            </div>
            <Link to="/history?view=teaching" className="btn btn-outline btn-sm">
              View Accepted Teaching Sessions →
            </Link>
          </div>

          {!isLoading && incomingBookings.length === 0 ? (
            <div className="card" style={{ padding: '1.25rem 1.5rem', backgroundColor: 'var(--color-bg-secondary)' }}>
              <div style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                No pending 1:1 learner session requests right now.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                When a learner books a session with you, it will appear here for you to accept or decline. Accepted sessions appear in Teaching Sessions.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {incomingBookings.map((session) => {
                const learner = session.learner || { name: 'Learner' };
                const formattedDate = new Date(session.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isBusy = processingSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className="card"
                    style={{
                      padding: '1.35rem 1.5rem',
                      borderLeft: '4px solid var(--color-teacher)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(124, 58, 237, 0.15)',
                            color: 'var(--color-teacher)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                          }}
                        >
                          {(learner.name || 'L').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: 'var(--color-text-primary)' }}>
                            Learner: {learner.name}
                          </h3>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                            Requested for {formattedDate}
                          </div>
                        </div>
                      </div>

                      <span className="status-chip pending">
                        Pending Approval
                      </span>
                    </div>

                    {session.topic && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>Topic: </span>
                        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>{session.topic}</span>
                      </div>
                    )}

                    {session.notes && (
                      <p style={{
                        fontSize: '0.86rem',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '0.75rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border)',
                      }}>
                        <strong>Learner Notes:</strong> {session.notes}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.85rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAcceptBooking(session)}
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                      >
                        {isBusy ? 'Accepting...' : '✓ Accept Request'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setDecliningSessionId(session.id);
                          setDeclineReason('');
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        Decline...
                      </button>
                      <Link
                        to={session.conversation_id ? `/messages?conversationId=${session.conversation_id}` : `/messages?userId=${encodeURIComponent(learner.id)}`}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <MessageIcon size={16} />
                        Coordinate in Chat
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Community Skill & Course Requests Section */}
      {isTeacher && (
        <div style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: 'var(--color-text-primary)' }}>
            Community Skill &amp; Course Requests
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
            Skills requested by learners across the platform. Offer to teach a topic to notify the learner.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
        >
          All Open Skill Requests
        </button>
        {user && (
          <button
            onClick={() => setActiveTab('my')}
            className={`btn btn-sm ${activeTab === 'my' ? 'btn-primary' : 'btn-outline'}`}
          >
            My Requested Skills
          </button>
        )}
      </div>

      {isLoading && <Loader message="Loading requests..." />}

      {!isLoading && requestsList.length === 0 && (
        <EmptyState
          icon={<RequestIcon size={36} />}
          title={activeTab === 'my' ? 'No requests submitted yet' : 'No open skill requests found'}
          description={
            activeTab === 'my'
              ? 'Have a skill you want to learn? Submit a request so mentors know.'
              : 'There are currently no open community course requests.'
          }
          actionButton={
            isAuthenticated && (
              <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
                Request a Skill
              </button>
            )
          }
        />
      )}

      {!isLoading && requestsList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {requestsList.map((req) => (
            <div key={req.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                    {req.title}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Category: <span style={{ color: 'var(--color-text-secondary)' }}>{req.category}</span>
                    {req.requester_name ? ` • Requested by ${req.requester_name}` : ''}
                    {' • '}Requested on {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>

                <span className={`badge ${req.status === 'fulfilled' ? 'badge-volunteer' : 'badge-student'}`}>
                  {req.status === 'fulfilled' ? 'Fulfilled' : 'Pending / Open Request'}
                </span>
              </div>

              {req.description && (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {req.description}
                </p>
              )}

              {/* Teacher fulfill and response callout */}
              {isTeacher && req.status === 'open' && req.requester_id !== user?.id && (
                <div style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  marginTop: '0.5rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: respondingToId === req.id ? '0.75rem' : '0' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                      Can you teach <strong>{req.title}</strong>? Respond to offer mentorship and fulfill this request.
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setRespondingToId(respondingToId === req.id ? null : req.id)}
                        className="btn btn-sm btn-primary"
                      >
                        {respondingToId === req.id ? 'Cancel Response' : 'Offer to Teach'}
                      </button>
                    </div>
                  </div>

                  {respondingToId === req.id && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
                      <textarea
                        className="form-textarea"
                        rows="2"
                        value={teacherResponseMessage}
                        onChange={(e) => setTeacherResponseMessage(e.target.value)}
                        placeholder="Write a message to the learner (e.g., I teach this subject and would love to schedule a session)..."
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleSendTeacherResponse(req.id)}
                          className="btn btn-sm btn-primary"
                          disabled={isSubmittingResponse}
                        >
                          {isSubmittingResponse ? 'Sending...' : 'Confirm & Notify Learner'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decline Learner Session Request Modal */}
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
              Decline Learner Session Request
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Please provide a polite reason for declining this request. The learner will be notified and the coordination thread will be closed.
            </p>
            <form onSubmit={handleDeclineBooking}>
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
