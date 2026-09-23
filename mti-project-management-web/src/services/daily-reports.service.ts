import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  DailySiteReportDto,
  DailySiteReportDetailDto,
  DailyReportAttachmentDto,
  DailyReportStatus
} from '@/types';

export interface CreateDailyReportPayload {
  projectId: string;
  siteId: string;
  reportDate: string;
  teamId?: string;
  manpower: string;
  workCompleted: string;
  problems: string;
  materialsReceived: string;
  materialsUsed: string;
  equipment: string;
  safetyNotes: string;
  tomorrowPlan: string;
  mediaFileIds?: string[];
}

export interface ReviewDailyReportPayload {
  status: 'Reviewed' | 'Approved' | 'Rejected';
  notes?: string;
}

export interface CreateReportRevisionPayload {
  manpower: string;
  workCompleted: string;
  problems: string;
  materialsReceived: string;
  materialsUsed: string;
  equipment: string;
  safetyNotes: string;
  tomorrowPlan: string;
  mediaFileIds?: string[];
}

export interface AddReportAttachmentPayload {
  mediaFileId: string;
  caption?: string;
}

export const dailyReportsService = {
  async getReports(params?: {
    projectId?: string;
    siteId?: string;
    date?: string;
    status?: DailyReportStatus;
  }): Promise<ApiResponse<DailySiteReportDto[]>> {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.siteId) query.set('siteId', params.siteId);
    if (params?.date) query.set('date', params.date);
    if (params?.status) query.set('status', params.status);

    const qs = query.toString();
    return apiClient.get(`/api/daily-site-reports${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string): Promise<ApiResponse<DailySiteReportDetailDto>> {
    return apiClient.get(`/api/daily-site-reports/${id}`);
  },

  async createReport(payload: CreateDailyReportPayload): Promise<ApiResponse<DailySiteReportDto>> {
    return apiClient.post('/api/daily-site-reports', payload);
  },

  async updateReport(id: string, payload: CreateDailyReportPayload): Promise<ApiResponse<void>> {
    return apiClient.put(`/api/daily-site-reports/${id}`, payload);
  },

  async submitReport(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post(`/api/daily-site-reports/${id}/submit`, {});
  },

  async reviewReport(id: string, payload: ReviewDailyReportPayload): Promise<ApiResponse<{ message: string; isImmutable: boolean }>> {
    return apiClient.post(`/api/daily-site-reports/${id}/review`, payload);
  },

  async createRevision(id: string, payload: CreateReportRevisionPayload): Promise<ApiResponse<DailySiteReportDto>> {
    return apiClient.post(`/api/daily-site-reports/${id}/correction`, payload);
  },

  async addAttachment(id: string, payload: AddReportAttachmentPayload): Promise<ApiResponse<DailyReportAttachmentDto>> {
    return apiClient.post(`/api/daily-site-reports/${id}/attachments`, payload);
  }
};
