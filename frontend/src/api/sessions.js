/**
 * ============================================================================
 * Session Booking & Learning History API Service (src/api/sessions.js)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Allows users to book mentoring sessions.
 * - Retrieves learning session history (past and upcoming).
 * - Submits post-session reviews and ratings.
 *
 * BACKEND DSA CONNECTION:
 * - bookSession: Connects to the backend FIFO Queue to schedule requests
 *   in chronological order and prevent double-booking collisions.
 */

import { request } from './client.js';

/**
 * Enqueues a new session booking request.
 *
 * CAMELCASE STANDARDIZATION (VIVA DEFENSE POINT):
 * All API payloads in this codebase use camelCase field names (e.g. mentorId, scheduledAt).
 * This matches JavaScript and JSON conventions and keeps the frontend and backend consistent.
 * Using snake_case (mentor_id, scheduled_at) on either side causes a field mismatch:
 * the backend would receive the field as 'undefined' and return a 400 Bad Request error.
 *
 * @param {object} bookingData - { mentorId, learnerId, scheduledAt, topic, notes }
 * @returns {Promise<{session: object, message: string, isMock?: boolean}>}
 */
export async function bookSession(bookingData) {
  return await request('/sessions/book', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

/**
 * Retrieves the session history for a specific user (both mentor and learner roles).
 * @param {string} userId - User's ID.
 * @returns {Promise<{sessions: Array, isMock?: boolean}>}
 */
export async function getUserSessions(userId, role = null) {
  const queryParam = role ? `?role=${encodeURIComponent(role)}` : '';
  return await request(`/users/${userId}/history${queryParam}`, {
    method: 'GET',
  });
}

/**
 * Submits a rating and written review for a completed session.
 * @param {object} reviewData - { sessionId, rating, comment }
 * @returns {Promise<{review: object, message: string, isMock?: boolean}>}
 */
export async function submitSessionReview(reviewData) {
  return await request('/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
}

/**
 * Teacher accepts a pending session booking.
 * @param {string} sessionId
 * @returns {Promise<{message: string, status: string}>}
 */
export async function acceptSession(sessionId) {
  return await request(`/sessions/${sessionId}/accept`, {
    method: 'POST',
  });
}

/**
 * Teacher declines a pending session booking.
 * @param {string} sessionId
 * @param {string} [reason]
 * @returns {Promise<{message: string, status: string, declinedReason: string}>}
 */
export async function declineSession(sessionId, reason = '') {
  return await request(`/sessions/${sessionId}/decline`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Either participant marks an accepted session as completed.
 * @param {string} sessionId
 * @returns {Promise<{message: string, status: string}>}
 */
export async function completeSession(sessionId) {
  return await request(`/sessions/${sessionId}/complete`, {
    method: 'POST',
  });
}

/**
 * Either participant cancels a pending or accepted session.
 * @param {string} sessionId
 * @param {string} [reason]
 * @returns {Promise<{message: string, status: string}>}
 */
export async function cancelSession(sessionId, reason = '') {
  return await request(`/sessions/${sessionId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/**
 * Fetches authentic submitted learner reviews and bounded reputation summary for a teacher.
 * @param {string} userId
 * @returns {Promise<{userId: string, reputation_score: number, review_count: number, reviews: Array}>}
 */
export async function getUserReviews(userId) {
  return await request(`/users/${userId}/reviews`, {
    method: 'GET',
  });
}

/**
 * Fetches real available courses backed by canonical skill_catalog with approved teachers.
 * @param {string} [category]
 * @param {string} [search]
 * @returns {Promise<{courses: Array, count: number}>}
 */
export async function getAvailableCourses(category = '', search = '') {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (search) params.append('search', search);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await request(`/courses/available${queryStr}`, {
    method: 'GET',
  });
}

/**
 * Validates a course or skill name against the canonical database-backed catalog.
 * Returns spelling suggestions if misspelled without modifying the catalog.
 * @param {string} courseName
 * @returns {Promise<{valid: boolean, canonicalName?: string, category?: string, suggestion?: string, message: string}>}
 */
export async function validateCourseName(courseName) {
  const queryParam = encodeURIComponent(courseName || '');
  return await request(`/courses/validate?name=${queryParam}`, {
    method: 'GET',
  });
}

