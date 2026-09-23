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
[Route("api/governance")]
[Authorize]
public class GovernanceController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;

    public GovernanceController(
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
    // 1. Project Risks
    // ==========================================

    [HttpGet("projects/{projectId:guid}/risks")]
    public async Task<ActionResult<ApiResponse<List<ProjectRiskDto>>>> GetProjectRisks(Guid projectId)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var list = await _context.ProjectRisks
            .Include(r => r.Project)
            .Include(r => r.OwnerUser)
            .Where(r => r.ProjectId == projectId)
            .OrderByDescending(r => r.Severity)
            .ThenByDescending(r => r.Probability)
            .Select(r => new ProjectRiskDto(
                r.Id,
                r.ProjectId,
                r.Project.Name,
                r.Title,
                r.Description,
                r.Severity,
                r.Probability,
                r.MitigationPlan,
                r.OwnerUserId,
                r.OwnerUser != null ? r.OwnerUser.FullName : null,
                r.Status,
                r.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProjectRiskDto>>.Ok(list));
    }

    [HttpPost("risks")]
    public async Task<ActionResult<ApiResponse<ProjectRiskDto>>> CreateRisk([FromBody] CreateRiskRequest request)
    {
        if (!HasPermission(Permissions.GovernanceManage)) return Forbid();

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return NotFound(ApiResponse<ProjectRiskDto>.Fail("Project not found."));

        var risk = new ProjectRisk
        {
            ProjectId = request.ProjectId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Severity = request.Severity,
            Probability = request.Probability,
            MitigationPlan = request.MitigationPlan.Trim(),
            OwnerUserId = request.OwnerUserId,
            Status = RiskStatus.Identified
        };

        _context.ProjectRisks.Add(risk);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateRisk", "ProjectRisk", risk.Id.ToString(), null, risk);

        var dto = new ProjectRiskDto(
            risk.Id,
            risk.ProjectId,
            project.Name,
            risk.Title,
            risk.Description,
            risk.Severity,
            risk.Probability,
            risk.MitigationPlan,
            risk.OwnerUserId,
            null,
            risk.Status,
            risk.CreatedAt
        );

        return Ok(ApiResponse<ProjectRiskDto>.Ok(dto, "Risk registered."));
    }

    // ==========================================
    // 2. Project Issues
    // ==========================================

    [HttpGet("projects/{projectId:guid}/issues")]
    public async Task<ActionResult<ApiResponse<List<ProjectIssueDto>>>> GetProjectIssues(Guid projectId)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var list = await _context.ProjectIssues
            .Include(i => i.Project)
            .Include(i => i.Site)
            .Include(i => i.ReportedByUser)
            .Include(i => i.AssignedToUser)
            .Where(i => i.ProjectId == projectId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new ProjectIssueDto(
                i.Id,
                i.ProjectId,
                i.Project.Name,
                i.SiteId,
                i.Site != null ? i.Site.Name : null,
                i.Title,
                i.Description,
                i.Priority,
                i.RootCause,
                i.Resolution,
                i.Status,
                i.ReportedByUserId,
                i.ReportedByUser.FullName,
                i.AssignedToUserId,
                i.AssignedToUser != null ? i.AssignedToUser.FullName : null,
                i.ResolvedAt,
                i.CreatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProjectIssueDto>>.Ok(list));
    }

    [HttpPost("issues")]
    public async Task<ActionResult<ApiResponse<ProjectIssueDto>>> ReportIssue([FromBody] CreateIssueRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, request.ProjectId);
        if (!canAccess) return Forbid();

        var issue = new ProjectIssue
        {
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Priority = request.Priority,
            ReportedByUserId = userId.Value,
            AssignedToUserId = request.AssignedToUserId,
            Status = IssueStatus.Open
        };

        _context.ProjectIssues.Add(issue);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("ReportIssue", "ProjectIssue", issue.Id.ToString(), null, issue);

        var projectMemberIds = await _context.ProjectMembers
            .Where(pm => pm.ProjectId == request.ProjectId)
            .Select(pm => pm.UserId)
            .ToListAsync();
        await _notificationService.NotifyIssueCreatedAsync(issue.Id, issue.Title, issue.ProjectId, projectMemberIds);

        if (issue.AssignedToUserId.HasValue)
        {
            await _notificationService.NotifyIssueAssignedAsync(issue.Id, issue.Title, issue.AssignedToUserId.Value);
        }

        var project = await _context.Projects.FindAsync(request.ProjectId);

        var dto = new ProjectIssueDto(
            issue.Id,
            issue.ProjectId,
            project?.Name ?? "",
            issue.SiteId,
            null,
            issue.Title,
            issue.Description,
            issue.Priority,
            issue.RootCause,
            issue.Resolution,
            issue.Status,
            issue.ReportedByUserId,
            _currentUserService.Email ?? "",
            issue.AssignedToUserId,
            null,
            issue.ResolvedAt,
            issue.CreatedAt
        );

        return Ok(ApiResponse<ProjectIssueDto>.Ok(dto, "Issue reported."));
    }

    [HttpPut("issues/{id:guid}/resolve")]
    public async Task<ActionResult<ApiResponse<bool>>> ResolveIssue(Guid id, [FromBody] ResolveIssueRequest request)
    {
        var issue = await _context.ProjectIssues.FindAsync(id);
        if (issue == null) return NotFound(ApiResponse<bool>.Fail("Issue not found."));

        issue.Status = IssueStatus.Resolved;
        issue.Resolution = request.Resolution.Trim();
        issue.RootCause = request.RootCause?.Trim();
        issue.ResolvedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("ResolveIssue", "ProjectIssue", id.ToString(), null, request);

        return Ok(ApiResponse<bool>.Ok(true, "Issue resolved."));
    }

    // ==========================================
    // 3. Handover & Warranty
    // ==========================================

    [HttpGet("projects/{projectId:guid}/handover")]
    public async Task<ActionResult<ApiResponse<ProjectHandoverDto?>>> GetProjectHandover(Guid projectId)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId);
        if (!canAccess) return Forbid();

        var h = await _context.ProjectHandovers
            .Include(x => x.Project)
            .FirstOrDefaultAsync(x => x.ProjectId == projectId);

        if (h == null) return Ok(ApiResponse<ProjectHandoverDto?>.Ok(null));

        var dto = new ProjectHandoverDto(
            h.Id,
            h.ProjectId,
            h.Project.Name,
            h.HandoverDate,
            h.Status,
            h.SnagListJson,
            h.PreliminaryAcceptedBy,
            h.FinalAcceptedBy,
            h.WarrantyStartDate,
            h.WarrantyEndDate,
            h.WarrantyTerms,
            h.MaintenanceContractRef,
            h.CreatedAt
        );

        return Ok(ApiResponse<ProjectHandoverDto?>.Ok(dto));
    }

    [HttpPost("handover")]
    public async Task<ActionResult<ApiResponse<ProjectHandoverDto>>> CreateOrUpdateHandover([FromBody] CreateOrUpdateHandoverRequest request)
    {
        if (!HasPermission(Permissions.GovernanceManage)) return Forbid();

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return NotFound(ApiResponse<ProjectHandoverDto>.Fail("Project not found."));

        var h = await _context.ProjectHandovers.FirstOrDefaultAsync(x => x.ProjectId == request.ProjectId);
        if (h == null)
        {
            h = new ProjectHandover
            {
                ProjectId = request.ProjectId,
                HandoverDate = request.HandoverDate,
                Status = request.Status,
                SnagListJson = request.SnagListJson ?? "[]",
                PreliminaryAcceptedBy = request.PreliminaryAcceptedBy?.Trim(),
                FinalAcceptedBy = request.FinalAcceptedBy?.Trim(),
                WarrantyStartDate = request.WarrantyStartDate,
                WarrantyEndDate = request.WarrantyEndDate,
                WarrantyTerms = request.WarrantyTerms?.Trim(),
                MaintenanceContractRef = request.MaintenanceContractRef?.Trim()
            };
            _context.ProjectHandovers.Add(h);
        }
        else
        {
            h.HandoverDate = request.HandoverDate;
            h.Status = request.Status;
            h.SnagListJson = request.SnagListJson ?? "[]";
            h.PreliminaryAcceptedBy = request.PreliminaryAcceptedBy?.Trim();
            h.FinalAcceptedBy = request.FinalAcceptedBy?.Trim();
            h.WarrantyStartDate = request.WarrantyStartDate;
            h.WarrantyEndDate = request.WarrantyEndDate;
            h.WarrantyTerms = request.WarrantyTerms?.Trim();
            h.MaintenanceContractRef = request.MaintenanceContractRef?.Trim();
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("SaveHandover", "ProjectHandover", h.Id.ToString(), null, request);

        var dto = new ProjectHandoverDto(
            h.Id,
            h.ProjectId,
            project.Name,
            h.HandoverDate,
            h.Status,
            h.SnagListJson,
            h.PreliminaryAcceptedBy,
            h.FinalAcceptedBy,
            h.WarrantyStartDate,
            h.WarrantyEndDate,
            h.WarrantyTerms,
            h.MaintenanceContractRef,
            h.CreatedAt
        );

        return Ok(ApiResponse<ProjectHandoverDto>.Ok(dto, "Handover saved."));
    }
}

