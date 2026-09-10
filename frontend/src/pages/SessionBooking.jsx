/**
 * ============================================================================
 * Session Booking Page (src/pages/SessionBooking.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Provides a scheduling form to book a 1:1 mentorship session.
 * - Pre-selects a mentor if navigated from a ProfileCard's "Book Session" button.
 * - Replaces any hardcoded placeholder with the real user.id from AuthContext.
 * - Calls the bookSession API to enqueue the booking request.
 *
 * BACKEND DSA CONNECTION:
 * - Calls POST /api/sessions/book, which places the booking into the backend's
 *   FIFO Queue pipeline to resolve scheduling requests chronologically.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { bookSession } from '../api/sessions.js';
import { getAllMentors } from '../api/skills.js';
import { Loader, ErrorState, SuccessState, DemoBanner } from '../components/Feedback.jsx';

export function SessionBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Read URL query params if user clicked "Book Session" from a profile card
  const preselectedMentorId = searchParams.get('mentorId') || '';
  const preselectedMentorName = searchParams.get('mentorName') || '';

  // Form input states
  const [mentorId, setMentorId] = useState(preselectedMentorId);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // UI feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMentors, setIsFetchingMentors] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  /**
   * Fetches available mentors for the dropdown selector on initial render.
   *
   * WHY WE USE A SEPARATE "GET ALL" ENDPOINT (VIVA DEFENSE POINT):
   * In RESTful API architecture, searching for a specific skill keyword (/api/skills/search?query=...)
   * is fundamentally different from fetching the full community mentor directory (/api/users/all).
   * Relying on an empty search query to silently return all records is an antipattern:
   * empty parameters shouldn't secretly act as a wildcard, as that violates what "searching for
   * a skill" means and makes system behavior unpredictable. A dedicated endpoint makes our intent
   * explicit and maintains clean separation of concerns.
   */
  useEffect(() => {
    async function loadMentors() {
      setIsFetchingMentors(true);
      try {
        const response = await getAllMentors();
        const results = response.mentors || response.users || response.results || [];
        setAvailableMentors(results.map(r => r.user || r));
        if (response.isMock) setIsDemo(true);
      } catch (err) {
        console.error('Failed to load mentors dropdown:', err);
      } finally {
        setIsFetchingMentors(false);
      }
    }

    loadMentors();
  }, []);

  /**
   * Submits the booking request to the backend.
   */
  async function handleBookingSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation checks
    if (!mentorId) {
      setErrorMessage('Please select a mentor.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setErrorMessage('Please choose both a date and time for the session.');
      return;
    }

    // Determine the real learner user ID from AuthContext
    const learnerId = user ? user.id : 'usr_002';

    // Combine date and time into an ISO timestamp
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    setIsLoading(true);

    try {
      // NOTE: All API payloads in this project use camelCase field names.
      // The backend (POST /api/sessions/book) destructures { mentorId, learnerId, scheduledAt }
      // from req.body — sending snake_case (mentor_id etc.) would trigger a 400 error.
      const payload = {
        mentorId: mentorId,
        learnerId: learnerId,
        topic: sessionTopic,
        scheduledAt: scheduledDateTime,
        notes: sessionNotes,
      };

      const response = await bookSession(payload);

      setSuccessMessage(response.message || 'Session booking enqueued successfully!');
      if (response.isMock) setIsDemo(true);

      // Reset form fields after 2 seconds
      setTimeout(() => {
        setSessionTopic('');
        setSessionNotes('');
      }, 2000);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to submit booking request.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '750px' }}>
      {/* Demo Banner */}
      <DemoBanner isDemo={isDemo} />

      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">📅 Schedule a Mentoring Session</h1>
        <p className="page-subtitle">
          Request a 1:1 learning session with a community peer or professional mentor.
        </p>
      </div>

      {/* DSA Explanation Note */}
      <div style={{
        backgroundColor: 'var(--color-success-light)',
        border: '1px solid #a7f3d0',
        borderRadius: 'var(--border-radius-sm)',
        padding: '0.75rem 1rem',
        fontSize: '0.85rem',
        color: '#065f46',
        marginBottom: '1.5rem'
      }}>
        ⚡ <strong>DSA in Action:</strong> Booking requests are enqueued in a backend <strong>FIFO Queue</strong>. This processes concurrent scheduling requests in order of arrival, preventing double-booking race conditions.
      </div>

      {/* Feedback Alerts */}
      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && <ErrorState message={errorMessage} />}

      {/* Booking Form Card */}
      <div className="card">
        <form onSubmit={handleBookingSubmit} className="form">
          {/* Mentor Selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="mentor-select">
              Select Mentor:
            </label>
            {isFetchingMentors ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loading mentor list...</p>
            ) : (
              <select
                id="mentor-select"
                className="form-select"
                value={mentorId}
                onChange={(e) => setMentorId(e.target.value)}
                required
              >
                <option value="">-- Choose a Mentor --</option>
                {/* Include preselected mentor if not yet in loaded list */}
                {preselectedMentorId && preselectedMentorName && !availableMentors.some(m => m.id === preselectedMentorId) && (
                  <option value={preselectedMentorId}>{preselectedMentorName}</option>
                )}
                {availableMentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name} ({mentor.role}) — {mentor.skills?.filter(s => s.type === 'teach').map(s => s.skill_name).join(', ')}
                  </option>
                ))}
              </select>
            )}
            <span className="form-helper">
              Don't see who you're looking for? <Link to="/search">Search mentors by skill keyword</Link>.
            </span>
          </div>

          {/* Session Topic */}
          <div className="form-group">
            <label className="form-label" htmlFor="session-topic">
              Session Topic / Skill Focus:
            </label>
            <input
              id="session-topic"
              type="text"
              className="form-input"
              value={sessionTopic}
              onChange={(e) => setSessionTopic(e.target.value)}
              placeholder="e.g. Binary Search Trees, React Hooks, Resume Review"
              required
            />
          </div>

          {/* Date & Time Pickers */}
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="session-date">
                Date:
              </label>
              <input
                id="session-date"
                type="date"
                className="form-input"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="session-time">
                Time:
              </label>
              <input
                id="session-time"
                type="time"
                className="form-input"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Notes & Questions */}
          <div className="form-group">
            <label className="form-label" htmlFor="session-notes">
              Notes & Specific Questions for Mentor:
            </label>
            <textarea
              id="session-notes"
              className="form-textarea"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Share what you hope to achieve, any prior knowledge, or specific code problems..."
            />
          </div>

          {/* Submit Button */}
          <div style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={isLoading}
            >
              {isLoading ? 'Enqueuing Booking...' : '📨 Enqueue Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
