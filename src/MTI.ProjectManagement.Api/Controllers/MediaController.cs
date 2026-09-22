using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MediaController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IB2StorageService _b2Service;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly IAuditService _auditService;
    private readonly IConfiguration _configuration;

    public MediaController(
        IAppDbContext dbContext,
        IMediaStorageService mediaStorage,
        IB2StorageService b2Service,
        IResourceAuthorizationService resourceAuthorization,
        IAuditService auditService,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _mediaStorage = mediaStorage;
        _b2Service = b2Service;
        _resourceAuthorization = resourceAuthorization;
        _auditService = auditService;
        _configuration = configuration;
    }

    /// <summary>
    /// Generates short-lived pre-signed upload URL for direct client-to-B2 upload (Prompt 08)
    /// </summary>
    [HttpPost("upload-url")]
    public async Task<ActionResult<CreateUploadUrlResponse>> GetUploadUrl(
        [FromBody] CreateUploadUrlRequest request,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized();

        // 1. Validate file size (100MB max)
        if (request.FileSize <= 0 || request.FileSize > 104857600)
            return BadRequest(new { message = "Invalid file size. Maximum allowed size is 100MB." });

        if (string.IsNullOrWhiteSpace(request.FileName))
            return BadRequest(new { message = "FileName is required." });

        // 2. Resource authorization check
        if (request.SiteId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, request.SiteId.Value, cancellationToken);
            if (!canAccess) return Forbid();
        }
        else if (request.ProjectId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, request.ProjectId.Value, cancellationToken);
            if (!canAccess) return Forbid();
        }

        var mediaId = Guid.NewGuid();
        var objectKey = _mediaStorage.BuildObjectKey(
            request.EntityType,
            request.ProjectId,
            request.SiteId,
            request.EntityId,
            mediaId,
            request.FileName);

        var bucketName = _configuration["BackblazeB2:BucketName"] ?? "MTICompany";
        var mediaType = DetermineMediaType(request.FileName, request.ContentType);

        // 3. Create Pending MediaFile in Database
        var mediaFile = new MediaFile
        {
            Id = mediaId,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            OwnerUserId = userId,
            StorageProvider = "BackblazeB2",
            BucketName = bucketName,
            ObjectKey = objectKey,
            OriginalFileName = request.FileName,
            StoredFileName = Path.GetFileName(objectKey),
            ContentType = request.ContentType,
            MediaType = mediaType,
            FileSize = request.FileSize,
            Status = "Pending",
            UploadedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _dbContext.MediaFiles.Add(mediaFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // 4. Generate short-lived (15 minutes) pre-signed upload URL
        var uploadUrl = await _mediaStorage.GeneratePreSignedUploadUrlAsync(objectKey, request.ContentType, TimeSpan.FromMinutes(15), cancellationToken);
        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(objectKey, TimeSpan.FromHours(2), cancellationToken);

        return Ok(new CreateUploadUrlResponse(
            mediaId,
            objectKey,
            uploadUrl,
            downloadUrl,
            15
        ));
    }

    /// <summary>
    /// Confirms direct upload completion from client and verifies B2 object existence (Prompt 08)
    /// </summary>
    [HttpPost("{id}/complete")]
    public async Task<ActionResult<MediaFileDto>> CompleteUpload(
        Guid id,
        [FromBody] CompleteUploadRequest? request,
        CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);
        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        // 1. Verify object exists in B2
        var exists = await _mediaStorage.DoesObjectExistAsync(mediaFile.ObjectKey, cancellationToken);
        if (!exists)
        {
            return BadRequest(new { message = "The object was not found in Backblaze B2 storage. Upload might have failed or timed out." });
        }

        // 2. Update status to Uploaded
        mediaFile.Status = "Uploaded";
        mediaFile.Checksum = request?.Checksum;
        mediaFile.UploadedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CompleteUpload",
            "MediaFile",
            mediaFile.Id.ToString(),
            null,
            new { mediaFile.OriginalFileName, mediaFile.ObjectKey, mediaFile.Status },
            cancellationToken);

        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromHours(4), cancellationToken);

        return Ok(new MediaFileDto(
            mediaFile.Id,
            mediaFile.OriginalFileName,
            mediaFile.ContentType,
            mediaFile.MediaType,
            mediaFile.FileSize,
            mediaFile.Status,
            downloadUrl,
            mediaFile.UploadedAt,
            mediaFile.EntityType,
            mediaFile.EntityId,
            mediaFile.OwnerUserId
        ));
    }

    /// <summary>
    /// Traditional proxy upload endpoint for smaller files/direct payloads
    /// </summary>
    [HttpPost("upload")]
    [RequestSizeLimit(104857600)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<MediaFileDto>> Upload(
        [FromForm] DirectFileUploadRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request?.File == null || request.File.Length == 0)
            return BadRequest(new { message = "No file was uploaded or file is empty." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized();

        if (request.SiteId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, request.SiteId.Value, cancellationToken);
            if (!canAccess) return Forbid();
        }

        var mediaId = Guid.NewGuid();
        var originalFileName = Path.GetFileName(request.File.FileName);
        var contentType = string.IsNullOrWhiteSpace(request.File.ContentType) ? "application/octet-stream" : request.File.ContentType;
        var mediaType = DetermineMediaType(originalFileName, contentType);
        var bucketName = _configuration["BackblazeB2:BucketName"] ?? "MTICompany";

        var objectKey = _mediaStorage.BuildObjectKey(request.EntityType ?? "general", request.ProjectId, request.SiteId, request.EntityId, mediaId, originalFileName);

        using var stream = request.File.OpenReadStream();
        await _b2Service.UploadFileAsync(stream, originalFileName, contentType, bucketName, cancellationToken);

        var mediaFile = new MediaFile
        {
            Id = mediaId,
            EntityType = request.EntityType ?? "General",
            EntityId = request.EntityId,
            OwnerUserId = userId,
            StorageProvider = "BackblazeB2",
            BucketName = bucketName,
            ObjectKey = objectKey,
            OriginalFileName = originalFileName,
            StoredFileName = Path.GetFileName(objectKey),
            ContentType = contentType,
            MediaType = mediaType,
            FileSize = request.File.Length,
            Status = "Uploaded",
            UploadedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _dbContext.MediaFiles.Add(mediaFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Upload",
            "MediaFile",
            mediaFile.Id.ToString(),
            null,
            new { mediaFile.OriginalFileName, mediaFile.FileSize, mediaFile.ObjectKey },
            cancellationToken);

        var preSignedUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(objectKey, TimeSpan.FromHours(2), cancellationToken);

        var dto = new MediaFileDto(
            mediaFile.Id,
            mediaFile.OriginalFileName,
            mediaFile.ContentType,
            mediaFile.MediaType,
            mediaFile.FileSize,
            mediaFile.Status,
            preSignedUrl,
            mediaFile.UploadedAt,
            mediaFile.EntityType,
            mediaFile.EntityId,
            mediaFile.OwnerUserId
        );

        return CreatedAtAction(nameof(GetById), new { id = mediaFile.Id }, dto);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MediaFileDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var url = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken);

        return Ok(new MediaFileDto(
            mediaFile.Id,
            mediaFile.OriginalFileName,
            mediaFile.ContentType,
            mediaFile.MediaType,
            mediaFile.FileSize,
            mediaFile.Status,
            url,
            mediaFile.UploadedAt,
            mediaFile.EntityType,
            mediaFile.EntityId,
            mediaFile.OwnerUserId
        ));
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var stream = await _mediaStorage.DownloadFileAsync(mediaFile.ObjectKey, cancellationToken);
        if (stream == null) return NotFound(new { message = "File could not be retrieved from Backblaze B2 storage." });

        return File(stream, mediaFile.ContentType, mediaFile.OriginalFileName);
    }

    [HttpGet("{id}/url")]
    public async Task<ActionResult> GetDownloadUrl(Guid id, CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var url = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken);
        return Ok(new { downloadUrl = url, fileName = mediaFile.OriginalFileName, fileSize = mediaFile.FileSize });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

        // Rule (Prompt 08): Only authorized Admin can delete approved project media. Engineer cannot delete approved media.
        if (mediaFile.EntityType.Equals("ProjectData", StringComparison.OrdinalIgnoreCase) && mediaFile.EntityId.HasValue)
        {
            var dataRecord = await _dbContext.ProjectDataRecords.AsNoTracking().FirstOrDefaultAsync(d => d.Id == mediaFile.EntityId.Value, cancellationToken);
            if (dataRecord != null && dataRecord.Status == DataRecordStatus.Approved && !isAdmin)
            {
                return Forbid();
            }
        }

        if (!isAdmin && mediaFile.OwnerUserId != userId)
        {
            return Forbid();
        }

        await _mediaStorage.DeleteFileAsync(mediaFile.ObjectKey, cancellationToken);

        mediaFile.IsDeleted = true;
        mediaFile.DeletedAt = DateTime.UtcNow;
        mediaFile.DeletedBy = userId;
        mediaFile.Status = "Deleted";

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Delete",
            "MediaFile",
            mediaFile.Id.ToString(),
            new { mediaFile.OriginalFileName, mediaFile.ObjectKey },
            null,
            cancellationToken);

        return NoContent();
    }

    private static MediaType DetermineMediaType(string fileName, string contentType)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        if (contentType.StartsWith("image/") || ext is ".jpg" or ".jpeg" or ".png" or ".webp" or ".gif" or ".svg" or ".bmp")
            return MediaType.Image;

        if (contentType.StartsWith("video/") || ext is ".mp4" or ".mov" or ".avi" or ".mkv" or ".webm")
            return MediaType.Video;

        if (contentType.StartsWith("audio/") || ext is ".mp3" or ".wav" or ".m4a" or ".ogg")
            return MediaType.Audio;

        if (ext is ".csv" or ".xls" or ".xlsx")
            return MediaType.DataSheet;

        if (ext is ".pdf" or ".doc" or ".docx" or ".ppt" or ".pptx" or ".txt")
            return MediaType.Document;

        return MediaType.Other;
    }
}

public class DirectFileUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? SiteId { get; set; }
}
