import { apiClient } from '@/lib/api-client';
import { ApiResponse, UserPreferenceDto, UserProfileDto } from '@/types';

export const userPreferencesService = {
  async getPreferences(): Promise<ApiResponse<UserPreferenceDto>> {
    return apiClient.get('/api/user/preferences');
  },

  async updatePreferences(data: Partial<UserPreferenceDto>): Promise<ApiResponse<UserPreferenceDto>> {
    return apiClient.put('/api/user/preferences', data);
  },

  async getProfile(): Promise<ApiResponse<UserProfileDto>> {
    return apiClient.get('/api/user/profile');
  },

  async updateProfile(data: Partial<UserProfileDto>): Promise<ApiResponse<UserProfileDto>> {
    return apiClient.put('/api/user/profile', data);
  },

  async getSessions(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/api/user/sessions');
  }
};
