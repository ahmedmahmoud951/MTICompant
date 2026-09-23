import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  MasterDataItem,
  MasterDataCategory,
  CreateMasterDataItemRequest,
  UpdateMasterDataItemRequest
} from '@/types';

export const masterDataService = {
  // ==========================================
  // ADMIN-02 & ADMIN-03: Master Data Center
  // ==========================================

  async getCategories(): Promise<ApiResponse<MasterDataCategory[]>> {
    return apiClient.get('/api/admin/master-data/categories');
  },

  async getItems(category?: string, activeOnly = false): Promise<ApiResponse<MasterDataItem[]>> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('activeOnly', String(activeOnly));
    return apiClient.get(`/api/admin/master-data?${params.toString()}`);
  },

  async getItemById(id: string): Promise<ApiResponse<MasterDataItem>> {
    return apiClient.get(`/api/admin/master-data/${id}`);
  },

  async createItem(data: CreateMasterDataItemRequest): Promise<ApiResponse<MasterDataItem>> {
    return apiClient.post('/api/admin/master-data', data);
  },

  async updateItem(id: string, data: UpdateMasterDataItemRequest): Promise<ApiResponse<MasterDataItem>> {
    return apiClient.put(`/api/admin/master-data/${id}`, data);
  },

  async deleteItem(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/admin/master-data/${id}`);
  },

  async toggleItemStatus(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.patch(`/api/admin/master-data/${id}/toggle-status`, {});
  }
};
