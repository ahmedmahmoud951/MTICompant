using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record ProjectDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string ClientName,
    ProjectStatus Status,
    ProjectType Type,
    decimal ProgressPercentage,
    DateTime? StartDate,
    DateTime? EndDate,
    int TotalSitesCount,
    DateTime CreatedAt,
    string? CoverImageUrl = null
);

public record ProjectDetailDto(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string ClientName,
    ProjectStatus Status,
    ProjectType Type,
    decimal ProgressPercentage,
    DateTime? StartDate,
    DateTime? EndDate,
    DateTime CreatedAt,
    List<SiteSummaryDto> Sites,
    string? CoverImageUrl = null
);

public record CreateProjectRequest(
    string Code,
    string Name,
    string Description,
    string ClientName,
    DateTime? StartDate,
    DateTime? EndDate,
    ProjectStatus Status = ProjectStatus.Planning,
    ProjectType Type = ProjectType.GeneralEngineering,
    decimal ProgressPercentage = 0,
    List<Guid>? MemberUserIds = null,
    string? CoverImageUrl = null
);

public record UpdateProjectRequest(
    string Name,
    string Description,
    string ClientName,
    ProjectStatus? Status = null,
    ProjectType? Type = null,
    decimal? ProgressPercentage = null,
    DateTime? StartDate = null,
    DateTime? EndDate = null,
    List<Guid>? MemberUserIds = null,
    string? CoverImageUrl = null
);


public record SiteDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Code,
    string Name,
    string Description,
    string Address,
    decimal? Latitude,
    decimal? Longitude,
    SiteStatus Status,
    DateTime CreatedAt,
    List<SiteAssignmentDto> Assignments
);

public record SiteSummaryDto(
    Guid Id,
    string Code,
    string Name,
    string Address,
    SiteStatus Status,
    int ActiveEngineersCount
);

public record CreateSiteRequest(
    string Code,
    string Name,
    string Description,
    string Address,
    decimal? Latitude,
    decimal? Longitude,
    SiteStatus Status = SiteStatus.Pending
);

public record UpdateSiteRequest(
    string Name,
    string Description,
    string Address,
    decimal? Latitude,
    decimal? Longitude,
    SiteStatus Status
);

public record AssignEngineerRequest(
    Guid UserId,
    string Role = "Engineer",
    bool IsPrimary = false
);

public record SiteAssignmentDto(
    Guid Id,
    Guid SiteId,
    Guid UserId,
    string EngineerName,
    string EngineerEmail,
    string Role,
    bool IsPrimary,
    DateTime AssignedAt
);

public record SignalRConfigDto(
    bool HubEnabled,
    string HubPath,
    string HubUrl,
    bool ReconnectEnabled,
    string[] AllowedOrigins
);
