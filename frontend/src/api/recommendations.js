/**
 * ============================================================================
 * Recommendation Engine API Service (src/api/recommendations.js)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Requests personalized mentor recommendations for a given learner.
 *
 * BACKEND DSA CONNECTION:
 * - Connects to the backend Max-Heap / Priority Queue, which scores candidate
 *   mentors using graph proximity and skill overlap, returning the top-k matches.
 */

import { request } from './client.js';

/**
 * Fetches personalized mentor recommendations ranked by algorithmic match score.
 * @param {string} userId - ID of the user requesting recommendations.
 * @returns {Promise<{recommendations: Array, isMock?: boolean}>}
 */
export async function getRecommendations(userId) {
  return await request(`/recommendations/${userId}`, {
    method: 'GET',
  });
}
