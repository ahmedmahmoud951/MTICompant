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
    DateTime CreatedAt
);

public record AuditLogFilterParams(
    Guid? UserId = null,
    string? Action = null,
    string? EntityType = null,
    string? EntityId = null,
    DateTime? DateFrom = null,
    DateTime? DateTo = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 50
);
