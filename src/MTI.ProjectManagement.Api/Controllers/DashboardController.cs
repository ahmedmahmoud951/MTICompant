using System.Security.Claims;
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
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly ICurrentUserService _currentUser;

    public DashboardController(
        IAppDbContext dbContext,
        IResourceAuthorizationService resourceAuthorization,
        ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _resourceAuthorization = resourceAuthorization;
        _currentUser = currentUser;
    }

    /// <summary>UI-ENGINEER: Auth-scoped engineer dashboard stats.</summary>
    [HttpGet("engineer")]
    public async Task<ActionResult<EngineerDashboardStatsDto>> GetEngineerDashboard(CancellationToken cancellationToken)
    {
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

        var myTasksCount = myTasks.Count;
        var pendingTasksCount = myTasks.Count(t => t.Status == TaskItemStatus.ToDo || t.Status == TaskItemStatus.InProgress);
        var overdueTasksCount = myTasks.Count(t => t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled);
        var completedTasksCount = myTasks.Count(t => t.Status == TaskItemStatus.Completed);
        var todayTasksCount = myTasks.Count(t =>
            t.DueAt.HasValue && t.DueAt.Value >= today && t.DueAt.Value < tomorrow &&
            t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled);

        var pendingDocumentsCount = await _dbContext.Documents.CountAsync(d =>
            !d.IsDeleted &&
            authorizedProjectIds.Contains(d.ProjectId) &&
            (d.Status == DocumentStatus.Draft || d.Status == DocumentStatus.Submitted || d.Status == DocumentStatus.UnderReview || d.Status == DocumentStatus.CorrectionRequested),
            cancellationToken);

        var unreadMessages = await _dbContext.Messages.CountAsync(m =>
            !m.IsDeleted &&
            m.Conversation.Members.Any(mb => mb.UserId == userId) &&
            m.SenderUserId != userId &&
            !m.ReadStates.Any(rs => rs.UserId == userId),
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
            !r.IsDeleted &&
            authorizedSiteIds.Contains(r.SiteId) &&
            (r.ReportDate.Date == today || r.Status == DailyReportStatus.Draft || r.Status == DailyReportStatus.Submitted),
            cancellationToken);

        var openIssuesCount = await _dbContext.ProjectIssues.CountAsync(i =>
            !i.IsDeleted &&
            authorizedProjectIds.Contains(i.ProjectId) &&
            i.Status == IssueStatus.Open,
            cancellationToken);

        var siteOperationsCount = await _dbContext.SiteOperations.CountAsync(o =>
            !o.IsDeleted &&
            authorizedSiteIds.Contains(o.SiteId) &&
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
            myTasksCount,
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

    /// <summary>UI-TECHNICAL: Auth-scoped technical office dashboard.</summary>
    [HttpGet("technical-office")]
    [Authorize(Roles = "TechnicalOffice,Admin,SystemAdmin,SuperAdmin,ProjectManager")]
    public async Task<ActionResult<TechnicalOfficeDashboardDto>> GetTechnicalOfficeDashboard(CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var hasPermission = _currentUser.IsAdmin || _currentUser.IsSystemAdmin ||
                            _currentUser.Roles.Contains("TechnicalOffice") ||
                            _currentUser.Roles.Contains("ProjectManager") ||
                            _currentUser.Permissions.Contains(Permissions.BoqView) ||
                            _currentUser.Permissions.Contains(Permissions.OffersView) ||
                            _currentUser.Permissions.Contains(Permissions.DocumentsView);

        if (!hasPermission) return Forbid();

        var authorizedProjectIds = await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken: cancellationToken);
        var isAdmin = _currentUser.IsAdmin || _currentUser.IsSystemAdmin;

        var projectIds = isAdmin
            ? await _dbContext.Projects.Where(p => !p.IsDeleted).Select(p => p.Id).ToListAsync(cancellationToken)
            : authorizedProjectIds.ToList();

        var pendingBoqsCount = await _dbContext.BoqItems.CountAsync(b =>
            !b.IsDeleted && projectIds.Contains(b.ProjectId), cancellationToken);

        var technicalOffersCount = await _dbContext.TechnicalOffers.CountAsync(t =>
            !t.IsDeleted && projectIds.Contains(t.ProjectId), cancellationToken);

        // No QuotationRequest entity — return 0
        const int quotationRequestsCount = 0;

        var docTypeCodes = await _dbContext.DocumentTypes.AsNoTracking()
            .Where(dt => dt.IsActive)
            .Select(dt => new { dt.Id, dt.Code })
            .ToListAsync(cancellationToken);

        Guid? TypeId(string code) => docTypeCodes.FirstOrDefault(d => d.Code.Equals(code, StringComparison.OrdinalIgnoreCase))?.Id;

        var submittalTypeId = TypeId("Submittal");
        var drawingTypeId = TypeId("Drawing");
        var datasheetTypeId = TypeId("Datasheet");
        var clientReqTypeId = TypeId("ClientRequirement") ?? TypeId("ClientRequirements");

        var docsQuery = _dbContext.Documents.AsNoTracking().Where(d => !d.IsDeleted && projectIds.Contains(d.ProjectId));

        var submittalsCount = submittalTypeId.HasValue
            ? await docsQuery.CountAsync(d => d.DocumentTypeId == submittalTypeId.Value, cancellationToken)
            : 0;
        var drawingsCount = drawingTypeId.HasValue
            ? await docsQuery.CountAsync(d => d.DocumentTypeId == drawingTypeId.Value, cancellationToken)
            : 0;
        var datasheetsCount = datasheetTypeId.HasValue
            ? await docsQuery.CountAsync(d => d.DocumentTypeId == datasheetTypeId.Value, cancellationToken)
            : 0;
        var clientRequirementsCount = clientReqTypeId.HasValue
            ? await docsQuery.CountAsync(d => d.DocumentTypeId == clientReqTypeId.Value, cancellationToken)
            : 0;

        var pendingReviewsCount = await docsQuery.CountAsync(d =>
            d.Status == DocumentStatus.Submitted || d.Status == DocumentStatus.UnderReview,
            cancellationToken);

        var now = DateTime.UtcNow;
        var offers = await _dbContext.CommercialOffers.AsNoTracking()
            .Where(o => !o.IsDeleted && projectIds.Contains(o.ProjectId) && o.Status != OfferStatus.Rejected)
            .Select(o => new { o.CreatedAt, o.ValidityDays })
            .ToListAsync(cancellationToken);

        var expiringQuotationsCount = offers.Count(o =>
        {
            var expiresAt = o.CreatedAt.AddDays(o.ValidityDays);
            return expiresAt >= now && expiresAt <= now.AddDays(14);
        });

        return Ok(new TechnicalOfficeDashboardDto(
            pendingBoqsCount,
            technicalOffersCount,
            quotationRequestsCount,
            submittalsCount,
            drawingsCount,
            datasheetsCount,
            clientRequirementsCount,
            pendingReviewsCount,
            expiringQuotationsCount
        ));
    }
}
