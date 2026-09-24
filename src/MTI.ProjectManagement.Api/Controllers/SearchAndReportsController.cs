using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Api.Helpers;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class SearchAndReportsController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly ICurrentUserService _currentUser;

    public SearchAndReportsController(
        IAppDbContext dbContext,
        IResourceAuthorizationService resourceAuthorization,
        ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _resourceAuthorization = resourceAuthorization;
        _currentUser = currentUser;
    }

    private bool HasPermission(string permission) =>
        _currentUser.IsAdmin || _currentUser.IsSystemAdmin || _currentUser.Permissions.Contains(permission);

    [HttpGet("search")]
    public async Task<ActionResult<GlobalSearchResponseDto>> GlobalSearch(
        [FromQuery] string? q = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? siteId = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] Guid? teamId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? documentType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] string? status = null,
        [FromQuery] string? entityType = null,
        CancellationToken cancellationToken = default)
    {
        var term = q?.Trim().ToLower() ?? string.Empty;
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        var authorizedProjectIds = isAdmin
            ? await _dbContext.Projects.Where(p => !p.IsDeleted).Select(p => p.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedProjectIdsAsync(currentUserId, cancellationToken: cancellationToken)).ToList();
        var authorizedSiteIds = isAdmin
            ? await _dbContext.Sites.Where(s => !s.IsDeleted).Select(s => s.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedSiteIdsAsync(currentUserId, cancellationToken: cancellationToken)).ToList();

        var results = new List<SearchResultItemDto>();

        // 1. Projects
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Project", StringComparison.OrdinalIgnoreCase))
        {
            var pQuery = _dbContext.Projects.AsNoTracking()
                .Where(p => !p.IsDeleted && authorizedProjectIds.Contains(p.Id));

            if (projectId.HasValue) pQuery = pQuery.Where(p => p.Id == projectId.Value);
            if (dateFrom.HasValue) pQuery = pQuery.Where(p => p.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) pQuery = pQuery.Where(p => p.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                pQuery = pQuery.Where(p => p.Name.ToLower().Contains(term) || p.Code.ToLower().Contains(term) || (p.Description != null && p.Description.ToLower().Contains(term)));

            var projects = await pQuery.Take(10)
                .Select(p => new SearchResultItemDto("Project", p.Id, p.Name, $"Code: {p.Code} | Client: {p.ClientName}", p.Status.ToString(), p.CreatedAt, $"/projects/{p.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(projects);
        }

        // 2. Sites
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Site", StringComparison.OrdinalIgnoreCase))
        {
            var sQuery = _dbContext.Sites.AsNoTracking()
                .Where(s => !s.IsDeleted && authorizedSiteIds.Contains(s.Id));

            if (siteId.HasValue) sQuery = sQuery.Where(s => s.Id == siteId.Value);
            if (projectId.HasValue) sQuery = sQuery.Where(s => s.ProjectId == projectId.Value);
            if (dateFrom.HasValue) sQuery = sQuery.Where(s => s.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) sQuery = sQuery.Where(s => s.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                sQuery = sQuery.Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term) || (s.Description != null && s.Description.ToLower().Contains(term)));

            var sites = await sQuery.Take(10)
                .Select(s => new SearchResultItemDto("Site", s.Id, s.Name, $"Code: {s.Code} | Address: {s.Address}", s.Status.ToString(), s.CreatedAt, $"/sites/{s.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(sites);
        }

        // 3. Teams
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Team", StringComparison.OrdinalIgnoreCase))
        {
            var teamsQuery = _dbContext.Teams.AsNoTracking().Where(t => !t.IsDeleted);
            if (!isAdmin)
            {
                teamsQuery = teamsQuery.Where(t => t.Members.Any(m => m.UserId == currentUserId) || t.ManagerUserId == currentUserId);
            }
            if (teamId.HasValue) teamsQuery = teamsQuery.Where(t => t.Id == teamId.Value);
            if (departmentId.HasValue) teamsQuery = teamsQuery.Where(t => t.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(term))
                teamsQuery = teamsQuery.Where(t => t.Name.ToLower().Contains(term) || (t.Description != null && t.Description.ToLower().Contains(term)));

            var teams = await teamsQuery.Take(8)
                .Select(t => new SearchResultItemDto("Team", t.Id, t.Name, t.Description, t.IsActive ? "Active" : "Inactive", t.CreatedAt, $"/teams/{t.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(teams);
        }

        // 4. Tasks
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Task", StringComparison.OrdinalIgnoreCase))
        {
            var tasksQuery = _dbContext.Tasks.AsNoTracking()
                .Where(t => !t.IsDeleted && (t.AssignedToUserId == currentUserId || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)) || authorizedProjectIds.Contains(t.ProjectId)));

            if (projectId.HasValue) tasksQuery = tasksQuery.Where(t => t.ProjectId == projectId.Value);
            if (siteId.HasValue) tasksQuery = tasksQuery.Where(t => t.SiteId == siteId.Value);
            if (userId.HasValue) tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == userId.Value);
            if (dateFrom.HasValue) tasksQuery = tasksQuery.Where(t => t.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) tasksQuery = tasksQuery.Where(t => t.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                tasksQuery = tasksQuery.Where(t => t.Title.ToLower().Contains(term) || (t.Description != null && t.Description.ToLower().Contains(term)));

            var tasks = await tasksQuery.Take(10)
                .Select(t => new SearchResultItemDto("Task", t.Id, t.Title, $"Priority: {t.Priority}", t.Status.ToString(), t.CreatedAt, $"/tasks/{t.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(tasks);
        }

        // 5. Users (Scoped authorization)
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("User", StringComparison.OrdinalIgnoreCase))
        {
            var usersQuery = _dbContext.Users.AsNoTracking().Where(u => !u.IsDeleted);
            if (!isAdmin)
            {
                // Normal users can only discover users who share a project or team
                usersQuery = usersQuery.Where(u => u.Id == currentUserId ||
                    _dbContext.ProjectAssignments.Any(pa => authorizedProjectIds.Contains(pa.ProjectId) && pa.UserId == u.Id) ||
                    _dbContext.TeamMembers.Any(tm => _dbContext.TeamMembers.Where(myTm => myTm.UserId == currentUserId).Select(myTm => myTm.TeamId).Contains(tm.TeamId) && tm.UserId == u.Id));
            }
            if (userId.HasValue) usersQuery = usersQuery.Where(u => u.Id == userId.Value);
            if (departmentId.HasValue) usersQuery = usersQuery.Where(u => u.UserProfile != null && u.UserProfile.DepartmentId == departmentId.Value);
            if (!string.IsNullOrWhiteSpace(term))
                usersQuery = usersQuery.Where(u => u.FirstName.ToLower().Contains(term) || u.LastName.ToLower().Contains(term) || u.Email.ToLower().Contains(term));

            var users = await usersQuery.Take(8)
                .Select(u => new SearchResultItemDto("User", u.Id, $"{u.FirstName} {u.LastName}", u.Email, u.IsActive ? "Active" : "Inactive", u.CreatedAt, $"/users/{u.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(users);
        }

        // 6. Documents
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Document", StringComparison.OrdinalIgnoreCase))
        {
            var docsQuery = _dbContext.Documents.AsNoTracking()
                .Where(d => !d.IsDeleted && authorizedProjectIds.Contains(d.ProjectId));

            if (projectId.HasValue) docsQuery = docsQuery.Where(d => d.ProjectId == projectId.Value);
            if (siteId.HasValue) docsQuery = docsQuery.Where(d => d.SiteId == siteId.Value);
            if (userId.HasValue) docsQuery = docsQuery.Where(d => d.UploadedBy == userId.Value);
            if (dateFrom.HasValue) docsQuery = docsQuery.Where(d => d.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) docsQuery = docsQuery.Where(d => d.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(documentType))
                docsQuery = docsQuery.Where(d => d.DocumentType.Code.ToLower() == documentType.ToLower() || d.DocumentType.NameEn.ToLower() == documentType.ToLower() || d.DocumentType.NameAr.ToLower() == documentType.ToLower());
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<DocumentStatus>(status, true, out var parsedDocStatus))
                docsQuery = docsQuery.Where(d => d.Status == parsedDocStatus);
            if (!string.IsNullOrWhiteSpace(category) && Enum.TryParse<DocumentCategory>(category, true, out var parsedCat))
                docsQuery = docsQuery.Where(d => d.Category == parsedCat);
            if (!string.IsNullOrWhiteSpace(term))
                docsQuery = docsQuery.Where(d => d.Title.ToLower().Contains(term) || d.DocumentNumber.ToLower().Contains(term) || (d.Description != null && d.Description.ToLower().Contains(term)));

            var documents = await docsQuery.Take(10)
                .Select(d => new SearchResultItemDto("Document", d.Id, d.Title, d.DocumentNumber, d.Status.ToString(), d.CreatedAt, $"/documents/{d.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(documents);
        }

        // 7. Drawings
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Drawing", StringComparison.OrdinalIgnoreCase))
        {
            var drawingsQuery = _dbContext.Drawings.AsNoTracking()
                .Where(d => !d.IsDeleted && authorizedProjectIds.Contains(d.ProjectId));

            if (projectId.HasValue) drawingsQuery = drawingsQuery.Where(d => d.ProjectId == projectId.Value);
            if (siteId.HasValue) drawingsQuery = drawingsQuery.Where(d => d.SiteId == siteId.Value);
            if (userId.HasValue) drawingsQuery = drawingsQuery.Where(d => d.UploadedBy == userId.Value);
            if (dateFrom.HasValue) drawingsQuery = drawingsQuery.Where(d => d.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) drawingsQuery = drawingsQuery.Where(d => d.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                drawingsQuery = drawingsQuery.Where(d => d.DrawingTitle.ToLower().Contains(term) || d.DrawingNumber.ToLower().Contains(term) || d.Revision.ToLower().Contains(term));

            var drawings = await drawingsQuery.Take(10)
                .Select(d => new SearchResultItemDto("Drawing", d.Id, d.DrawingTitle, $"No: {d.DrawingNumber} | Rev: {d.Revision}", d.Status.ToString(), d.CreatedAt, $"/drawings/{d.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(drawings);
        }

        // 8. Daily Reports
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("DailyReport", StringComparison.OrdinalIgnoreCase))
        {
            var reportsQuery = _dbContext.DailySiteReports.AsNoTracking()
                .Where(r => !r.IsDeleted && (authorizedSiteIds.Contains(r.SiteId) || (r.Site != null && authorizedProjectIds.Contains(r.Site.ProjectId))));

            if (siteId.HasValue) reportsQuery = reportsQuery.Where(r => r.SiteId == siteId.Value);
            if (userId.HasValue) reportsQuery = reportsQuery.Where(r => r.EngineerUserId == userId.Value);
            if (dateFrom.HasValue) reportsQuery = reportsQuery.Where(r => r.ReportDate >= dateFrom.Value);
            if (dateTo.HasValue) reportsQuery = reportsQuery.Where(r => r.ReportDate <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                reportsQuery = reportsQuery.Where(r => (r.WorkCompleted != null && r.WorkCompleted.ToLower().Contains(term)) || (r.WorkInProgress != null && r.WorkInProgress.ToLower().Contains(term)) || (r.Problems != null && r.Problems.ToLower().Contains(term)) || (r.SafetyNotes != null && r.SafetyNotes.ToLower().Contains(term)));

            var reports = await reportsQuery.Take(10)
                .Select(r => new SearchResultItemDto("DailyReport", r.Id, $"Daily Report - {r.ReportDate:yyyy-MM-dd}", r.WorkCompleted, r.Status.ToString(), r.CreatedAt, $"/daily-reports/{r.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(reports);
        }

        // 9. Data Sheets
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("DataSheet", StringComparison.OrdinalIgnoreCase))
        {
            var dataSheetsQuery = _dbContext.ProductDataSheets.AsNoTracking()
                .Where(ds => !ds.IsDeleted && (!ds.ProjectId.HasValue || authorizedProjectIds.Contains(ds.ProjectId.Value)));

            if (projectId.HasValue) dataSheetsQuery = dataSheetsQuery.Where(ds => ds.ProjectId == projectId.Value);
            if (siteId.HasValue) dataSheetsQuery = dataSheetsQuery.Where(ds => ds.SiteId == siteId.Value);
            if (dateFrom.HasValue) dataSheetsQuery = dataSheetsQuery.Where(ds => ds.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) dataSheetsQuery = dataSheetsQuery.Where(ds => ds.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                dataSheetsQuery = dataSheetsQuery.Where(ds => ds.Product.ToLower().Contains(term) || (ds.Manufacturer != null && ds.Manufacturer.ToLower().Contains(term)) || (ds.Model != null && ds.Model.ToLower().Contains(term)) || (ds.PartNumber != null && ds.PartNumber.ToLower().Contains(term)));

            var dataSheets = await dataSheetsQuery.Take(10)
                .Select(ds => new SearchResultItemDto("DataSheet", ds.Id, ds.Product, $"Mfr: {ds.Manufacturer} | Model: {ds.Model}", "Active", ds.CreatedAt, $"/datasheets/{ds.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(dataSheets);
        }

        // 10. Chat Messages
        if (string.IsNullOrEmpty(entityType) || entityType.Equals("Message", StringComparison.OrdinalIgnoreCase))
        {
            var chatQuery = _dbContext.Messages.AsNoTracking()
                .Where(m => !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == currentUserId));

            if (dateFrom.HasValue) chatQuery = chatQuery.Where(m => m.CreatedAt >= dateFrom.Value);
            if (dateTo.HasValue) chatQuery = chatQuery.Where(m => m.CreatedAt <= dateTo.Value);
            if (!string.IsNullOrWhiteSpace(term))
                chatQuery = chatQuery.Where(m => m.Content.ToLower().Contains(term));

            var chatMessages = await chatQuery
                .OrderByDescending(m => m.CreatedAt)
                .Take(8)
                .Select(m => new SearchResultItemDto(
                    "ChatMessage",
                    m.Id,
                    m.Content.Length > 80 ? m.Content.Substring(0, 80) : m.Content,
                    m.Sender != null ? (m.Sender.FirstName + " " + m.Sender.LastName) : null,
                    "Message",
                    m.CreatedAt,
                    $"/chat/{m.ConversationId}"))
                .ToListAsync(cancellationToken);
            results.AddRange(chatMessages);
        }

        return Ok(new GlobalSearchResponseDto(q ?? string.Empty, results.Count, results));
    }

    // ==========================================
    // UX-05: MTI Activity Center (Unified Activity Timeline)
    // ==========================================

    [HttpGet("activity")]
    public async Task<ActionResult<ApiResponse<List<ActivityTimelineItemDto>>>> GetActivityTimeline(
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? siteId = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] Guid? teamId = null,
        [FromQuery] string? activityType = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        var authorizedProjectIds = isAdmin
            ? await _dbContext.Projects.Where(p => !p.IsDeleted).Select(p => p.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedProjectIdsAsync(currentUserId, cancellationToken: cancellationToken)).ToList();
        var authorizedSiteIds = isAdmin
            ? await _dbContext.Sites.Where(s => !s.IsDeleted).Select(s => s.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedSiteIdsAsync(currentUserId, cancellationToken: cancellationToken)).ToList();

        var query = _dbContext.AuditLogs.AsNoTracking().AsQueryable();

        // Security scoping: non-admins only see logs within their authorized scopes or own user actions
        if (!isAdmin)
        {
            query = query.Where(a =>
                (a.ProjectId.HasValue && authorizedProjectIds.Contains(a.ProjectId.Value)) ||
                (a.SiteId.HasValue && authorizedSiteIds.Contains(a.SiteId.Value)) ||
                a.UserId == currentUserId);
        }

        if (projectId.HasValue)
        {
            if (!isAdmin && !authorizedProjectIds.Contains(projectId.Value)) return Forbid();
            query = query.Where(a => a.ProjectId == projectId.Value);
        }

        if (siteId.HasValue)
        {
            if (!isAdmin && !authorizedSiteIds.Contains(siteId.Value)) return Forbid();
            query = query.Where(a => a.SiteId == siteId.Value);
        }

        if (userId.HasValue)
        {
            query = query.Where(a => a.UserId == userId.Value);
        }

        if (teamId.HasValue)
        {
            var teamMemberIds = await _dbContext.TeamMembers
                .Where(tm => tm.TeamId == teamId.Value)
                .Select(tm => tm.UserId)
                .ToListAsync(cancellationToken);
            query = query.Where(a => a.UserId.HasValue && teamMemberIds.Contains(a.UserId.Value));
        }

        if (!string.IsNullOrWhiteSpace(activityType))
        {
            var at = activityType.Trim().ToLower();
            query = query.Where(a => a.Action.ToLower().Contains(at) || a.EntityType.ToLower().Contains(at));
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(a => a.CreatedAt >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(a => a.CreatedAt <= dateTo.Value);
        }

        var p = Math.Max(1, page);
        var ps = Math.Clamp(pageSize, 1, 100);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(a => new
            {
                a.Id,
                a.UserId,
                UserName = a.User != null ? (a.User.FirstName + " " + a.User.LastName) : null,
                UserEmail = a.User != null ? a.User.Email : null,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.ProjectId,
                a.SiteId,
                a.OldValues,
                a.NewValues,
                a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var projectIdsInLogs = items.Where(x => x.ProjectId.HasValue).Select(x => x.ProjectId!.Value).Distinct().ToList();
        var siteIdsInLogs = items.Where(x => x.SiteId.HasValue).Select(x => x.SiteId!.Value).Distinct().ToList();

        var projectDict = await _dbContext.Projects
            .Where(pr => projectIdsInLogs.Contains(pr.Id))
            .ToDictionaryAsync(pr => pr.Id, pr => pr.Name, cancellationToken);

        var siteDict = await _dbContext.Sites
            .Where(st => siteIdsInLogs.Contains(st.Id))
            .ToDictionaryAsync(st => st.Id, st => st.Name, cancellationToken);

        var dtos = items.Select(x => new ActivityTimelineItemDto(
            x.Id,
            x.UserId,
            x.UserName,
            x.UserEmail,
            x.Action,
            x.EntityType,
            x.EntityId,
            x.ProjectId,
            x.ProjectId.HasValue && projectDict.TryGetValue(x.ProjectId.Value, out var pName) ? pName : null,
            x.SiteId,
            x.SiteId.HasValue && siteDict.TryGetValue(x.SiteId.Value, out var sName) ? sName : null,
            x.OldValues,
            x.NewValues,
            x.CreatedAt
        )).ToList();

        return Ok(ApiResponse<List<ActivityTimelineItemDto>>.SuccessResult(dtos));
    }

    [HttpGet("reports/dashboard-stats")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<ActionResult<AdminDashboardStatsDto>> GetAdminDashboardStats(CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();
        if (!HasPermission(Permissions.ReportsView) && !User.IsInRole("Admin") && !User.IsInRole("SystemAdmin") && !User.IsInRole("ProjectManager"))
            return Forbid();

        var totalProjects = await _dbContext.Projects.CountAsync(p => !p.IsDeleted, cancellationToken: cancellationToken);
        var activeProjects = await _dbContext.Projects.CountAsync(p => !p.IsDeleted && p.Status == ProjectStatus.Active, cancellationToken: cancellationToken);
        var totalSites = await _dbContext.Sites.CountAsync(s => !s.IsDeleted, cancellationToken: cancellationToken);
        var activeSites = await _dbContext.Sites.CountAsync(s => !s.IsDeleted && s.Status == SiteStatus.Active, cancellationToken: cancellationToken);

        var totalEngineers = await _dbContext.UserRoles.CountAsync(ur => ur.Role.Name == "Engineer", cancellationToken: cancellationToken);

        var pendingApprovals = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && (d.Status == DataRecordStatus.Submitted || d.Status == DataRecordStatus.UnderReview), cancellationToken: cancellationToken);
        var approvedData = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && d.Status == DataRecordStatus.Approved, cancellationToken: cancellationToken);
        var rejectedData = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && d.Status == DataRecordStatus.Rejected, cancellationToken: cancellationToken);

        var now = DateTime.UtcNow;
        var openTasks = await _dbContext.Tasks.CountAsync(t => !t.IsDeleted && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled, cancellationToken: cancellationToken);
        var completedTasks = await _dbContext.Tasks.CountAsync(t => !t.IsDeleted && t.Status == TaskItemStatus.Completed, cancellationToken: cancellationToken);
        var overdueTasks = await _dbContext.Tasks.CountAsync(t => !t.IsDeleted && t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled, cancellationToken: cancellationToken);

        var unreadNotifications = await _dbContext.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken: cancellationToken);

        var unreadMessages = await _dbContext.Messages.CountAsync(m => !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == userId) &&
                                                                       m.SenderUserId != userId && !m.ReadStates.Any(rs => rs.UserId == userId), cancellationToken: cancellationToken);

        var delayedProjects = await _dbContext.Projects.CountAsync(
            p => !p.IsDeleted && p.Status == ProjectStatus.Active && p.EndDate.HasValue && p.EndDate < now,
            cancellationToken: cancellationToken);
        var totalTeams = await _dbContext.Teams.CountAsync(t => !t.IsDeleted, cancellationToken: cancellationToken);
        var pendingDocuments = await _dbContext.Documents.CountAsync(
            d => !d.IsDeleted && (d.Status == DocumentStatus.Submitted || d.Status == DocumentStatus.UnderReview),
            cancellationToken: cancellationToken);
        var openIssues = await _dbContext.ProjectIssues.CountAsync(
            i => !i.IsDeleted && i.Status != IssueStatus.Resolved && i.Status != IssueStatus.Closed,
            cancellationToken: cancellationToken);
        var criticalRisks = await _dbContext.ProjectRisks.CountAsync(
            r => !r.IsDeleted && r.Severity == RiskSeverity.Critical && r.Status != RiskStatus.Closed,
            cancellationToken: cancellationToken);
        var maintenanceTickets = await _dbContext.CompanyAssets.CountAsync(
            a => !a.IsDeleted && a.Status == AssetStatus.UnderMaintenance,
            cancellationToken: cancellationToken);
        var warrantyCutoff = now.AddDays(30);
        var expiringWarranties = await _dbContext.CompanyAssets.CountAsync(
            a => !a.IsDeleted && a.WarrantyExpiry.HasValue && a.WarrantyExpiry >= now && a.WarrantyExpiry <= warrantyCutoff,
            cancellationToken: cancellationToken);

        return Ok(new AdminDashboardStatsDto(
            totalProjects,
            activeProjects,
            totalSites,
            activeSites,
            totalEngineers,
            pendingApprovals,
            approvedData,
            rejectedData,
            openTasks,
            completedTasks,
            overdueTasks,
            unreadNotifications,
            unreadMessages,
            delayedProjects,
            totalTeams,
            pendingDocuments,
            openIssues,
            criticalRisks,
            maintenanceTickets,
            expiringWarranties
        ));
    }

    [HttpGet("reports/engineer-stats")]
    public async Task<ActionResult<EngineerDashboardStatsDto>> GetEngineerDashboardStats(CancellationToken cancellationToken)
    {
        // Delegate to the same auth-scoped shape used by /api/dashboard/engineer
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken: cancellationToken);
        var authorizedProjectIds = await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken: cancellationToken);

        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);

        var myTasks = await _dbContext.Tasks.AsNoTracking()
            .Where(t => !t.IsDeleted && (
                t.AssignedToUserId == userId ||
                (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)) ||
                authorizedProjectIds.Contains(t.ProjectId)))
            .ToListAsync(cancellationToken);

        var pendingTasksCount = myTasks.Count(t => t.Status == TaskItemStatus.ToDo || t.Status == TaskItemStatus.InProgress);
        var overdueTasksCount = myTasks.Count(t => t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled);
        var completedTasksCount = myTasks.Count(t => t.Status == TaskItemStatus.Completed);
        var todayTasksCount = myTasks.Count(t =>
            t.DueAt.HasValue && t.DueAt.Value >= today && t.DueAt.Value < tomorrow &&
            t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled);

        var pendingDocumentsCount = await _dbContext.Documents.CountAsync(d =>
            !d.IsDeleted && authorizedProjectIds.Contains(d.ProjectId) &&
            (d.Status == DocumentStatus.Draft || d.Status == DocumentStatus.Submitted || d.Status == DocumentStatus.UnderReview || d.Status == DocumentStatus.CorrectionRequested),
            cancellationToken);

        var unreadMessages = await _dbContext.Messages.CountAsync(m =>
            !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == userId) &&
            m.SenderUserId != userId && !m.ReadStates.Any(rs => rs.UserId == userId),
            cancellationToken);

        var recentMessages = await _dbContext.Messages.AsNoTracking()
            .Where(m => !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == userId))
            .OrderByDescending(m => m.CreatedAt)
            .Take(5)
            .Select(m => new RecentMessagePreviewDto(
                m.Id,
                m.ConversationId,
                m.Content.Length > 120 ? m.Content.Substring(0, 120) : m.Content,
                m.Sender != null ? (m.Sender.FirstName + " " + m.Sender.LastName) : "Unknown",
                m.CreatedAt))
            .ToListAsync(cancellationToken);

        var dailyReportsCount = await _dbContext.DailySiteReports.CountAsync(r =>
            !r.IsDeleted && authorizedSiteIds.Contains(r.SiteId) &&
            (r.ReportDate.Date == today || r.Status == DailyReportStatus.Draft || r.Status == DailyReportStatus.Submitted),
            cancellationToken);

        var openIssuesCount = await _dbContext.ProjectIssues.CountAsync(i =>
            !i.IsDeleted && authorizedProjectIds.Contains(i.ProjectId) && i.Status == IssueStatus.Open,
            cancellationToken);

        var siteOperationsCount = await _dbContext.SiteOperations.CountAsync(o =>
            !o.IsDeleted && authorizedSiteIds.Contains(o.SiteId) &&
            o.Status != SiteOperationStatus.Completed && o.Status != SiteOperationStatus.Cancelled,
            cancellationToken);

        var pendingDataCount = await _dbContext.ProjectDataRecords.CountAsync(d =>
            !d.IsDeleted && d.SubmittedBy == userId &&
            (d.Status == DataRecordStatus.Draft || d.Status == DataRecordStatus.Submitted || d.Status == DataRecordStatus.ChangesRequested),
            cancellationToken);
        var approvedDataCount = await _dbContext.ProjectDataRecords.CountAsync(d =>
            !d.IsDeleted && d.SubmittedBy == userId && d.Status == DataRecordStatus.Approved,
            cancellationToken);
        var unreadNotifications = await _dbContext.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);

        return Ok(new EngineerDashboardStatsDto(
            authorizedProjectIds.Count,
            authorizedSiteIds.Count,
            myTasks.Count,
            pendingTasksCount,
            overdueTasksCount,
            completedTasksCount,
            pendingDataCount,
            approvedDataCount,
            unreadNotifications,
            unreadMessages,
            todayTasksCount,
            pendingDocumentsCount,
            recentMessages,
            dailyReportsCount,
            openIssuesCount,
            siteOperationsCount
        ));
    }

    /// <summary>REPORT-01: Catalog of available report keys.</summary>
    [HttpGet("reports/catalog")]
    public ActionResult<List<ReportCatalogItemDto>> GetReportsCatalog()
    {
        if (!HasPermission(Permissions.ReportsView))
            return Forbid();

        var catalog = new List<ReportCatalogItemDto>
        {
            new("projects-summary", "Projects Summary", "Overview of all authorized projects", "Projects", true),
            new("sites-summary", "Sites Summary", "Overview of authorized sites", "Sites", true),
            new("tasks-status", "Tasks Status", "Task breakdown by status", "Tasks", true),
            new("overdue-tasks", "Overdue Tasks", "Tasks past due date", "Tasks", true),
            new("project-data", "Project Data Records", "Submitted site/project data", "ProjectData", true),
            new("documents-status", "Documents Status", "Document inventory by status", "Documents", true),
            new("invoices-aging", "Invoices Aging", "Invoice due/overdue summary", "Invoices", true),
            new("assets-inventory", "Assets Inventory", "Company assets by project/site", "Assets", true),
            new("daily-reports", "Daily Site Reports", "Daily site report listing", "DailyReports", true),
            new("boq-summary", "BOQ Summary", "Bill of quantities items", "BoqItems", true),
            new("engineer-productivity", "Engineer Productivity", "Tasks completed per engineer", "Tasks", true)
        };

        return Ok(catalog);
    }

    /// <summary>
    /// REPORT-01: CSV export (default). format=xlsx returns same CSV body with Excel MIME
    /// (ClosedXML/QuestPDF not in project — PDF returns 501).
    /// </summary>
    [HttpGet("reports/export")]
    public async Task<IActionResult> ExportData(
        [FromQuery] string entityType,
        [FromQuery] Guid? projectId = null,
        [FromQuery] string format = "csv",
        CancellationToken cancellationToken = default)
    {
        if (!HasPermission(Permissions.ReportsExport))
            return Forbid();

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        var authorizedProjectIds = isAdmin
            ? await _dbContext.Projects.Where(p => !p.IsDeleted).Select(p => p.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken: cancellationToken)).ToList();
        var authorizedSiteIds = isAdmin
            ? await _dbContext.Sites.Where(s => !s.IsDeleted).Select(s => s.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken: cancellationToken)).ToList();

        var fmt = (format ?? "csv").Trim().ToLowerInvariant();
        if (fmt is "pdf")
        {
            // Prefer CSV + Excel MIME; no ClosedXML/QuestPDF in project.
            return StatusCode(StatusCodes.Status501NotImplemented, new
            {
                message = "PDF export is not implemented. Use format=csv or format=xlsx."
            });
        }

        var csv = new StringBuilder();
        string fileBase;

        if (entityType.Equals("ProjectData", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.ProjectDataRecords.AsNoTracking()
                .Where(d => !d.IsDeleted)
                .Include(d => d.Project).Include(d => d.Site).Include(d => d.Submitter)
                .AsQueryable();
            if (!isAdmin) query = query.Where(d => authorizedSiteIds.Contains(d.SiteId));
            if (projectId.HasValue) query = query.Where(d => d.ProjectId == projectId.Value);
            var records = await query.OrderByDescending(d => d.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,Title,Project,Site,Submitter,Status,Version,SubmittedAt,ApprovedAt,CreatedAt");
            foreach (var r in records)
                csv.AppendLine($"\"{r.Id}\",\"{EscapeCsv(r.Title)}\",\"{EscapeCsv(r.Project.Name)}\",\"{EscapeCsv(r.Site.Name)}\",\"{EscapeCsv($"{r.Submitter.FirstName} {r.Submitter.LastName}")}\",\"{r.Status}\",\"{r.Version}\",\"{r.SubmittedAt:yyyy-MM-dd}\",\"{r.ApprovedAt:yyyy-MM-dd}\",\"{r.CreatedAt:yyyy-MM-dd}\"");
            fileBase = "ProjectData";
        }
        else if (entityType.Equals("Tasks", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.Tasks.AsNoTracking()
                .Where(t => !t.IsDeleted)
                .Include(t => t.Project).Include(t => t.Site).Include(t => t.AssignedToUser)
                .AsQueryable();
            if (!isAdmin)
                query = query.Where(t => t.AssignedToUserId == userId || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)) || authorizedProjectIds.Contains(t.ProjectId));
            if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
            var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,Title,Project,Site,Priority,Status,AssignedTo,DueAt,CompletedAt,CreatedAt");
            foreach (var t in tasks)
            {
                var assignedName = t.AssignedToUser != null ? $"{t.AssignedToUser.FirstName} {t.AssignedToUser.LastName}" : "Unassigned";
                csv.AppendLine($"\"{t.Id}\",\"{EscapeCsv(t.Title)}\",\"{EscapeCsv(t.Project.Name)}\",\"{EscapeCsv(t.Site?.Name ?? "-")}\",\"{t.Priority}\",\"{t.Status}\",\"{EscapeCsv(assignedName)}\",\"{t.DueAt:yyyy-MM-dd}\",\"{t.CompletedAt:yyyy-MM-dd}\",\"{t.CreatedAt:yyyy-MM-dd}\"");
            }
            fileBase = "Tasks";
        }
        else if (entityType.Equals("Projects", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.Projects.AsNoTracking().Where(p => !p.IsDeleted && authorizedProjectIds.Contains(p.Id));
            var items = await query.OrderByDescending(p => p.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,Code,Name,Client,Status,Priority,Progress,StartDate,EndDate,CreatedAt");
            foreach (var p in items)
                csv.AppendLine($"\"{p.Id}\",\"{EscapeCsv(p.Code)}\",\"{EscapeCsv(p.Name)}\",\"{EscapeCsv(p.ClientName)}\",\"{p.Status}\",\"{p.Priority}\",\"{p.ProgressPercentage}\",\"{p.StartDate:yyyy-MM-dd}\",\"{p.EndDate:yyyy-MM-dd}\",\"{p.CreatedAt:yyyy-MM-dd}\"");
            fileBase = "Projects";
        }
        else if (entityType.Equals("Sites", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.Sites.AsNoTracking().Where(s => !s.IsDeleted && authorizedSiteIds.Contains(s.Id));
            if (projectId.HasValue) query = query.Where(s => s.ProjectId == projectId.Value);
            var items = await query.OrderByDescending(s => s.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,Code,Name,ProjectId,Address,Status,CreatedAt");
            foreach (var s in items)
                csv.AppendLine($"\"{s.Id}\",\"{EscapeCsv(s.Code)}\",\"{EscapeCsv(s.Name)}\",\"{s.ProjectId}\",\"{EscapeCsv(s.Address)}\",\"{s.Status}\",\"{s.CreatedAt:yyyy-MM-dd}\"");
            fileBase = "Sites";
        }
        else if (entityType.Equals("Documents", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.Documents.AsNoTracking()
                .Include(d => d.DocumentType)
                .Where(d => !d.IsDeleted && authorizedProjectIds.Contains(d.ProjectId));
            if (projectId.HasValue) query = query.Where(d => d.ProjectId == projectId.Value);
            var items = await query.OrderByDescending(d => d.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,DocumentNumber,Title,Type,ProjectId,Status,CreatedAt");
            foreach (var d in items)
                csv.AppendLine($"\"{d.Id}\",\"{EscapeCsv(d.DocumentNumber)}\",\"{EscapeCsv(d.Title)}\",\"{EscapeCsv(d.DocumentType?.Code ?? "")}\",\"{d.ProjectId}\",\"{d.Status}\",\"{d.CreatedAt:yyyy-MM-dd}\"");
            fileBase = "Documents";
        }
        else if (entityType.Equals("Assets", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.CompanyAssets.AsNoTracking()
                .Where(a => !a.IsDeleted && (!a.ProjectId.HasValue || authorizedProjectIds.Contains(a.ProjectId.Value)));
            if (projectId.HasValue) query = query.Where(a => a.ProjectId == projectId.Value);
            var items = await query.OrderByDescending(a => a.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,AssetTag,Name,Category,Status,ProjectId,SiteId,SerialNumber,CreatedAt");
            foreach (var a in items)
                csv.AppendLine($"\"{a.Id}\",\"{EscapeCsv(a.AssetTag)}\",\"{EscapeCsv(a.Name)}\",\"{EscapeCsv(a.Category)}\",\"{a.Status}\",\"{a.ProjectId}\",\"{a.AssignedToSiteId}\",\"{EscapeCsv(a.SerialNumber)}\",\"{a.CreatedAt:yyyy-MM-dd}\"");
            fileBase = "Assets";
        }
        else if (entityType.Equals("Invoices", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.ProjectInvoices.AsNoTracking()
                .Include(i => i.Project)
                .Where(i => !i.IsDeleted && authorizedProjectIds.Contains(i.ProjectId));
            if (projectId.HasValue) query = query.Where(i => i.ProjectId == projectId.Value);
            var items = await query.OrderByDescending(i => i.CreatedAt).ToListAsync(cancellationToken);
            csv.AppendLine("ID,InvoiceNumber,Project,Amount,Tax,Total,Currency,Status,DueDate,PaidDate,CreatedAt");
            foreach (var i in items)
            {
                var total = i.Total > 0 ? i.Total : (i.Amount + i.Tax);
                csv.AppendLine($"\"{i.Id}\",\"{EscapeCsv(i.InvoiceNumber)}\",\"{EscapeCsv(i.Project?.Name ?? "")}\",\"{i.Amount}\",\"{i.Tax}\",\"{total}\",\"{i.Currency}\",\"{i.Status}\",\"{i.DueDate:yyyy-MM-dd}\",\"{i.PaidDate:yyyy-MM-dd}\",\"{i.CreatedAt:yyyy-MM-dd}\"");
            }
            fileBase = "Invoices";
        }
        else
        {
            return BadRequest(new { message = $"Unsupported entityType '{entityType}'. Use Projects, Sites, Tasks, ProjectData, Documents, Assets, or Invoices." });
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd");
        // format=xlsx: same CSV body with Excel MIME (no ClosedXML dependency)
        if (fmt is "xlsx" or "xls")
            return File(bytes, "application/vnd.ms-excel", $"{fileBase}_Export_{stamp}.xls");

        return File(bytes, "text/csv", $"{fileBase}_Export_{stamp}.csv");
    }

    private static string EscapeCsv(string val) => (val ?? string.Empty).Replace("\"", "\"\"");
}
