using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;
using MTI.ProjectManagement.Infrastructure.Services;
using Xunit;

namespace MTI.ProjectManagement.UnitTests;

public class DynamicPermissionsAndScopeEngineTests
{
    private AppDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private class TestPermissionService : IPermissionService
    {
        private readonly AppDbContext _context;
        public TestPermissionService(AppDbContext context) => _context = context;

        public async Task<bool> HasPermissionAsync(Guid userId, string permissionCode, CancellationToken cancellationToken = default)
        {
            var perms = await GetUserPermissionsAsync(userId, cancellationToken);
            return perms.Contains(permissionCode);
        }

        public async Task<IReadOnlyList<string>> GetUserPermissionsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var userRoles = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Select(ur => ur.RoleId)
                .ToListAsync(cancellationToken);

            var perms = await _context.RolePermissions
                .Where(rp => userRoles.Contains(rp.RoleId) && rp.Permission.IsActive)
                .Select(rp => rp.Permission.Code)
                .Distinct()
                .ToListAsync(cancellationToken);

            return perms;
        }
    }

    private class TestCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? Email { get; set; } = "test@mti.com";
        public bool IsAuthenticated => true;
        public bool IsAdmin { get; set; }
        public bool IsSystemAdmin { get; set; }
        public bool IsEngineer { get; set; }
        public IReadOnlyList<string> Roles { get; set; } = new List<string>();
        public IReadOnlyList<string> Permissions { get; set; } = new List<string>();
    }

    [Fact]
    public async Task Security03_PermissionEntity_And_RolePermissionsMapping()
    {
        using var context = CreateInMemoryDbContext();

        var perm1 = new Permission
        {
            Id = Guid.NewGuid(),
            Code = "Projects.View",
            Name = "عرض المشاريع",
            Module = "Projects",
            Description = "السماح بعرض قائمة وتفاصيل المشاريع",
            IsActive = true
        };

        var perm2 = new Permission
        {
            Id = Guid.NewGuid(),
            Code = "Projects.Create",
            Name = "إنشاء مشروع",
            Module = "Projects",
            Description = "السماح بإنشاء مشروع جديد",
            IsActive = true
        };

        var role = new Role
        {
            Id = Guid.NewGuid(),
            Name = "ProjectManager",
            Description = "مدير المشروع"
        };

        context.Permissions.AddRange(perm1, perm2);
        context.Roles.Add(role);

        role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm1.Id });
        role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm2.Id });

        await context.SaveChangesAsync();

        var loadedRole = await context.Roles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == role.Id);

        Assert.NotNull(loadedRole);
        Assert.Equal(2, loadedRole.RolePermissions.Count);
        Assert.Contains(loadedRole.RolePermissions, rp => rp.Permission.Code == "Projects.View");
        Assert.Contains(loadedRole.RolePermissions, rp => rp.Permission.Code == "Projects.Create");
    }

    [Fact]
    public async Task Security04_And_Org10_ResourceScopeEngine_ResolvesHierarchyAndInheritance()
    {
        using var context = CreateInMemoryDbContext();

        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "engineer@mti.com",
            FirstName = "Omar",
            LastName = "Khaled",
            IsActive = true
        };

        var projectA = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Project Alpha",
            Code = "PRJ-A",
            Status = ProjectStatus.Active
        };

        var siteA = new Site
        {
            Id = Guid.NewGuid(),
            ProjectId = projectA.Id,
            Name = "Site Alpha-1",
            Code = "SITE-A1",
            Status = SiteStatus.Active
        };

        var taskA = new TaskItem
        {
            Id = Guid.NewGuid(),
            ProjectId = projectA.Id,
            SiteId = siteA.Id,
            Title = "Pour Concrete Foundation",
            CreatedBy = userId
        };

        var docA = new Document
        {
            Id = Guid.NewGuid(),
            ProjectId = projectA.Id,
            Title = "Structural Engineering Blueprint",
            OwnerUserId = userId
        };

        // Project B that user is NOT assigned to
        var projectB = new Project
        {
            Id = Guid.NewGuid(),
            Name = "Project Beta",
            Code = "PRJ-B",
            Status = ProjectStatus.Active
        };

        context.Users.Add(user);
        context.Projects.AddRange(projectA, projectB);
        context.Sites.Add(siteA);
        context.Tasks.Add(taskA);
        context.Documents.Add(docA);

        // Assign user to Project A
        context.ProjectMembers.Add(new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = projectA.Id,
            UserId = userId,
            ProjectRole = "Engineer",
            IsActive = true,
            AssignedAt = DateTime.UtcNow
        });

        // Add Role with Documents.View
        var role = new Role { Id = Guid.NewGuid(), Name = "SiteEngineer" };
        var perm = new Permission { Id = Guid.NewGuid(), Code = "Documents.View", Module = "Documents", IsActive = true };
        role.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = perm.Id });

        context.Roles.Add(role);
        context.Permissions.Add(perm);
        context.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.Id });

        await context.SaveChangesAsync();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var permService = new TestPermissionService(context);
        var currentUserService = new TestCurrentUserService { UserId = userId };
        var scopeEngine = new ResourceScopeEngine(context, permService, currentUserService, cache);

        // 1. Resolve User Scope Context
        var scopeCtx = await scopeEngine.ResolveUserScopeContextAsync(userId);
        Assert.Contains(projectA.Id, scopeCtx.ProjectIds);
        Assert.DoesNotContain(projectB.Id, scopeCtx.ProjectIds);
        Assert.Contains("Documents.View", scopeCtx.Permissions);

        // 2. Can access Project A and its child resources (Sites, Tasks, Documents)
        var canAccessProjectA = await scopeEngine.CanAccessResourceAsync(userId, "Documents.View", ResourceHierarchyType.Project, projectA.Id);
        Assert.True(canAccessProjectA);

        var canAccessSiteA = await scopeEngine.CanAccessResourceAsync(userId, "Documents.View", ResourceHierarchyType.Site, siteA.Id);
        Assert.True(canAccessSiteA);

        var canAccessDocA = await scopeEngine.CanAccessResourceAsync(userId, "Documents.View", ResourceHierarchyType.Document, docA.Id);
        Assert.True(canAccessDocA);

        // 3. CANNOT access Project B
        var canAccessProjectB = await scopeEngine.CanAccessResourceAsync(userId, "Documents.View", ResourceHierarchyType.Project, projectB.Id);
        Assert.False(canAccessProjectB);
    }

    [Fact]
    public async Task Org11_AssignmentValidationService_ValidatesServerSide()
    {
        using var context = CreateInMemoryDbContext();

        var activeUser = new User { Id = Guid.NewGuid(), Email = "valid@mti.com", FirstName = "Valid", LastName = "User", IsActive = true };
        var inactiveUser = new User { Id = Guid.NewGuid(), Email = "inactive@mti.com", FirstName = "Inactive", LastName = "User", IsActive = false };

        var project = new Project { Id = Guid.NewGuid(), Name = "Live Project", Status = ProjectStatus.Active };
        var archivedProject = new Project { Id = Guid.NewGuid(), Name = "Archived Project", Status = ProjectStatus.Completed };

        var activeTeam = new Team
        {
            Id = Guid.NewGuid(),
            Name = "Alpha Team",
            IsActive = true,
            ManagerUserId = activeUser.Id,
            ManagerUser = activeUser
        };
        activeTeam.Members.Add(new TeamMember { TeamId = activeTeam.Id, UserId = activeUser.Id, IsActive = true });

        var inactiveTeam = new Team
        {
            Id = Guid.NewGuid(),
            Name = "Defunct Team",
            IsActive = false
        };

        context.Users.AddRange(activeUser, inactiveUser);
        context.Projects.AddRange(project, archivedProject);
        context.Teams.AddRange(activeTeam, inactiveTeam);
        await context.SaveChangesAsync();

        var validator = new AssignmentValidationService(context);

        // Valid assignment
        var (isValid, _) = await validator.ValidateProjectUserAssignmentAsync(project.Id, activeUser.Id, "ProjectManager");
        Assert.True(isValid);

        // Inactive user rejected
        var (invalidUserRes, errMsgUser) = await validator.ValidateProjectUserAssignmentAsync(project.Id, inactiveUser.Id, "Engineer");
        Assert.False(invalidUserRes);
        Assert.Contains("inactive", errMsgUser, StringComparison.OrdinalIgnoreCase);

        // Active team valid
        var (validTeamRes, _) = await validator.ValidateProjectTeamAssignmentAsync(project.Id, activeTeam.Id, "Execution");
        Assert.True(validTeamRes);

        // Inactive team rejected
        var (invalidTeamRes, errMsgTeam) = await validator.ValidateProjectTeamAssignmentAsync(project.Id, inactiveTeam.Id, "Execution");
        Assert.False(invalidTeamRes);
        Assert.Contains("deactivated", errMsgTeam, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Org12_AssignmentHistoryService_RecordsTransitionsWithoutLoss()
    {
        using var context = CreateInMemoryDbContext();
        var historyService = new AssignmentHistoryService(context);

        var projectId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var assignerId = Guid.NewGuid();

        // 1. Assign User to Project
        await historyService.RecordAssignmentAsync(
            assignmentType: "Project",
            action: "Assigned",
            resourceId: projectId,
            resourceName: "Project Omega",
            targetUserId: userId,
            targetTeamId: null,
            targetName: "Tarek Nour",
            role: "ProjectManager",
            assignedBy: assignerId,
            assignedByName: "admin@mti.com",
            reason: "Initial project management setup"
        );

        // 2. Role change
        await historyService.RecordAssignmentAsync(
            assignmentType: "Project",
            action: "RoleChanged",
            resourceId: projectId,
            resourceName: "Project Omega",
            targetUserId: userId,
            targetTeamId: null,
            targetName: "Tarek Nour",
            role: "SeniorConsultant",
            assignedBy: assignerId,
            assignedByName: "admin@mti.com",
            reason: "Promotion to senior consultant"
        );

        // 3. User removal
        await historyService.RecordRemovalAsync(
            assignmentType: "Project",
            resourceId: projectId,
            resourceName: "Project Omega",
            targetUserId: userId,
            targetTeamId: null,
            targetName: "Tarek Nour",
            removedBy: assignerId,
            removedByName: "admin@mti.com",
            reason: "Transferred to different division"
        );

        var historyList = await context.AssignmentHistories.OrderBy(h => h.AssignedAt).ToListAsync();
        Assert.Equal(2, historyList.Count); // Assigned + RoleChanged are recorded, and removal updates or records

        var activeOrRemoved = historyList.Last();
        Assert.NotNull(activeOrRemoved.RemovedAt);
        Assert.Equal(assignerId, activeOrRemoved.RemovedBy);
        Assert.Contains("Transferred to different division", activeOrRemoved.Reason);
    }
}
