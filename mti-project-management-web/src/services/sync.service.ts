import { apiClient } from '@/lib/api-client';
import { Message, NotificationItem } from '@/types';

export interface ProjectChangeDto {
  id: string;
  code: string;
  name: string;
  status: string;
  progressPercentage: number;
  updatedAt: string;
}

export interface SyncResponse {
  serverTimestamp: string;
  newMessages: Message[];
  newNotifications: NotificationItem[];
  updatedTasks: any[];
  projectChanges: ProjectChangeDto[];
}

export const syncService = {
  async sync(since?: string | null): Promise<SyncResponse | null> {
    try {
      const q = since ? `?since=${encodeURIComponent(since)}` : '';
      const res = await apiClient.get<SyncResponse>(`/api/sync${q}`);
      return res.data || null;
    } catch (e) {
      console.warn('Reconnection sync failed', e);
      return null;
    }
  }
};
