/**
 * ============================================================================
 * Skill Profile Page (src/pages/SkillProfile.jsx)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Allows the logged-in user to view and edit their profile, including:
 *   1. Short Bio / Headline
 *   2. Skills they can teach (skill name + level: beginner, intermediate, expert)
 *   3. Skills they want to learn
 * - Connects to the updateSkills(userId, skills) function in src/api/skills.js.
 * - Reuses existing CSS classes (.form, .btn, .chip, .card, etc.) for visual consistency.
 * - Manages loading, error, success, and demo mock states.
 *
 * BACKEND DSA CONNECTION:
 * - When skills are updated here, the backend updates its internal Hash Table
 *   Skill Index and modifies user node properties in the Mentor Network Graph.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserProfile, updateSkills } from '../api/skills.js';
import { startVerificationQuiz, submitVerificationQuiz } from '../api/quizzes.js';
import { Loader, ErrorState, SuccessState, DemoBanner } from '../components/Feedback.jsx';

export function SkillProfile() {
  // Get real user object from AuthContext
  const { user, isAuthenticated } = useAuth();

  // Profile data states
  const [bio, setBio] = useState('');
  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);

  // Inputs for adding a new teachable skill
  const [newTeachSkillName, setNewTeachSkillName] = useState('');
  const [newTeachLevel, setNewTeachLevel] = useState('intermediate');

  // Input for adding a new learning skill
  const [newLearnSkillName, setNewLearnSkillName] = useState('');

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDemo, setIsDemo] = useState(false);

  // Skill Verification Quiz states
  const [selectedQuizSkill, setSelectedQuizSkill] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizUnavailableMessage, setQuizUnavailableMessage] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizError, setQuizError] = useState(null);

  /**
   * Loads the current user's profile details on component mount.
   */
  useEffect(() => {
    async function loadProfile() {
      // Use real user ID if logged in, otherwise default demo ID
      const activeUserId = user ? user.id : 'usr_002';

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getUserProfile(activeUserId);

        // Populate bio
        setBio(response.bio || '');

        // Split loaded skills into 'teach' and 'learn' categories
        const loadedSkills = response.skills || [];
        setTeachSkills(loadedSkills.filter(s => s.type === 'teach'));
        setLearnSkills(loadedSkills.filter(s => s.type === 'learn'));

        if (response.isMock) {
          setIsDemo(true);
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load user profile.');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  /**
   * Starts the 10-question teacher verification quiz for the given teachable skill.
   * If a curated question bank is not available, displays an explanatory message.
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
   * Submits answers to the backend for server-side grading.
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

      // If user passed (score >= 5/10), immediately update the skill in state to display the verified badge
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

  /**
   * Adds a new skill to the "Skills I Can Teach" list and automatically launches verification quiz.
   */
  function handleAddTeachSkill(event) {
    event.preventDefault();
    const trimmed = newTeachSkillName.trim();
    if (!trimmed) return;

    // Prevent duplicates
    const alreadyExists = teachSkills.some(
      s => s.skill_name.toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      setErrorMessage(`"${trimmed}" is already in your teaching list.`);
      return;
    }

    const newSkillItem = {
      id: 'teach_' + Date.now(),
      skill_name: trimmed,
      level: newTeachLevel,
      type: 'teach',
      is_verified: false,
    };

    setTeachSkills(prev => [...prev, newSkillItem]);
    setNewTeachSkillName('');
    setErrorMessage(null);

    // Automatically start quiz for the newly selected teachable skill
    handleSelectTeachableSkill(trimmed);
  }

  /**
   * Removes a skill from the "Skills I Can Teach" list.
   */
  function handleRemoveTeachSkill(skillIdToRemove) {
    setTeachSkills(prev => prev.filter(s => s.id !== skillIdToRemove));
  }

  /**
   * Adds a new skill to the "Skills I Want to Learn" list.
   */
  function handleAddLearnSkill(event) {
    event.preventDefault();
    const trimmed = newLearnSkillName.trim();
    if (!trimmed) return;

    // Prevent duplicates
    const alreadyExists = learnSkills.some(
      s => s.skill_name.toLowerCase() === trimmed.toLowerCase()
    );

    if (alreadyExists) {
      setErrorMessage(`"${trimmed}" is already in your learning list.`);
      return;
    }

    const newSkillItem = {
      id: 'learn_' + Date.now(),
      skill_name: trimmed,
      level: 'beginner',
      type: 'learn',
    };

    setLearnSkills(prev => [...prev, newSkillItem]);
    setNewLearnSkillName('');
    setErrorMessage(null);
  }

  /**
   * Removes a skill from the "Skills I Want to Learn" list.
   */
  function handleRemoveLearnSkill(skillIdToRemove) {
    setLearnSkills(prev => prev.filter(s => s.id !== skillIdToRemove));
  }

  /**
   * Submits updated profile (skills + bio) to the backend API.
   */
  async function handleSaveProfile(event) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    const activeUserId = user ? user.id : 'usr_002';

    try {
      // Combine teach and learn skill arrays into a unified payload
      const combinedSkills = [...teachSkills, ...learnSkills];

      const payload = {
        bio: bio,
        skills: combinedSkills,
      };

      const response = await updateSkills(activeUserId, payload);

      setSuccessMessage(response.message || 'Profile skills and bio saved successfully!');
      if (response.isMock) setIsDemo(true);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update skills.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: '850px' }}>
      {/* Demo Banner */}
      <DemoBanner isDemo={isDemo} />

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">👤 My Skill Profile</h1>
        <p className="page-subtitle">
          Manage the skills you share with peers and topics you wish to learn.
        </p>
      </div>

      {/* Notice if user is not logged in */}
      {!isAuthenticated && (
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <span>
            ℹ️ You are viewing a default profile. <Link to="/login" style={{ fontWeight: '600', textDecoration: 'underline' }}>Log in</Link> to edit your personal profile.
          </span>
        </div>
      )}

      {/* Feedback Alerts */}
      {successMessage && <SuccessState message={successMessage} />}
      {errorMessage && <ErrorState message={errorMessage} />}

      {/* Loading indicator */}
      {isLoading ? (
        <Loader message="Loading your profile and skill set..." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Section 1: Bio / Summary */}
          <div className="card">
            <h2 className="card-title">📝 About You / Bio</h2>
            <p className="card-subtitle">
              Provide a brief summary of your background, learning interests, or teaching style.
            </p>

            <div className="form-group">
              <textarea
                className="form-textarea"
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Senior CS student experienced in Python algorithms, eager to learn React frontends..."
              />
            </div>
          </div>

          {/* Section 2: Skills I Can Teach */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>
                🎓 Skills I Can Teach
              </h2>
              <span className="badge badge-volunteer">Mentoring</span>
            </div>
            <p className="card-subtitle">
              Add topics you are confident explaining to peers. Specify your proficiency level.
            </p>

            {/* List of currently added teaching skills */}
            <div className="chip-container" style={{ marginBottom: '1.25rem', minHeight: '38px' }}>
              {teachSkills.length > 0 ? (
                teachSkills.map((skill) => {
                  const isSelected = selectedQuizSkill && selectedQuizSkill.toLowerCase() === skill.skill_name.toLowerCase();
                  return (
                    <span
                      key={skill.id}
                      className="chip"
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: isSelected ? '#eff6ff' : 'var(--color-surface)',
                      }}
                      onClick={() => handleSelectTeachableSkill(skill.skill_name)}
                      title={`Click to start or review teacher verification quiz for ${skill.skill_name}`}
                    >
                      <span style={{ fontWeight: isSelected ? '700' : '500' }}>{skill.skill_name}</span>
                      <span className="chip-level">{skill.level}</span>
                      {skill.is_verified ? (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            marginLeft: '0.35rem',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.4rem',
                            fontWeight: '700',
                          }}
                          title="Verified Teacher"
                        >
                          ✓ Verified
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            marginLeft: '0.35rem',
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.4rem',
                            fontWeight: '600',
                          }}
                          title="Click to take 10-question teacher verification quiz"
                        >
                          🎯 Take Quiz
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
                        ✕
                      </button>
                    </span>
                  );
                })
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No teaching skills added yet. Add one below!
                </span>
              )}
            </div>

            {/* Form to add a new teaching skill */}
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

              <button type="submit" className="btn btn-secondary btn-sm">
                ➕ Add Skill
              </button>
            </form>
          </div>

          {/* TEACHER VERIFICATION QUIZ SECTION */}
          {isQuizLoading && (
            <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <Loader message={`Starting 10-question teacher verification quiz for "${selectedQuizSkill}"...`} />
            </div>
          )}

          {quizUnavailableMessage && !isQuizLoading && (
            <div className="card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#92400e', marginBottom: '0.25rem' }}>
                    ℹ️ Verification Quiz Not Available
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#78350f', lineHeight: 1.5 }}>
                    {quizUnavailableMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizUnavailableMessage(null)}
                  className="btn btn-sm"
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {quizError && !isQuizLoading && (
            <div className="card" style={{ borderLeft: '4px solid #ef4444', backgroundColor: '#fef2f2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#b91c1c', marginBottom: '0.25rem' }}>
                    ⚠️ Quiz Notice
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#991b1b' }}>{quizError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setQuizError(null)}
                  className="btn btn-sm"
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE QUIZ QUESTIONS DISPLAY */}
          {activeQuiz && !quizResult && !isQuizLoading && (
            <div className="card" style={{ border: '2px solid var(--color-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h2 className="card-title" style={{ margin: 0, color: 'var(--color-primary)' }}>
                    🎯 Teacher Verification Quiz: {activeQuiz.skillName}
                  </h2>
                  <p className="card-subtitle" style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                    Answer 10 domain-specific questions. A score of <strong>5/10 (50%) or higher</strong> qualifies you as a verified teacher for {activeQuiz.skillName}. Questions and answer options are randomly ordered. Answer keys remain server-side.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveQuiz(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  Cancel Quiz
                </button>
              </div>

              <form onSubmit={handleSubmitQuiz} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                {activeQuiz.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--border-radius-sm)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--color-text-main)' }}>
                      Question {idx + 1} of 10: {q.question}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.options.map((option, optIdx) => {
                        const optionInputId = `quiz_${q.id}_opt_${optIdx}`;
                        return (
                          <label
                            key={optIdx}
                            htmlFor={optionInputId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: quizAnswers[q.id] === option ? '1px solid var(--color-primary)' : '1px solid #e5e7eb',
                              backgroundColor: quizAnswers[q.id] === option ? '#eff6ff' : '#ffffff',
                              fontSize: '0.9rem',
                            }}
                          >
                            <input
                              type="radio"
                              id={optionInputId}
                              name={`question_${q.id}`}
                              value={option}
                              checked={quizAnswers[q.id] === option}
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

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    style={{ flex: 1 }}
                    disabled={isSubmittingQuiz}
                  >
                    {isSubmittingQuiz ? 'Grading Answers on Server...' : '✓ Submit Quiz for Teacher Verification'}
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

          {/* QUIZ RESULT & EXPLANATIONS DISPLAY */}
          {quizResult && (
            <div
              className="card"
              style={{
                border: quizResult.passed ? '2px solid #16a34a' : '2px solid #f59e0b',
                backgroundColor: quizResult.passed ? '#f0fdf4' : '#fffbeb',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0, color: quizResult.passed ? '#166534' : '#92400e' }}>
                      {quizResult.passed ? '🎉 Teacher Verification Passed!' : '📖 Verification Attempt Result'}
                    </h2>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: quizResult.passed ? '#16a34a' : '#d97706',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        padding: '0.25rem 0.6rem',
                      }}
                    >
                      Score: {quizResult.score}/10 ({quizResult.percentage}%)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.95rem', color: quizResult.passed ? '#15803d' : '#78350f', margin: 0, lineHeight: 1.5 }}>
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
                      🔄 Retake Quiz
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

              {/* Question-by-question review & explanations */}
              <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.25rem' }}>
                  Detailed Question Review & Explanations:
                </h3>
                {quizResult.results && quizResult.results.map((res, idx) => (
                  <div
                    key={res.questionId || idx}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--border-radius-sm)',
                      border: res.isCorrect ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#111827' }}>
                        {idx + 1}. {res.question}
                      </span>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor: res.isCorrect ? '#dcfce7' : '#fee2e2',
                          color: res.isCorrect ? '#166534' : '#991b1b',
                          flexShrink: 0,
                          marginLeft: '0.5rem',
                        }}
                      >
                        {res.isCorrect ? '✓ Correct' : '✕ Incorrect'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.25rem' }}>
                      <strong>Your answer:</strong>{' '}
                      <span style={{ color: res.isCorrect ? '#15803d' : '#b91c1c', fontWeight: '500' }}>
                        {res.chosenAnswer}
                      </span>
                    </div>

                    {!res.isCorrect && (
                      <div style={{ fontSize: '0.85rem', color: '#15803d', marginBottom: '0.25rem' }}>
                        <strong>Correct answer:</strong> {res.correctAnswer}
                      </div>
                    )}

                    {res.explanation && (
                      <div style={{ fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic', marginTop: '0.35rem', borderTop: '1px dashed #e5e7eb', paddingTop: '0.35rem' }}>
                        💡 <strong>Explanation:</strong> {res.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Skills I Want to Learn */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>
                🎯 Skills I Want to Learn
              </h2>
              <span className="badge badge-student">Learning</span>
            </div>
            <p className="card-subtitle">
              Our Recommendation Engine uses these goals to suggest the best mentors for you.
            </p>

            {/* List of currently added learning skills */}
            <div className="chip-container" style={{ marginBottom: '1.25rem', minHeight: '38px' }}>
              {learnSkills.length > 0 ? (
                learnSkills.map((skill) => (
                  <span key={skill.id} className="chip chip-secondary">
                    <span>{skill.skill_name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLearnSkill(skill.id)}
                      className="chip-remove"
                      title={`Remove ${skill.skill_name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                  No learning goals added yet. Add one below!
                </span>
              )}
            </div>

            {/* Form to add a new learning skill */}
            <form onSubmit={handleAddLearnSkill} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={newLearnSkillName}
                onChange={(e) => setNewLearnSkillName(e.target.value)}
                placeholder="Topic you want to learn (e.g. Machine Learning, Rust, UI/UX)"
              />

              <button type="submit" className="btn btn-secondary btn-sm">
                ➕ Add Goal
              </button>
            </form>
          </div>

          {/* Save Profile CTA Button */}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={isSaving}
            >
              {isSaving ? '💾 Saving Profile Changes...' : '💾 Save Profile & Skills'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
