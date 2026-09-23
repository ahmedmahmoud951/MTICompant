using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

/// <summary>
/// SECURITY-04 & ORG-10: Centralized Resource Scope Engine and Hierarchical Authorization.
/// Resolves CurrentUser, Roles, Permissions, Departments, Teams, ProjectMemberships, SiteMemberships, and Delegations.
/// Implements parent-child resource inheritance: Company -> Department -> Team -> Project -> Site -> Operation -> Task -> Document -> Media.
/// </summary>
public class ResourceScopeEngine : IResourceScopeEngine
{
    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(3);

    public ResourceScopeEngine(
        AppDbContext context,
        IPermissionService permissionService,
        ICurrentUserService currentUserService,
        IMemoryCache cache)
    {
        _context = context;
        _permissionService = permissionService;
        _currentUserService = currentUserService;
        _cache = cache;
    }

    public async Task<UserScopeContext> ResolveUserScopeContextAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"user_scope:{userId}";
        if (_cache.TryGetValue(cacheKey, out UserScopeContext? cached) && cached != null)
        {
            return cached;
        }

        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            return new UserScopeContext(userId, "Unknown", "", Array.Empty<string>(), Array.Empty<string>(), Array.Empty<Guid>(), Array.Empty<Guid>(), Array.Empty<Guid>(), Array.Empty<Guid>(), Array.Empty<DelegationDto>());
        }

        var roles = user.UserRoles.Select(r => r.Role.Name).Distinct().ToList();
        var permissions = await _permissionService.GetUserPermissionsAsync(userId, cancellationToken);

        // Departments
        var departmentIds = new List<Guid>();
        if (user.UserProfile?.DepartmentId.HasValue == true)
        {
            departmentIds.Add(user.UserProfile.DepartmentId.Value);
        }
        var memberDeptIds = await _context.DepartmentMembers
            .AsNoTracking()
            .Where(dm => dm.UserId == userId && dm.IsActive && dm.LeftAt == null)
            .Select(dm => dm.DepartmentId)
            .ToListAsync(cancellationToken);
        departmentIds.AddRange(memberDeptIds);
        departmentIds = departmentIds.Distinct().ToList();

        // Teams
        var teamIds = await _context.TeamMembers
            .AsNoTracking()
            .Where(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null)
            .Select(tm => tm.TeamId)
            .ToListAsync(cancellationToken);

        // Projects (Direct members + Team projects + RACI)
        var directProjectIds = await _context.ProjectMembers
            .AsNoTracking()
            .Where(pm => pm.UserId == userId && pm.IsActive && pm.RemovedAt == null)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        var teamProjectIds = await _context.ProjectTeams
            .AsNoTracking()
            .Where(pt => pt.IsActive && pt.RemovedAt == null && teamIds.Contains(pt.TeamId))
            .Select(pt => pt.ProjectId)
            .ToListAsync(cancellationToken);

        var raciProjectIds = await _context.ResourceResponsibilities
            .AsNoTracking()
            .Where(r => r.ResourceType == "Project" && r.IsActive
                && (r.UserId == userId || (r.TeamId.HasValue && teamIds.Contains(r.TeamId.Value))))
            .Select(r => r.ResourceId)
            .ToListAsync(cancellationToken);

        var projectIds = directProjectIds.Concat(teamProjectIds).Concat(raciProjectIds).Distinct().ToList();

        // Sites (Direct members + Site assignments + Team sites + RACI + Inherited from ProjectManager)
        var directSiteIds = await _context.SiteMembers
            .AsNoTracking()
            .Where(sm => sm.UserId == userId && sm.IsActive && sm.RemovedAt == null)
            .Select(sm => sm.SiteId)
            .ToListAsync(cancellationToken);

        var assignmentSiteIds = await _context.SiteAssignments
            .AsNoTracking()
            .Where(sa => sa.UserId == userId && sa.RemovedAt == null)
            .Select(sa => sa.SiteId)
            .ToListAsync(cancellationToken);

        var teamSiteIds = await _context.SiteTeams
            .AsNoTracking()
            .Where(st => st.IsActive && st.RemovedAt == null && teamIds.Contains(st.TeamId))
            .Select(st => st.SiteId)
            .ToListAsync(cancellationToken);

        var raciSiteIds = await _context.ResourceResponsibilities
            .AsNoTracking()
            .Where(r => r.ResourceType == "Site" && r.IsActive
                && (r.UserId == userId || (r.TeamId.HasValue && teamIds.Contains(r.TeamId.Value))))
            .Select(r => r.ResourceId)
            .ToListAsync(cancellationToken);

        var siteIds = directSiteIds.Concat(assignmentSiteIds).Concat(teamSiteIds).Concat(raciSiteIds).Distinct().ToList();

        // Active Delegations
        var now = DateTime.UtcNow;
        var delegations = await _context.Delegations
            .AsNoTracking()
            .Where(d => d.DelegateUserId == userId && d.IsActive && d.RevokedAt == null && d.StartAt <= now && now <= d.EndAt)
            .Select(d => new DelegationDto(
                d.Id,
                d.UserId,
                d.User.FullName,
                d.User.Email,
                d.DelegateUserId,
                d.DelegateUser.FullName,
                d.DelegateUser.Email,
                d.ScopeType,
                d.ScopeId,
                d.ScopeType == "Project" ? _context.Projects.Where(p => p.Id == d.ScopeId).Select(p => p.Name).FirstOrDefault() :
                d.ScopeType == "Site" ? _context.Sites.Where(s => s.Id == d.ScopeId).Select(s => s.Name).FirstOrDefault() : null,
                null,
                d.Permissions,
                d.StartAt,
                d.EndAt,
                d.CreatedBy,
                null,
                d.CreatedAt,
                d.IsActive,
                true,
                null
            ))
            .ToListAsync(cancellationToken);

        var contextObj = new UserScopeContext(
            userId,
            user.FullName,
            user.Email,
            roles.AsReadOnly(),
            permissions,
            departmentIds.AsReadOnly(),
            teamIds.AsReadOnly(),
            projectIds.AsReadOnly(),
            siteIds.AsReadOnly(),
            delegations.AsReadOnly()
        );

        _cache.Set(cacheKey, contextObj, CacheDuration);
        return contextObj;
    }

    public async Task<bool> CanAccessScopeAsync(
        Guid userId,
        string permissionCode,
        ResourceScopeType scopeType,
        Guid? scopeId = null,
        CancellationToken cancellationToken = default)
    {
        var scopeCtx = await ResolveUserScopeContextAsync(userId, cancellationToken);

        // 1. SuperAdmin / SystemAdmin / Admin have enterprise-wide access
        if (scopeCtx.Roles.Any(r => r is "SuperAdmin" or "SystemAdmin" or "Admin"))
            return true;

        // 2. Permission presence check
        if (!string.IsNullOrWhiteSpace(permissionCode) &&
            !scopeCtx.Permissions.Contains(permissionCode, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        // 3. Delegation check
        if (scopeCtx.ActiveDelegations.Any(d => d.ScopeType == "Global" || (scopeId.HasValue && d.ScopeId == scopeId)))
            return true;

        // 4. Scope matching
        return scopeType switch
        {
            ResourceScopeType.Global => scopeCtx.Roles.Any(r => r is "SuperAdmin" or "SystemAdmin" or "Admin"),
            ResourceScopeType.Department => !scopeId.HasValue || scopeCtx.DepartmentIds.Contains(scopeId.Value),
            ResourceScopeType.Team => !scopeId.HasValue || scopeCtx.TeamIds.Contains(scopeId.Value),
            ResourceScopeType.Project => !scopeId.HasValue || scopeCtx.ProjectIds.Contains(scopeId.Value),
            ResourceScopeType.Site => !scopeId.HasValue || scopeCtx.SiteIds.Contains(scopeId.Value),
            ResourceScopeType.Own => true,
            _ => false
        };
    }

    public async Task<bool> CanAccessResourceAsync(
        Guid userId,
        string permissionCode,
        ResourceHierarchyType resourceType,
        Guid resourceId,
        CancellationToken cancellationToken = default)
    {
        var scopeCtx = await ResolveUserScopeContextAsync(userId, cancellationToken);

        // 1. Admins have unrestricted enterprise access
        if (scopeCtx.Roles.Any(r => r is "SuperAdmin" or "SystemAdmin" or "Admin"))
            return true;

        // 2. Permission check
        if (!string.IsNullOrWhiteSpace(permissionCode) &&
            !scopeCtx.Permissions.Contains(permissionCode, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        // 3. Dynamic active delegation
        var now = DateTime.UtcNow;
        if (scopeCtx.ActiveDelegations.Any(d => d.ScopeType == "Global" || (d.ScopeId.HasValue && d.ScopeId.Value == resourceId)))
            return true;

        // 4. Hierarchical resolution (ORG-10)
        switch (resourceType)
        {
            case ResourceHierarchyType.Company:
                return scopeCtx.Roles.Any(r => r is "SuperAdmin" or "SystemAdmin" or "Admin");

            case ResourceHierarchyType.Department:
                return scopeCtx.DepartmentIds.Contains(resourceId);

            case ResourceHierarchyType.Team:
                return scopeCtx.TeamIds.Contains(resourceId);

            case ResourceHierarchyType.Project:
                return scopeCtx.ProjectIds.Contains(resourceId);

            case ResourceHierarchyType.Site:
                // Direct site access OR inherited from parent project
                if (scopeCtx.SiteIds.Contains(resourceId))
                    return true;

                var site = await _context.Sites.AsNoTracking().FirstOrDefaultAsync(s => s.Id == resourceId, cancellationToken);
                if (site != null && scopeCtx.ProjectIds.Contains(site.ProjectId))
                    return true;

                return false;

            case ResourceHierarchyType.Operation:
                var op = await _context.SiteOperations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == resourceId, cancellationToken);
                if (op != null)
                {
                    if (scopeCtx.SiteIds.Contains(op.SiteId)) return true;
                    var opSite = await _context.Sites.AsNoTracking().FirstOrDefaultAsync(s => s.Id == op.SiteId, cancellationToken);
                    if (opSite != null && scopeCtx.ProjectIds.Contains(opSite.ProjectId)) return true;
                }
                return false;

            case ResourceHierarchyType.Task:
                var task = await _context.Tasks.AsNoTracking().FirstOrDefaultAsync(t => t.Id == resourceId, cancellationToken);
                if (task != null)
                {
                    // Own task
                    if (task.AssignedToUserId == userId || task.CreatedBy == userId) return true;
                    // Site task
                    if (task.SiteId.HasValue && scopeCtx.SiteIds.Contains(task.SiteId.Value)) return true;
                    // Project task
                    if (scopeCtx.ProjectIds.Contains(task.ProjectId)) return true;
                }
                return false;

            case ResourceHierarchyType.Document:
                var doc = await _context.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == resourceId, cancellationToken);
                if (doc != null)
                {
                    // Project inheritance
                    if (scopeCtx.ProjectIds.Contains(doc.ProjectId)) return true;
                }
                return false;

            case ResourceHierarchyType.Media:
                var media = await _context.MediaFiles.AsNoTracking().FirstOrDefaultAsync(m => m.Id == resourceId, cancellationToken);
                if (media != null)
                {
                    if (media.OwnerUserId == userId || media.CreatedBy == userId) return true;
                    if (media.EntityId.HasValue)
                    {
                        if (string.Equals(media.EntityType, "Project", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(media.EntityType, "ProjectData", StringComparison.OrdinalIgnoreCase))
                        {
                            if (scopeCtx.ProjectIds.Contains(media.EntityId.Value)) return true;
                        }
                        else if (string.Equals(media.EntityType, "Site", StringComparison.OrdinalIgnoreCase))
                        {
                            if (scopeCtx.SiteIds.Contains(media.EntityId.Value)) return true;
                        }
                    }
                }
                return false;

            default:
                return false;
        }
    }
}
