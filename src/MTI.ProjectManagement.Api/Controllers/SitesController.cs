using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SitesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IAuditService _auditService;

    public SitesController(
        AppDbContext context,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<SiteDto>>>> GetSites()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        IQueryable<Site> query = _context.Sites
            .Include(s => s.Project)
            .Include(s => s.Assignments)
                .ThenInclude(a => a.User)
            .Where(s => !s.IsDeleted);

        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(userId.Value);
            query = query.Where(s => authorizedSiteIds.Contains(s.Id));
        }

        var siteEntities = await query.OrderByDescending(s => s.CreatedAt).ToListAsync();

        var sites = siteEntities.Select(s => new SiteDto(
            s.Id,
            s.ProjectId,
            s.Project.Name,
            s.Code,
            s.Name,
            s.Description,
            s.Address,
            s.Latitude,
            s.Longitude,
            s.Status,
            s.CreatedAt,
            s.Assignments.Where(a => a.IsActive).Select(a => new SiteAssignmentDto(
                a.Id,
                a.SiteId,
                a.UserId,
                a.User.FullName,
                a.User.Email,
                a.Role,
                a.IsPrimary,
                a.AssignedAt
            )).ToList()
        )).ToList();

        return Ok(ApiResponse<List<SiteDto>>.Ok(sites));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SiteDto>>> GetSiteById(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessSiteAsync(userId.Value, id);
        if (!canAccess) return Forbid();

        var site = await _context.Sites
            .Include(s => s.Project)
            .Include(s => s.Assignments)
                .ThenInclude(a => a.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (site == null) return NotFound(ApiResponse<SiteDto>.Fail("Site not found."));

        var dto = new SiteDto(
            site.Id,
            site.ProjectId,
            site.Project.Name,
            site.Code,
            site.Name,
            site.Description,
            site.Address,
            site.Latitude,
            site.Longitude,
            site.Status,
            site.CreatedAt,
            site.Assignments.Where(a => a.IsActive).Select(a => new SiteAssignmentDto(
                a.Id,
                a.SiteId,
                a.UserId,
                a.User.FullName,
                a.User.Email,
                a.Role,
                a.IsPrimary,
                a.AssignedAt
            )).ToList()
        );

        return Ok(ApiResponse<SiteDto>.Ok(dto));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SiteDto>>> UpdateSite(Guid id, [FromBody] UpdateSiteRequest request)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SitesUpdate))
        {
            return Forbid();
        }

        var site = await _context.Sites
            .Include(s => s.Project)
            .Include(s => s.Assignments)
                .ThenInclude(a => a.User)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (site == null) return NotFound(ApiResponse<SiteDto>.Fail("Site not found."));

        var oldValues = new { site.Name, site.Description, site.Address, site.Latitude, site.Longitude, site.Status };

        site.Name = request.Name.Trim();
        site.Description = request.Description?.Trim() ?? string.Empty;
        site.Address = request.Address?.Trim() ?? string.Empty;
        site.Latitude = request.Latitude;
        site.Longitude = request.Longitude;
        site.Status = request.Status;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UpdateSite", "Site", site.Id.ToString(), oldValues, request);

        var dto = new SiteDto(
            site.Id,
            site.ProjectId,
            site.Project.Name,
            site.Code,
            site.Name,
            site.Description,
            site.Address,
            site.Latitude,
            site.Longitude,
            site.Status,
            site.CreatedAt,
            site.Assignments.Where(a => a.IsActive).Select(a => new SiteAssignmentDto(
                a.Id,
                a.SiteId,
                a.UserId,
                a.User.FullName,
                a.User.Email,
                a.Role,
                a.IsPrimary,
                a.AssignedAt
            )).ToList()
        );

        return Ok(ApiResponse<SiteDto>.Ok(dto, "Site updated successfully."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteSite(Guid id)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SitesDelete))
        {
            return Forbid();
        }

        var site = await _context.Sites.FindAsync(id);
        if (site == null) return NotFound(ApiResponse<bool>.Fail("Site not found."));

        _context.Sites.Remove(site);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("DeleteSite", "Site", id.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Site deleted successfully."));
    }

    [HttpPost("{id:guid}/assignments")]
    public async Task<ActionResult<ApiResponse<SiteAssignmentDto>>> AssignEngineer(Guid id, [FromBody] AssignEngineerRequest request)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SitesAssign))
        {
            return Forbid();
        }

        var site = await _context.Sites.FindAsync(id);
        if (site == null) return NotFound(ApiResponse<SiteAssignmentDto>.Fail("Site not found."));

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null || !user.IsActive) return BadRequest(ApiResponse<SiteAssignmentDto>.Fail("User is invalid or inactive."));

        // Check if already actively assigned
        var existing = await _context.SiteAssignments.FirstOrDefaultAsync(sa => sa.SiteId == id && sa.UserId == request.UserId && sa.RemovedAt == null);
        if (existing != null)
        {
            existing.Role = request.Role;
            existing.IsPrimary = request.IsPrimary;
            await _context.SaveChangesAsync();

            var updatedDto = new SiteAssignmentDto(existing.Id, existing.SiteId, existing.UserId, user.FullName, user.Email, existing.Role, existing.IsPrimary, existing.AssignedAt);
            return Ok(ApiResponse<SiteAssignmentDto>.Ok(updatedDto, "Site assignment updated."));
        }

        var assignment = new SiteAssignment
        {
            SiteId = id,
            UserId = request.UserId,
            Role = request.Role,
            IsPrimary = request.IsPrimary,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = _currentUserService.UserId
        };

        _context.SiteAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AssignEngineer", "SiteAssignment", assignment.Id.ToString(), null, assignment);

        var dto = new SiteAssignmentDto(
            assignment.Id,
            assignment.SiteId,
            assignment.UserId,
            user.FullName,
            user.Email,
            assignment.Role,
            assignment.IsPrimary,
            assignment.AssignedAt
        );

        return Ok(ApiResponse<SiteAssignmentDto>.Ok(dto, "Engineer assigned to site successfully."));
    }

    [HttpDelete("{id:guid}/assignments/{assignmentId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveAssignment(Guid id, Guid assignmentId)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SitesAssign))
        {
            return Forbid();
        }

        var assignment = await _context.SiteAssignments.FirstOrDefaultAsync(sa => sa.Id == assignmentId && sa.SiteId == id && sa.RemovedAt == null);
        if (assignment == null) return NotFound(ApiResponse<bool>.Fail("Active assignment not found."));

        assignment.RemovedAt = DateTime.UtcNow;
        assignment.RemovedBy = _currentUserService.UserId;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("RemoveEngineerAssignment", "SiteAssignment", assignmentId.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Engineer assignment removed."));
    }

    // ==========================================
    // ORG-05: Site Members (Prompt ORG-05)
    // ==========================================

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<ApiResponse<List<SiteMemberDto>>>> GetSiteMembers(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessSiteAsync(userId.Value, id);
        if (!canAccess) return Forbid();

        var members = await _context.SiteMembers
            .Include(sm => sm.Site).ThenInclude(s => s.Project)
            .Include(sm => sm.User)
            .Where(sm => sm.SiteId == id)
            .OrderByDescending(sm => sm.IsActive)
            .ThenBy(sm => sm.SiteRole)
            .ToListAsync();

        var dtos = members.Select(sm => new SiteMemberDto(
            sm.Id,
            sm.SiteId,
            sm.Site.Name,
            sm.Site.ProjectId,
            sm.Site.Project.Name,
            sm.UserId,
            sm.User.FullName,
            sm.User.Email,
            sm.SiteRole,
            sm.IsPrimary,
            sm.AssignedAt,
            sm.AssignedBy,
            null,
            sm.RemovedAt,
            sm.IsActive
        )).ToList();

        return Ok(ApiResponse<List<SiteMemberDto>>.Ok(dtos));
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<ApiResponse<SiteMemberDto>>> AddSiteMember(Guid id, [FromBody] AddSiteMemberRequest request)
    {
        if (!await CanManageSiteAsync(id)) return Forbid();

        var site = await _context.Sites.Include(s => s.Project).FirstOrDefaultAsync(s => s.Id == id);
        if (site == null) return NotFound(ApiResponse<SiteMemberDto>.Fail("Site not found."));

        var user = await _context.Users.FindAsync(request.UserId);
        if (user == null || !user.IsActive) return BadRequest(ApiResponse<SiteMemberDto>.Fail("User is invalid or inactive."));

        var existing = await _context.SiteMembers.FirstOrDefaultAsync(sm => sm.SiteId == id && sm.UserId == request.UserId && sm.IsActive);
        if (existing != null)
        {
            existing.SiteRole = request.SiteRole;
            existing.IsPrimary = request.IsPrimary;
            await _context.SaveChangesAsync();

            var updatedDto = new SiteMemberDto(existing.Id, existing.SiteId, site.Name, site.ProjectId, site.Project.Name, existing.UserId, user.FullName, user.Email, existing.SiteRole, existing.IsPrimary, existing.AssignedAt, existing.AssignedBy, null, existing.RemovedAt, existing.IsActive);
            return Ok(ApiResponse<SiteMemberDto>.Ok(updatedDto, "Site member updated."));
        }

        var member = new SiteMember
        {
            SiteId = id,
            UserId = request.UserId,
            SiteRole = request.SiteRole,
            IsPrimary = request.IsPrimary,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = _currentUserService.UserId,
            IsActive = true
        };

        _context.SiteMembers.Add(member);

        // Sync with legacy SiteAssignments table if not already present
        var legacyExisting = await _context.SiteAssignments.FirstOrDefaultAsync(sa => sa.SiteId == id && sa.UserId == request.UserId && sa.RemovedAt == null);
        if (legacyExisting == null)
        {
            _context.SiteAssignments.Add(new SiteAssignment
            {
                SiteId = id,
                UserId = request.UserId,
                Role = request.SiteRole,
                IsPrimary = request.IsPrimary,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = _currentUserService.UserId
            });
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("AddSiteMember", "SiteMember", member.Id.ToString(), null, member);

        var dto = new SiteMemberDto(
            member.Id,
            member.SiteId,
            site.Name,
            site.ProjectId,
            site.Project.Name,
            member.UserId,
            user.FullName,
            user.Email,
            member.SiteRole,
            member.IsPrimary,
            member.AssignedAt,
            member.AssignedBy,
            null,
            member.RemovedAt,
            member.IsActive
        );

        return Ok(ApiResponse<SiteMemberDto>.Ok(dto, "Site member added successfully."));
    }

    [HttpPut("{id:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<ApiResponse<SiteMemberDto>>> UpdateSiteMember(Guid id, Guid memberId, [FromBody] UpdateSiteMemberRequest request)
    {
        if (!await CanManageSiteAsync(id)) return Forbid();

        var member = await _context.SiteMembers
            .Include(sm => sm.Site).ThenInclude(s => s.Project)
            .Include(sm => sm.User)
            .FirstOrDefaultAsync(sm => sm.Id == memberId && sm.SiteId == id);

        if (member == null) return NotFound(ApiResponse<SiteMemberDto>.Fail("Site member not found."));

        member.SiteRole = request.SiteRole;
        member.IsPrimary = request.IsPrimary;
        if (!request.IsActive && member.IsActive)
        {
            member.IsActive = false;
            member.RemovedAt = DateTime.UtcNow;
        }
        else if (request.IsActive && !member.IsActive)
        {
            member.IsActive = true;
            member.RemovedAt = null;
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("UpdateSiteMember", "SiteMember", member.Id.ToString(), null, request);

        var dto = new SiteMemberDto(
            member.Id,
            member.SiteId,
            member.Site.Name,
            member.Site.ProjectId,
            member.Site.Project.Name,
            member.UserId,
            member.User.FullName,
            member.User.Email,
            member.SiteRole,
            member.IsPrimary,
            member.AssignedAt,
            member.AssignedBy,
            null,
            member.RemovedAt,
            member.IsActive
        );

        return Ok(ApiResponse<SiteMemberDto>.Ok(dto, "Site member updated successfully."));
    }

    [HttpDelete("{id:guid}/members/{memberId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveSiteMember(Guid id, Guid memberId)
    {
        if (!await CanManageSiteAsync(id)) return Forbid();

        var member = await _context.SiteMembers.FirstOrDefaultAsync(sm => sm.Id == memberId && sm.SiteId == id && sm.IsActive);
        if (member == null) return NotFound(ApiResponse<bool>.Fail("Active site member not found."));

        // Historical preservation: soft inactivation
        member.IsActive = false;
        member.RemovedAt = DateTime.UtcNow;

        // Sync legacy SiteAssignments
        var legacy = await _context.SiteAssignments.FirstOrDefaultAsync(sa => sa.SiteId == id && sa.UserId == member.UserId && sa.RemovedAt == null);
        if (legacy != null)
        {
            legacy.RemovedAt = DateTime.UtcNow;
            legacy.RemovedBy = _currentUserService.UserId;
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("RemoveSiteMember", "SiteMember", memberId.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Site member removed successfully (history preserved)."));
    }

    // ==========================================
    // ORG-05: Site Teams (Prompt ORG-05)
    // ==========================================

    [HttpGet("{id:guid}/teams")]
    public async Task<ActionResult<ApiResponse<List<SiteTeamDto>>>> GetSiteTeams(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessSiteAsync(userId.Value, id);
        if (!canAccess) return Forbid();

        var siteTeams = await _context.SiteTeams
            .Include(st => st.Site)
            .Include(st => st.Team).ThenInclude(t => t.Members)
            .Where(st => st.SiteId == id)
            .OrderByDescending(st => st.IsActive)
            .ToListAsync();

        var dtos = siteTeams.Select(st => new SiteTeamDto(
            st.Id,
            st.SiteId,
            st.Site.Name,
            st.TeamId,
            st.Team.Name,
            st.Team.Code,
            null,
            st.TeamRole,
            st.Team.Members.Count(m => m.IsActive),
            st.AssignedAt,
            st.AssignedBy,
            null,
            st.RemovedAt,
            st.IsActive
        )).ToList();

        return Ok(ApiResponse<List<SiteTeamDto>>.Ok(dtos));
    }

    [HttpPost("{id:guid}/teams")]
    public async Task<ActionResult<ApiResponse<SiteTeamDto>>> AssignSiteTeam(Guid id, [FromBody] AssignSiteTeamRequest request)
    {
        if (!await CanManageSiteAsync(id)) return Forbid();

        var site = await _context.Sites.FindAsync(id);
        if (site == null) return NotFound(ApiResponse<SiteTeamDto>.Fail("Site not found."));

        var team = await _context.Teams.Include(t => t.Members).FirstOrDefaultAsync(t => t.Id == request.TeamId);
        if (team == null || !team.IsActive) return BadRequest(ApiResponse<SiteTeamDto>.Fail("Team is invalid or inactive."));

        var existing = await _context.SiteTeams.FirstOrDefaultAsync(st => st.SiteId == id && st.TeamId == request.TeamId && st.IsActive);
        if (existing != null)
        {
            existing.TeamRole = request.TeamRole;
            await _context.SaveChangesAsync();

            var updatedDto = new SiteTeamDto(existing.Id, existing.SiteId, site.Name, existing.TeamId, team.Name, team.Code, null, existing.TeamRole, team.Members.Count(m => m.IsActive), existing.AssignedAt, existing.AssignedBy, null, existing.RemovedAt, existing.IsActive);
            return Ok(ApiResponse<SiteTeamDto>.Ok(updatedDto, "Site team updated."));
        }

        var siteTeam = new SiteTeam
        {
            SiteId = id,
            TeamId = request.TeamId,
            TeamRole = request.TeamRole,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = _currentUserService.UserId,
            IsActive = true
        };

        _context.SiteTeams.Add(siteTeam);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AssignSiteTeam", "SiteTeam", siteTeam.Id.ToString(), null, siteTeam);

        var dto = new SiteTeamDto(
            siteTeam.Id,
            siteTeam.SiteId,
            site.Name,
            siteTeam.TeamId,
            team.Name,
            team.Code,
            null,
            siteTeam.TeamRole,
            team.Members.Count(m => m.IsActive),
            siteTeam.AssignedAt,
            siteTeam.AssignedBy,
            null,
            siteTeam.RemovedAt,
            siteTeam.IsActive
        );

        return Ok(ApiResponse<SiteTeamDto>.Ok(dto, "Team assigned to site successfully."));
    }

    [HttpDelete("{id:guid}/teams/{siteTeamId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveSiteTeam(Guid id, Guid siteTeamId)
    {
        if (!await CanManageSiteAsync(id)) return Forbid();

        var siteTeam = await _context.SiteTeams.FirstOrDefaultAsync(st => st.Id == siteTeamId && st.SiteId == id && st.IsActive);
        if (siteTeam == null) return NotFound(ApiResponse<bool>.Fail("Active site team assignment not found."));

        siteTeam.IsActive = false;
        siteTeam.RemovedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("RemoveSiteTeam", "SiteTeam", siteTeamId.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Team removed from site successfully (history preserved)."));
    }

    private async Task<bool> CanManageSiteAsync(Guid siteId)
    {
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin || _currentUserService.Permissions.Contains(Permissions.SitesAssign))
            return true;

        if (_currentUserService.UserId.HasValue)
        {
            var site = await _context.Sites.AsNoTracking().FirstOrDefaultAsync(s => s.Id == siteId);
            if (site != null)
            {
                return await _context.ProjectMembers.AnyAsync(pm =>
                    pm.ProjectId == site.ProjectId &&
                    pm.UserId == _currentUserService.UserId.Value &&
                    pm.IsActive &&
                    pm.RemovedAt == null &&
                    pm.ProjectRole == "ProjectManager");
            }
        }

        return false;
    }
}

