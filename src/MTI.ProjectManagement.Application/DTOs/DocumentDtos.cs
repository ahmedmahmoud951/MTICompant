using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record DocumentTypeDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameEn,
    string? Description,
    bool IsActive
);

public record DocumentDto(
    Guid Id,
    string DocumentNumber,
    Guid ProjectId,
    string ProjectName,
    Guid? SiteId,
    string? SiteName,
    Guid DocumentTypeId,
    string DocumentTypeCode,
    string DocumentTypeNameAr,
    string DocumentTypeNameEn,
    string Title,
    string? Description,
    Guid OwnerUserId,
    string OwnerName,
    Guid UploadedBy,
    string UploaderName,
    DocumentStatus Status,
    Guid? CurrentVersionId,
    int CurrentVersionNumber,
    string? CurrentFileName,
    long? CurrentFileSize,
    DateTime? EditableUntil,
    bool IsLocked,
    bool IsEditable,
    DateTime? ApprovedAt,
    Guid? ApprovedBy,
    string? ApproverName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    int VersionsCount,
    DocumentCategory Category = DocumentCategory.Other
);


public record DocumentDetailDto(
    DocumentDto Document,
    List<DocumentVersionDto> Versions,
    List<DocumentApprovalDto> Approvals,
    List<DocumentCorrectionDto> Corrections
);

public record DocumentVersionDto(
    Guid Id,
    Guid DocumentId,
    int VersionNumber,
    Guid FileId,
    string FileName,
    string ContentType,
    long FileSize,
    string? Checksum,
    Guid UploadedBy,
    string UploaderName,
    DateTime UploadedAt,
    DateTime? EditUntil,
    DocumentVersionStatus Status,
    string? ChangeReason,
    bool IsEditable,
    string? DownloadUrl
);

public record DocumentApprovalDto(
    Guid Id,
    Guid DocumentId,
    Guid VersionId,
    int VersionNumber,
    Guid RequestedBy,
    string RequesterName,
    Guid? ReviewedBy,
    string? ReviewerName,
    DocumentApprovalStatus Status,
    string? Reason,
    DateTime CreatedAt,
    DateTime? ReviewedAt
);

public record DocumentCorrectionDto(
    Guid Id,
    Guid DocumentId,
    Guid OriginalVersionId,
    int VersionNumber,
    Guid RequestedBy,
    string RequesterName,
    Guid? RequestedTo,
    string? AssigneeName,
    string Reason,
    CorrectionStatus Status,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);

public record CreateDocumentRequest(
    Guid ProjectId,
    Guid? SiteId,
    Guid DocumentTypeId,
    string Title,
    string? Description,
    DocumentCategory Category = DocumentCategory.Other
);

public record ReviewDocumentRequest(
    DocumentApprovalStatus Status,
    string? Reason
);

public record RequestCorrectionRequest(
    Guid OriginalVersionId,
    Guid? RequestedTo,
    string Reason
);

public record DocumentUploadIntentResponse(
    Guid DocumentId,
    Guid VersionId,
    int VersionNumber,
    string ObjectKey,
    string UploadUrl,
    DateTime ExpiresAt
);

// ==========================================
// DOC-01 & DOC-02 & DOC-03: Central Document Center DTOs
// ==========================================
public record DocumentFilterRequest(
    Guid? ProjectId = null,
    Guid? SiteId = null,
    DocumentCategory? Category = null,
    Guid? DocumentTypeId = null,
    DocumentStatus? Status = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50
)
{
    public DocumentFilterRequest() : this(null, null, null, null, null, null, 1, 50) { }
}

public record UnifiedUploadDocumentRequest(
    Guid ProjectId,
    Guid? SiteId,
    DocumentCategory Category,
    Guid DocumentTypeId,
    string Title,
    string? Description,
    string FileName,
    string? FileExtension,
    string? MimeType,
    long FileSize,
    string StorageKey
);

public record CategoryCountDto(
    DocumentCategory Category,
    string CategoryName,
    int Count
);

public record ProjectDocumentCenterDto(
    Guid ProjectId,
    string ProjectName,
    List<CategoryCountDto> Categories,
    List<DocumentDto> Documents
);

public record SiteDocumentCenterDto(
    Guid SiteId,
    string SiteName,
    Guid ProjectId,
    string ProjectName,
    List<CategoryCountDto> Categories,
    List<DocumentDto> Documents
);

