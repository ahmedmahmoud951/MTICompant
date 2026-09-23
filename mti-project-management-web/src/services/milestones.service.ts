import { apiClient } from '@/lib/api-client';
import { ApiResponse, ProjectMilestoneDto, ProjectAssignmentDto } from '@/types';

export interface CreateMilestoneRequest {
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  weight?: number;
  sortOrder?: number;
}

export interface UpdateMilestoneRequest {
  name: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  status: string;
  weight: number;
  sortOrder: number;
}

export interface AddMilestoneDependencyRequest {
  dependsOnMilestoneId: string;
}

export interface AssignProjectMemberRequest {
  userId?: string;
  teamId?: string;
  role: string;
}

export const milestonesService = {
  async getProjectMilestones(projectId: string): Promise<ApiResponse<ProjectMilestoneDto[]>> {
    return apiClient.get(`/api/milestones?projectId=${encodeURIComponent(projectId)}`);
  },

  async createMilestone(data: CreateMilestoneRequest): Promise<ApiResponse<ProjectMilestoneDto>> {
    return apiClient.post('/api/milestones', data);
  },

  async updateMilestone(id: string, data: UpdateMilestoneRequest): Promise<ApiResponse<ProjectMilestoneDto>> {
    return apiClient.put(`/api/milestones/${id}`, data);
  },

  async deleteMilestone(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/milestones/${id}`);
  },

  async addDependency(milestoneId: string, dependsOnMilestoneId: string): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/milestones/${milestoneId}/dependencies`, { dependsOnMilestoneId });
  },

  async removeDependency(milestoneId: string, dependencyId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/milestones/${milestoneId}/dependencies/${dependencyId}`);
  },

  async getProjectAssignments(projectId: string): Promise<ApiResponse<ProjectAssignmentDto[]>> {
    return apiClient.get(`/api/milestones/assignments?projectId=${encodeURIComponent(projectId)}`);
  },

  async assignMember(projectId: string, data: AssignProjectMemberRequest): Promise<ApiResponse<ProjectAssignmentDto>> {
    return apiClient.post('/api/milestones/assignments', {
      projectId,
      userId: data.userId,
      teamId: data.teamId,
      role: data.role,
    });
  }
};
