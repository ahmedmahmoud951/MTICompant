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

  /** True only when both user profile and access token exist locally. */
  hasSession(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(localStorage.getItem('mti_user') && localStorage.getItem('mti_access_token'));
  },

  async logout(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('mti_refresh_token') : null;
    // Clear local session first so UI never stays "half logged in"
    apiClient.clearTokens();
    try {
      if (refreshToken) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://mtiapi.runasp.net'}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Ignore network errors on logout
    }
  },

  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    if (!localStorage.getItem('mti_access_token')) return null;
    const userJson = localStorage.getItem('mti_user');
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  },
};
