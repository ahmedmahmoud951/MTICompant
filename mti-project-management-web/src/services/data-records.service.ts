import { apiClient } from '@/lib/api-client';
import { ProjectDataRecord } from '@/types';

export const dataRecordService = {
  async getRecords(status?: string, params?: Record<string, any>): Promise<ProjectDataRecord[]> {
    const searchParams = new URLSearchParams();
    if (status) searchParams.set('status', status);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          searchParams.set(k, String(v));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await apiClient.get<any>(`/api/project-data${query}`);
    if (!res.success) return [];
    if (Array.isArray(res.data)) return res.data;
    if (res.data && Array.isArray(res.data.items)) return res.data.items;
    return [];
  },

  async getRecordById(id: string): Promise<ProjectDataRecord | null> {
    const res = await apiClient.get<any>(`/api/project-data/${id}`);
    if (!res.success || !res.data) return null;
    const d = res.data;
    return {
      ...d,
      category: d.category || 'DailyReport',
      attachments: (d.attachments || []).map((a: any) => ({
        id: a.id,
        mediaFileId: a.mediaFileId,
        fileName: a.originalFileName || a.fileName || 'attachment',
        originalFileName: a.originalFileName || a.fileName || 'attachment',
        fileSize: a.fileSize || 0,
        contentType: a.contentType || 'application/octet-stream',
        downloadUrl: a.downloadUrl,
        caption: a.caption
      })),
      approvals: (d.approvals || []).map((app: any) => ({
        id: app.id,
        action: app.action,
        comment: app.comment,
        performedBy: app.performedBy,
        performerName: app.performerName,
        performedAt: app.performedAt
      }))
    };
  },

  async getPendingApprovals(): Promise<ProjectDataRecord[]> {
    return this.getRecords('Submitted');
  },

  async getApprovedRecords(): Promise<ProjectDataRecord[]> {
    return this.getRecords('Approved');
  },

  async createRecord(payload: {
    projectId: string;
    siteId?: string;
    title: string;
    description: string;
    submitDirectly?: boolean;
    attachmentMediaIds?: string[];
  }): Promise<ProjectDataRecord> {
    const res = await apiClient.post<ProjectDataRecord>('/api/project-data', {
      projectId: payload.projectId,
      siteId: payload.siteId || null,
      title: payload.title,
      description: payload.description,
      submitDirectly: payload.submitDirectly ?? true,
      attachmentMediaIds: payload.attachmentMediaIds || []
    });
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to create report');
    }
    return res.data;
  },

  async submitRecord(id: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/submit`);
    return res.success;
  },

  async approve(id: string, comments?: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/approve`, {
      comment: comments || 'Approved by administrator'
    });
    return res.success;
  },

  async reject(id: string, comments: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/reject`, { comment: comments });
    return res.success;
  },

  async requestChanges(id: string, comments: string): Promise<boolean> {
    const res = await apiClient.post(`/api/project-data/${id}/request-changes`, { comment: comments });
    return res.success;
  },

  async deleteRecord(id: string): Promise<boolean> {
    const res = await apiClient.delete(`/api/project-data/${id}`);
    return res.success;
  }
};
