/**
 * ============================================================================
 * Teacher Verification API Client (src/api/teacherVerification.js)
 * ============================================================================
 *
 * Dedicated client for teacher qualification via document verification:
 * - Submits resumes (PDF/DOCX) and certificates (PDF/JPG/PNG)
 * - Retrieves user's submitted applications and verified skills
 * - Admin/Reviewer queue management and adjudication
 */

import { request } from './client.js';

/**
 * Submits a teacher verification application with document upload.
 *
 * @param {FormData} formData - Contains skillName, notes, resumeText (optional), and resume / certificate files.
 * @returns {Promise<{ message: string, application: object, precheck: object }>}
 */
export async function submitVerificationApplication(formData) {
  return await request('/teacher-verification/apply', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Retrieves the current user's submitted applications and verified skills.
 *
 * @returns {Promise<{ applications: Array, verifiedSkills: Array }>}
 */
export async function getMyVerificationApplications() {
  return await request('/teacher-verification/my-applications', {
    method: 'GET',
  });
}

/**
 * Retrieves the reviewer queue for authorized reviewers.
 *
 * @param {string} [status] - Optional status filter: 'submitted' | 'under_review' | 'needs_information'
 * @returns {Promise<{ queue: Array, count: number }>}
 */
export async function getReviewerQueue(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return await request(`/teacher-verification/admin/queue${query}`, {
    method: 'GET',
  });
}

/**
 * Retrieves paginated reviewer queue with status, search, and skill filtering.
 */
export async function getReviewerQueuePaginated({ status = 'all', search = '', skill = 'all', page = 1, limit = 15 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);
  if (search && search.trim()) params.append('search', search.trim());
  if (skill && skill !== 'all') params.append('skill', skill);
  params.append('page', page);
  params.append('limit', limit);
  return await request(`/teacher-verification/admin/queue?${params.toString()}`, {
    method: 'GET',
  });
}

/**
 * Retrieves single application detail view for the Reviewer Portal.
 */
export async function getReviewerApplication(applicationId) {
  return await request(`/teacher-verification/admin/application/${applicationId}`, {
    method: 'GET',
  });
}

/**
 * Submits an authorized review decision (approve, reject, request_info, mark_under_review).
 *
 * @param {string} applicationId
 * @param {{ action: string, reason?: string, notes?: string }} decisionPayload
 * @returns {Promise<{ message: string, application: object }>}
 */
export async function reviewApplication(applicationId, decisionPayload) {
  return await request(`/teacher-verification/admin/application/${applicationId}/review`, {
    method: 'POST',
    body: JSON.stringify(decisionPayload),
  });
}

/**
 * Submits corrected or additional verification documents for an existing application.
 *
 * @param {string} applicationId
 * @param {FormData} formData
 * @returns {Promise<{ message: string, application: object, precheck: object }>}
 */
export async function resubmitVerificationApplication(applicationId, formData) {
  return await request(`/teacher-verification/applications/${applicationId}/resubmit`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Builds the secure authenticated URL to download or view a document.
 * Includes the JWT token parameter for inline browser opening.
 *
 * @param {string} applicationId
 * @param {'resume'|'certificate'} docType
 * @returns {string}
 */
export function getDocumentUrl(applicationId, docType) {
  const token = localStorage.getItem('token');
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `/api/teacher-verification/documents/${applicationId}/${docType}${query}`;
}
