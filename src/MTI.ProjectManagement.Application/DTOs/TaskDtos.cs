using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record CreateTaskDto(
    Guid ProjectId,
    Guid? SiteId,
    string Title,
    string? Description = null,
    TaskPriority Priority = TaskPriority.Medium,
    Guid? AssignedToUserId = null,
    Guid? AssignedToTeamId = null,
    DateTime? StartAt = null,
    DateTime? DueAt = null,
    decimal? ProgressPercentage = null,
    TaskItemStatus? Status = null,
    List<Guid>? AttachmentMediaIds = null
);

public record UpdateTaskDto(
    string Title,
    string Description,
    TaskPriority Priority,
    Guid? AssignedToUserId,
    DateTime? StartAt,
    DateTime? DueAt,
    TaskItemStatus? Status = null,
    Guid? AssignedToTeamId = null,
    decimal? ProgressPercentage = null
);

public record CompleteTaskDto(
    string? CompletionComment,
    List<Guid>? AttachmentMediaIds = null
);

public record UpdateTaskStatusDto(
    TaskItemStatus Status,
    string? Notes = null,
    List<Guid>? AttachmentMediaIds = null
);

public record TaskCommentDto(
    Guid Id,
    Guid AuthorUserId,
    string AuthorName,
    string Content,
    DateTime CreatedAt
);

public record TaskAttachmentDto(
    Guid Id,
    Guid MediaFileId,
    string OriginalFileName,
    string ContentType,
    long FileSize,
    string DownloadUrl,
    DateTime AttachedAt
);

public record TaskStatusHistoryDto(
    Guid Id,
    TaskItemStatus OldStatus,
    TaskItemStatus NewStatus,
    string? Reason,
    Guid ChangedBy,
    string ChangedByName,
    DateTime ChangedAt
);

public record TaskDetailDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid? SiteId,
    string? SiteName,
    string Title,
    string Description,
    TaskPriority Priority,
    TaskItemStatus Status,
    bool IsOverdue,
    TimeSpan? RemainingTime,
    TimeSpan? OverdueTime,
    Guid? AssignedToUserId,
    string? AssignedToName,
    Guid? AssignedToTeamId,
    decimal ProgressPercentage,
    DateTime? StartAt,
    DateTime? DueAt,
    DateTime? CompletedAt,
    Guid? CompletedBy,
    Guid? CreatedBy,
    List<TaskCommentDto> Comments,
    List<TaskAttachmentDto> Attachments,
    List<TaskStatusHistoryDto> StatusHistory
);

public record TaskSummaryDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid? SiteId,
    string? SiteName,
    string Title,
    TaskPriority Priority,
    TaskItemStatus Status,
    bool IsOverdue,
    TimeSpan? RemainingTime,
    TimeSpan? OverdueTime,
    Guid? AssignedToUserId,
    string? AssignedToName,
    Guid? AssignedToTeamId,
    decimal ProgressPercentage,
    DateTime? DueAt,
    Guid? CreatedBy,
    DateTime CreatedAt
);

public record TaskFilterParams(
    Guid? ProjectId = null,
    Guid? SiteId = null,
    Guid? AssignedToUserId = null,
    TaskItemStatus? Status = null,
    TaskPriority? Priority = null,
    bool? OverdueOnly = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 20
);
