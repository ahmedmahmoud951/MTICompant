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

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DrawingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IMediaStorageService _mediaStorageService;

    public DrawingsController(
        AppDbContext context,
        IAuditService auditService,
        IMediaStorageService mediaStorageService)
    {
        _context = context;
        _auditService = auditService;
        _mediaStorageService = mediaStorageService;
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
    /// DRAW-01: Get drawing detail by Id including markups count and download URL.
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
            .FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (d == null)
            return NotFound(ApiResponse<DrawingDto>.Fail("Drawing not found"));

        var downloadUrl = await ResolveDownloadUrlAsync(d.StorageKey, cancellationToken);

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
            downloadUrl
        );

        return Ok(ApiResponse<DrawingDto>.Ok(dto));
    }

    /// <summary>
    /// DRAW-01: Create and register a new drawing.
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

        var drawing = new Drawing
        {
            Id = Guid.NewGuid(),
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            DrawingNumber = request.DrawingNumber.Trim(),
            DrawingTitle = request.DrawingTitle.Trim(),
            Discipline = request.Discipline,
            DrawingType = request.DrawingType,
            Revision = string.IsNullOrWhiteSpace(request.Revision) ? "A" : request.Revision.Trim(),
            Version = 1,
            Status = DocumentStatus.Draft,
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
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateDrawing",
            "Drawing",
            drawing.Id.ToString(),
            null,
            new { drawing.DrawingNumber, drawing.DrawingTitle, drawing.Discipline },
            cancellationToken: cancellationToken
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
            downloadUrl
        );

        return CreatedAtAction(nameof(GetDrawingById), new { id = drawing.Id }, ApiResponse<DrawingDto>.Ok(dto));
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
