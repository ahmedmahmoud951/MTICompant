import { apiClient } from '@/lib/api-client';
import { NotificationItem } from '@/types';

export interface NotificationSummaryResponse {
  items: NotificationItem[];
  totalCount: number;
  unreadCount: number;
}

export const notificationService = {
  async getNotifications(page = 1, pageSize = 30, unreadOnly = false): Promise<NotificationSummaryResponse> {
    const res = await apiClient.get<NotificationSummaryResponse>(
      `/api/notifications?page=${page}&pageSize=${pageSize}${unreadOnly ? '&unreadOnly=true' : ''}`
    );
    return res.data || { items: [], totalCount: 0, unreadCount: 0 };
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      const res = await apiClient.post(`/api/notifications/${id}/read`, {});
      return res.success;
    } catch {
      // Notification may already be gone or not owned by this user
      return false;
    }
  },

  async markAllAsRead(): Promise<boolean> {
    try {
      const res = await apiClient.post('/api/notifications/read-all', {});
      return res.success;
    } catch {
      return false;
    }
  }
};
