using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

// --- BOQ & Technical Office ---
public record BoqItemDto(
    Guid Id,
    Guid ProjectId,
    Guid? SiteId,
    string? SiteName,
    string ItemCode,
    string Description,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal EstimatedCost,
    decimal TotalPrice,
    string Category,
    string? Notes,
    DateTime CreatedAt
);

public record CreateBoqItemRequest(
    Guid ProjectId,
    Guid? SiteId,
    string ItemCode,
    string Description,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal EstimatedCost,
    string Category,
    string? Notes
);

public record UpdateBoqItemRequest(
    string Description,
    string Unit,
    decimal Quantity,
    decimal UnitPrice,
    decimal EstimatedCost,
    string Category,
    string? Notes
);

public record TechnicalOfferDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Title,
    string ScopeOfWork,
    string SpecificationsJson,
    string Deliverables,
    OfferStatus Status,
    int Version,
    Guid? DocumentMediaFileId,
    DateTime CreatedAt
);

public record CreateTechnicalOfferRequest(
    Guid ProjectId,
    string Title,
    string ScopeOfWork,
    string SpecificationsJson,
    string Deliverables,
    Guid? DocumentMediaFileId
);

public record CommercialOfferDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Title,
    decimal TotalAmount,
    decimal Discount,
    decimal Tax,
    decimal FinalAmount,
    string Currency,
    string PaymentTerms,
    int ValidityDays,
    OfferStatus Status,
    int Version,
    Guid? DocumentMediaFileId,
    DateTime CreatedAt
);

public record CreateCommercialOfferRequest(
    Guid ProjectId,
    string Title,
    decimal TotalAmount,
    decimal Discount,
    decimal Tax,
    string Currency,
    string PaymentTerms,
    int ValidityDays,
    Guid? DocumentMediaFileId
);

public record ProjectInvoiceDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string InvoiceNumber,
    string MilestoneDescription,
    decimal Amount,
    string Currency,
    DateTime IssuedDate,
    DateTime? DueDate,
    DateTime? PaidDate,
    InvoiceStatus Status,
    string? Notes,
    Guid? AttachmentMediaFileId,
    DateTime CreatedAt
);

public record CreateInvoiceRequest(
    Guid ProjectId,
    string InvoiceNumber,
    string MilestoneDescription,
    decimal Amount,
    string Currency,
    DateTime IssuedDate,
    DateTime? DueDate,
    string? Notes,
    Guid? AttachmentMediaFileId
);

public record UpdateInvoiceStatusRequest(
    InvoiceStatus Status,
    DateTime? PaidDate,
    string? Notes
);

// --- Materials & Assets ---
public record MaterialDto(
    Guid Id,
    string Code,
    string Name,
    string Specification,
    string Unit,
    decimal InStockQuantity,
    decimal ReservedQuantity,
    decimal AvailableQuantity,
    decimal MinimumThreshold,
    string Category,
    DateTime CreatedAt,
    decimal RequiredQuantity = 0,
    decimal OrderedQuantity = 0,
    decimal ReceivedQuantity = 0,
    decimal InstalledQuantity = 0,
    decimal RemainingQuantity = 0
);

public record CreateMaterialRequest(
    string Code,
    string Name,
    string Specification,
    string Unit,
    decimal InStockQuantity,
    decimal MinimumThreshold,
    string Category,
    decimal RequiredQuantity = 0,
    decimal OrderedQuantity = 0,
    decimal ReceivedQuantity = 0,
    decimal InstalledQuantity = 0
);

public record SiteMaterialRequestDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid SiteId,
    string SiteName,
    Guid RequestedByUserId,
    string RequestedByUserName,
    DateTime RequiredDate,
    MaterialRequestStatus Status,
    Guid? ApprovedByUserId,
    string? ApprovedByUserName,
    DateTime? ApprovedAt,
    string? RejectionReason,
    string? Notes,
    DateTime CreatedAt,
    List<SiteMaterialRequestItemDto> Items
);

public record SiteMaterialRequestItemDto(
    Guid Id,
    Guid MaterialId,
    string MaterialCode,
    string MaterialName,
    string Unit,
    decimal QuantityRequested,
    decimal QuantityApproved,
    decimal QuantityDispatched,
    string? Notes
);

