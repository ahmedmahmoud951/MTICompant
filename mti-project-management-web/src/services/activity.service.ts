import { apiClient } from '@/lib/api-client';
import { ApiResponse, ActivityTimelineItem } from '@/types';

export interface ActivityFilterParams {
  projectId?: string;
  siteId?: string;
  userId?: string;
  teamId?: string;
  activityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const activityService = {
  async getActivityTimeline(params?: ActivityFilterParams): Promise<ApiResponse<ActivityTimelineItem[]>> {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    if (params?.siteId) qs.set('siteId', params.siteId);
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.teamId) qs.set('teamId', params.teamId);
    if (params?.activityType) qs.set('activityType', params.activityType);
    if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
    if (params?.dateTo) qs.set('dateTo', params.dateTo);
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.pageSize) qs.set('pageSize', params.pageSize.toString());

    return apiClient.get(`/api/activity${qs.toString() ? `?${qs.toString()}` : ''}`);
  }
};
