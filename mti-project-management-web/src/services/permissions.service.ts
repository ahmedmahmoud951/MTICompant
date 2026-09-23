import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  ModulePermissionsDto,
  RolePermissionsDto,
  UpdateRolePermissionsRequest,
  EvaluateScopeResult,
  ResourceHierarchyType
} from '@/types';

export const permissionsService = {
  // SECURITY-03: Dynamic Permission Management
  async getPermissions(): Promise<ApiResponse<ModulePermissionsDto[]>> {
    return apiClient.get('/api/admin/permissions');
  },

  async getRolePermissions(): Promise<ApiResponse<RolePermissionsDto[]>> {
    return apiClient.get('/api/admin/permissions/roles');
  },

  async getRolePermissionsById(roleId: string): Promise<ApiResponse<RolePermissionsDto>> {
    return apiClient.get(`/api/admin/permissions/roles/${roleId}`);
  },

  async updateRolePermissions(
    roleId: string,
    data: UpdateRolePermissionsRequest
  ): Promise<ApiResponse<boolean>> {
    return apiClient.post(`/api/admin/permissions/roles/${roleId}`, data);
  },

  async togglePermissionStatus(permissionId: string): Promise<ApiResponse<boolean>> {
    return apiClient.patch(`/api/admin/permissions/${permissionId}/toggle-status`, {});
  },

  // SECURITY-04: Evaluate permission against resource scope engine
  async evaluateScope(params: {
    userId: string;
    permissionCode: string;
    resourceType: ResourceHierarchyType;
    resourceId: string;
  }): Promise<ApiResponse<EvaluateScopeResult>> {
    const qs = new URLSearchParams({
      userId: params.userId,
      permissionCode: params.permissionCode,
      resourceType: params.resourceType,
      resourceId: params.resourceId
    });
    return apiClient.get(`/api/admin/permissions/evaluate-scope?${qs.toString()}`);
  }
};
