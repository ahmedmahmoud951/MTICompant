import { apiClient } from '@/lib/api-client';
import { ProjectDataRecord } from '@/types';

export const dataRecordService = {
  async getRecords(status?: string): Promise<ProjectDataRecord[]> {
    const query = status ? `?status=${status}` : '';
    const res = await apiClient.get<any>(`/api/project-data${query}`);
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
  },

  async getPendingApprovals(): Promise<ProjectDataRecord[]> {
    return this.getRecords('Submitted');
  },

  async getApprovedRecords(): Promise<ProjectDataRecord[]> {
    return this.getRecords('Approved');
  },

  async createRecord(payload: {
    projectId: string;
    siteId: string;
    title: string;
    category: string;
    dataPayloadJson: string;
  }): Promise<ProjectDataRecord> {
    const res = await apiClient.post<ProjectDataRecord>('/api/project-data', payload);
    return res.data;
  },

  async submitRecord(id: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/submit`);
    return res.success;
  },

  async approve(id: string, comments?: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/approve`, { comments: comments || 'Approved by administrator' });
    return res.success;
  },

  async reject(id: string, comments: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/reject`, { comments });
    return res.success;
  },

  async requestChanges(id: string, comments: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/request-changes`, { comments });
    return res.success;
  },

  async deleteRecord(id: string): Promise<boolean> {
    const res = await apiClient.delete(`/api/project-data/${id}`);
    return res.success;
  }
};
