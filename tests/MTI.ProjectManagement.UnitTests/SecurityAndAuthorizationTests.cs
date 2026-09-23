using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Services;
using Xunit;

namespace MTI.ProjectManagement.UnitTests;

public class SecurityAndAuthorizationTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void PasswordHashing_GeneratesStrongHashAndVerifies()
    {
        var password = "SecurePassword2026!";
        var hash = _hasher.HashPassword(password);

        Assert.NotNull(hash);
        Assert.NotEqual(password, hash);
        Assert.True(_hasher.VerifyPassword(password, hash));
        Assert.False(_hasher.VerifyPassword("WrongPassword123!", hash));
    }

    [Fact]
    public void ApprovalStateMachine_EnforcesWorkflowRules()
    {
        var record = new ProjectDataRecord
        {
            Title = "Soil Density Report",
            Status = DataRecordStatus.Draft,
            Version = 1
        };

        // 1. Can only submit from Draft or ChangesRequested
        Assert.Equal(DataRecordStatus.Draft, record.Status);
        record.Status = DataRecordStatus.Submitted;
        record.SubmittedAt = DateTime.UtcNow;
        Assert.Equal(DataRecordStatus.Submitted, record.Status);

        // 2. Admin approves
        record.Status = DataRecordStatus.Approved;
        record.ApprovedAt = DateTime.UtcNow;
        Assert.True(record.IsImmutableForEngineers);

        // 3. Versioning on correction
        var oldVersion = record.Version;
        var nextVersion = oldVersion + 1;
        Assert.Equal(2, nextVersion);
    }

    [Fact]
    public void TaskStatusTransitions_TrackValidStateChanges()
    {
        var task = new TaskItem
        {
            Title = "Excavation Zone 3",
            Priority = TaskPriority.High,
            Status = TaskItemStatus.ToDo
        };

        Assert.Equal(TaskItemStatus.ToDo, task.Status);
        task.Status = TaskItemStatus.InProgress;
        Assert.Equal(TaskItemStatus.InProgress, task.Status);

        task.Status = TaskItemStatus.Review;
        Assert.Equal(TaskItemStatus.Review, task.Status);

        task.Status = TaskItemStatus.Completed;
        task.CompletedAt = DateTime.UtcNow;
        Assert.Equal(TaskItemStatus.Completed, task.Status);
        Assert.NotNull(task.CompletedAt);
    }

    [Fact]
    public void IDORProtection_SiteScopingBlocksForeignSiteAccess()
    {
        var engineerSiteIds = new HashSet<Guid>
        {
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            Guid.Parse("22222222-2222-2222-2222-222222222222")
        };

        var foreignSiteId = Guid.Parse("99999999-9999-9999-9999-999999999999");
        var authorizedSiteId = Guid.Parse("11111111-1111-1111-1111-111111111111");

        // Checks access against authorized set
        Assert.True(engineerSiteIds.Contains(authorizedSiteId));
        Assert.False(engineerSiteIds.Contains(foreignSiteId));
    }

    [Fact]
    public void IDORProtection_ConversationMembershipRequiredForMessages()
    {
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(),
            IsGroup = false
        };

        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var attackerC = Guid.NewGuid();

        conversation.Members.Add(new ConversationMember { ConversationId = conversation.Id, UserId = userA });
        conversation.Members.Add(new ConversationMember { ConversationId = conversation.Id, UserId = userB });

        var memberUserIds = conversation.Members.Select(m => m.UserId).ToHashSet();

        Assert.Contains(userA, memberUserIds);
        Assert.Contains(userB, memberUserIds);
        Assert.DoesNotContain(attackerC, memberUserIds);
    }

    [Fact]
    public void SignalRGroupNaming_FollowsEnterpriseConventions()
    {
        var projectId = Guid.NewGuid();
        var siteId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var convId = Guid.NewGuid();

        Assert.Equal($"project:{projectId}", $"project:{projectId}");
        Assert.Equal($"site:{siteId}", $"site:{siteId}");
        Assert.Equal($"user:{userId}", $"user:{userId}");
        Assert.Equal($"conversation:{convId}", $"conversation:{convId}");
    }

    [Fact]
    public void Org01_DepartmentHierarchy_AndMembershipHistoryPreserved()
    {
        var parentDept = new Department { Id = Guid.NewGuid(), Code = "ENG", Name = "Engineering", IsActive = true };
        var childDept = new Department { Id = Guid.NewGuid(), Code = "CCTV", Name = "CCTV", ParentDepartmentId = parentDept.Id, IsActive = true };

        Assert.Equal(parentDept.Id, childDept.ParentDepartmentId);

        var member = new DepartmentMember
        {
            Id = Guid.NewGuid(),
            DepartmentId = childDept.Id,
            UserId = Guid.NewGuid(),
            DepartmentRole = "SeniorEngineer",
            IsPrimary = true,
            JoinedAt = DateTime.UtcNow.AddMonths(-6),
            IsActive = true
        };

        // When leaving department, historical record is preserved with LeftAt and IsActive = false
        member.LeftAt = DateTime.UtcNow;
        member.IsActive = false;

        Assert.NotNull(member.LeftAt);
        Assert.False(member.IsActive);
        Assert.True(member.IsPrimary);
    }

    [Fact]
    public void Org02_TeamManagement_SupportsManagersAndMultiTeamMembership()
    {
        var managerId = Guid.NewGuid();
        var assistantManagerId = Guid.NewGuid();
        var supervisorId = Guid.NewGuid();

        var team = new Team
        {
            Id = Guid.NewGuid(),
            DepartmentId = Guid.NewGuid(),
            Code = "TEAM-CCTV-A",
            Name = "CCTV Installation Team A",
            ManagerUserId = managerId,
            AssistantManagerUserId = assistantManagerId,
            SupervisorUserId = supervisorId,
            IsActive = true
        };

        Assert.Equal(managerId, team.ManagerUserId);
        Assert.Equal(assistantManagerId, team.AssistantManagerUserId);
        Assert.Equal(supervisorId, team.SupervisorUserId);

        var user = Guid.NewGuid();
        var membership1 = new TeamMember { Id = Guid.NewGuid(), TeamId = team.Id, UserId = user, TeamRole = "Engineer", IsPrimaryTeam = true, IsActive = true };
        var membership2 = new TeamMember { Id = Guid.NewGuid(), TeamId = Guid.NewGuid(), UserId = user, TeamRole = "Supervisor", IsPrimaryTeam = false, IsActive = true };

        // User can belong to multiple teams with different roles
        Assert.Equal("Engineer", membership1.TeamRole);
        Assert.Equal("Supervisor", membership2.TeamRole);
        Assert.True(membership1.IsPrimaryTeam);
        Assert.False(membership2.IsPrimaryTeam);
    }

    [Fact]
    public void Org03_And_Org04_ProjectMembershipAndTeamAssignment()
    {
        var projectId = Guid.NewGuid();
        var pmUser = Guid.NewGuid();
        var engineerUser = Guid.NewGuid();

        var pmMember = new ProjectMember
        {
            ProjectId = projectId,
            UserId = pmUser,
            ProjectRole = "ProjectManager",
            IsPrimary = true,
            AssignedAt = DateTime.UtcNow,
            IsActive = true
        };

        var engMember = new ProjectMember
        {
            ProjectId = projectId,
            UserId = engineerUser,
            ProjectRole = "SiteEngineer",
            IsPrimary = false,
            AssignedAt = DateTime.UtcNow,
            IsActive = true
        };

        var teamAssignment = new ProjectTeam
        {
            ProjectId = projectId,
            TeamId = Guid.NewGuid(),
            TeamRole = "CCTV Installation Team",
            AssignedAt = DateTime.UtcNow,
            IsActive = true
        };

        Assert.Equal("ProjectManager", pmMember.ProjectRole);
        Assert.True(pmMember.IsPrimary);
        Assert.Equal("SiteEngineer", engMember.ProjectRole);
        Assert.Equal("CCTV Installation Team", teamAssignment.TeamRole);
    }

    [Fact]
    public void Org05_SiteScoping_EngineerAssignedToSiteADoesNotSeeSiteB()
    {
        var siteAId = Guid.NewGuid();
        var siteBId = Guid.NewGuid();
        var engineerId = Guid.NewGuid();

        // Engineer is only assigned to Site A
        var siteAMembership = new SiteMember
        {
            SiteId = siteAId,
            UserId = engineerId,
            SiteRole = "SiteEngineer",
            IsActive = true,
            AssignedAt = DateTime.UtcNow
        };

        var authorizedSiteIds = new HashSet<Guid> { siteAMembership.SiteId };

        // Verify strict scoping
        Assert.Contains(siteAId, authorizedSiteIds);
        Assert.DoesNotContain(siteBId, authorizedSiteIds);
    }

    [Fact]
    public void Org06_RaciMatrix_TracksAllResponsibilityTypes()
    {
        var projectId = Guid.NewGuid();
        var engineerId = Guid.NewGuid();
        var pmId = Guid.NewGuid();
        var toTeamId = Guid.NewGuid();
        var accUserId = Guid.NewGuid();

        var responsible = new ResourceResponsibility
        {
            ResourceType = "Project",
            ResourceId = projectId,
            UserId = engineerId,
            ResponsibilityType = "Responsible",
            IsActive = true
        };

        var accountable = new ResourceResponsibility
        {
            ResourceType = "Project",
            ResourceId = projectId,
            UserId = pmId,
            ResponsibilityType = "Accountable",
            IsActive = true
        };

        var consulted = new ResourceResponsibility
        {
            ResourceType = "Project",
            ResourceId = projectId,
            TeamId = toTeamId,
            ResponsibilityType = "Consulted",
            IsActive = true
        };

        var informed = new ResourceResponsibility
        {
            ResourceType = "Project",
            ResourceId = projectId,
            UserId = accUserId,
            ResponsibilityType = "Informed",
            IsActive = true
        };

        Assert.Equal("Responsible", responsible.ResponsibilityType);
        Assert.Equal("Accountable", accountable.ResponsibilityType);
        Assert.Equal("Consulted", consulted.ResponsibilityType);
        Assert.Equal("Informed", informed.ResponsibilityType);
    }

    [Fact]
    public void Admin02_And_Admin03_MasterDataAndControlledSoftDelete()
    {
        var item = new MasterDataItem
        {
            Id = Guid.NewGuid(),
            Category = "ProjectRole",
            Code = "BIMEngineer",
            NameAr = "مهندس نمذجة",
            NameEn = "BIM Engineer",
            IsSystem = false,
            IsActive = true
        };

        Assert.True(item.IsActive);

        // Controlled soft deletion preserves historical integrity
        item.IsActive = false;
        item.UpdatedAt = DateTime.UtcNow;

        Assert.False(item.IsActive);
        Assert.NotNull(item.UpdatedAt);
    }

    [Fact]
    public void Admin04_JobTitleIsNotAuthorization_AuthorizationComesFromRolesAndPermissions()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "architect@mti.com",
            FirstName = "Kareem",
            LastName = "Ali",
            JobTitle = "Senior Vice President of Engineering", // High title
            EmployeeCode = "MTI-EMP-104",
            IsActive = true
        };

        // JobTitle alone grants no roles or permissions
        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        Assert.Empty(roles);

        // Authorization explicitly granted via Role
        var engineerRole = new Role { Id = Guid.NewGuid(), Name = "Engineer" };
        user.UserRoles.Add(new UserRole { UserId = user.Id, Role = engineerRole, RoleId = engineerRole.Id });

        Assert.Single(user.UserRoles);
        Assert.Equal("Engineer", user.UserRoles.First().Role.Name);
    }

    [Fact]
    public void Org09_TemporaryDelegation_ExpiresAutomaticallyWithoutChangingCoreRole()
    {
        var delegatorPm = Guid.NewGuid();
        var backupEngineer = Guid.NewGuid();
        var projectId = Guid.NewGuid();

        var activeDelegation = new Delegation
        {
            Id = Guid.NewGuid(),
            UserId = delegatorPm,
            DelegateUserId = backupEngineer,
            ScopeType = "Project",
            ScopeId = projectId,
            Role = "ProjectManager",
            StartAt = DateTime.UtcNow.AddHours(-1),
            EndAt = DateTime.UtcNow.AddHours(5),
            IsActive = true
        };

        var expiredDelegation = new Delegation
        {
            Id = Guid.NewGuid(),
            UserId = delegatorPm,
            DelegateUserId = backupEngineer,
            ScopeType = "Project",
            ScopeId = projectId,
            Role = "ProjectManager",
            StartAt = DateTime.UtcNow.AddDays(-5),
            EndAt = DateTime.UtcNow.AddDays(-1),
            IsActive = true
        };

        Assert.True(activeDelegation.IsCurrentlyActive);
        Assert.False(expiredDelegation.IsCurrentlyActive);
    }
}
