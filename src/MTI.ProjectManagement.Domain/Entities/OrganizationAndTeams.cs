using MTI.ProjectManagement.Domain.Common;

namespace MTI.ProjectManagement.Domain.Entities;

public class Department : FullAuditedEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "DEPT-ENG", "DEPT-SOFT", "DEPT-TO"
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Team> Teams { get; set; } = new List<Team>();
}

public class Team : FullAuditedEntity
{
    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public string Code { get; set; } = string.Empty; // e.g. "TEAM-NET-01"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? LeaderUserId { get; set; }
    public User? LeaderUser { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
}

public class TeamMember : BaseEntity
{
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string RoleInTeam { get; set; } = "Member"; // "Leader", "Senior", "Member", "Trainee"
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
