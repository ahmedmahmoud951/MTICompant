using System.ComponentModel.DataAnnotations.Schema;
using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class Project : FullAuditedEntity
{
    public string Code { get; set; } = string.Empty; // Unique project code e.g. "PRJ-2026-001"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public Guid? ClientId { get; set; }
    public ProjectPriority Priority { get; set; } = ProjectPriority.Medium;
    public ProjectStatus Status { get; set; } = ProjectStatus.Planning;
    public ProjectType Type { get; set; } = ProjectType.GeneralEngineering;
    public decimal ProgressPercentage { get; set; } = 0;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    /// <summary>Optional cover image (URL or data URL) shown on project cards.</summary>
    public string? CoverImageUrl { get; set; }
    [NotMapped]
    public DateTime? PlannedEndDate { get => EndDate; set => EndDate = value; }
    public DateTime? ActualEndDate { get; set; }
    public bool IsArchived { get; set; } = false;


    // Navigation
    public ICollection<Site> Sites { get; set; } = new List<Site>();
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public ICollection<ProjectAssignment> Assignments { get; set; } = new List<ProjectAssignment>();
    public ICollection<ProjectMilestone> Milestones { get; set; } = new List<ProjectMilestone>();
    public ICollection<ProjectDataRecord> DataRecords { get; set; } = new List<ProjectDataRecord>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<ProjectRisk> Risks { get; set; } = new List<ProjectRisk>();
    public ICollection<ProjectIssue> Issues { get; set; } = new List<ProjectIssue>();
}

public class Site : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Code { get; set; } = string.Empty; // Unique within project e.g. "SITE-CAI-01"
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public SiteStatus Status { get; set; } = SiteStatus.Pending;

    // Navigation
    public ICollection<SiteAssignment> Assignments { get; set; } = new List<SiteAssignment>();
    public ICollection<ProjectDataRecord> DataRecords { get; set; } = new List<ProjectDataRecord>();
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<Document> Documents { get; set; } = new List<Document>();
    public ICollection<ProjectIssue> Issues { get; set; } = new List<ProjectIssue>();
}


public class SiteAssignment : BaseEntity
{
    public Guid SiteId { get; set; }
    public Site Site { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Role { get; set; } = "Engineer"; // "SiteResponsible", "PrimaryEngineer", "Consultant"
    public bool IsPrimary { get; set; } = false;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public Guid? AssignedBy { get; set; }
    public DateTime? RemovedAt { get; set; }
    public Guid? RemovedBy { get; set; }

    public bool IsActive => RemovedAt == null;
}

public class ProjectMember : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Role { get; set; } = "Member"; // "ProjectManager", "Engineer", "Observer"
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}

public class EngineerProfile : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string? Specialization { get; set; } // "Civil", "Electrical", "Mechanical", "Telecom"
    public string? LicenseNumber { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Notes { get; set; }
}
