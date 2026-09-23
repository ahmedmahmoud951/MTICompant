using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;

    public ProjectsController(
        AppDbContext context,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService,
        IAuditService auditService,
        INotificationService notificationService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
        _auditService = auditService;
        _notificationService = notificationService;
    }

    /// <summary>
    /// Retrieves paginated list of projects scoped by user role and assignments.
    /// </summary>
    /// <param name="search">Optional text filter for name, code, or client</param>
    /// <param name="status">Optional filter by project status</param>
    /// <param name="pageNumber">Page number starting at 1</param>
    /// <param name="pageSize">Number of records per page (default 10)</param>
    /// <response code="200">List of authorized projects</response>
    /// <response code="401">Unauthorized request</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResult<ProjectDto>>), 200)]
    [ProducesResponseType(401)]
    public async Task<ActionResult<ApiResponse<PagedResult<ProjectDto>>>> GetProjects(
        [FromQuery] string? search = null,
        [FromQuery] ProjectStatus? status = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        IQueryable<Project> query = _context.Projects.Include(p => p.Sites);

        // Server-side resource authorization scoping:
        // Engineers and non-admins only see projects they are assigned to
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin)
        {
            var authorizedProjectIds = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(userId.Value);
            query = query.Where(p => authorizedProjectIds.Contains(p.Id));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(s) || p.Code.ToLower().Contains(s) || p.ClientName.ToLower().Contains(s));
        }

        if (status.HasValue)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProjectDto(
                p.Id,
                p.Code,
                p.Name,
                p.Description,
                p.ClientName,
                p.Status,
                p.Type,
                p.ProgressPercentage,
                p.StartDate,
                p.EndDate,
                p.Sites.Count(s => !s.IsDeleted),
                p.CreatedAt,
                p.CoverImageUrl
            ))
            .ToListAsync();

        var paged = new PagedResult<ProjectDto>(items, totalCount, pageNumber, pageSize);
        return Ok(ApiResponse<PagedResult<ProjectDto>>.Ok(paged));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProjectDetailDto>>> GetProjectById(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var hasAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, id);
        if (!hasAccess)
        {
            return Forbid();
        }

        var project = await _context.Projects
            .Include(p => p.Sites)
                .ThenInclude(s => s.Assignments)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (project == null) return NotFound(ApiResponse<ProjectDetailDto>.Fail("Project not found."));

        // If Engineer, only show assigned sites in project detail
        IEnumerable<Site> visibleSites = project.Sites.Where(s => !s.IsDeleted);
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(userId.Value);
            visibleSites = visibleSites.Where(s => authorizedSiteIds.Contains(s.Id));
        }

        var siteDtos = visibleSites.Select(s => new SiteSummaryDto(
            s.Id,
            s.Code,
            s.Name,
            s.Address,
            s.Status,
            s.Assignments.Count(a => a.IsActive)
        )).ToList();

        var dto = new ProjectDetailDto(
            project.Id,
            project.Code,
            project.Name,
            project.Description,
            project.ClientName,
            project.Status,
            project.Type,
            project.ProgressPercentage,
            project.StartDate,
            project.EndDate,
            project.CreatedAt,
            siteDtos,
            project.CoverImageUrl
        );

        return Ok(ApiResponse<ProjectDetailDto>.Ok(dto));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> CreateProject([FromBody] CreateProjectRequest request)
    {
        if (!CanManageProjects(Permissions.ProjectsCreate))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<ProjectDto>.Fail("Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø´Ø±ÙˆØ¹. Ø³Ø¬Ù‘Ù„ Ø¯Ø®ÙˆÙ„ Ø¨Ø­Ø³Ø§Ø¨ Admin Ø«Ù… Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©."));
        }

        if (request == null || string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(ApiResponse<ProjectDto>.Fail("ÙƒÙˆØ¯ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ÙˆØ§Ù„Ø§Ø³Ù… Ù…Ø·Ù„ÙˆØ¨Ø§Ù† â€” ÙŠÙ…ÙƒÙ† ÙƒØªØ§Ø¨Ø© Ø£Ø±Ù‚Ø§Ù… Ø£Ùˆ Ø­Ø±ÙˆÙ Ø¨Ø­Ø±ÙŠØ©."));
        }

        var exists = await _context.Projects.AnyAsync(p => p.Code.ToLower() == request.Code.Trim().ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<ProjectDto>.Fail($"Project code '{request.Code}' already exists."));
        }

        var project = new Project
        {
            Code = request.Code.Trim().ToUpper(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            ClientName = request.ClientName?.Trim() ?? string.Empty,
            Status = request.Status,
            Type = request.Type,
            ProgressPercentage = request.ProgressPercentage,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl) ? null : request.CoverImageUrl.Trim()
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        if (request.MemberUserIds != null && request.MemberUserIds.Count > 0)
        {
            await AddProjectMembersAsync(project, request.MemberUserIds.Distinct().ToList());
        }

        await _auditService.LogAsync("CreateProject", "Project", project.Id.ToString(), null, project);

        var dto = new ProjectDto(
            project.Id,
            project.Code,
            project.Name,
            project.Description,
            project.ClientName,
            project.Status,
            project.Type,
            project.ProgressPercentage,
            project.StartDate,
            project.EndDate,
            0,
            project.CreatedAt,
            project.CoverImageUrl
        );

        return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, ApiResponse<ProjectDto>.Ok(dto, "Project created successfully."));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(Guid id, [FromBody] UpdateProjectRequest request)
    {
        if (!CanManageProjects(Permissions.ProjectsUpdate))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<ProjectDto>.Fail("Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹."));
        }

        var project = await _context.Projects.Include(p => p.Sites).FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(ApiResponse<ProjectDto>.Fail("Project not found."));

        var oldValues = new { project.Name, project.Description, project.ClientName, project.Status, project.StartDate, project.EndDate };

        project.Name = request.Name.Trim();
        project.Description = request.Description?.Trim() ?? string.Empty;
        project.ClientName = request.ClientName?.Trim() ?? string.Empty;
        if (request.Status.HasValue) project.Status = request.Status.Value;
        if (request.Type.HasValue) project.Type = request.Type.Value;
        if (request.ProgressPercentage.HasValue) project.ProgressPercentage = request.ProgressPercentage.Value;
        if (request.StartDate.HasValue) project.StartDate = request.StartDate;
        if (request.EndDate.HasValue) project.EndDate = request.EndDate;
        project.CoverImageUrl = string.IsNullOrWhiteSpace(request.CoverImageUrl)
            ? null
            : request.CoverImageUrl.Trim();

        await _context.SaveChangesAsync();

        if (request.MemberUserIds != null)
        {
            await SyncProjectMembersAsync(project, request.MemberUserIds.Distinct().ToList());
        }

        var memberIds = await _context.ProjectMembers
            .Where(pm => pm.ProjectId == project.Id)
            .Select(pm => pm.UserId)
            .ToListAsync();

        if (memberIds.Count > 0)
        {
            await _notificationService.NotifyProjectUpdatedAsync(project.Id, project.Name, memberIds);
        }

        await _auditService.LogAsync("UpdateProject", "Project", project.Id.ToString(), oldValues, request);

        var dto = new ProjectDto(
            project.Id,
            project.Code,
            project.Name,
            project.Description,
            project.ClientName,
            project.Status,
            project.Type,
            project.ProgressPercentage,
            project.StartDate,
            project.EndDate,
            project.Sites.Count(s => !s.IsDeleted),
            project.CreatedAt,
            project.CoverImageUrl
        );

        return Ok(ApiResponse<ProjectDto>.Ok(dto, "Project updated successfully."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteProject(Guid id)
    {
        if (!CanManageProjects(Permissions.ProjectsDelete))
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                ApiResponse<bool>.Fail("Ù„ÙŠØ³ Ù„Ø¯ÙŠÙƒ ØµÙ„Ø§Ø­ÙŠØ© Ø­Ø°Ù Ø§Ù„Ù…Ø´Ø±ÙˆØ¹."));
        }

        var project = await _context.Projects.FindAsync(id);
        if (project == null) return NotFound(ApiResponse<bool>.Fail("Project not found."));

        _context.Projects.Remove(project); // Triggers soft delete query filter
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("DeleteProject", "Project", id.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Project deleted successfully."));
    }

    [HttpGet("{id:guid}/sites")]
    public async Task<ActionResult<ApiResponse<List<SiteDto>>>> GetProjectSites(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var hasAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, id);
        if (!hasAccess) return Forbid();

        IQueryable<Site> query = _context.Sites
            .Include(s => s.Project)
            .Include(s => s.Assignments)
                .ThenInclude(a => a.User)
            .Where(s => s.ProjectId == id);

        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(userId.Value);
            query = query.Where(s => authorizedSiteIds.Contains(s.Id));
        }

        var siteEntities = await query
            .OrderBy(s => s.Code)
            .ToListAsync();

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

    [HttpPost("{id:guid}/sites")]
    public async Task<ActionResult<ApiResponse<SiteDto>>> CreateProjectSite(Guid id, [FromBody] CreateSiteRequest request)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SitesCreate))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(id);
        if (project == null) return NotFound(ApiResponse<SiteDto>.Fail("Project not found."));

        var exists = await _context.Sites.AnyAsync(s => s.ProjectId == id && s.Code.ToLower() == request.Code.Trim().ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<SiteDto>.Fail($"Site code '{request.Code}' already exists in this project."));
        }

        var site = new Site
        {
            ProjectId = id,
            Code = request.Code.Trim().ToUpper(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Address = request.Address?.Trim() ?? string.Empty,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Status = request.Status
        };

        _context.Sites.Add(site);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateSite", "Site", site.Id.ToString(), null, site);

        var dto = new SiteDto(
            site.Id,
            site.ProjectId,
            project.Name,
            site.Code,
            site.Name,
            site.Description,
            site.Address,
            site.Latitude,
            site.Longitude,
            site.Status,
            site.CreatedAt,
            new List<SiteAssignmentDto>()
        );

        return Ok(ApiResponse<SiteDto>.Ok(dto, "Site created successfully."));
    }

    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<ApiResponse<List<ProjectMemberDto>>>> GetProjectMembers(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var hasAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, id);
        if (!hasAccess) return Forbid();

        var members = await _context.ProjectMembers
            .AsNoTracking()
            .Include(pm => pm.User)
            .Where(pm => pm.ProjectId == id)
            .OrderBy(pm => pm.User.FirstName)
            .Select(pm => new ProjectMemberDto(
                pm.Id,
                pm.ProjectId,
                pm.UserId,
                pm.User.FirstName + " " + pm.User.LastName,
                pm.User.Email,
                pm.Role,
                pm.JoinedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProjectMemberDto>>.Ok(members));
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<ApiResponse<ProjectMemberDto>>> AssignProjectMember(Guid id, [FromBody] AssignProjectMemberRequest request)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.ProjectsUpdate))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(id);
        if (project == null) return NotFound(ApiResponse<ProjectMemberDto>.Fail("Project not found."));

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId && !u.IsDeleted && u.IsActive);
        if (user == null) return BadRequest(ApiResponse<ProjectMemberDto>.Fail("User is invalid or inactive."));

        var existing = await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.ProjectId == id && pm.UserId == request.UserId);
        if (existing != null)
        {
            existing.Role = string.IsNullOrWhiteSpace(request.Role) ? existing.Role : request.Role;
            await _context.SaveChangesAsync();
            var existingDto = new ProjectMemberDto(existing.Id, existing.ProjectId, existing.UserId, user.FullName, user.Email, existing.Role, existing.JoinedAt);
            return Ok(ApiResponse<ProjectMemberDto>.Ok(existingDto, "Member already assigned."));
        }

        var member = new ProjectMember
        {
            ProjectId = id,
            UserId = request.UserId,
            Role = string.IsNullOrWhiteSpace(request.Role) ? "Engineer" : request.Role,
            JoinedAt = DateTime.UtcNow
        };
        _context.ProjectMembers.Add(member);
        await _context.SaveChangesAsync();

        await _notificationService.NotifyProjectAssignedAsync(
            project.Id, project.Name, request.UserId);

        await _notificationService.BroadcastToUserAsync(
            request.UserId,
            "ProjectAssigned",
            new { projectId = project.Id, name = project.Name });

        await _auditService.LogAsync("AssignProjectMember", "ProjectMember", member.Id.ToString(), null, member);

        var dto = new ProjectMemberDto(member.Id, member.ProjectId, member.UserId, user.FullName, user.Email, member.Role, member.JoinedAt);
        return Ok(ApiResponse<ProjectMemberDto>.Ok(dto, "User assigned to project."));
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> RemoveProjectMember(Guid id, Guid userId)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.ProjectsUpdate))
        {
            return Forbid();
        }

        var member = await _context.ProjectMembers.FirstOrDefaultAsync(pm => pm.ProjectId == id && pm.UserId == userId);
        if (member == null) return NotFound(ApiResponse<bool>.Fail("Project member not found."));

        _context.ProjectMembers.Remove(member);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("RemoveProjectMember", "ProjectMember", member.Id.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Member removed from project."));
    }

    private async Task AddProjectMembersAsync(Project project, List<Guid> memberUserIds)
    {
        var validUsers = await _context.Users
            .Where(u => memberUserIds.Contains(u.Id) && u.IsActive && !u.IsDeleted)
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var memberId in validUsers)
        {
            _context.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = project.Id,
                UserId = memberId,
                Role = "Engineer",
                JoinedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        foreach (var memberId in validUsers)
        {
            await _notificationService.NotifyProjectAssignedAsync(
                project.Id, project.Name, memberId);

            await _notificationService.BroadcastToUserAsync(
                memberId,
                "ProjectAssigned",
                new { projectId = project.Id, name = project.Name });
        }
    }

    private async Task SyncProjectMembersAsync(Project project, List<Guid> memberUserIds)
    {
        var existing = await _context.ProjectMembers.Where(pm => pm.ProjectId == project.Id).ToListAsync();
        var existingIds = existing.Select(e => e.UserId).ToHashSet();
        var desired = memberUserIds.ToHashSet();

        var toRemove = existing.Where(e => !desired.Contains(e.UserId)).ToList();
        if (toRemove.Count > 0)
        {
            _context.ProjectMembers.RemoveRange(toRemove);
        }

        var toAdd = desired.Where(id => !existingIds.Contains(id)).ToList();
        if (toAdd.Count > 0)
        {
            var validUsers = await _context.Users
                .Where(u => toAdd.Contains(u.Id) && u.IsActive && !u.IsDeleted)
                .Select(u => u.Id)
                .ToListAsync();

            foreach (var memberId in validUsers)
            {
                _context.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = memberId,
                    Role = "Engineer",
                    JoinedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            foreach (var memberId in validUsers)
            {
                await _notificationService.NotifyProjectAssignedAsync(
                    project.Id, project.Name, memberId);

                await _notificationService.BroadcastToUserAsync(
                    memberId,
                    "ProjectAssigned",
                    new { projectId = project.Id, name = project.Name });
            }
        }
        else
        {
            await _context.SaveChangesAsync();
        }
    }

    /// <summary>
    /// Admin / SystemAdmin / ProjectManager, or explicit permission claim.
    /// Uses both ICurrentUserService and raw claims so it works on any device/network after publish.
    /// </summary>
    private bool CanManageProjects(string requiredPermission)
    {
        if (_currentUserService.IsAdmin || _currentUserService.IsSystemAdmin)
            return true;

        if (User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("ProjectManager"))
            return true;

        if (_currentUserService.Roles.Any(r =>
                r.Equals("Admin", StringComparison.OrdinalIgnoreCase)
                || r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)
                || r.Equals("ProjectManager", StringComparison.OrdinalIgnoreCase)))
            return true;

        if (_currentUserService.Permissions.Contains(requiredPermission))
            return true;

        return User.Claims.Any(c =>
            (c.Type == "permission" || c.Type == "permissions")
            && string.Equals(c.Value, requiredPermission, StringComparison.OrdinalIgnoreCase));
    }
}

