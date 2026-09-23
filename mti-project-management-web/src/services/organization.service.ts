import { apiClient } from '@/lib/api-client';
import { ApiResponse, DepartmentDto, TeamDto, TeamMemberDto } from '@/types';

export const organizationService = {
  async getDepartments(): Promise<ApiResponse<DepartmentDto[]>> {
    return apiClient.get('/api/organization/departments');
  },

  async createDepartment(data: { code: string; nameAr: string; nameEn: string; description?: string }): Promise<ApiResponse<DepartmentDto>> {
    return apiClient.post('/api/organization/departments', data);
  },

  async getTeams(departmentId?: string): Promise<ApiResponse<TeamDto[]>> {
    const qs = departmentId ? `?departmentId=${departmentId}` : '';
    return apiClient.get(`/api/organization/teams${qs}`);
  },

  async createTeam(data: { departmentId: string; code: string; name: string; description?: string; leaderUserId?: string }): Promise<ApiResponse<TeamDto>> {
    return apiClient.post('/api/organization/teams', data);
  },

  async getTeamMembers(teamId: string): Promise<ApiResponse<TeamMemberDto[]>> {
    return apiClient.get(`/api/organization/teams/${teamId}/members`);
  },

  async addTeamMember(teamId: string, data: { userId: string; roleInTeam: string }): Promise<ApiResponse<TeamMemberDto>> {
    return apiClient.post(`/api/organization/teams/${teamId}/members`, data);
  },

  async removeTeamMember(teamId: string, memberId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/teams/${teamId}/members/${memberId}`);
  }
};
