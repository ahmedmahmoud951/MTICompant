using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/milestones")]
[Authorize]
public class MilestonesController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;

    public MilestonesController(
        IAppDbContext context,
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

    private bool HasPermission(string permission)
    {
        return _currentUserService.IsAdmin ||
               _currentUserService.IsSystemAdmin ||
               _currentUserService.Permissions.Contains(permission);
    }

    // ==========================================
    // 1. Milestones by Project
    // ==========================================

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProjectMilestoneDto>>>> GetMilestones([FromQuery] Guid projectId)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var milestones = await _context.ProjectMilestones
            .Include(m => m.Project)
            .Include(m => m.Dependencies)
                .ThenInclude(d => d.DependsOnMilestone)
            .Where(m => m.ProjectId == projectId)
            .OrderBy(m => m.SortOrder)
            .ThenBy(m => m.StartDate)
            .ToListAsync();

        var dtos = milestones.Select(m => new ProjectMilestoneDto(
            m.Id,
            m.ProjectId,
            m.Project.Name,
            m.Name,
            m.Description,
            m.StartDate,
            m.DueDate,
            m.CompletedAt,
            m.Status,
            m.Weight,
            m.SortOrder,
            m.Dependencies.Select(d => d.DependsOnMilestoneId).ToList(),
            m.Dependencies.Select(d => d.DependsOnMilestone.Name).ToList()
        )).ToList();

        return Ok(ApiResponse<List<ProjectMilestoneDto>>.SuccessResult(dtos));
    }

    /// <summary>Alias used by some clients: GET /api/milestones/project/{projectId}</summary>
    [HttpGet("project/{projectId:guid}")]
    public Task<ActionResult<ApiResponse<List<ProjectMilestoneDto>>>> GetMilestonesByProject(Guid projectId)
        => GetMilestones(projectId);

    // ==========================================
    // 2. Create Milestone
    // ==========================================

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProjectMilestoneDto>>> CreateMilestone([FromBody] CreateMilestoneRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        if (!HasPermission(Permissions.MilestonesManage) && !HasPermission(Permissions.ProjectsUpdate))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return BadRequest(ApiResponse<ProjectMilestoneDto>.ErrorResult("Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var milestone = new ProjectMilestone
        {
            ProjectId = request.ProjectId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            Weight = request.Weight,
            SortOrder = request.SortOrder,
            Status = MilestoneStatus.Pending,
            CreatedBy = userId.Value,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProjectMilestones.Add(milestone);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateMilestone", "ProjectMilestone", milestone.Id.ToString(), null, new
        {
            milestone.Name,
            milestone.ProjectId
        });

        return Ok(ApiResponse<ProjectMilestoneDto>.SuccessResult(new ProjectMilestoneDto(
            milestone.Id,
            milestone.ProjectId,
            project.Name,
            milestone.Name,
            milestone.Description,
            milestone.StartDate,
            milestone.DueDate,
            milestone.CompletedAt,
            milestone.Status,
            milestone.Weight,
            milestone.SortOrder,
            new List<Guid>(),
            new List<string>()
        ), "ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…Ø±Ø­Ù„Ø©/Ø§Ù„Ù…Ø¹Ù„Ù… Ø¨Ù†Ø¬Ø§Ø­"));
    }

    // ==========================================
    // 3. Update Milestone
    // ==========================================

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> UpdateMilestone(Guid id, [FromBody] UpdateMilestoneRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        if (!HasPermission(Permissions.MilestonesManage) && !HasPermission(Permissions.ProjectsUpdate))
        {
            return Forbid();
        }

        var milestone = await _context.ProjectMilestones.FindAsync(id);
        if (milestone == null) return NotFound(ApiResponse<object>.ErrorResult("Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©"));

        var previousStatus = milestone.Status;

        milestone.Name = request.Name.Trim();
        milestone.Description = request.Description?.Trim();
        milestone.StartDate = request.StartDate;
        milestone.DueDate = request.DueDate;
        milestone.CompletedAt = request.CompletedAt;
        milestone.Status = request.Status;
        milestone.Weight = request.Weight;
        milestone.SortOrder = request.SortOrder;
        milestone.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UpdateMilestone", "ProjectMilestone", milestone.Id.ToString(), null, new
        {
            milestone.Name,
            Status = milestone.Status.ToString()
        });

        if (previousStatus != MilestoneStatus.Completed && request.Status == MilestoneStatus.Completed)
        {
            var memberIds = await _context.ProjectMembers
                .Where(pm => pm.ProjectId == milestone.ProjectId)
                .Select(pm => pm.UserId)
                .ToListAsync();
            await _notificationService.NotifyMilestoneCompletedAsync(
                milestone.Id, milestone.Name, milestone.ProjectId, memberIds);
        }

        return Ok(ApiResponse<object>.SuccessResult(null, "ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø¨Ù†Ø¬Ø§Ø­"));
    }

    // ==========================================
    // 4. Add Milestone Dependency (Cycle Detection Algorithm)
    // ==========================================

    [HttpPost("{id:guid}/dependencies")]
    public async Task<ActionResult<ApiResponse<object>>> AddDependency(Guid id, [FromBody] AddMilestoneDependencyRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        if (!HasPermission(Permissions.MilestonesManage) && !HasPermission(Permissions.ProjectsUpdate))
        {
            return Forbid();
        }

        var milestone = await _context.ProjectMilestones.FindAsync(id);
        if (milestone == null) return NotFound(ApiResponse<object>.ErrorResult("Ø§Ù„Ù…Ø±Ø­Ù„Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©"));

        var dependsOn = await _context.ProjectMilestones.FindAsync(request.DependsOnMilestoneId);
        if (dependsOn == null) return NotFound(ApiResponse<object>.ErrorResult("Ø§Ù„Ù…Ø±Ø­Ù„Ø© Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ Ø¹Ù„ÙŠÙ‡Ø§ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©"));

        if (milestone.ProjectId != dependsOn.ProjectId)
        {
            return BadRequest(ApiResponse<object>.ErrorResult("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø±Ø¨Ø· Ù…Ø±Ø§Ø­Ù„ Ù…Ù† Ù…Ø´Ø§Ø±ÙŠØ¹ Ù…Ø®ØªÙ„ÙØ©"));
        }

        // Circular Dependency Check:
        if (id == request.DependsOnMilestoneId)
        {
            return BadRequest(ApiResponse<object>.ErrorResult("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ù„Ù„Ù…Ø±Ø­Ù„Ø© Ø£Ù† ØªØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Ù†ÙØ³Ù‡Ø§"));
        }

        // Check if dependency already exists
        var existing = await _context.ProjectMilestoneDependencies
            .AnyAsync(d => d.MilestoneId == id && d.DependsOnMilestoneId == request.DependsOnMilestoneId);
        if (existing)
        {
            return BadRequest(ApiResponse<object>.ErrorResult("Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ÙŠØ© Ù…Ø³Ø¬Ù„Ø© Ø¨Ø§Ù„ÙØ¹Ù„ Ù…Ø³Ø¨Ù‚Ø§Ù‹"));
        }

        // Cycle Detection: check if milestone 'id' is reachable from 'request.DependsOnMilestoneId'
        var allDependencies = await _context.ProjectMilestoneDependencies
            .Where(d => d.Milestone.ProjectId == milestone.ProjectId)
            .ToListAsync();

        var adjacency = allDependencies
            .GroupBy(d => d.MilestoneId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.DependsOnMilestoneId).ToList());

        if (HasCycle(request.DependsOnMilestoneId, id, adjacency))
        {
            return BadRequest(ApiResponse<object>.ErrorResult("ØªØ¹Ø°Ø± Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ÙŠØ©: Ø³ÙŠØ¤Ø¯ÙŠ Ø°Ù„Ùƒ Ø¥Ù„Ù‰ Ø§Ø¹ØªÙ…Ø§Ø¯ÙŠØ© Ø¯Ø§Ø¦Ø±ÙŠØ© ØºÙŠØ± ØµØ§Ù„Ø­Ø© (Circular Dependency)"));
        }

        var dependency = new ProjectMilestoneDependency
        {
            MilestoneId = id,
            DependsOnMilestoneId = request.DependsOnMilestoneId,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProjectMilestoneDependencies.Add(dependency);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AddMilestoneDependency", "ProjectMilestoneDependency", dependency.Id.ToString(), null, new
        {
            MilestoneId = id,
            DependsOnMilestoneId = request.DependsOnMilestoneId
        });

        return Ok(ApiResponse<object>.SuccessResult(null, "ØªÙ… Ø±Ø¨Ø· Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­"));
    }

    private static bool HasCycle(Guid current, Guid target, Dictionary<Guid, List<Guid>> adjacency)
    {
        if (current == target) return true;
        if (!adjacency.TryGetValue(current, out var nextList)) return false;

        foreach (var next in nextList)
        {
            if (HasCycle(next, target, adjacency)) return true;
        }

        return false;
    }

    // ==========================================
    // 5. Delete Milestone Dependency
    // ==========================================

    [HttpDelete("{id:guid}/dependencies/{dependsOnId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> RemoveDependency(Guid id, Guid dependsOnId)
    {
        var dep = await _context.ProjectMilestoneDependencies
            .FirstOrDefaultAsync(d => d.MilestoneId == id && d.DependsOnMilestoneId == dependsOnId);

        if (dep == null) return NotFound(ApiResponse<object>.ErrorResult("Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ÙŠØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©"));

        _context.ProjectMilestoneDependencies.Remove(dep);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<object>.SuccessResult(null, "ØªÙ… Ø­Ø°Ù Ø§Ù„Ø§Ø¹ØªÙ…Ø§Ø¯ÙŠØ© Ø¨Ù†Ø¬Ø§Ø­"));
    }

    // ==========================================
    // 6. Project Assignments
    // ==========================================

    [HttpGet("assignments")]
    public async Task<ActionResult<ApiResponse<List<ProjectAssignmentDto>>>> GetAssignments([FromQuery] Guid projectId)
    {
        var assignments = await _context.ProjectAssignments
            .Include(a => a.Project)
            .Include(a => a.User)
            .Include(a => a.Team)
            .Where(a => a.ProjectId == projectId && a.IsActive)
            .OrderBy(a => a.Role)
            .Select(a => new ProjectAssignmentDto(
                a.Id,
                a.ProjectId,
                a.Project.Name,
                a.UserId,
                a.User.FullName,
                a.User.Email,
                a.TeamId,
                a.Team != null ? a.Team.Name : null,
                a.Role,
                a.AssignedAt,
                a.IsActive
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProjectAssignmentDto>>.SuccessResult(assignments));
    }

    /// <summary>Alias: GET /api/milestones/project/{projectId}/assignments</summary>
    [HttpGet("project/{projectId:guid}/assignments")]
    public Task<ActionResult<ApiResponse<List<ProjectAssignmentDto>>>> GetAssignmentsByProject(Guid projectId)
        => GetAssignments(projectId);

    [HttpPost("assignments")]
    public async Task<ActionResult<ApiResponse<ProjectAssignmentDto>>> CreateAssignment([FromBody] CreateProjectAssignmentRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        if (!HasPermission(Permissions.ProjectsUpdate) && !HasPermission(Permissions.SitesAssign))
        {
            return Forbid();
        }

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return BadRequest(ApiResponse<ProjectAssignmentDto>.ErrorResult("Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var targetUser = await _context.Users.FindAsync(request.UserId);
        if (targetUser == null) return BadRequest(ApiResponse<ProjectAssignmentDto>.ErrorResult("Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        Team? team = null;
        if (request.TeamId.HasValue)
        {
            team = await _context.Teams.FindAsync(request.TeamId.Value);
        }

        var assignment = new ProjectAssignment
        {
            ProjectId = request.ProjectId,
            UserId = request.UserId,
            TeamId = request.TeamId,
            Role = request.Role.Trim(),
            AssignedAt = DateTime.UtcNow,
            AssignedBy = userId.Value,
            IsActive = true
        };

        _context.ProjectAssignments.Add(assignment);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("AssignProjectMember", "ProjectAssignment", assignment.Id.ToString(), null, new
        {
            assignment.ProjectId,
            assignment.UserId,
            assignment.Role
        });

        return Ok(ApiResponse<ProjectAssignmentDto>.SuccessResult(new ProjectAssignmentDto(
            assignment.Id,
            assignment.ProjectId,
            project.Name,
            targetUser.Id,
            targetUser.FullName,
            targetUser.Email,
            assignment.TeamId,
            team?.Name,
            assignment.Role,
            assignment.AssignedAt,
            assignment.IsActive
        ), "ØªÙ… ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ø¹Ø¶Ùˆ/Ø§Ù„ÙØ±ÙŠÙ‚ ÙÙŠ Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ Ø¨Ù†Ø¬Ø§Ø­"));
    }
}

