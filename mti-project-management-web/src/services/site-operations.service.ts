import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  SiteOperationDto,
  OperationWorkLogDto,
  OperationPhotoDto,
  OperationType,
  SiteOperationStatus,
  TaskPriority
} from '@/types';

export interface CreateSiteOperationPayload {
  projectId: string;
  siteId: string;
  operationType: OperationType;
  title: string;
  description: string;
  assignedUserId?: string;
  assignedTeamId?: string;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
}

export interface UpdateSiteOperationPayload {
  title: string;
  description: string;
  status: SiteOperationStatus;
  priority: TaskPriority;
  progress: number;
  completedAt?: string;
}

export interface CreateWorkLogPayload {
  description: string;
  hours: number;
}

export interface AddOperationPhotoPayload {
  mediaFileId: string;
  caption?: string;
}

export const siteOperationsService = {
  async getOperations(params?: {
    projectId?: string;
    siteId?: string;
    operationType?: OperationType;
    status?: SiteOperationStatus;
  }): Promise<ApiResponse<SiteOperationDto[]>> {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.siteId) query.set('siteId', params.siteId);
    if (params?.operationType) query.set('operationType', params.operationType);
    if (params?.status) query.set('status', params.status);

    const qs = query.toString();
    return apiClient.get(`/api/site-operations${qs ? `?${qs}` : ''}`);
  },

  async getById(id: string): Promise<ApiResponse<SiteOperationDto>> {
    return apiClient.get(`/api/site-operations/${id}`);
  },

  async createOperation(payload: CreateSiteOperationPayload): Promise<ApiResponse<SiteOperationDto>> {
    return apiClient.post('/api/site-operations', payload);
  },

  async updateOperation(id: string, payload: UpdateSiteOperationPayload): Promise<ApiResponse<void>> {
    return apiClient.put(`/api/site-operations/${id}`, payload);
  },

  async deleteOperation(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/site-operations/${id}`);
  },

  async getWorkLogs(operationId: string): Promise<ApiResponse<OperationWorkLogDto[]>> {
    return apiClient.get(`/api/site-operations/${operationId}/worklogs`);
  },

  async addWorkLog(operationId: string, payload: CreateWorkLogPayload): Promise<ApiResponse<OperationWorkLogDto>> {
    return apiClient.post(`/api/site-operations/${operationId}/worklogs`, payload);
  },

  async getPhotos(operationId: string): Promise<ApiResponse<OperationPhotoDto[]>> {
    return apiClient.get(`/api/site-operations/${operationId}/photos`);
  },

  async addPhoto(operationId: string, payload: AddOperationPhotoPayload): Promise<ApiResponse<OperationPhotoDto>> {
    return apiClient.post(`/api/site-operations/${operationId}/photos`, payload);
  }
};
