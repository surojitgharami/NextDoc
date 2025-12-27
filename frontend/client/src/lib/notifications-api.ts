/**
 * Notification API Client
 * Handles all notification-related API calls
 */

import { apiRequest } from "./queryClient";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  iconType?: string | null;
  avatarUrl?: string | null;
  isRead: string;
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
  unreadCount: number;
}

/**
 * Get all notifications for current user
 */
export async function getNotifications(): Promise<Notification[]> {
  const response = await apiRequest("GET", "/api/notifications");
  return response.json();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiRequest("GET", "/api/notifications/unread-count");
  return response.json();
}

/**
 * Mark a single notification as read
 */
export async function markRead(notificationId: string): Promise<Notification> {
  const response = await apiRequest("PUT", `/api/notifications/${notificationId}/read`);
  return response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllRead(): Promise<{ message: string; success: boolean; count: number }> {
  const response = await apiRequest("PUT", "/api/notifications/mark-all-read");
  return response.json();
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<{ message: string; success: boolean }> {
  const response = await apiRequest("DELETE", `/api/notifications/${notificationId}`);
  return response.json();
}
