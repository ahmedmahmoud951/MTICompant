import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  AdminUserDetail,
  CreateUserAdminRequest,
  UpdateUserAdminRequest,
  AssignUserDepartmentRequest,
  AssignUserTeamRequest
} from '@/types';

export const usersAdminService = {
  // ==========================================
  // ADMIN-04: User Administration & Profile
  // ==========================================

  async getUsers(params?: {
    search?: string;
    departmentId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<AdminUserDetail[]>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.departmentId) qs.append('departmentId', params.departmentId);
    if (params?.isActive !== undefined) qs.append('isActive', String(params.isActive));
    if (params?.page) qs.append('page', String(params.page));
    if (params?.pageSize) qs.append('pageSize', String(params.pageSize));

    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get(`/api/users${query}`);
  },

  async getUserProfile(userId: string): Promise<ApiResponse<AdminUserDetail>> {
    return apiClient.get(`/api/users/${userId}/profile`);
  },

  async createUser(data: CreateUserAdminRequest): Promise<ApiResponse<AdminUserDetail>> {
    return apiClient.post('/api/users', data);
  },

  async updateUserProfile(userId: string, data: UpdateUserAdminRequest): Promise<ApiResponse<AdminUserDetail>> {
    return apiClient.put(`/api/users/${userId}/profile`, data);
  },

  async getUserAssignments(userId: string): Promise<ApiResponse<{
    userId: string;
    fullName: string;
    email: string;
    department?: any;
    teams: any[];
    projectAssignments: any[];
    siteAssignments: any[];
    responsibilities: any[];
    delegationsGiven: any[];
    delegationsReceived: any[];
  }>> {
    return apiClient.get(`/api/users/${userId}/assignments`);
  },

  async getUserActivity(userId: string, count = 50): Promise<ApiResponse<any[]>> {
    return apiClient.get(`/api/users/${userId}/activity?count=${count}`);
  },

  async assignDepartment(userId: string, data: AssignUserDepartmentRequest): Promise<ApiResponse<boolean>> {
    return apiClient.post(`/api/users/${userId}/assign-department`, data);
  },

  async assignTeam(userId: string, data: AssignUserTeamRequest): Promise<ApiResponse<boolean>> {
    return apiClient.post(`/api/users/${userId}/assign-team`, data);
  },

  async toggleUserStatus(userId: string, isActive: boolean, reason?: string): Promise<ApiResponse<boolean>> {
    return apiClient.patch(`/api/users/${userId}/status`, { isActive, reason });
  },

  async resetPassword(userId: string, newPassword?: string): Promise<ApiResponse<boolean>> {
    return apiClient.post(`/api/users/${userId}/reset-password`, { newPassword });
  }
};
