/**
 * ============================================================================
 * Connections & Messaging API Service (src/api/messages.js)
 * ============================================================================
 * Real, PostgreSQL-backed messaging client.
 * Enforces authenticated JWT access and participant ownership checks.
 */

import { request } from './client.js';

/**
 * Retrieves confirmed connections and peer contacts for the authenticated user.
 */
export async function getConnections() {
  return await request('/connections', {
    method: 'GET',
  });
}

/**
 * Retrieves all conversation threads for the authenticated user.
 */
export async function getConversations() {
  return await request('/conversations', {
    method: 'GET',
  });
}

/**
 * Initiates or returns an existing conversation with another community member.
 * @param {string} recipientId - User ID of the chat partner.
 */
export async function startConversation(recipientId) {
  return await request('/conversations', {
    method: 'POST',
    body: JSON.stringify({ recipientId }),
  });
}

/**
 * Retrieves messages for a specific conversation thread.
 * Strict ownership: Server returns 403 if authenticated user is not a participant.
 * @param {number|string} conversationId
 */
export async function getMessages(conversationId) {
  return await request(`/conversations/${conversationId}/messages`, {
    method: 'GET',
  });
}

/**
 * Sends a message in a conversation thread.
 * Dispatches in-app notification and email to recipient.
 * @param {number|string} conversationId
 * @param {string} content - Message text
 */
export async function sendMessage(conversationId, content) {
  return await request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
