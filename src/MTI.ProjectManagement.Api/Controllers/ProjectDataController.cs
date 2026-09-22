using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/project-data")]
[Authorize]
public class ProjectDataController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;
    private readonly IMediaStorageService _mediaStorage;

    public ProjectDataController(
        IAppDbContext dbContext,
        IResourceAuthorizationService resourceAuthorization,
        INotificationService notificationService,
        IAuditService auditService,
        IMediaStorageService mediaStorage)
    {
        _dbContext = dbContext;
        _resourceAuthorization = resourceAuthorization;
        _notificationService = notificationService;
        _auditService = auditService;
        _mediaStorage = mediaStorage;
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDataDetailDto>> Create(
        [FromBody] CreateProjectDataDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        // 1. Validate Site Authorization (Engineer cannot submit data for unauthorized Site)
        var canAccessSite = await _resourceAuthorization.CanAccessSiteAsync(userId, dto.SiteId, cancellationToken);
        if (!canAccessSite)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "You are not authorized to submit data for this site." });
        }

        var status = dto.SubmitDirectly ? DataRecordStatus.Submitted : DataRecordStatus.Draft;
        var now = DateTime.UtcNow;

        var record = new ProjectDataRecord
        {
            ProjectId = dto.ProjectId,
            SiteId = dto.SiteId,
            SubmittedBy = userId,
            Title = dto.Title,
            Description = dto.Description,
            Status = status,
            Version = 1,
            SubmittedAt = dto.SubmitDirectly ? now : null,
            CreatedBy = userId
        };

        _dbContext.ProjectDataRecords.Add(record);

        // Add DataSheets if provided
        if (dto.Sheets != null)
        {
            foreach (var s in dto.Sheets)
            {
                var sheet = new DataSheet
                {
                    DataRecord = record,
                    Name = s.Name,
                    Description = s.Description,
                    HeadersJson = s.HeadersJson ?? "[]",
                    Order = s.Order,
                    CreatedBy = userId
                };

                if (s.Rows != null)
                {
                    foreach (var r in s.Rows)
                    {
                        sheet.Rows.Add(new DataSheetRow
                        {
                            DataSheet = sheet,
                            RowIndex = r.RowIndex,
                            ValuesJson = r.ValuesJson ?? "{}"
                        });
                    }
                }
                record.DataSheets.Add(sheet);
            }
        }

        // Link Attachments if provided
        if (dto.AttachmentMediaIds != null)
        {
            foreach (var mediaId in dto.AttachmentMediaIds)
            {
                record.Attachments.Add(new DataAttachment
                {
                    DataRecord = record,
                    MediaFileId = mediaId,
                    AttachedAt = now
                });
            }
        }

        // Record Initial Approval History if submitted directly
        if (dto.SubmitDirectly)
        {
            record.Approvals.Add(new DataApproval
            {
                DataRecord = record,
                Action = ApprovalAction.Submitted,
                Comment = "Initial data submission",
                PerformedBy = userId,
                PerformedAt = now
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Create",
            "ProjectDataRecord",
            record.Id.ToString(),
            null,
            new { record.Title, record.Status, record.Version, record.SiteId },
            cancellationToken);

        // Notify Admins if submitted directly
        if (dto.SubmitDirectly)
        {
            await NotifyAdminsDataSubmittedAsync(record, cancellationToken);
        }

        return await GetById(record.Id, cancellationToken);
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] ProjectDataFilterParams filter,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

        var query = _dbContext.ProjectDataRecords
            .AsNoTracking()
            .Where(d => !d.IsDeleted);

        // Engineer scoping: can see only authorized site data
        if (!isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
            query = query.Where(d => authorizedSiteIds.Contains(d.SiteId));
        }

        // Filters
        if (filter.ProjectId.HasValue) query = query.Where(d => d.ProjectId == filter.ProjectId.Value);
        if (filter.SiteId.HasValue) query = query.Where(d => d.SiteId == filter.SiteId.Value);
        if (filter.EngineerId.HasValue) query = query.Where(d => d.SubmittedBy == filter.EngineerId.Value);
        if (filter.Status.HasValue) query = query.Where(d => d.Status == filter.Status.Value);
        if (filter.DateFrom.HasValue) query = query.Where(d => d.CreatedAt >= filter.DateFrom.Value);
        if (filter.DateTo.HasValue) query = query.Where(d => d.CreatedAt <= filter.DateTo.Value);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(d => d.Title.ToLower().Contains(term) || d.Description.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var list = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(d => new
            {
                d.Id,
                d.ProjectId,
                ProjectName = d.Project.Name,
                d.SiteId,
                SiteName = d.Site.Name,
                d.SubmittedBy,
                SubmitterName = d.Submitter.FirstName + " " + d.Submitter.LastName,
                d.Title,
                d.Status,
                d.Version,
                d.SubmittedAt,
                d.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var items = list.Select(d => new ProjectDataSummaryDto(
            d.Id,
            d.ProjectId,
            d.ProjectName,
            d.SiteId,
            d.SiteName,
            d.SubmittedBy,
            d.SubmitterName,
            d.Title,
            d.Status,
            d.Version,
            d.SubmittedAt,
            d.CreatedAt
        )).ToList();

        return Ok(new { items, totalCount, page = filter.Page, pageSize = filter.PageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDataDetailDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .AsNoTracking()
            .Include(d => d.Project)
            .Include(d => d.Site)
            .Include(d => d.Submitter)
            .Include(d => d.Versions)
            .Include(d => d.Approvals).ThenInclude(a => a.Performer)
            .Include(d => d.DataSheets).ThenInclude(s => s.Rows)
            .Include(d => d.Attachments).ThenInclude(a => a.MediaFile)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound(new { message = "Project data record not found." });

        // Resource check
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        if (!isAdmin)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, record.SiteId, cancellationToken);
            if (!canAccess) return Forbid();
        }

        var versions = record.Versions.OrderBy(v => v.VersionNumber).Select(v => new ProjectDataVersionDto(
            v.Id,
            v.VersionNumber,
            v.Title,
            v.Description,
            v.DataSnapshotJson,
            v.CreatedBy,
            v.CreatedAt
        )).ToList();

        var approvals = record.Approvals.OrderBy(a => a.PerformedAt).Select(a => new DataApprovalHistoryDto(
            a.Id,
            a.Action,
            a.Comment,
            a.PerformedBy,
            $"{a.Performer.FirstName} {a.Performer.LastName}",
            a.PerformedAt
        )).ToList();

        var sheets = record.DataSheets.OrderBy(s => s.Order).Select(s => new DataSheetDto(
            s.Id,
            s.Name,
            s.Description,
            s.HeadersJson,
            s.Order,
            s.Rows.OrderBy(r => r.RowIndex).Select(r => new DataSheetRowDto(r.Id, r.RowIndex, r.ValuesJson)).ToList()
        )).ToList();

        var attachments = new List<DataAttachmentDto>();
        foreach (var att in record.Attachments)
        {
            if (att.MediaFile != null && !att.MediaFile.IsDeleted)
            {
                var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken);
                attachments.Add(new DataAttachmentDto(
                    att.Id,
                    att.MediaFileId,
                    att.MediaFile.OriginalFileName,
                    att.MediaFile.ContentType,
                    att.MediaFile.FileSize,
                    downloadUrl,
                    att.Caption
                ));
            }
        }

        return Ok(new ProjectDataDetailDto(
            record.Id,
            record.ProjectId,
            record.Project.Name,
            record.SiteId,
            record.Site.Name,
            record.SubmittedBy,
            $"{record.Submitter.FirstName} {record.Submitter.LastName}",
            record.Title,
            record.Description,
            record.Status,
            record.Version,
            record.SubmittedAt,
            record.ApprovedAt,
            record.ApprovedBy,
            record.RejectedAt,
            record.RejectedBy,
            versions,
            approvals,
            sheets,
            attachments
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ProjectDataDetailDto>> Update(
        Guid id,
        [FromBody] UpdateProjectDataDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .Include(d => d.DataSheets).ThenInclude(s => s.Rows)
            .Include(d => d.Attachments)
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound(new { message = "Project data record not found." });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

        // Rule (Prompt 07): Engineer cannot modify another engineer's records unless explicitly authorized.
        if (!isAdmin && record.SubmittedBy != userId)
        {
            return Forbid();
        }

        // Rule (Prompt 07 & 09): Approved records must be immutable. If correction is required: Create new version.
        if (record.Status == DataRecordStatus.Approved)
        {
            if (!dto.IsCorrection)
            {
                return BadRequest(new { message = "Approved records are immutable. To make changes, set IsCorrection = true to create a new version." });
            }

            // Create immutable snapshot of current version before updating
            var snapshot = new
            {
                record.Title,
                record.Description,
                Sheets = record.DataSheets.Select(s => new
                {
                    s.Name,
                    s.HeadersJson,
                    Rows = s.Rows.Select(r => new { r.RowIndex, r.ValuesJson })
                })
            };

            var versionSnapshot = new ProjectDataVersion
            {
                DataRecordId = record.Id,
                VersionNumber = record.Version,
                Title = record.Title,
                Description = record.Description,
                DataSnapshotJson = JsonSerializer.Serialize(snapshot),
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };
            record.Versions.Add(versionSnapshot);

            // Increment version and reset status to Submitted or ChangesRequested
            record.Version += 1;
            record.Status = DataRecordStatus.Submitted;
            record.SubmittedAt = DateTime.UtcNow;
            record.ApprovedAt = null;
            record.ApprovedBy = null;
        }

        record.Title = dto.Title;
        record.Description = dto.Description;
        record.UpdatedBy = userId;
        record.UpdatedAt = DateTime.UtcNow;

        // Replace DataSheets if specified
        if (dto.Sheets != null)
        {
            _dbContext.DataSheets.RemoveRange(record.DataSheets);
            record.DataSheets.Clear();

            foreach (var s in dto.Sheets)
            {
                var sheet = new DataSheet
                {
                    DataRecordId = record.Id,
                    Name = s.Name,
                    Description = s.Description,
                    HeadersJson = s.HeadersJson ?? "[]",
                    Order = s.Order,
                    CreatedBy = userId
                };

                if (s.Rows != null)
                {
                    foreach (var r in s.Rows)
                    {
                        sheet.Rows.Add(new DataSheetRow
                        {
                            DataSheet = sheet,
                            RowIndex = r.RowIndex,
                            ValuesJson = r.ValuesJson ?? "{}"
                        });
                    }
                }
                record.DataSheets.Add(sheet);
            }
        }

        // Link new attachments
        if (dto.AttachmentMediaIds != null)
        {
            foreach (var mediaId in dto.AttachmentMediaIds)
            {
                if (!record.Attachments.Any(a => a.MediaFileId == mediaId))
                {
                    record.Attachments.Add(new DataAttachment
                    {
                        DataRecordId = record.Id,
                        MediaFileId = mediaId,
                        AttachedAt = DateTime.UtcNow
                    });
                }
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Update",
            "ProjectDataRecord",
            record.Id.ToString(),
            null,
            new { record.Title, record.Version, record.Status },
            cancellationToken);

        return await GetById(record.Id, cancellationToken);
    }

    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .Include(d => d.Approvals)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        if (!isAdmin && record.SubmittedBy != userId) return Forbid();

        if (record.Status == DataRecordStatus.Approved)
        {
            return BadRequest(new { message = "Record is already approved." });
        }

        var oldStatus = record.Status;
        record.Status = DataRecordStatus.Submitted;
        record.SubmittedAt = DateTime.UtcNow;

        _dbContext.DataApprovals.Add(new DataApproval
        {
            DataRecordId = record.Id,
            Action = ApprovalAction.Submitted,
            Comment = "Data submitted for review",
            PerformedBy = userId,
            PerformedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Submit",
            "ProjectDataRecord",
            record.Id.ToString(),
            new { Status = oldStatus },
            new { Status = record.Status },
            cancellationToken);

        await NotifyAdminsDataSubmittedAsync(record, cancellationToken);

        return Ok(new { success = true, status = record.Status.ToString() });
    }

    [HttpPost("{id}/approve")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<IActionResult> Approve(
        Guid id,
        [FromBody] ApprovalDecisionDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .Include(d => d.Approvals)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound();

        var oldStatus = record.Status;
        record.Status = DataRecordStatus.Approved;
        record.ApprovedAt = DateTime.UtcNow;
        record.ApprovedBy = userId;

        _dbContext.DataApprovals.Add(new DataApproval
        {
            DataRecordId = record.Id,
            Action = ApprovalAction.Approved,
            Comment = dto.Comment ?? "Approved by administrator",
            PerformedBy = userId,
            PerformedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Approve",
            "ProjectDataRecord",
            record.Id.ToString(),
            new { Status = oldStatus },
            new { Status = record.Status, record.ApprovedBy },
            cancellationToken);

        // Notify Submitting Engineer
        await _notificationService.SendNotificationAsync(
            record.SubmittedBy,
            NotificationType.DataApproved,
            "Project Data Approved",
            $"Your data submission '{record.Title}' has been approved. Note: {dto.Comment}",
            "ProjectData",
            record.Id.ToString(),
            cancellationToken);

        // Broadcast to site and global
        await _notificationService.BroadcastToSiteAsync(record.SiteId, "DataApproved", new { dataId = record.Id, title = record.Title }, cancellationToken);
        await _notificationService.BroadcastGlobalAsync("ProjectDataApproved", new { dataId = record.Id, title = record.Title }, cancellationToken);

        return Ok(new { success = true, status = record.Status.ToString() });
    }

    [HttpPost("{id}/reject")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<IActionResult> Reject(
        Guid id,
        [FromBody] ApprovalDecisionDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .Include(d => d.Approvals)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound();

        var oldStatus = record.Status;
        record.Status = DataRecordStatus.Rejected;
        record.RejectedAt = DateTime.UtcNow;
        record.RejectedBy = userId;

        _dbContext.DataApprovals.Add(new DataApproval
        {
            DataRecordId = record.Id,
            Action = ApprovalAction.Rejected,
            Comment = dto.Comment ?? "Rejected by administrator",
            PerformedBy = userId,
            PerformedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Reject",
            "ProjectDataRecord",
            record.Id.ToString(),
            new { Status = oldStatus },
            new { Status = record.Status, record.RejectedBy },
            cancellationToken);

        // Notify Submitter
        await _notificationService.SendNotificationAsync(
            record.SubmittedBy,
            NotificationType.DataRejected,
            "Project Data Rejected",
            $"Your data submission '{record.Title}' was rejected. Reason: {dto.Comment}",
            "ProjectData",
            record.Id.ToString(),
            cancellationToken);

        await _notificationService.BroadcastToSiteAsync(record.SiteId, "DataRejected", new { dataId = record.Id, title = record.Title }, cancellationToken);
        await _notificationService.BroadcastToAdminsAsync("ProjectDataRejected", new { dataId = record.Id, title = record.Title }, cancellationToken);
        await _notificationService.BroadcastToUserAsync(record.SubmittedBy, "ProjectDataRejected", new { dataId = record.Id, title = record.Title }, cancellationToken);

        return Ok(new { success = true, status = record.Status.ToString() });
    }

    [HttpPost("{id}/request-changes")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<IActionResult> RequestChanges(
        Guid id,
        [FromBody] ApprovalDecisionDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .Include(d => d.Approvals)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound();

        var oldStatus = record.Status;
        record.Status = DataRecordStatus.ChangesRequested;

        _dbContext.DataApprovals.Add(new DataApproval
        {
            DataRecordId = record.Id,
            Action = ApprovalAction.ChangesRequested,
            Comment = dto.Comment ?? "Changes requested by administrator",
            PerformedBy = userId,
            PerformedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "RequestChanges",
            "ProjectDataRecord",
            record.Id.ToString(),
            new { Status = oldStatus },
            new { Status = record.Status },
            cancellationToken);

        // Notify Submitter
        await _notificationService.SendNotificationAsync(
            record.SubmittedBy,
            NotificationType.ChangesRequested,
            "Changes Requested on Project Data",
            $"Changes requested on '{record.Title}': {dto.Comment}",
            "ProjectData",
            record.Id.ToString(),
            cancellationToken);

        await _notificationService.BroadcastToSiteAsync(record.SiteId, "ChangesRequested", new { dataId = record.Id, title = record.Title }, cancellationToken);

        return Ok(new { success = true, status = record.Status.ToString() });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var record = await _dbContext.ProjectDataRecords
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (record == null) return NotFound();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

        // Rule (Prompt 07): Engineer cannot delete Approved records.
        if (record.Status == DataRecordStatus.Approved && !isAdmin)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Engineers cannot delete Approved records." });
        }

        if (!isAdmin && record.SubmittedBy != userId)
        {
            return Forbid();
        }

        record.IsDeleted = true;
        record.DeletedAt = DateTime.UtcNow;
        record.DeletedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Delete",
            "ProjectDataRecord",
            record.Id.ToString(),
            new { record.Title, record.Status },
            null,
            cancellationToken);

        return NoContent();
    }

    private async Task NotifyAdminsDataSubmittedAsync(ProjectDataRecord record, CancellationToken cancellationToken)
    {
        // Get Admin User IDs
        var adminUserIds = await _dbContext.UserRoles
            .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" || ur.Role.Name == "ProjectManager")
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var adminId in adminUserIds)
        {
            await _notificationService.SendNotificationAsync(
                adminId,
                NotificationType.DataSubmitted,
                "New Project Data Submitted",
                $"New data '{record.Title}' submitted for review.",
                "ProjectData",
                record.Id.ToString(),
                cancellationToken);
        }

        await _notificationService.BroadcastToSiteAsync(record.SiteId, "DataSubmitted", new { dataId = record.Id, title = record.Title }, cancellationToken);
        await _notificationService.BroadcastToAdminsAsync("ProjectDataSubmitted", new { dataId = record.Id, title = record.Title }, cancellationToken);
    }
}
