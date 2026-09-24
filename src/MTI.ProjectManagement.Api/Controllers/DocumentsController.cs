using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IMediaStorageService _mediaStorageService;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;

    public DocumentsController(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService,
        IMediaStorageService mediaStorageService,
        INotificationService notificationService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
        _mediaStorageService = mediaStorageService;
        _notificationService = notificationService;
        _auditService = auditService;
    }

    private bool HasPermission(string permission)
    {
        return _currentUserService.IsAdmin ||
               _currentUserService.IsSystemAdmin ||
               _currentUserService.Permissions.Contains(permission);
    }

    // ==========================================
    // 1. Document Types Catalog
    // ==========================================

    [HttpGet("types")]
    public async Task<ActionResult<ApiResponse<List<DocumentTypeDto>>>> GetDocumentTypes()
    {
        var types = await _context.DocumentTypes
            .Where(t => t.IsActive)
            .OrderBy(t => t.Code)
            .Select(t => new DocumentTypeDto(
                t.Id,
                t.Code,
                t.NameAr,
                t.NameEn,
                t.Description,
                t.IsActive))
            .ToListAsync();

        return Ok(ApiResponse<List<DocumentTypeDto>>.SuccessResult(types));
    }

    // ==========================================
    // 2. Documents List (Authorized Scope Filter)
    // ==========================================

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<DocumentDto>>>> GetDocuments(
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? siteId,
        [FromQuery] Guid? typeId,
        [FromQuery] DocumentStatus? status,
        [FromQuery] DocumentCategory? category,
        [FromQuery] string? search)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var authorizedProjectIds = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(userId.Value);

        var query = _context.Documents
            .Include(d => d.Project)
            .Include(d => d.Site)
            .Include(d => d.DocumentType)
            .Include(d => d.OwnerUser)
            .Include(d => d.UploaderUser)
            .Include(d => d.ApproverUser)
            .Include(d => d.CurrentVersion)
                .ThenInclude(v => v!.File)
            .Include(d => d.Versions)
            .Where(d => authorizedProjectIds.Contains(d.ProjectId));

        var isAdminUser = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        var hasAccountingAccess = isAdminUser ||
                                  _currentUserService.Permissions.Contains("Accounting.View") ||
                                  _currentUserService.Permissions.Contains("Documents.Accounting.View");

        if (category == DocumentCategory.Accounting && !hasAccountingAccess)
        {
            return Forbid();
        }

        if (!hasAccountingAccess)
        {
            query = query.Where(d => d.Category != DocumentCategory.Accounting);
        }

        if (category.HasValue)
        {
            query = query.Where(d => d.Category == category.Value);
        }

        if (projectId.HasValue)
        {
            if (!authorizedProjectIds.Contains(projectId.Value)) return Forbid();
            query = query.Where(d => d.ProjectId == projectId.Value);
        }

        if (siteId.HasValue)
        {
            query = query.Where(d => d.SiteId == siteId.Value);
        }

        if (typeId.HasValue)
        {
            query = query.Where(d => d.DocumentTypeId == typeId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(d => d.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d => d.Title.ToLower().Contains(s) ||
                                     d.DocumentNumber.ToLower().Contains(s) ||
                                     (d.Description != null && d.Description.ToLower().Contains(s)));
        }

        var docs = await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var dtos = docs.Select(d =>
        {
            var isSealed = d.LockedAt.HasValue
                || d.Status == DocumentStatus.Approved
                || d.Status == DocumentStatus.Locked;
            var isUploader = d.UploadedBy == userId.Value;
            var withinWindow = !d.EditableUntil.HasValue || DateTime.UtcNow <= d.EditableUntil.Value;
            var isLocked = d.IsLocked;
            // Admin: always manage. Uploader: only within 24h and not sealed.
            var isEditable = isAdminUser || (!isSealed && isUploader && withinWindow);

            return new DocumentDto(
                d.Id,
                d.DocumentNumber,
                d.ProjectId,
                d.Project.Name,
                d.SiteId,
                d.Site?.Name,
                d.DocumentTypeId,
                d.DocumentType.Code,
                d.DocumentType.NameAr,
                d.DocumentType.NameEn,
                d.Title,
                d.Description,
                d.OwnerUserId,
                d.OwnerUser.FullName,
                d.UploadedBy,
                d.UploaderUser.FullName,
                d.Status,
                d.CurrentVersionId,
                d.CurrentVersion?.VersionNumber ?? 0,
                d.CurrentVersion?.File?.OriginalFileName,
                d.CurrentVersion?.File?.FileSize,
                d.EditableUntil,
                isLocked,
                isEditable,
                d.ApprovedAt,
                d.ApprovedBy,
                d.ApproverUser?.FullName,
                d.CreatedAt,
                d.UpdatedAt,
                d.Versions.Count,
                d.Category
            );
        }).ToList();

        return Ok(ApiResponse<List<DocumentDto>>.SuccessResult(dtos));
    }

    // ==========================================
    // 3. Document Details (with History)
    // ==========================================

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<DocumentDetailDto>>> GetDocumentById(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var doc = await _context.Documents
            .Include(d => d.Project)
            .Include(d => d.Site)
            .Include(d => d.DocumentType)
            .Include(d => d.OwnerUser)
            .Include(d => d.UploaderUser)
            .Include(d => d.ApproverUser)
            .Include(d => d.CurrentVersion)
                .ThenInclude(v => v!.File)
            .Include(d => d.Versions)
                .ThenInclude(v => v.File)
            .Include(d => d.Versions)
                .ThenInclude(v => v.Uploader)
            .Include(d => d.Approvals)
                .ThenInclude(a => a.Requester)
            .Include(d => d.Approvals)
                .ThenInclude(a => a.Reviewer)
            .Include(d => d.Corrections)
                .ThenInclude(c => c.Requester)
            .Include(d => d.Corrections)
                .ThenInclude(c => c.Assignee)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return NotFound(ApiResponse<DocumentDetailDto>.ErrorResult("Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, doc.ProjectId);
        if (!canAccess) return Forbid();

        var isAdminUser = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        var isSealed = doc.LockedAt.HasValue
            || doc.Status == DocumentStatus.Approved
            || doc.Status == DocumentStatus.Locked;
        var isUploader = doc.UploadedBy == userId.Value;
        var withinWindow = !doc.EditableUntil.HasValue || DateTime.UtcNow <= doc.EditableUntil.Value;
        var isEditable = isAdminUser || (!isSealed && isUploader && withinWindow);

        var docDto = new DocumentDto(
            doc.Id,
            doc.DocumentNumber,
            doc.ProjectId,
            doc.Project.Name,
            doc.SiteId,
            doc.Site?.Name,
            doc.DocumentTypeId,
            doc.DocumentType.Code,
            doc.DocumentType.NameAr,
            doc.DocumentType.NameEn,
            doc.Title,
            doc.Description,
            doc.OwnerUserId,
            doc.OwnerUser.FullName,
            doc.UploadedBy,
            doc.UploaderUser.FullName,
            doc.Status,
            doc.CurrentVersionId,
            doc.CurrentVersion?.VersionNumber ?? 0,
            doc.CurrentVersion?.File?.OriginalFileName,
            doc.CurrentVersion?.File?.FileSize,
            doc.EditableUntil,
            doc.IsLocked,
            isEditable,
            doc.ApprovedAt,
            doc.ApprovedBy,
            doc.ApproverUser?.FullName,
            doc.CreatedAt,
            doc.UpdatedAt,
            doc.Versions.Count
        );

        var versionDtos = doc.Versions
            .OrderByDescending(v => v.VersionNumber)
            .Select(v => new DocumentVersionDto(
                v.Id,
                v.DocumentId,
                v.VersionNumber,
                v.FileId,
                v.File.OriginalFileName,
                v.File.ContentType,
                v.File.FileSize,
                v.File.Checksum,
                v.UploadedBy,
                v.Uploader.FullName,
                v.UploadedAt,
                v.EditUntil,
                v.Status,
                v.ChangeReason,
                isAdminUser || (v.IsEditable && v.UploadedBy == userId.Value),
                null
            )).ToList();

        var approvalDtos = doc.Approvals
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new DocumentApprovalDto(
                a.Id,
                a.DocumentId,
                a.VersionId,
                doc.Versions.FirstOrDefault(v => v.Id == a.VersionId)?.VersionNumber ?? 1,
                a.RequestedBy,
                a.Requester.FullName,
                a.ReviewedBy,
                a.Reviewer?.FullName,
                a.Status,
                a.Reason,
                a.CreatedAt,
                a.ReviewedAt
            )).ToList();

        var correctionDtos = doc.Corrections
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new DocumentCorrectionDto(
                c.Id,
                c.DocumentId,
                c.OriginalVersionId,
                doc.Versions.FirstOrDefault(v => v.Id == c.OriginalVersionId)?.VersionNumber ?? 1,
                c.RequestedBy,
                c.Requester.FullName,
                c.RequestedTo,
                c.Assignee?.FullName,
                c.Reason,
                c.Status,
                c.CreatedAt,
                c.ResolvedAt
            )).ToList();

        return Ok(ApiResponse<DocumentDetailDto>.SuccessResult(new DocumentDetailDto(
            docDto,
            versionDtos,
            approvalDtos,
            correctionDtos
        )));
    }

    // ==========================================
    // 4. Create Document Metadata
    // ==========================================

    [HttpPost]
    public async Task<ActionResult<ApiResponse<DocumentDto>>> CreateDocument([FromBody] CreateDocumentRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, request.ProjectId);
        if (!canAccess) return Forbid();

        var docType = await _context.DocumentTypes.FindAsync(request.DocumentTypeId);
        if (docType == null) return BadRequest(ApiResponse<DocumentDto>.ErrorResult("Ù†ÙˆØ¹ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ØºÙŠØ± ØµØ§Ù„Ø­"));

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return BadRequest(ApiResponse<DocumentDto>.ErrorResult("Ø§Ù„Ù…Ø´Ø±ÙˆØ¹ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var count = await _context.Documents.CountAsync(d => d.ProjectId == request.ProjectId);
        var docNumber = $"DOC-{project.Code}-{docType.Code}-{count + 1:D3}";

        var document = new Document
        {
            DocumentNumber = docNumber,
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            DocumentTypeId = request.DocumentTypeId,
            Category = request.Category,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            OwnerUserId = userId.Value,
            UploadedBy = userId.Value,
            Status = DocumentStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            EditableUntil = DateTime.UtcNow.AddHours(24) // DOC-08: 24-hour modification window
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateDocument", "Document", document.Id.ToString(), null, new
        {
            document.DocumentNumber,
            document.Title,
            document.ProjectId,
            Category = document.Category.ToString()
        });

        return CreatedAtAction(nameof(GetDocumentById), new { id = document.Id },
            ApiResponse<DocumentDto>.SuccessResult(new DocumentDto(
                document.Id,
                document.DocumentNumber,
                document.ProjectId,
                project.Name,
                document.SiteId,
                null,
                document.DocumentTypeId,
                docType.Code,
                docType.NameAr,
                docType.NameEn,
                document.Title,
                document.Description,
                document.OwnerUserId,
                _currentUserService.Email ?? "User",
                document.UploadedBy,
                _currentUserService.Email ?? "User",
                document.Status,
                null,
                0,
                null,
                null,
                null,
                false,
                true,
                null,
                null,
                null,
                document.CreatedAt,
                null,
                0,
                document.Category
            ), "تم إنشاء المستند بنجاح"));
    }

    // ==========================================
    // 5. Upload New Version (Strict B2 Path, 24h window, SHA256)
    // ==========================================

    [HttpPost("{id:guid}/versions")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<DocumentVersionDto>>> UploadVersion(
        Guid id,
        [FromForm] DocumentVersionUploadRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var file = request.File;
        var changeReason = request.ChangeReason;

        var document = await _context.Documents
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return NotFound(ApiResponse<DocumentVersionDto>.ErrorResult("Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, document.ProjectId);
        if (!canAccess) return Forbid();

        // CorrectionRequested: original uploader may upload a new version without DocumentsApprove
        var isUploaderCorrecting =
            document.Status == DocumentStatus.CorrectionRequested &&
            document.UploadedBy == userId.Value;

        // Permanently locked / Approved requires DocumentsApprove (admin correcting)
        var isAdminCorrecting =
            !isUploaderCorrecting &&
            (document.Status == DocumentStatus.Approved || document.IsLocked);

        if (isAdminCorrecting && !HasPermission(Permissions.DocumentsApprove))
        {
            return BadRequest(ApiResponse<DocumentVersionDto>.ErrorResult("Ø§Ù„Ù…Ø³ØªÙ†Ø¯ Ù…Ø¹ØªÙ…Ø¯ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ ÙˆØºÙŠØ± Ù‚Ø§Ø¨Ù„ Ù„Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±. ÙŠØ±Ø¬Ù‰ Ø·Ù„Ø¨ ØªØµØ­ÙŠØ­."));
        }

        // Required reason still for admin correcting Approved/locked; optional for uploader on CorrectionRequested
        if (isAdminCorrecting && HasPermission(Permissions.DocumentsApprove) && string.IsNullOrWhiteSpace(changeReason))
        {
            return BadRequest(ApiResponse<DocumentVersionDto>.ErrorResult("Change reason is required when uploading a correction to an approved or locked document."));
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<DocumentVersionDto>.ErrorResult("Ø§Ù„Ù…Ù„Ù Ø§Ù„Ù…Ø±ÙÙˆØ¹ ÙØ§Ø±Øº"));
        }

        var nextVersionNumber = (document.Versions.Any() ? document.Versions.Max(v => v.VersionNumber) : 0) + 1;
        var versionId = Guid.NewGuid();

        // Object Path according to STORAGE-01:
        // projects/{projectId}/documents/{documentId}/versions/{versionId}/{safeFileName}
        var objectKey = _mediaStorageService.BuildDocumentObjectKey(document.ProjectId, document.Id, versionId, file.FileName);

        // Upload stream to Backblaze B2 and calculate SHA256 checksum
        using var stream = file.OpenReadStream();
        var (uploadedKey, checksum, fileSize) = await _mediaStorageService.UploadStreamAsync(
            stream,
            objectKey,
            file.ContentType);

        // Create MediaFile metadata
        var mediaFile = new MediaFile
        {
            Id = Guid.NewGuid(),
            EntityType = "Document",
            EntityId = document.Id,
            OwnerUserId = userId.Value,
            StorageProvider = "BackblazeB2",
            BucketName = "MTICompany",
            ObjectKey = uploadedKey,
            OriginalFileName = Path.GetFileName(file.FileName),
            StoredFileName = Path.GetFileName(uploadedKey),
            ContentType = file.ContentType,
            MediaType = MediaType.Document,
            FileSize = fileSize,
            Checksum = checksum,
            Status = "Uploaded",
            UploadedAt = DateTime.UtcNow
        };

        _context.MediaFiles.Add(mediaFile);

        // 24 Hour Edit Window:
        var editUntil = DateTime.UtcNow.AddHours(24);

        var version = new DocumentVersion
        {
            Id = versionId,
            DocumentId = document.Id,
            VersionNumber = nextVersionNumber,
            FileId = mediaFile.Id,
            UploadedBy = userId.Value,
            UploadedAt = DateTime.UtcNow,
            EditableUntil = editUntil,
            EditUntil = editUntil,
            Status = DocumentVersionStatus.PendingReview,
            ChangeReason = changeReason?.Trim(),
            CorrectionReason = (isAdminCorrecting || isUploaderCorrecting) ? changeReason?.Trim() : null,
            CreatedAt = DateTime.UtcNow
        };

        _context.DocumentVersions.Add(version);

        // Mark previous versions as superseded
        foreach (var prev in document.Versions.Where(v => v.Status == DocumentVersionStatus.Active || v.Status == DocumentVersionStatus.PendingReview || v.Status == DocumentVersionStatus.Draft))
        {
            if (prev.Id != versionId)
                prev.Status = DocumentVersionStatus.Superseded;
        }

        // Update Document status and current version
        document.CurrentVersionId = version.Id;
        document.EditableUntil = editUntil;
        document.Status = DocumentStatus.Submitted;
        document.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UploadDocumentVersion", "DocumentVersion", version.Id.ToString(), null, new
        {
            DocumentId = document.Id,
            VersionNumber = version.VersionNumber,
            FileName = mediaFile.OriginalFileName,
            Checksum = checksum,
            EditUntil = editUntil
        });

        // NOTIFY-02: notify approvers/admins
        var approverIds = await _context.UserRoles
            .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" || ur.Role.Name == "ProjectManager")
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync();

        await _notificationService.NotifyDocumentUploadedAsync(
            document.Id, document.Title, approverIds.Where(id => id != userId.Value));

        await _notificationService.BroadcastToProjectAsync(document.ProjectId, "DocumentVersionUploaded", new
        {
            DocumentId = document.Id,
            DocumentNumber = document.DocumentNumber,
            VersionNumber = version.VersionNumber,
            UploadedBy = _currentUserService.Email
        });

        return Ok(ApiResponse<DocumentVersionDto>.SuccessResult(new DocumentVersionDto(
            version.Id,
            version.DocumentId,
            version.VersionNumber,
            version.FileId,
            mediaFile.OriginalFileName,
            mediaFile.ContentType,
            mediaFile.FileSize,
            checksum,
            version.UploadedBy,
            _currentUserService.Email ?? "User",
            version.UploadedAt,
            version.EditUntil,
            version.Status,
            version.ChangeReason,
            true,
            null
        ), "ØªÙ… Ø±ÙØ¹ Ø§Ù„Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ø¬Ø¯ÙŠØ¯ Ø¨Ù†Ø¬Ø§Ø­ Ù…Ø¹ ØªÙØ¹ÙŠÙ„ Ù†Ø§ÙØ°Ø© Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ù„Ù…Ø¯Ø© 24 Ø³Ø§Ø¹Ø©"));
    }

    // ==========================================
    // 6. Authorized Private Download URL
    // ==========================================

    [HttpGet("{id:guid}/download")]
    public async Task<ActionResult<ApiResponse<object>>> GetLatestDownloadUrl(Guid id, [FromQuery] Guid? versionId = null)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var document = await _context.Documents
            .Include(d => d.Versions)
                .ThenInclude(v => v.File)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return NotFound(ApiResponse<object>.ErrorResult("المستند غير موجود"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, document.ProjectId);
        if (!canAccess) return Forbid();

        var version = versionId.HasValue
            ? document.Versions.FirstOrDefault(v => v.Id == versionId.Value)
            : (document.CurrentVersionId.HasValue
                ? document.Versions.FirstOrDefault(v => v.Id == document.CurrentVersionId.Value)
                : document.Versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault());

        if (version == null || version.File == null)
            return NotFound(ApiResponse<object>.ErrorResult("لا توجد ملفات مرفوعة لهذا المستند"));

        var downloadUrl = await _mediaStorageService.GeneratePreSignedDownloadUrlAsync(
            version.File.ObjectKey,
            TimeSpan.FromMinutes(15));

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            downloadUrl,
            fileName = version.File.OriginalFileName,
            fileSize = version.File.FileSize,
            contentType = version.File.ContentType,
            checksum = version.File.Checksum,
            expiresInSeconds = 900
        }));
    }

    [HttpGet("{id:guid}/versions/{versionId:guid}/download")]
    public async Task<ActionResult<ApiResponse<object>>> GetDownloadUrl(Guid id, Guid versionId)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var version = await _context.DocumentVersions
            .Include(v => v.Document)
            .Include(v => v.File)
            .FirstOrDefaultAsync(v => v.DocumentId == id && v.Id == versionId);

        if (version == null) return NotFound(ApiResponse<object>.ErrorResult("Ø¥ØµØ¯Ø§Ø± Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, version.Document.ProjectId);
        if (!canAccess) return Forbid();

        // Generate temporary private download URL (15 minutes validity)
        var downloadUrl = await _mediaStorageService.GeneratePreSignedDownloadUrlAsync(
            version.File.ObjectKey,
            TimeSpan.FromMinutes(15));

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            downloadUrl,
            fileName = version.File.OriginalFileName,
            fileSize = version.File.FileSize,
            contentType = version.File.ContentType,
            checksum = version.File.Checksum,
            expiresInSeconds = 900
        }));
    }

    // ==========================================
    // 7. Review & Approval (Immutability Enforced)
    // ==========================================

    [HttpPost("{id:guid}/review")]
    public async Task<ActionResult<ApiResponse<object>>> ReviewDocument(Guid id, [FromBody] ReviewDocumentRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        if (!HasPermission(Permissions.DocumentsApprove))
        {
            return Forbid();
        }

        var document = await _context.Documents
            .Include(d => d.CurrentVersion)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return NotFound(ApiResponse<object>.ErrorResult("Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var approval = new DocumentApproval
        {
            DocumentId = document.Id,
            VersionId = document.CurrentVersionId ?? Guid.Empty,
            RequestedBy = document.UploadedBy,
            ReviewedBy = userId.Value,
            Status = request.Status,
            Reason = request.Reason?.Trim(),
            CreatedAt = DateTime.UtcNow,
            ReviewedAt = DateTime.UtcNow
        };

        _context.DocumentApprovals.Add(approval);

        if (request.Status == DocumentApprovalStatus.Approved)
        {
            document.Status = DocumentStatus.Approved;
            document.ApprovedAt = DateTime.UtcNow;
            document.ApprovedBy = userId.Value;
            document.LockedAt = DateTime.UtcNow; // Permanently locked & immutable

            if (document.CurrentVersion != null)
            {
                document.CurrentVersion.Status = DocumentVersionStatus.Approved;
            }
        }
        else if (request.Status == DocumentApprovalStatus.Rejected)
        {
            document.Status = DocumentStatus.Rejected;
            if (document.CurrentVersion != null)
            {
                document.CurrentVersion.Status = DocumentVersionStatus.Rejected;
            }
        }
        else if (request.Status == DocumentApprovalStatus.CorrectionRequested)
        {
            document.Status = DocumentStatus.CorrectionRequested;
            document.LockedAt = null;
            document.EditableUntil = DateTime.UtcNow.AddHours(24);

            if (document.CurrentVersion != null)
            {
                // Do not leave CurrentVersion as Approved — unlock for re-upload
                if (document.CurrentVersion.Status == DocumentVersionStatus.Approved)
                    document.CurrentVersion.Status = DocumentVersionStatus.PendingReview;

                var correction = new DocumentCorrection
                {
                    DocumentId = document.Id,
                    OriginalVersionId = document.CurrentVersion.Id,
                    RequestedBy = userId.Value,
                    RequestedTo = document.UploadedBy,
                    Reason = request.Reason?.Trim() ?? "ÙŠØ±Ø¬Ù‰ ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø³ØªÙ†Ø¯ ÙˆÙÙ‚ Ø§Ù„Ù…Ù„Ø§Ø­Ø¸Ø§Øª",
                    Status = CorrectionStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                _context.DocumentCorrections.Add(correction);
            }
        }

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("ReviewDocument", "Document", document.Id.ToString(), null, new
        {
            Action = request.Status.ToString(),
            Reason = request.Reason,
            ReviewedBy = userId.Value
        });

        if (request.Status == DocumentApprovalStatus.Approved)
        {
            await _notificationService.NotifyDocumentApprovedAsync(
                document.Id, document.Title, document.UploadedBy);
            await _notificationService.BroadcastToAdminsAsync("AdminStatsUpdated", new { });
        }
        else if (request.Status == DocumentApprovalStatus.Rejected)
        {
            await _notificationService.NotifyDocumentRejectedAsync(
                document.Id, document.Title, document.UploadedBy);
            await _notificationService.BroadcastToAdminsAsync("AdminStatsUpdated", new { });
        }
        else if (request.Status == DocumentApprovalStatus.CorrectionRequested)
        {
            await _notificationService.NotifyCorrectionRequestedAsync(
                document.Id, document.Title, document.UploadedBy);
        }

        return Ok(ApiResponse<object>.SuccessResult(new
        {
            documentId = document.Id,
            status = document.Status.ToString(),
            reviewedAt = DateTime.UtcNow
        }, "ØªÙ… Ø­ÙØ¸ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø© ÙˆØ§Ù„Ù‚Ø±Ø§Ø± Ø¨Ù†Ø¬Ø§Ø­"));
    }

    // ==========================================
    // 8. Delete Version (Strict 24-Hour Edit Window Rule)
    // ==========================================

    [HttpDelete("{id:guid}/versions/{versionId:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteVersion(Guid id, Guid versionId)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var version = await _context.DocumentVersions
            .Include(v => v.Document)
            .Include(v => v.File)
            .FirstOrDefaultAsync(v => v.DocumentId == id && v.Id == versionId);

        if (version == null) return NotFound(ApiResponse<object>.ErrorResult("Ø§Ù„Ø¥ØµØ¯Ø§Ø± ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯"));

        var isOwner = version.UploadedBy == userId.Value;
        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;

        // SECURITY-01: uploader may delete only own version within edit window while not locked
        if (!isAdmin)
        {
            if (!isOwner)
                return Forbid();

            if (version.IsLockedForUploader || version.Document.Status == DocumentStatus.Approved)
                return BadRequest(ApiResponse<object>.ErrorResult("This version is locked and cannot be deleted."));

            if (DateTime.UtcNow > version.EditableUntil)
                return BadRequest(ApiResponse<object>.ErrorResult("Ø§Ù†ØªÙ‡Øª Ù†Ø§ÙØ°Ø© Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø³Ù…ÙˆØ­ Ø¨Ù‡Ø§ (24 Ø³Ø§Ø¹Ø©) Ù„Ù‡Ø°Ø§ Ø§Ù„Ø¥ØµØ¯Ø§Ø±"));

            var editableStatus =
                version.Status == DocumentVersionStatus.Draft ||
                version.Status == DocumentVersionStatus.PendingReview ||
                (version.Status == DocumentVersionStatus.Active &&
                 version.Status != DocumentVersionStatus.Approved &&
                 version.Status != DocumentVersionStatus.Locked &&
                 version.Status != DocumentVersionStatus.Superseded);

            if (!editableStatus)
                return BadRequest(ApiResponse<object>.ErrorResult("Only Draft, PendingReview, or unlocked Active versions can be deleted."));
        }
        else
        {
            // Rule: Cannot delete approved or locked versions (even admin should use correction flow)
            if (version.Status == DocumentVersionStatus.Approved || version.Status == DocumentVersionStatus.Locked)
            {
                return BadRequest(ApiResponse<object>.ErrorResult("Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø­Ø°Ù Ø¥ØµØ¯Ø§Ø± Ù…Ø¹ØªÙ…Ø¯ Ø£Ùˆ Ù…Ù‚ÙÙ„ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹"));
            }
        }

        // Remove from physical storage
        if (!string.IsNullOrEmpty(version.File?.ObjectKey))
        {
            await _mediaStorageService.DeleteFileAsync(version.File.ObjectKey);
        }

        _context.DocumentVersions.Remove(version);

        // If it was current version, point to previous version
        var remainingVersions = await _context.DocumentVersions
            .Where(v => v.DocumentId == id && v.Id != versionId)
            .OrderByDescending(v => v.VersionNumber)
            .ToListAsync();

        var document = version.Document;
        if (remainingVersions.Any())
        {
            document.CurrentVersionId = remainingVersions.First().Id;
        }
        else
        {
            document.CurrentVersionId = null;
            document.Status = DocumentStatus.Draft;
        }

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("DeleteDocumentVersion", "DocumentVersion", versionId.ToString(), new
        {
            DocumentId = id,
            version.VersionNumber
        }, null);

        return Ok(ApiResponse<object>.SuccessResult(null, "تم حذف الإصدار بنجاح ضمن نافذة التعديل"));
    }

    // ==========================================
    // 9. Delete Document (Admin anytime; uploader within 24h if not sealed)
    // ==========================================

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteDocument(Guid id, [FromQuery] string? reason = null)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var document = await _context.Documents
            .Include(d => d.Versions)
                .ThenInclude(v => v.File)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null)
            return NotFound(ApiResponse<object>.ErrorResult("المستند غير موجود"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, document.ProjectId);
        if (!canAccess) return Forbid();

        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        var isSealed = document.LockedAt.HasValue
            || document.Status == DocumentStatus.Approved
            || document.Status == DocumentStatus.Locked;

        if (!isAdmin)
        {
            if (document.UploadedBy != userId.Value)
                return Forbid();

            if (isSealed)
                return BadRequest(ApiResponse<object>.ErrorResult("لا يمكن حذف مستند معتمد أو مقفل."));

            if (document.EditableUntil.HasValue && DateTime.UtcNow > document.EditableUntil.Value)
                return BadRequest(ApiResponse<object>.ErrorResult("انتهت نافذة التعديل المسموح بها (24 ساعة) لهذا المستند."));
        }
        else if (isSealed)
        {
            // Admin may soft-delete sealed docs; keep audit trail of reason
        }

        foreach (var version in document.Versions)
        {
            if (!string.IsNullOrEmpty(version.File?.ObjectKey))
            {
                try
                {
                    await _mediaStorageService.DeleteFileAsync(version.File.ObjectKey);
                }
                catch
                {
                    // Best-effort storage cleanup
                }
            }
        }

        document.IsDeleted = true;
        document.CurrentVersionId = null;
        _context.DocumentVersions.RemoveRange(document.Versions);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("DeleteDocument", "Document", id.ToString(), new
        {
            document.DocumentNumber,
            document.Title,
            Reason = reason,
            ByAdmin = isAdmin
        }, null);

        return Ok(ApiResponse<object>.SuccessResult(null, "تم حذف المستند بنجاح"));
    }

    // ==========================================
    // 10. Update Document Metadata (Title / Description)
    // ==========================================

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<DocumentDto>>> UpdateDocument(
        Guid id,
        [FromBody] UpdateDocumentRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var document = await _context.Documents
            .Include(d => d.Project)
            .Include(d => d.DocumentType)
            .Include(d => d.OwnerUser)
            .Include(d => d.UploaderUser)
            .Include(d => d.CurrentVersion)
                .ThenInclude(v => v!.File)
            .Include(d => d.Versions)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return NotFound(ApiResponse<DocumentDto>.ErrorResult("المستند غير موجود"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, document.ProjectId);
        if (!canAccess) return Forbid();

        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        if (!isAdmin)
        {
            if (document.UploadedBy != userId.Value)
                return Forbid();

            var isSealed = document.LockedAt.HasValue
                || document.Status == DocumentStatus.Approved
                || document.Status == DocumentStatus.Locked
                || document.IsLocked;

            if (isSealed)
                return BadRequest(ApiResponse<DocumentDto>.ErrorResult("لا يمكن تعديل مستند معتمد أو مقفل."));

            // DOC-08: Strictly enforce 24-hour window server-side
            if (document.EditableUntil.HasValue && DateTime.UtcNow > document.EditableUntil.Value)
                return BadRequest(ApiResponse<DocumentDto>.ErrorResult("انتهت نافذة التعديل المسموح بها (24 ساعة) لهذا المستند. أصبح المستند للقراءة فقط."));
        }

        if (!string.IsNullOrWhiteSpace(request.Title))
            document.Title = request.Title.Trim();

        if (request.Description != null)
            document.Description = request.Description.Trim();

        if (request.DocumentTypeId.HasValue)
            document.DocumentTypeId = request.DocumentTypeId.Value;

        document.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UpdateDocument", "Document", id.ToString(), new
        {
            document.Title,
            document.Description
        }, null);

        var dto = new DocumentDto(
            document.Id,
            document.DocumentNumber,
            document.ProjectId,
            document.Project.Name,
            document.SiteId,
            document.Site?.Name,
            document.DocumentTypeId,
            document.DocumentType.Code,
            document.DocumentType.NameAr,
            document.DocumentType.NameEn,
            document.Title,
            document.Description,
            document.OwnerUserId,
            document.OwnerUser.FullName,
            document.UploadedBy,
            document.UploaderUser.FullName,
            document.Status,
            document.CurrentVersionId,
            document.CurrentVersion?.VersionNumber ?? 0,
            document.CurrentVersion?.File?.OriginalFileName,
            document.CurrentVersion?.File?.FileSize,
            document.EditableUntil,
            document.IsLocked,
            true,
            document.ApprovedAt,
            document.ApprovedBy,
            null,
            document.CreatedAt,
            document.UpdatedAt,
            document.Versions.Count,
            document.Category
        );

        return Ok(ApiResponse<DocumentDto>.SuccessResult(dto, "تم تحديث بيانات المستند بنجاح"));
    }

    // ==========================================
    // DOC-08: Replace Incorrect Upload (within 24h window)
    // ==========================================

    [HttpPost("{id:guid}/replace-file")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ApiResponse<DocumentDto>>> ReplaceFile(
        Guid id,
        [FromForm] DocumentVersionUploadRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var document = await _context.Documents
            .Include(d => d.Project)
            .Include(d => d.Site)
            .Include(d => d.DocumentType)
            .Include(d => d.OwnerUser)
            .Include(d => d.UploaderUser)
            .Include(d => d.CurrentVersion)
                .ThenInclude(v => v!.File)
            .Include(d => d.Versions)
                .ThenInclude(v => v.File)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (document == null) return NotFound(ApiResponse<DocumentDto>.ErrorResult("المستند غير موجود"));

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, document.ProjectId);
        if (!canAccess) return Forbid();

        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        var isSealed = document.LockedAt.HasValue
            || document.Status == DocumentStatus.Approved
            || document.Status == DocumentStatus.Locked
            || document.IsLocked;

        if (!isAdmin)
        {
            if (document.UploadedBy != userId.Value)
                return Forbid();

            if (isSealed)
                return BadRequest(ApiResponse<DocumentDto>.ErrorResult("لا يمكن استبدال ملف لمستند معتمد أو مقفل."));

            if (document.EditableUntil.HasValue && DateTime.UtcNow > document.EditableUntil.Value)
                return BadRequest(ApiResponse<DocumentDto>.ErrorResult("انتهت نافذة التعديل المسموح بها (24 ساعة) لهذا المستند. لا يمكن استبدال الملف."));
        }

        var file = request.File;
        if (file == null || file.Length == 0)
        {
            return BadRequest(ApiResponse<DocumentDto>.ErrorResult("الملف المرفوع فارغ"));
        }

        var targetVersion = document.CurrentVersion ?? document.Versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault();
        if (targetVersion == null)
        {
            var nextVersionNumber = 1;
            var newVersionId = Guid.NewGuid();
            var newObjKey = _mediaStorageService.BuildDocumentObjectKey(document.ProjectId, document.Id, newVersionId, file.FileName);
            using var str = file.OpenReadStream();
            var (upKey, csum, fSize) = await _mediaStorageService.UploadStreamAsync(str, newObjKey, file.ContentType);

            var mf = new MediaFile
            {
                Id = Guid.NewGuid(),
                EntityType = "Document",
                EntityId = document.Id,
                OwnerUserId = userId.Value,
                StorageProvider = "BackblazeB2",
                BucketName = "MTICompany",
                ObjectKey = upKey,
                OriginalFileName = Path.GetFileName(file.FileName),
                StoredFileName = Path.GetFileName(upKey),
                ContentType = file.ContentType,
                MediaType = MediaType.Document,
                FileSize = fSize,
                Checksum = csum,
                Status = "Uploaded",
                UploadedAt = DateTime.UtcNow
            };
            _context.MediaFiles.Add(mf);

            targetVersion = new DocumentVersion
            {
                Id = newVersionId,
                DocumentId = document.Id,
                VersionNumber = nextVersionNumber,
                FileId = mf.Id,
                UploadedBy = userId.Value,
                UploadedAt = DateTime.UtcNow,
                EditableUntil = document.EditableUntil ?? DateTime.UtcNow.AddHours(24),
                EditUntil = document.EditableUntil ?? DateTime.UtcNow.AddHours(24),
                Status = DocumentVersionStatus.PendingReview,
                ChangeReason = request.ChangeReason ?? "Initial upload replaced",
                CreatedAt = DateTime.UtcNow
            };
            _context.DocumentVersions.Add(targetVersion);
            document.CurrentVersionId = targetVersion.Id;
        }
        else
        {
            var oldFile = targetVersion.File;
            var newObjKey = _mediaStorageService.BuildDocumentObjectKey(document.ProjectId, document.Id, targetVersion.Id, file.FileName);

            using var str = file.OpenReadStream();
            var (upKey, csum, fSize) = await _mediaStorageService.UploadStreamAsync(str, newObjKey, file.ContentType);

            if (oldFile != null)
            {
                if (!string.IsNullOrEmpty(oldFile.ObjectKey) && oldFile.ObjectKey != upKey)
                {
                    try { await _mediaStorageService.DeleteFileAsync(oldFile.ObjectKey); } catch { }
                }
                oldFile.ObjectKey = upKey;
                oldFile.OriginalFileName = Path.GetFileName(file.FileName);
                oldFile.StoredFileName = Path.GetFileName(upKey);
                oldFile.ContentType = file.ContentType;
                oldFile.FileSize = fSize;
                oldFile.Checksum = csum;
                oldFile.UploadedAt = DateTime.UtcNow;
            }
            else
            {
                var mf = new MediaFile
                {
                    Id = Guid.NewGuid(),
                    EntityType = "Document",
                    EntityId = document.Id,
                    OwnerUserId = userId.Value,
                    StorageProvider = "BackblazeB2",
                    BucketName = "MTICompany",
                    ObjectKey = upKey,
                    OriginalFileName = Path.GetFileName(file.FileName),
                    StoredFileName = Path.GetFileName(upKey),
                    ContentType = file.ContentType,
                    MediaType = MediaType.Document,
                    FileSize = fSize,
                    Checksum = csum,
                    Status = "Uploaded",
                    UploadedAt = DateTime.UtcNow
                };
                _context.MediaFiles.Add(mf);
                targetVersion.FileId = mf.Id;
            }

            if (!string.IsNullOrWhiteSpace(request.ChangeReason))
            {
                targetVersion.ChangeReason = request.ChangeReason.Trim();
            }
            targetVersion.UploadedAt = DateTime.UtcNow;
        }

        document.FileName = Path.GetFileName(file.FileName);
        document.FileSize = file.Length;
        document.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("ReplaceDocumentFile", "Document", document.Id.ToString(), null, new
        {
            DocumentId = document.Id,
            FileName = file.FileName,
            ReplacedBy = userId.Value,
            Reason = request.ChangeReason
        });

        await _notificationService.BroadcastToProjectAsync(document.ProjectId, "DocumentFileReplaced", new
        {
            DocumentId = document.Id,
            DocumentNumber = document.DocumentNumber,
            FileName = file.FileName,
            ReplacedBy = _currentUserService.Email
        });

        return Ok(ApiResponse<DocumentDto>.SuccessResult(new DocumentDto(
            document.Id,
            document.DocumentNumber,
            document.ProjectId,
            document.Project.Name,
            document.SiteId,
            document.Site?.Name,
            document.DocumentTypeId,
            document.DocumentType.Code,
            document.DocumentType.NameAr,
            document.DocumentType.NameEn,
            document.Title,
            document.Description,
            document.OwnerUserId,
            document.OwnerUser.FullName,
            document.UploadedBy,
            document.UploaderUser.FullName,
            document.Status,
            document.CurrentVersionId,
            targetVersion.VersionNumber,
            file.FileName,
            file.Length,
            document.EditableUntil,
            document.IsLocked,
            true,
            document.ApprovedAt,
            document.ApprovedBy,
            document.ApproverUser?.FullName,
            document.CreatedAt,
            document.UpdatedAt,
            document.Versions.Count,
            document.Category
        ), "تم استبدال الملف بنجاح ضمن نافذة التعديل (24 ساعة)"));
    }

    // ==========================================
    // DOC-01: Document Categories Catalog
    // ==========================================

    [HttpGet("categories")]
    public ActionResult<ApiResponse<List<object>>> GetCategories()
    {
        var categories = Enum.GetValues<DocumentCategory>().Select(c => new
        {
            Id = (int)c,
            Code = c.ToString(),
            NameEn = c.ToString(),
            NameAr = GetCategoryArabicName(c)
        }).ToList();

        return Ok(ApiResponse<List<object>>.SuccessResult(categories.Cast<object>().ToList()));
    }

    // ==========================================
    // DOC-02: Project Document Center
    // ==========================================

    [HttpGet("project/{projectId:guid}/center")]
    public async Task<ActionResult<ApiResponse<ProjectDocumentCenterDto>>> GetProjectDocumentCenter(
        Guid projectId,
        [FromQuery] Guid? siteId = null,
        [FromQuery] DocumentCategory? category = null,
        [FromQuery] string? search = null)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var authorizedProjectIds = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(userId.Value);
        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        if (!isAdmin && !authorizedProjectIds.Contains(projectId)) return Forbid();

        var project = await _context.Projects.FindAsync(projectId);
        if (project == null) return NotFound(ApiResponse<ProjectDocumentCenterDto>.ErrorResult("المشروع غير موجود"));

        var baseQuery = _context.Documents
            .Where(d => d.ProjectId == projectId);

        if (siteId.HasValue)
        {
            baseQuery = baseQuery.Where(d => d.SiteId == siteId.Value);
        }

        var hasAccountingAccess = isAdmin ||
                                  _currentUserService.Permissions.Contains("Accounting.View") ||
                                  _currentUserService.Permissions.Contains("Documents.Accounting.View");
        if (!hasAccountingAccess)
        {
            baseQuery = baseQuery.Where(d => d.Category != DocumentCategory.Accounting);
        }

        var categoryCounts = await baseQuery
            .GroupBy(d => d.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        var allCategories = Enum.GetValues<DocumentCategory>().Select(cat =>
        {
            var match = categoryCounts.FirstOrDefault(c => c.Category == cat);
            return new CategoryCountDto(cat, GetCategoryArabicName(cat), match?.Count ?? 0);
        }).ToList();

        var listQuery = baseQuery
            .Include(d => d.Site)
            .Include(d => d.DocumentType)
            .Include(d => d.OwnerUser)
            .Include(d => d.UploaderUser)
            .Include(d => d.ApproverUser)
            .Include(d => d.CurrentVersion).ThenInclude(v => v!.File)
            .Include(d => d.Versions)
            .AsQueryable();

        if (category.HasValue)
        {
            listQuery = listQuery.Where(d => d.Category == category.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            listQuery = listQuery.Where(d => d.Title.ToLower().Contains(s) ||
                                             d.DocumentNumber.ToLower().Contains(s) ||
                                             (d.Description != null && d.Description.ToLower().Contains(s)));
        }

        var docs = await listQuery.OrderByDescending(d => d.CreatedAt).ToListAsync();
        var dtos = docs.Select(d => new DocumentDto(
            d.Id,
            d.DocumentNumber,
            d.ProjectId,
            project.Name,
            d.SiteId,
            d.Site?.Name,
            d.DocumentTypeId,
            d.DocumentType.Code,
            d.DocumentType.NameAr,
            d.DocumentType.NameEn,
            d.Title,
            d.Description,
            d.OwnerUserId,
            d.OwnerUser.FullName,
            d.UploadedBy,
            d.UploaderUser.FullName,
            d.Status,
            d.CurrentVersionId,
            d.CurrentVersion?.VersionNumber ?? (d.VersionNumber > 0 ? d.VersionNumber : 0),
            d.CurrentVersion?.File?.OriginalFileName ?? d.FileName,
            d.CurrentVersion?.File?.FileSize ?? d.FileSize,
            d.EditableUntil,
            d.IsLocked,
            isAdmin || (d.UploadedBy == userId.Value && !d.IsLocked),
            d.ApprovedAt,
            d.ApprovedBy,
            d.ApproverUser?.FullName,
            d.CreatedAt,
            d.UpdatedAt,
            d.Versions.Count > 0 ? d.Versions.Count : 1,
            d.Category
        )).ToList();

        return Ok(ApiResponse<ProjectDocumentCenterDto>.SuccessResult(new ProjectDocumentCenterDto(
            projectId,
            project.Name,
            allCategories,
            dtos
        )));
    }

    // ==========================================
    // DOC-03: Site Document Center
    // ==========================================

    [HttpGet("site/{siteId:guid}/center")]
    public async Task<ActionResult<ApiResponse<SiteDocumentCenterDto>>> GetSiteDocumentCenter(
        Guid siteId,
        [FromQuery] DocumentCategory? category = null,
        [FromQuery] string? search = null)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var site = await _context.Sites.Include(s => s.Project).FirstOrDefaultAsync(s => s.Id == siteId);
        if (site == null) return NotFound(ApiResponse<SiteDocumentCenterDto>.ErrorResult("الموقع غير موجود"));

        var authorizedProjectIds = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(userId.Value);
        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        if (!isAdmin && !authorizedProjectIds.Contains(site.ProjectId)) return Forbid();

        var baseQuery = _context.Documents.Where(d => d.SiteId == siteId);

        var hasAccountingAccess = isAdmin ||
                                  _currentUserService.Permissions.Contains("Accounting.View") ||
                                  _currentUserService.Permissions.Contains("Documents.Accounting.View");
        if (!hasAccountingAccess)
        {
            baseQuery = baseQuery.Where(d => d.Category != DocumentCategory.Accounting);
        }

        var categoryCounts = await baseQuery
            .GroupBy(d => d.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync();

        var allCategories = Enum.GetValues<DocumentCategory>().Select(cat =>
        {
            var match = categoryCounts.FirstOrDefault(c => c.Category == cat);
            return new CategoryCountDto(cat, GetCategoryArabicName(cat), match?.Count ?? 0);
        }).ToList();

        var listQuery = baseQuery
            .Include(d => d.DocumentType)
            .Include(d => d.OwnerUser)
            .Include(d => d.UploaderUser)
            .Include(d => d.ApproverUser)
            .Include(d => d.CurrentVersion).ThenInclude(v => v!.File)
            .Include(d => d.Versions)
            .AsQueryable();

        if (category.HasValue)
        {
            listQuery = listQuery.Where(d => d.Category == category.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            listQuery = listQuery.Where(d => d.Title.ToLower().Contains(s) ||
                                             d.DocumentNumber.ToLower().Contains(s) ||
                                             (d.Description != null && d.Description.ToLower().Contains(s)));
        }

        var docs = await listQuery.OrderByDescending(d => d.CreatedAt).ToListAsync();
        var dtos = docs.Select(d => new DocumentDto(
            d.Id,
            d.DocumentNumber,
            d.ProjectId,
            site.Project.Name,
            d.SiteId,
            site.Name,
            d.DocumentTypeId,
            d.DocumentType.Code,
            d.DocumentType.NameAr,
            d.DocumentType.NameEn,
            d.Title,
            d.Description,
            d.OwnerUserId,
            d.OwnerUser.FullName,
            d.UploadedBy,
            d.UploaderUser.FullName,
            d.Status,
            d.CurrentVersionId,
            d.CurrentVersion?.VersionNumber ?? (d.VersionNumber > 0 ? d.VersionNumber : 0),
            d.CurrentVersion?.File?.OriginalFileName ?? d.FileName,
            d.CurrentVersion?.File?.FileSize ?? d.FileSize,
            d.EditableUntil,
            d.IsLocked,
            isAdmin || (d.UploadedBy == userId.Value && !d.IsLocked),
            d.ApprovedAt,
            d.ApprovedBy,
            d.ApproverUser?.FullName,
            d.CreatedAt,
            d.UpdatedAt,
            d.Versions.Count > 0 ? d.Versions.Count : 1,
            d.Category
        )).ToList();

        return Ok(ApiResponse<SiteDocumentCenterDto>.SuccessResult(new SiteDocumentCenterDto(
            siteId,
            site.Name,
            site.ProjectId,
            site.Project.Name,
            allCategories,
            dtos
        )));
    }

    // ==========================================
    // Unified Direct Upload
    // ==========================================

    [HttpPost("unified-upload")]
    public async Task<ActionResult<ApiResponse<DocumentDto>>> UnifiedUpload(
        [FromBody] UnifiedUploadDocumentRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, request.ProjectId);
        if (!canAccess && !_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin) return Forbid();

        var docType = await _context.DocumentTypes.FindAsync(request.DocumentTypeId);
        if (docType == null) return BadRequest(ApiResponse<DocumentDto>.ErrorResult("نوع المستند غير صالح"));

        var project = await _context.Projects.FindAsync(request.ProjectId);
        if (project == null) return BadRequest(ApiResponse<DocumentDto>.ErrorResult("المشروع غير موجود"));

        var count = await _context.Documents.CountAsync(d => d.ProjectId == request.ProjectId);
        var docNumber = $"DOC-{project.Code}-{docType.Code}-{count + 1:D3}";

        var document = new Document
        {
            DocumentNumber = docNumber,
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            DocumentTypeId = request.DocumentTypeId,
            Category = request.Category,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            FileName = request.FileName.Trim(),
            FileExtension = request.FileExtension ?? Path.GetExtension(request.FileName),
            MimeType = request.MimeType ?? "application/octet-stream",
            FileSize = request.FileSize,
            StorageKey = request.StorageKey,
            VersionNumber = 1,
            OwnerUserId = userId.Value,
            UploadedBy = userId.Value,
            Status = DocumentStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            EditableUntil = DateTime.UtcNow.AddHours(24) // DOC-08: 24-hour edit window
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UnifiedUploadDocument", "Document", document.Id.ToString(), null, new
        {
            document.DocumentNumber,
            document.Title,
            Category = document.Category.ToString(),
            document.StorageKey
        });

        return CreatedAtAction(nameof(GetDocumentById), new { id = document.Id },
            ApiResponse<DocumentDto>.SuccessResult(new DocumentDto(
                document.Id,
                document.DocumentNumber,
                document.ProjectId,
                project.Name,
                document.SiteId,
                null,
                document.DocumentTypeId,
                docType.Code,
                docType.NameAr,
                docType.NameEn,
                document.Title,
                document.Description,
                document.OwnerUserId,
                _currentUserService.Email ?? "User",
                document.UploadedBy,
                _currentUserService.Email ?? "User",
                document.Status,
                null,
                1,
                document.FileName,
                document.FileSize,
                null,
                false,
                true,
                null,
                null,
                null,
                document.CreatedAt,
                null,
                1,
                document.Category
            ), "تم حفظ المستند بنجاح"));
    }

    private static string GetCategoryArabicName(DocumentCategory cat) => cat switch
    {
        DocumentCategory.TechnicalOffice => "المكتب الفني",
        DocumentCategory.Accounting => "الحسابات والمالية",
        DocumentCategory.Drawings => "المخططات الهندسية",
        DocumentCategory.DailyReports => "التقارير اليومية",
        DocumentCategory.SiteDocuments => "مستندات الموقع",
        DocumentCategory.DataSheets => "لوائح البيانات الفنية",
        DocumentCategory.Software => "البرمجيات والأنظمة",
        DocumentCategory.Installation => "أعمال التركيب",
        DocumentCategory.Maintenance => "أعمال الصيانة",
        DocumentCategory.Contracts => "العقود والاتفاقيات",
        DocumentCategory.Procurement => "المشتريات والتوريدات",
        _ => "أخرى"
    };
}

public class UpdateDocumentRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public Guid? DocumentTypeId { get; set; }
}

public class DocumentVersionUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string? ChangeReason { get; set; }
}

