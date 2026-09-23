using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Api.Helpers;
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
        [FromQuery] string q,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q))
            return Ok(new GlobalSearchResponseDto(string.Empty, 0, new List<SearchResultItemDto>()));

        var term = q.Trim().ToLower();
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        var authorizedProjectIds = isAdmin
            ? await _dbContext.Projects.Where(p => !p.IsDeleted).Select(p => p.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken: cancellationToken)).ToList();
        var authorizedSiteIds = isAdmin
            ? await _dbContext.Sites.Where(s => !s.IsDeleted).Select(s => s.Id).ToListAsync(cancellationToken)
            : (await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken: cancellationToken)).ToList();

        var results = new List<SearchResultItemDto>();

        // 1. Projects
        var projects = await _dbContext.Projects.AsNoTracking()
            .Where(p => !p.IsDeleted && authorizedProjectIds.Contains(p.Id))
            .Where(p => p.Name.ToLower().Contains(term) || p.Code.ToLower().Contains(term) || (p.Description != null && p.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(p => new SearchResultItemDto("Project", p.Id, p.Name, $"Code: {p.Code} | Client: {p.ClientName}", p.Status.ToString(), p.CreatedAt, $"/projects/{p.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(projects);

        // 2. Sites
        var sites = await _dbContext.Sites.AsNoTracking()
            .Where(s => !s.IsDeleted && authorizedSiteIds.Contains(s.Id))
            .Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term) || (s.Description != null && s.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(s => new SearchResultItemDto("Site", s.Id, s.Name, $"Code: {s.Code} | Address: {s.Address}", s.Status.ToString(), s.CreatedAt, $"/sites/{s.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(sites);

        // 3. Project Data
        var dataRecords = await _dbContext.ProjectDataRecords.AsNoTracking()
            .Where(d => !d.IsDeleted && authorizedSiteIds.Contains(d.SiteId))
            .Where(d => d.Title.ToLower().Contains(term) || (d.Description != null && d.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(d => new SearchResultItemDto("ProjectData", d.Id, d.Title, $"Version: {d.Version}", d.Status.ToString(), d.CreatedAt, $"/project-data/{d.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(dataRecords);

        // 4. Tasks
        var tasks = await _dbContext.Tasks.AsNoTracking()
            .Where(t => !t.IsDeleted && (t.AssignedToUserId == userId || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)) || authorizedProjectIds.Contains(t.ProjectId)))
            .Where(t => t.Title.ToLower().Contains(term) || (t.Description != null && t.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(t => new SearchResultItemDto("Task", t.Id, t.Title, $"Priority: {t.Priority}", t.Status.ToString(), t.CreatedAt, $"/tasks/{t.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(tasks);

        // 5. Engineers (Admin only)
        if (isAdmin)
        {
            var users = await _dbContext.Users.AsNoTracking()
                .Where(u => !u.IsDeleted && (u.FirstName.ToLower().Contains(term) || u.LastName.ToLower().Contains(term) || u.Email.ToLower().Contains(term)))
                .Take(5)
                .Select(u => new SearchResultItemDto("User", u.Id, $"{u.FirstName} {u.LastName}", u.Email, u.IsActive ? "Active" : "Inactive", u.CreatedAt, $"/users/{u.Id}"))
                .ToListAsync(cancellationToken);
            results.AddRange(users);
        }

        // 6. Documents (title/number) — SEARCH-01
        var documents = await _dbContext.Documents.AsNoTracking()
            .Where(d => !d.IsDeleted && authorizedProjectIds.Contains(d.ProjectId))
            .Where(d => d.Title.ToLower().Contains(term) || d.DocumentNumber.ToLower().Contains(term))
            .Take(8)
            .Select(d => new SearchResultItemDto("Document", d.Id, d.Title, d.DocumentNumber, d.Status.ToString(), d.CreatedAt, $"/documents/{d.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(documents);

        // 7. BoqItems
        var boqItems = await _dbContext.BoqItems.AsNoTracking()
            .Where(b => !b.IsDeleted && authorizedProjectIds.Contains(b.ProjectId))
            .Where(b => b.ItemCode.ToLower().Contains(term) || b.Description.ToLower().Contains(term))
            .Take(8)
            .Select(b => new SearchResultItemDto("BoqItem", b.Id, b.ItemCode, b.Description, b.Category, b.CreatedAt, $"/projects/{b.ProjectId}/boq"))
            .ToListAsync(cancellationToken);
        results.AddRange(boqItems);

        // 8. CommercialOffers / TechnicalOffers
        var commercialOffers = await _dbContext.CommercialOffers.AsNoTracking()
            .Where(o => !o.IsDeleted && authorizedProjectIds.Contains(o.ProjectId))
            .Where(o => o.Title.ToLower().Contains(term))
            .Take(5)
            .Select(o => new SearchResultItemDto("CommercialOffer", o.Id, o.Title, $"Amount: {o.TotalAmount} {o.Currency}", o.Status.ToString(), o.CreatedAt, $"/projects/{o.ProjectId}/offers"))
            .ToListAsync(cancellationToken);
        results.AddRange(commercialOffers);

        var technicalOffers = await _dbContext.TechnicalOffers.AsNoTracking()
            .Where(o => !o.IsDeleted && authorizedProjectIds.Contains(o.ProjectId))
            .Where(o => o.Title.ToLower().Contains(term) || o.ScopeOfWork.ToLower().Contains(term))
            .Take(5)
            .Select(o => new { o.Id, o.Title, o.ScopeOfWork, o.Status, o.CreatedAt, o.ProjectId })
            .ToListAsync(cancellationToken);
        results.AddRange(technicalOffers.Select(o => new SearchResultItemDto(
            "TechnicalOffer",
            o.Id,
            o.Title,
            o.ScopeOfWork.Length > 80 ? o.ScopeOfWork[..80] : o.ScopeOfWork,
            o.Status.ToString(),
            o.CreatedAt,
            $"/projects/{o.ProjectId}/offers")));

        // 9. Invoices
        var invoices = await _dbContext.ProjectInvoices.AsNoTracking()
            .Where(i => !i.IsDeleted && authorizedProjectIds.Contains(i.ProjectId))
            .Where(i => i.InvoiceNumber.ToLower().Contains(term) || (i.Notes != null && i.Notes.ToLower().Contains(term)))
            .Take(8)
            .Select(i => new SearchResultItemDto("Invoice", i.Id, i.InvoiceNumber, i.MilestoneDescription, i.Status.ToString(), i.CreatedAt, $"/accounting/invoices/{i.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(invoices);

        // 10. CompanyAssets
        var assets = await _dbContext.CompanyAssets.AsNoTracking()
            .Where(a => !a.IsDeleted && (!a.ProjectId.HasValue || authorizedProjectIds.Contains(a.ProjectId.Value)))
            .Where(a => a.Name.ToLower().Contains(term) || a.AssetTag.ToLower().Contains(term) || a.SerialNumber.ToLower().Contains(term))
            .Take(8)
            .Select(a => new SearchResultItemDto("CompanyAsset", a.Id, a.Name, a.AssetTag, a.Status.ToString(), a.CreatedAt, $"/assets/{a.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(assets);

        // 11. Chat messages (only conversations user is member of)
        var chatMessages = await _dbContext.Messages.AsNoTracking()
            .Where(m => !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == userId))
            .Where(m => m.Content.ToLower().Contains(term))
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

        return Ok(new GlobalSearchResponseDto(q, results.Count, results));
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
