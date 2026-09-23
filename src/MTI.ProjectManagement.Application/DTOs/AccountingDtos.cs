using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record AccountingDashboardStatsDto(
    decimal TotalInvoicedAmount,
    decimal TotalPaidAmount,
    decimal TotalDueAmount,
    decimal TotalOverdueAmount,
    int TotalInvoicesCount,
    int DueInvoicesCount,
    int OverdueInvoicesCount,
    int PendingApprovalInvoicesCount,
    decimal TotalApprovedBoqValue,
    int ApprovedBoqCount
);

public record AccountingInvoiceDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string InvoiceNumber,
    DateTime InvoiceDate,
    DateTime? DueDate,
    DateTime? PaidDate,
    decimal Amount,
    decimal Tax,
    decimal Total,
    string Currency,
    InvoiceStatus Status,
    string? Notes,
    Guid? DocumentId,
    string? DocumentNumber,
    Guid? AttachmentMediaFileId,
    string? DownloadUrl,
    Guid CreatedBy,
    DateTime CreatedAt
);

public record CreateAccountingInvoiceRequest(
    Guid ProjectId,
    string InvoiceNumber,
    DateTime InvoiceDate,
    DateTime? DueDate,
    decimal Amount,
    decimal Tax = 0,
    string Currency = "EGP",
    string? Notes = null,
    Guid? DocumentId = null
);

public record UpdateAccountingInvoiceStatusRequest(
    InvoiceStatus Status,
    DateTime? PaidDate = null,
    string? Notes = null
);

public record ApprovedBoqSummaryDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string ItemCode,
    string Description,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal TotalPrice,
    string Category,
    DateTime ApprovedAt
);

public record CommercialDocumentDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Title,
    string DocumentType,
    decimal Amount,
    string Currency,
    string Status,
    int Version,
    string? DownloadUrl,
    DateTime CreatedAt
);
