using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/daily-site-reports")]
[Authorize]
public class DailySiteReportsController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IAuditService _auditService;

    public DailySiteReportsController(
        IAppDbContext dbContext,
        IResourceAuthorizationService resourceAuthorization,
        IMediaStorageService mediaStorage,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _resourceAuthorization = resourceAuthorization;
        _mediaStorage = mediaStorage;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<List<DailySiteReportDto>>> GetReports(
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? siteId = null,
        [FromQuery] DateTime? date = null,
        [FromQuery] DailyReportStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var query = _dbContext.DailySiteReports
            .AsNoTracking()
            .Include(r => r.Project)
            .Include(r => r.Site)
            .Include(r => r.EngineerUser)
            .Include(r => r.Team)
            .Include(r => r.ApprovedByUser)
            .Include(r => r.Attachments)
            .Where(r => !r.IsDeleted);

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");

        if (projectId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, projectId.Value, cancellationToken: cancellationToken);
            if (!canAccess && !isAdmin) return Forbid();
            query = query.Where(r => r.ProjectId == projectId.Value);
        }

        if (siteId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, siteId.Value, cancellationToken: cancellationToken);
            if (!canAccess && !isAdmin) return Forbid();
            query = query.Where(r => r.SiteId == siteId.Value);
        }

        // If no projectId/siteId filter: scope to authorized IDs only (empty list if none)
        if (!projectId.HasValue && !siteId.HasValue && !isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken: cancellationToken);
            var authorizedProjectIds = await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken: cancellationToken);
            if (authorizedSiteIds.Count == 0 && authorizedProjectIds.Count == 0)
                return Ok(new List<DailySiteReportDto>());
            query = query.Where(r =>
                authorizedSiteIds.Contains(r.SiteId) || authorizedProjectIds.Contains(r.ProjectId));
        }

        if (date.HasValue)
        {
            var d = date.Value.Date;
            query = query.Where(r => r.ReportDate.Date == d);
        }

        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }

        var list = await query
            .OrderByDescending(r => r.ReportDate)
            .ThenByDescending(r => r.RevisionNumber)
            .Select(r => new DailySiteReportDto(
                r.Id,
                r.ProjectId,
                r.Project.Name,
                r.SiteId,
                r.Site.Name,
                r.ReportDate,
                r.EngineerUserId,
                $"{r.EngineerUser.FirstName} {r.EngineerUser.LastName}",
                r.TeamId,
                r.Team != null ? r.Team.Name : null,
                r.Status,
                r.RevisionNumber,
                r.IsImmutable,
                r.CreatedAt,
                r.ApprovedAt,
                r.ApprovedByUser != null ? $"{r.ApprovedByUser.FirstName} {r.ApprovedByUser.LastName}" : null,
                r.Attachments.Count
            ))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DailySiteReportDetailDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var r = await _dbContext.DailySiteReports
            .AsNoTracking()
            .Include(x => x.Project)
            .Include(x => x.Site)
            .Include(x => x.EngineerUser)
            .Include(x => x.Team)
            .Include(x => x.ReviewedByUser)
            .Include(x => x.ApprovedByUser)
            .Include(x => x.Attachments).ThenInclude(a => a.MediaFile)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken: cancellationToken);

        if (r == null) return NotFound(new { message = "Daily site report not found." });

        var attachments = new List<DailyReportAttachmentDto>();
        foreach (var att in r.Attachments)
        {
            var downloadUrl = att.MediaFile != null
                ? await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken)
                : "";

            attachments.Add(new DailyReportAttachmentDto(
                att.Id,
                att.DailySiteReportId,
                att.MediaFileId,
                att.MediaFile?.OriginalFileName ?? "Attachment",
                att.AttachmentType,
                att.Caption,
                downloadUrl,
                att.CreatedAt
            ));
        }

        return Ok(new DailySiteReportDetailDto(
            r.Id,
            r.ProjectId,
            r.Project.Name,
            r.SiteId,
            r.Site.Name,
            r.ReportDate,
            r.EngineerUserId,
            $"{r.EngineerUser.FirstName} {r.EngineerUser.LastName}",
            r.TeamId,
            r.Team != null ? r.Team.Name : null,
            r.Manpower,
            r.WorkCompleted,
            r.Problems,
            r.MaterialsReceived,
            r.MaterialsUsed,
            r.Equipment,
            r.SafetyNotes,
            r.TomorrowPlan,
            r.Status,
            r.RevisionNumber,
            r.ParentReportId,
            r.IsImmutable,
            r.CreatedAt,
            r.ReviewedAt,
            r.ReviewedByUser != null ? $"{r.ReviewedByUser.FirstName} {r.ReviewedByUser.LastName}" : null,
            r.ApprovedAt,
            r.ApprovedByUser != null ? $"{r.ApprovedByUser.FirstName} {r.ApprovedByUser.LastName}" : null,
            r.ReviewNotes,
            attachments,
            r.Weather,
            r.WorkersCount,
            r.WorkInProgress,
            r.Delays
        ));
    }

    [HttpPost]
    public async Task<ActionResult<DailySiteReportDto>> CreateReport(
        [FromBody] CreateDailyReportRequest request,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, request.ProjectId, cancellationToken: cancellationToken);
        if (!canAccess && !User.IsInRole("Admin") && !User.IsInRole("SystemAdmin")) return Forbid();

        var report = new DailySiteReport
        {
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            ReportDate = request.ReportDate,
            EngineerUserId = userId,
            TeamId = request.TeamId,
            Weather = request.Weather?.Trim(),
            WorkersCount = request.WorkersCount,
            Manpower = request.Manpower.Trim(),
            WorkCompleted = request.WorkCompleted.Trim(),
            WorkInProgress = request.WorkInProgress?.Trim(),
            Problems = request.Problems.Trim(),
            Delays = request.Delays?.Trim(),
            MaterialsReceived = request.MaterialsReceived.Trim(),
            MaterialsUsed = request.MaterialsUsed.Trim(),
            Equipment = request.Equipment.Trim(),
            SafetyNotes = request.SafetyNotes.Trim(),
            TomorrowPlan = request.TomorrowPlan.Trim(),
            Status = DailyReportStatus.Draft,
            RevisionNumber = 1,
            CreatedBy = userId
        };

        if (request.MediaFileIds != null)
        {
            foreach (var mediaId in request.MediaFileIds)
            {
                report.Attachments.Add(new DailyReportAttachment
                {
                    DailySiteReport = report,
                    MediaFileId = mediaId,
                    AttachmentType = "Document"
                });
            }
        }

        _dbContext.DailySiteReports.Add(report);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateDailySiteReport",
            "DailySiteReport",
            report.Id.ToString(),
            null,
            new { report.ProjectId, report.SiteId, report.ReportDate, report.Status },
            cancellationToken: cancellationToken);

        var project = await _dbContext.Projects.FindAsync(new object[] { report.ProjectId }, cancellationToken: cancellationToken);
        var site = await _dbContext.Sites.FindAsync(new object[] { report.SiteId }, cancellationToken: cancellationToken);
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = report.Id }, new DailySiteReportDto(
            report.Id,
            report.ProjectId,
            project?.Name ?? "",
            report.SiteId,
            site?.Name ?? "",
            report.ReportDate,
            report.EngineerUserId,
            $"{user?.FirstName} {user?.LastName}",
            report.TeamId,
            null,
            report.Status,
            report.RevisionNumber,
            report.IsImmutable,
            report.CreatedAt,
            null,
            null,
            report.Attachments.Count
        ));
    }

    /// <summary>
    /// Update report content. Blocked if report is Approved (Immutable rule).
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateReport(
        Guid id,
        [FromBody] CreateDailyReportRequest request,
        CancellationToken cancellationToken)
    {
        var report = await _dbContext.DailySiteReports.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken: cancellationToken);
        if (report == null) return NotFound(new { message = "Daily site report not found." });

        // IMMUTABILITY CHECK (Prompt SITE-REPORT-01: After approval, report becomes immutable)
        if (report.IsImmutable || report.Status == DailyReportStatus.Approved)
        {
            return BadRequest(new { message = "Approved daily site reports are strictly immutable and cannot be modified. Use the correction endpoint to create a new revision." });
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);

        report.ReportDate = request.ReportDate;
        report.TeamId = request.TeamId;
        report.Weather = request.Weather?.Trim();
        report.WorkersCount = request.WorkersCount;
        report.Manpower = request.Manpower.Trim();
        report.WorkCompleted = request.WorkCompleted.Trim();
        report.WorkInProgress = request.WorkInProgress?.Trim();
        report.Problems = request.Problems.Trim();
        report.Delays = request.Delays?.Trim();
        report.MaterialsReceived = request.MaterialsReceived.Trim();
        report.MaterialsUsed = request.MaterialsUsed.Trim();
        report.Equipment = request.Equipment.Trim();
        report.SafetyNotes = request.SafetyNotes.Trim();
        report.TomorrowPlan = request.TomorrowPlan.Trim();
        report.UpdatedBy = userId;
        report.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id}/submit")]
    public async Task<ActionResult> SubmitReport(Guid id, CancellationToken cancellationToken)
    {
        var report = await _dbContext.DailySiteReports.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken: cancellationToken);
        if (report == null) return NotFound(new { message = "Daily site report not found." });

        if (report.IsImmutable || report.Status == DailyReportStatus.Approved)
        {
            return BadRequest(new { message = "Approved reports are immutable." });
        }

        report.Status = DailyReportStatus.Submitted;
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("SubmitDailySiteReport", "DailySiteReport", id.ToString(), null, new { report.Status }, cancellationToken: cancellationToken);
        return Ok(new { message = "Report submitted successfully." });
    }

    [HttpPost("{id}/review")]
    public async Task<ActionResult> ReviewReport(
        Guid id,
        [FromBody] ReviewDailyReportRequest request,
        CancellationToken cancellationToken)
    {
        var report = await _dbContext.DailySiteReports.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken: cancellationToken);
        if (report == null) return NotFound(new { message = "Daily site report not found." });

        if (report.IsImmutable || report.Status == DailyReportStatus.Approved)
        {
            return BadRequest(new { message = "Approved reports are immutable." });
        }

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);

        report.Status = request.Status;
        report.ReviewedByUserId = userId;
        report.ReviewedAt = DateTime.UtcNow;
        report.ReviewNotes = request.Notes;

        // If approved: report becomes completely immutable
        if (request.Status == DailyReportStatus.Approved)
        {
            report.ApprovedByUserId = userId;
            report.ApprovedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ReviewDailySiteReport",
            "DailySiteReport",
            id.ToString(),
            null,
            new { Status = report.Status, report.IsImmutable, Notes = request.Notes },
            cancellationToken: cancellationToken);

        return Ok(new { message = $"Report status updated to {report.Status}.", isImmutable = report.IsImmutable });
    }

    /// <summary>
    /// Correction endpoint: Creates a new revision chained to the original report (Prompt SITE-REPORT-01)
    /// </summary>
    [HttpPost("{id}/correction")]
    public async Task<ActionResult<DailySiteReportDto>> CreateCorrectionRevision(
        Guid id,
        [FromBody] CreateReportRevisionRequest request,
        CancellationToken cancellationToken)
    {
        var parentReport = await _dbContext.DailySiteReports.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken: cancellationToken);
        if (parentReport == null) return NotFound(new { message = "Parent daily site report not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var newRevision = new DailySiteReport
        {
            ProjectId = parentReport.ProjectId,
            SiteId = parentReport.SiteId,
            ReportDate = parentReport.ReportDate,
            EngineerUserId = userId,
            TeamId = parentReport.TeamId,
            Weather = request.Weather?.Trim(),
            WorkersCount = request.WorkersCount,
            Manpower = request.Manpower.Trim(),
            WorkCompleted = request.WorkCompleted.Trim(),
            WorkInProgress = request.WorkInProgress?.Trim(),
            Problems = request.Problems.Trim(),
            Delays = request.Delays?.Trim(),
            MaterialsReceived = request.MaterialsReceived.Trim(),
            MaterialsUsed = request.MaterialsUsed.Trim(),
            Equipment = request.Equipment.Trim(),
            SafetyNotes = request.SafetyNotes.Trim(),
            TomorrowPlan = request.TomorrowPlan.Trim(),
            Status = DailyReportStatus.Draft,
            RevisionNumber = parentReport.RevisionNumber + 1,
            ParentReportId = parentReport.Id,
            CreatedBy = userId
        };

        if (request.MediaFileIds != null)
        {
            foreach (var mediaId in request.MediaFileIds)
            {
                newRevision.Attachments.Add(new DailyReportAttachment
                {
                    DailySiteReport = newRevision,
                    MediaFileId = mediaId,
                    AttachmentType = "Document"
                });
            }
        }

        _dbContext.DailySiteReports.Add(newRevision);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateReportRevision",
            "DailySiteReport",
            newRevision.Id.ToString(),
            null,
            new { ParentReportId = parentReport.Id, RevisionNumber = newRevision.RevisionNumber },
            cancellationToken: cancellationToken);

        var project = await _dbContext.Projects.FindAsync(new object[] { newRevision.ProjectId }, cancellationToken: cancellationToken);
        var site = await _dbContext.Sites.FindAsync(new object[] { newRevision.SiteId }, cancellationToken: cancellationToken);
        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = newRevision.Id }, new DailySiteReportDto(
            newRevision.Id,
            newRevision.ProjectId,
            project?.Name ?? "",
            newRevision.SiteId,
            site?.Name ?? "",
            newRevision.ReportDate,
            newRevision.EngineerUserId,
            $"{user?.FirstName} {user?.LastName}",
            newRevision.TeamId,
            null,
            newRevision.Status,
            newRevision.RevisionNumber,
            false,
            newRevision.CreatedAt,
            null,
            null,
            newRevision.Attachments.Count
        ));
    }

    [HttpPost("{id}/attachments")]
    public async Task<ActionResult<DailyReportAttachmentDto>> AddAttachment(
        Guid id,
        [FromBody] AddOperationPhotoRequest request, // Reusable request with MediaFileId & Caption
        CancellationToken cancellationToken)
    {
        var report = await _dbContext.DailySiteReports.FirstOrDefaultAsync(r => r.Id == id && !r.IsDeleted, cancellationToken: cancellationToken);
        if (report == null) return NotFound(new { message = "Daily site report not found." });

        if (report.IsImmutable || report.Status == DailyReportStatus.Approved)
        {
            return BadRequest(new { message = "Approved reports are immutable and cannot receive new attachments." });
        }

        var mediaFile = await _dbContext.MediaFiles.FirstOrDefaultAsync(m => m.Id == request.MediaFileId && !m.IsDeleted, cancellationToken: cancellationToken);
        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var attType = mediaFile.MediaType == MediaType.Image ? "Photo" :
                      mediaFile.MediaType == MediaType.DataSheet ? "Sheet" : "Document";

        var attachment = new DailyReportAttachment
        {
            DailySiteReportId = id,
            MediaFileId = request.MediaFileId,
            AttachmentType = attType,
            Caption = request.Caption
        };

        _dbContext.DailyReportAttachments.Add(attachment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);

        return Ok(new DailyReportAttachmentDto(
            attachment.Id,
            attachment.DailySiteReportId,
            attachment.MediaFileId,
            mediaFile.OriginalFileName,
            attachment.AttachmentType,
            attachment.Caption,
            downloadUrl,
            attachment.CreatedAt
        ));
    }
}


