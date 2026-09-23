import { apiClient } from '@/lib/api-client';
import { TaskItem } from '@/types';

export const taskService = {
  async getTasks(projectId?: string, siteId?: string): Promise<TaskItem[]> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (siteId) params.append('siteId', siteId);
    params.append('pageSize', '100');
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/api/tasks${query}`);
    if (!res.success) return [];
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
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
    const res = await apiClient.post<TaskItem>('/api/tasks', {
      ...payload,
      description: payload.description || '',
      assignedToUserId: payload.assignedToUserId || null
    });
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to create task');
    }
    return res.data;
  },

  async updateStatus(taskId: string, status: string, notes?: string): Promise<boolean> {
    const res = await apiClient.put(`/api/tasks/${taskId}/status`, {
      status,
      notes: notes || null
    });
    if (!res.success) {
      throw new Error(res.message || 'Failed to update task status');
    }
    return true;
  },

  async updateTask(
    taskId: string,
    payload: {
      title: string;
      description?: string;
      priority: string;
      assignedToUserId?: string;
      dueAt?: string;
      status?: string;
      startAt?: string;
    }
  ): Promise<TaskItem> {
    const res = await apiClient.put<TaskItem>(`/api/tasks/${taskId}`, {
      ...payload,
      description: payload.description || '',
      assignedToUserId: payload.assignedToUserId || null
    });
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to update task');
    }
    return res.data;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const res = await apiClient.delete(`/api/tasks/${taskId}`);
    return res.success;
  }
};
