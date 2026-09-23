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
    int VersionsCount
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
    string? Description
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
