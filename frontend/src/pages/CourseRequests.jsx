/**
 * ============================================================================
 * Course & Skill Requests Page (src/pages/CourseRequests.jsx)
 * ============================================================================
 * Allows learners to request courses or skills not yet offered in the community.
 * When mentors add matching teachable skills, learners are automatically notified.
 * In Teacher Mode, mentors can browse open community requests to see high-demand topics.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createCourseRequest,
  getMyCourseRequests,
  getAllCourseRequests,
  respondToCourseRequest,
} from '../api/courseRequests.js';
import { getSkillCatalog } from '../api/skills.js';
import { Loader, EmptyState, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { RequestIcon, CheckIcon, SkillsIcon } from '../components/Icons.jsx';

const CATEGORIES = [
  'Programming & Software',
  'Data Science & AI',
  'Web & Mobile Development',
  'UI/UX & Design',
  'Cloud & DevOps',
  'Academics & Mathematics',
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
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New Request Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [titleSuggestion, setTitleSuggestion] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Teacher response inline state
  const [respondingToId, setRespondingToId] = useState(null);
  const [teacherResponseMessage, setTeacherResponseMessage] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  async function loadRequests(tab = activeTab) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [reqRes, catRes] = await Promise.all([
        tab === 'my' && user ? getMyCourseRequests() : getAllCourseRequests(),
        getSkillCatalog().catch(() => ({ catalog: [] })),
      ]);
      setRequestsList(reqRes.requests || []);
      setCatalog(catRes.catalog || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load course requests.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequests(activeTab);
  }, [activeTab, user]);

  async function handleCreateRequest(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setErrorMessage('Please enter a course or skill title.');
      return;
    }

    // Catalog check
    const cleanLower = cleanTitle.toLowerCase();
    const exactMatch = catalog.find(c => c.name.toLowerCase() === cleanLower);

    let finalTitle = cleanTitle;
    if (exactMatch) {
      finalTitle = exactMatch.name;
    } else {
      // Find closest typo match
      let closest = null;
      let minDistance = 3;
      for (const item of catalog) {
        const dist = levenshteinDistance(cleanLower, item.name);
        if (dist <= 2 && dist < minDistance) {
          minDistance = dist;
          closest = item.name;
        }
      }

      if (closest) {
        setTitleSuggestion(closest);
        setErrorMessage(`"${cleanTitle}" is not in the approved skill catalog. Did you mean "${closest}"?`);
        return;
      }

      setErrorMessage(`"${cleanTitle}" is not currently in the skill catalog. Please select an approved skill or topic.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await createCourseRequest({
        title: finalTitle,
        description: description.trim(),
        category: category,
      });

      setSuccessMessage(res.message || 'Course request submitted successfully!');
      setTitle('');
      setDescription('');
      setTitleSuggestion(null);
      setShowCreateModal(false);
      loadRequests(activeTab);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit course request.');
    } finally {
      setIsSubmitting(false);
    }
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
            {isTeacher ? 'Learner Skill Requests' : 'Course & Skill Requests'}
          </h1>
          <p className="page-subtitle">
            {isTeacher
              ? 'Topics learners are eager to study. Adding a matching teachable skill fulfills their request.'
              : 'Cannot find a skill in the platform? Request it here to get notified when a mentor offers to teach it.'}
          </p>
        </div>

        {isAuthenticated && (
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="btn btn-primary"
            style={{ gap: '0.4rem' }}
          >
            <RequestIcon size={18} />
            <span>Request a Skill</span>
          </button>
        )}
      </div>

      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && !isLoading && <ErrorState message={errorMessage} onRetry={() => loadRequests(activeTab)} />}

      {/* Create Request Form Drawer / Modal */}
      {showCreateModal && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Request an Unavailable Skill</h2>
            <button
              onClick={() => setShowCreateModal(false)}
              className="btn btn-sm btn-outline"
            >
              Cancel
            </button>
          </div>
          <p className="card-subtitle">
            Submit details for a course or topic you wish someone in the community would teach.
          </p>

          <form onSubmit={handleCreateRequest}>
            <div className="form-group">
              <label className="form-label" htmlFor="req-title">Skill or Course Title</label>
              <input
                id="req-title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Systems, Rust for WebAssembly, Kotlin"
                required
              />
            </div>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="req-cat">Category</label>
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
                  placeholder="What concepts would you like covered?"
                />
              </div>
            </div>

            {titleSuggestion && (
              <div style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}>
                <span>Did you mean <strong>"{titleSuggestion}"</strong>?</span>
                <button
                  type="button"
                  onClick={() => {
                    setTitle(titleSuggestion);
                    setTitleSuggestion(null);
                    setErrorMessage(null);
                  }}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '0.2rem 0.6rem' }}
                >
                  Use "{titleSuggestion}"
                </button>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('all')}
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
        >
          All Community Requests
        </button>
        {user && (
          <button
            onClick={() => setActiveTab('my')}
            className={`btn btn-sm ${activeTab === 'my' ? 'btn-primary' : 'btn-outline'}`}
          >
            My Requests
          </button>
        )}
      </div>

      {isLoading && <Loader message="Loading course requests..." />}

      {!isLoading && requestsList.length === 0 && (
        <EmptyState
          icon={<RequestIcon size={36} />}
          title={activeTab === 'my' ? 'No requests submitted yet' : 'No open requests found'}
          description={
            activeTab === 'my'
              ? 'Have a skill you want to learn? Submit a request so mentors know.'
              : 'There are currently no community course requests.'
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
                    Category: <span style={{ color: 'var(--color-text-secondary)' }}>{req.category}</span> • Requested on {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>

                <span className={`badge ${req.status === 'fulfilled' ? 'badge-volunteer' : 'badge-student'}`}>
                  {req.status === 'fulfilled' ? 'Fulfilled' : 'Open Request'}
                </span>
              </div>

              {req.description && (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1rem' }}>
                  {req.description}
                </p>
              )}

              {/* Teacher fulfill and response callout */}
              {isTeacher && req.status === 'open' && (
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
    </div>
  );
}
