import { apiClient } from '@/lib/api-client';
import {
  ApiResponse,
  AccountingDashboardStatsDto,
  AccountingInvoiceDto,
  ApprovedBoqSummaryDto,
  CommercialDocumentDto,
  InvoiceStatus
} from '@/types';

export interface CreateInvoicePayload {
  projectId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  amount: number;
  tax?: number;
  currency?: string;
  notes?: string;
  documentId?: string;
}

export interface UpdateInvoiceStatusPayload {
  status: InvoiceStatus;
  paidDate?: string;
  notes?: string;
}

export const accountingService = {
  async getDashboardStats(): Promise<ApiResponse<AccountingDashboardStatsDto>> {
    return apiClient.get('/api/accounting/dashboard');
  },

  async getInvoices(params?: {
    projectId?: string;
    status?: InvoiceStatus;
  }): Promise<ApiResponse<AccountingInvoiceDto[]>> {
    const query = new URLSearchParams();
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.status) query.set('status', params.status);

    const qs = query.toString();
    return apiClient.get(`/api/accounting/invoices${qs ? `?${qs}` : ''}`);
  },

  async getInvoiceById(id: string): Promise<ApiResponse<AccountingInvoiceDto>> {
    return apiClient.get(`/api/accounting/invoices/${id}`);
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<ApiResponse<AccountingInvoiceDto>> {
    const body: CreateInvoicePayload = {
      ...payload,
      dueDate: payload.dueDate?.trim() ? payload.dueDate : undefined,
    };
    return apiClient.post('/api/accounting/invoices', body);
  },

  async updateInvoiceStatus(id: string, payload: UpdateInvoiceStatusPayload): Promise<ApiResponse<{ message: string }>> {
    return apiClient.put(`/api/accounting/invoices/${id}/status`, payload);
  },

  async getApprovedBoqs(projectId?: string): Promise<ApiResponse<ApprovedBoqSummaryDto[]>> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiClient.get(`/api/accounting/approved-boqs${query}`);
  },

  async getCommercialDocuments(projectId?: string): Promise<ApiResponse<CommercialDocumentDto[]>> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiClient.get(`/api/accounting/commercial-documents${query}`);
  },

  async getPurchaseOrders(): Promise<ApiResponse<any[]>> {
    return apiClient.get('/api/accounting/purchase-orders');
  },

  async getPayments(projectId?: string): Promise<ApiResponse<any[]>> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return apiClient.get(`/api/accounting/payments${query}`);
  }
};
