import { apiClient } from '@/lib/api-client';
import {
  AdminDashboardStats,
  EngineerDashboardStats,
  TechnicalOfficeDashboardStats,
  AuditLogItem,
  SystemSafeConfig
} from '@/types';

export const dashboardService = {
  async getAdminStats(): Promise<AdminDashboardStats> {
    const res = await apiClient.get<AdminDashboardStats>('/api/reports/dashboard-stats');
    return res.data;
  },

  async getEngineerStats(): Promise<EngineerDashboardStats> {
    try {
      const res = await apiClient.get<EngineerDashboardStats>('/api/dashboard/engineer');
      if (res.success && res.data) return res.data;
    } catch {
      // fall through to legacy endpoint
    }
    const fallback = await apiClient.get<EngineerDashboardStats>('/api/reports/engineer-stats');
    return fallback.data;
  },

  async getTechnicalOfficeDashboard(): Promise<TechnicalOfficeDashboardStats> {
    const res = await apiClient.get<TechnicalOfficeDashboardStats>('/api/dashboard/technical-office');
    return res.data;
  },

  async search(query: string) {
    const res = await apiClient.get<any>(`/api/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getAuditLogs(page = 1, pageSize = 20, search = '') {
    const res = await apiClient.get<{ items: AuditLogItem[]; totalCount: number }>(
      `/api/audit?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`
    );
    return res.data || { items: [], totalCount: 0 };
  },

  async getSafeConfig(): Promise<SystemSafeConfig> {
    const res = await apiClient.get<SystemSafeConfig>('/api/system/config');
    return res.data;
  },

  async getUsers() {
    const res = await apiClient.get<any[]>('/api/users');
    return res.data || [];
  },

  async createUser(payload: any) {
    const res = await apiClient.post<any>('/api/users', payload);
    return res.data;
  },

  async updateUser(id: string, payload: any) {
    const res = await apiClient.put<any>(`/api/users/${id}`, payload);
    return res.data;
  },

  async resetPassword(id: string, newPassword: string) {
    const res = await apiClient.post<any>(`/api/users/${id}/reset-password`, { newPassword });
    return res.data;
  },

  async deleteUser(id: string) {
    const res = await apiClient.delete(`/api/users/${id}`);
    return res.success;
  }
};
