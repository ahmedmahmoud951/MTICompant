using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    private readonly ICurrentUserService? _currentUserService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService? currentUserService = null)
        : base(options)
    {
        _currentUserService = currentUserService;
    }

    // Core
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    // Project Management
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Site> Sites => Set<Site>();
    public DbSet<SiteAssignment> SiteAssignments => Set<SiteAssignment>();
    public DbSet<SiteMember> SiteMembers => Set<SiteMember>();
    public DbSet<SiteTeam> SiteTeams => Set<SiteTeam>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<ProjectTeam> ProjectTeams => Set<ProjectTeam>();
    public DbSet<EngineerProfile> EngineerProfiles => Set<EngineerProfile>();

    // Project Data
    public DbSet<ProjectDataRecord> ProjectDataRecords => Set<ProjectDataRecord>();
    public DbSet<ProjectDataVersion> ProjectDataVersions => Set<ProjectDataVersion>();
    public DbSet<DataApproval> DataApprovals => Set<DataApproval>();
    public DbSet<DataSheet> DataSheets => Set<DataSheet>();
    public DbSet<DataSheetRow> DataSheetRows => Set<DataSheetRow>();
    public DbSet<DataAttachment> DataAttachments => Set<DataAttachment>();
    public DbSet<DataComment> DataComments => Set<DataComment>();

    // Tasks
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TaskAssignment> TaskAssignments => Set<TaskAssignment>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<TaskAttachment> TaskAttachments => Set<TaskAttachment>();
    public DbSet<TaskStatusHistory> TaskStatusHistories => Set<TaskStatusHistory>();

    // Chat
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ConversationMember> ConversationMembers => Set<ConversationMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageReadState> MessageReadStates => Set<MessageReadState>();

    // Notifications & Media
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<MediaFile> MediaFiles => Set<MediaFile>();

    // Technical Office & Commercial
    public DbSet<BoqItem> BoqItems => Set<BoqItem>();
    public DbSet<TechnicalOffer> TechnicalOffers => Set<TechnicalOffer>();
    public DbSet<CommercialOffer> CommercialOffers => Set<CommercialOffer>();
    public DbSet<ProjectInvoice> ProjectInvoices => Set<ProjectInvoice>();

    // Materials & Assets
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<SiteMaterialRequest> SiteMaterialRequests => Set<SiteMaterialRequest>();
    public DbSet<SiteMaterialRequestItem> SiteMaterialRequestItems => Set<SiteMaterialRequestItem>();
    public DbSet<CompanyAsset> CompanyAssets => Set<CompanyAsset>();

    // Governance & Warranty
    public DbSet<ProjectRisk> ProjectRisks => Set<ProjectRisk>();
    public DbSet<ProjectIssue> ProjectIssues => Set<ProjectIssue>();
    public DbSet<ProjectHandover> ProjectHandovers => Set<ProjectHandover>();

    // Identity Extensions
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();

    // Organization & Teams & RACI
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<DepartmentMember> DepartmentMembers => Set<DepartmentMember>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<ResourceResponsibility> ResourceResponsibilities => Set<ResourceResponsibility>();
    public DbSet<MasterDataItem> MasterDataItems => Set<MasterDataItem>();
    public DbSet<Delegation> Delegations => Set<Delegation>();
    public DbSet<AssignmentHistory> AssignmentHistories => Set<AssignmentHistory>();

    // Milestones & Assignments
    public DbSet<ProjectMilestone> ProjectMilestones => Set<ProjectMilestone>();
    public DbSet<ProjectMilestoneDependency> ProjectMilestoneDependencies => Set<ProjectMilestoneDependency>();
    public DbSet<ProjectAssignment> ProjectAssignments => Set<ProjectAssignment>();
    public DbSet<TaskEvent> TaskEvents => Set<TaskEvent>();

    // Enterprise Documents & Drawings & DataSheets
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentType> DocumentTypes => Set<DocumentType>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<DocumentApproval> DocumentApprovals => Set<DocumentApproval>();
    public DbSet<DocumentCorrection> DocumentCorrections => Set<DocumentCorrection>();
    public DbSet<Drawing> Drawings => Set<Drawing>();
    public DbSet<DrawingMarkup> DrawingMarkups => Set<DrawingMarkup>();
    public DbSet<ProductDataSheet> ProductDataSheets => Set<ProductDataSheet>();

    // Site Operations & Daily Reports (OPERATIONS-01 & SITE-REPORT-01)
    public DbSet<SiteOperation> SiteOperations => Set<SiteOperation>();
    public DbSet<OperationWorkLog> OperationWorkLogs => Set<OperationWorkLog>();
    public DbSet<OperationPhoto> OperationPhotos => Set<OperationPhoto>();
    public DbSet<DailySiteReport> DailySiteReports => Set<DailySiteReport>();
    public DbSet<DailyReportAttachment> DailyReportAttachments => Set<DailyReportAttachment>();
    public DbSet<MessageReceipt> MessageReceipts => Set<MessageReceipt>();
    public DbSet<WarrantyAlertLog> WarrantyAlertLogs => Set<WarrantyAlertLog>();

    // DB-I18N: Language infrastructure
    public DbSet<SupportedLanguage> SupportedLanguages => Set<SupportedLanguage>();
    public DbSet<UserLanguagePreference> UserLanguagePreferences => Set<UserLanguagePreference>();
    public DbSet<TranslationEntry> TranslationEntries => Set<TranslationEntry>();

    // REALTIME-02: Transactional Outbox
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)

    {
        base.OnModelCreating(modelBuilder);

        // Core / Identity Mappings
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).HasMaxLength(256).IsRequired();
            entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.PhoneNumber).HasMaxLength(30);
            entity.Property(e => e.JobTitle).HasMaxLength(150);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<Permission>(entity =>
        {
            entity.ToTable("Permissions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Module).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("UserRoles");
            entity.HasKey(e => new { e.UserId, e.RoleId });
            entity.HasOne(e => e.User).WithMany(u => u.UserRoles).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Role).WithMany(r => r.UserRoles).HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RolePermission>(entity =>
        {
            entity.ToTable("RolePermissions");
            entity.HasKey(e => new { e.RoleId, e.PermissionId });
            entity.HasOne(e => e.Role).WithMany(r => r.RolePermissions).HasForeignKey(e => e.RoleId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Permission).WithMany(p => p.RolePermissions).HasForeignKey(e => e.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.Token).HasMaxLength(500).IsRequired();
            entity.HasOne(e => e.User).WithMany(u => u.RefreshTokens).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.ToTable("SystemSettings");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Category, e.Key }).IsUnique();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Key).HasMaxLength(150).IsRequired();
            entity.Property(e => e.DataType).HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLogs");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Action);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.Property(e => e.Action).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityId).HasMaxLength(100);
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.SetNull);
        });


        // Project & Site Mappings
        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("Projects");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.ClientName).HasMaxLength(200);
            entity.Property(e => e.ProgressPercentage).HasPrecision(5, 2);
            entity.Property(e => e.CoverImageUrl).HasColumnType("nvarchar(max)");
            entity.HasQueryFilter(e => !e.IsDeleted);
        });


        modelBuilder.Entity<Site>(entity =>
        {
            entity.ToTable("Sites");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => new { e.ProjectId, e.Code }).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.Latitude).HasPrecision(9, 6);
            entity.Property(e => e.Longitude).HasPrecision(9, 6);
            entity.HasOne(e => e.Project).WithMany(p => p.Sites).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<SiteAssignment>(entity =>
        {
            entity.ToTable("SiteAssignments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.HasOne(e => e.Site).WithMany(s => s.Assignments).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.SiteAssignments).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.ToTable("ProjectMembers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.ProjectRole).HasMaxLength(100);
            entity.Property(e => e.Role).HasMaxLength(100);
            entity.HasOne(e => e.Project).WithMany(p => p.Members).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.ProjectMembers).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectTeam>(entity =>
        {
            entity.ToTable("ProjectTeams");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.TeamId);
            entity.Property(e => e.TeamRole).HasMaxLength(100);
            entity.HasOne(e => e.Project).WithMany(p => p.Teams).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Team).WithMany(t => t.ProjectTeams).HasForeignKey(e => e.TeamId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SiteMember>(entity =>
        {
            entity.ToTable("SiteMembers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.SiteRole).HasMaxLength(100);
            entity.HasOne(e => e.Site).WithMany(s => s.Members).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SiteTeam>(entity =>
        {
            entity.ToTable("SiteTeams");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.TeamId);
            entity.Property(e => e.TeamRole).HasMaxLength(100);
            entity.HasOne(e => e.Site).WithMany(s => s.Teams).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Team).WithMany(t => t.SiteTeams).HasForeignKey(e => e.TeamId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EngineerProfile>(entity =>
        {
            entity.ToTable("EngineerProfiles");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.Specialization).HasMaxLength(100);
            entity.Property(e => e.LicenseNumber).HasMaxLength(100);
            entity.HasOne(e => e.User).WithOne(u => u.EngineerProfile).HasForeignKey<EngineerProfile>(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Project Data & Approvals
        modelBuilder.Entity<ProjectDataRecord>(entity =>
        {
            entity.ToTable("ProjectDataRecords");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.SubmittedBy);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.HasOne(e => e.Project).WithMany(p => p.DataRecords).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany(s => s.DataRecords).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Submitter).WithMany().HasForeignKey(e => e.SubmittedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<ProjectDataVersion>(entity =>
        {
            entity.ToTable("ProjectDataVersions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.DataRecordId, e.VersionNumber });
            entity.HasOne(e => e.DataRecord).WithMany(d => d.Versions).HasForeignKey(e => e.DataRecordId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DataApproval>(entity =>
        {
            entity.ToTable("DataApprovals");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DataRecordId);
            entity.HasOne(e => e.DataRecord).WithMany(d => d.Approvals).HasForeignKey(e => e.DataRecordId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Performer).WithMany().HasForeignKey(e => e.PerformedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DataSheet>(entity =>
        {
            entity.ToTable("DataSheets");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DataRecordId);
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
            entity.HasOne(e => e.DataRecord).WithMany(d => d.DataSheets).HasForeignKey(e => e.DataRecordId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<DataSheetRow>(entity =>
        {
            entity.ToTable("DataSheetRows");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DataSheetId);
            entity.HasOne(e => e.DataSheet).WithMany(s => s.Rows).HasForeignKey(e => e.DataSheetId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DataAttachment>(entity =>
        {
            entity.ToTable("DataAttachments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.DataRecord).WithMany(d => d.Attachments).HasForeignKey(e => e.DataRecordId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MediaFile).WithMany().HasForeignKey(e => e.MediaFileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DataComment>(entity =>
        {
            entity.ToTable("DataComments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.DataRecord).WithMany(d => d.Comments).HasForeignKey(e => e.DataRecordId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Tasks
        modelBuilder.Entity<TaskItem>(entity =>
        {
            entity.ToTable("Tasks");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.AssignedToUserId);
            entity.HasIndex(e => e.DueAt);
            entity.HasIndex(e => new { e.ProjectId, e.Status });
            entity.HasIndex(e => new { e.AssignedToUserId, e.Status });
            entity.HasIndex(e => new { e.DueAt, e.Status });
            entity.Property(e => e.Title).HasMaxLength(250).IsRequired();
            entity.Property(e => e.ProgressPercentage).HasPrecision(5, 2);
            entity.HasOne(e => e.Project).WithMany(p => p.Tasks).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany(s => s.Tasks).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.AssignedToUser).WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ParentTask).WithMany(t => t.SubTasks).HasForeignKey(e => e.ParentTaskId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });


        modelBuilder.Entity<TaskAssignment>(entity =>
        {
            entity.ToTable("TaskAssignments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.TaskItem).WithMany(t => t.Assignments).HasForeignKey(e => e.TaskItemId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskComment>(entity =>
        {
            entity.ToTable("TaskComments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.TaskItem).WithMany(t => t.Comments).HasForeignKey(e => e.TaskItemId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Author).WithMany().HasForeignKey(e => e.AuthorUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskAttachment>(entity =>
        {
            entity.ToTable("TaskAttachments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.TaskItem).WithMany(t => t.Attachments).HasForeignKey(e => e.TaskItemId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MediaFile).WithMany().HasForeignKey(e => e.MediaFileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskStatusHistory>(entity =>
        {
            entity.ToTable("TaskStatusHistories");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.TaskItem).WithMany(t => t.StatusHistory).HasForeignKey(e => e.TaskItemId).OnDelete(DeleteBehavior.Cascade);
        });

        // Chat
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("Conversations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(200);
            entity.Property(e => e.DirectConversationKey).HasMaxLength(150);
            entity.HasIndex(e => e.DirectConversationKey).IsUnique().HasFilter("[DirectConversationKey] IS NOT NULL AND [DirectConversationKey] <> ''");
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<ConversationMember>(entity =>
        {
            entity.ToTable("ConversationMembers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ConversationId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Conversation).WithMany(c => c.Members).HasForeignKey(e => e.ConversationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("Messages");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });
            entity.Property(e => e.ClientMessageId).HasMaxLength(100);
            entity.HasIndex(e => new { e.SenderUserId, e.ClientMessageId }).IsUnique().HasFilter("[ClientMessageId] IS NOT NULL AND [ClientMessageId] <> ''");
            entity.HasOne(e => e.Conversation).WithMany(c => c.Messages).HasForeignKey(e => e.ConversationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Sender).WithMany().HasForeignKey(e => e.SenderUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ReplyToMessage).WithMany().HasForeignKey(e => e.ReplyToMessageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<MessageAttachment>(entity =>
        {
            entity.ToTable("MessageAttachments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Type).HasMaxLength(50);
            entity.HasOne(e => e.Message).WithMany(m => m.Attachments).HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MediaFile).WithMany().HasForeignKey(e => e.MediaFileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.ToTable("MessageReactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reaction).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => new { e.MessageId, e.UserId, e.Reaction }).IsUnique();
            entity.HasOne(e => e.Message).WithMany(m => m.Reactions).HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MessageReadState>(entity =>
        {
            entity.ToTable("MessageReadStates");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MessageId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Message).WithMany(m => m.ReadStates).HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MessageReceipt>(entity =>
        {
            entity.ToTable("MessageReceipts");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MessageId, e.UserId }).IsUnique();
            entity.HasOne(e => e.Message).WithMany(m => m.Receipts).HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Notifications
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsRead);
            entity.HasIndex(e => new { e.UserId, e.IsRead });
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Body).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.TitleKey).HasMaxLength(100);
            entity.Property(e => e.BodyKey).HasMaxLength(100);
            entity.Property(e => e.EventKey).HasMaxLength(250);
            entity.HasIndex(e => e.EventKey).IsUnique().HasFilter("[EventKey] IS NOT NULL AND [EventKey] <> ''");
            entity.Property(e => e.EntityType).HasMaxLength(100);
            entity.Property(e => e.EntityId).HasMaxLength(100);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<NotificationPreference>(entity =>
        {
            entity.ToTable("NotificationPreferences");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Media Files
        modelBuilder.Entity<MediaFile>(entity =>
        {
            entity.ToTable("MediaFiles");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OwnerUserId);
            entity.HasIndex(e => new { e.EntityType, e.EntityId });
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.StorageProvider).HasMaxLength(50).IsRequired();
            entity.Property(e => e.BucketName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ObjectKey).HasMaxLength(500).IsRequired();
            entity.Property(e => e.OriginalFileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.StoredFileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.ContentType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).IsRequired();
            entity.HasOne(e => e.OwnerUser).WithMany().HasForeignKey(e => e.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Technical Office: BOQ Items
        modelBuilder.Entity<BoqItem>(entity =>
        {
            entity.ToTable("BoqItems");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.Property(e => e.ItemCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Unit).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Quantity).HasPrecision(18, 4);
            entity.Property(e => e.UnitPrice).HasPrecision(18, 4);
            entity.Property(e => e.EstimatedCost).HasPrecision(18, 4);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Technical Office: Technical Offers
        modelBuilder.Entity<TechnicalOffer>(entity =>
        {
            entity.ToTable("TechnicalOffers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Technical Office: Commercial Offers
        modelBuilder.Entity<CommercialOffer>(entity =>
        {
            entity.ToTable("CommercialOffers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.TotalAmount).HasPrecision(18, 4);
            entity.Property(e => e.Discount).HasPrecision(18, 4);
            entity.Property(e => e.Tax).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(10).IsRequired();
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Technical Office: Project Invoices
        modelBuilder.Entity<ProjectInvoice>(entity =>
        {
            entity.ToTable("ProjectInvoices");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.InvoiceNumber);
            entity.HasIndex(e => new { e.ProjectId, e.Status });
            entity.Property(e => e.InvoiceNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.MilestoneDescription).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Amount).HasPrecision(18, 4);
            entity.Property(e => e.Currency).HasMaxLength(10).IsRequired();
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Materials
        modelBuilder.Entity<Material>(entity =>
        {
            entity.ToTable("Materials");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Unit).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.Property(e => e.InStockQuantity).HasPrecision(18, 4);
            entity.Property(e => e.ReservedQuantity).HasPrecision(18, 4);
            entity.Property(e => e.MinimumThreshold).HasPrecision(18, 4);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Site Material Requests
        modelBuilder.Entity<SiteMaterialRequest>(entity =>
        {
            entity.ToTable("SiteMaterialRequests");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany().HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.RequestedByUser).WithMany().HasForeignKey(e => e.RequestedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApprovedByUser).WithMany().HasForeignKey(e => e.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Site Material Request Items
        modelBuilder.Entity<SiteMaterialRequestItem>(entity =>
        {
            entity.ToTable("SiteMaterialRequestItems");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.SiteMaterialRequestId);
            entity.HasIndex(e => e.MaterialId);
            entity.Property(e => e.QuantityRequested).HasPrecision(18, 4);
            entity.Property(e => e.QuantityApproved).HasPrecision(18, 4);
            entity.Property(e => e.QuantityDispatched).HasPrecision(18, 4);
            entity.HasOne(e => e.SiteMaterialRequest).WithMany(r => r.Items).HasForeignKey(e => e.SiteMaterialRequestId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Material).WithMany().HasForeignKey(e => e.MaterialId).OnDelete(DeleteBehavior.Restrict);
        });

        // Company Assets
        modelBuilder.Entity<CompanyAsset>(entity =>
        {
            entity.ToTable("CompanyAssets");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.AssetTag).IsUnique();
            entity.HasIndex(e => new { e.ProjectId, e.AssignedToSiteId });
            entity.Property(e => e.AssetTag).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.AssignedToUser).WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.AssignedToSite).WithMany().HasForeignKey(e => e.AssignedToSiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Governance: Project Risks
        modelBuilder.Entity<ProjectRisk>(entity =>
        {
            entity.ToTable("ProjectRisks");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Probability).HasPrecision(5, 2);
            entity.HasOne(e => e.Project).WithMany(p => p.Risks).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.OwnerUser).WithMany().HasForeignKey(e => e.OwnerUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Governance: Project Issues
        modelBuilder.Entity<ProjectIssue>(entity =>
        {
            entity.ToTable("ProjectIssues");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.HasOne(e => e.Project).WithMany(p => p.Issues).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Site).WithMany(s => s.Issues).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ReportedByUser).WithMany().HasForeignKey(e => e.ReportedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.AssignedToUser).WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });


        // Governance: Project Handover
        modelBuilder.Entity<ProjectHandover>(entity =>
        {
            entity.ToTable("ProjectHandovers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // Identity Extensions
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("UserProfiles");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.Bio).HasMaxLength(1000);
            entity.Property(e => e.ProfilePictureUrl).HasMaxLength(500);
            entity.Property(e => e.PhoneNumber2).HasMaxLength(30);
            entity.Property(e => e.Address).HasMaxLength(300);
            entity.Property(e => e.NationalId).HasMaxLength(50);
            entity.Property(e => e.EmergencyContact).HasMaxLength(100);
            entity.HasOne(e => e.User).WithOne(u => u.UserProfile).HasForeignKey<UserProfile>(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<UserSession>(entity =>
        {
            entity.ToTable("UserSessions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.SessionToken).IsUnique();
            entity.Property(e => e.SessionToken).HasMaxLength(500).IsRequired();
            entity.Property(e => e.IpAddress).HasMaxLength(50);
            entity.Property(e => e.UserAgent).HasMaxLength(500);
            entity.HasOne(e => e.User).WithMany(u => u.UserSessions).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserPreference>(entity =>
        {
            entity.ToTable("UserPreferences");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.Language).HasMaxLength(10).IsRequired();
            entity.Property(e => e.TimeZone).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Theme).HasMaxLength(20).IsRequired();
            entity.HasOne(e => e.User).WithOne(u => u.UserPreference).HasForeignKey<UserPreference>(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Organization
        modelBuilder.Entity<Department>(entity =>
        {
            entity.ToTable("Departments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.Property(e => e.NameAr).HasMaxLength(150).IsRequired();
            entity.Property(e => e.NameEn).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasOne(e => e.ParentDepartment).WithMany(p => p.SubDepartments).HasForeignKey(e => e.ParentDepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ManagerUser).WithMany().HasForeignKey(e => e.ManagerUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<DepartmentMember>(entity =>
        {
            entity.ToTable("DepartmentMembers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DepartmentId);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.DepartmentRole).HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.Department).WithMany(d => d.Members).HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.ToTable("Teams");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DepartmentId);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.HasOne(e => e.Department).WithMany(d => d.Teams).HasForeignKey(e => e.DepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ManagerUser).WithMany().HasForeignKey(e => e.ManagerUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.AssistantManagerUser).WithMany().HasForeignKey(e => e.AssistantManagerUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.SupervisorUser).WithMany().HasForeignKey(e => e.SupervisorUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<TeamMember>(entity =>
        {
            entity.ToTable("TeamMembers");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TeamId);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.TeamRole).HasMaxLength(100);
            entity.Property(e => e.RoleInTeam).HasMaxLength(100);
            entity.HasOne(e => e.Team).WithMany(t => t.Members).HasForeignKey(e => e.TeamId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        // Milestones & Project Assignments
        modelBuilder.Entity<ProjectAssignment>(entity =>
        {
            entity.ToTable("ProjectAssignments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.UserId);
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.HasOne(e => e.Project).WithMany(p => p.Assignments).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Team).WithMany(t => t.ProjectAssignments).HasForeignKey(e => e.TeamId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProjectMilestone>(entity =>
        {
            entity.ToTable("ProjectMilestones");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Weight).HasPrecision(5, 2);
            entity.HasOne(e => e.Project).WithMany(p => p.Milestones).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<ProjectMilestoneDependency>(entity =>
        {
            entity.ToTable("ProjectMilestoneDependencies");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.MilestoneId, e.DependsOnMilestoneId }).IsUnique();
            entity.HasOne(e => e.Milestone).WithMany(m => m.Dependencies).HasForeignKey(e => e.MilestoneId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.DependsOnMilestone).WithMany(m => m.DependentMilestones).HasForeignKey(e => e.DependsOnMilestoneId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskEvent>(entity =>
        {
            entity.ToTable("TaskEvents");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TaskId);
            entity.Property(e => e.EventType).HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.Task).WithMany(t => t.Events).HasForeignKey(e => e.TaskId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Performer).WithMany().HasForeignKey(e => e.PerformedBy).OnDelete(DeleteBehavior.Restrict);
        });

        // Enterprise Documents
        modelBuilder.Entity<DocumentType>(entity =>
        {
            entity.ToTable("DocumentTypes");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NameAr).HasMaxLength(150).IsRequired();
            entity.Property(e => e.NameEn).HasMaxLength(150).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("Documents");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.DocumentTypeId);
            entity.HasIndex(e => e.DocumentNumber).IsUnique();
            entity.HasIndex(e => new { e.ProjectId, e.Status });
            entity.HasIndex(e => new { e.SiteId, e.Status });
            entity.HasIndex(e => new { e.UploadedBy, e.Status });
            entity.Property(e => e.DocumentNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(250).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.HasOne(e => e.Project).WithMany(p => p.Documents).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany(s => s.Documents).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.DocumentType).WithMany(t => t.Documents).HasForeignKey(e => e.DocumentTypeId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.OwnerUser).WithMany().HasForeignKey(e => e.OwnerUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.UploaderUser).WithMany().HasForeignKey(e => e.UploadedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApproverUser).WithMany().HasForeignKey(e => e.ApprovedBy).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.CurrentVersion).WithMany().HasForeignKey(e => e.CurrentVersionId).OnDelete(DeleteBehavior.NoAction);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<DocumentVersion>(entity =>
        {
            entity.ToTable("DocumentVersions");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.DocumentId, e.VersionNumber }).IsUnique();
            entity.Property(e => e.ChangeReason).HasMaxLength(500);
            entity.Property(e => e.CorrectionReason).HasMaxLength(1000);
            entity.Property(e => e.EditableUntil).IsRequired(); // SECURITY-01
            entity.HasOne(e => e.Document).WithMany(d => d.Versions).HasForeignKey(e => e.DocumentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.File).WithMany().HasForeignKey(e => e.FileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Uploader).WithMany().HasForeignKey(e => e.UploadedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DocumentApproval>(entity =>
        {
            entity.ToTable("DocumentApprovals");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DocumentId);
            entity.HasIndex(e => e.VersionId);
            entity.Property(e => e.Reason).HasMaxLength(1000);
            entity.HasOne(e => e.Document).WithMany(d => d.Approvals).HasForeignKey(e => e.DocumentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Version).WithMany().HasForeignKey(e => e.VersionId).OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Requester).WithMany().HasForeignKey(e => e.RequestedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Reviewer).WithMany().HasForeignKey(e => e.ReviewedBy).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DocumentCorrection>(entity =>
        {
            entity.ToTable("DocumentCorrections");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DocumentId);
            entity.HasIndex(e => e.OriginalVersionId);
            entity.Property(e => e.Reason).HasMaxLength(1000).IsRequired();
            entity.HasOne(e => e.Document).WithMany(d => d.Corrections).HasForeignKey(e => e.DocumentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.OriginalVersion).WithMany().HasForeignKey(e => e.OriginalVersionId).OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Requester).WithMany().HasForeignKey(e => e.RequestedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Assignee).WithMany().HasForeignKey(e => e.RequestedTo).OnDelete(DeleteBehavior.Restrict);
        });

        // DRAW-01: Drawings
        modelBuilder.Entity<Drawing>(entity =>
        {
            entity.ToTable("Drawings");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProjectId, e.SiteId });
            entity.HasIndex(e => e.Discipline);
            entity.Property(e => e.DrawingNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.DrawingTitle).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Revision).HasMaxLength(50).IsRequired();
            entity.Property(e => e.StorageKey).HasMaxLength(1000).IsRequired();
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany().HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Document).WithMany().HasForeignKey(e => e.DocumentId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.UploaderUser).WithMany().HasForeignKey(e => e.UploadedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApproverUser).WithMany().HasForeignKey(e => e.ApprovedBy).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // DRAW-02: DrawingMarkups
        modelBuilder.Entity<DrawingMarkup>(entity =>
        {
            entity.ToTable("DrawingMarkups");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DrawingId);
            entity.Property(e => e.PositionJson).IsRequired();
            entity.Property(e => e.Color).HasMaxLength(50);
            entity.HasOne(e => e.Drawing).WithMany(d => d.Markups).HasForeignKey(e => e.DrawingId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        // DOC-06: ProductDataSheets
        modelBuilder.Entity<ProductDataSheet>(entity =>
        {
            entity.ToTable("ProductDataSheets");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProjectId, e.SiteId });
            entity.HasIndex(e => e.Category);
            entity.Property(e => e.Product).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Manufacturer).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Model).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.Document).WithMany().HasForeignKey(e => e.DocumentId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Site).WithMany().HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Asset).WithMany().HasForeignKey(e => e.AssetId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.Material).WithMany().HasForeignKey(e => e.MaterialId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.UploaderUser).WithMany().HasForeignKey(e => e.UploadedBy).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });


        // Site Operations & Daily Reports (OPERATIONS-01 & SITE-REPORT-01)
        modelBuilder.Entity<SiteOperation>(entity =>
        {
            entity.ToTable("SiteOperations");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.AssignedUserId);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Site).WithMany().HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.AssignedUser).WithMany().HasForeignKey(e => e.AssignedUserId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.AssignedTeam).WithMany().HasForeignKey(e => e.AssignedTeamId).OnDelete(DeleteBehavior.SetNull);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<OperationWorkLog>(entity =>
        {
            entity.ToTable("OperationWorkLogs");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OperationId);
            entity.Property(e => e.Description).HasMaxLength(1000).IsRequired();
            entity.Property(e => e.Hours).HasPrecision(18, 2);
            entity.HasOne(e => e.Operation).WithMany(o => o.WorkLogs).HasForeignKey(e => e.OperationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<OperationPhoto>(entity =>
        {
            entity.ToTable("OperationPhotos");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OperationId);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.Property(e => e.Caption).HasMaxLength(500);
            entity.HasOne(e => e.Operation).WithMany(o => o.Photos).HasForeignKey(e => e.OperationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany().HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.MediaFile).WithMany().HasForeignKey(e => e.MediaFileId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.UploaderUser).WithMany().HasForeignKey(e => e.UploaderUserId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<DailySiteReport>(entity =>
        {
            entity.ToTable("DailySiteReports");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId);
            entity.HasIndex(e => e.SiteId);
            entity.HasIndex(e => e.ReportDate);
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.Manpower).HasMaxLength(1000);
            entity.Property(e => e.WorkCompleted).HasMaxLength(4000).IsRequired();
            entity.Property(e => e.Problems).HasMaxLength(2000);
            entity.Property(e => e.MaterialsReceived).HasMaxLength(2000);
            entity.Property(e => e.MaterialsUsed).HasMaxLength(2000);
            entity.Property(e => e.Equipment).HasMaxLength(2000);
            entity.Property(e => e.SafetyNotes).HasMaxLength(2000);
            entity.Property(e => e.TomorrowPlan).HasMaxLength(2000);
            entity.HasOne(e => e.Project).WithMany().HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Site).WithMany().HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.EngineerUser).WithMany().HasForeignKey(e => e.EngineerUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Team).WithMany().HasForeignKey(e => e.TeamId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ReviewedByUser).WithMany().HasForeignKey(e => e.ReviewedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ApprovedByUser).WithMany().HasForeignKey(e => e.ApprovedByUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ParentReport).WithMany().HasForeignKey(e => e.ParentReportId).OnDelete(DeleteBehavior.NoAction);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<DailyReportAttachment>(entity =>
        {
            entity.ToTable("DailyReportAttachments");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.DailySiteReportId);
            entity.Property(e => e.AttachmentType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Caption).HasMaxLength(500);
            entity.HasOne(e => e.DailySiteReport).WithMany(r => r.Attachments).HasForeignKey(e => e.DailySiteReportId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MediaFile).WithMany().HasForeignKey(e => e.MediaFileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WarrantyAlertLog>(entity =>
        {
            entity.ToTable("WarrantyAlertLogs");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.CompanyAssetId, e.AlertThresholdDays }).IsUnique();
            entity.HasOne(e => e.CompanyAsset).WithMany().HasForeignKey(e => e.CompanyAssetId).OnDelete(DeleteBehavior.Cascade);
        });

        // DB-I18N: Language infrastructure
        modelBuilder.Entity<SupportedLanguage>(entity =>
        {
            entity.ToTable("SupportedLanguages");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(10).IsRequired();
            entity.Property(e => e.NameAr).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NameEn).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Direction).HasMaxLength(3).IsRequired();
        });

        modelBuilder.Entity<UserLanguagePreference>(entity =>
        {
            entity.ToTable("UserLanguagePreferences");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.LanguageCode).HasMaxLength(10).IsRequired();
            entity.HasOne(e => e.User).WithMany().HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TranslationEntry>(entity =>
        {
            entity.ToTable("TranslationEntries");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.EntityType, e.EntityId, e.LanguageCode, e.FieldName }).IsUnique();
            entity.Property(e => e.EntityType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.EntityId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LanguageCode).HasMaxLength(10).IsRequired();
            entity.Property(e => e.FieldName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.TranslatedValue).HasMaxLength(2000).IsRequired();
        });

        // REALTIME-02: Transactional Outbox
        modelBuilder.Entity<OutboxMessage>(entity =>
        {
            entity.ToTable("OutboxMessages");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
            entity.Property(e => e.EventType).HasMaxLength(200).IsRequired();
            entity.Property(e => e.AggregateType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.AggregateId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
            entity.Property(e => e.TargetGroup).HasMaxLength(200);
            entity.Property(e => e.Payload).HasColumnType("nvarchar(max)").IsRequired();
        });

        // ORG-06: RACI Responsibility Matrix
        modelBuilder.Entity<ResourceResponsibility>(entity =>
        {
            entity.ToTable("ResourceResponsibilities");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ResourceType, e.ResourceId, e.IsActive });
            entity.HasIndex(e => new { e.UserId, e.IsActive });
            entity.HasIndex(e => new { e.TeamId, e.IsActive });
            entity.Property(e => e.ResourceType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ResponsibilityType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(500);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Team)
                .WithMany()
                .HasForeignKey(e => e.TeamId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AssignedByUser)
                .WithMany()
                .HasForeignKey(e => e.AssignedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ADMIN-02: Configurable Master Data
        modelBuilder.Entity<MasterDataItem>(entity =>
        {
            entity.ToTable("MasterDataItems");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.Category, e.Code }).IsUnique();
            entity.HasIndex(e => new { e.Category, e.IsActive, e.DisplayOrder });
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Code).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NameAr).HasMaxLength(200).IsRequired();
            entity.Property(e => e.NameEn).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ORG-09: Temporary Responsibility Delegation
        modelBuilder.Entity<Delegation>(entity =>
        {
            entity.ToTable("Delegations");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.DelegateUserId, e.IsActive, e.StartAt, e.EndAt });
            entity.HasIndex(e => new { e.UserId, e.IsActive });
            entity.HasIndex(e => new { e.ScopeType, e.ScopeId, e.IsActive });
            entity.Property(e => e.ScopeType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(100);
            entity.Property(e => e.Reason).HasMaxLength(500);

            entity.HasOne(e => e.User)
                .WithMany(u => u.GivenDelegations)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.DelegateUser)
                .WithMany(u => u.ReceivedDelegations)
                .HasForeignKey(e => e.DelegateUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.CreatedByUser)
                .WithMany()
                .HasForeignKey(e => e.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AssignmentHistory>(entity =>
        {
            entity.ToTable("AssignmentHistories");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AssignmentType).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Action).IsRequired().HasMaxLength(50);
            entity.Property(e => e.TargetName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.ResourceName).HasMaxLength(200);
            entity.Property(e => e.Role).HasMaxLength(100);
            entity.Property(e => e.AssignedByName).HasMaxLength(200);
            entity.Property(e => e.RemovedByName).HasMaxLength(200);
            entity.Property(e => e.Reason).HasMaxLength(500);

            entity.HasIndex(e => new { e.ResourceId, e.AssignmentType });
            entity.HasIndex(e => e.TargetUserId);
            entity.HasIndex(e => e.TargetTeamId);
            entity.HasIndex(e => e.CreatedAt);
        });
    }


    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var currentUserId = _currentUserService?.UserId;
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added && entry.Entity.Id == Guid.Empty)
            {
                entry.Entity.Id = Guid.NewGuid();
            }
        }

        foreach (var entry in ChangeTracker.Entries<IAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.CreatedBy ??= currentUserId;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    entry.Entity.UpdatedBy = currentUserId;
                    break;
            }
        }

        foreach (var entry in ChangeTracker.Entries<ISoftDelete>())
        {
            if (entry.State == EntityState.Deleted)
            {
                entry.State = EntityState.Modified;
                entry.Entity.IsDeleted = true;
                entry.Entity.DeletedAt = now;
                entry.Entity.DeletedBy = currentUserId;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
