/**
 * ============================================================================
 * Teacher Verification Portal (src/pages/TeacherVerification.jsx)
 * ============================================================================
 * Replaces old quiz workflow with comprehensive document verification:
 * 1. Dedicated Teacher Verification submission form (Resume PDF/DOCX, Certificate PDF/JPG/PNG, or both).
 * 2. Rules-based resume pre-check (skills, sections, dates) with clear preliminary feedback notice.
 * 3. Application tracking in PostgreSQL (submitted, under_review, needs_information, approved, rejected).
 * 4. Authorized Admin/Reviewer queue with approve, reject (mandatory reason), and request info actions.
 * 5. Transparent timeline: Notice that review typically takes 2 business days.
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getUserProfile, getSkillCatalog } from '../api/skills.js';
import {
  submitVerificationApplication,
  resubmitVerificationApplication,
  getMyVerificationApplications,
  getDocumentUrl,
} from '../api/teacherVerification.js';
import { Loader, ErrorState, SuccessState, EmptyState } from '../components/Feedback.jsx';
import {
  VerifiedBadgeIcon,
  CheckIcon,
  CloseIcon,
  SwitchModeIcon,
  SkillsIcon,
  ShieldCheckIcon,
} from '../components/Icons.jsx';

/**
 * Validates uploaded file client-side for size and format.
 */
