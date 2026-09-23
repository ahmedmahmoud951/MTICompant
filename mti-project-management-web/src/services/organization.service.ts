import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  Department,
  DepartmentMember,
  DepartmentTreeNode,
  Team,
  TeamMember,
  ProjectMember,
  ProjectTeam,
  SiteMember,
  SiteTeam,
  OrganizationRoles,
  ResourceResponsibility,
  RaciMatrix,
  AssignResponsibilityRequest,
  UserWorkload,
  TeamWorkload,
  ProjectWorkload,
  Delegation,
  CreateDelegationRequest,
  BatchAssignUsersRequest,
  BatchAssignTeamsRequest
} from '@/types';

export const organizationService = {
  // ==========================================
  // ORG-01: Departments & Hierarchy
  // ==========================================

  async getDepartments(): Promise<ApiResponse<Department[]>> {
    return apiClient.get('/api/organization/departments');
  },

  async getDepartmentTree(): Promise<ApiResponse<DepartmentTreeNode[]>> {
    return apiClient.get('/api/organization/departments/tree');
  },

  async getDepartmentById(id: string): Promise<ApiResponse<Department>> {
    return apiClient.get(`/api/organization/departments/${id}`);
  },

  async createDepartment(data: {
    code: string;
    name: string;
    description?: string;
    managerUserId?: string;
    parentDepartmentId?: string;
  }): Promise<ApiResponse<Department>> {
    return apiClient.post('/api/organization/departments', data);
  },

  async updateDepartment(
    id: string,
    data: {
      name: string;
      description?: string;
      managerUserId?: string;
      parentDepartmentId?: string;
      isActive: boolean;
    }
  ): Promise<ApiResponse<Department>> {
    return apiClient.put(`/api/organization/departments/${id}`, data);
  },

  async deleteDepartment(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/departments/${id}`);
  },

  async getDepartmentMembers(departmentId: string): Promise<ApiResponse<DepartmentMember[]>> {
    return apiClient.get(`/api/organization/departments/${departmentId}/members`);
  },

  async addDepartmentMember(
    departmentId: string,
    data: {
      userId: string;
      departmentRole?: string;
      isPrimary?: boolean;
    }
  ): Promise<ApiResponse<DepartmentMember>> {
    return apiClient.post(`/api/organization/departments/${departmentId}/members`, data);
  },

  async updateDepartmentMember(
    departmentId: string,
    memberId: string,
    data: {
      departmentRole: string;
      isPrimary: boolean;
      isActive: boolean;
    }
  ): Promise<ApiResponse<DepartmentMember>> {
    return apiClient.put(`/api/organization/departments/${departmentId}/members/${memberId}`, data);
  },

  async removeDepartmentMember(departmentId: string, memberId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/departments/${departmentId}/members/${memberId}`);
  },

  // ==========================================
  // ORG-02: Teams & Team Members
  // ==========================================

  async getTeams(departmentId?: string): Promise<ApiResponse<Team[]>> {
    const qs = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return apiClient.get(`/api/organization/teams${qs}`);
  },

  async getTeamById(id: string): Promise<ApiResponse<Team>> {
    return apiClient.get(`/api/organization/teams/${id}`);
  },

  async createTeam(data: {
    departmentId: string;
    code: string;
    name: string;
    description?: string;
    managerUserId?: string;
    assistantManagerUserId?: string;
    supervisorUserId?: string;
  }): Promise<ApiResponse<Team>> {
    return apiClient.post('/api/organization/teams', data);
  },

  async updateTeam(
    id: string,
    data: {
      name: string;
      description?: string;
      managerUserId?: string;
      assistantManagerUserId?: string;
      supervisorUserId?: string;
      isActive: boolean;
    }
  ): Promise<ApiResponse<Team>> {
    return apiClient.put(`/api/organization/teams/${id}`, data);
  },

  async deleteTeam(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/teams/${id}`);
  },

  async getTeamMembers(teamId: string): Promise<ApiResponse<TeamMember[]>> {
    return apiClient.get(`/api/organization/teams/${teamId}/members`);
  },

  async addTeamMember(
    teamId: string,
    data: {
      userId: string;
      teamRole?: string;
      isPrimaryTeam?: boolean;
    }
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.post(`/api/organization/teams/${teamId}/members`, data);
  },

  async updateTeamMember(
    teamId: string,
    memberId: string,
    data: {
      teamRole: string;
      isPrimaryTeam: boolean;
      isActive: boolean;
    }
  ): Promise<ApiResponse<TeamMember>> {
    return apiClient.put(`/api/organization/teams/${teamId}/members/${memberId}`, data);
  },

  async removeTeamMember(teamId: string, memberId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/teams/${teamId}/members/${memberId}`);
  },

  // User Organizational Profile
  async getUserDepartments(userId: string): Promise<ApiResponse<DepartmentMember[]>> {
    return apiClient.get(`/api/organization/users/${userId}/departments`);
  },

  async getUserTeams(userId: string): Promise<ApiResponse<TeamMember[]>> {
    return apiClient.get(`/api/organization/users/${userId}/teams`);
  },

  async getRolesReference(): Promise<ApiResponse<OrganizationRoles>> {
    return apiClient.get('/api/organization/roles');
  },

  // ==========================================
  // ORG-03: Project Membership
  // ==========================================

  async getProjectMembers(projectId: string, includeHistorical = false): Promise<ApiResponse<ProjectMember[]>> {
    const qs = includeHistorical ? '?includeHistorical=true' : '';
    return apiClient.get(`/api/projects/${projectId}/members${qs}`);
  },

  async addProjectMember(
    projectId: string,
    data: {
      userId: string;
      projectRole?: string;
      isPrimary?: boolean;
    }
  ): Promise<ApiResponse<ProjectMember>> {
    return apiClient.post(`/api/projects/${projectId}/members`, data);
  },

  async updateProjectMember(
    projectId: string,
    memberId: string,
    data: {
      projectRole: string;
      isPrimary: boolean;
      isActive: boolean;
    }
  ): Promise<ApiResponse<ProjectMember>> {
    return apiClient.put(`/api/projects/${projectId}/members/${memberId}`, data);
  },

  async removeProjectMember(projectId: string, memberId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/projects/${projectId}/members/${memberId}`);
  },

  // ==========================================
  // ORG-04: Project Team Assignment
  // ==========================================

  async getProjectTeams(projectId: string): Promise<ApiResponse<ProjectTeam[]>> {
    return apiClient.get(`/api/projects/${projectId}/teams`);
  },

  async assignProjectTeam(
    projectId: string,
    data: {
      teamId: string;
      teamRole?: string;
    }
  ): Promise<ApiResponse<ProjectTeam>> {
    return apiClient.post(`/api/projects/${projectId}/teams`, data);
  },

  async removeProjectTeam(projectId: string, projectTeamId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/projects/${projectId}/teams/${projectTeamId}`);
  },

  // ==========================================
  // ORG-05: Site Membership & Site Teams
  // ==========================================

  async getSiteMembers(siteId: string): Promise<ApiResponse<SiteMember[]>> {
    return apiClient.get(`/api/sites/${siteId}/members`);
  },

  async addSiteMember(
    siteId: string,
    data: {
      userId: string;
      siteRole?: string;
      isPrimary?: boolean;
    }
  ): Promise<ApiResponse<SiteMember>> {
    return apiClient.post(`/api/sites/${siteId}/members`, data);
  },

  async updateSiteMember(
    siteId: string,
    memberId: string,
    data: {
      siteRole: string;
      isPrimary: boolean;
      isActive: boolean;
    }
  ): Promise<ApiResponse<SiteMember>> {
    return apiClient.put(`/api/sites/${siteId}/members/${memberId}`, data);
  },

  async removeSiteMember(siteId: string, memberId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/sites/${siteId}/members/${memberId}`);
  },

  async getSiteTeams(siteId: string): Promise<ApiResponse<SiteTeam[]>> {
    return apiClient.get(`/api/sites/${siteId}/teams`);
  },

  async assignSiteTeam(
    siteId: string,
    data: {
      teamId: string;
      teamRole?: string;
    }
  ): Promise<ApiResponse<SiteTeam>> {
    return apiClient.post(`/api/sites/${siteId}/teams`, data);
  },

  async removeSiteTeam(siteId: string, siteTeamId: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/sites/${siteId}/teams/${siteTeamId}`);
  },

  // ==========================================
  // UI-ORG-01 & UI-ORG-02: Multi-Select Batch Assignments
  // ==========================================

  async batchAssignProjectMembers(projectId: string, data: BatchAssignUsersRequest): Promise<ApiResponse<ProjectMember[]>> {
    return apiClient.post(`/api/projects/${projectId}/members/batch`, data);
  },

  async batchAssignProjectTeams(projectId: string, data: BatchAssignTeamsRequest): Promise<ApiResponse<ProjectTeam[]>> {
    return apiClient.post(`/api/projects/${projectId}/teams/batch`, data);
  },

  async batchAssignSiteMembers(siteId: string, data: BatchAssignUsersRequest): Promise<ApiResponse<SiteMember[]>> {
    return apiClient.post(`/api/sites/${siteId}/members/batch`, data);
  },

  async batchAssignSiteTeams(siteId: string, data: BatchAssignTeamsRequest): Promise<ApiResponse<SiteTeam[]>> {
    return apiClient.post(`/api/sites/${siteId}/teams/batch`, data);
  },

  // ==========================================
  // ORG-06: RACI Responsibility Matrix
  // ==========================================

  async getRaciMatrix(resourceType: string, resourceId: string): Promise<ApiResponse<RaciMatrix>> {
    return apiClient.get(`/api/organization/raci?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`);
  },

  async assignResponsibility(data: AssignResponsibilityRequest): Promise<ApiResponse<ResourceResponsibility>> {
    return apiClient.post('/api/organization/raci', data);
  },

  async removeResponsibility(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/raci/${id}`);
  },

  // ==========================================
  // ORG-07: Team Manager Scoped Operations
  // ==========================================

  async getTeamManagerScope(teamId: string): Promise<ApiResponse<{
    team: Team;
    members: TeamMember[];
    assignedProjects: any[];
    assignedSites: any[];
    assignedTasks: any[];
    documents: any[];
    workload: TeamWorkload;
  }>> {
    return apiClient.get(`/api/organization/teams/${teamId}/manager-scope`);
  },

  // ==========================================
  // ORG-08: Workload Visibility
  // ==========================================

  async getUsersWorkload(departmentId?: string): Promise<ApiResponse<UserWorkload[]>> {
    const qs = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return apiClient.get(`/api/organization/workload/users${qs}`);
  },

  async getTeamsWorkload(departmentId?: string): Promise<ApiResponse<TeamWorkload[]>> {
    const qs = departmentId ? `?departmentId=${encodeURIComponent(departmentId)}` : '';
    return apiClient.get(`/api/organization/workload/teams${qs}`);
  },

  async getProjectsWorkload(): Promise<ApiResponse<ProjectWorkload[]>> {
    return apiClient.get('/api/organization/workload/projects');
  },

  // ==========================================
  // ORG-09: Temporary Responsibility Delegation
  // ==========================================

  async getDelegations(userId?: string, activeOnly = true): Promise<ApiResponse<Delegation[]>> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('activeOnly', String(activeOnly));
    return apiClient.get(`/api/organization/delegations?${params.toString()}`);
  },

  async createDelegation(data: CreateDelegationRequest): Promise<ApiResponse<Delegation>> {
    return apiClient.post('/api/organization/delegations', data);
  },

  async revokeDelegation(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/organization/delegations/${id}`);
  }
};
