import { apiClient, API_BASE_URL } from '@/lib/api-client';

export interface UploadedMedia {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status?: string;
  downloadUrl?: string;
}

export interface AuthorizeUploadPayload {
  targetType: string;
  projectId?: string;
  siteId?: string;
  documentId?: string;
  versionId?: string;
  assetId?: string;
  conversationId?: string;
  messageId?: string;
  attachmentId?: string;
  operationId?: string;
  reportId?: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  checksum?: string;
}

export interface AuthorizeUploadResult {
  mediaFileId: string;
  objectKey: string;
  uploadUrl: string;
  expiresInMinutes: number;
}

export interface FinalizeUploadPayload {
  mediaFileId: string;
  checksum?: string;
  caption?: string;
  createDocumentVersion?: boolean;
  createMessageAttachment?: boolean;
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
  },

  async authorizeUpload(payload: AuthorizeUploadPayload): Promise<AuthorizeUploadResult> {
    const res = await apiClient.post<AuthorizeUploadResult>('/api/media/authorize-upload', payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to authorize B2 upload');
    }
    return res.data;
  },

  async finalizeUpload(payload: FinalizeUploadPayload): Promise<UploadedMedia> {
    const res = await apiClient.post<any>('/api/media/finalize-upload', payload);
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to finalize B2 upload');
    }
    return res.data.mediaFile || res.data;
  },

  async uploadDirectToB2(file: File, targetMeta: Omit<AuthorizeUploadPayload, 'fileName' | 'contentType' | 'fileSize'>): Promise<UploadedMedia> {
    // 1. Authorize B2 direct upload
    const auth = await this.authorizeUpload({
      ...targetMeta,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      fileSize: file.size
    });

    // 2. Upload file directly to Backblaze B2 via pre-signed URL (zero credential exposure)
    const uploadRes = await fetch(auth.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error(`Direct B2 upload failed with HTTP status ${uploadRes.status}`);
    }

    // 3. Finalize upload
    return this.finalizeUpload({ mediaFileId: auth.mediaFileId });
  }
};

export { API_BASE_URL };
