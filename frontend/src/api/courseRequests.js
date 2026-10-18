/**
 * ============================================================================
 * Course & Skill Requests API Service (src/api/courseRequests.js)
 * ============================================================================
 * Allows learners to request courses/skills currently unavailable in the platform,
 * and lets mentors discover topics learners want to learn.
 */

import { request } from './client.js';

/**
 * Creates a new course/skill request.
 * @param {object} requestData - { title, description, category }
 */
export async function createCourseRequest(requestData) {
  return await request('/course-requests', {
    method: 'POST',
    body: JSON.stringify(requestData),
  });
}

/**
 * Retrieves the authenticated user's own course requests.
 */
export async function getMyCourseRequests() {
  return await request('/course-requests/my', {
    method: 'GET',
  });
}

/**
 * Retrieves all open community course requests.
 */
export async function getAllCourseRequests() {
  return await request('/course-requests', {
    method: 'GET',
  });
}