public record CreateSiteMaterialRequest(
    Guid ProjectId,
    Guid SiteId,
    DateTime RequiredDate,
    string? Notes,
    List<CreateSiteMaterialRequestItem> Items
);

public record CreateSiteMaterialRequestItem(
    Guid MaterialId,
    decimal QuantityRequested,
    string? Notes
);

public record UpdateMaterialRequestStatusRequest(
    MaterialRequestStatus Status,
    string? RejectionReason,
    Dictionary<Guid, decimal>? ApprovedQuantities
);

public record CompanyAssetDto(
    Guid Id,
    string AssetTag,
    string Name,
    string Model,
    string SerialNumber,
    string Category,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    Guid? AssignedToSiteId,
    string? AssignedToSiteName,
    AssetStatus Status,
    DateTime? PurchaseDate,
    DateTime? WarrantyExpiry,
    string? MaintenanceNotes,
    DateTime CreatedAt,
    string? AssetCode = null,
    Guid? ProjectId = null,
    string? ProjectName = null,
    AssetType AssetType = AssetType.Other,
    string? Brand = null,
    string? IPAddress = null,
    string? MacAddress = null,
    string? Location = null,
    DateTime? InstallationDate = null,
    DateTime? WarrantyStart = null,
    DateTime? WarrantyEnd = null
);

public record CreateCompanyAssetRequest(
    string AssetTag,
    string Name,
    string Model,
    string SerialNumber,
    string Category,
    Guid? AssignedToUserId,
    Guid? AssignedToSiteId,
    AssetStatus Status,
    DateTime? PurchaseDate,
    DateTime? WarrantyExpiry,
    string? MaintenanceNotes,
    string? AssetCode = null,
    Guid? ProjectId = null,
    AssetType AssetType = AssetType.Other,
    string? Brand = null,
    string? IPAddress = null,
    string? MacAddress = null,
    string? Location = null,
    DateTime? InstallationDate = null,
    DateTime? WarrantyStart = null,
    DateTime? WarrantyEnd = null
);

// --- Governance, Risks, Issues & Handover ---
public record ProjectRiskDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Title,
    string Description,
    RiskSeverity Severity,
    decimal Probability,
    string MitigationPlan,
    Guid? OwnerUserId,
    string? OwnerUserName,
    RiskStatus Status,
    DateTime CreatedAt
);

public record CreateRiskRequest(
    Guid ProjectId,
    string Title,
    string Description,
    RiskSeverity Severity,
    decimal Probability,
    string MitigationPlan,
    Guid? OwnerUserId
);

public record ProjectIssueDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid? SiteId,
    string? SiteName,
    string Title,
    string Description,
    TaskPriority Priority,
    string? RootCause,
    string? Resolution,
    IssueStatus Status,
    Guid ReportedByUserId,
    string ReportedByUserName,
    Guid? AssignedToUserId,
    string? AssignedToUserName,
    DateTime? ResolvedAt,
    DateTime CreatedAt
);

public record CreateIssueRequest(
    Guid ProjectId,
    Guid? SiteId,
    string Title,
    string Description,
    TaskPriority Priority,
    Guid? AssignedToUserId
);

public record ResolveIssueRequest(
    string Resolution,
    string? RootCause
);

public record ProjectHandoverDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    DateTime HandoverDate,
    HandoverStatus Status,
    string SnagListJson,
    string? PreliminaryAcceptedBy,
    string? FinalAcceptedBy,
    DateTime? WarrantyStartDate,
    DateTime? WarrantyEndDate,
    string? WarrantyTerms,
    string? MaintenanceContractRef,
    DateTime CreatedAt
);

public record CreateOrUpdateHandoverRequest(
    Guid ProjectId,
    DateTime HandoverDate,
    HandoverStatus Status,
    string SnagListJson,
    string? PreliminaryAcceptedBy,
    string? FinalAcceptedBy,
    DateTime? WarrantyStartDate,
    DateTime? WarrantyEndDate,
    string? WarrantyTerms,
    string? MaintenanceContractRef
);
