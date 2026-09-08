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
   * Adds a new skill to the "Skills I Can Teach" list.
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
    };

    setTeachSkills(prev => [...prev, newSkillItem]);
    setNewTeachSkillName('');
    setErrorMessage(null);
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
                teachSkills.map((skill) => (
                  <span key={skill.id} className="chip">
                    <span>{skill.skill_name}</span>
                    <span className="chip-level">{skill.level}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeachSkill(skill.id)}
                      className="chip-remove"
                      title={`Remove ${skill.skill_name}`}
                    >
                      ✕
                    </button>
                  </span>
                ))
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
