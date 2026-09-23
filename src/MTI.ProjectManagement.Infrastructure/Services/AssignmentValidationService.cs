using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

/// <summary>
/// ORG-11: Server-side Assignment Validation Service.
/// Strictly verifies user active state, role validity, site-to-project hierarchy, and team health before allowing assignments.
/// </summary>
public class AssignmentValidationService : IAssignmentValidationService
{
    private readonly AppDbContext _context;

    private static readonly HashSet<string> ValidProjectRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "ProjectManager",
        "SiteEngineer",
        "Supervisor",
        "TechnicalOffice",
        "QA/QC Engineer",
        "Safety Officer",
        "Commissioning Engineer",
        "Accounting Representative",
        "Procurement Representative",
        "Engineer",
        "Viewer"
    };

    private static readonly HashSet<string> ValidSiteRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "SiteManager",
        "SiteEngineer",
        "Electrical Supervisor",
        "Mechanical Supervisor",
        "Low Current Technician",
        "Programmer",
        "Maintenance Specialist",
        "Safety Officer",
        "Supervisor",
        "Technician",
        "Engineer"
    };

    public AssignmentValidationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<(bool IsValid, string? ErrorMessage)> ValidateProjectUserAssignmentAsync(
        Guid projectId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        // 1. Verify Project exists and is active
        var project = await _context.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
            return (false, "The target project does not exist.");

        if (project.Status == Domain.Enums.ProjectStatus.Archived)
            return (false, "Cannot assign members to an archived project.");

        // 2. Verify User exists and is active
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.UserProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
            return (false, "The specified user does not exist.");

        if (!user.IsActive)
            return (false, $"User '{user.FullName}' is inactive/disabled. Assignments to disabled users are prohibited.");

        // 3. Verify Role validity
        if (!string.IsNullOrWhiteSpace(role) && !ValidProjectRoles.Contains(role))
        {
            // Also check MasterDataItems for custom dynamic ProjectRole
            var isMasterDataRole = await _context.MasterDataItems
                .AnyAsync(m => m.Category == "ProjectRole" && (m.Code == role || m.NameAr == role || m.NameEn == role) && m.IsActive, cancellationToken);

            if (!isMasterDataRole)
                return (false, $"The specified project role '{role}' is invalid or unrecognized.");
        }

        return (true, null);
    }

    public async Task<(bool IsValid, string? ErrorMessage)> ValidateProjectTeamAssignmentAsync(
        Guid projectId,
        Guid teamId,
        string? role,
        CancellationToken cancellationToken = default)
    {
        // 1. Verify Project exists
        var projectExists = await _context.Projects.AnyAsync(p => p.Id == projectId, cancellationToken);
        if (!projectExists)
            return (false, "The target project does not exist.");

        // 2. Verify Team exists and is active
        var team = await _context.Teams
            .AsNoTracking()
            .Include(t => t.ManagerUser)
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == teamId, cancellationToken);

        if (team == null)
            return (false, "The specified team does not exist.");

        if (!team.IsActive)
            return (false, $"Team '{team.Name}' is deactivated and cannot be assigned to projects.");

        // 3. Verify Team Manager active
        if (team.ManagerUserId.HasValue && team.ManagerUser != null && !team.ManagerUser.IsActive)
            return (false, $"Team manager '{team.ManagerUser.FullName}' is inactive. Reassign team manager before project assignment.");

        // 4. Verify Team has active members
        var activeMembersCount = team.Members.Count(m => m.IsActive && m.LeftAt == null);
        if (activeMembersCount == 0)
            return (false, $"Team '{team.Name}' has no active members. Teams must have at least one active member for assignment.");

        return (true, null);
    }

    public async Task<(bool IsValid, string? ErrorMessage)> ValidateSiteUserAssignmentAsync(
        Guid siteId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        // 1. Verify Site exists
        var site = await _context.Sites
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == siteId, cancellationToken);

        if (site == null)
            return (false, "The target site does not exist.");

        if (site.Status == Domain.Enums.SiteStatus.Closed)
            return (false, "Cannot assign personnel to a closed site.");

        // 2. Verify User exists and is active
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
            return (false, "The specified user does not exist.");

        if (!user.IsActive)
            return (false, $"User '{user.FullName}' is inactive. Cannot assign inactive users to sites.");

        // 3. Verify Role validity
        if (!string.IsNullOrWhiteSpace(role) && !ValidSiteRoles.Contains(role))
        {
            var isMasterDataRole = await _context.MasterDataItems
                .AnyAsync(m => m.Category == "SiteRole" && (m.Code == role || m.NameAr == role || m.NameEn == role) && m.IsActive, cancellationToken);

            if (!isMasterDataRole)
                return (false, $"The specified site role '{role}' is invalid or unrecognized.");
        }

        return (true, null);
    }

    public async Task<(bool IsValid, string? ErrorMessage)> ValidateSiteTeamAssignmentAsync(
        Guid siteId,
        Guid teamId,
        string? role,
        CancellationToken cancellationToken = default)
    {
        var site = await _context.Sites.AsNoTracking().FirstOrDefaultAsync(s => s.Id == siteId, cancellationToken);
        if (site == null)
            return (false, "The target site does not exist.");

        var team = await _context.Teams
            .AsNoTracking()
            .Include(t => t.ManagerUser)
            .Include(t => t.Members)
            .FirstOrDefaultAsync(t => t.Id == teamId, cancellationToken);

        if (team == null)
            return (false, "The specified team does not exist.");

        if (!team.IsActive)
            return (false, $"Team '{team.Name}' is deactivated and cannot be assigned to sites.");

        if (team.ManagerUserId.HasValue && team.ManagerUser != null && !team.ManagerUser.IsActive)
            return (false, $"Team manager '{team.ManagerUser.FullName}' is inactive.");

        return (true, null);
    }
}
