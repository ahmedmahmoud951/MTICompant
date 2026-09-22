import { apiClient } from '@/lib/api-client';
import { ProjectDataRecord } from '@/types';

export const dataRecordService = {
  async getRecords(status?: string): Promise<ProjectDataRecord[]> {
    const query = status ? `?status=${status}` : '';
    const res = await apiClient.get<any>(`/api/projectdata${query}`);
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
    const res = await apiClient.post<ProjectDataRecord>('/api/projectdata', payload);
    return res.data;
  },

  async submitRecord(id: string): Promise<boolean> {
    const res = await apiClient.post(`/api/projectdata/${id}/submit`);
    return res.success;
  },

  async approve(id: string, comments?: string): Promise<boolean> {
    const res = await apiClient.post(`/api/projectdata/${id}/approve`, { comments: comments || 'Approved by administrator' });
    return res.success;
  },

  async reject(id: string, comments: string): Promise<boolean> {
    const res = await apiClient.post(`/api/projectdata/${id}/reject`, { comments });
    return res.success;
  },

  async requestChanges(id: string, comments: string): Promise<boolean> {
    const res = await apiClient.post(`/api/projectdata/${id}/request-changes`, { comments });
    return res.success;
  }
};
