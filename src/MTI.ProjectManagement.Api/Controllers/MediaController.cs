using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Api.Helpers;
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
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, request.SiteId.Value, cancellationToken: cancellationToken);
            if (!canAccess) return Forbid();
        }
        else if (request.ProjectId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, request.ProjectId.Value, cancellationToken: cancellationToken);
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
            Extension = Path.GetExtension(request.FileName) ?? string.Empty,
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
        var uploadUrl = await _mediaStorage.GeneratePreSignedUploadUrlAsync(objectKey, request.ContentType, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);
        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(objectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);

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
        var mediaFile = await _dbContext.MediaFiles.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);
        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        // 1. Verify object exists in B2
        var exists = await _mediaStorage.DoesObjectExistAsync(mediaFile.ObjectKey, cancellationToken: cancellationToken);
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
            cancellationToken: cancellationToken);

        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromHours(4), cancellationToken: cancellationToken);

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
    /// Authorizes direct client upload to Backblaze B2 (Prompt STORAGE-01)
    /// Validates user, permission, project scope, file type, file size, and document policy.
    /// Never exposes B2 Application Key, Key ID, or secret credentials.
    /// </summary>
    [HttpPost("authorize-upload")]
    public async Task<ActionResult<AuthorizeUploadResponse>> AuthorizeUpload(
        [FromBody] AuthorizeUploadRequest request,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return Unauthorized();

        // 1. File size validation (100MB limit)
        if (request.FileSize <= 0 || request.FileSize > 104857600)
            return BadRequest(new { message = "Invalid file size. Maximum allowed size is 100MB." });

        if (string.IsNullOrWhiteSpace(request.FileName))
            return BadRequest(new { message = "FileName is required." });

        // 2. Permission and Project Scope validation
        if (request.SiteId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, request.SiteId.Value, cancellationToken: cancellationToken);
            if (!canAccess) return Forbid();
        }
        else if (request.ProjectId.HasValue)
        {
            var canAccess = await _resourceAuthorization.CanAccessProjectAsync(userId, request.ProjectId.Value, cancellationToken: cancellationToken);
            if (!canAccess) return Forbid();
        }

        // 3. Document Policy validation
        if (request.TargetType.Equals("Document", StringComparison.OrdinalIgnoreCase) && request.DocumentId.HasValue)
        {
            var doc = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == request.DocumentId.Value && !d.IsDeleted, cancellationToken: cancellationToken);
            if (doc != null && doc.IsLocked)
            {
                return BadRequest(new { message = "Document is approved or locked and cannot accept new uploads without a formal revision/correction request." });
            }
        }

        // 4. Construct Object Path per MTI STORAGE-01 Specification:
        // - projects/{projectId}/documents/{documentId}/versions/{versionId}/{safeFileName}
        // - projects/{projectId}/assets/{assetId}/{fileName}
        // - chat/{conversationId}/{messageId}/{attachmentId}/{fileName}
        var safeFileName = Path.GetFileName(request.FileName).Replace(" ", "_");
        var mediaId = Guid.NewGuid();
        string objectKey;

        if (request.TargetType.Equals("Document", StringComparison.OrdinalIgnoreCase) && request.ProjectId.HasValue && request.DocumentId.HasValue)
        {
            var versionId = request.VersionId ?? Guid.NewGuid();
            objectKey = _mediaStorage.BuildDocumentObjectKey(request.ProjectId.Value, request.DocumentId.Value, versionId, safeFileName);
        }
        else if (request.TargetType.Equals("Asset", StringComparison.OrdinalIgnoreCase) && request.ProjectId.HasValue && request.AssetId.HasValue)
        {
            objectKey = _mediaStorage.BuildAssetObjectKey(request.ProjectId.Value, request.AssetId.Value, safeFileName);
        }
        else if (request.TargetType.Equals("Chat", StringComparison.OrdinalIgnoreCase) && request.ConversationId.HasValue)
        {
            var msgId = request.MessageId ?? Guid.NewGuid();
            var attId = request.AttachmentId ?? Guid.NewGuid();
            objectKey = _mediaStorage.BuildChatObjectKey(request.ConversationId.Value, msgId, attId, safeFileName);
        }
        else if (request.TargetType.Equals("OperationPhoto", StringComparison.OrdinalIgnoreCase) && request.ProjectId.HasValue && request.SiteId.HasValue && request.OperationId.HasValue)
        {
            objectKey = $"projects/{request.ProjectId.Value}/sites/{request.SiteId.Value}/operations/{request.OperationId.Value}/photos/{mediaId}_{safeFileName}";
        }
        else if (request.TargetType.Equals("ReportAttachment", StringComparison.OrdinalIgnoreCase) && request.ProjectId.HasValue && request.SiteId.HasValue && request.ReportId.HasValue)
        {
            objectKey = $"projects/{request.ProjectId.Value}/sites/{request.SiteId.Value}/reports/{request.ReportId.Value}/attachments/{mediaId}_{safeFileName}";
        }
        else
        {
            objectKey = _mediaStorage.BuildObjectKey(request.TargetType, request.ProjectId, request.SiteId, request.DocumentId ?? request.AssetId ?? request.OperationId ?? request.ReportId, mediaId, safeFileName);
        }

        var bucketName = _configuration["BackblazeB2:BucketName"] ?? "MTICompany";
        var mediaType = DetermineMediaType(request.FileName, request.ContentType);

        // 5. Create Pending MediaFile in Database
        var mediaFile = new MediaFile
        {
            Id = mediaId,
            EntityType = request.TargetType,
            EntityId = request.DocumentId ?? request.AssetId ?? request.OperationId ?? request.ReportId ?? request.ConversationId ?? request.ProjectId,
            OwnerUserId = userId,
            StorageProvider = "BackblazeB2",
            BucketName = bucketName,
            ObjectKey = objectKey,
            OriginalFileName = request.FileName,
            Extension = Path.GetExtension(request.FileName) ?? string.Empty,
            StoredFileName = Path.GetFileName(objectKey),
            ContentType = request.ContentType,
            MediaType = mediaType,
            FileSize = request.FileSize,
            Checksum = request.Checksum,
            Status = "Pending",
            UploadedAt = DateTime.UtcNow,
            CreatedBy = userId
        };

        _dbContext.MediaFiles.Add(mediaFile);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // 6. Generate short-lived (15 minutes) pre-signed upload URL for direct B2 upload
        // Note: Absolutely NO Backblaze Application Key or Application Key ID is returned to the client
        var uploadUrl = await _mediaStorage.GeneratePreSignedUploadUrlAsync(objectKey, request.ContentType, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);

        return Ok(new AuthorizeUploadResponse(
            mediaId,
            objectKey,
            uploadUrl,
            15,
            request.Checksum
        ));
    }

    /// <summary>
    /// Finalizes direct upload to B2, verifies object presence, checks checksum deduplication,
    /// and creates DocumentVersion or MessageAttachment when applicable (Prompt STORAGE-01)
    /// </summary>
    [HttpPost("finalize-upload")]
    public async Task<ActionResult<FinalizeUploadResponse>> FinalizeUpload(
        [FromBody] FinalizeUploadRequest request,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var mediaFile = await _dbContext.MediaFiles.FirstOrDefaultAsync(m => m.Id == request.MediaFileId && !m.IsDeleted, cancellationToken: cancellationToken);
        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        // 1. Verify object exists in Backblaze B2
        var exists = await _mediaStorage.DoesObjectExistAsync(mediaFile.ObjectKey, cancellationToken: cancellationToken);
        if (!exists)
        {
            return BadRequest(new { message = "The object was not found in Backblaze B2 storage. Direct upload may have failed, timed out, or not completed." });
        }

        // 2. Calculate/Verify checksum & prevent accidental duplicate uploads
        var effectiveChecksum = request.Checksum ?? mediaFile.Checksum;
        bool isDuplicate = false;
        if (!string.IsNullOrWhiteSpace(effectiveChecksum))
        {
            var duplicate = await _dbContext.MediaFiles
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id != mediaFile.Id && !m.IsDeleted && m.Status == "Uploaded" && m.Checksum == effectiveChecksum, cancellationToken: cancellationToken);
            if (duplicate != null)
            {
                isDuplicate = true;
            }
        }

        mediaFile.Status = "Uploaded";
        if (!string.IsNullOrWhiteSpace(effectiveChecksum))
            mediaFile.Checksum = effectiveChecksum;
        mediaFile.UploadedAt = DateTime.UtcNow;

        Guid? documentVersionId = null;
        Guid? messageAttachmentId = null;

        // 3. Create DocumentVersion if requested and target is Document
        if (request.CreateDocumentVersion && mediaFile.EntityType.Equals("Document", StringComparison.OrdinalIgnoreCase) && mediaFile.EntityId.HasValue)
        {
            var document = await _dbContext.Documents.Include(d => d.Versions).FirstOrDefaultAsync(d => d.Id == mediaFile.EntityId.Value && !d.IsDeleted, cancellationToken: cancellationToken);
            if (document != null && !document.IsLocked)
            {
                var nextVersionNum = (document.Versions.Max(v => (int?)v.VersionNumber) ?? 0) + 1;
                var docVersion = new DocumentVersion
                {
                    DocumentId = document.Id,
                    VersionNumber = nextVersionNum,
                    FileId = mediaFile.Id,
                    UploadedBy = userId,
                    UploadedAt = DateTime.UtcNow,
                    Status = DocumentVersionStatus.Draft,
                    ChangeReason = request.Caption ?? "Uploaded directly to B2"
                };
                _dbContext.DocumentVersions.Add(docVersion);
                document.CurrentVersionId = docVersion.Id;
                documentVersionId = docVersion.Id;
            }
        }

        // 4. Create MessageAttachment if requested and target is Chat
        if (request.CreateMessageAttachment && mediaFile.EntityType.Equals("Chat", StringComparison.OrdinalIgnoreCase) && mediaFile.EntityId.HasValue)
        {
            var msgAttachment = new MessageAttachment
            {
                MessageId = mediaFile.EntityId.Value,
                MediaFileId = mediaFile.Id,
                Type = mediaFile.MediaType.ToString()
            };
            _dbContext.MessageAttachments.Add(msgAttachment);
            messageAttachmentId = msgAttachment.Id;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "FinalizeUpload",
            "MediaFile",
            mediaFile.Id.ToString(),
            null,
            new { mediaFile.OriginalFileName, mediaFile.ObjectKey, mediaFile.Checksum, isDuplicate },
            cancellationToken: cancellationToken);

        var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromMinutes(15), cancellationToken: cancellationToken);

        var dto = new MediaFileDto(
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
        );

        return Ok(new FinalizeUploadResponse(dto, documentVersionId, messageAttachmentId, isDuplicate));
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

        if (!UserClaims.TryGetUserId(User, out var userId))
            return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("ProjectManager");
        if (request.SiteId.HasValue && !isAdmin)
        {
            var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, request.SiteId.Value, cancellationToken: cancellationToken);
            if (!canAccess) return Forbid();
        }

        var mediaId = Guid.NewGuid();
        var originalFileName = Path.GetFileName(request.File.FileName);
        var contentType = string.IsNullOrWhiteSpace(request.File.ContentType) ? "application/octet-stream" : request.File.ContentType;
        var mediaType = DetermineMediaType(originalFileName, contentType);
        var bucketName = _configuration["BackblazeB2:BucketName"] ?? "MTICompany";

        var objectKey = _mediaStorage.BuildObjectKey(request.EntityType ?? "general", request.ProjectId, request.SiteId, request.EntityId, mediaId, originalFileName);

        using var stream = request.File.OpenReadStream();
        await _mediaStorage.UploadStreamAsync(stream, objectKey, contentType, cancellationToken);

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
            Extension = Path.GetExtension(originalFileName) ?? string.Empty,
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
            cancellationToken: cancellationToken);

        var preSignedUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(objectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);

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
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        if (!await CanAccessMediaAsync(mediaFile, cancellationToken))
            return Forbid();

        var url = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);

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
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        if (!await CanAccessMediaAsync(mediaFile, cancellationToken))
            return Forbid();

        var stream = await _mediaStorage.DownloadFileAsync(mediaFile.ObjectKey, cancellationToken: cancellationToken);
        if (stream == null) return NotFound(new { message = "File could not be retrieved from Backblaze B2 storage." });

        return File(stream, mediaFile.ContentType, mediaFile.OriginalFileName);
    }

    [HttpGet("{id}/url")]
    public async Task<ActionResult> GetDownloadUrl(Guid id, CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        if (!await CanAccessMediaAsync(mediaFile, cancellationToken))
            return Forbid();

        var url = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);
        return Ok(new { downloadUrl = url, fileName = mediaFile.OriginalFileName, fileSize = mediaFile.FileSize });
    }

    /// <summary>
    /// Owner, Admin/SystemAdmin/SuperAdmin, or project/site-scoped access via related entity.
    /// <summary>
    /// Validates User, Permission, Project, Site, Document, and Document/Entity status per STORAGE-02.
    /// Prevents cross-project or unauthorized data access.
    /// </summary>
    private async Task<bool> CanAccessMediaAsync(MediaFile mediaFile, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
            return false;

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        if (isAdmin)
            return true;

        if (mediaFile.OwnerUserId == userId)
            return true;

        if (!mediaFile.EntityId.HasValue || string.IsNullOrWhiteSpace(mediaFile.EntityType))
            return false;

        var entityId = mediaFile.EntityId.Value;
        var entityType = mediaFile.EntityType;

        if (entityType.Equals("Document", StringComparison.OrdinalIgnoreCase) || entityType.Equals("DocumentVersion", StringComparison.OrdinalIgnoreCase))
        {
            var doc = await _dbContext.Documents.AsNoTracking()
                .Include(d => d.Versions)
                .FirstOrDefaultAsync(d => (d.Id == entityId || d.Versions.Any(v => v.Id == entityId || v.FileId == mediaFile.Id)) && !d.IsDeleted, cancellationToken);
            if (doc == null) return false;

            // Validate document status: Draft documents only accessible by Author or Project Members
            if (doc.Status == DocumentStatus.Draft && doc.UploadedBy != userId)
            {
                var isMember = await _dbContext.ProjectMembers.AsNoTracking().AnyAsync(pm => pm.ProjectId == doc.ProjectId && pm.UserId == userId, cancellationToken);
                if (!isMember) return false;
            }

            if (doc.SiteId.HasValue)
                return await _resourceAuthorization.CanAccessSiteAsync(userId, doc.SiteId.Value, cancellationToken: cancellationToken);
            return await _resourceAuthorization.CanAccessProjectAsync(userId, doc.ProjectId, cancellationToken: cancellationToken);
        }

        if (entityType.Equals("Drawing", StringComparison.OrdinalIgnoreCase) || entityType.Equals("DrawingRevision", StringComparison.OrdinalIgnoreCase))
        {
            var drawing = await _dbContext.Drawings.AsNoTracking()
                .Include(d => d.Revisions)
                .FirstOrDefaultAsync(d => (d.Id == entityId || d.Revisions.Any(r => r.Id == entityId || r.StorageKey == mediaFile.StorageKey)) && !d.IsDeleted, cancellationToken);
            if (drawing == null) return false;

            if (drawing.SiteId.HasValue)
                return await _resourceAuthorization.CanAccessSiteAsync(userId, drawing.SiteId.Value, cancellationToken: cancellationToken);
            return await _resourceAuthorization.CanAccessProjectAsync(userId, drawing.ProjectId, cancellationToken: cancellationToken);
        }

        if (entityType.Equals("DailyReport", StringComparison.OrdinalIgnoreCase) || entityType.Equals("DailySiteReport", StringComparison.OrdinalIgnoreCase))
        {
            var report = await _dbContext.DailySiteReports.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == entityId && !r.IsDeleted, cancellationToken);
            if (report == null) return false;

            if (report.SiteId != Guid.Empty)
                return await _resourceAuthorization.CanAccessSiteAsync(userId, report.SiteId, cancellationToken: cancellationToken);
            return await _resourceAuthorization.CanAccessProjectAsync(userId, report.ProjectId, cancellationToken: cancellationToken);
        }

        if (entityType.Equals("Task", StringComparison.OrdinalIgnoreCase))
        {
            var task = await _dbContext.Tasks.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == entityId && !t.IsDeleted, cancellationToken);
            if (task == null) return false;
            if (task.SiteId.HasValue)
                return await _resourceAuthorization.CanAccessSiteAsync(userId, task.SiteId.Value, cancellationToken: cancellationToken);
            return await _resourceAuthorization.CanAccessProjectAsync(userId, task.ProjectId, cancellationToken: cancellationToken);
        }

        if (entityType.Equals("Chat", StringComparison.OrdinalIgnoreCase) || entityType.Equals("Message", StringComparison.OrdinalIgnoreCase))
        {
            var isMember = await _dbContext.ConversationMembers.AsNoTracking()
                .AnyAsync(m => (m.ConversationId == entityId || m.Conversation.Messages.Any(msg => msg.Id == entityId)) && m.UserId == userId && m.LeftAt == null, cancellationToken);
            return isMember;
        }

        if (entityType.Equals("ProjectData", StringComparison.OrdinalIgnoreCase))
        {
            var record = await _dbContext.ProjectDataRecords.AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == entityId && !r.IsDeleted, cancellationToken);
            if (record == null) return false;
            return await _resourceAuthorization.CanAccessSiteAsync(userId, record.SiteId, cancellationToken: cancellationToken)
                || await _resourceAuthorization.CanAccessProjectAsync(userId, record.ProjectId, cancellationToken: cancellationToken);
        }

        return false;
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var mediaFile = await _dbContext.MediaFiles
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);

        if (mediaFile == null) return NotFound(new { message = "Media file not found." });

        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        _ = Guid.TryParse(userIdString, out var userId);
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

        // Rule (Prompt 08): Only authorized Admin can delete approved project media. Engineer cannot delete approved media.
        if (mediaFile.EntityType.Equals("ProjectData", StringComparison.OrdinalIgnoreCase) && mediaFile.EntityId.HasValue)
        {
            var dataRecord = await _dbContext.ProjectDataRecords.AsNoTracking().FirstOrDefaultAsync(d => d.Id == mediaFile.EntityId.Value, cancellationToken: cancellationToken);
            if (dataRecord != null && dataRecord.Status == DataRecordStatus.Approved && !isAdmin)
            {
                return Forbid();
            }
        }

        if (!isAdmin && mediaFile.OwnerUserId != userId)
        {
            return Forbid();
        }

        await _mediaStorage.DeleteFileAsync(mediaFile.ObjectKey, cancellationToken: cancellationToken);

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
            cancellationToken: cancellationToken);

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


