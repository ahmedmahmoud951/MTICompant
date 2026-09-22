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
        // SystemAdmin and Admin have enterprise-wide access
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
            return true;

        // Check if user has an active assignment to this site
        return await _context.SiteAssignments
            .AnyAsync(sa => sa.UserId == userId && sa.SiteId == siteId && sa.RemovedAt == null, cancellationToken);
    }

    public async Task<bool> CanAccessProjectAsync(Guid userId, Guid projectId, CancellationToken cancellationToken = default)
    {
        // SystemAdmin and Admin have enterprise-wide access
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
            return true;

        // Project managers/members assigned to the project
        var isMember = await _context.ProjectMembers
            .AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId, cancellationToken);

        if (isMember) return true;

        // Check if the engineer is assigned to any site within this project
        return await _context.SiteAssignments
            .Include(sa => sa.Site)
            .AnyAsync(sa => sa.UserId == userId && sa.Site.ProjectId == projectId && sa.RemovedAt == null, cancellationToken);
    }

    public async Task<List<Guid>> GetAuthorizedSiteIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
        {
            return await _context.Sites.Select(s => s.Id).ToListAsync(cancellationToken);
        }

        return await _context.SiteAssignments
            .Where(sa => sa.UserId == userId && sa.RemovedAt == null)
            .Select(sa => sa.SiteId)
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<List<Guid>> GetAuthorizedProjectIdsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
        {
            return await _context.Projects.Select(p => p.Id).ToListAsync(cancellationToken);
        }

        // Projects where user is a member OR has an assigned site
        var directProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == userId)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        var siteProjectIds = await _context.SiteAssignments
            .Where(sa => sa.UserId == userId && sa.RemovedAt == null)
            .Select(sa => sa.Site.ProjectId)
            .ToListAsync(cancellationToken);

        return directProjectIds.Concat(siteProjectIds).Distinct().ToList();
    }
}
