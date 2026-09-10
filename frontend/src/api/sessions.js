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
export async function getUserSessions(userId) {
  return await request(`/users/${userId}/history`, {
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
