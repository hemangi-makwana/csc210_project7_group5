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
import { CustomSelect } from '../components/CustomSelect.jsx';

export function SessionBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isTeacher, setMode } = useAuth();


  const preselectedMentorId = searchParams.get('mentorId') || '';
  const preselectedMentorName = searchParams.get('mentorName') || '';
  const preselectedTopic = searchParams.get('skill') || searchParams.get('topic') || '';

  const [mentorId, setMentorId] = useState(preselectedMentorId);
  const [availableMentors, setAvailableMentors] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sessionTopic, setSessionTopic] = useState(preselectedTopic);
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
      setSuccessMessage(response.message || 'Session booked successfully! Awaiting teacher confirmation.');

      setTimeout(() => {
        navigate('/history?view=learning');
      }, 1500);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to submit booking request.');
    } finally {
      setIsLoading(false);
    }
  }

  if (isTeacher) {
    return (
      <div className="page" style={{ maxWidth: '720px', marginTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            color: 'var(--color-teacher)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <CalendarIcon size={32} />
          </div>
          <h2 className="page-title" style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>
            Book Mentor Session
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            Booking sessions with mentors is a learning tool reserved for <strong>Learner Mode</strong>. As a teacher, view your upcoming teaching sessions and student bookings in Teaching History.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => setMode('learner')}
              className="btn btn-primary"
            >
              Switch to Learner Mode
            </button>
            <Link to="/history?view=teaching" className="btn btn-secondary">
              View Teaching Sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '780px' }}>
      <div className="page-header">

        <h1 className="page-title">Schedule a Mentoring Session</h1>
        <p className="page-subtitle">
          Arrange a 1:1 learning session with a peer or professional mentor in your community.
        </p>
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
              <CustomSelect
                id="mentor-select"
                value={mentorId}
                onChange={(val) => setMentorId(val)}
                placeholder="-- Choose a Mentor --"
                required
                options={[
                  ...(preselectedMentorId && preselectedMentorName && !availableMentors.some(m => m.id === preselectedMentorId)
                    ? [{ value: preselectedMentorId, label: preselectedMentorName }]
                    : []),
                  ...availableMentors.map((mentor) => {
                    const teachSkills = mentor.skills?.filter(s => s.type === 'teach').map(s => s.skill_name).join(', ');
                    return {
                      value: mentor.id,
                      label: `${mentor.name} (${mentor.role || 'mentor'})`,
                      subtext: teachSkills ? `Teaches: ${teachSkills}` : 'General Mentorship',
                    };
                  }),
                ]}
              />
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
