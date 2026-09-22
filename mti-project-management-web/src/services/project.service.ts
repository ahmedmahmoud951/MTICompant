import { apiClient } from '@/lib/api-client';
import { ApiResponse, PagedResult, Project, Site } from '@/types';

export interface CreateProjectPayload {
  code: string;
  name: string;
  description: string;
  clientName: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface CreateSitePayload {
  code: string;
  name: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status?: string;
}

export const projectService = {
  async getProjects(params?: { search?: string; status?: string; pageNumber?: number; pageSize?: number }): Promise<ApiResponse<PagedResult<Project>>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.pageNumber) query.set('pageNumber', params.pageNumber.toString());
    if (params?.pageSize) query.set('pageSize', params.pageSize.toString());

    const qs = query.toString();
    return apiClient.get(`/api/projects${qs ? `?${qs}` : ''}`);
  },

  async getProjectById(id: string): Promise<ApiResponse<Project & { sites: any[] }>> {
    return apiClient.get(`/api/projects/${id}`);
  },

  async createProject(payload: CreateProjectPayload): Promise<ApiResponse<Project>> {
    return apiClient.post('/api/projects', payload);
  },

  async updateProject(id: string, payload: Partial<CreateProjectPayload>): Promise<ApiResponse<Project>> {
    return apiClient.put(`/api/projects/${id}`, payload);
  },

  async deleteProject(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/projects/${id}`);
  },

  async getProjectSites(projectId: string): Promise<ApiResponse<Site[]>> {
    return apiClient.get(`/api/projects/${projectId}/sites`);
  },

  async createSite(projectId: string, payload: CreateSitePayload): Promise<ApiResponse<Site>> {
    return apiClient.post(`/api/projects/${projectId}/sites`, payload);
  },
};

export const siteService = {
  async getSiteById(id: string): Promise<ApiResponse<Site>> {
    return apiClient.get(`/api/sites/${id}`);
  },

  async updateSite(id: string, payload: Partial<CreateSitePayload>): Promise<ApiResponse<Site>> {
    return apiClient.put(`/api/sites/${id}`, payload);
  },

  async deleteSite(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/sites/${id}`);
  },

  async assignEngineer(siteId: string, userId: string, role = 'Engineer', isPrimary = false): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/sites/${siteId}/assignments`, { userId, role, isPrimary });
  },

  async removeAssignment(siteId: string, assignmentId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/sites/${siteId}/assignments/${assignmentId}`);
  },
};
