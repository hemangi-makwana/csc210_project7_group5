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
import { getAllMentors, getMentorVerifiedSkills } from '../api/skills.js';
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
  const [verifiedSkills, setVerifiedSkills] = useState([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [selectedMentorDisplayName, setSelectedMentorDisplayName] = useState(preselectedMentorName || '');
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
        const normalized = results
          .map((r) => r.user || r)
          .filter((m) => !user || String(m.id) !== String(user.id));
        setAvailableMentors(normalized);
      } catch (err) {
        console.error('Failed to load mentors dropdown:', err);
      } finally {
        setIsFetchingMentors(false);
      }
    }

    loadMentors();
  }, [user]);

  // Whenever mentorId changes, load that mentor's currently verified teachable skills from the backend
  useEffect(() => {
    let isCancelled = false;

    async function fetchVerifiedSkillsForMentor() {
      setErrorMessage(null);
      if (!mentorId) {
        setVerifiedSkills([]);
        setSessionTopic('');
        return;
      }

      setIsLoadingSkills(true);
      try {
        const data = await getMentorVerifiedSkills(mentorId);
        if (isCancelled) return;

        const list = Array.isArray(data?.verifiedSkills)
          ? data.verifiedSkills
          : Array.isArray(data?.verified_skills)
          ? data.verified_skills
          : [];

        if (data?.mentorName) {
          setSelectedMentorDisplayName(data.mentorName);
        }

        setVerifiedSkills(list);

        if (list.length === 1) {
          // Exactly one verified skill -> prefill automatically
          setSessionTopic(list[0].skill_name);
        } else if (list.length > 1) {
          // Multiple verified skills -> offer only those skills; preselect URL skill only if it is in the verified list
          const matchedFromUrl = preselectedTopic
            ? list.find((s) => String(s.skill_name || '').trim().toLowerCase() === preselectedTopic.trim().toLowerCase())
            : null;
          setSessionTopic(matchedFromUrl ? matchedFromUrl.skill_name : list[0].skill_name);
        } else {
          // Zero verified skills -> clear selection and prevent booking
          setSessionTopic('');
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to load mentor verified skills:', err);
        setVerifiedSkills([]);
        setSessionTopic('');
      } finally {
        if (!isCancelled) {
          setIsLoadingSkills(false);
        }
      }
    }

    fetchVerifiedSkillsForMentor();
    return () => {
      isCancelled = true;
    };
  }, [mentorId, preselectedTopic]);

  async function handleBookingSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!mentorId) {
      setErrorMessage('Please select a mentor.');
      return;
    }

    if (verifiedSkills.length === 0) {
      setErrorMessage('This mentor has no verified teaching skills available.');
      return;
    }

    const isChosenSkillVerified = verifiedSkills.some(
      (s) => String(s.skill_name || '').trim().toLowerCase() === String(sessionTopic || '').trim().toLowerCase()
    );
    if (!sessionTopic || !isChosenSkillVerified) {
      setErrorMessage(
        `This mentor is not verified to teach ${sessionTopic || 'that skill'}. Choose one of their verified skills.`
      );
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
        skill: sessionTopic,
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
                  ...(preselectedMentorId && preselectedMentorName && !availableMentors.some((m) => m.id === preselectedMentorId)
                    ? [{ value: preselectedMentorId, label: preselectedMentorName }]
                    : []),
                  ...availableMentors.map((mentor) => {
                    const verifiedList = Array.isArray(mentor.verified_skills)
                      ? mentor.verified_skills.map((s) => s.skill_name)
                      : Array.isArray(mentor.skills)
                      ? mentor.skills
                          .filter((s) => typeof s === 'object' && s !== null && s.type === 'teach' && s.is_verified === true)
                          .map((s) => s.skill_name)
                      : [];
                    return {
                      value: mentor.id,
                      label: `${mentor.name} (${mentor.role || 'mentor'})`,
                      subtext:
                        verifiedList.length > 0
                          ? `Verified Skills: ${verifiedList.join(', ')}`
                          : 'No verified teaching skills available',
                    };
                  }),
                ]}
              />
            )}
            <small style={{ color: 'var(--color-text-muted)', marginTop: '0.35rem', display: 'block' }}>
              Want to see detailed profiles? <Link to="/search">Find mentors by skill</Link>.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="session-topic">
              Verified Teaching Skill
            </label>
            {!mentorId ? (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                Select a mentor above to load their verified teaching skills.
              </div>
            ) : isLoadingSkills ? (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-secondary)',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.9rem',
                }}
              >
                Loading verified teaching skills...
              </div>
            ) : verifiedSkills.length === 0 ? (
              <div
                role="alert"
                style={{
                  padding: '0.95rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  color: '#fca5a5',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#f87171' }}>
                  No Verified Teaching Skills Available
                </strong>
                {selectedMentorDisplayName || 'This mentor'} has no verified teaching skills available. Sessions can only be booked for verified skills.
              </div>
            ) : verifiedSkills.length === 1 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.95rem' }}>
                    {verifiedSkills[0].skill_name}
                  </span>
                  {verifiedSkills[0].level && (
                    <span
                      style={{
                        marginLeft: '0.6rem',
                        fontSize: '0.78rem',
                        color: 'var(--color-text-muted)',
                        textTransform: 'capitalize',
                      }}
                    >
                      ({verifiedSkills[0].level})
                    </span>
                  )}
                </div>
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckIcon size={13} /> Verified Skill (Auto-Selected)
                </span>
              </div>
            ) : (
              <div>
                <CustomSelect
                  id="session-topic"
                  value={sessionTopic}
                  onChange={(val) => setSessionTopic(val)}
                  placeholder="-- Select a Verified Skill --"
                  required
                  options={verifiedSkills.map((sk) => ({
                    value: sk.skill_name,
                    label: sk.skill_name,
                    subtext: sk.level ? `Verified (${sk.level})` : 'Verified Teaching Skill',
                  }))}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.55rem' }}>
                  {verifiedSkills.map((sk) => {
                    const isSelected = sessionTopic === sk.skill_name;
                    return (
                      <button
                        key={sk.skill_name}
                        type="button"
                        onClick={() => setSessionTopic(sk.skill_name)}
                        style={{
                          padding: '0.3rem 0.7rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--color-accent-primary)' : '1px solid var(--color-border)',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.18)' : 'var(--color-bg-secondary)',
                          color: isSelected ? '#60a5fa' : 'var(--color-text-secondary)',
                        }}
                      >
                        {sk.skill_name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              disabled={isLoading || isLoadingSkills || !mentorId || verifiedSkills.length === 0 || !sessionTopic}
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
