using MTI.ProjectManagement.Domain.Common;

namespace MTI.ProjectManagement.Domain.Entities;

public class Department : FullAuditedEntity
{
    public string Code { get; set; } = string.Empty; // e.g. "DEPT-ENG", "DEPT-SOFT", "DEPT-TO"
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    
    public string Name
    {
        get => !string.IsNullOrWhiteSpace(NameAr) ? NameAr : NameEn;
        set
        {
            if (string.IsNullOrWhiteSpace(NameAr)) NameAr = value;
            if (string.IsNullOrWhiteSpace(NameEn)) NameEn = value;
        }
    }

    public string? Description { get; set; }

    /// <summary>Department Manager User Id</summary>
    public Guid? ManagerUserId { get; set; }
    public User? ManagerUser { get; set; }

    /// <summary>Parent department id for organizational hierarchy</summary>
    public Guid? ParentDepartmentId { get; set; }
    public Department? ParentDepartment { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<Department> SubDepartments { get; set; } = new List<Department>();
    public ICollection<Team> Teams { get; set; } = new List<Team>();
    public ICollection<DepartmentMember> Members { get; set; } = new List<DepartmentMember>();
}

public class DepartmentMember : BaseEntity
{
    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Department role e.g. Manager, Supervisor, Member, TechnicalLead, Viewer</summary>
    public string DepartmentRole { get; set; } = "Member";

    /// <summary>Whether this is the user's primary department</summary>
    public bool IsPrimary { get; set; } = false;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    /// <summary>End-date for historical preservation</summary>
    public DateTime? LeftAt { get; set; }

    public bool IsActive { get; set; } = true;
}

public class Team : FullAuditedEntity
{
    public Guid DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public string Code { get; set; } = string.Empty; // e.g. "TEAM-NET-01"
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Primary Team Manager</summary>
    public Guid? ManagerUserId { get; set; }
    public User? ManagerUser { get; set; }

    /// <summary>Backward compatibility alias to ManagerUserId</summary>
    public Guid? LeaderUserId
    {
        get => ManagerUserId;
        set => ManagerUserId = value;
    }
    public User? LeaderUser
    {
        get => ManagerUser;
        set => ManagerUser = value;
    }

    /// <summary>Optional Assistant Team Manager</summary>
    public Guid? AssistantManagerUserId { get; set; }
    public User? AssistantManagerUser { get; set; }

    /// <summary>Optional Team Supervisor</summary>
    public Guid? SupervisorUserId { get; set; }
    public User? SupervisorUser { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
    public ICollection<ProjectTeam> ProjectTeams { get; set; } = new List<ProjectTeam>();
    public ICollection<SiteTeam> SiteTeams { get; set; } = new List<SiteTeam>();
}

public class TeamMember : BaseEntity
{
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Configurable team role e.g. Manager, Supervisor, Engineer, SeniorEngineer, Technician, Developer, Support, Coordinator, Viewer</summary>
    public string TeamRole { get; set; } = "Member";

    /// <summary>Backward compatibility alias</summary>
    public string RoleInTeam
    {
        get => TeamRole;
        set => TeamRole = value;
    }

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    /// <summary>End-date for historical preservation</summary>
    public DateTime? LeftAt { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Whether this is the user's primary team</summary>
    public bool IsPrimaryTeam { get; set; } = false;
}
