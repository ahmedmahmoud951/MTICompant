namespace MTI.ProjectManagement.Application.DTOs;

// ==========================================
// 1. Departments DTOs
// ==========================================

public record DepartmentDto(
    Guid Id,
    string Code,
    string Name,
    string NameAr,
    string NameEn,
    string? Description,
    Guid? ManagerUserId,
    string? ManagerUserName,
    Guid? ParentDepartmentId,
    string? ParentDepartmentName,
    bool IsActive,
    int TeamsCount,
    int MembersCount,
    DateTime CreatedAt
);

public record DepartmentTreeDto(
    Guid Id,
    string Code,
    string Name,
    string? Description,
    Guid? ManagerUserId,
    string? ManagerUserName,
    bool IsActive,
    int TeamsCount,
    int MembersCount,
    List<DepartmentTreeDto> SubDepartments
);

public record CreateDepartmentRequest(
    string Code,
    string Name,
    string? NameAr,
    string? NameEn,
    string? Description,
    Guid? ManagerUserId,
    Guid? ParentDepartmentId
);

public record UpdateDepartmentRequest(
    string Name,
    string? NameAr,
    string? NameEn,
    string? Description,
    Guid? ManagerUserId,
    Guid? ParentDepartmentId,
    bool IsActive
);

public record DepartmentMemberDto(
    Guid Id,
    Guid DepartmentId,
    string DepartmentName,
    Guid UserId,
    string UserName,
    string UserEmail,
    string DepartmentRole,
    bool IsPrimary,
    DateTime JoinedAt,
    DateTime? LeftAt,
    bool IsActive
);

public record AddDepartmentMemberRequest(
    Guid UserId,
    string DepartmentRole = "Member",
    bool IsPrimary = false
);

public record UpdateDepartmentMemberRequest(
    string DepartmentRole,
    bool IsPrimary,
    bool IsActive
);

// ==========================================
// 2. Teams DTOs
// ==========================================

public record TeamDto(
    Guid Id,
    Guid DepartmentId,
    string DepartmentName,
    string Code,
    string Name,
    string? Description,
    Guid? ManagerUserId,
    string? ManagerUserName,
    Guid? AssistantManagerUserId,
    string? AssistantManagerUserName,
    Guid? SupervisorUserId,
    string? SupervisorUserName,
    bool IsActive,
    int MembersCount,
    DateTime CreatedAt
);

public record CreateTeamRequest(
    Guid DepartmentId,
    string Code,
    string Name,
    string? Description,
    Guid? ManagerUserId,
    Guid? AssistantManagerUserId,
    Guid? SupervisorUserId
);

public record UpdateTeamRequest(
    string Name,
    string? Description,
    Guid? ManagerUserId,
    Guid? AssistantManagerUserId,
    Guid? SupervisorUserId,
    bool IsActive
);

public record TeamMemberDto(
    Guid Id,
    Guid TeamId,
    string TeamName,
    Guid UserId,
    string UserName,
    string UserEmail,
    string TeamRole,
    bool IsPrimaryTeam,
    DateTime JoinedAt,
    DateTime? LeftAt,
    bool IsActive
);

public record AddTeamMemberRequest(
    Guid UserId,
    string TeamRole = "Member",
    bool IsPrimaryTeam = false
);

public record UpdateTeamMemberRequest(
    string TeamRole,
    bool IsPrimaryTeam,
    bool IsActive
);

// ==========================================
// 3. Project Membership DTOs
// ==========================================

public record ProjectMemberDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid UserId,
    string UserName,
    string UserEmail,
    string ProjectRole,
    bool IsPrimary,
    DateTime AssignedAt,
    Guid? AssignedBy,
    string? AssignedByName,
    DateTime? RemovedAt,
    bool IsActive
);

public record AddProjectMemberRequest(
    Guid UserId,
    string ProjectRole = "Viewer",
    bool IsPrimary = false
);

public record UpdateProjectMemberRequest(
    string ProjectRole,
    bool IsPrimary,
    bool IsActive
);

// ==========================================
// 4. Project Team Assignment DTOs
// ==========================================

public record ProjectTeamDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid TeamId,
    string TeamName,
    string TeamCode,
    string? TeamManagerName,
    string TeamRole,
    int TeamMembersCount,
    DateTime AssignedAt,
    Guid? AssignedBy,
    string? AssignedByName,
    DateTime? RemovedAt,
    bool IsActive
);

public record AssignProjectTeamRequest(
    Guid TeamId,
    string TeamRole = "PrimaryTeam"
);

// ==========================================
// 5. Site Membership & Site Team DTOs
// ==========================================

public record SiteMemberDto(
    Guid Id,
    Guid SiteId,
    string SiteName,
    Guid ProjectId,
    string ProjectName,
    Guid UserId,
    string UserName,
    string UserEmail,
    string SiteRole,
    bool IsPrimary,
    DateTime AssignedAt,
    Guid? AssignedBy,
    string? AssignedByName,
    DateTime? RemovedAt,
    bool IsActive
);

public record AddSiteMemberRequest(
    Guid UserId,
    string SiteRole = "SiteEngineer",
    bool IsPrimary = false
);

public record UpdateSiteMemberRequest(
    string SiteRole,
    bool IsPrimary,
    bool IsActive
);

public record SiteTeamDto(
    Guid Id,
    Guid SiteId,
    string SiteName,
    Guid TeamId,
    string TeamName,
    string TeamCode,
    string? TeamManagerName,
    string TeamRole,
    int TeamMembersCount,
    DateTime AssignedAt,
    Guid? AssignedBy,
    string? AssignedByName,
    DateTime? RemovedAt,
    bool IsActive
);

public record AssignSiteTeamRequest(
    Guid TeamId,
    string TeamRole = "ExecutionTeam"
);

// ==========================================
// 6. Organization Roles Reference DTO
// ==========================================

public record OrganizationRolesDto(
    List<string> DepartmentRoles,
    List<string> TeamRoles,
    List<string> ProjectRoles,
    List<string> SiteRoles
);
