/**
 * ============================================================================
 * Authentication API Service (src/api/auth.js)
 * ============================================================================
 * WHAT THIS FILE DOES:
 * - Exposes functions to log in, register, and fetch the current user's profile.
 * - Uses the central request() helper from client.js.
 *
 * WHY THIS IS IMPORTANT FOR VIVA:
 * - Keeps authentication endpoints isolated from UI components so any changes
 *   to login routes or payload structures only need to be updated in this file.
 */

import { request } from './client.js';

/**
 * Sends user login credentials to the backend.
 * @param {string} email - The user's email address.
 * @param {string} password - The user's plaintext password.
 * @returns {Promise<{token: string, user: object, isMock?: boolean}>}
 */
export async function loginUser(email, password) {
  return await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email, password: password }),
  });
}

/**
 * Registers a new user on the platform.
 * @param {object} userData - { name, email, password, role }
 * @returns {Promise<{token: string, user: object, isMock?: boolean}>}
 */
export async function registerUser(userData) {
  return await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

/**
 * Fetches user profile data by ID.
 * @param {string} userId - Unique identifier of the user.
 * @returns {Promise<object>} User profile object.
 */
export async function getUserProfile(userId) {
  return await request(`/users/${userId}`, {
    method: 'GET',
  });
}
