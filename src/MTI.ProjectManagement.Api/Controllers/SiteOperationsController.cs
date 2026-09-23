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
[Route("api/site-operations")]
[Authorize]
public class SiteOperationsController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IAuditService _auditService;

    public SiteOperationsController(
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
    public async Task<ActionResult<List<SiteOperationDto>>> GetOperations(
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? siteId = null,
        [FromQuery] OperationType? operationType = null,
        [FromQuery] SiteOperationStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var query = _dbContext.SiteOperations
            .AsNoTracking()
            .Include(o => o.Project)
            .Include(o => o.Site)
            .Include(o => o.AssignedUser)
            .Include(o => o.AssignedTeam)
            .Include(o => o.WorkLogs)
            .Include(o => o.Photos)
            .Where(o => !o.IsDeleted);

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");

        if (projectId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, projectId.Value, cancellationToken: cancellationToken);
            if (!canAccess && !isAdmin) return Forbid();
            query = query.Where(o => o.ProjectId == projectId.Value);
        }

        if (siteId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, siteId.Value, cancellationToken: cancellationToken);
            if (!canAccess && !isAdmin) return Forbid();
            query = query.Where(o => o.SiteId == siteId.Value);
        }

        // If no projectId/siteId filter: scope to authorized IDs only (empty list if none)
        if (!projectId.HasValue && !siteId.HasValue && !isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken: cancellationToken);
            var authorizedProjectIds = await _resourceAuthorization.GetAuthorizedProjectIdsAsync(userId, cancellationToken: cancellationToken);
            if (authorizedSiteIds.Count == 0 && authorizedProjectIds.Count == 0)
                return Ok(new List<SiteOperationDto>());
            query = query.Where(o =>
                authorizedSiteIds.Contains(o.SiteId) || authorizedProjectIds.Contains(o.ProjectId));
        }

        if (operationType.HasValue)
        {
            query = query.Where(o => o.OperationType == operationType.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        var list = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new SiteOperationDto(
                o.Id,
                o.ProjectId,
                o.Project.Name,
                o.SiteId,
                o.Site.Name,
                o.OperationType,
                o.Title,
                o.Description,
                o.AssignedUserId,
                o.AssignedUser != null ? $"{o.AssignedUser.FirstName} {o.AssignedUser.LastName}" : null,
                o.AssignedTeamId,
                o.AssignedTeam != null ? o.AssignedTeam.Name : null,
                o.Status,
                o.Priority,
                o.StartDate,
                o.DueDate,
                o.CompletedAt,
                o.Progress,
                o.CreatedAt,
                o.WorkLogs.Count,
                o.Photos.Count
            ))
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SiteOperationDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var op = await _dbContext.SiteOperations
            .AsNoTracking()
            .Include(o => o.Project)
            .Include(o => o.Site)
            .Include(o => o.AssignedUser)
            .Include(o => o.AssignedTeam)
            .Include(o => o.WorkLogs)
            .Include(o => o.Photos)
            .FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken: cancellationToken);

        if (op == null) return NotFound(new { message = "Site operation not found." });

        return Ok(new SiteOperationDto(
            op.Id,
            op.ProjectId,
            op.Project.Name,
            op.SiteId,
            op.Site.Name,
            op.OperationType,
            op.Title,
            op.Description,
            op.AssignedUserId,
            op.AssignedUser != null ? $"{op.AssignedUser.FirstName} {op.AssignedUser.LastName}" : null,
            op.AssignedTeamId,
            op.AssignedTeam != null ? op.AssignedTeam.Name : null,
            op.Status,
            op.Priority,
            op.StartDate,
            op.DueDate,
            op.CompletedAt,
            op.Progress,
            op.CreatedAt,
            op.WorkLogs.Count,
            op.Photos.Count
        ));
    }

    [HttpPost]
    public async Task<ActionResult<SiteOperationDto>> CreateOperation(
        [FromBody] CreateSiteOperationRequest request,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, request.ProjectId, cancellationToken: cancellationToken);
        if (!canAccess && !User.IsInRole("Admin") && !User.IsInRole("SystemAdmin")) return Forbid();

        var op = new SiteOperation
        {
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            OperationType = request.OperationType,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            AssignedUserId = request.AssignedUserId,
            AssignedTeamId = request.AssignedTeamId,
            Priority = request.Priority,
            Status = SiteOperationStatus.Pending,
            StartDate = request.StartDate,
            DueDate = request.DueDate,
            CreatedBy = userId
        };

        _dbContext.SiteOperations.Add(op);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateSiteOperation",
            "SiteOperation",
            op.Id.ToString(),
            null,
            new { op.Title, op.OperationType, op.ProjectId, op.SiteId },
            cancellationToken: cancellationToken);

        var project = await _dbContext.Projects.FindAsync(new object[] { op.ProjectId }, cancellationToken: cancellationToken);
        var site = await _dbContext.Sites.FindAsync(new object[] { op.SiteId }, cancellationToken: cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = op.Id }, new SiteOperationDto(
            op.Id,
            op.ProjectId,
            project?.Name ?? "",
            op.SiteId,
            site?.Name ?? "",
            op.OperationType,
            op.Title,
            op.Description,
            op.AssignedUserId,
            null,
            op.AssignedTeamId,
            null,
            op.Status,
            op.Priority,
            op.StartDate,
            op.DueDate,
            op.CompletedAt,
            op.Progress,
            op.CreatedAt,
            0,
            0
        ));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateOperation(
        Guid id,
        [FromBody] UpdateSiteOperationRequest request,
        CancellationToken cancellationToken)
    {
        var op = await _dbContext.SiteOperations.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken: cancellationToken);
        if (op == null) return NotFound(new { message = "Site operation not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);

        op.Title = request.Title.Trim();
        op.Description = request.Description.Trim();
        op.Status = request.Status;
        op.Priority = request.Priority;
        op.Progress = Math.Clamp(request.Progress, 0, 100);
        op.CompletedAt = request.Status == SiteOperationStatus.Completed ? (request.CompletedAt ?? DateTime.UtcNow) : request.CompletedAt;
        op.UpdatedBy = userId;
        op.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteOperation(Guid id, CancellationToken cancellationToken)
    {
        var op = await _dbContext.SiteOperations.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken: cancellationToken);
        if (op == null) return NotFound(new { message = "Site operation not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);

        op.IsDeleted = true;
        op.DeletedAt = DateTime.UtcNow;
        op.DeletedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    // ==========================================
    // Work Logs
    // ==========================================

    [HttpGet("{id}/worklogs")]
    public async Task<ActionResult<List<OperationWorkLogDto>>> GetWorkLogs(Guid id, CancellationToken cancellationToken)
    {
        var logs = await _dbContext.OperationWorkLogs
            .AsNoTracking()
            .Include(w => w.User)
            .Where(w => w.OperationId == id)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new OperationWorkLogDto(
                w.Id,
                w.OperationId,
                w.UserId,
                w.User != null ? $"{w.User.FirstName} {w.User.LastName}" : "",
                w.Description,
                w.Hours,
                w.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }

    [HttpPost("{id}/worklogs")]
    public async Task<ActionResult<OperationWorkLogDto>> AddWorkLog(
        Guid id,
        [FromBody] CreateWorkLogRequest request,
        CancellationToken cancellationToken)
    {
        var op = await _dbContext.SiteOperations.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken: cancellationToken);
        if (op == null) return NotFound(new { message = "Site operation not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var log = new OperationWorkLog
        {
            OperationId = id,
            UserId = userId,
            Description = request.Description.Trim(),
            Hours = request.Hours,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.OperationWorkLogs.Add(log);

        // If operation was pending, transition to InProgress automatically
        if (op.Status == SiteOperationStatus.Pending)
        {
            op.Status = SiteOperationStatus.InProgress;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var user = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken: cancellationToken);

        return Ok(new OperationWorkLogDto(
            log.Id,
            log.OperationId,
            log.UserId,
            user != null ? $"{user.FirstName} {user.LastName}" : "",
            log.Description,
            log.Hours,
            log.CreatedAt
        ));
    }

    // ==========================================
    // Operation Photos
    // ==========================================

    [HttpGet("{id}/photos")]
    public async Task<ActionResult<List<OperationPhotoDto>>> GetPhotos(Guid id, CancellationToken cancellationToken)
    {
        var photos = await _dbContext.OperationPhotos
            .AsNoTracking()
            .Include(p => p.MediaFile)
            .Include(p => p.UploaderUser)
            .Where(p => p.OperationId == id)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = new List<OperationPhotoDto>();
        foreach (var p in photos)
        {
            var downloadUrl = p.MediaFile != null
                ? await _mediaStorage.GeneratePreSignedDownloadUrlAsync(p.MediaFile.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken)
                : "";

            list.Add(new OperationPhotoDto(
                p.Id,
                p.OperationId,
                p.ProjectId,
                p.SiteId,
                p.MediaFileId,
                p.MediaFile?.OriginalFileName ?? "Photo",
                downloadUrl,
                p.UploaderUserId,
                p.UploaderUser != null ? $"{p.UploaderUser.FirstName} {p.UploaderUser.LastName}" : "",
                p.Caption,
                p.CreatedAt
            ));
        }

        return Ok(list);
    }

    [HttpPost("{id}/photos")]
    public async Task<ActionResult<OperationPhotoDto>> AddPhoto(
        Guid id,
        [FromBody] AddOperationPhotoRequest request,
        CancellationToken cancellationToken)
    {
        var op = await _dbContext.SiteOperations.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted, cancellationToken: cancellationToken);
        if (op == null) return NotFound(new { message = "Site operation not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var mediaFile = await _dbContext.MediaFiles.FirstOrDefaultAsync(m => m.Id == request.MediaFileId && !m.IsDeleted, cancellationToken: cancellationToken);
        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var photo = new OperationPhoto
        {
            OperationId = id,
            ProjectId = op.ProjectId,
            SiteId = op.SiteId,
            MediaFileId = request.MediaFileId,
            UploaderUserId = userId,
            Caption = request.Caption,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.OperationPhotos.Add(photo);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);
        var uploader = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken: cancellationToken);

        return Ok(new OperationPhotoDto(
            photo.Id,
            photo.OperationId,
            photo.ProjectId,
            photo.SiteId,
            photo.MediaFileId,
            mediaFile.OriginalFileName,
            downloadUrl,
            photo.UploaderUserId,
            uploader != null ? $"{uploader.FirstName} {uploader.LastName}" : "",
            photo.Caption,
            photo.CreatedAt
        ));
    }
}


