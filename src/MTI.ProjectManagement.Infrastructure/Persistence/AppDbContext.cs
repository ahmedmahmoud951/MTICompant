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
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
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
            entity.HasIndex(e => new { e.ProjectId, e.UserId }).IsUnique();
            entity.Property(e => e.Role).HasMaxLength(50);
            entity.HasOne(e => e.Project).WithMany(p => p.Members).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.User).WithMany(u => u.ProjectMembers).HasForeignKey(e => e.UserId).OnDelete(DeleteBehavior.Cascade);
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
            entity.Property(e => e.Title).HasMaxLength(250).IsRequired();
            entity.HasOne(e => e.Project).WithMany(p => p.Tasks).HasForeignKey(e => e.ProjectId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Site).WithMany(s => s.Tasks).HasForeignKey(e => e.SiteId).OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.AssignedToUser).WithMany().HasForeignKey(e => e.AssignedToUserId).OnDelete(DeleteBehavior.SetNull);
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
            entity.HasOne(e => e.Conversation).WithMany(c => c.Messages).HasForeignKey(e => e.ConversationId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Sender).WithMany().HasForeignKey(e => e.SenderUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.ReplyToMessage).WithMany().HasForeignKey(e => e.ReplyToMessageId).OnDelete(DeleteBehavior.Restrict);
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<MessageAttachment>(entity =>
        {
            entity.ToTable("MessageAttachments");
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.Message).WithMany(m => m.Attachments).HasForeignKey(e => e.MessageId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.MediaFile).WithMany().HasForeignKey(e => e.MediaFileId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.ToTable("MessageReactions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Reaction).HasMaxLength(50).IsRequired();
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

        // Notifications
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.IsRead);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Body).HasMaxLength(1000).IsRequired();
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
