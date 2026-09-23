using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class BoqItem : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }

    public string ItemCode { get; set; } = string.Empty; // e.g. "BOQ-CCTV-01"
    public string Description { get; set; } = string.Empty;
    public string Unit { get; set; } = "Item"; // "m", "pcs", "lot", "point", "job"
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; } = 0;
    public decimal EstimatedCost { get; set; } = 0;
    public decimal TotalPrice => Quantity * UnitPrice;
    public string Category { get; set; } = "General"; // "CCTV", "AccessControl", "Networking", "Civil", "Electrical"
    public string? Notes { get; set; }
}

public class TechnicalOffer : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string ScopeOfWork { get; set; } = string.Empty;
    public string SpecificationsJson { get; set; } = "[]"; // Dynamic technical specs
    public string Deliverables { get; set; } = string.Empty;
    public OfferStatus Status { get; set; } = OfferStatus.Draft;
    public int Version { get; set; } = 1;

    public Guid? DocumentMediaFileId { get; set; }
    public MediaFile? DocumentMediaFile { get; set; }
}

public class CommercialOffer : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; } = 0;
    public decimal Discount { get; set; } = 0;
    public decimal Tax { get; set; } = 0;
    public decimal FinalAmount => (TotalAmount - Discount) + Tax;
    public string Currency { get; set; } = "EGP";
    public string PaymentTerms { get; set; } = string.Empty;
    public int ValidityDays { get; set; } = 30;
    public OfferStatus Status { get; set; } = OfferStatus.Draft;
    public int Version { get; set; } = 1;

    public Guid? DocumentMediaFileId { get; set; }
    public MediaFile? DocumentMediaFile { get; set; }
}

public class ProjectInvoice : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string InvoiceNumber { get; set; } = string.Empty; // e.g. "INV-2026-001"
    public string MilestoneDescription { get; set; } = string.Empty;
    public decimal Amount { get; set; } = 0;
    public decimal Tax { get; set; } = 0;
    public decimal Total => Amount + Tax;
    public string Currency { get; set; } = "EGP";
    public DateTime IssuedDate { get; set; } = DateTime.UtcNow;
    public DateTime InvoiceDate { get => IssuedDate; set => IssuedDate = value; }
    public DateTime? DueDate { get; set; }
    public DateTime? PaidDate { get; set; }
    public InvoiceStatus Status { get; set; } = InvoiceStatus.Draft;
    public string? Notes { get; set; }

    public Guid? DocumentId { get; set; }
    public Document? Document { get; set; }

    public Guid? AttachmentMediaFileId { get; set; }
    public MediaFile? AttachmentMediaFile { get; set; }
}
