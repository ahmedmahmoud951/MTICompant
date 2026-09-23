using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class DocumentType : BaseEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "SiteSheet", "TechnicalOffer", "BOQ"
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Document> Documents { get; set; } = new List<Document>();
}

public class Document : FullAuditedEntity
{
    public string DocumentNumber { get; set; } = string.Empty; // e.g. "DOC-PRJ-2026-001"
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }

    public Guid DocumentTypeId { get; set; }
    public DocumentType DocumentType { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid OwnerUserId { get; set; }
    public User OwnerUser { get; set; } = null!;

    public Guid UploadedBy { get; set; }
    public User UploaderUser { get; set; } = null!;

    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;

    public Guid? CurrentVersionId { get; set; }
    public DocumentVersion? CurrentVersion { get; set; }

    public DateTime? EditableUntil { get; set; }
    public DateTime? LockedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }
    public Guid? ApprovedBy { get; set; }
    public User? ApproverUser { get; set; }

    // Navigation
    public ICollection<DocumentVersion> Versions { get; set; } = new List<DocumentVersion>();
    public ICollection<DocumentApproval> Approvals { get; set; } = new List<DocumentApproval>();
    public ICollection<DocumentCorrection> Corrections { get; set; } = new List<DocumentCorrection>();

    public bool IsLocked => LockedAt.HasValue || Status == DocumentStatus.Approved || Status == DocumentStatus.Locked || (EditableUntil.HasValue && DateTime.UtcNow > EditableUntil.Value);
}

public class DocumentVersion : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public int VersionNumber { get; set; } = 1;

    public Guid FileId { get; set; }
    public MediaFile File { get; set; } = null!;

    public Guid UploadedBy { get; set; }
    public User Uploader { get; set; } = null!;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    /// <summary>SECURITY-01: Uploader can modify/delete only while DateTime.UtcNow &lt;= EditableUntil AND Status == PendingReview.</summary>
    public DateTime EditableUntil { get; set; } = DateTime.UtcNow.AddHours(24);

    /// <summary>Legacy alias kept for compatibility.</summary>
    public DateTime? EditUntil { get; set; }
    public DocumentVersionStatus Status { get; set; } = DocumentVersionStatus.Draft;
    public string? ChangeReason { get; set; }
    public string? CorrectionReason { get; set; } // Admin correction reason (SECURITY-01)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>True when the 24-hour edit window has expired OR the version is Approved/Locked/Superseded/Rejected.</summary>
    public bool IsLockedForUploader =>
        Status == DocumentVersionStatus.Approved ||
        Status == DocumentVersionStatus.Locked ||
        Status == DocumentVersionStatus.Superseded ||
        Status == DocumentVersionStatus.Rejected ||
        DateTime.UtcNow > EditableUntil;

    public bool IsEditable => !IsLockedForUploader;
}

public class DocumentApproval : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public Guid VersionId { get; set; }
    public DocumentVersion Version { get; set; } = null!;

    public Guid RequestedBy { get; set; }
    public User Requester { get; set; } = null!;

    public Guid? ReviewedBy { get; set; }
    public User? Reviewer { get; set; }

    public DocumentApprovalStatus Status { get; set; } = DocumentApprovalStatus.Pending;
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
}

public class DocumentCorrection : BaseEntity
{
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = null!;

    public Guid OriginalVersionId { get; set; }
    public DocumentVersion OriginalVersion { get; set; } = null!;

    public Guid RequestedBy { get; set; }
    public User Requester { get; set; } = null!;

    public Guid? RequestedTo { get; set; }
    public User? Assignee { get; set; }

    public string Reason { get; set; } = string.Empty;
    public CorrectionStatus Status { get; set; } = CorrectionStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
}
