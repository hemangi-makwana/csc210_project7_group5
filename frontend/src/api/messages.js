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

/**
 * Uploads an attachment (image, document, or audio voice note) to a conversation.
 * @param {number|string} conversationId
 * @param {FormData} formData
 */
export async function uploadAttachment(conversationId, formData) {
  return await request(`/conversations/${conversationId}/attachments`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Fetches STUN/TURN ICE server configuration.
 */
export async function getIceServers() {
  return await request('/calls/ice-servers', {
    method: 'GET',
  });
}

/**
 * Sends a WebRTC call signaling message (offer, answer, candidate, start, end, reaction).
 * @param {number|string} conversationId
 * @param {string} type - 'start' | 'offer' | 'answer' | 'candidate' | 'reaction' | 'end'
 * @param {object} payload
 */
export async function sendCallSignal(conversationId, type, payload = {}) {
  return await request('/calls/signal', {
    method: 'POST',
    body: JSON.stringify({ conversationId, type, payload }),
  });
}

/**
 * Polls WebRTC call signals directed to the current user.
 * @param {number|string} conversationId
 * @param {number|{since?: number, sinceSeq?: number}} sinceOrOptions - Timestamp or options object
 */
export async function getCallSignals(conversationId, sinceOrOptions) {
  const params = new URLSearchParams();
  if (typeof sinceOrOptions === 'number') {
    params.set('since', String(sinceOrOptions));
  } else if (sinceOrOptions && typeof sinceOrOptions === 'object') {
    if (sinceOrOptions.since !== undefined && sinceOrOptions.since !== null) {
      params.set('since', String(sinceOrOptions.since));
    }
    if (sinceOrOptions.sinceSeq !== undefined && sinceOrOptions.sinceSeq !== null) {
      params.set('sinceSeq', String(sinceOrOptions.sinceSeq));
    }
  }
  const qs = params.toString();
  return await request(`/calls/signal/${conversationId}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}