// ==========================================
// DRAW-01: Drawings DTOs
// ==========================================
public record DrawingDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid? SiteId,
    string? SiteName,
    Guid? DocumentId,
    string DrawingNumber,
    string DrawingTitle,
    DrawingDiscipline Discipline,
    DrawingType DrawingType,
    string Revision,
    int Version,
    DocumentStatus Status,
    Guid UploadedBy,
    string UploaderName,
    DateTime UploadedAt,
    Guid? ApprovedBy,
    string? ApproverName,
    DateTime? ApprovedAt,
    string StorageKey,
    string? FileName,
    string? FileExtension,
    long FileSizeBytes,
    int MarkupsCount,
    string? DownloadUrl,
    bool IsLocked = false,
    Guid? CurrentRevisionId = null,
    List<DrawingRevisionDto>? Revisions = null
);

public record DrawingRevisionDto(
    Guid Id,
    Guid DrawingId,
    string Revision,
    int VersionNumber,
    bool IsCurrent,
    string StorageKey,
    string? FileName,
    string? FileExtension,
    long FileSizeBytes,
    Guid UploadedBy,
    string UploaderName,
    DateTime UploadedAt,
    DocumentStatus Status,
    Guid? ApprovedBy,
    string? ApproverName,
    DateTime? ApprovedAt,
    string? ChangeReason,
    string? Comments,
    bool IsLocked,
    string? DownloadUrl
);

public record CreateDrawingRevisionRequest(
    string Revision,
    string StorageKey,
    string? FileName,
    string? FileExtension,
    long FileSizeBytes,
    string? ChangeReason = null,
    string? Comments = null
);

public record CreateDrawingRequest(
    Guid ProjectId,
    Guid? SiteId,
    string DrawingNumber,
    string DrawingTitle,
    DrawingDiscipline Discipline,
    DrawingType DrawingType,
    string Revision,
    string StorageKey,
    string? FileName,
    string? FileExtension,
    long FileSizeBytes,
    string? ChangeReason = null
);

public record UpdateDrawingStatusRequest(
    DocumentStatus Status,
    string? Reason = null
);

public record DrawingFilterRequest(
    Guid? ProjectId = null,
    Guid? SiteId = null,
    DrawingDiscipline? Discipline = null,
    DrawingType? DrawingType = null,
    DocumentStatus? Status = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50
)
{
    public DrawingFilterRequest() : this(null, null, null, null, null, null, 1, 50) { }
}

// ==========================================
// DRAW-02: Drawing Markup DTOs
// ==========================================
public record DrawingMarkupDto(
    Guid Id,
    Guid DrawingId,
    Guid UserId,
    string UserName,
    DrawingMarkupType Type,
    string PositionJson,
    string Text,
    string? Color,
    DateTime CreatedAt
);

public record CreateDrawingMarkupRequest(
    DrawingMarkupType Type,
    string PositionJson,
    string Text,
    string? Color = "#ef4444"
);

// ==========================================
// DOC-06: MTI Data Sheets DTOs
// ==========================================
public record ProductDataSheetDto(
    Guid Id,
    Guid? DocumentId,
    Guid? ProjectId,
    string? ProjectName,
    Guid? SiteId,
    string? SiteName,
    Guid? AssetId,
    string? AssetName,
    Guid? MaterialId,
    string? MaterialName,
    string Product,
    string Manufacturer,
    string Model,
    string? PartNumber,
    string Category,
    int Version,
    string? StorageKey,
    string? FileName,
    long FileSizeBytes,
    Guid UploadedBy,
    string UploaderName,
    DateTime UploadedAt,
    string? DownloadUrl
);

public record CreateProductDataSheetRequest(
    Guid? ProjectId,
    Guid? SiteId,
    Guid? AssetId,
    Guid? MaterialId,
    string Product,
    string Manufacturer,
    string Model,
    string? PartNumber,
    string Category,
    string? StorageKey,
    string? FileName,
    long FileSizeBytes
);

public record ProductDataSheetFilterRequest(
    Guid? ProjectId = null,
    Guid? SiteId = null,
    string? Category = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50
)
{
    public ProductDataSheetFilterRequest() : this(null, null, null, null, 1, 50) { }
}

