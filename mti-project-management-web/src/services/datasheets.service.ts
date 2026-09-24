import { apiClient } from '@/lib/api-client';
import { ApiResponse, ProductDataSheetDto, CreateProductDataSheetRequest } from '@/types';

export interface DataSheetFilterParams {
  projectId?: string;
  siteId?: string;
  category?: string;
  search?: string;
}

export const dataSheetsService = {
  async getDataSheets(params?: DataSheetFilterParams): Promise<ApiResponse<ProductDataSheetDto[]>> {
    const qs = new URLSearchParams();
    if (params?.projectId) qs.set('projectId', params.projectId);
    if (params?.siteId) qs.set('siteId', params.siteId);
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);

    return apiClient.get(`/api/datasheets${qs.toString() ? `?${qs.toString()}` : ''}`);
  },

  async getDataSheetById(id: string): Promise<ApiResponse<ProductDataSheetDto>> {
    return apiClient.get(`/api/datasheets/${id}`);
  },

  async createDataSheet(payload: CreateProductDataSheetRequest): Promise<ApiResponse<ProductDataSheetDto>> {
    return apiClient.post('/api/datasheets', payload);
  },

  async deleteDataSheet(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/datasheets/${id}`);
  },

  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get('/api/datasheets/categories');
  }
};
