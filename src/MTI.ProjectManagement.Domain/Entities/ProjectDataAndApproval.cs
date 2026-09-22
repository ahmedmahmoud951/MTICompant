using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class ProjectDataRecord : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public Guid SubmittedBy { get; set; }
    public User Submitter { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DataRecordStatus Status { get; set; } = DataRecordStatus.Draft;
    public int Version { get; set; } = 1;

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTime? RejectedAt { get; set; }
    public Guid? RejectedBy { get; set; }

    // Navigation
    public ICollection<ProjectDataVersion> Versions { get; set; } = new List<ProjectDataVersion>();
    public ICollection<DataApproval> Approvals { get; set; } = new List<DataApproval>();
    public ICollection<DataSheet> DataSheets { get; set; } = new List<DataSheet>();
    public ICollection<DataAttachment> Attachments { get; set; } = new List<DataAttachment>();
    public ICollection<DataComment> Comments { get; set; } = new List<DataComment>();

    public bool IsImmutableForEngineers => Status == DataRecordStatus.Approved;
}

public class ProjectDataVersion : BaseEntity
{
    public Guid DataRecordId { get; set; }
    public ProjectDataRecord DataRecord { get; set; } = null!;

    public int VersionNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DataSnapshotJson { get; set; } = string.Empty; // Full JSON snapshot
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DataApproval : BaseEntity
{
    public Guid DataRecordId { get; set; }
    public ProjectDataRecord DataRecord { get; set; } = null!;

    public ApprovalAction Action { get; set; } // Submitted, Approved, Rejected, ChangesRequested
    public string? Comment { get; set; }
    public Guid PerformedBy { get; set; }
    public User Performer { get; set; } = null!;
    public DateTime PerformedAt { get; set; } = DateTime.UtcNow;
}

public class DataSheet : FullAuditedEntity
{
    public Guid DataRecordId { get; set; }
    public ProjectDataRecord DataRecord { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string HeadersJson { get; set; } = "[]"; // Column headers as JSON array
    public int Order { get; set; } = 0;

    public ICollection<DataSheetRow> Rows { get; set; } = new List<DataSheetRow>();
}

public class DataSheetRow : BaseEntity
{
    public Guid DataSheetId { get; set; }
    public DataSheet DataSheet { get; set; } = null!;

    public int RowIndex { get; set; }
    public string ValuesJson { get; set; } = "{}"; // Cell values as key-value JSON
}

public class DataAttachment : BaseEntity
{
    public Guid DataRecordId { get; set; }
    public ProjectDataRecord DataRecord { get; set; } = null!;

    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    public string? Caption { get; set; }
    public DateTime AttachedAt { get; set; } = DateTime.UtcNow;
}

public class DataComment : AuditableEntity
{
    public Guid DataRecordId { get; set; }
    public ProjectDataRecord DataRecord { get; set; } = null!;

    public Guid AuthorUserId { get; set; }
    public User Author { get; set; } = null!;

    public string Content { get; set; } = string.Empty;
}
