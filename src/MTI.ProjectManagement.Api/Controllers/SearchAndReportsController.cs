using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class SearchAndReportsController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;

    public SearchAndReportsController(
        IAppDbContext dbContext,
        IResourceAuthorizationService resourceAuthorization)
    {
        _dbContext = dbContext;
        _resourceAuthorization = resourceAuthorization;
    }

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

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        var results = new List<SearchResultItemDto>();

        // 1. Projects
        var projectsQuery = _dbContext.Projects.AsNoTracking().Where(p => !p.IsDeleted);
        if (!isAdmin)
        {
            var authorizedProjectIds = await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken);
            projectsQuery = projectsQuery.Where(p => authorizedProjectIds.Contains(p.Id));
        }
        var projects = await projectsQuery
            .Where(p => p.Name.ToLower().Contains(term) || p.Code.ToLower().Contains(term) || (p.Description != null && p.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(p => new SearchResultItemDto("Project", p.Id, p.Name, $"Code: {p.Code} | Client: {p.ClientName}", p.Status.ToString(), p.CreatedAt, $"/projects/{p.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(projects);

        // 2. Sites
        var sitesQuery = _dbContext.Sites.AsNoTracking().Where(s => !s.IsDeleted);
        if (!isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
            sitesQuery = sitesQuery.Where(s => authorizedSiteIds.Contains(s.Id));
        }
        var sites = await sitesQuery
            .Where(s => s.Name.ToLower().Contains(term) || s.Code.ToLower().Contains(term) || (s.Description != null && s.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(s => new SearchResultItemDto("Site", s.Id, s.Name, $"Code: {s.Code} | Address: {s.Address}", s.Status.ToString(), s.CreatedAt, $"/sites/{s.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(sites);

        // 3. Project Data
        var dataQuery = _dbContext.ProjectDataRecords.AsNoTracking().Where(d => !d.IsDeleted);
        if (!isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
            dataQuery = dataQuery.Where(d => authorizedSiteIds.Contains(d.SiteId));
        }
        var dataRecords = await dataQuery
            .Where(d => d.Title.ToLower().Contains(term) || (d.Description != null && d.Description.ToLower().Contains(term)))
            .Take(10)
            .Select(d => new SearchResultItemDto("ProjectData", d.Id, d.Title, $"Version: {d.Version}", d.Status.ToString(), d.CreatedAt, $"/project-data/{d.Id}"))
            .ToListAsync(cancellationToken);
        results.AddRange(dataRecords);

        // 4. Tasks
        var tasksQuery = _dbContext.Tasks.AsNoTracking().Where(t => !t.IsDeleted);
        if (!isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
            tasksQuery = tasksQuery.Where(t => t.AssignedToUserId == userId || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)));
        }
        var tasks = await tasksQuery
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

        return Ok(new GlobalSearchResponseDto(q, results.Count, results));
    }

    [HttpGet("reports/dashboard-stats")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<ActionResult<AdminDashboardStatsDto>> GetAdminDashboardStats(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);

        var totalProjects = await _dbContext.Projects.CountAsync(p => !p.IsDeleted, cancellationToken);
        var activeProjects = await _dbContext.Projects.CountAsync(p => !p.IsDeleted && p.Status == ProjectStatus.Active, cancellationToken);
        var totalSites = await _dbContext.Sites.CountAsync(s => !s.IsDeleted, cancellationToken);
        var activeSites = await _dbContext.Sites.CountAsync(s => !s.IsDeleted && s.Status == SiteStatus.Active, cancellationToken);

        var totalEngineers = await _dbContext.UserRoles.CountAsync(ur => ur.Role.Name == "Engineer", cancellationToken);

        var pendingApprovals = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && (d.Status == DataRecordStatus.Submitted || d.Status == DataRecordStatus.UnderReview), cancellationToken);
        var approvedData = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && d.Status == DataRecordStatus.Approved, cancellationToken);
        var rejectedData = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && d.Status == DataRecordStatus.Rejected, cancellationToken);

        var now = DateTime.UtcNow;
        var openTasks = await _dbContext.Tasks.CountAsync(t => !t.IsDeleted && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled, cancellationToken);
        var completedTasks = await _dbContext.Tasks.CountAsync(t => !t.IsDeleted && t.Status == TaskItemStatus.Completed, cancellationToken);
        var overdueTasks = await _dbContext.Tasks.CountAsync(t => !t.IsDeleted && t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled, cancellationToken);

        var unreadNotifications = await _dbContext.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);

        var unreadMessages = await _dbContext.Messages.CountAsync(m => !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == userId) &&
                                                                       m.SenderUserId != userId && !m.ReadStates.Any(rs => rs.UserId == userId), cancellationToken);

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
            unreadMessages
        ));
    }

    [HttpGet("reports/engineer-stats")]
    public async Task<ActionResult<EngineerDashboardStatsDto>> GetEngineerDashboardStats(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
        var authorizedProjectIds = await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken);

        var myProjectsCount = authorizedProjectIds.Count;
        var mySitesCount = authorizedSiteIds.Count;

        var now = DateTime.UtcNow;
        var myTasks = await _dbContext.Tasks.AsNoTracking().Where(t => !t.IsDeleted && t.AssignedToUserId == userId).ToListAsync(cancellationToken);
        var myTasksCount = myTasks.Count;
        var pendingTasksCount = myTasks.Count(t => t.Status == TaskItemStatus.ToDo || t.Status == TaskItemStatus.InProgress);
        var overdueTasksCount = myTasks.Count(t => t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled);
        var completedTasksCount = myTasks.Count(t => t.Status == TaskItemStatus.Completed);

        var pendingDataCount = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && d.SubmittedBy == userId && (d.Status == DataRecordStatus.Draft || d.Status == DataRecordStatus.Submitted || d.Status == DataRecordStatus.ChangesRequested), cancellationToken);
        var approvedDataCount = await _dbContext.ProjectDataRecords.CountAsync(d => !d.IsDeleted && d.SubmittedBy == userId && d.Status == DataRecordStatus.Approved, cancellationToken);

        var unreadNotifications = await _dbContext.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken);
        var unreadMessages = await _dbContext.Messages.CountAsync(m => !m.IsDeleted && m.Conversation.Members.Any(mb => mb.UserId == userId) &&
                                                                       m.SenderUserId != userId && !m.ReadStates.Any(rs => rs.UserId == userId), cancellationToken);

        return Ok(new EngineerDashboardStatsDto(
            myProjectsCount,
            mySitesCount,
            myTasksCount,
            pendingTasksCount,
            overdueTasksCount,
            completedTasksCount,
            pendingDataCount,
            approvedDataCount,
            unreadNotifications,
            unreadMessages
        ));
    }

    [HttpGet("reports/export")]
    public async Task<IActionResult> ExportData(
        [FromQuery] string entityType, // "ProjectData" or "Tasks"
        [FromQuery] Guid? projectId = null,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        var csv = new StringBuilder();

        if (entityType.Equals("ProjectData", StringComparison.OrdinalIgnoreCase))
        {
            var query = _dbContext.ProjectDataRecords
                .AsNoTracking()
                .Where(d => !d.IsDeleted)
                .Include(d => d.Project)
                .Include(d => d.Site)
                .Include(d => d.Submitter)
                .AsQueryable();

            if (!isAdmin)
            {
                var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
                query = query.Where(d => authorizedSiteIds.Contains(d.SiteId));
            }

            if (projectId.HasValue) query = query.Where(d => d.ProjectId == projectId.Value);

            var records = await query.OrderByDescending(d => d.CreatedAt).ToListAsync(cancellationToken);

            csv.AppendLine("ID,Title,Project,Site,Submitter,Status,Version,SubmittedAt,ApprovedAt,CreatedAt");
            foreach (var r in records)
            {
                csv.AppendLine($"\"{r.Id}\",\"{EscapeCsv(r.Title)}\",\"{EscapeCsv(r.Project.Name)}\",\"{EscapeCsv(r.Site.Name)}\",\"{EscapeCsv($"{r.Submitter.FirstName} {r.Submitter.LastName}")}\",\"{r.Status}\",\"{r.Version}\",\"{r.SubmittedAt:yyyy-MM-dd}\",\"{r.ApprovedAt:yyyy-MM-dd}\",\"{r.CreatedAt:yyyy-MM-dd}\"");
            }

            return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"ProjectData_Export_{DateTime.UtcNow:yyyyMMdd}.csv");
        }
        else
        {
            var query = _dbContext.Tasks
                .AsNoTracking()
                .Where(t => !t.IsDeleted)
                .Include(t => t.Project)
                .Include(t => t.Site)
                .Include(t => t.AssignedToUser)
                .AsQueryable();

            if (!isAdmin)
            {
                var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
                query = query.Where(t => t.AssignedToUserId == userId || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)));
            }

            if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);

            var tasks = await query.OrderByDescending(t => t.CreatedAt).ToListAsync(cancellationToken);

            csv.AppendLine("ID,Title,Project,Site,Priority,Status,AssignedTo,DueAt,CompletedAt,CreatedAt");
            foreach (var t in tasks)
            {
                var assignedName = t.AssignedToUser != null ? $"{t.AssignedToUser.FirstName} {t.AssignedToUser.LastName}" : "Unassigned";
                csv.AppendLine($"\"{t.Id}\",\"{EscapeCsv(t.Title)}\",\"{EscapeCsv(t.Project.Name)}\",\"{EscapeCsv(t.Site?.Name ?? "-")}\",\"{t.Priority}\",\"{t.Status}\",\"{EscapeCsv(assignedName)}\",\"{t.DueAt:yyyy-MM-dd}\",\"{t.CompletedAt:yyyy-MM-dd}\",\"{t.CreatedAt:yyyy-MM-dd}\"");
            }

            return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv", $"Tasks_Export_{DateTime.UtcNow:yyyyMMdd}.csv");
        }
    }

    private static string EscapeCsv(string val) => val.Replace("\"", "\"\"");
}
