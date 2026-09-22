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
