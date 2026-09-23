import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { mediaService } from '@/services/media.service';
import { ApiResponse, DocumentDto, DocumentDetailDto, DocumentTypeDto, DocumentVersionDto } from '@/types';

export interface CreateDocumentRequest {
  projectId: string;
  siteId?: string;
  documentTypeId: string;
  title: string;
  description?: string;
  file: File;
}

export interface UploadVersionRequest {
  changeReason?: string;
  file: File;
}

export interface ReviewDocumentRequest {
  versionId: string;
  status: 'Approved' | 'Rejected' | 'CorrectionRequested';
  reason?: string;
}

export const documentsService = {
  async getDocumentTypes(): Promise<ApiResponse<DocumentTypeDto[]>> {
    return apiClient.get('/api/documents/types');
  },

  async getDocuments(params?: {
    projectId?: string;
    siteId?: string;
    documentTypeId?: string;
    status?: string;
    search?: string;
  }): Promise<ApiResponse<DocumentDto[]>> {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.siteId) query.set('siteId', params.siteId);
    if (params?.documentTypeId) query.set('documentTypeId', params.documentTypeId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);

    const qs = query.toString();
    return apiClient.get(`/api/documents${qs ? `?${qs}` : ''}`);
  },

  async getDocumentById(id: string): Promise<ApiResponse<DocumentDetailDto>> {
    const res = await apiClient.get<any>(`/api/documents/${id}`);
    if (res.success && res.data) {
      const doc = res.data.document || res.data;
      const normalized: DocumentDetailDto = {
        ...doc,
        id: doc.id || id,
        documentNumber: doc.documentNumber || '',
        projectId: doc.projectId || '',
        projectName: doc.projectName || '',
        siteId: doc.siteId || null,
        siteName: doc.siteName || null,
        documentTypeId: doc.documentTypeId || '',
        documentTypeCode: doc.documentTypeCode || '',
        documentTypeNameAr: doc.documentTypeNameAr || '',
        documentTypeNameEn: doc.documentTypeNameEn || '',
        title: doc.title || '',
        description: doc.description || '',
        ownerUserId: doc.ownerUserId || '',
        ownerName: doc.ownerName || '',
        uploadedBy: doc.uploadedBy || '',
        uploaderName: doc.uploaderName || '',
        status: doc.status || 'Draft',
        currentVersionId: doc.currentVersionId || null,
        currentVersionNumber: doc.currentVersionNumber || 1,
        currentFileName: doc.currentFileName || '',
        currentFileSize: doc.currentFileSize || 0,
        editableUntil: doc.editableUntil || null,
        isLocked: !!doc.isLocked,
        canEdit: doc.canEdit !== undefined ? doc.canEdit : (doc.isEditable !== undefined ? doc.isEditable : true),
        approvedAt: doc.approvedAt || null,
        approvedBy: doc.approvedBy || null,
        approverName: doc.approverName || null,
        createdAt: doc.createdAt || new Date().toISOString(),
        updatedAt: doc.updatedAt || null,
        versionsCount: doc.versionsCount || (res.data.versions ? res.data.versions.length : 0),
        versions: (res.data.versions || doc.versions || []).map((v: any) => ({
          ...v,
          documentId: v.documentId || doc.id || id,
          uploadedByUserName: v.uploaderName || v.uploadedByUserName || '',
          uploadedByUserId: v.uploadedBy || v.uploadedByUserId || '',
          canEdit: v.canEdit !== undefined ? v.canEdit : (v.isEditable !== undefined ? v.isEditable : false)
        })),
        approvals: res.data.approvals || doc.approvals || [],
        corrections: res.data.corrections || doc.corrections || []
      };
      return {
        ...res,
        data: normalized
      };
    }
    return res;
  },

  async createDocument(
    data: CreateDocumentRequest,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<DocumentDto>> {
    onProgress?.(5);
    logger.log('INFO', `[MTI-DOCS] Starting document creation: "${data.title}" (file: ${data.file.name}, size: ${data.file.size} bytes)`);

    // 1. Create document metadata in SQL Server
    const createRes = await apiClient.post<DocumentDto>('/api/documents', {
      projectId: data.projectId,
      siteId: data.siteId || null,
      documentTypeId: data.documentTypeId,
      title: data.title,
      description: data.description || null,
    });

    if (!createRes.success || !createRes.data?.id) {
      logger.log('ERROR', `[MTI-DOCS] Failed to create document metadata: ${createRes.message}`, createRes);
      return createRes;
    }

    const docId = createRes.data.id;
    logger.log('INFO', `[MTI-DOCS] Document metadata created. ID: ${docId}. Starting B2 file upload...`);
    onProgress?.(15);

    const effectiveContentType = data.file.type || 'application/octet-stream';

    // 2. Direct B2 Upload flow (STORAGE-01: Client -> B2 Pre-signed URL -> Finalize)
    try {
      logger.log('INFO', `[MTI-DOCS] Requesting pre-signed upload URL for doc ${docId}...`);
      const auth = await mediaService.authorizeUpload({
        targetType: 'Document',
        projectId: data.projectId,
        documentId: docId,
        fileName: data.file.name,
        contentType: effectiveContentType,
        fileSize: data.file.size
      });

      logger.log('INFO', `[MTI-DOCS] Pre-signed upload URL obtained. Uploading directly to Backblaze B2 bucket...`);
      onProgress?.(35);

      const uploadRes = await fetch(auth.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': effectiveContentType
        },
        body: data.file
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text().catch(() => '');
        throw new Error(`Direct B2 upload failed [${uploadRes.status}]: ${errorText || uploadRes.statusText}`);
      }

      logger.log('INFO', `[MTI-DOCS] Direct B2 PUT succeeded [${uploadRes.status}]. Finalizing version in database...`);
      onProgress?.(80);

      await mediaService.finalizeUpload({
        mediaFileId: auth.mediaFileId,
        createDocumentVersion: true,
        caption: 'Initial document upload'
      });

      logger.log('INFO', `[MTI-DOCS] Document and file upload completed successfully! Document ID: ${docId}`);
      onProgress?.(100);
      return createRes;
    } catch (directErr: any) {
      logger.log('WARN', `[MTI-DOCS] Direct B2 upload failed: ${directErr?.message || directErr}. Attempting server endpoint fallback...`);

      const formData = new FormData();
      formData.append('file', data.file);

      const uploadRes = await apiClient.uploadFormWithProgress(
        `/api/documents/${docId}/versions`,
        formData,
        (filePct) => onProgress?.(15 + Math.round(filePct * 0.8))
      );

      if (!uploadRes.success) {
        logger.log('ERROR', `[MTI-DOCS] Server upload fallback ALSO failed: ${uploadRes.message}. Cleaning up orphaned draft document ${docId}...`);
        
        // Auto-cleanup: remove empty document from database so reload won't show broken draft
        try {
          await apiClient.delete(`/api/documents/${docId}?reason=Upload_Failed_Rollback`);
          logger.log('INFO', `[MTI-DOCS] Cleaned up orphaned draft document ${docId} successfully.`);
        } catch (cleanupErr: any) {
          logger.log('WARN', `[MTI-DOCS] Failed to cleanup orphaned draft document ${docId}: ${cleanupErr?.message}`);
        }

        return {
          success: false,
          message: uploadRes.message || 'فشل رفع ملف المستند إلى السيرفر والتخزين',
          data: createRes.data,
          errors: uploadRes.errors || [directErr?.message || 'File upload failed'],
        };
      }

      logger.log('INFO', `[MTI-DOCS] Server fallback upload succeeded for doc ${docId}!`);
      onProgress?.(100);
      return createRes;
    }
  },

  async uploadNewVersion(
    documentId: string,
    data: UploadVersionRequest,
    onProgress?: (percent: number) => void
  ): Promise<ApiResponse<DocumentVersionDto>> {
    onProgress?.(10);
    const effectiveContentType = data.file.type || 'application/octet-stream';
    logger.log('INFO', `[MTI-DOCS] Uploading new version for document ${documentId}...`);

    try {
      const docRes = await apiClient.get<DocumentDetailDto>(`/api/documents/${documentId}`);
      const projectId = docRes.data?.projectId;

      const auth = await mediaService.authorizeUpload({
        targetType: 'Document',
        projectId,
        documentId,
        fileName: data.file.name,
        contentType: effectiveContentType,
        fileSize: data.file.size
      });

      onProgress?.(40);
      logger.log('INFO', `[MTI-DOCS] Direct B2 PUT for new version...`);

      const uploadRes = await fetch(auth.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': effectiveContentType
        },
        body: data.file
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => '');
        throw new Error(`Direct B2 upload failed [${uploadRes.status}]: ${errText}`);
      }

      onProgress?.(85);
      logger.log('INFO', `[MTI-DOCS] Finalizing new version...`);

      const media = await mediaService.finalizeUpload({
        mediaFileId: auth.mediaFileId,
        createDocumentVersion: true,
        caption: data.changeReason || 'New version upload'
      });

      onProgress?.(100);
      logger.log('INFO', `[MTI-DOCS] New version finalized successfully!`);
      return {
        success: true,
        message: 'Version uploaded successfully',
        errors: [],
        data: {
          id: media.id,
          documentId,
          versionNumber: 1,
          fileId: media.id,
          fileName: data.file.name,
          fileSize: data.file.size,
          contentType: effectiveContentType,
          checksum: '',
          uploadedByUserId: '',
          uploadedByUserName: '',
          uploadedAt: new Date().toISOString(),
          status: 'Active',
          changeReason: data.changeReason || '',
          isLocked: false,
          canEdit: true
        }
      };
    } catch (directErr: any) {
      logger.log('WARN', `[MTI-DOCS] Direct B2 version upload failed: ${directErr?.message}. Falling back to server endpoint...`);
      const formData = new FormData();
      if (data.changeReason) formData.append('changeReason', data.changeReason);
      formData.append('file', data.file);

      return apiClient.uploadFormWithProgress(
        `/api/documents/${documentId}/versions`,
        formData,
        onProgress
      );
    }
  },

  async getDownloadUrl(documentId: string, versionId?: string): Promise<ApiResponse<{ downloadUrl: string; expiresAt: string; fileName: string; isB2Authorized: boolean }>> {
    if (versionId) {
      return apiClient.get(`/api/documents/${documentId}/versions/${versionId}/download`);
    }
    return apiClient.get(`/api/documents/${documentId}/download`);
  },

  async updateDocument(documentId: string, data: { title?: string; description?: string; documentTypeId?: string }): Promise<ApiResponse<DocumentDto>> {
    return apiClient.put(`/api/documents/${documentId}`, data);
  },

  async reviewDocument(documentId: string, data: ReviewDocumentRequest): Promise<ApiResponse<any>> {
    return apiClient.post(`/api/documents/${documentId}/review`, data);
  },

  async deleteDocument(documentId: string, reason?: string): Promise<ApiResponse<any>> {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return apiClient.delete(`/api/documents/${documentId}${qs}`);
  },

  async deleteVersion(documentId: string, versionId: string, reason?: string): Promise<ApiResponse<any>> {
    const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    return apiClient.delete(`/api/documents/${documentId}/versions/${versionId}${qs}`);
  }
};
