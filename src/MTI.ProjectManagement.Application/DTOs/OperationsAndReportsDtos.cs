using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record SiteOperationDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid SiteId,
    string SiteName,
    OperationType OperationType,
    string Title,
    string Description,
    Guid? AssignedUserId,
    string? AssignedUserName,
    Guid? AssignedTeamId,
    string? AssignedTeamName,
    SiteOperationStatus Status,
    TaskPriority Priority,
    DateTime? StartDate,
    DateTime? DueDate,
    DateTime? CompletedAt,
    int Progress,
    DateTime CreatedAt,
    int WorkLogsCount,
    int PhotosCount
);

public record CreateSiteOperationRequest(
    Guid ProjectId,
    Guid SiteId,
    OperationType OperationType,
    string Title,
    string Description,
    Guid? AssignedUserId,
    Guid? AssignedTeamId,
    TaskPriority Priority = TaskPriority.Medium,
    DateTime? StartDate = null,
    DateTime? DueDate = null
);

public record UpdateSiteOperationRequest(
    string Title,
    string Description,
    SiteOperationStatus Status,
    TaskPriority Priority,
    int Progress,
    DateTime? CompletedAt = null
);

public record OperationWorkLogDto(
    Guid Id,
    Guid OperationId,
    Guid UserId,
    string UserName,
    string Description,
    decimal Hours,
    DateTime CreatedAt
);

public record CreateWorkLogRequest(
    string Description,
    decimal Hours
);

public record OperationPhotoDto(
    Guid Id,
    Guid OperationId,
    Guid ProjectId,
    Guid SiteId,
    Guid MediaFileId,
    string FileName,
    string DownloadUrl,
    Guid UploaderUserId,
    string UploaderUserName,
    string? Caption,
    DateTime CreatedAt
);

public record AddOperationPhotoRequest(
    Guid MediaFileId,
    string? Caption = null
);

// Daily Site Reports
public record DailySiteReportDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid SiteId,
    string SiteName,
    DateTime ReportDate,
    Guid EngineerUserId,
    string EngineerUserName,
    Guid? TeamId,
    string? TeamName,
    DailyReportStatus Status,
    int RevisionNumber,
    bool IsImmutable,
    DateTime CreatedAt,
    DateTime? ApprovedAt,
    string? ApprovedByUserName,
    int AttachmentsCount
);

public record DailySiteReportDetailDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid SiteId,
    string SiteName,
    DateTime ReportDate,
    Guid EngineerUserId,
    string EngineerUserName,
    Guid? TeamId,
    string? TeamName,
    string Manpower,
    string WorkCompleted,
    string Problems,
    string MaterialsReceived,
    string MaterialsUsed,
    string Equipment,
    string SafetyNotes,
    string TomorrowPlan,
    DailyReportStatus Status,
    int RevisionNumber,
    Guid? ParentReportId,
    bool IsImmutable,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    string? ReviewedByUserName,
    DateTime? ApprovedAt,
    string? ApprovedByUserName,
    string? ReviewNotes,
    List<DailyReportAttachmentDto> Attachments
);

public record DailyReportAttachmentDto(
    Guid Id,
    Guid DailySiteReportId,
    Guid MediaFileId,
    string FileName,
    string AttachmentType,
    string? Caption,
    string DownloadUrl,
    DateTime CreatedAt
);

public record CreateDailyReportRequest(
    Guid ProjectId,
    Guid SiteId,
    DateTime ReportDate,
    Guid? TeamId,
    string Manpower,
    string WorkCompleted,
    string Problems,
    string MaterialsReceived,
    string MaterialsUsed,
    string Equipment,
    string SafetyNotes,
    string TomorrowPlan,
    List<Guid>? MediaFileIds = null
);

public record ReviewDailyReportRequest(
    DailyReportStatus Status, // Reviewed, Approved, Rejected
    string? Notes = null
);

public record CreateReportRevisionRequest(
    string Manpower,
    string WorkCompleted,
    string Problems,
    string MaterialsReceived,
    string MaterialsUsed,
    string Equipment,
    string SafetyNotes,
    string TomorrowPlan,
    List<Guid>? MediaFileIds = null
);
