/**
 * ============================================================================
 * Skill Profile Page (src/pages/SkillProfile.jsx)
 * ============================================================================
 * Allows users to manage:
 * 1. Bio, Professional Summary, and Domain Specialization
 * 2. Profile Photo Upload (persisted in PostgreSQL & static assets)
 * 3. Teachable Skills with distinct Verification column (separate from "has skill")
 * 4. Canonical catalog validation with spelling suggestions (Levenshtein distance)
 * 5. Learning Goals (wanted skills validated against canonical catalog)
 * 6. Work Experience and Social Profiles
 * 7. End-to-end reload confirming PostgreSQL persistence
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getUserProfile,
  updateSkills,
  updateUserProfile,
  uploadAvatar,
  getSkillCatalog,
} from '../api/skills.js';
import { Loader, ErrorState, SuccessState } from '../components/Feedback.jsx';
import {
  UserIcon,
  SkillsIcon,
  VerifiedBadgeIcon,
  CheckIcon,
  CloseIcon,
  SwitchModeIcon,
} from '../components/Icons.jsx';

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

function matchCatalogSkill(name, catalog) {
  const clean = (name || '').trim().toLowerCase();
  if (!clean || !Array.isArray(catalog) || catalog.length === 0) return { exact: null, suggestion: null };

  const exact = catalog.find(item => item.name.toLowerCase() === clean);
  if (exact) return { exact: exact.name, suggestion: null };

  let closest = null;
  let minDistance = 3;
  for (const item of catalog) {
    const dist = levenshteinDistance(clean, item.name);
    if (dist <= 2 && dist < minDistance) {
      minDistance = dist;
      closest = item.name;
    }
  }

  return { exact: null, suggestion: closest };
}

export function SkillProfile() {
  const { user, isAuthenticated, mode, setMode, isTeacher, isLearner, updateLocalUser } = useAuth();

  // Profile data states
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [teachSkills, setTeachSkills] = useState([]);
  const [learnSkills, setLearnSkills] = useState([]);

  // Canonical skill catalog
  const [skillCatalog, setSkillCatalog] = useState([]);

  // Profile photo states
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Work experience states
  const [workExperience, setWorkExperience] = useState([]);
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpRole, setNewExpRole] = useState('');
  const [newExpDuration, setNewExpDuration] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  // Social profile links state
  const [socialProfiles, setSocialProfiles] = useState({
    github: '',
    linkedin: '',
    website: '',
    twitter: '',
  });

  // Inputs for adding skills
  const [newTeachSkillName, setNewTeachSkillName] = useState('');
  const [newTeachLevel, setNewTeachLevel] = useState('intermediate');
  const [newLearnSkillName, setNewLearnSkillName] = useState('');

  // Catalog typo suggestions
  const [teachSuggestion, setTeachSuggestion] = useState(null);
  const [learnSuggestion, setLearnSuggestion] = useState(null);

  // UI status states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  async function loadProfile() {
    const activeUserId = user ? user.id : 'usr_002';
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [profileRes, catalogRes] = await Promise.all([
        getUserProfile(activeUserId),
        getSkillCatalog().catch(() => ({ catalog: [] })),
      ]);

      setBio(profileRes.bio || profileRes.profile_summary || '');
      setUsername(profileRes.username || '');
      setSpecialization(profileRes.specialization_domain || '');
      setAvatarUrl(profileRes.avatar_url || null);

      const exp = profileRes.work_experience;
      setWorkExperience(Array.isArray(exp) ? exp : (exp ? [exp] : []));

      const socials = profileRes.social_profiles;
      if (socials && typeof socials === 'object') {
        setSocialProfiles({
          github: socials.github || '',
          linkedin: socials.linkedin || '',
          website: socials.website || '',
          twitter: socials.twitter || '',
        });
      }

      const loadedSkills = profileRes.skills || [];
      setTeachSkills(loadedSkills.filter((s) => s.type === 'teach'));
      setLearnSkills(loadedSkills.filter((s) => s.type === 'learn'));

      setSkillCatalog(catalogRes.catalog || []);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load user profile.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Hash-based smooth scrolling to targeted profile section
  useEffect(() => {
    if (!isLoading && window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const elem = document.getElementById(targetId);
      if (elem) {
        setTimeout(() => {
          elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, [isLoading]);

  function handleAddTeachSkill(event) {
    event.preventDefault();
    setTeachSuggestion(null);
    setErrorMessage(null);
    const cleanName = newTeachSkillName.trim();
    if (!cleanName) return;

    // Check catalog validation
    const match = matchCatalogSkill(cleanName, skillCatalog);
    if (!match.exact) {
      if (match.suggestion) {
        setTeachSuggestion({ input: cleanName, target: match.suggestion });
        setErrorMessage(`"${cleanName}" is not in the canonical catalog. Did you mean "${match.suggestion}"?`);
        return;
      }
      setErrorMessage(`"${cleanName}" does not exist in our approved skill catalog. Please select an approved skill (e.g. Python, Psychology, Web Design, Docker).`);
      return;
    }

    const canonicalName = match.exact;

    if (teachSkills.some((s) => s.skill_name.toLowerCase() === canonicalName.toLowerCase())) {
      setErrorMessage(`You have already listed "${canonicalName}" as a teachable skill.`);
      return;
    }

    const newSkill = {
      id: `temp_${Date.now()}`,
      skill_name: canonicalName,
      level: newTeachLevel,
      type: 'teach',
      is_verified: false,
    };

    setTeachSkills([...teachSkills, newSkill]);
    setNewTeachSkillName('');
    setSuccessMessage(`Added "${canonicalName}". Click "Save Profile Changes" below to save.`);
  }

  function handleAcceptTeachSuggestion() {
    if (!teachSuggestion) return;
    setNewTeachSkillName(teachSuggestion.target);
    setTeachSuggestion(null);
    setErrorMessage(null);
  }

  function handleRemoveTeachSkill(skillId) {
    setTeachSkills(teachSkills.filter((s) => s.id !== skillId));
  }

  function handleAddLearnSkill(event) {
    event.preventDefault();
    setLearnSuggestion(null);
    setErrorMessage(null);
    const cleanName = newLearnSkillName.trim();
    if (!cleanName) return;

    // Check catalog validation
    const match = matchCatalogSkill(cleanName, skillCatalog);
    if (!match.exact) {
      if (match.suggestion) {
        setLearnSuggestion({ input: cleanName, target: match.suggestion });
        setErrorMessage(`"${cleanName}" is not in the canonical catalog. Did you mean "${match.suggestion}"?`);
        return;
      }
      setErrorMessage(`"${cleanName}" does not exist in our approved skill catalog. Please select an approved skill (e.g. Python, Psychology, Machine Learning).`);
      return;
    }

    const canonicalName = match.exact;

    if (learnSkills.some((s) => s.skill_name.toLowerCase() === canonicalName.toLowerCase())) {
      setErrorMessage(`You have already listed "${canonicalName}" in your wanted skills.`);
      return;
    }

    const newSkill = {
      id: `temp_${Date.now()}`,
      skill_name: canonicalName,
      level: 'beginner',
      type: 'learn',
    };

    setLearnSkills([...learnSkills, newSkill]);
    setNewLearnSkillName('');
    setSuccessMessage(`Added "${canonicalName}". Click "Save Profile Changes" below to save.`);
  }

  function handleAcceptLearnSuggestion() {
    if (!learnSuggestion) return;
    setNewLearnSkillName(learnSuggestion.target);
    setLearnSuggestion(null);
    setErrorMessage(null);
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

      // Save skills to PostgreSQL (strictly validated by server against catalog)
      await updateSkills(activeUserId, {
        bio: bio,
        skills: combinedSkills,
      });

      // Save user profile metadata to PostgreSQL
      if (user && user.id) {
        await updateUserProfile(user.id, {
          profile_summary: bio,
          bio: bio,
          specialization_domain: specialization,
          work_experience: workExperience,
          social_profiles: socialProfiles,
        });
      }

      // Reload fresh profile data directly from PostgreSQL to confirm persistence
      const reloadedProfile = await getUserProfile(activeUserId);
      setBio(reloadedProfile.bio || reloadedProfile.profile_summary || '');
      setUsername(reloadedProfile.username || '');
      setSpecialization(reloadedProfile.specialization_domain || '');
      setAvatarUrl(reloadedProfile.avatar_url || null);

      const exp = reloadedProfile.work_experience;
      setWorkExperience(Array.isArray(exp) ? exp : (exp ? [exp] : []));

      const loadedSkills = reloadedProfile.skills || [];
      setTeachSkills(loadedSkills.filter((s) => s.type === 'teach'));
      setLearnSkills(loadedSkills.filter((s) => s.type === 'learn'));

      updateLocalUser({
        bio: reloadedProfile.bio || bio,
        profile_summary: reloadedProfile.profile_summary || bio,
        specialization_domain: reloadedProfile.specialization_domain || specialization,
        work_experience: reloadedProfile.work_experience || workExperience,
        social_profiles: reloadedProfile.social_profiles || socialProfiles,
        avatar_url: reloadedProfile.avatar_url || avatarUrl,
      });

      setSuccessMessage('Profile changes, skills, experience, and links saved successfully.');
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAvatarFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid image format. Please select a JPG, PNG, or WebP photo.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image size exceeds 5MB. Please choose a smaller photo.');
      return;
    }

    setErrorMessage(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleUploadAvatar() {
    if (!avatarFile) {
      setErrorMessage('Please select a photo file first.');
      return;
    }

    const activeUserId = user ? user.id : 'usr_002';
    setIsUploadingAvatar(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await uploadAvatar(activeUserId, avatarFile);
      setAvatarUrl(res.avatar_url);
      setAvatarFile(null);
      setAvatarPreview(null);
      updateLocalUser({ avatar_url: res.avatar_url });
      setSuccessMessage('Profile photo uploaded and saved successfully.');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  function handleAddExperience(e) {
    e.preventDefault();
    if (!newExpCompany.trim() || !newExpRole.trim()) {
      setErrorMessage('Organization/Company and Role/Title are required for work experience.');
      return;
    }

    const item = {
      id: `exp_${Date.now()}`,
      company: newExpCompany.trim(),
      role: newExpRole.trim(),
      duration: newExpDuration.trim() || 'Present',
      description: newExpDesc.trim(),
    };

    setWorkExperience([...workExperience, item]);
    setNewExpCompany('');
    setNewExpRole('');
    setNewExpDuration('');
    setNewExpDesc('');
    setSuccessMessage('Work experience entry added. Click "Save Profile Changes" below to commit.');
  }

  function handleRemoveExperience(index) {
    setWorkExperience(workExperience.filter((_, i) => i !== index));
  }

  function formatSocialUrl(type, raw) {
    if (!raw) return '#';
    const clean = raw.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (type === 'github') return `https://github.com/${clean.replace(/^@/, '')}`;
    if (type === 'linkedin') return `https://linkedin.com/in/${clean.replace(/^@/, '')}`;
    if (type === 'twitter') return `https://twitter.com/${clean.replace(/^@/, '')}`;
    return `https://${clean}`;
  }

  return (
    <div className="page" style={{ maxWidth: '920px' }}>
      <div className="page-header">
        <h1 className="page-title">Profile & Skills</h1>
        <p className="page-subtitle">
          Manage your bio, teachable skills, learning goals, work experience, and profile details.
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
          {/* Section 1: Learner / Teacher Mode Context */}
          <div className="card" id="mode">
            <h2 className="card-title">Active Role & Mode</h2>
            <p className="card-subtitle">
              Switch between Learner Mode and Teacher Mode at any time.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  Active Mode: <span style={{ color: mode === 'teacher' ? 'var(--color-teacher)' : 'var(--color-learner)', textTransform: 'capitalize' }}>{mode} Mode</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  {mode === 'teacher'
                    ? 'Teacher Mode: Managing offered skills, teacher qualifications, and incoming learner requests.'
                    : 'Learner Mode: Searching courses, discovering mentors, and tracking your learning goals.'}
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
          </div>

          {/* Section 2: Profile Photo Upload */}
          <div className="card" id="photo">
            <h2 className="card-title">Profile Photo</h2>
            <p className="card-subtitle">
              Upload an avatar image (JPG, PNG, or WebP up to 5MB). Synced to header and dashboard welcome greeting.
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary)' }}
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-border)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div
                    style={{
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1.8rem',
                      border: '2px solid rgba(99, 102, 241, 0.4)',
                    }}
                  >
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, minWidth: '220px' }}>
                <input
                  type="file"
                  id="avatar-file-input"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleAvatarFileChange}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <label
                    htmlFor="avatar-file-input"
                    className="btn btn-sm btn-secondary"
                    style={{ cursor: 'pointer', margin: 0 }}
                  >
                    Select Photo File
                  </label>
                  {avatarFile && (
                    <button
                      type="button"
                      onClick={handleUploadAvatar}
                      className="btn btn-sm btn-primary"
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? 'Uploading...' : 'Save Photo'}
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {avatarFile ? `Selected: ${avatarFile.name} (${Math.round(avatarFile.size / 1024)} KB)` : 'Supported formats: JPG, PNG, WebP. Maximum size: 5MB.'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Professional Summary & Bio */}
          <div className="card" id="summary">
            <h2 className="card-title">Professional Summary & Bio</h2>
            <p className="card-subtitle">
              Brief summary of your background, learning interests, or mentoring philosophy.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-bio">About You</label>
              <textarea
                id="profile-bio"
                className="form-textarea"
                rows="3"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your technical interests, mentorship focus, or learning goals..."
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="specialization-domain">Domain Specialization</label>
              <input
                id="specialization-domain"
                type="text"
                className="form-input"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Computer Science, Machine Learning, Psychology, Mathematics"
              />
            </div>
          </div>

          {/* Section 4: Skills I Can Teach (with distinct verification column) */}
          <div className="card" id="teaching">
            <span id="skills" style={{ display: 'block', position: 'relative', top: '-10px', visibility: 'hidden' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0 }}>
                  Skills I Can Teach
                </h2>
                <p className="card-subtitle" style={{ margin: 0, marginTop: '0.2rem' }}>
                  List subjects you can teach. Verified teacher qualification is tracked independently from skill listing.
                </p>
              </div>
              {isTeacher && (
                <Link to="/teacher-verification" className="btn btn-sm btn-outline">
                  Teacher Verification Hub →
                </Link>
              )}
            </div>

            {/* Teachable skills list with separate verification column */}
            <div style={{ marginBottom: '1.25rem' }}>
              {teachSkills.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '0.75rem 0' }}>
                  No teachable skills added yet. Choose an approved skill from the catalog below.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)' }}>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Skill Name</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Proficiency Level</th>
                        <th style={{ padding: '0.65rem 0.5rem' }}>Teacher Verification Status</th>
                        <th style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachSkills.map((skill) => {
                        const isVerified = Boolean(skill.is_verified) && !skill.forfeited;
                        const isForfeited = Boolean(skill.forfeited);

                        return (
                          <tr key={skill.id || skill.skill_name} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                              {skill.skill_name}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textTransform: 'capitalize' }}>
                              {skill.level || 'Intermediate'}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem' }}>
                              {isVerified ? (
                                <Link
                                  to="/teacher-verification"
                                  className="badge badge-verified"
                                  title="Verified Teacher: Qualified via document credentials"
                                  style={{ textDecoration: 'none' }}
                                >
                                  <VerifiedBadgeIcon size={12} />
                                  <span>Verified Teacher</span>
                                </Link>
                              ) : isForfeited ? (
                                <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                                  Eligibility Forfeited
                                </span>
                              ) : isTeacher ? (
                                <Link
                                  to="/teacher-verification"
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem' }}
                                >
                                  Verify Credentials
                                </Link>
                              ) : (
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                                  Not Verified
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.65rem 0.5rem', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveTeachSkill(skill.id)}
                                className="btn btn-sm btn-outline"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', color: '#f87171' }}
                                title={`Remove ${skill.skill_name}`}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Typo suggestion banner */}
            {teachSuggestion && (
              <div style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}>
                <span>Did you mean <strong>"{teachSuggestion.target}"</strong>?</span>
                <button
                  type="button"
                  onClick={handleAcceptTeachSuggestion}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '0.25rem 0.65rem' }}
                >
                  Use "{teachSuggestion.target}"
                </button>
              </div>
            )}

            {/* Add Teachable Skill Form */}
            <form onSubmit={handleAddTeachSkill} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 2, minWidth: '180px' }}
                value={newTeachSkillName}
                onChange={(e) => {
                  setNewTeachSkillName(e.target.value);
                  setTeachSuggestion(null);
                }}
                placeholder="Approved skill name (e.g. Python, Psychology, UI Design, Docker)"
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

          {/* Section 5: Skills I Want to Learn (Learning Goals) */}
          <div className="card" id="learning">
            <h2 className="card-title">Skills I Want to Learn</h2>
            <p className="card-subtitle">
              Add subjects you want to study. The recommendation engine matches you with qualified mentors teaching these topics.
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
                  No learning goals added yet. Add an approved skill from the catalog below.
                </span>
              )}
            </div>

            {/* Typo suggestion banner */}
            {learnSuggestion && (
              <div style={{
                padding: '0.65rem 1rem',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}>
                <span>Did you mean <strong>"{learnSuggestion.target}"</strong>?</span>
                <button
                  type="button"
                  onClick={handleAcceptLearnSuggestion}
                  className="btn btn-sm btn-primary"
                  style={{ padding: '0.25rem 0.65rem' }}
                >
                  Use "{learnSuggestion.target}"
                </button>
              </div>
            )}

            <form onSubmit={handleAddLearnSkill} style={{ display: 'flex', gap: '0.75rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={newLearnSkillName}
                onChange={(e) => {
                  setNewLearnSkillName(e.target.value);
                  setLearnSuggestion(null);
                }}
                placeholder="Topic or skill (e.g. Psychology, Machine Learning, React)"
              />
              <button type="submit" className="btn btn-secondary">
                Add Goal
              </button>
            </form>
          </div>

          {/* Section 6: Work Experience Manager */}
          <div className="card" id="experience">
            <h2 className="card-title">Work & Educational Experience</h2>
            <p className="card-subtitle">
              Highlight your industry experience, teaching roles, or academic background.
            </p>

            {workExperience.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {workExperience.map((exp, index) => (
                  <div
                    key={exp.id || index}
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                        {exp.role || 'Contributor'}
                        {exp.company && <span style={{ fontWeight: '400', color: 'var(--color-text-secondary)' }}> at {exp.company}</span>}
                      </div>
                      {exp.duration && (
                        <div style={{ fontSize: '0.78rem', color: '#818cf8', marginTop: '0.15rem' }}>
                          {exp.duration}
                        </div>
                      )}
                      {exp.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
                          {exp.description}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveExperience(index)}
                      className="chip-remove"
                      style={{ padding: '0.3rem', color: 'var(--color-text-muted)' }}
                      title="Remove experience"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: '1rem' }}>
                No experience entries added yet. Use the form below to add your background.
              </p>
            )}

            <form onSubmit={handleAddExperience} style={{ padding: '1rem', backgroundColor: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-border)' }}>
              <div style={{ fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
                Add New Experience Entry
              </div>
              <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Role / Title (e.g. ML Researcher)"
                  value={newExpRole}
                  onChange={(e) => setNewExpRole(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Organization / Company (e.g. University Lab)"
                  value={newExpCompany}
                  onChange={(e) => setNewExpCompany(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Duration (e.g. 2023 - Present)"
                  value={newExpDuration}
                  onChange={(e) => setNewExpDuration(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Brief summary of duties, courses taught, or achievements"
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary">
                  Add Entry
                </button>
              </div>
            </form>
          </div>

          {/* Section 7: Social Profiles & Links */}
          <div className="card" id="socials">
            <h2 className="card-title">Social Profiles & Links</h2>
            <p className="card-subtitle">
              Connect external verified profiles. Links open safely in a new tab without window context exposure.
            </p>

            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="social-github">GitHub Profile / Username</label>
                <input
                  id="social-github"
                  type="text"
                  className="form-input"
                  placeholder="username or https://github.com/username"
                  value={socialProfiles.github || ''}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, github: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="social-linkedin">LinkedIn Profile / URL</label>
                <input
                  id="social-linkedin"
                  type="text"
                  className="form-input"
                  placeholder="username or https://linkedin.com/in/username"
                  value={socialProfiles.linkedin || ''}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, linkedin: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="social-website">Personal Website / Portfolio</label>
                <input
                  id="social-website"
                  type="text"
                  className="form-input"
                  placeholder="https://yourportfolio.dev"
                  value={socialProfiles.website || ''}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, website: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="social-twitter">Twitter / X Profile</label>
                <input
                  id="social-twitter"
                  type="text"
                  className="form-input"
                  placeholder="handle or https://twitter.com/handle"
                  value={socialProfiles.twitter || ''}
                  onChange={(e) => setSocialProfiles({ ...socialProfiles, twitter: e.target.value })}
                />
              </div>
            </div>

            <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                Preview Links:
              </span>
              {socialProfiles.github && (
                <a
                  href={formatSocialUrl('github', socialProfiles.github)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  GitHub Profile ↗
                </a>
              )}
              {socialProfiles.linkedin && (
                <a
                  href={formatSocialUrl('linkedin', socialProfiles.linkedin)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  LinkedIn Profile ↗
                </a>
              )}
              {socialProfiles.website && (
                <a
                  href={formatSocialUrl('website', socialProfiles.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  Portfolio Website ↗
                </a>
              )}
              {socialProfiles.twitter && (
                <a
                  href={formatSocialUrl('twitter', socialProfiles.twitter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm btn-outline"
                >
                  Twitter / X ↗
                </a>
              )}
            </div>
          </div>

          {/* Save Profile Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '3rem' }}>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="btn btn-primary btn-lg"
              disabled={isSaving}
            >
              {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillProfile;
