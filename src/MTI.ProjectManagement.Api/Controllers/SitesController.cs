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
}
