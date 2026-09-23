namespace MTI.ProjectManagement.Application.DTOs;

public record AuditLogDto(
    Guid Id,
    Guid? UserId,
    string? UserEmail,
    string Action,
    string EntityType,
    string? EntityId,
    string? OldValues,
    string? NewValues,
    string? IpAddress,
    string? UserAgent,
    DateTime CreatedAt,
    Guid? ProjectId = null,
    Guid? SiteId = null
);

public record AuditLogFilterParams(
    Guid? UserId = null,
    string? Action = null,
    string? EntityType = null,
    string? EntityId = null,
    Guid? ProjectId = null,  // AUDIT-01
    Guid? SiteId = null,     // AUDIT-01
    DateTime? DateFrom = null,
    DateTime? DateTo = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50
);
