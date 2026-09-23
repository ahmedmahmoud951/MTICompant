namespace MTI.ProjectManagement.Application.DTOs;

public record DepartmentDto(
    Guid Id,
    string Code,
    string NameAr,
    string NameEn,
    string? Description,
    bool IsActive,
    int TeamsCount
);

public record CreateDepartmentRequest(
    string Code,
    string NameAr,
    string NameEn,
    string? Description
);

public record TeamDto(
    Guid Id,
    Guid DepartmentId,
    string DepartmentNameAr,
    string DepartmentNameEn,
    string Code,
    string Name,
    string? Description,
    Guid? LeaderUserId,
    string? LeaderName,
    bool IsActive,
    int MembersCount
);

public record CreateTeamRequest(
    Guid DepartmentId,
    string Code,
    string Name,
    string? Description,
    Guid? LeaderUserId
);

public record TeamMemberDto(
    Guid Id,
    Guid TeamId,
    Guid UserId,
    string UserName,
    string UserEmail,
    string RoleInTeam,
    DateTime JoinedAt,
    bool IsActive
);

public record AddTeamMemberRequest(
    Guid UserId,
    string RoleInTeam
);

