using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record MediaFileDto(
    Guid Id,
    string OriginalFileName,
    string ContentType,
    MediaType MediaType,
    long FileSize,
    string Status,
    string DownloadUrl,
    DateTime UploadedAt,
    string? EntityType,
    Guid? EntityId,
    Guid OwnerUserId
);

public record CreateUploadUrlRequest(
    string EntityType,
    Guid? ProjectId,
    Guid? SiteId,
    Guid? EntityId,
    string FileName,
    string ContentType,
    long FileSize
);

public record CreateUploadUrlResponse(
    Guid MediaFileId,
    string ObjectKey,
    string UploadUrl,
    string DownloadUrl,
    int ExpiryMinutes
);

public record CompleteUploadRequest(
    string? Checksum
);

public record AuthorizeUploadRequest(
    string TargetType, // "Document", "Asset", "Chat", "OperationPhoto", "ReportAttachment", "General"
    Guid? ProjectId,
    Guid? SiteId,
    Guid? DocumentId,
    Guid? VersionId,
    Guid? AssetId,
    Guid? ConversationId,
    Guid? MessageId,
    Guid? AttachmentId,
    Guid? OperationId,
    Guid? ReportId,
    string FileName,
    string ContentType,
    long FileSize,
    string? Checksum = null
);

public record AuthorizeUploadResponse(
    Guid MediaFileId,
    string ObjectKey,
    string UploadUrl,
    int ExpiresInMinutes,
    string? Checksum = null
);

public record FinalizeUploadRequest(
    Guid MediaFileId,
    string? Checksum = null,
    string? Caption = null,
    bool CreateDocumentVersion = false,
    bool CreateMessageAttachment = false
);

public record FinalizeUploadResponse(
    MediaFileDto MediaFile,
    Guid? DocumentVersionId = null,
    Guid? MessageAttachmentId = null,
    bool IsDuplicate = false
);

public record WarrantyAlertDto(
    Guid AssetId,
    string AssetCode,
    string Name,
    string? Model,
    string? SerialNumber,
    AssetType AssetType,
    Guid? ProjectId,
    string? ProjectName,
    DateTime? WarrantyEnd,
    int DaysRemaining,
    string AlertLevel,
    bool NotificationSent
);
