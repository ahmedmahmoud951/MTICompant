using MTI.ProjectManagement.Application.Contracts;

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

// ==========================================
// 7. ORG-06: RACI Responsibility Matrix DTOs
// ==========================================

public record ResourceResponsibilityDto(
    Guid Id,
    string ResourceType,
    Guid ResourceId,
    string? ResourceName,
    Guid? UserId,
    string? UserName,
    string? UserEmail,
    Guid? TeamId,
    string? TeamName,
    string ResponsibilityType,
    Guid? AssignedBy,
    string? AssignedByName,
    DateTime CreatedAt,
    bool IsActive,
    string? Notes
);

public record AssignResponsibilityRequest(
    string ResourceType, // "Project", "Site", "Task", "Document"
    Guid ResourceId,
    Guid? UserId,
    Guid? TeamId,
    string ResponsibilityType, // "Responsible", "Accountable", "Consulted", "Informed"
    string? Notes = null
);

public record RaciMatrixDto(
    Guid ResourceId,
    string ResourceType,
    string? ResourceName,
    List<ResourceResponsibilityDto> Responsible,
    List<ResourceResponsibilityDto> Accountable,
    List<ResourceResponsibilityDto> Consulted,
    List<ResourceResponsibilityDto> Informed
);

// ==========================================
// 8. ADMIN-02: Master Data Center DTOs
// ==========================================

public record MasterDataItemDto(
    Guid Id,
    string Category,
    string Code,
    string NameAr,
    string NameEn,
    string? Description,
    int DisplayOrder,
    bool IsSystem,
    bool IsActive,
    string? MetadataJson,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateMasterDataItemRequest(
    string Category,
    string Code,
    string NameAr,
    string NameEn,
    string? Description = null,
    int DisplayOrder = 0,
    string? MetadataJson = null
);

public record UpdateMasterDataItemRequest(
    string NameAr,
    string NameEn,
    string? Description = null,
    int DisplayOrder = 0,
    bool IsActive = true,
    string? MetadataJson = null
);

public record MasterDataCategoryDto(
    string Category,
    string DisplayName,
    int TotalItems,
    int ActiveItems
);

// ==========================================
// 9. ADMIN-04: User Administration DTOs
// ==========================================

public record AdminUserDetailDto(
    Guid Id,
    string? EmployeeCode,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? PhoneNumber,
    string? JobTitle,
    bool IsActive,
    DateTime? HireDate,
    Guid? DepartmentId,
    string? DepartmentName,
    string? ProfilePictureUrl,
    List<string> Roles,
    List<string> Permissions,
    DateTime CreatedAt,
    DateTime? LastLoginAt,
    int TeamsCount,
    int ProjectsCount,
    int SitesCount
);

public record CreateUserAdminRequest(
    string? EmployeeCode,
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string? PhoneNumber = null,
    string? JobTitle = null,
    Guid? DepartmentId = null,
    List<string>? Roles = null,
    DateTime? HireDate = null
);

public record UpdateUserAdminRequest(
    string? EmployeeCode,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? JobTitle,
    Guid? DepartmentId,
    bool IsActive,
    DateTime? HireDate
);

public record AssignUserDepartmentRequest(
    Guid DepartmentId,
    string DepartmentRole = "Member",
    bool IsPrimary = false
);

public record AssignUserTeamRequest(
    Guid TeamId,
    string TeamRole = "Member",
    bool IsPrimaryTeam = false
);

public record ResetUserPasswordRequest(
    string NewPassword
);

public record AssignUserRolesRequest(
    List<string> Roles
);

public record BatchAssignUsersRequest(
    List<Guid> UserIds,
    string Role = "SiteEngineer",
    bool IsPrimary = false
);

public record BatchAssignTeamsRequest(
    List<Guid> TeamIds,
    string TeamRole = "ExecutionTeam"
);

// ==========================================
// 10. ORG-08: Workload Management DTOs
// ==========================================

public record UserWorkloadDto(
    Guid UserId,
    string UserName,
    string UserEmail,
    string? JobTitle,
    string? DepartmentName,
    int ActiveProjectsCount,
    int ActiveSitesCount,
    int OpenTasksCount,
    int OverdueTasksCount,
    int UpcomingDeadlinesCount,
    decimal AssignedHours,
    int CompletedTasksCount
);

public record TeamWorkloadDto(
    Guid TeamId,
    string TeamName,
    string TeamCode,
    string? ManagerName,
    int MembersCount,
    int ActiveProjectsCount,
    int ActiveSitesCount,
    int OpenTasksCount,
    int OverdueTasksCount,
    int CompletedTasksCount,
    List<UserWorkloadDto> MembersWorkload
);

public record ProjectWorkloadDto(
    Guid ProjectId,
    string ProjectName,
    string ProjectCode,
    int TotalMembersCount,
    int TotalTeamsCount,
    int TotalTasksCount,
    int OpenTasksCount,
    int OverdueTasksCount,
    int CompletedTasksCount
);

// ==========================================
// 11. ORG-09: Delegations DTOs
// ==========================================

public record DelegationDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string UserEmail,
    Guid DelegateUserId,
    string DelegateUserName,
    string DelegateUserEmail,
    string ScopeType,
    Guid? ScopeId,
    string? ScopeName,
    string? Role,
    string? Permissions,
    DateTime StartAt,
    DateTime EndAt,
    Guid? CreatedBy,
    string? CreatedByName,
    DateTime CreatedAt,
    bool IsActive,
    bool IsCurrentlyActive,
    string? Reason
);

