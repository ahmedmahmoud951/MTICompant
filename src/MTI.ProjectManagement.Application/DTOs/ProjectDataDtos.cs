using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record CreateDataSheetRowDto(int RowIndex, string ValuesJson);
public record CreateDataSheetDto(string Name, string? Description, string HeadersJson, int Order, List<CreateDataSheetRowDto>? Rows);

public record CreateProjectDataDto(
    Guid ProjectId,
    Guid? SiteId,
    string Title,
    string Description,
    bool SubmitDirectly = false,
    List<CreateDataSheetDto>? Sheets = null,
    List<Guid>? AttachmentMediaIds = null
);

public record UpdateProjectDataDto(
    string Title,
    string Description,
    bool IsCorrection = false,
    List<CreateDataSheetDto>? Sheets = null,
    List<Guid>? AttachmentMediaIds = null
);

public record ApprovalDecisionDto(string Comment);

public record DataApprovalHistoryDto(
    Guid Id,
    ApprovalAction Action,
    string? Comment,
    Guid PerformedBy,
    string PerformerName,
    DateTime PerformedAt
);

public record DataSheetRowDto(Guid Id, int RowIndex, string ValuesJson);
public record DataSheetDto(Guid Id, string Name, string? Description, string HeadersJson, int Order, List<DataSheetRowDto> Rows);
public record DataAttachmentDto(Guid Id, Guid MediaFileId, string OriginalFileName, string ContentType, long FileSize, string DownloadUrl, string? Caption);

public record ProjectDataVersionDto(
    Guid Id,
    int VersionNumber,
    string Title,
    string Description,
    string DataSnapshotJson,
    Guid CreatedBy,
    DateTime CreatedAt
);

public record ProjectDataDetailDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid SiteId,
    string SiteName,
    Guid SubmittedBy,
    string SubmitterName,
    string Title,
    string Description,
    DataRecordStatus Status,
    int Version,
    DateTime? SubmittedAt,
    DateTime? ApprovedAt,
    Guid? ApprovedBy,
    DateTime? RejectedAt,
    Guid? RejectedBy,
    List<ProjectDataVersionDto> Versions,
    List<DataApprovalHistoryDto> Approvals,
    List<DataSheetDto> Sheets,
    List<DataAttachmentDto> Attachments
);

public record ProjectDataSummaryDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid SiteId,
    string SiteName,
    Guid SubmittedBy,
    string SubmitterName,
    string Title,
    DataRecordStatus Status,
    int Version,
    DateTime? SubmittedAt,
    DateTime CreatedAt
);

public record ProjectDataFilterParams(
    Guid? ProjectId = null,
    Guid? SiteId = null,
    Guid? EngineerId = null,
    DataRecordStatus? Status = null,
    DateTime? DateFrom = null,
    DateTime? DateTo = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 20
);
