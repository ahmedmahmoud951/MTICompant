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

    public ProjectsController(
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
                p.StartDate,
                p.EndDate,
                p.Sites.Count(s => !s.IsDeleted),
                p.CreatedAt
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
            project.StartDate,
            project.EndDate,
            project.CreatedAt,
            siteDtos
        );

        return Ok(ApiResponse<ProjectDetailDto>.Ok(dto));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> CreateProject([FromBody] CreateProjectRequest request)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.ProjectsCreate))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest(ApiResponse<ProjectDto>.Fail("Project code and name are required."));
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
            StartDate = request.StartDate,
            EndDate = request.EndDate
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateProject", "Project", project.Id.ToString(), null, project);

        var dto = new ProjectDto(
            project.Id,
            project.Code,
            project.Name,
            project.Description,
            project.ClientName,
            project.Status,
            project.StartDate,
            project.EndDate,
            0,
            project.CreatedAt
        );

        return CreatedAtAction(nameof(GetProjectById), new { id = project.Id }, ApiResponse<ProjectDto>.Ok(dto, "Project created successfully."));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProjectDto>>> UpdateProject(Guid id, [FromBody] UpdateProjectRequest request)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.ProjectsUpdate))
        {
            return Forbid();
        }

        var project = await _context.Projects.Include(p => p.Sites).FirstOrDefaultAsync(p => p.Id == id);
        if (project == null) return NotFound(ApiResponse<ProjectDto>.Fail("Project not found."));

        var oldValues = new { project.Name, project.Description, project.ClientName, project.Status, project.StartDate, project.EndDate };

        project.Name = request.Name.Trim();
        project.Description = request.Description?.Trim() ?? string.Empty;
        project.ClientName = request.ClientName?.Trim() ?? string.Empty;
        project.Status = request.Status;
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UpdateProject", "Project", project.Id.ToString(), oldValues, request);

        var dto = new ProjectDto(
            project.Id,
            project.Code,
            project.Name,
            project.Description,
            project.ClientName,
            project.Status,
            project.StartDate,
            project.EndDate,
            project.Sites.Count(s => !s.IsDeleted),
            project.CreatedAt
        );

        return Ok(ApiResponse<ProjectDto>.Ok(dto, "Project updated successfully."));
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteProject(Guid id)
    {
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.ProjectsDelete))
        {
            return Forbid();
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
}
