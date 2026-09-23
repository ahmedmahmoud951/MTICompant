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
    DbSet<SiteMember> SiteMembers { get; }
    DbSet<SiteTeam> SiteTeams { get; }
    DbSet<ProjectMember> ProjectMembers { get; }
    DbSet<ProjectTeam> ProjectTeams { get; }
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

    // Technical Office & Commercial
    DbSet<BoqItem> BoqItems { get; }
    DbSet<TechnicalOffer> TechnicalOffers { get; }
    DbSet<CommercialOffer> CommercialOffers { get; }
    DbSet<ProjectInvoice> ProjectInvoices { get; }

    // Materials & Assets
    DbSet<Material> Materials { get; }
    DbSet<SiteMaterialRequest> SiteMaterialRequests { get; }
    DbSet<SiteMaterialRequestItem> SiteMaterialRequestItems { get; }
    DbSet<CompanyAsset> CompanyAssets { get; }

    // Governance & Warranty
    DbSet<ProjectRisk> ProjectRisks { get; }
    DbSet<ProjectIssue> ProjectIssues { get; }
    DbSet<ProjectHandover> ProjectHandovers { get; }

    // Identity Extensions
    DbSet<UserProfile> UserProfiles { get; }
    DbSet<UserSession> UserSessions { get; }
    DbSet<UserPreference> UserPreferences { get; }

    // Organization & Teams
    DbSet<Department> Departments { get; }
    DbSet<DepartmentMember> DepartmentMembers { get; }
    DbSet<Team> Teams { get; }
    DbSet<TeamMember> TeamMembers { get; }

    // Milestones & Assignments
    DbSet<ProjectMilestone> ProjectMilestones { get; }
    DbSet<ProjectMilestoneDependency> ProjectMilestoneDependencies { get; }
    DbSet<ProjectAssignment> ProjectAssignments { get; }
    DbSet<TaskEvent> TaskEvents { get; }

    // Site Operations & Daily Reports (OPERATIONS-01 & SITE-REPORT-01)
    DbSet<SiteOperation> SiteOperations { get; }
    DbSet<OperationWorkLog> OperationWorkLogs { get; }
    DbSet<OperationPhoto> OperationPhotos { get; }
    DbSet<DailySiteReport> DailySiteReports { get; }
    DbSet<DailyReportAttachment> DailyReportAttachments { get; }
    DbSet<MessageReceipt> MessageReceipts { get; }
    DbSet<WarrantyAlertLog> WarrantyAlertLogs { get; }

    // Enterprise Documents
    DbSet<Document> Documents { get; }
    DbSet<DocumentType> DocumentTypes { get; }
    DbSet<DocumentVersion> DocumentVersions { get; }
    DbSet<DocumentApproval> DocumentApprovals { get; }
    DbSet<DocumentCorrection> DocumentCorrections { get; }

    // DB-I18N: Language infrastructure
    DbSet<SupportedLanguage> SupportedLanguages { get; }
    DbSet<UserLanguagePreference> UserLanguagePreferences { get; }
    DbSet<TranslationEntry> TranslationEntries { get; }

    // REALTIME-02: Transactional Outbox
    DbSet<OutboxMessage> OutboxMessages { get; }

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
    Task LogAsync(
        string action,
        string entityType,
        string? entityId,
        object? oldValues = null,
        object? newValues = null,
        Guid? projectId = null,
        Guid? siteId = null,
        CancellationToken cancellationToken = default);
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
    string BuildDocumentObjectKey(Guid projectId, Guid documentId, Guid versionId, string fileName);
    string BuildAssetObjectKey(Guid projectId, Guid assetId, string fileName);
    string BuildChatObjectKey(Guid conversationId, Guid messageId, Guid attachmentId, string fileName);
    Task<string> GeneratePreSignedUploadUrlAsync(string objectKey, string contentType, TimeSpan expiry, CancellationToken cancellationToken = default);
    Task<string> GeneratePreSignedDownloadUrlAsync(string objectKey, TimeSpan expiry, CancellationToken cancellationToken = default);
    Task<bool> DoesObjectExistAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<Stream?> DownloadFileAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<bool> DeleteFileAsync(string objectKey, CancellationToken cancellationToken = default);
    Task<(string ObjectKey, string Checksum, long FileSize)> UploadStreamAsync(Stream stream, string objectKey, string contentType, CancellationToken cancellationToken = default);
}


