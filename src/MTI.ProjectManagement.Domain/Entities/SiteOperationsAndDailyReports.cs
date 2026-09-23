using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class SiteOperation : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public OperationType OperationType { get; set; } = OperationType.Installation;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public Guid? AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public Guid? AssignedTeamId { get; set; }
    public Team? AssignedTeam { get; set; }

    public SiteOperationStatus Status { get; set; } = SiteOperationStatus.Pending;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;

    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int Progress { get; set; } = 0; // 0-100%

    // Work logs and photos
    public ICollection<OperationWorkLog> WorkLogs { get; set; } = new List<OperationWorkLog>();
    public ICollection<OperationPhoto> Photos { get; set; } = new List<OperationPhoto>();
}

public class OperationWorkLog : BaseEntity
{
    public Guid OperationId { get; set; }
    public SiteOperation Operation { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public decimal Hours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OperationPhoto : BaseEntity
{
    public Guid OperationId { get; set; }
    public SiteOperation Operation { get; set; } = null!;

    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    public Guid UploaderUserId { get; set; }
    public User UploaderUser { get; set; } = null!;

    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DailySiteReport : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public DateTime ReportDate { get; set; }
    public Guid EngineerUserId { get; set; }
    public User EngineerUser { get; set; } = null!;

    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }

    public string Manpower { get; set; } = string.Empty;
    public string WorkCompleted { get; set; } = string.Empty;
    public string Problems { get; set; } = string.Empty;
    public string MaterialsReceived { get; set; } = string.Empty;
    public string MaterialsUsed { get; set; } = string.Empty;
    public string Equipment { get; set; } = string.Empty;
    public string SafetyNotes { get; set; } = string.Empty;
    public string TomorrowPlan { get; set; } = string.Empty;

    public DailyReportStatus Status { get; set; } = DailyReportStatus.Draft;
    public int RevisionNumber { get; set; } = 1;
    public Guid? ParentReportId { get; set; }
    public DailySiteReport? ParentReport { get; set; }

    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }

    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }
    public string? ReviewNotes { get; set; }

    public bool IsImmutable => Status == DailyReportStatus.Approved;

    public ICollection<DailyReportAttachment> Attachments { get; set; } = new List<DailyReportAttachment>();
}

public class DailyReportAttachment : BaseEntity
{
    public Guid DailySiteReportId { get; set; }
    public DailySiteReport DailySiteReport { get; set; } = null!;

    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    public string AttachmentType { get; set; } = "Photo"; // "Photo", "Sheet", "Document"
    public string? Caption { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
