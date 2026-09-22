import { apiClient } from '@/lib/api-client';
import { ApiResponse, User } from '@/types';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  assignedProjectIds: string[];
  assignedSiteIds: string[];
}

export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<LoginResult>> {
    const res = await apiClient.post<LoginResult>('/api/auth/login', { email, password });
    if (res.success && res.data) {
      apiClient.setTokens(res.data.accessToken, res.data.refreshToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mti_user', JSON.stringify(res.data.user));
      }
    }
    return res;
  },

  async getMe(): Promise<ApiResponse<{ user: User; assignedProjectIds: string[]; assignedSiteIds: string[] }>> {
    return apiClient.get('/api/auth/me');
  },

  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('mti_refresh_token') : null;
    try {
      await apiClient.post('/api/auth/logout', { refreshToken });
    } catch {
      // Ignore network errors on logout
    } finally {
      apiClient.clearTokens();
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userJson = localStorage.getItem('mti_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  },
};
