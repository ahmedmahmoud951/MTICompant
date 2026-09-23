using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class ProjectMilestone : FullAuditedEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }

    public MilestoneStatus Status { get; set; } = MilestoneStatus.Pending;
    public decimal Weight { get; set; } = 1.0m;
    public int SortOrder { get; set; } = 0;

    // Dependencies navigation
    public ICollection<ProjectMilestoneDependency> Dependencies { get; set; } = new List<ProjectMilestoneDependency>();
    public ICollection<ProjectMilestoneDependency> DependentMilestones { get; set; } = new List<ProjectMilestoneDependency>();
}

public class ProjectMilestoneDependency : BaseEntity
{
    public Guid MilestoneId { get; set; }
    public ProjectMilestone Milestone { get; set; } = null!;

    public Guid DependsOnMilestoneId { get; set; }
    public ProjectMilestone DependsOnMilestone { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ProjectAssignment : BaseEntity
{
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid? TeamId { get; set; }
    public Team? Team { get; set; }

    public string Role { get; set; } = "SiteEngineer"; // "ProjectManager", "SiteEngineer", "SoftwareEngineer", "TechnicalEngineer", "Supervisor"
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public Guid? AssignedBy { get; set; }
    public bool IsActive { get; set; } = true;
}
