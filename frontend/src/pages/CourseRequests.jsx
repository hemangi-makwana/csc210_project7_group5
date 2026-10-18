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
import { createCourseRequest, getMyCourseRequests, getAllCourseRequests } from '../api/courseRequests.js';
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

export function CourseRequests() {
  const { user, isAuthenticated, isTeacher } = useAuth();

  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
  const [requestsList, setRequestsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New Request Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function loadRequests(tab = activeTab) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (tab === 'my' && user) {
        const res = await getMyCourseRequests();
        setRequestsList(res.requests || []);
      } else {
        const res = await getAllCourseRequests();
        setRequestsList(res.requests || []);
      }
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
    if (!title.trim()) {
      setErrorMessage('Please enter a course or skill title.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await createCourseRequest({
        title: title.trim(),
        description: description.trim(),
        category: category,
      });

      setSuccessMessage(res.message || 'Course request submitted successfully!');
      setTitle('');
      setDescription('');
      setShowCreateModal(false);
      loadRequests(activeTab);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit course request.');
    } finally {
      setIsSubmitting(false);
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
                onClick={() => setShowCreateModal(false)}
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

              {/* Teacher fulfill callout */}
              {isTeacher && req.status === 'open' && (
                <div style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(79, 70, 229, 0.1)',
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>
                    Can you teach <strong>{req.title}</strong>? Add it to your skills profile to automatically notify this learner.
                  </div>
                  <Link to="/profile" className="btn btn-sm btn-primary">
                    Add to My Skills
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
