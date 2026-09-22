using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class TaskItem : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public TaskItemStatus Status { get; set; } = TaskItemStatus.ToDo;

    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }

    public DateTime? StartAt { get; set; }
    public DateTime? DueAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public ICollection<TaskAssignment> Assignments { get; set; } = new List<TaskAssignment>();
    public ICollection<TaskComment> Comments { get; set; } = new List<TaskComment>();
    public ICollection<TaskAttachment> Attachments { get; set; } = new List<TaskAttachment>();
    public ICollection<TaskStatusHistory> StatusHistory { get; set; } = new List<TaskStatusHistory>();
}

public class TaskAssignment : BaseEntity
{
    public Guid TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public Guid? AssignedBy { get; set; }
}

public class TaskComment : AuditableEntity
{
    public Guid TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;

    public Guid AuthorUserId { get; set; }
    public User Author { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
}

public class TaskAttachment : BaseEntity
{
    public Guid TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;

    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    public DateTime AttachedAt { get; set; } = DateTime.UtcNow;
}

public class TaskStatusHistory : BaseEntity
{
    public Guid TaskItemId { get; set; }
    public TaskItem TaskItem { get; set; } = null!;

    public TaskItemStatus OldStatus { get; set; }
    public TaskItemStatus NewStatus { get; set; }
    public string? Reason { get; set; }
    public Guid ChangedBy { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}

public class MediaFile : FullAuditedEntity
{
    public string EntityType { get; set; } = string.Empty; // "ProjectData", "Task", "Chat", "Avatar"
    public Guid? EntityId { get; set; }
    public Guid OwnerUserId { get; set; }
    public User OwnerUser { get; set; } = null!;

    public string StorageProvider { get; set; } = "BackblazeB2";
    public string BucketName { get; set; } = string.Empty;
    public string ObjectKey { get; set; } = string.Empty; // S3 Key path in B2 bucket
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public MediaType MediaType { get; set; } = MediaType.Other;
    public long FileSize { get; set; }
    public string Status { get; set; } = "Uploaded"; // "Pending", "Uploaded", "Deleted"
    public string? Checksum { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
