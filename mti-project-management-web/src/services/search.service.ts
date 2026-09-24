import { apiClient } from '@/lib/api-client';
import { GlobalSearchFilters } from '@/types';

export interface SearchResultItem {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  createdAt: string;
  url?: string;
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  results: SearchResultItem[];
}

export const searchService = {
  async globalSearch(filters: GlobalSearchFilters): Promise<GlobalSearchResponse> {
    const qs = new URLSearchParams();
    if (filters.q) qs.set('q', filters.q);
    if (filters.projectId) qs.set('projectId', filters.projectId);
    if (filters.siteId) qs.set('siteId', filters.siteId);
    if (filters.departmentId) qs.set('departmentId', filters.departmentId);
    if (filters.teamId) qs.set('teamId', filters.teamId);
    if (filters.userId) qs.set('userId', filters.userId);
    if (filters.category) qs.set('category', filters.category);
    if (filters.documentType) qs.set('documentType', filters.documentType);
    if (filters.dateFrom) qs.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) qs.set('dateTo', filters.dateTo);
    if (filters.status) qs.set('status', filters.status);
    if (filters.entityType) qs.set('entityType', filters.entityType);

    const res = await apiClient.get<GlobalSearchResponse>(`/api/search${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (res.success && res.data) {
      return res.data;
    }
    return { query: filters.q || '', totalResults: 0, results: [] };
  }
};
