using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record ProjectMilestoneDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Name,
    string? Description,
    DateTime? StartDate,
    DateTime? DueDate,
    DateTime? CompletedAt,
    MilestoneStatus Status,
    decimal Weight,
    int SortOrder,
    List<Guid> DependsOnMilestoneIds,
    List<string> DependsOnMilestoneNames
);

public record CreateMilestoneRequest(
    Guid ProjectId,
    string Name,
    string? Description,
    DateTime? StartDate,
    DateTime? DueDate,
    decimal Weight = 1.0m,
    int SortOrder = 0
);

public record UpdateMilestoneRequest(
    string Name,
    string? Description,
    DateTime? StartDate,
    DateTime? DueDate,
    DateTime? CompletedAt,
    MilestoneStatus Status,
    decimal Weight,
    int SortOrder
);

public record AddMilestoneDependencyRequest(
    Guid DependsOnMilestoneId
);

public record ProjectAssignmentDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid UserId,
    string UserName,
    string UserEmail,
    Guid? TeamId,
    string? TeamName,
    string Role,
    DateTime AssignedAt,
    bool IsActive
);

public record CreateProjectAssignmentRequest(
    Guid ProjectId,
    Guid UserId,
    Guid? TeamId,
    string Role
);
