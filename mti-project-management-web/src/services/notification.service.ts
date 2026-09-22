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
    const res = await apiClient.post(`/api/notifications/${id}/read`, {});
    return res.success;
  },

  async markAllAsRead(): Promise<boolean> {
    const res = await apiClient.post('/api/notifications/read-all', {});
    return res.success;
  }
};
