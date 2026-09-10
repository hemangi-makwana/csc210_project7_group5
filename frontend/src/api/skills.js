/**
 * ============================================================================
 * Skills & Mentor Lookup API Service (src/api/skills.js)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Provides functions to search mentors by skill keyword.
 * - Retrieves user skill profiles.
 * - Updates taught and learning skills via the backend PUT endpoint.
 *
 * BACKEND DSA CONNECTION:
 * - searchMentorsBySkill: Connects to the backend Hash Table skill index for O(1)
 *   instant keyword lookups.
 * - updateSkills: Updates the in-memory skill hash table and graph vertex data.
 */

import { request } from './client.js';

/**
 * Searches for mentors teaching a specific skill keyword.
 * @param {string} query - Keyword such as "Python", "React", or "Data Science".
 * @returns {Promise<{mentors: Array, isMock?: boolean}>}
 */
export async function searchMentorsBySkill(query) {
  const encodedQuery = encodeURIComponent(query || '');
  return await request(`/skills/search?query=${encodedQuery}`, {
    method: 'GET',
  });
}

/**
 * Retrieves a user's full profile and associated skills.
 * @param {string} userId - User's ID.
 * @returns {Promise<object>}
 */
export async function getUserProfile(userId) {
  return await request(`/users/${userId}`, {
    method: 'GET',
  });
}

/**
 * Updates a user's taught/wanted skills and bio.
 * @param {string} userId - ID of the user whose profile is being modified.
 * @param {object|Array} skillsData - Object containing skills array and optional bio.
 * @returns {Promise<object>}
 */
export async function updateSkills(userId, skillsData) {
  // Normalize payload format whether passed as array or object
  const payload = Array.isArray(skillsData) 
    ? { skills: skillsData } 
    : skillsData;

  return await request(`/users/${userId}/skills`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
