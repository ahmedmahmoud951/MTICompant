using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class Material : FullAuditedEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "MAT-CBL-CAT6"
    public string? MaterialCode { get => Code; set => Code = value ?? string.Empty; }
    public string Name { get; set; } = string.Empty;
    public string Specification { get; set; } = string.Empty;
    public string Unit { get; set; } = "pcs"; // "m", "pcs", "roll", "box"
    public decimal InStockQuantity { get; set; } = 0;
    public decimal ReservedQuantity { get; set; } = 0;
    public decimal AvailableQuantity => InStockQuantity - ReservedQuantity;
    public decimal MinimumThreshold { get; set; } = 5;
    public string Category { get; set; } = "Cables & Wiring"; // "CCTV Cameras", "Access Control Hardware", "Networking", "Tools"

    public decimal RequiredQuantity { get; set; } = 0;
    public decimal OrderedQuantity { get; set; } = 0;
    public decimal ReceivedQuantity { get; set; } = 0;
    public decimal InstalledQuantity { get; set; } = 0;
    public decimal RemainingQuantity { get; set; } = 0;
}

public class SiteMaterialRequest : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public Guid RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    public DateTime RequiredDate { get; set; } = DateTime.UtcNow.AddDays(3);
    public MaterialRequestStatus Status { get; set; } = MaterialRequestStatus.Pending;

    public Guid? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public string? RejectionReason { get; set; }
    public string? Notes { get; set; }

    public ICollection<SiteMaterialRequestItem> Items { get; set; } = new List<SiteMaterialRequestItem>();
}

public class SiteMaterialRequestItem : BaseEntity
{
    public Guid SiteMaterialRequestId { get; set; }
    public SiteMaterialRequest SiteMaterialRequest { get; set; } = null!;

    public Guid MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public decimal QuantityRequested { get; set; }
    public decimal QuantityApproved { get; set; }
    public decimal QuantityDispatched { get; set; }
    public string? Notes { get; set; }
}

public class CompanyAsset : FullAuditedEntity
{
    public string AssetTag { get; set; } = string.Empty; // e.g. "AST-FLK-001"
    public string? AssetCode { get => AssetTag; set => AssetTag = value ?? string.Empty; }
    public string Name { get; set; } = string.Empty;
    public AssetType AssetType { get; set; } = AssetType.Other;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string SerialNumber { get; set; } = string.Empty;
    public string Category { get; set; } = "TestingEquipment"; // "Tool", "Vehicle", "SafetyGear", "TestingEquipment"

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }

    public Guid? AssignedToSiteId { get; set; }
    public Site? AssignedToSite { get; set; }
    public Guid? SiteId { get => AssignedToSiteId; set => AssignedToSiteId = value; }

    public string? IPAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? Location { get; set; }

    public AssetStatus Status { get; set; } = AssetStatus.Available;
    public DateTime? PurchaseDate { get; set; }
    public DateTime? InstallationDate { get; set; }
    public DateTime? WarrantyStart { get; set; }
    public DateTime? WarrantyExpiry { get; set; }
    public DateTime? WarrantyEnd { get => WarrantyExpiry; set => WarrantyExpiry = value; }
    public string? MaintenanceNotes { get; set; }
}

public class WarrantyAlertLog : BaseEntity
{
    public Guid CompanyAssetId { get; set; }
    public CompanyAsset CompanyAsset { get; set; } = null!;

    public int AlertThresholdDays { get; set; } // 30, 15, 7, 0 (expired)
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
