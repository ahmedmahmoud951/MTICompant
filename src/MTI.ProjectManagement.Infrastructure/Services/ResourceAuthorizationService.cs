using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

public class ResourceAuthorizationService : IResourceAuthorizationService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ResourceAuthorizationService(AppDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<bool> CanAccessSiteAsync(Guid userId, Guid siteId, CancellationToken cancellationToken = default)
    {
        // 1. SystemAdmin and Admin have enterprise-wide access
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
            return true;

        // 2. Direct active site membership (SiteMembers / SiteAssignments)
        var hasDirectSiteAccess = await _context.SiteMembers
            .AnyAsync(sm => sm.SiteId == siteId && sm.UserId == userId && sm.IsActive && sm.RemovedAt == null, cancellationToken)
            || await _context.SiteAssignments
            .AnyAsync(sa => sa.UserId == userId && sa.SiteId == siteId && sa.RemovedAt == null, cancellationToken);

        if (hasDirectSiteAccess) return true;

        // 3. Team-level site assignment (SiteTeams)
        var hasTeamSiteAccess = await _context.SiteTeams
            .AnyAsync(st => st.SiteId == siteId && st.IsActive
                && st.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null), cancellationToken);

        if (hasTeamSiteAccess) return true;

        // 4. ProjectManager of the parent project has overarching site supervision
        var site = await _context.Sites.AsNoTracking().FirstOrDefaultAsync(s => s.Id == siteId, cancellationToken);
        if (site != null)
        {
            var isProjectManager = await _context.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == site.ProjectId && pm.UserId == userId && pm.IsActive && pm.RemovedAt == null && pm.ProjectRole == "ProjectManager", cancellationToken);

            if (isProjectManager) return true;
        }

        // 5. ORG-09: Temporary Responsibility Delegation
        var now = DateTime.UtcNow;
        var hasSiteDelegation = await _context.Delegations
            .AnyAsync(d => d.DelegateUserId == userId && d.IsActive && d.RevokedAt == null
                && d.StartAt <= now && now <= d.EndAt
                && (d.ScopeType == "Global" || (d.ScopeType == "Site" && d.ScopeId == siteId) || (site != null && d.ScopeType == "Project" && d.ScopeId == site.ProjectId)), cancellationToken);

        if (hasSiteDelegation) return true;

        // 6. ORG-06: RACI Responsibility Matrix
        var hasRaciSite = await _context.ResourceResponsibilities
            .AnyAsync(r => r.ResourceType == "Site" && r.ResourceId == siteId && r.IsActive
                && (r.UserId == userId || (r.TeamId.HasValue && r.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null))), cancellationToken);

        if (hasRaciSite) return true;

        // Rule ORG-05: Engineer assigned to Site A must not automatically see Site B
        return false;
    }

    public async Task<bool> CanAccessProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        // 1. SystemAdmin and Admin have enterprise-wide access
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
            return true;

        // 2. Direct active project membership (ProjectMembers)
        var isDirectMember = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId && pm.IsActive && pm.RemovedAt == null, cancellationToken);

        if (isDirectMember) return true;

        // 3. Team-level project assignment (ProjectTeams)
        var hasTeamProjectAccess = await _context.ProjectTeams
            .AnyAsync(pt => pt.ProjectId == projectId && pt.IsActive && pt.RemovedAt == null
                && pt.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null), cancellationToken);

        if (hasTeamProjectAccess) return true;

        // 4. Any active site assignment within this project (SiteMembers, SiteAssignments, or SiteTeams)
        var hasSiteAccessInProject = await _context.SiteMembers
            .AnyAsync(sm => sm.Site.ProjectId == projectId && sm.UserId == userId && sm.IsActive && sm.RemovedAt == null, cancellationToken)
            || await _context.SiteAssignments
            .AnyAsync(sa => sa.Site.ProjectId == projectId && sa.UserId == userId && sa.RemovedAt == null, cancellationToken)
            || await _context.SiteTeams
            .AnyAsync(st => st.Site.ProjectId == projectId && st.IsActive
                && st.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null), cancellationToken);

        if (hasSiteAccessInProject) return true;

        // 5. ORG-09: Temporary Responsibility Delegation
        var now = DateTime.UtcNow;
        var hasProjectDelegation = await _context.Delegations
            .AnyAsync(d => d.DelegateUserId == userId && d.IsActive && d.RevokedAt == null
                && d.StartAt <= now && now <= d.EndAt
                && (d.ScopeType == "Global" || (d.ScopeType == "Project" && d.ScopeId == projectId)), cancellationToken);

        if (hasProjectDelegation) return true;

        // 6. ORG-06: RACI Responsibility Matrix
        var hasRaciProject = await _context.ResourceResponsibilities
            .AnyAsync(r => r.ResourceType == "Project" && r.ResourceId == projectId && r.IsActive
                && (r.UserId == userId || (r.TeamId.HasValue && r.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null))), cancellationToken);

        return hasRaciProject;
    }

    public async Task<List<Guid>> GetAuthorizedSiteIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
        {
            return await _context.Sites.Select(s => s.Id).ToListAsync(cancellationToken);
        }

        var now = DateTime.UtcNow;

        // 1. Direct active site memberships
        var directSiteIds = await _context.SiteMembers
            .Where(sm => sm.UserId == userId && sm.IsActive && sm.RemovedAt == null)
            .Select(sm => sm.SiteId)
            .ToListAsync(cancellationToken);

        var assignmentSiteIds = await _context.SiteAssignments
            .Where(sa => sa.UserId == userId && sa.RemovedAt == null)
            .Select(sa => sa.SiteId)
            .ToListAsync(cancellationToken);

        // 2. Team-level site assignments
        var teamSiteIds = await _context.SiteTeams
            .Where(st => st.IsActive && st.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null))
            .Select(st => st.SiteId)
            .ToListAsync(cancellationToken);

        // 3. Sites belonging to projects where user is designated ProjectManager
        var managedProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == userId && pm.IsActive && pm.RemovedAt == null && pm.ProjectRole == "ProjectManager")
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        // Include projects delegated to user as ProjectManager
        var delegatedProjectIds = await _context.Delegations
            .Where(d => d.DelegateUserId == userId && d.IsActive && d.RevokedAt == null && d.StartAt <= now && now <= d.EndAt && d.ScopeType == "Project" && d.ScopeId.HasValue)
            .Select(d => d.ScopeId!.Value)
            .ToListAsync(cancellationToken);

        var allManagedProjectIds = managedProjectIds.Concat(delegatedProjectIds).Distinct().ToList();

        var managedSiteIds = await _context.Sites
            .Where(s => allManagedProjectIds.Contains(s.ProjectId))
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        // 4. Directly delegated sites
        var delegatedSiteIds = await _context.Delegations
            .Where(d => d.DelegateUserId == userId && d.IsActive && d.RevokedAt == null && d.StartAt <= now && now <= d.EndAt && d.ScopeType == "Site" && d.ScopeId.HasValue)
            .Select(d => d.ScopeId!.Value)
            .ToListAsync(cancellationToken);

        // 5. RACI Sites
        var raciSiteIds = await _context.ResourceResponsibilities
            .Where(r => r.ResourceType == "Site" && r.IsActive
                && (r.UserId == userId || (r.TeamId.HasValue && r.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null))))
            .Select(r => r.ResourceId)
            .ToListAsync(cancellationToken);

        return directSiteIds
            .Concat(assignmentSiteIds)
            .Concat(teamSiteIds)
            .Concat(managedSiteIds)
            .Concat(delegatedSiteIds)
            .Concat(raciSiteIds)
            .Distinct()
            .ToList();
    }

    public async Task<List<Guid>> GetAuthorizedProjectIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
        {
            return await _context.Projects.Select(p => p.Id).ToListAsync(cancellationToken);
        }

        // 1. Direct active project memberships
        var directProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == userId && pm.IsActive && pm.RemovedAt == null)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        // 2. Team-level project assignments
        var teamProjectIds = await _context.ProjectTeams
            .Where(pt => pt.IsActive && pt.RemovedAt == null && pt.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null))
            .Select(pt => pt.ProjectId)
            .ToListAsync(cancellationToken);

        // 3. Projects with active site assignments
        var siteProjectIds = await _context.SiteMembers
            .Where(sm => sm.UserId == userId && sm.IsActive && sm.RemovedAt == null)
            .Select(sm => sm.Site.ProjectId)
            .ToListAsync(cancellationToken);

        var assignmentProjectIds = await _context.SiteAssignments
            .Where(sa => sa.UserId == userId && sa.RemovedAt == null)
            .Select(sa => sa.Site.ProjectId)
            .ToListAsync(cancellationToken);

        var teamSiteProjectIds = await _context.SiteTeams
            .Where(st => st.IsActive && st.Team.Members.Any(tm => tm.UserId == userId && tm.IsActive && tm.LeftAt == null))
            .Select(st => st.Site.ProjectId)
            .ToListAsync(cancellationToken);

        return directProjectIds
            .Concat(teamProjectIds)
            .Concat(siteProjectIds)
            .Concat(assignmentProjectIds)
            .Concat(teamSiteProjectIds)
            .Distinct()
            .ToList();
    }
}
