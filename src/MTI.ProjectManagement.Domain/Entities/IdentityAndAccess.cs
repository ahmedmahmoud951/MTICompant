using MTI.ProjectManagement.Domain.Common;

namespace MTI.ProjectManagement.Domain.Entities;

public class User : FullAuditedEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? JobTitle { get; set; }
    public string? EmployeeCode { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LockoutEnd { get; set; }
    public int AccessFailedCount { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public string FullName => $"{FirstName} {LastName}".Trim();

    // Navigation properties
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<SiteAssignment> SiteAssignments { get; set; } = new List<SiteAssignment>();
    public EngineerProfile? EngineerProfile { get; set; }
    public ICollection<ProjectMember> ProjectMembers { get; set; } = new List<ProjectMember>();
    public UserProfile? UserProfile { get; set; }
    public UserPreference? UserPreference { get; set; }
    public ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();
    public ICollection<Delegation> GivenDelegations { get; set; } = new List<Delegation>();
    public ICollection<Delegation> ReceivedDelegations { get; set; } = new List<Delegation>();
}

public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSystemRole { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class Permission : BaseEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "Projects.View"
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty; // e.g. "Projects"
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}

public class UserRole
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedByIp { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokedByIp { get; set; }
    public string? ReplacedByToken { get; set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsRevoked => RevokedAt != null;
    public bool IsActive => !IsRevoked && !IsExpired;
}

public class SystemSetting : AuditableEntity
{
    public string Category { get; set; } = "General"; // "SignalR", "Storage", "Security", "General"
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string DataType { get; set; } = "string"; // "string", "int", "boolean", "json"
    public string Description { get; set; } = string.Empty;
    public bool IsEncrypted { get; set; } = false;
}

public class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    public string Action { get; set; } = string.Empty; // "Login", "Create", "Update", "Delete", etc.
    public string EntityType { get; set; } = string.Empty; // "Project", "Site", "User", etc.
    public string? EntityId { get; set; }
    public Guid? ProjectId { get; set; }  // AUDIT-01: project scope
    public Guid? SiteId { get; set; }     // AUDIT-01: site scope
    public string? OldValues { get; set; } // JSON
    public string? NewValues { get; set; } // JSON
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class UserProfile : FullAuditedEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string? EmployeeCode { get; set; }
    public DateTime? HireDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public string? Bio { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? PhoneNumber2 { get; set; }
    public string? Address { get; set; }
    public string? NationalId { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? SkillsJson { get; set; } = "[]";
    public string? EmergencyContact { get; set; }
}

public class MasterDataItem : BaseEntity
{
    public string Category { get; set; } = string.Empty; // e.g. "TeamRole", "ProjectRole", "ProjectType"
    public string Code { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DisplayOrder { get; set; } = 0;
    public bool IsSystem { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public string? MetadataJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public User? CreatedByUser { get; set; }
}

public class Delegation : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid DelegateUserId { get; set; }
    public User DelegateUser { get; set; } = null!;

    public string ScopeType { get; set; } = "Project"; // "Project", "Site", "Department", "Global"
    public Guid? ScopeId { get; set; }
    public string? Role { get; set; }
    public string? Permissions { get; set; } // JSON array of permissions e.g. ["Projects.Manage", "Sites.Approve"]
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public DateTime? RevokedAt { get; set; }
    public string? Reason { get; set; }

    public bool IsCurrentlyActive => IsActive && RevokedAt == null && DateTime.UtcNow >= StartAt && DateTime.UtcNow <= EndAt;
}

public class UserSession : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string SessionToken { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public bool IsRevoked { get; set; } = false;

    public bool IsActive => !IsRevoked && DateTime.UtcNow < ExpiresAt;
}

public class UserPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Language { get; set; } = "ar"; // "ar", "en"
    public string TimeZone { get; set; } = "Africa/Cairo";
    public string Theme { get; set; } = "light"; // "light", "dark"
    public bool NotificationsEnabled { get; set; } = true;
    public bool EmailNotifications { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AssignmentHistory : BaseEntity
{
    public string AssignmentType { get; set; } = string.Empty; // UserProject, TeamProject, UserSite, TeamSite, UserTeam, UserDepartment
    public string Action { get; set; } = string.Empty;         // Assigned, Removed, RoleChanged
    public Guid ResourceId { get; set; }
    public string? ResourceName { get; set; }
    public Guid? TargetUserId { get; set; }
    public Guid? TargetTeamId { get; set; }
    public string TargetName { get; set; } = string.Empty;
    public string? Role { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public Guid? AssignedBy { get; set; }
    public string? AssignedByName { get; set; }
    public DateTime? RemovedAt { get; set; }
    public Guid? RemovedBy { get; set; }
    public string? RemovedByName { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