public record CreateDelegationRequest(
    Guid DelegateUserId,
    string ScopeType, // "Project", "Site", "Department", "Global"
    Guid? ScopeId,
    string? Role,
    List<string>? Permissions,
    DateTime StartAt,
    DateTime EndAt,
    string? Reason
);

// ==========================================
// 12. SECURITY-03: Permissions Management DTOs
// ==========================================

public record PermissionDto(
    Guid Id,
    string Code,
    string Name,
    string Module,
    string Description,
    bool IsActive
);

public record ModulePermissionsDto(
    string Module,
    List<PermissionDto> Permissions
);

public record RolePermissionsDto(
    Guid RoleId,
    string RoleName,
    string RoleDescription,
    List<string> PermissionCodes
);

public record UpdateRolePermissionsRequest(
    List<string> PermissionCodes
);

public record EvaluateScopeResponseDto(
    Guid UserId,
    string PermissionCode,
    Guid ResourceId,
    bool HasAccess,
    UserScopeContext ResolvedScopeContext
);

// ==========================================
// 13. UI-ORG-03: Organization Dashboard DTOs
// ==========================================

public record SimpleUserSummaryDto(
    Guid Id,
    string FullName,
    string Email,
    string? EmployeeCode,
    string? JobTitle,
    string? DepartmentName
);

public record SimpleProjectSummaryDto(
    Guid Id,
    string Code,
    string Name,
    string Status,
    string? ClientName
);

public record SimpleSiteSummaryDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    string Code,
    string Name,
    string Status
);

public record OrgDashboardTeamCardDto(
    Guid TeamId,
    string Name,
    string Code,
    string DepartmentName,
    string? ManagerName,
    int MembersCount,
    int ProjectsCount,
    int SitesCount,
    int OpenTasksCount,
    int OverdueTasksCount
);

public record OrgDashboardWarningDto(
    string Category, // "Project", "Site", "User", "Task"
    string Severity, // "Warning", "Critical", "Info"
    string Title,
    string Description,
    Guid? EntityId,
    string? EntityName
);

public record OrganizationDashboardDto(
    int DepartmentsCount,
    int TeamsCount,
    int ManagersCount,
    int EmployeesCount,
    int ActiveProjectsCount,
    int ActiveSitesCount,
    int UnassignedUsersCount,
    int UnassignedProjectsCount,
    int UnassignedSitesCount,
    List<SimpleUserSummaryDto> UnassignedUsers,
    List<SimpleProjectSummaryDto> UnassignedProjects,
    List<SimpleSiteSummaryDto> UnassignedSites,
    List<OrgDashboardTeamCardDto> TeamCards,
    List<OrgDashboardWarningDto> Warnings
);

// ==========================================
// 14. ORG-12: Assignment History DTOs
// ==========================================

public record AssignmentHistoryDto(
    Guid Id,
    string AssignmentType,
    string Action,
    Guid ResourceId,
    string? ResourceName,
    Guid? TargetUserId,
    Guid? TargetTeamId,
    string TargetName,
    string? Role,
    DateTime AssignedAt,
    Guid? AssignedBy,
    string? AssignedByName,
    DateTime? RemovedAt,
    Guid? RemovedBy,
    string? RemovedByName,
    string? Reason,
    DateTime CreatedAt
);

public record AssignmentHistoryFilterRequest(
    Guid? ResourceId = null,
    string? AssignmentType = null,
    Guid? TargetUserId = null,
    Guid? TargetTeamId = null,
    string? Action = null,
    int PageNumber = 1,
    int PageSize = 50
)
{
    public AssignmentHistoryFilterRequest() : this(null, null, null, null, null, 1, 50) { }
}

