import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  DrawingDto,
  CreateDrawingRequest,
  DrawingMarkupDto,
  CreateDrawingMarkupRequest,
  DrawingDiscipline,
  DrawingType
} from '@/types';

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface DrawingFilterParams {
  projectId?: string;
  siteId?: string;
  discipline?: DrawingDiscipline | string | number;
  drawingType?: DrawingType | string | number;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const drawingsService = {
  async getDrawings(params?: DrawingFilterParams): Promise<ApiResponse<PagedResult<DrawingDto>>> {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    if (params?.siteId) qs.set('siteId', params.siteId);
    if (params?.discipline !== undefined) qs.set('discipline', params.discipline.toString());
    if (params?.drawingType !== undefined) qs.set('drawingType', params.drawingType.toString());
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    if (params?.page) qs.set('page', params.page.toString());
    if (params?.pageSize) qs.set('pageSize', params.pageSize.toString());

    return apiClient.get(`/api/drawings${qs.toString() ? `?${qs.toString()}` : ''}`);
  },

  async getDrawingById(id: string): Promise<ApiResponse<DrawingDto>> {
    return apiClient.get(`/api/drawings/${id}`);
  },

  async createDrawing(payload: CreateDrawingRequest): Promise<ApiResponse<DrawingDto>> {
    return apiClient.post('/api/drawings', payload);
  },

  async updateDrawingStatus(id: string, status: string, reason?: string): Promise<ApiResponse<DrawingDto>> {
    return apiClient.put(`/api/drawings/${id}/status`, { status, reason });
  },

  async getMarkups(drawingId: string): Promise<ApiResponse<DrawingMarkupDto[]>> {
    return apiClient.get(`/api/drawings/${drawingId}/markups`);
  },

  async addMarkup(drawingId: string, payload: CreateDrawingMarkupRequest): Promise<ApiResponse<DrawingMarkupDto>> {
    return apiClient.post(`/api/drawings/${drawingId}/markups`, payload);
  },

  async deleteMarkup(drawingId: string, markupId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/drawings/${drawingId}/markups/${markupId}`);
  },

  // DRAW-04: Revision History
  async getRevisions(drawingId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get(`/api/drawings/${drawingId}/revisions`);
  },

  async createRevision(drawingId: string, payload: any): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/drawings/${drawingId}/revisions`, payload);
  },

  // DRAW-03: Drawing Administration
  async approveDrawing(drawingId: string, notes?: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/drawings/${drawingId}/approve`, { notes });
  },

  async rejectDrawing(drawingId: string, reason?: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/drawings/${drawingId}/reject`, { reason });
  },

  async lockDrawing(drawingId: string, isLocked: boolean = true): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/drawings/${drawingId}/lock`, { isLocked });
  },

  async archiveDrawing(drawingId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/drawings/${drawingId}/archive`, {});
  },

  async deleteDrawing(drawingId: string): Promise<ApiResponse<any>> {
    return apiClient.delete(`/api/drawings/${drawingId}`);
  }
};