public interface INotificationService
{
    Task<Notification> SendNotificationAsync(Guid userId, NotificationType type, string title, string body, string? entityType = null, string? entityId = null, CancellationToken cancellationToken = default);
    Task<Notification?> CreateNotificationAsync(
        Guid recipientUserId,
        NotificationType type,
        string title,
        string body,
        string? eventKey = null,
        string? entityType = null,
        string? entityId = null,
        string? titleKey = null,
        string? bodyKey = null,
        string? dataJson = null,
        CancellationToken cancellationToken = default);

    // NOTIFY-02: Typed notification helpers with deterministic EventKey
    Task NotifyTaskAssignedAsync(Guid taskId, string taskTitle, Guid assigneeUserId, CancellationToken ct = default);
    Task NotifyTaskDueSoonAsync(Guid taskId, string taskTitle, Guid userId, string dueDate, CancellationToken ct = default);
    Task NotifyTaskOverdueAsync(Guid taskId, string taskTitle, Guid userId, CancellationToken ct = default);
    Task NotifyTaskCompletedAsync(Guid taskId, string taskTitle, IEnumerable<Guid> notifyUserIds, Guid completedBy, CancellationToken ct = default);
    Task NotifyDocumentUploadedAsync(Guid documentId, string documentTitle, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default);
    Task NotifyDocumentApprovedAsync(Guid documentId, string documentTitle, Guid uploaderUserId, CancellationToken ct = default);
    Task NotifyDocumentRejectedAsync(Guid documentId, string documentTitle, Guid uploaderUserId, CancellationToken ct = default);
    Task NotifyCorrectionRequestedAsync(Guid documentId, string documentTitle, Guid targetUserId, CancellationToken ct = default);
    Task NotifyProjectAssignedAsync(Guid projectId, string projectName, Guid assigneeUserId, CancellationToken ct = default);
    Task NotifyProjectUpdatedAsync(Guid projectId, string projectName, IEnumerable<Guid> memberUserIds, CancellationToken ct = default);
    Task NotifyMilestoneCompletedAsync(Guid milestoneId, string milestoneName, Guid projectId, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default);
    Task NotifyIssueCreatedAsync(Guid issueId, string issueTitle, Guid projectId, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default);
    Task NotifyIssueAssignedAsync(Guid issueId, string issueTitle, Guid assigneeUserId, CancellationToken ct = default);
    Task NotifyIssueOverdueAsync(Guid issueId, string issueTitle, Guid assigneeUserId, CancellationToken ct = default);
    Task NotifyMaintenanceCreatedAsync(Guid assetId, string assetName, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default);
    Task NotifyMaintenanceAssignedAsync(Guid assetId, string assetName, Guid assigneeUserId, CancellationToken ct = default);
    Task NotifyWarrantyExpiringAsync(Guid assetId, string assetName, int daysRemaining, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default);
    Task NotifyChatMessageAsync(Guid conversationId, Guid messageId, Guid senderUserId, string senderName, Guid recipientUserId, CancellationToken ct = default);
    Task NotifyMentionAsync(Guid entityId, string entityType, Guid mentionedUserId, Guid mentionedBy, CancellationToken ct = default);
    Task NotifyApprovalRequestedAsync(Guid entityId, string entityType, string entityTitle, Guid approverUserId, CancellationToken ct = default);

    Task BroadcastToUserAsync(Guid userId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task BroadcastToProjectAsync(Guid projectId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task BroadcastToSiteAsync(Guid siteId, string eventName, object payload, CancellationToken cancellationToken = default);
    Task BroadcastToAdminsAsync(string eventName, object payload, CancellationToken cancellationToken = default);
    Task BroadcastGlobalAsync(string eventName, object payload, CancellationToken cancellationToken = default);
}

/// <summary>SECURITY-02: Permission check service backed by RolePermissions table.</summary>
public interface IPermissionService
{
    Task<bool> HasPermissionAsync(Guid userId, string permissionCode, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<string>> GetUserPermissionsAsync(Guid userId, CancellationToken cancellationToken = default);
}
