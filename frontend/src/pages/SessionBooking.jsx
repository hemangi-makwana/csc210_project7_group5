/**
 * ============================================================================
 * Session Booking Page (src/pages/SessionBooking.jsx)
 * ============================================================================
 * Scheduling form to book 1:1 mentorship sessions.
 * Free of emojis; styled with dark blue surfaces.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { bookSession } from '../api/sessions.js';
import { getAllMentors } from '../api/skills.js';
import { Loader, ErrorState, SuccessState } from '../components/Feedback.jsx';
import { CalendarIcon, UserIcon, CheckIcon } from '../components/Icons.jsx';

export function SessionBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const preselectedMentorId = searchParams.get('mentorId') || '';
  const preselectedMentorName = searchParams.get('mentorName') || '';

  const [mentorId, setMentorId] = useState(preselectedMentorId);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMentors, setIsFetchingMentors] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    async function loadMentors() {
      setIsFetchingMentors(true);
      try {
        const response = await getAllMentors();
        const results = response.mentors || response.users || response.results || [];
        setAvailableMentors(results.map(r => r.user || r));
      } catch (err) {
        console.error('Failed to load mentors dropdown:', err);
      } finally {
        setIsFetchingMentors(false);
      }
    }

    loadMentors();
  }, []);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!mentorId) {
      setErrorMessage('Please select a mentor.');
      return;
    }
    if (!scheduledDate || !scheduledTime) {
      setErrorMessage('Please choose both a date and time for the session.');
      return;
    }

    const learnerId = user ? user.id : 'usr_002';
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    setIsLoading(true);

    try {
      const payload = {
        mentorId: mentorId,
        learnerId: learnerId,
        topic: sessionTopic,
        scheduledAt: scheduledDateTime,
        notes: sessionNotes,
      };

      const response = await bookSession(payload);
      setSuccessMessage(response.message || 'Session booked successfully!');

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
    <div className="page" style={{ maxWidth: '780px' }}>
      <div className="page-header">
        <h1 className="page-title">Schedule a Mentoring Session</h1>
        <p className="page-subtitle">
          Arrange a 1:1 learning session with a peer or professional mentor in your community.
        </p>
      </div>

      <div style={{
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        border: '1px solid rgba(79, 70, 229, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '0.85rem 1.25rem',
        fontSize: '0.88rem',
        color: '#c7d2fe',
        marginBottom: '2rem',
      }}>
        <strong>Chronological Processing:</strong> Booking requests are scheduled in chronological order, ensuring fair queue resolution without double-booking collisions.
      </div>

      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && <ErrorState message={errorMessage} />}

      <div className="card">
        <form onSubmit={handleBookingSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="mentor-select">
              Select Mentor
            </label>
            {isFetchingMentors ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loading mentor directory...</p>
            ) : (
              <select
                id="mentor-select"
                className="form-select"
                value={mentorId}
                onChange={(e) => setMentorId(e.target.value)}
                required
              >
                <option value="">-- Choose a Mentor --</option>
                {preselectedMentorId && preselectedMentorName && !availableMentors.some(m => m.id === preselectedMentorId) && (
                  <option value={preselectedMentorId}>{preselectedMentorName}</option>
                )}
                {availableMentors.map((mentor) => (
                  <option key={mentor.id} value={mentor.id}>
                    {mentor.name} ({mentor.role}) — {mentor.skills?.filter(s => s.type === 'teach').map(s => s.skill_name).join(', ') || 'General Mentorship'}
                  </option>
                ))}
              </select>
            )}
            <small style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
              Want to see detailed profiles? <Link to="/search">Find mentors by skill</Link>.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="session-topic">
              Session Topic / Skill Focus
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

          <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="session-date">
                Session Date
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="session-time">
                Session Time
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

          <div className="form-group">
            <label className="form-label" htmlFor="session-notes">
              Preparation Notes (Optional)
            </label>
            <textarea
              id="session-notes"
              className="form-textarea"
              rows="3"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Share what you hope to accomplish, questions you have, or links to relevant repos..."
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              disabled={isLoading}
            >
              {isLoading ? 'Booking Session...' : 'Confirm Session Booking'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary btn-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
