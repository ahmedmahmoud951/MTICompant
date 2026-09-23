using System.ComponentModel.DataAnnotations.Schema;
using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;


namespace MTI.ProjectManagement.Domain.Entities;

public class ProjectRisk : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public RiskSeverity Severity { get; set; } = RiskSeverity.Medium;
    public decimal Probability { get; set; } = 0.5m; // 0.0 to 1.0
    public int Impact { get; set; } = 3; // 1 to 5
    public string MitigationPlan { get; set; } = string.Empty;

    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    public DateTime? DueDate { get; set; }
    public RiskStatus Status { get; set; } = RiskStatus.Identified;
}

public class ProjectIssue : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }

    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public RiskSeverity Severity { get; set; } = RiskSeverity.Medium;
    public string? RootCause { get; set; }
    public string? Resolution { get; set; }
    public IssueStatus Status { get; set; } = IssueStatus.Open;

    public Guid ReportedByUserId { get; set; }
    public User ReportedByUser { get; set; } = null!;

    public Guid? AssignedToUserId { get; set; }
    public User? AssignedToUser { get; set; }
    [NotMapped]
    public Guid? AssignedTo { get => AssignedToUserId; set => AssignedToUserId = value; }


    public DateTime? DueDate { get; set; }
    public DateTime? ResolvedAt { get; set; }
}


public class ProjectHandover : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public DateTime HandoverDate { get; set; } = DateTime.UtcNow;
    public HandoverStatus Status { get; set; } = HandoverStatus.PreliminaryHandover;

    public string SnagListJson { get; set; } = "[]"; // Punch list / snag items
    public string? PreliminaryAcceptedBy { get; set; }
    public string? FinalAcceptedBy { get; set; }

    public DateTime? WarrantyStartDate { get; set; }
    public DateTime? WarrantyEndDate { get; set; }
    public string? WarrantyTerms { get; set; }
    public string? MaintenanceContractRef { get; set; }
}
