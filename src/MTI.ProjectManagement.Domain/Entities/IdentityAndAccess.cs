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

    public string? Bio { get; set; }
    public string? ProfilePictureUrl { get; set; }
    public string? PhoneNumber2 { get; set; }
    public string? Address { get; set; }
    public string? NationalId { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? SkillsJson { get; set; } = "[]";
    public string? EmergencyContact { get; set; }
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

