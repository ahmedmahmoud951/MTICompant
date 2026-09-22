import { apiClient } from '@/lib/api-client';
import { TaskItem } from '@/types';

export const taskService = {
  async getTasks(projectId?: string, siteId?: string): Promise<TaskItem[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (siteId) params.append('siteId', siteId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<TaskItem[]>(`/api/tasks${query}`);
    return res.data || [];
  },

  async createTask(payload: {
    projectId: string;
    siteId?: string;
    title: string;
    description?: string;
    priority: string;
    assignedToUserId?: string;
    dueAt?: string;
  }): Promise<TaskItem> {
    const res = await apiClient.post<TaskItem>('/api/tasks', payload);
    return res.data;
  },

  async updateStatus(taskId: string, status: string, notes?: string): Promise<boolean> {
    const res = await apiClient.put(`/api/tasks/${taskId}/status`, { status, notes });
    return res.success;
  }
};
