/**
 * ============================================================================
 * Notifications API Service (src/api/notifications.js)
 * ============================================================================
 * Manages in-app notifications for course request matches, bookings, reviews, and alerts.
 */

import { request } from './client.js';

/**
 * Retrieves notifications for the current authenticated user.
 */
export async function getMyNotifications() {
  return await request('/notifications', {
    method: 'GET',
  });
}

/**
 * Marks a specific notification as read.
 * @param {number|string} notificationId
 */
export async function markNotificationAsRead(notificationId) {
  return await request(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
}

/**
 * Marks all notifications for the current user as read.
 */
export async function markAllNotificationsAsRead() {
  return await request('/notifications/read-all', {
    method: 'PUT',
  });
}
