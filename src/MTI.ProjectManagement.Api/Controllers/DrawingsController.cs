using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;

using Microsoft.AspNetCore.SignalR;
using MTI.ProjectManagement.Infrastructure.SignalR;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DrawingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IMediaStorageService _mediaStorageService;
    private readonly IHubContext<ProjectHub> _hubContext;

    public DrawingsController(
        AppDbContext context,
        IAuditService auditService,
        IMediaStorageService mediaStorageService,
        IHubContext<ProjectHub> hubContext)
    {
        _context = context;
        _auditService = auditService;
        _mediaStorageService = mediaStorageService;
        _hubContext = hubContext;
    }

    private async Task<string?> ResolveDownloadUrlAsync(string? storageKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(storageKey)) return null;
        try
        {
            var objectKey = storageKey;
            if (Guid.TryParse(storageKey, out var mediaGuid))
            {
                var mf = await _context.MediaFiles.AsNoTracking().FirstOrDefaultAsync(m => m.Id == mediaGuid, cancellationToken);
                if (mf != null) objectKey = mf.ObjectKey;
            }
            return await _mediaStorageService.GeneratePreSignedDownloadUrlAsync(objectKey, TimeSpan.FromHours(2), cancellationToken);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// DRAW-01: Get list of drawings with filtering by Project, Site, Discipline, Type, Status, and Search.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResult<DrawingDto>>>> GetDrawings(
        [FromQuery] DrawingFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Drawings
            .AsNoTracking()
            .Include(d => d.Project)
            .Include(d => d.Site)
            .Include(d => d.UploaderUser)
            .Include(d => d.ApproverUser)
            .Include(d => d.Markups)
            .AsQueryable();

        if (filter.ProjectId.HasValue)
            query = query.Where(d => d.ProjectId == filter.ProjectId.Value);

        if (filter.SiteId.HasValue)
            query = query.Where(d => d.SiteId == filter.SiteId.Value);

        if (filter.Discipline.HasValue)
            query = query.Where(d => d.Discipline == filter.Discipline.Value);

        if (filter.DrawingType.HasValue)
            query = query.Where(d => d.DrawingType == filter.DrawingType.Value);

        if (filter.Status.HasValue)
            query = query.Where(d => d.Status == filter.Status.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(d =>
                d.DrawingNumber.ToLower().Contains(term) ||
                d.DrawingTitle.ToLower().Contains(term) ||
                (d.FileName != null && d.FileName.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var drawings = await query
            .OrderByDescending(d => d.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = new List<DrawingDto>();
        foreach (var d in drawings)
        {
            var downloadUrl = await ResolveDownloadUrlAsync(d.StorageKey, cancellationToken);

            dtos.Add(new DrawingDto(
                d.Id,
                d.ProjectId,
                d.Project?.Name ?? "",
                d.SiteId,
                d.Site?.Name,
                d.DocumentId,
                d.DrawingNumber,
                d.DrawingTitle,
                d.Discipline,
                d.DrawingType,
                d.Revision,
                d.Version,
                d.Status,
                d.UploadedBy,
                d.UploaderUser?.FullName ?? "Unknown",
                d.UploadedAt,
                d.ApprovedBy,
                d.ApproverUser?.FullName,
                d.ApprovedAt,
                d.StorageKey,
                d.FileName,
                d.FileExtension,
                d.FileSizeBytes,
                d.Markups.Count(m => !m.IsDeleted),
                downloadUrl
            ));
        }

        return Ok(ApiResponse<PagedResult<DrawingDto>>.Ok(
            new PagedResult<DrawingDto>(dtos, totalCount, filter.Page, filter.PageSize)
        ));
    }

    /// <summary>
    /// DRAW-01: Get drawing detail by Id including markups count, revisions history, and download URL.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ApiResponse<DrawingDto>>> GetDrawingById(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var d = await _context.Drawings
            .AsNoTracking()
            .Include(x => x.Project)
            .Include(x => x.Site)
            .Include(x => x.UploaderUser)
            .Include(x => x.ApproverUser)
            .Include(x => x.Markups)
            .Include(x => x.Revisions)
                .ThenInclude(r => r.UploaderUser)
            .Include(x => x.Revisions)
                .ThenInclude(r => r.ApproverUser)
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (d == null)
            return NotFound(ApiResponse<DrawingDto>.Fail("Drawing not found"));

        var downloadUrl = await ResolveDownloadUrlAsync(d.StorageKey, cancellationToken);

        var revDtos = new List<DrawingRevisionDto>();
        if (d.Revisions != null)
        {
            foreach (var r in d.Revisions.Where(r => !r.IsDeleted).OrderByDescending(r => r.VersionNumber))
            {
                var rUrl = await ResolveDownloadUrlAsync(r.StorageKey, cancellationToken);
                revDtos.Add(new DrawingRevisionDto(
                    r.Id,
                    r.DrawingId,
                    r.Revision,
                    r.VersionNumber,
                    r.IsCurrent,
                    r.StorageKey,
                    r.FileName,
                    r.FileExtension,
                    r.FileSizeBytes,
                    r.UploadedBy,
                    r.UploaderUser?.FullName ?? "Unknown",
                    r.UploadedAt,
                    r.Status,
                    r.ApprovedBy,
                    r.ApproverUser?.FullName,
                    r.ApprovedAt,
                    r.ChangeReason,
                    r.Comments,
                    r.IsLocked,
                    rUrl
                ));
            }
        }

        var dto = new DrawingDto(
            d.Id,
            d.ProjectId,
            d.Project?.Name ?? "",
            d.SiteId,
            d.Site?.Name,
            d.DocumentId,
            d.DrawingNumber,
            d.DrawingTitle,
            d.Discipline,
            d.DrawingType,
            d.Revision,
            d.Version,
            d.Status,
            d.UploadedBy,
            d.UploaderUser?.FullName ?? "Unknown",
            d.UploadedAt,
            d.ApprovedBy,
            d.ApproverUser?.FullName,
            d.ApprovedAt,
            d.StorageKey,
            d.FileName,
            d.FileExtension,
            d.FileSizeBytes,
            d.Markups.Count(m => !m.IsDeleted),
            downloadUrl,
            d.IsLocked,
            d.CurrentRevisionId,
            revDtos
        );

        return Ok(ApiResponse<DrawingDto>.Ok(dto));
    }

    /// <summary>
    /// DRAW-01: Create and register a new drawing. Automatically initializes Revision A (DRAW-04).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<DrawingDto>>> CreateDrawing(
        [FromBody] CreateDrawingRequest request,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<DrawingDto>.Fail("Invalid credentials"));

        var project = await _context.Projects.FindAsync(new object[] { request.ProjectId }, cancellationToken);
        if (project == null)
            return BadRequest(ApiResponse<DrawingDto>.Fail("Project not found"));

        var drawingId = Guid.NewGuid();
        var initialRevisionId = Guid.NewGuid();
        var revisionCode = string.IsNullOrWhiteSpace(request.Revision) ? "A" : request.Revision.Trim();

        var initialRevision = new DrawingRevision
        {
            Id = initialRevisionId,
            DrawingId = drawingId,
            Revision = revisionCode,
            VersionNumber = 1,
            IsCurrent = true,
            StorageKey = request.StorageKey.Trim(),
            FileName = request.FileName,
            FileExtension = request.FileExtension ?? Path.GetExtension(request.FileName ?? ""),
            FileSizeBytes = request.FileSizeBytes,
            UploadedBy = userId,
            UploadedAt = DateTime.UtcNow,
            Status = DocumentStatus.Draft,
            ChangeReason = request.ChangeReason ?? "Initial drawing revision",
            IsLocked = false,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        var drawing = new Drawing
        {
            Id = drawingId,
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            DrawingNumber = request.DrawingNumber.Trim(),
            DrawingTitle = request.DrawingTitle.Trim(),
            Discipline = request.Discipline,
            DrawingType = request.DrawingType,
            Revision = revisionCode,
            Version = 1,
            Status = DocumentStatus.Draft,
            IsLocked = false,
            CurrentRevisionId = initialRevisionId,
            UploadedBy = userId,
            UploadedAt = DateTime.UtcNow,
            StorageKey = request.StorageKey.Trim(),
            FileName = request.FileName,
            FileExtension = request.FileExtension ?? Path.GetExtension(request.FileName ?? ""),
            FileSizeBytes = request.FileSizeBytes,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Drawings.Add(drawing);
        _context.DrawingRevisions.Add(initialRevision);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateDrawing",
            "Drawing",
            drawing.Id.ToString(),
            null,
            new { drawing.DrawingNumber, drawing.DrawingTitle, drawing.Discipline, Revision = revisionCode },
            cancellationToken: cancellationToken
        );

        // Real-Time SignalR Broadcast (RT-02)
        await _hubContext.Clients.Group($"project:{drawing.ProjectId}").SendAsync(
            "DrawingUploaded",
            new { id = drawing.Id, projectId = drawing.ProjectId, drawingNumber = drawing.DrawingNumber, drawingTitle = drawing.DrawingTitle, revision = revisionCode },
            cancellationToken
        );

        var downloadUrl = await ResolveDownloadUrlAsync(drawing.StorageKey, cancellationToken);

        var dto = new DrawingDto(
            drawing.Id,
            drawing.ProjectId,
            project.Name,
            drawing.SiteId,
            null,
            null,
            drawing.DrawingNumber,
            drawing.DrawingTitle,
            drawing.Discipline,
            drawing.DrawingType,
            drawing.Revision,
            drawing.Version,
            drawing.Status,
            drawing.UploadedBy,
            User.Identity?.Name ?? "User",
            drawing.UploadedAt,
            null,
            null,
            null,
            drawing.StorageKey,
            drawing.FileName,
            drawing.FileExtension,
            drawing.FileSizeBytes,
            0,
            downloadUrl,
            drawing.IsLocked,
            drawing.CurrentRevisionId,
            new List<DrawingRevisionDto>()
        );

        return CreatedAtAction(nameof(GetDrawingById), new { id = drawing.Id }, ApiResponse<DrawingDto>.Ok(dto));
    }

    /// <summary>
    /// DRAW-04: Get full revision history of a drawing.
    /// </summary>
    [HttpGet("{id}/revisions")]
    public async Task<ActionResult<ApiResponse<List<DrawingRevisionDto>>>> GetDrawingRevisions(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var revisions = await _context.DrawingRevisions
            .AsNoTracking()
            .Include(r => r.UploaderUser)
            .Include(r => r.ApproverUser)
            .Where(r => r.DrawingId == id && !r.IsDeleted)
            .OrderByDescending(r => r.VersionNumber)
            .ToListAsync(cancellationToken);

        var dtos = new List<DrawingRevisionDto>();
        foreach (var r in revisions)
        {
            var rUrl = await ResolveDownloadUrlAsync(r.StorageKey, cancellationToken);
            dtos.Add(new DrawingRevisionDto(
                r.Id,
                r.DrawingId,
                r.Revision,
                r.VersionNumber,
                r.IsCurrent,
                r.StorageKey,
                r.FileName,
                r.FileExtension,
                r.FileSizeBytes,
                r.UploadedBy,
                r.UploaderUser?.FullName ?? "Unknown",
                r.UploadedAt,
                r.Status,
                r.ApprovedBy,
                r.ApproverUser?.FullName,
                r.ApprovedAt,
                r.ChangeReason,
                r.Comments,
                r.IsLocked,
                rUrl
            ));
        }

        return Ok(ApiResponse<List<DrawingRevisionDto>>.Ok(dtos));
    }

    /// <summary>
    /// DRAW-04: Create a new drawing revision without overwriting historical versions.
    /// </summary>
    [HttpPost("{id}/revisions")]
    public async Task<ActionResult<ApiResponse<DrawingRevisionDto>>> CreateRevision(
        Guid id,
        [FromBody] CreateDrawingRevisionRequest request,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<DrawingRevisionDto>.Fail("Invalid credentials"));

        var drawing = await _context.Drawings
            .Include(d => d.Revisions)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (drawing == null)
            return NotFound(ApiResponse<DrawingRevisionDto>.Fail("Drawing not found"));

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("ProjectManager");
        if (drawing.IsLocked && !isAdmin)
        {
            return Forbid();
        }

        // Unset previous current revision
        foreach (var r in drawing.Revisions)
        {
            r.IsCurrent = false;
        }

        var nextVersion = (drawing.Revisions.Max(r => (int?)r.VersionNumber) ?? drawing.Version) + 1;
        var newRevision = new DrawingRevision
        {
            Id = Guid.NewGuid(),
            DrawingId = drawing.Id,
            Revision = request.Revision.Trim(),
            VersionNumber = nextVersion,
            IsCurrent = true,
            StorageKey = request.StorageKey.Trim(),
            FileName = request.FileName,
            FileExtension = request.FileExtension ?? Path.GetExtension(request.FileName ?? ""),
            FileSizeBytes = request.FileSizeBytes,
            UploadedBy = userId,
            UploadedAt = DateTime.UtcNow,
            Status = DocumentStatus.Draft,
            ChangeReason = request.ChangeReason ?? $"Revision {request.Revision.Trim()}",
            Comments = request.Comments,
            IsLocked = false,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.DrawingRevisions.Add(newRevision);

        // Update drawing pointer to current revision
        drawing.Revision = newRevision.Revision;
        drawing.Version = newRevision.VersionNumber;
        drawing.StorageKey = newRevision.StorageKey;
        drawing.FileName = newRevision.FileName;
        drawing.FileExtension = newRevision.FileExtension;
        drawing.FileSizeBytes = newRevision.FileSizeBytes;
        drawing.Status = DocumentStatus.Draft;
        drawing.CurrentRevisionId = newRevision.Id;
        drawing.ApprovedBy = null;
        drawing.ApprovedAt = null;
        drawing.UpdatedAt = DateTime.UtcNow;
        drawing.UpdatedBy = userId;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateDrawingRevision",
            "DrawingRevision",
            newRevision.Id.ToString(),
            null,
            new { drawing.DrawingNumber, Revision = newRevision.Revision, VersionNumber = newRevision.VersionNumber, newRevision.ChangeReason },
            cancellationToken: cancellationToken
        );

        // Real-Time SignalR Broadcast (RT-02)
        await _hubContext.Clients.Group($"project:{drawing.ProjectId}").SendAsync(
            "DrawingRevised",
            new { drawingId = drawing.Id, revisionId = newRevision.Id, drawingNumber = drawing.DrawingNumber, revision = newRevision.Revision },
            cancellationToken
        );

        var downloadUrl = await ResolveDownloadUrlAsync(newRevision.StorageKey, cancellationToken);
        var uploader = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);

        var dto = new DrawingRevisionDto(
            newRevision.Id,
            newRevision.DrawingId,
            newRevision.Revision,
            newRevision.VersionNumber,
            newRevision.IsCurrent,
            newRevision.StorageKey,
            newRevision.FileName,
            newRevision.FileExtension,
            newRevision.FileSizeBytes,
            newRevision.UploadedBy,
            uploader?.FullName ?? "User",
            newRevision.UploadedAt,
            newRevision.Status,
            null,
            null,
            null,
            newRevision.ChangeReason,
            newRevision.Comments,
            newRevision.IsLocked,
            downloadUrl
        );

        return Ok(ApiResponse<DrawingRevisionDto>.Ok(dto, "Drawing revision created successfully"));
    }

    /// <summary>
    /// DRAW-03: Approve drawing and lock current revision against overwrite.
    /// </summary>
    [HttpPost("{id}/approve")]
    public async Task<ActionResult<ApiResponse<bool>>> ApproveDrawing(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid credentials"));

        var drawing = await _context.Drawings
            .Include(d => d.Revisions)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (drawing == null)
            return NotFound(ApiResponse<bool>.Fail("Drawing not found"));

        drawing.Status = DocumentStatus.Approved;
        drawing.ApprovedBy = userId;
        drawing.ApprovedAt = DateTime.UtcNow;
        drawing.IsLocked = true; // DRAW-03: Approved drawing becomes read-only
        drawing.UpdatedAt = DateTime.UtcNow;
        drawing.UpdatedBy = userId;

        var currentRev = drawing.Revisions.FirstOrDefault(r => r.IsCurrent)
                      ?? drawing.Revisions.OrderByDescending(r => r.VersionNumber).FirstOrDefault();

        if (currentRev != null)
        {
            currentRev.Status = DocumentStatus.Approved;
            currentRev.ApprovedBy = userId;
            currentRev.ApprovedAt = DateTime.UtcNow;
            currentRev.IsLocked = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ApproveDrawing",
            "Drawing",
            drawing.Id.ToString(),
            null,
            new { drawing.DrawingNumber, drawing.Revision, Status = DocumentStatus.Approved },
            cancellationToken: cancellationToken
        );

        // Real-Time SignalR Broadcast (RT-02)
        await _hubContext.Clients.Group($"project:{drawing.ProjectId}").SendAsync(
            "DrawingApproved",
            new { id = drawing.Id, projectId = drawing.ProjectId, drawingNumber = drawing.DrawingNumber, revision = drawing.Revision, approvedBy = userId },
            cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(true, "Drawing approved successfully and locked against overwrite"));
    }

    /// <summary>
    /// DRAW-03: Reject drawing with reason.
    /// </summary>
    [HttpPost("{id}/reject")]
    public async Task<ActionResult<ApiResponse<bool>>> RejectDrawing(
        Guid id,
        [FromBody] UpdateDrawingStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid credentials"));

        var drawing = await _context.Drawings
            .Include(d => d.Revisions)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (drawing == null)
            return NotFound(ApiResponse<bool>.Fail("Drawing not found"));

        drawing.Status = DocumentStatus.Rejected;
        drawing.UpdatedAt = DateTime.UtcNow;
        drawing.UpdatedBy = userId;

        var currentRev = drawing.Revisions.FirstOrDefault(r => r.IsCurrent);
        if (currentRev != null)
        {
            currentRev.Status = DocumentStatus.Rejected;
            currentRev.Comments = request.Reason;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "RejectDrawing",
            "Drawing",
            drawing.Id.ToString(),
            null,
            new { drawing.DrawingNumber, drawing.Revision, Status = DocumentStatus.Rejected, request.Reason },
            cancellationToken: cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(true, "Drawing marked as rejected"));
    }

    /// <summary>
    /// DRAW-03: Lock or unlock a drawing (Admin only).
    /// </summary>
    [HttpPost("{id}/lock")]
    [Authorize(Roles = "Admin,SystemAdmin,SuperAdmin,ProjectManager")]
    public async Task<ActionResult<ApiResponse<bool>>> LockDrawing(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var drawing = await _context.Drawings.FindAsync(new object[] { id }, cancellationToken);
        if (drawing == null)
            return NotFound(ApiResponse<bool>.Fail("Drawing not found"));

        drawing.IsLocked = !drawing.IsLocked;
        drawing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            drawing.IsLocked ? "LockDrawing" : "UnlockDrawing",
            "Drawing",
            drawing.Id.ToString(),
            null,
            new { drawing.DrawingNumber, drawing.IsLocked },
            cancellationToken: cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(drawing.IsLocked, drawing.IsLocked ? "Drawing locked" : "Drawing unlocked"));
    }

    /// <summary>
    /// DRAW-03: Archive a drawing.
    /// </summary>
    [HttpPost("{id}/archive")]
    public async Task<ActionResult<ApiResponse<bool>>> ArchiveDrawing(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var drawing = await _context.Drawings.FindAsync(new object[] { id }, cancellationToken);
        if (drawing == null)
            return NotFound(ApiResponse<bool>.Fail("Drawing not found"));

        drawing.Status = DocumentStatus.Archived;
        drawing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(ApiResponse<bool>.Ok(true, "Drawing archived"));
    }

    /// <summary>
    /// DRAW-03: Delete drawing according to policy. Approved drawings require Admin privileges.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteDrawing(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid credentials"));

        var drawing = await _context.Drawings
            .Include(d => d.Revisions)
            .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);

        if (drawing == null)
            return NotFound(ApiResponse<bool>.Fail("Drawing not found"));

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        if ((drawing.Status == DocumentStatus.Approved || drawing.IsLocked) && !isAdmin)
        {
            return StatusCode(403, ApiResponse<bool>.Fail("المخطط المعتمد أو المقفل لا يمكن حذفه بواسطة المستخدم العادي وفقاً لسياسة الحوكمة."));
        }

        drawing.IsDeleted = true;
        drawing.DeletedAt = DateTime.UtcNow;
        drawing.DeletedBy = userId;

        foreach (var r in drawing.Revisions)
        {
            r.IsDeleted = true;
            r.DeletedAt = DateTime.UtcNow;
            r.DeletedBy = userId;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "DeleteDrawing",
            "Drawing",
            drawing.Id.ToString(),
            null,
            new { drawing.DrawingNumber, drawing.Revision },
            cancellationToken: cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(true, "Drawing deleted according to policy"));
    }

    /// <summary>
    /// DRAW-01: Update drawing review/approval status.
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateDrawingStatus(
        Guid id,
        [FromBody] UpdateDrawingStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<bool>.Fail("Invalid credentials"));

        var drawing = await _context.Drawings.FindAsync(new object[] { id }, cancellationToken);
        if (drawing == null)
            return NotFound(ApiResponse<bool>.Fail("Drawing not found"));

        var oldStatus = drawing.Status;
        drawing.Status = request.Status;
        drawing.UpdatedAt = DateTime.UtcNow;
        drawing.UpdatedBy = userId;

        if (request.Status == DocumentStatus.Approved)
        {
            drawing.ApprovedBy = userId;
            drawing.ApprovedAt = DateTime.UtcNow;
            drawing.IsLocked = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "UpdateDrawingStatus",
            "Drawing",
            drawing.Id.ToString(),
            new { Status = oldStatus },
            new { Status = request.Status, request.Reason },
            cancellationToken: cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(true, $"Drawing status updated to {request.Status}"));
    }

    // ==========================================
    // DRAW-02: Drawing Markups (Separated Storage)
    // ==========================================

    /// <summary>
    /// DRAW-02: Get all markups for a drawing (viewer overlay).
    /// </summary>
    [HttpGet("{id}/markups")]
    public async Task<ActionResult<ApiResponse<List<DrawingMarkupDto>>>> GetDrawingMarkups(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var markups = await _context.DrawingMarkups
            .AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.DrawingId == id && !m.IsDeleted)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new DrawingMarkupDto(
                m.Id,
                m.DrawingId,
                m.UserId,
                m.User.FullName,
                m.Type,
                m.PositionJson,
                m.Text,
                m.Color,
                m.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<DrawingMarkupDto>>.Ok(markups));
    }

    /// <summary>
    /// DRAW-02: Add a markup to drawing without modifying original file.
    /// </summary>
    [HttpPost("{id}/markups")]
    public async Task<ActionResult<ApiResponse<DrawingMarkupDto>>> AddDrawingMarkup(
        Guid id,
        [FromBody] CreateDrawingMarkupRequest request,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized(ApiResponse<DrawingMarkupDto>.Fail("Invalid credentials"));

        var drawing = await _context.Drawings.FindAsync(new object[] { id }, cancellationToken);
        if (drawing == null)
            return NotFound(ApiResponse<DrawingMarkupDto>.Fail("Drawing not found"));

        var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);

        var markup = new DrawingMarkup
        {
            Id = Guid.NewGuid(),
            DrawingId = id,
            UserId = userId,
            Type = request.Type,
            PositionJson = request.PositionJson,
            Text = request.Text ?? "",
            Color = request.Color ?? "#ef4444",
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        _context.DrawingMarkups.Add(markup);
        await _context.SaveChangesAsync(cancellationToken);

        var dto = new DrawingMarkupDto(
            markup.Id,
            markup.DrawingId,
            markup.UserId,
            user?.FullName ?? "User",
            markup.Type,
            markup.PositionJson,
            markup.Text,
            markup.Color,
            markup.CreatedAt
        );

        return Ok(ApiResponse<DrawingMarkupDto>.Ok(dto, "Markup added successfully"));
    }

    /// <summary>
    /// DRAW-02: Delete a markup by Id.
    /// </summary>
    [HttpDelete("{id}/markups/{markupId}")]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteDrawingMarkup(
        Guid id,
        Guid markupId,
        CancellationToken cancellationToken = default)
    {
        var markup = await _context.DrawingMarkups
            .FirstOrDefaultAsync(m => m.Id == markupId && m.DrawingId == id, cancellationToken);

        if (markup == null)
            return NotFound(ApiResponse<bool>.Fail("Markup not found"));

        markup.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(ApiResponse<bool>.Ok(true, "Markup removed successfully"));
    }
}
