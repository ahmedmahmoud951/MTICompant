import { apiClient, API_BASE_URL } from '@/lib/api-client';

export interface UploadedMedia {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status?: string;
  downloadUrl?: string;
}

export const mediaService = {
  async uploadFile(
    file: File,
    meta?: { projectId?: string; siteId?: string; entityType?: string }
  ): Promise<UploadedMedia> {
    const form = new FormData();
    form.append('File', file);
    if (meta?.projectId) form.append('ProjectId', meta.projectId);
    if (meta?.siteId) form.append('SiteId', meta.siteId);
    form.append('EntityType', meta?.entityType || 'ProjectData');

    const res = await apiClient.uploadForm<UploadedMedia>('/api/media/upload', form);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to upload file');
    }
    return res.data;
  }
};

export { API_BASE_URL };
