/**
 * ============================================================================
 * Reviewer Portal (src/pages/ReviewerPortal.jsx)
 * ============================================================================
 * Dedicated Reviewer Portal for Teacher Verification Applications.
 *
 * AUTHORIZATION:
 * Strictly restricted to the sole designated reviewer account:
 * kailashsampath15@gmail.com (enforced on both frontend and server).
 * All other accounts receive an Access Denied view.
 *
 * FEATURES:
 * - Comprehensive Queue: Lists all teacher-verification applications (not just pending).
 * - Live Filtering: Filter by status (All, Submitted, Under Review, Needs Info, Approved, Rejected).
 * - Real-Time Search: Query by applicant name, email, or requested skill.
 * - Pagination: High-performance paginated navigation.
 * - Application Detail View: Applicant details, requested skill, documents,
 *   preliminary resume-check findings, status history, and reviewer decisions.
 * - Secure Document Access: Secure token-authenticated preview/download for applicant & reviewer only.
 * - Adjudication Actions: Approve, Reject (with required reason), Request More Information (with required message).
 * - In-App Notifications: Records decision in PostgreSQL and notifies applicant in-app.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getReviewerQueuePaginated,
  getReviewerApplication,
  reviewApplication,
} from '../api/teacherVerification.js';
import {
  ShieldCheckIcon,
  SearchIcon,
  VerifiedBadgeIcon,
  CloseIcon,
} from '../components/Icons.jsx';

const SOLE_REVIEWER_EMAIL = 'kailashsampath15@gmail.com';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'AP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return isoString;
  }
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReviewerPortal() {
  const { user, isReviewer } = useAuth();

  // Queue state
  const [applications, setApplications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('all');
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    submitted: 0,
    under_review: 0,
    needs_information: 0,
    approved: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail modal state
  const [selectedApp, setSelectedApp] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Review action state inside detail modal
  const [activeAction, setActiveAction] = useState(null); // 'approve' | 'reject' | 'request_info' | 'mark_under_review'
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Strict check on client
  const isAuthorizedReviewer = Boolean(
    user &&
    user.email &&
    user.email.trim().toLowerCase() === SOLE_REVIEWER_EMAIL
  );

  const fetchQueue = useCallback(async () => {
    if (!isAuthorizedReviewer) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getReviewerQueuePaginated({
        status: statusFilter,
        search: searchQuery,
        skill: skillFilter,
        page: currentPage,
        limit: 12,
      });

      if (res) {
        setApplications(res.applications || res.queue || []);
        setTotalCount(res.totalCount || res.count || 0);
        setTotalPages(res.totalPages || 1);
        if (res.statusCounts) {
          setStatusCounts(res.statusCounts);
        }
      }
    } catch (err) {
      console.error('Failed to load reviewer queue:', err);
      setError(err.message || 'Could not load applications queue from server.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorizedReviewer, statusFilter, searchQuery, skillFilter, currentPage]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function handleOpenDetail(appId) {
    setIsLoadingDetail(true);
    setDetailError(null);
    setActiveAction(null);
    setActionReason('');
    try {
      const res = await getReviewerApplication(appId);
      if (res && res.application) {
        setSelectedApp(res.application);
      } else {
        const fallback = applications.find(a => a.id === appId);
        setSelectedApp(fallback || null);
      }
    } catch (err) {
      console.error('Failed to load application detail:', err);
      const fallback = applications.find(a => a.id === appId);
      if (fallback) {
        setSelectedApp(fallback);
      } else {
        setDetailError(err.message || 'Failed to load details.');
      }
    } finally {
      setIsLoadingDetail(false);
    }
  }

  function handleCloseDetail() {
    setSelectedApp(null);
    setActiveAction(null);
    setActionReason('');
    setShowConfirmModal(false);
  }

  function handleSelectAction(action) {
    setActiveAction(action);
    setActionReason('');
  }

  function handlePromptConfirm() {
    if ((activeAction === 'reject' || activeAction === 'request_info') && !actionReason.trim()) {
      alert(`A required ${activeAction === 'reject' ? 'rejection reason' : 'message to the applicant'} must be provided.`);
      return;
    }
    setShowConfirmModal(true);
  }

  async function executeDecision() {
    if (!selectedApp || !activeAction) return;
    setIsSubmittingAction(true);
    setShowConfirmModal(false);

    try {
      const payload = {
        action: activeAction,
        reason: actionReason.trim(),
        notes: actionReason.trim(),
      };
      const res = await reviewApplication(selectedApp.id, payload);

      setToastMessage({
        type: 'success',
        text: res.message || `Application successfully updated to ${activeAction.replace('_', ' ')}.`,
      });

      // Update selected application in place
      if (res.application) {
        setSelectedApp(res.application);
      }

      // Refresh queue
      await fetchQueue();
      setTimeout(() => {
        handleCloseDetail();
      }, 1400);
    } catch (err) {
      console.error('Review action failed:', err);
      alert(`Action failed: ${err.message}`);
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function openDocumentSecure(appId, docType) {
    const token = localStorage.getItem('token');
    const url = `/api/teacher-verification/documents/${appId}/${docType}?token=${encodeURIComponent(token || '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Not logged in or unauthorized
  if (!user) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <ShieldCheckIcon size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 1rem' }} />
          <h2>Reviewer Portal Authentication Required</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
            Please log in with the designated reviewer account to access the teacher verification queue.
          </p>
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  if (!isAuthorizedReviewer) {
    return (
      <div className="page-container" style={{ padding: '2rem 1.5rem', maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ color: 'var(--color-danger, #dc2626)', marginBottom: '0.75rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
            The Reviewer Portal is strictly restricted to the designated sole verification reviewer (<code>{SOLE_REVIEWER_EMAIL}</code>).
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
            Your authenticated account (<code>{user.email}</code>) does not hold reviewer privileges. All reviewer endpoints enforce server-side email validation.
          </p>
          <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const statusPills = [
    { key: 'all', label: 'All Applications', count: statusCounts.all },
    { key: 'submitted', label: 'Submitted', count: statusCounts.submitted },
    { key: 'under_review', label: 'Under Review', count: statusCounts.under_review },
    { key: 'needs_information', label: 'Needs Info', count: statusCounts.needs_information },
    { key: 'approved', label: 'Approved', count: statusCounts.approved },
    { key: 'rejected', label: 'Rejected', count: statusCounts.rejected },
  ];

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            backgroundColor: toastMessage.type === 'success' ? '#059669' : '#dc2626',
            color: '#ffffff',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: '600',
            fontSize: '0.9rem',
          }}
        >
          <span>✓</span>
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '0.5rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(124, 58, 237, 0.15)',
                color: '#8b5cf6',
              }}
            >
              <ShieldCheckIcon size={20} />
            </span>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', margin: 0 }}>Reviewer Portal</h1>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#059669',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              Sole Reviewer Active
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', margin: 0 }}>
            Authorized portal for {SOLE_REVIEWER_EMAIL}. Review qualifications, pre-check diagnostics, and approve teacher credentials.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={isLoading}
          className="btn btn-outline btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
        >
          <span>↻</span>
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        {statusPills.map((pill) => {
          const isActive = statusFilter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => {
                setStatusFilter(pill.key);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: '600',
                border: '1px solid',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-surface)',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>{pill.label}</span>
              <span
                style={{
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(148, 163, 184, 0.18)',
                  color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                }}
              >
                {pill.count || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '260px', maxWidth: '480px' }}>
          <SearchIcon
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search by applicant name, email, or skill..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
          Showing <strong>{applications.length}</strong> of <strong>{totalCount}</strong> applications
        </div>
      </div>

      {/* Queue List / Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          Loading teacher verification queue...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <p>{error}</p>
          <button onClick={fetchQueue} className="btn btn-outline btn-sm">Try Again</button>
        </div>
      ) : applications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--color-text-muted)' }}>
          <VerifiedBadgeIcon size={44} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
            No Applications Found
          </h3>
          <p style={{ maxWidth: '440px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            {searchQuery || statusFilter !== 'all'
              ? 'No verification applications match your current status or search filters.'
              : 'There are currently no teacher verification applications in the queue.'}
          </p>
          {(searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="btn btn-outline btn-sm"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          {applications.map((app) => {
            const applicant = app.applicant || {};
            const statusConfig = {
              submitted: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb', label: 'Submitted' },
              under_review: { bg: 'rgba(217, 119, 6, 0.12)', text: '#d97706', label: 'Under Review' },
              needs_information: { bg: 'rgba(168, 85, 247, 0.12)', text: '#9333ea', label: 'Needs Info' },
              approved: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', label: 'Approved' },
              rejected: { bg: 'rgba(220, 38, 38, 0.12)', text: '#dc2626', label: 'Rejected' },
            }[app.status] || { bg: 'rgba(148, 163, 184, 0.15)', text: '#64748b', label: app.status };

            return (
              <div
                key={app.id}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '12px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div>
                  {/* Top: Status & Submission Date */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.65rem',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.text,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {statusConfig.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {formatDate(app.created_at)}
                    </span>
                  </div>

                  {/* Applicant Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-primary-light, #eff6ff)',
                        color: 'var(--color-primary, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.88rem',
                        flexShrink: 0,
                      }}
                    >
                      {applicant.avatar_url ? (
                        <img
                          src={applicant.avatar_url}
                          alt={applicant.name || 'Applicant'}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        getInitials(applicant.name)
                      )}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.96rem', color: 'var(--color-text-primary)' }}>
                        {applicant.name || 'Applicant'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {applicant.email || 'No email'}
                      </div>
                    </div>
                  </div>

                  {/* Skill Badge */}
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '0.25rem' }}>
                      Requested Skill
                    </div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: 'var(--color-primary)',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                      }}
                    >
                      {app.skill_name}
                    </span>
                  </div>

                  {/* Documents uploaded pills */}
                  <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {app.resume_filename && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.18rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(148, 163, 184, 0.12)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        📄 Resume ({formatBytes(app.resume_size)})
                      </span>
                    )}
                    {app.certificate_filename && (
                      <span
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.18rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(148, 163, 184, 0.12)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        🎓 Certificate ({formatBytes(app.certificate_size)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <button
                  onClick={() => handleOpenDetail(app.id)}
                  className="btn btn-outline btn-sm"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                >
                  View Details & Adjudicate
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="btn btn-outline btn-sm"
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="btn btn-outline btn-sm"
          >
            Next →
          </button>
        </div>
      )}

      {/* Application Detail & Review Modal */}
      {selectedApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDetail();
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              borderRadius: '16px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              position: 'relative',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0 }}>
                    Application: {selectedApp.skill_name}
                  </h2>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(37, 99, 235, 0.1)',
                      color: 'var(--color-primary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {selectedApp.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Submitted on {formatDate(selectedApp.created_at)} • Application ID: {selectedApp.id}
                </div>
              </div>
              <button
                onClick={handleCloseDetail}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                }}
                aria-label="Close dialog"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            {/* Applicant Profile Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '10px',
                backgroundColor: 'var(--color-bg-secondary, #f8fafc)',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary-light, #eff6ff)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1rem',
                  flexShrink: 0,
                }}
              >
                {selectedApp.applicant && selectedApp.applicant.avatar_url ? (
                  <img
                    src={selectedApp.applicant.avatar_url}
                    alt={selectedApp.applicant.name}
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(selectedApp.applicant ? selectedApp.applicant.name : '')
                )}
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                  {selectedApp.applicant ? selectedApp.applicant.name : 'Applicant'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  {selectedApp.applicant ? selectedApp.applicant.email : ''}
                </div>
                {selectedApp.applicant && selectedApp.applicant.reputation_score && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Current Reputation: <strong>{selectedApp.applicant.reputation_score} / 5.0</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Submitted Documents Section */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
                Submitted Verification Documents
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {selectedApp.resume_filename ? (
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                      📄 Resume Document
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
                      {selectedApp.resume_original_name || selectedApp.resume_filename} • {formatBytes(selectedApp.resume_size)}
                    </div>
                    <button
                      type="button"
                      onClick={() => openDocumentSecure(selectedApp.id, 'resume')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}
                    >
                      Preview / Download Resume ↗
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    No resume uploaded
                  </div>
                )}

                {selectedApp.certificate_filename ? (
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                      🎓 Certificate Document
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.65rem' }}>
                      {selectedApp.certificate_original_name || selectedApp.certificate_filename} • {formatBytes(selectedApp.certificate_size)}
                    </div>
                    <button
                      type="button"
                      onClick={() => openDocumentSecure(selectedApp.id, 'certificate')}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}
                    >
                      Preview / Download Certificate ↗
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: '8px', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    No certificate uploaded
                  </div>
                )}
              </div>
            </div>

            {/* Human Review Guidance */}
            <div
              style={{
                padding: '0.9rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                border: '1px solid rgba(37, 99, 235, 0.2)',
                marginBottom: '1.25rem',
                fontSize: '0.82rem',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.5',
              }}
            >
              <strong style={{ color: 'var(--color-primary)' }}>Manual Review Guidelines: </strong>
              Inspect the applicant’s uploaded resume and/or certificate above, then select an action below. Every approval, information request, or rejection decision is made solely by you and recorded in the application history.
            </div>

            {/* Document Revision History */}
            {selectedApp.history && Array.isArray(selectedApp.history) && selectedApp.history.length > 0 && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '1.25rem',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '0.45rem', color: 'var(--color-text-primary)' }}>
                  Application & Revision History ({selectedApp.history.length} events)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedApp.history.map((h, hIdx) => (
                    <div
                      key={hIdx}
                      style={{
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <strong style={{ textTransform: 'capitalize' }}>
                          {h.action ? h.action.replace('_', ' ') : 'Event'}
                        </strong>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.74rem' }}>
                          {formatDate(h.timestamp)}
                        </span>
                      </div>
                      {h.applicant_notes && (
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          Applicant note: "{h.applicant_notes}"
                        </div>
                      )}
                      {h.reviewer_notes && (
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          Reviewer note: "{h.reviewer_notes}"
                        </div>
                      )}
                      {h.rejection_reason && (
                        <div style={{ color: '#dc2626' }}>
                          Rejection reason: "{h.rejection_reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status History & Previous Decision */}
            {(selectedApp.reviewer_notes || selectedApp.rejection_reason || selectedApp.reviewed_at) && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '1.25rem',
                  fontSize: '0.84rem',
                }}
              >
                <div style={{ fontWeight: '700', marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                  Latest Decision Record
                </div>
                {selectedApp.reviewed_at && (
                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                    Adjudicated on {formatDate(selectedApp.reviewed_at)}
                  </div>
                )}
                {selectedApp.rejection_reason && (
                  <div style={{ color: '#dc2626', marginTop: '0.25rem' }}>
                    <strong>Rejection Reason:</strong> {selectedApp.rejection_reason}
                  </div>
                )}
                {selectedApp.reviewer_notes && (
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                    <strong>Reviewer Notes:</strong> {selectedApp.reviewer_notes}
                  </div>
                )}
              </div>
            )}

            {/* Adjudication Actions Section */}
            <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '1.25rem' }}>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                Reviewer Adjudication Actions
              </div>

              {/* Action selection pills */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => handleSelectAction('approve')}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: activeAction === 'approve' ? '#059669' : 'transparent',
                    borderColor: '#059669',
                    color: activeAction === 'approve' ? '#ffffff' : '#059669',
                  }}
                >
                  ✓ Approve Skill
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAction('request_info')}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: activeAction === 'request_info' ? '#7c3aed' : 'transparent',
                    borderColor: '#7c3aed',
                    color: activeAction === 'request_info' ? '#ffffff' : '#7c3aed',
                  }}
                >
                  💬 Request More Information
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAction('reject')}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: activeAction === 'reject' ? '#dc2626' : 'transparent',
                    borderColor: '#dc2626',
                    color: activeAction === 'reject' ? '#ffffff' : '#dc2626',
                  }}
                >
                  ✕ Reject Application
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAction('mark_under_review')}
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: activeAction === 'mark_under_review' ? '#d97706' : 'transparent',
                    borderColor: '#d97706',
                    color: activeAction === 'mark_under_review' ? '#ffffff' : '#d97706',
                  }}
                >
                  ⏳ Mark Under Review
                </button>
              </div>

              {/* Action input field */}
              {activeAction && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      marginBottom: '0.45rem',
                      color: activeAction === 'reject' ? '#dc2626' : 'var(--color-text-primary)',
                    }}
                  >
                    {activeAction === 'reject' && 'Required Rejection Reason (visible to applicant):'}
                    {activeAction === 'request_info' && 'Required Message to Applicant (what extra details are needed):'}
                    {activeAction === 'approve' && 'Reviewer Notes (optional confirmation comments):'}
                    {activeAction === 'mark_under_review' && 'Notes for internal review tracking (optional):'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      activeAction === 'reject'
                        ? 'State clearly why credentials were not accepted (e.g. certificate name mismatch, expired license)...'
                        : activeAction === 'request_info'
                        ? 'Please describe specifically what documentation or clarification is needed...'
                        : 'Optional notes for audit logs...'
                    }
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.88rem',
                      resize: 'vertical',
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem', gap: '0.65rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveAction(null)}
                      className="btn btn-outline btn-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePromptConfirm}
                      disabled={
                        ((activeAction === 'reject' || activeAction === 'request_info') && !actionReason.trim()) ||
                        isSubmittingAction
                      }
                      className="btn btn-sm btn-primary"
                      style={{
                        backgroundColor:
                          activeAction === 'approve'
                            ? '#059669'
                            : activeAction === 'reject'
                            ? '#dc2626'
                            : activeAction === 'request_info'
                            ? '#7c3aed'
                            : '#d97706',
                        borderColor: 'transparent',
                      }}
                    >
                      Confirm {activeAction.replace('_', ' ').toUpperCase()}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              borderRadius: '12px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.75rem' }}>
              Confirm {activeAction === 'approve' ? 'Approval' : activeAction === 'reject' ? 'Rejection' : 'Action'}?
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '1.5rem' }}>
              {activeAction === 'approve' && (
                <>
                  Are you sure you want to approve <strong>{selectedApp.applicant?.name}</strong> to teach <strong>{selectedApp.skill_name}</strong>? This will immediately verify their skill and allow them to offer sessions.
                </>
              )}
              {activeAction === 'reject' && (
                <>
                  Are you sure you want to reject this application? The applicant will be notified with your stated reason: &quot;{actionReason}&quot;.
                </>
              )}
              {activeAction === 'request_info' && (
                <>
                  Send information request to <strong>{selectedApp.applicant?.name}</strong>? The application will transition to Needs Information and the applicant will be notified in-app.
                </>
              )}
              {activeAction === 'mark_under_review' && (
                <>
                  Mark this application as Under Review?
                </>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-outline btn-sm"
                disabled={isSubmittingAction}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={executeDecision}
                disabled={isSubmittingAction}
                className="btn btn-sm btn-primary"
                style={{
                  backgroundColor: activeAction === 'approve' ? '#059669' : (activeAction === 'reject' ? '#dc2626' : '#7c3aed'),
                }}
              >
                {isSubmittingAction ? 'Recording...' : 'Yes, Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
