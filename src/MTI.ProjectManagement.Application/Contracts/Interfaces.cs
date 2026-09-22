using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.Contracts;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<Role> Roles { get; }
    DbSet<Permission> Permissions { get; }
    DbSet<UserRole> UserRoles { get; }
    DbSet<RolePermission> RolePermissions { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<SystemSetting> SystemSettings { get; }
    DbSet<AuditLog> AuditLogs { get; }

    DbSet<Project> Projects { get; }
    DbSet<Site> Sites { get; }
    DbSet<SiteAssignment> SiteAssignments { get; }
    DbSet<ProjectMember> ProjectMembers { get; }
    DbSet<EngineerProfile> EngineerProfiles { get; }

    DbSet<ProjectDataRecord> ProjectDataRecords { get; }
    DbSet<ProjectDataVersion> ProjectDataVersions { get; }
    DbSet<DataApproval> DataApprovals { get; }
    DbSet<DataSheet> DataSheets { get; }
    DbSet<DataSheetRow> DataSheetRows { get; }
    DbSet<DataAttachment> DataAttachments { get; }
    DbSet<DataComment> DataComments { get; }

    DbSet<TaskItem> Tasks { get; }
    DbSet<TaskAssignment> TaskAssignments { get; }
    DbSet<TaskComment> TaskComments { get; }
    DbSet<TaskAttachment> TaskAttachments { get; }
    DbSet<TaskStatusHistory> TaskStatusHistories { get; }

    DbSet<Conversation> Conversations { get; }
    DbSet<ConversationMember> ConversationMembers { get; }
    DbSet<Message> Messages { get; }
    DbSet<MessageAttachment> MessageAttachments { get; }
    DbSet<MessageReaction> MessageReactions { get; }
    DbSet<MessageReadState> MessageReadStates { get; }

    DbSet<Notification> Notifications { get; }
    DbSet<NotificationPreference> NotificationPreferences { get; }
    DbSet<MediaFile> MediaFiles { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
    bool IsSystemAdmin { get; }
    bool IsEngineer { get; }
    IReadOnlyList<string> Roles { get; }
    IReadOnlyList<string> Permissions { get; }
}

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) GenerateAccessToken(User user, IEnumerable<string> roles, IEnumerable<string> permissions);
    string GenerateRefreshToken();
}

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public interface IAuditService
{
    Task LogAsync(string action, string entityType, string? entityId, object? oldValues = null, object? newValues = null, CancellationToken cancellationToken = default);
}

public interface IResourceAuthorizationService
{
    Task<bool> CanAccessSiteAsync(Guid userId, Guid siteId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default);
    Task<List<Guid>> GetAuthorizedSiteIdsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<List<Guid>> GetAuthorizedProjectIdsAsync(Guid userId, CancellationToken cancellationToken = default);
}

public interface IB2StorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, string bucketName, CancellationToken cancellationToken = default);
    Task<Stream?> DownloadFileAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default);
    Task<bool> DeleteFileAsync(string bucketName, string objectKey, CancellationToken cancellationToken = default);
    string GetPreSignedUrl(string bucketName, string objectKey, TimeSpan expiry);
}

public interface IMediaStorageService
{
    string BuildObjectKey(string entityType, Guid? projectId, Guid? siteId, Guid? entityId, Guid mediaId, string fileName);
    Task<string> GeneratePreSignedUploadUrlAsync(string objectKey, string contentType, TimeSpan expiry, CancellationToken cancellationToken = default);
    Task<string> GeneratePreSignedDownloadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken cancellationToken = default);
    Task<bool> DoesObjectExistAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<Stream?> DownloadFileAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<bool> DeleteFileAsync(string objectKey, CancellationToken cancellationToken = default);
}

public interface INotificationService
{
    Task<Notification> SendNotificationAsync(Guid userId, NotificationType type, string title, string body, string? entityType = null, string? entityId = null, CancellationToken cancellationToken = default);
    Task BroadcastToUserAsync(Guid userId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task BroadcastToProjectAsync(Guid projectId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task BroadcastToSiteAsync(Guid siteId, string eventName, object payload, CancellationToken cancellationToken = default);
}
