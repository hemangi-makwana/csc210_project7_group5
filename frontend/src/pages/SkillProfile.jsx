/**
 * ============================================================================
 * Skill Profile Page (src/pages/SkillProfile.jsx)
 * ============================================================================
 * Redesigned with dark blue palette and consistent SVG icons.
 * Allows users to manage:
 * 1. Bio & Professional Summary
 * 2. Teachable Skills with teacher verification quiz workflow
 * 3. Verified teacher badges (strictly from API `is_verified`)
 * 4. Wanted skills for peer learning
 * 5. Learning & Teaching role capabilities
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserProfile, updateSkills, updateUserProfile } from '../api/skills.js';
import { startVerificationQuiz, submitVerificationQuiz } from '../api/quizzes.js';
import { Loader, ErrorState, SuccessState } from '../components/Feedback.jsx';
import {
  UserIcon,
  SkillsIcon,
  VerifiedBadgeIcon,
  QuizIcon,
  CheckIcon,
  CloseIcon,
  SwitchModeIcon,
} from '../components/Icons.jsx';

export function SkillProfile() {
  const { user, isAuthenticated, mode, setMode, updateCapabilities, updateLocalUser } = useAuth();

  // Profile data states
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [canTeachState, setCanTeachState] = useState(true);
  const [canLearnState, setCanLearnState] = useState(true);
  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);

  // Inputs for adding skills
  const [newTeachSkillName, setNewTeachSkillName] = useState('');
  const [newTeachLevel, setNewTeachLevel] = useState('intermediate');
  const [newLearnSkillName, setNewLearnSkillName] = useState('');

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Skill Verification Quiz states
  const [selectedQuizSkill, setSelectedQuizSkill] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizUnavailableMessage, setQuizUnavailableMessage] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizError, setQuizError] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const activeUserId = user ? user.id : 'usr_002';
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getUserProfile(activeUserId);
        setBio(response.bio || response.profile_summary || '');
        setUsername(response.username || '');
        setSpecialization(response.specialization_domain || '');
        setCanTeachState(response.can_teach !== false);
        setCanLearnState(response.can_learn !== false);

        const loadedSkills = response.skills || [];
        setTeachSkills(loadedSkills.filter((s) => s.type === 'teach'));
        setLearnSkills(loadedSkills.filter((s) => s.type === 'learn'));
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load user profile.');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  /**
   * Starts teacher verification quiz for a teachable skill.
   */
  async function handleSelectTeachableSkill(skillName) {
    if (!skillName || typeof skillName !== 'string') return;
    const cleanSkill = skillName.trim();
    if (!cleanSkill) return;

    setSelectedQuizSkill(cleanSkill);
    setActiveQuiz(null);
    setQuizResult(null);
    setQuizUnavailableMessage(null);
    setQuizError(null);
    setQuizAnswers({});
    setIsQuizLoading(true);

    try {
      const quizData = await startVerificationQuiz(cleanSkill);
      setActiveQuiz(quizData);
    } catch (err) {
      if (err.data && err.data.available === false) {
        setQuizUnavailableMessage(
          err.data.message || `A verification quiz is not available for "${cleanSkill}" yet.`
        );
      } else {
        setQuizError(err.message || `Unable to start quiz for "${cleanSkill}".`);
      }
    } finally {
      setIsQuizLoading(false);
    }
  }

  /**
   * Submits answers to backend for grading.
   */
  async function handleSubmitQuiz(event) {
    if (event) event.preventDefault();
    if (!activeQuiz) return;

    setIsSubmittingQuiz(true);
    setQuizError(null);

    try {
      const response = await submitVerificationQuiz(
        activeQuiz.quizId,
        activeQuiz.skillName,
        quizAnswers
      );

      setQuizResult(response);

      // If user passed, update local state
      if (response.passed) {
        setTeachSkills((prev) =>
          prev.map((s) =>
            s.skill_name.toLowerCase() === activeQuiz.skillName.toLowerCase()
              ? { ...s, is_verified: true, verified_at: new Date().toISOString() }
              : s
          )
        );
      }
    } catch (err) {
      setQuizError(err.message || 'Failed to submit quiz for grading.');
    } finally {
      setIsSubmittingQuiz(false);
    }
  }

  function handleAddTeachSkill(event) {
    event.preventDefault();
    const cleanName = newTeachSkillName.trim();
    if (!cleanName) return;

    if (teachSkills.some((s) => s.skill_name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMessage(`You have already listed "${cleanName}" as a teachable skill.`);
      return;
    }

    const newSkill = {
      id: `temp_${Date.now()}`,
      skill_name: cleanName,
      level: newTeachLevel,
      type: 'teach',
      is_verified: false,
    };

    setTeachSkills([...teachSkills, newSkill]);
    setNewTeachSkillName('');
    setSuccessMessage(`Added "${cleanName}". Click "Save Profile Changes" below to commit to database.`);
  }

  function handleRemoveTeachSkill(skillId) {
    setTeachSkills(teachSkills.filter((s) => s.id !== skillId));
  }

  function handleAddLearnSkill(event) {
    event.preventDefault();
    const cleanName = newLearnSkillName.trim();
    if (!cleanName) return;

    if (learnSkills.some((s) => s.skill_name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMessage(`You have already listed "${cleanName}" in your wanted skills.`);
      return;
    }

    const newSkill = {
      id: `temp_${Date.now()}`,
      skill_name: cleanName,
      level: 'beginner',
      type: 'learn',
    };

    setLearnSkills([...learnSkills, newSkill]);
    setNewLearnSkillName('');
    setSuccessMessage(`Added "${cleanName}". Click "Save Profile Changes" below to commit to database.`);
  }

  function handleRemoveLearnSkill(skillId) {
    setLearnSkills(learnSkills.filter((s) => s.id !== skillId));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const activeUserId = user ? user.id : 'usr_002';

    try {
      const combinedSkills = [...teachSkills, ...learnSkills];

      // Save skills to PostgreSQL
      await updateSkills(activeUserId, {
        bio: bio,
        skills: combinedSkills,
      });

      // Save user capabilities & metadata if logged in
      if (user && user.id) {
        await updateUserProfile(user.id, {
          profile_summary: bio,
          bio: bio,
          specialization_domain: specialization,
          can_teach: canTeachState,
          can_learn: canLearnState,
        });

        updateLocalUser({
          bio: bio,
          profile_summary: bio,
          specialization_domain: specialization,
          can_teach: canTeachState,
          can_learn: canLearnState,
        });
      }

      setSuccessMessage('Profile skills and capabilities saved successfully in PostgreSQL.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update skills.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '920px' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Profile & Skills</h1>
        <p className="page-subtitle">
          Manage your bio, teachable skills with verification quizzes, wanted skills, and platform capabilities.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="alert alert-info">
          <span>You are viewing default profile data. <Link to="/login" style={{ fontWeight: '600' }}>Log in</Link> to save changes to your personal account.</span>
        </div>
      )}

      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && <ErrorState message={errorMessage} />}

      {isLoading ? (
        <Loader message="Loading your profile data..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Section 1: Mode & Capabilities */}
          <div className="card">
            <h2 className="card-title">Role & Capabilities</h2>
            <p className="card-subtitle">
              Configure your active interaction mode and indicate whether you teach, learn, or both.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                    Active Mode: <span style={{ color: mode === 'teacher' ? '#a78bfa' : '#60a5fa', textTransform: 'capitalize' }}>{mode}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                    {mode === 'teacher' ? 'Currently viewing teaching dashboard and session requests' : 'Currently viewing learning dashboard and recommendations'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode(mode === 'teacher' ? 'learner' : 'teacher')}
                  className="btn btn-sm btn-outline"
                  style={{ gap: '0.4rem' }}
                >
                  <SwitchModeIcon size={16} />
                  <span>Switch to {mode === 'teacher' ? 'Learner' : 'Teacher'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.92rem' }}>
                  <input
                    type="checkbox"
                    checked={canTeachState}
                    onChange={(e) => setCanTeachState(e.target.checked)}
                  />
                  <span>I can teach and mentor peers (Teacher capability)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.92rem' }}>
                  <input
                    type="checkbox"
                    checked={canLearnState}
                    onChange={(e) => setCanLearnState(e.target.checked)}
                  />
                  <span>I want to learn new skills (Learner capability)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Bio & Professional Summary */}
          <div className="card">
            <h2 className="card-title">Professional Summary & Bio</h2>
            <p className="card-subtitle">
              Brief summary of your background, learning goals, or teaching approach.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-bio">About You</label>
              <textarea
                id="profile-bio"
                className="form-textarea"
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Senior CS student experienced in Python algorithms, eager to learn React frontends..."
              />
            </div>
          </div>

          {/* Section 3: Skills I Can Teach & Verification Quizzes */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>
                Skills I Can Teach
              </h2>
              <span className="badge badge-volunteer">Mentoring</span>
            </div>
            <p className="card-subtitle">
              Add topics you are confident explaining. Click any teachable skill to start its 10-question verification quiz.
            </p>

            {/* Teachable skills chip list */}
            <div className="chip-container" style={{ marginBottom: '1.25rem', minHeight: '40px' }}>
              {teachSkills.length > 0 ? (
                teachSkills.map((skill) => {
                  const isSelected = selectedQuizSkill && selectedQuizSkill.toLowerCase() === skill.skill_name.toLowerCase();
                  // STRICT: Only show badge when API says is_verified === true
                  const isVerified = Boolean(skill.is_verified);

                  return (
                    <span
                      key={skill.id}
                      className="chip"
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.2)' : 'var(--color-bg-secondary)',
                      }}
                      onClick={() => handleSelectTeachableSkill(skill.skill_name)}
                      title={`Click to start or review verification quiz for ${skill.skill_name}`}
                    >
                      <span style={{ fontWeight: isSelected ? '700' : '500' }}>{skill.skill_name}</span>
                      <span className="chip-level">{skill.level}</span>
                      {isVerified ? (
                        <span className="badge badge-verified" title="Verified Teacher: Qualified via skill quiz">
                          <VerifiedBadgeIcon size={12} />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            color: '#60a5fa',
                            fontSize: '0.72rem',
                          }}
                        >
                          Take Quiz
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTeachSkill(skill.id);
                        }}
                        className="chip-remove"
                        title={`Remove ${skill.skill_name}`}
                      >
                        <CloseIcon size={14} />
                      </button>
                    </span>
                  );
                })
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No teachable skills listed yet. Add one below.
                </span>
              )}
            </div>

            {/* Add Teachable Skill Form */}
            <form onSubmit={handleAddTeachSkill} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 2, minWidth: '180px' }}
                value={newTeachSkillName}
                onChange={(e) => setNewTeachSkillName(e.target.value)}
                placeholder="Skill name (e.g. Python, Graphs, CSS)"
              />
              <select
                className="form-select"
                style={{ flex: 1, minWidth: '140px' }}
                value={newTeachLevel}
                onChange={(e) => setNewTeachLevel(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </select>
              <button type="submit" className="btn btn-secondary">
                Add Skill
              </button>
            </form>
          </div>

          {/* Teacher Verification Quiz Interactive Container */}
          {isQuizLoading && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <Loader message={`Starting 10-question verification quiz for "${selectedQuizSkill}"...`} />
            </div>
          )}

          {quizUnavailableMessage && !isQuizLoading && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fbbf24', marginBottom: '0.25rem' }}>
                    Verification Quiz Not Available
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {quizUnavailableMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizUnavailableMessage(null)}
                  className="btn btn-sm btn-outline"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {quizError && !isQuizLoading && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#f87171', marginBottom: '0.25rem' }}>
                    Quiz Notice
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{quizError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizError(null)}
                  className="btn btn-sm btn-outline"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE QUIZ QUESTIONS DISPLAY */}
          {activeQuiz && !quizResult && !isQuizLoading && (
            <div className="card" style={{ border: '2px solid var(--color-primary)', backgroundColor: 'var(--color-surface-elevated)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h2 className="card-title" style={{ margin: 0, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <QuizIcon size={20} />
                    <span>Teacher Verification Quiz: {activeQuiz.skillName}</span>
                  </h2>
                  <p className="card-subtitle" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
                    Answer 10 domain-specific questions. A score of <strong>5/10 (50%) or higher</strong> qualifies you as a verified teacher. Answer keys remain server-side.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="btn btn-sm btn-outline"
                >
                  Cancel Quiz
                </button>
              </div>

              <form onSubmit={handleSubmitQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {activeQuiz.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      padding: '1.25rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-bg-secondary)',
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.85rem', color: 'var(--color-text-primary)' }}>
                      Question {idx + 1} of 10: {q.question}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.options.map((option, optIdx) => {
                        const isChecked = quizAnswers[q.id] === option;
                        return (
                          <label
                            key={optIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.65rem 0.9rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              border: isChecked ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                              backgroundColor: isChecked ? 'rgba(79, 70, 229, 0.15)' : 'var(--color-surface)',
                              fontSize: '0.9rem',
                              color: isChecked ? '#ffffff' : 'var(--color-text-secondary)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <input
                              type="radio"
                              name={`question_${q.id}`}
                              value={option}
                              checked={isChecked}
                              onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: option }))}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ flex: 1 }}
                    disabled={isSubmittingQuiz}
                  >
                    {isSubmittingQuiz ? 'Grading on Server...' : 'Submit Quiz for Verification'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveQuiz(null)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* QUIZ RESULT & EXPLANATIONS */}
          {quizResult && (
            <div
              className="card"
              style={{
                border: quizResult.passed ? '2px solid var(--color-success)' : '2px solid var(--color-warning)',
                backgroundColor: 'var(--color-surface-elevated)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: quizResult.passed ? '#34d399' : '#fbbf24' }}>
                      {quizResult.passed ? 'Teacher Verification Passed' : 'Verification Attempt Result'}
                    </h2>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: quizResult.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: quizResult.passed ? '#34d399' : '#fbbf24',
                        border: quizResult.passed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        padding: '0.25rem 0.65rem',
                      }}
                    >
                      Score: {quizResult.score}/10 ({quizResult.percentage}%)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {quizResult.message}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!quizResult.passed && (
                    <button
                      type="button"
                      onClick={() => handleSelectTeachableSkill(quizResult.skillName)}
                      className="btn btn-primary btn-sm"
                    >
                      Retake Quiz
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setQuizResult(null);
                      setActiveQuiz(null);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Close Review
                  </button>
                </div>
              </div>

              {/* Question review */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
                  Detailed Question Review & Explanations:
                </h3>
                {quizResult.results && quizResult.results.map((res, idx) => (
                  <div
                    key={res.questionId || idx}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: res.isCorrect ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                        {idx + 1}. {res.question}
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: res.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: res.isCorrect ? '#34d399' : '#f87171',
                          flexShrink: 0,
                          marginLeft: '0.5rem',
                        }}
                      >
                        {res.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                      <strong>Your answer:</strong>{' '}
                      <span style={{ color: res.isCorrect ? '#34d399' : '#f87171' }}>
                        {res.chosenAnswer}
                      </span>
                    </div>

                    {!res.isCorrect && (
                      <div style={{ fontSize: '0.85rem', color: '#34d399', marginBottom: '0.25rem' }}>
                        <strong>Correct answer:</strong> {res.correctAnswer}
                      </div>
                    )}

                    {res.explanation && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                        {res.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Skills I Want to Learn */}
          <div className="card">
            <h2 className="card-title">Skills I Want to Learn</h2>
            <p className="card-subtitle">
              Add topics you wish to study. The recommendation engine matches you with qualified peer mentors.
            </p>

            <div className="chip-container" style={{ marginBottom: '1.25rem', minHeight: '40px' }}>
              {learnSkills.length > 0 ? (
                learnSkills.map((skill) => (
                  <span key={skill.id} className="chip">
                    <span>{skill.skill_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLearnSkill(skill.id)}
                      className="chip-remove"
                      title={`Remove ${skill.skill_name}`}
                    >
                      <CloseIcon size={14} />
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No learning goals listed yet. Add one below.
                </span>
              )}
            </div>

            <form onSubmit={handleAddLearnSkill} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={newLearnSkillName}
                onChange={(e) => setNewLearnSkillName(e.target.value)}
                placeholder="Topic or skill (e.g. Machine Learning, React, UI/UX)"
              />
              <button type="submit" className="btn btn-secondary">
                Add Goal
              </button>
            </form>
          </div>

          {/* Section 5: Save Profile Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '3rem' }}>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="btn btn-primary btn-lg"
              disabled={isSaving}
            >
              {isSaving ? 'Saving to Database...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