function validateUploadedFile(file, allowedExtensions, label = 'Document', maxSizeMB = 5) {
  if (!file) return { valid: true };
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `${label} file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the ${maxSizeMB}MB limit.`,
    };
  }
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Invalid ${label.toLowerCase()} format "${ext}". Allowed types: ${allowedExtensions.join(', ')}.`,
    };
  }
  return { valid: true };
}

export function TeacherVerification() {
  const { user, isTeacher, isLearner, setMode, isDarkMode } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Tab navigation: 'apply' | 'applications'
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') === 'applications' ? 'applications' : 'apply';
  const [activeTab, setActiveTab] = useState(initialTab);

  // User profile skills and catalog
  const [taughtSkills, setTaughtSkills] = useState([]);
  const [catalogSkills, setCatalogSkills] = useState([]);
  const [applications, setApplications] = useState([]);
  const [verifiedSkills, setVerifiedSkills] = useState([]);

  // Form submission state
  const [selectedSkill, setSelectedSkill] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [notes, setNotes] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);

  // Resubmission state for existing applications
  const [resubmittingAppId, setResubmittingAppId] = useState(null);
  const [resubmitResumeFile, setResubmitResumeFile] = useState(null);
  const [resubmitCertFile, setResubmitCertFile] = useState(null);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [isResubmitting, setIsResubmitting] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  async function loadData() {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [profileRes, catalogRes, appRes] = await Promise.all([
        getUserProfile(user.id),
        getSkillCatalog().catch(() => ({ catalog: [] })),
        getMyVerificationApplications().catch(() => ({ applications: [], verifiedSkills: [] })),
      ]);

      const taught = (profileRes.skills || []).filter((s) => s.type === 'teach');
      setTaughtSkills(taught);
      setCatalogSkills(catalogRes.catalog || []);
      setApplications(appRes.applications || []);
      setVerifiedSkills(appRes.verifiedSkills || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load verification data.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  // Synchronize tab from URL query params
  useEffect(() => {
    const tab = queryParams.get('tab');
    if (tab === 'queue') {
      navigate('/reviewer', { replace: true });
    } else if (tab && ['apply', 'applications'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    navigate(`/teacher-verification?tab=${tab}`, { replace: true });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  // Handle application submission
  async function handleSubmitApplication(e) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetSkill = selectedSkill === 'custom' ? customSkill.trim() : selectedSkill.trim();
    if (!targetSkill) {
      setErrorMessage('Please select or specify a skill to verify.');
      return;
    }

    if (!resumeFile && !certificateFile) {
      setErrorMessage('At least one document (Resume or Certificate) is required for verification.');
      return;
    }

    // Validate file types and sizes (<= 5MB)
    if (resumeFile) {
      const v = validateUploadedFile(resumeFile, ['.pdf', '.docx'], 'Resume');
      if (!v.valid) {
        setErrorMessage(v.error);
        return;
      }
    }
    if (certificateFile) {
      const v = validateUploadedFile(certificateFile, ['.pdf', '.jpg', '.jpeg', '.png'], 'Certificate');
      if (!v.valid) {
        setErrorMessage(v.error);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('skillName', targetSkill);
      if (notes) formData.append('notes', notes);
      if (resumeFile) formData.append('resume', resumeFile);
      if (certificateFile) formData.append('certificate', certificateFile);

      const res = await submitVerificationApplication(formData);
      setSuccessMessage(
        res.message || 'Application submitted successfully! Our team typically processes reviews within 2 business days.'
      );

      // Reset form
      setResumeFile(null);
      setCertificateFile(null);
      setNotes('');
      setSelectedSkill('');
      setCustomSkill('');

      // Refresh applications list
      await loadData();
      setActiveTab('applications');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit verification application.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle document resubmission / updates for an existing application
  async function handleResubmitApplication(appId) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resubmitResumeFile && !resubmitCertFile && !resubmitNotes.trim()) {
      setErrorMessage('Please provide an updated resume, certificate, or explanatory notes.');
      return;
    }

    if (resubmitResumeFile) {
      const v = validateUploadedFile(resubmitResumeFile, ['.pdf', '.docx'], 'Resume');
      if (!v.valid) {
        setErrorMessage(v.error);
        return;
      }
    }

    if (resubmitCertFile) {
      const v = validateUploadedFile(resubmitCertFile, ['.pdf', '.jpg', '.jpeg', '.png'], 'Certificate');
      if (!v.valid) {
        setErrorMessage(v.error);
        return;
      }
    }

    setIsResubmitting(true);
    try {
      const formData = new FormData();
      if (resubmitResumeFile) formData.append('resume', resubmitResumeFile);
      if (resubmitCertFile) formData.append('certificate', resubmitCertFile);
      if (resubmitNotes.trim()) formData.append('notes', resubmitNotes.trim());

      const res = await resubmitVerificationApplication(appId, formData);
      setSuccessMessage(
        res.message || 'Updated documents received. Review is expected within 2 business days.'
      );

      // Reset resubmission state
      setResubmittingAppId(null);
      setResubmitResumeFile(null);
      setResubmitCertFile(null);
      setResubmitNotes('');

      // Refresh data
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resubmit verification documents.');
    } finally {
      setIsResubmitting(false);
    }
  }

  // Guard: unauthenticated visitor
  if (!user) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '650px', margin: '3rem auto', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', marginBottom: '1.25rem' }}>
            <VerifiedBadgeIcon size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem' }}>
            Teacher Verification Portal
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            Please sign in to your SkillExchange account to apply for teacher verification or track your application status.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.75rem', fontWeight: '700' }}
          >
            Sign In to Apply
          </button>
        </div>
      </div>
    );
  }

  // Guard: loading profile & catalog data
  if (isLoading) {
    return (
      <div className="page-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <Loader message="Loading verification data..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header Banner */}
      {/* Header Banner without emojis or blue boxes */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <VerifiedBadgeIcon size={28} />
            Teacher Verification Hub
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.45rem', fontSize: '0.94rem', lineHeight: '1.6', maxWidth: '820px' }}>
            Submit your resume, certificate, or both for document verification. Review typically takes two business days. Once approved by our verification reviewer, your skill receives an official verified badge qualifying you to teach.
          </p>
        </div>
      </div>

      {/* Non-blocking Learner Mode informative banner */}
      {isLearner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '0.85rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-primary-light)',
          border: '1px solid var(--color-border)',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <VerifiedBadgeIcon size={20} />
            <span style={{ fontSize: '0.92rem', color: 'var(--color-text-primary)' }}>
              You are currently browsing in <strong>Learner Mode</strong>. You can submit documents below to verify skills you wish to teach, or switch to Teacher Mode.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMode('teacher')}
            className="btn btn-sm btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
          >
            <SwitchModeIcon size={14} />
            Switch to Teacher Mode
          </button>
        </div>
      )}

      {/* Authorized reviewer portal direct navigation */}
      {user && (user.role === 'admin' || user.email === 'kailashsampath15@gmail.com') && (
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => navigate('/reviewer')}
            className="btn btn-sm btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ShieldCheckIcon size={16} />
            Open Reviewer Adjudication Portal &rarr;
          </button>
        </div>
      )}

      {errorMessage && (
        <ErrorState message={errorMessage} onRetry={() => setErrorMessage(null)} />
      )}
      {successMessage && (
        <SuccessState message={successMessage} onDismiss={() => setSuccessMessage(null)} />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.75rem' }}>
        <button
          onClick={() => handleTabChange('apply')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'apply' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'apply' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'apply' ? '700' : '600',
            cursor: 'pointer',
          }}
        >
          Submit Verification Application
        </button>
        <button
          onClick={() => handleTabChange('applications')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'applications' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'applications' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: activeTab === 'applications' ? '700' : '600',
            cursor: 'pointer',
          }}
        >
          My Applications & Credentials ({applications.length})
        </button>
      </div>

      {/* TAB 1: SUBMIT APPLICATION */}
      {activeTab === 'apply' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '800px' }}>
          <div className="card" style={{ padding: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.25rem' }}>
              Apply to Verify a Teachable Skill
            </h2>

            <form onSubmit={handleSubmitApplication}>
              {/* Skill Selection */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>
                  Select Skill to Verify *
                </label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">-- Choose a Skill --</option>
                  <optgroup label="Skills Offered on Your Profile">
                    {taughtSkills.map((s) => (
                      <option key={s.id || s.skill_name} value={s.skill_name}>
                        {s.skill_name} ({s.level || 'intermediate'}) {s.is_verified ? '✓ (Already Verified)' : ''}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Official Course Catalog">
                    {catalogSkills.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name} — {c.category}
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">+ Specify Another Skill</option>
                </select>
              </div>

              {selectedSkill === 'custom' && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    Custom Skill Name *
                  </label>
                  <input
                    type="text"
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    placeholder="e.g. Python, Machine Learning, React"
                    className="form-input"
                    required
                  />
                </div>
              )}

              {/* Document Uploads: Resume & Certificate */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Resume Upload */}
                <div>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    Resume / CV (PDF or DOCX, max 5MB)
                  </label>
                  <div
                    className="doc-upload-box"
                    onClick={() => document.getElementById('resume-file-input').click()}
                  >
                    <input
                      id="resume-file-input"
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(e) => setResumeFile(e.target.files[0] || null)}
                    />
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                    {resumeFile ? (
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--color-primary)' }}>{resumeFile.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {(resumeFile.size / 1024).toFixed(1)} KB — Click to change
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: '600' }}>Click or drop Resume here</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>PDF, DOCX up to 5MB</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Certificate Upload */}
                <div>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    Certificate / License (PDF, JPG, PNG, max 5MB)
                  </label>
                  <div
                    className="doc-upload-box"
                    onClick={() => document.getElementById('cert-file-input').click()}
                  >
                    <input
                      id="cert-file-input"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      style={{ display: 'none' }}
                      onChange={(e) => setCertificateFile(e.target.files[0] || null)}
                    />
                    <div style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                      <VerifiedBadgeIcon size={28} />
                    </div>
                    {certificateFile ? (
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--color-success)' }}>{certificateFile.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {(certificateFile.size / 1024).toFixed(1)} KB — Click to change
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: '600' }}>Click or drop Certificate here</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>PDF, JPG, PNG up to 5MB</div>
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.4rem', marginBottom: 0 }}>
                    For multiple certificates, combine them into a single PDF before uploading.
                  </p>
                </div>
              </div>

              {/* Additional Applicant Notes */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>
                  Notes for the Reviewer (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Certificate issued by Coursera/Stanford; 4 years teaching experience"
                  className="form-input"
                />
              </div>

              {/* Human Review & Turnaround Notice */}
              <div className="precheck-feedback-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', color: 'var(--color-primary)', fontWeight: '700' }}>
                  <ShieldCheckIcon size={18} />
                  <span>Human Review Process</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Your documents are checked only for allowed file types and size limits, and kept private to you and our authorized reviewer.
                  Every approval or rejection decision is made manually by a human reviewer. Review typically takes <strong>2 business days</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.85rem', fontWeight: '700', fontSize: '1rem' }}
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Documents for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: MY APPLICATIONS & CREDENTIALS */}
      {activeTab === 'applications' && (
        <div>
          {/* Verified Skills Display */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <VerifiedBadgeIcon size={20} />
              Active Verified Teaching Credentials ({verifiedSkills.length})
            </h2>
            {verifiedSkills.length === 0 ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No verified skills yet. Submit documents above to get your first teaching verification badge!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {verifiedSkills.map((vs) => (
                  <div
                    key={vs.id || vs.skill_name}
                    className="card"
                    style={{
                      padding: '1.25rem',
                      borderLeft: '4px solid var(--color-success)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>{vs.skill_name}</span>
                      <span style={{ color: 'var(--color-success)' }}>✓ Verified</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                      Proficiency: <strong style={{ textTransform: 'capitalize' }}>{vs.level || 'Intermediate'}</strong>
                    </div>
                    {vs.verified_at && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                        Verified on: {new Date(vs.verified_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications History */}
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1rem' }}>
              Application History & Review Status ({applications.length})
            </h2>
            {applications.length === 0 ? (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                You have not submitted any verification applications yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {applications.map((app) => {
                  const isUnderReviewOrSubmitted = ['submitted', 'under_review'].includes(app.status);
                  const canResubmit = ['needs_information', 'rejected', 'submitted'].includes(app.status);
                  const isResubmitOpen = resubmittingAppId === app.id;
                  const historyList = Array.isArray(app.history) ? app.history : [];

                  return (
                    <div key={app.id} className="card" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                      {/* Top Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.35rem' }}>
                            {app.skill_name}
                          </h3>
                          <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                            Submitted: {new Date(app.created_at).toLocaleDateString()} at {new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {app.reviewed_at && (
                              <span> • Reviewed on {new Date(app.reviewed_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <span className={`status-chip ${app.status}`} style={{ textTransform: 'capitalize', fontWeight: '700' }}>
                          {app.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Timeline / Expected Review Notice */}
                      {isUnderReviewOrSubmitted && (
                        <div
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            fontSize: '0.86rem',
                            color: 'var(--color-primary)',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <ShieldCheckIcon size={18} />
                          <span>
                            <strong>Estimated Review Time:</strong> Our review team typically processes submissions within <strong>2 business days</strong>.
                          </span>
                        </div>
                      )}

                      {/* Uploaded Documents */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                          Uploaded Verification Documents
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {app.resume_original_name ? (
                            <a
                              href={getDocumentUrl(app.id, 'resume')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                            >
                              📄 View Resume ({app.resume_original_name}) ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              No resume attached
                            </span>
                          )}

                          {app.certificate_original_name ? (
                            <a
                              href={getDocumentUrl(app.id, 'certificate')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
                            >
                              <VerifiedBadgeIcon size={14} />
                              View Certificate ({app.certificate_original_name}) ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                              No certificate attached
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reviewer Feedback / Decisions */}
                      {app.rejection_reason && (
                        <div
                          style={{
                            marginBottom: '1rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.88rem',
                            color: 'var(--color-danger)',
                          }}
                        >
                          <strong>Reviewer Decision — Rejection Reason:</strong> {app.rejection_reason}
                        </div>
                      )}

                      {app.reviewer_notes && (
                        <div
                          style={{
                            marginBottom: '1rem',
                            padding: '0.85rem 1rem',
                            borderRadius: '8px',
                            backgroundColor: app.status === 'needs_information' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid ' + (app.status === 'needs_information' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(245, 158, 11, 0.3)'),
                            fontSize: '0.88rem',
                            color: app.status === 'needs_information' ? '#7e22ce' : '#b45309',
                          }}
                        >
                          <strong>{app.status === 'needs_information' ? 'Action Required — Reviewer Requested Information:' : 'Reviewer Note:'}</strong> {app.reviewer_notes}
                        </div>
                      )}

                      {/* Status & Next Steps */}
                      <div
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(37, 99, 235, 0.04)',
                          border: '1px solid var(--color-border)',
                          marginBottom: '1rem',
                          fontSize: '0.82rem',
                          color: 'var(--color-text-secondary)',
                          lineHeight: '1.45',
                        }}
                      >
                        <strong style={{ color: 'var(--color-text-primary)' }}>Next Steps: </strong>
                        {app.status === 'submitted' && 'Your application is in the queue for manual review. Review typically takes 2 business days.'}
                        {app.status === 'under_review' && 'A human reviewer is currently reviewing your uploaded documents. You will be notified once a decision is made.'}
                        {app.status === 'needs_information' && 'Please review the reviewer’s note above and upload updated documents or a clarification below.'}
                        {app.status === 'approved' && 'Your teaching skill is verified! Learners can now see your verified badge and book sessions with you for this skill.'}
                        {app.status === 'rejected' && 'You may upload updated or replacement documents below to submit a new review request.'}
                      </div>

                      {/* Application Revision History */}
                      {historyList.length > 1 && (
                        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', fontSize: '0.82rem' }}>
                          <div style={{ fontWeight: '700', marginBottom: '0.4rem', color: 'var(--color-text-secondary)' }}>
                            Document Revision History ({historyList.length} updates)
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-muted)' }}>
                            {historyList.map((h, hIdx) => (
                              <li key={hIdx} style={{ marginBottom: '0.25rem' }}>
                                <span>{new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: </span>
                                <strong style={{ textTransform: 'capitalize' }}>{h.action ? h.action.replace('_', ' ') : 'Update'}</strong>
                                {h.applicant_notes && <span> — "{h.applicant_notes}"</span>}
                                {h.reviewer_notes && <span> — Reviewer: "{h.reviewer_notes}"</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Resubmission Section */}
                      {canResubmit && (
                        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '0.75rem' }}>
                          {!isResubmitOpen ? (
                            <button
                              type="button"
                              onClick={() => {
                                setResubmittingAppId(app.id);
                                setResubmitResumeFile(null);
                                setResubmitCertFile(null);
                                setResubmitNotes('');
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}
                            >
                              <span>Submit Corrected or Additional Documents</span>
                              &rarr;
                            </button>
                          ) : (
                            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <strong style={{ fontSize: '0.92rem' }}>Resubmit Documents for "{app.skill_name}"</strong>
                                <button
                                  type="button"
                                  onClick={() => setResubmittingAppId(null)}
                                  className="btn btn-sm btn-outline"
                                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.78rem' }}
                                >
                                  Cancel
                                </button>
                              </div>

                              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                                Upload replacement or supplemental files. Your previous history will be preserved.
                              </p>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                                    Replacement Resume (PDF/DOCX, max 5MB)
                                  </label>
                                  <input
                                    type="file"
                                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    onChange={(e) => setResubmitResumeFile(e.target.files[0] || null)}
                                    style={{ fontSize: '0.82rem' }}
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                                    Replacement Certificate (PDF/JPG/PNG, max 5MB)
                                  </label>
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                    onChange={(e) => setResubmitCertFile(e.target.files[0] || null)}
                                    style={{ fontSize: '0.82rem' }}
                                  />
                                  <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    For multiple certificates, combine them into a single PDF before uploading.
                                  </div>
                                </div>
                              </div>

                              <div style={{ marginBottom: '0.75rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                                  Notes on what was updated (optional)
                                </label>
                                <input
                                  type="text"
                                  value={resubmitNotes}
                                  onChange={(e) => setResubmitNotes(e.target.value)}
                                  placeholder="e.g. Attached higher resolution certificate with verifiable URL"
                                  className="form-input"
                                  style={{ fontSize: '0.85rem' }}
                                />
                              </div>

                              <button
                                type="button"
                                disabled={isResubmitting || (!resubmitResumeFile && !resubmitCertFile && !resubmitNotes.trim())}
                                onClick={() => handleResubmitApplication(app.id)}
                                className="btn btn-primary btn-sm"
                                style={{ fontWeight: '700' }}
                              >
                                {isResubmitting ? 'Submitting...' : 'Upload & Resubmit Application'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
