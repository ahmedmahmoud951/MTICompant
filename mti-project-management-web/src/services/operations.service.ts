import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  BoqItem,
  TechnicalOffer,
  CommercialOffer,
  ProjectInvoice,
  Material,
  SiteMaterialRequest,
  CompanyAsset,
  ProjectRisk,
  ProjectIssue,
  ProjectHandover
} from '@/types';

export const operationsService = {
  // BOQ
  async getProjectBoq(projectId: string): Promise<ApiResponse<BoqItem[]>> {
    return apiClient.get(`/api/technical-office/projects/${projectId}/boq`);
  },

  async createBoqItem(data: {
    projectId: string;
    siteId?: string;
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    estimatedCost: number;
    category: string;
    notes?: string;
  }): Promise<ApiResponse<BoqItem>> {
    return apiClient.post('/api/technical-office/boq', data);
  },

  async deleteBoqItem(id: string): Promise<ApiResponse<boolean>> {
    return apiClient.delete(`/api/technical-office/boq/${id}`);
  },

  // Technical & Commercial Offers
  async getTechnicalOffers(projectId: string): Promise<ApiResponse<TechnicalOffer[]>> {
    return apiClient.get(`/api/technical-office/projects/${projectId}/technical-offers`);
  },

  async createTechnicalOffer(data: {
    projectId: string;
    title: string;
    scopeOfWork: string;
    specificationsJson: string;
    deliverables: string;
    documentMediaFileId?: string;
  }): Promise<ApiResponse<TechnicalOffer>> {
    return apiClient.post('/api/technical-office/technical-offers', data);
  },

  async getCommercialOffers(projectId: string): Promise<ApiResponse<CommercialOffer[]>> {
    return apiClient.get(`/api/technical-office/projects/${projectId}/commercial-offers`);
  },

  async createCommercialOffer(data: {
    projectId: string;
    title: string;
    totalAmount: number;
    discount: number;
    tax: number;
    currency: string;
    paymentTerms: string;
    validityDays: number;
    documentMediaFileId?: string;
  }): Promise<ApiResponse<CommercialOffer>> {
    return apiClient.post('/api/technical-office/commercial-offers', data);
  },

  // Invoices
  async getProjectInvoices(projectId: string): Promise<ApiResponse<ProjectInvoice[]>> {
    return apiClient.get(`/api/technical-office/projects/${projectId}/invoices`);
  },

  async createInvoice(data: {
    projectId: string;
    invoiceNumber: string;
    milestoneDescription: string;
    amount: number;
    currency: string;
    issuedDate: string;
    dueDate?: string;
    notes?: string;
    attachmentMediaFileId?: string;
  }): Promise<ApiResponse<ProjectInvoice>> {
    return apiClient.post('/api/technical-office/invoices', data);
  },

  async updateInvoiceStatus(id: string, status: string, notes?: string): Promise<ApiResponse<boolean>> {
    return apiClient.put(`/api/technical-office/invoices/${id}/status`, { status, notes });
  },

  // Materials & Requests
  async getMaterials(category?: string, search?: string): Promise<ApiResponse<Material[]>> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/materials-assets/materials${qs}`);
  },

  async createMaterial(data: {
    code: string;
    name: string;
    specification: string;
    unit: string;
    inStockQuantity: number;
    minimumThreshold: number;
    category: string;
  }): Promise<ApiResponse<Material>> {
    return apiClient.post('/api/materials-assets/materials', data);
  },

  async getSiteMaterialRequests(projectId?: string, siteId?: string): Promise<ApiResponse<SiteMaterialRequest[]>> {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (siteId) params.append('siteId', siteId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/materials-assets/requests${qs}`);
  },

  async createSiteMaterialRequest(data: {
    projectId: string;
    siteId: string;
    requiredDate: string;
    notes?: string;
    items: { materialId: string; quantityRequested: number; notes?: string }[];
  }): Promise<ApiResponse<boolean>> {
    return apiClient.post('/api/materials-assets/requests', data);
  },

  async createMaterialRequest(data: {
    projectId: string;
    siteId?: string;
    requiredDate?: string;
    notes?: string;
    items: { materialId?: string; itemCode?: string; description?: string; unit?: string; quantityRequested?: number; requestedQuantity?: number; notes?: string }[];
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/api/materials-assets/requests', data);
  },

  async updateMaterialRequestStatus(id: string, status: string, rejectionReason?: string): Promise<ApiResponse<boolean>> {
    return apiClient.put(`/api/materials-assets/requests/${id}/status`, { status, rejectionReason });
  },

  // Assets
  async getAssets(category?: string, status?: string): Promise<ApiResponse<CompanyAsset[]>> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (status) params.append('status', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/materials-assets/assets${qs}`);
  },

  async getCompanyAssets(category?: string, status?: string): Promise<ApiResponse<CompanyAsset[]>> {
    return this.getAssets(category, status);
  },

  async createAsset(data: {
    assetTag: string;
    name: string;
    model: string;
    serialNumber: string;
    category: string;
    assignedToUserId?: string;
    assignedToSiteId?: string;
    status?: string;
    purchaseDate?: string;
    warrantyExpiry?: string;
    maintenanceNotes?: string;
    purchaseCost?: number;
  }): Promise<ApiResponse<CompanyAsset>> {
    const payload = {
      ...data,
      status: data.status || 'Available'
    };
    return apiClient.post('/api/materials-assets/assets', payload);
  },

  // Governance: Risks, Issues, Handover
  async getProjectRisks(projectId: string): Promise<ApiResponse<ProjectRisk[]>> {
    return apiClient.get(`/api/governance/projects/${projectId}/risks`);
  },

  async createRisk(data: {
    projectId: string;
    title: string;
    description: string;
    severity: string;
    probability: number;
    impact?: number;
    mitigationPlan: string;
    ownerUserId?: string;
    category?: string;
  }): Promise<ApiResponse<ProjectRisk>> {
    return apiClient.post('/api/governance/risks', data);
  },

  async getProjectIssues(projectId: string): Promise<ApiResponse<ProjectIssue[]>> {
    return apiClient.get(`/api/governance/projects/${projectId}/issues`);
  },

  async reportIssue(data: {
    projectId: string;
    siteId?: string;
    title: string;
    description: string;
    priority: string;
    assignedToUserId?: string;
  }): Promise<ApiResponse<ProjectIssue>> {
    return apiClient.post('/api/governance/issues', data);
  },

  async createIssue(data: {
    projectId: string;
    siteId?: string;
    title: string;
    description: string;
    priority: string;
    assignedToUserId?: string;
  }): Promise<ApiResponse<ProjectIssue>> {
    return this.reportIssue(data);
  },

  async resolveIssue(id: string, resolution: string, rootCause?: string): Promise<ApiResponse<boolean>> {
    return apiClient.put(`/api/governance/issues/${id}/resolve`, { resolution, rootCause });
  },

  async getProjectHandover(projectId: string): Promise<ApiResponse<ProjectHandover | null>> {
    return apiClient.get(`/api/governance/projects/${projectId}/handover`);
  },

  async createOrUpdateHandover(data: {
    projectId: string;
    handoverDate: string;
    status?: string;
    acceptanceStatus?: string;
    snagListJson: string;
    preliminaryAcceptedBy?: string;
    finalAcceptedBy?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    warrantyTerms?: string;
    maintenanceContractRef?: string;
  }): Promise<ApiResponse<ProjectHandover>> {
    const payload = {
      ...data,
      status: data.status || data.acceptanceStatus || 'Pending'
    };
    return apiClient.post('/api/governance/handover', payload);
  },

  async recordHandover(data: {
    projectId: string;
    handoverDate: string;
    status?: string;
    acceptanceStatus?: string;
    snagListJson: string;
    preliminaryAcceptedBy?: string;
    finalAcceptedBy?: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    warrantyTerms?: string;
    maintenanceContractRef?: string;
  }): Promise<ApiResponse<ProjectHandover>> {
    return this.createOrUpdateHandover(data);
  }
};
