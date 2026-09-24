using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/datasheets")]
[Authorize]
public class DataSheetsController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IMediaStorageService _mediaStorageService;
    private readonly IAuditService _auditService;

    public DataSheetsController(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService,
        IMediaStorageService mediaStorageService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
        _mediaStorageService = mediaStorageService;
        _auditService = auditService;
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

    private static readonly List<string> StandardCategories = new()
    {
        "CCTV Camera",
        "Access Control Controller",
        "Network Switch",
        "Server",
        "UPS",
        "Card Reader / Biometric",
        "Barrier / Turnstile",
        "Fire Alarm Detector",
        "Public Address Speaker",
        "Software Component",
        "Cable & Infrastructure",
        "Other Equipment"
    };

    [HttpGet("categories")]
    public ActionResult<ApiResponse<List<string>>> GetCategories()
    {
        return Ok(ApiResponse<List<string>>.SuccessResult(StandardCategories));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ProductDataSheetDto>>>> GetDataSheets(
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? siteId,
        [FromQuery] string? category,
        [FromQuery] string? search,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var authorizedProjectIds = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(userId.Value);

        var query = _context.ProductDataSheets
            .Include(d => d.Project)
            .Include(d => d.Site)
            .Include(d => d.Document)
            .Include(d => d.UploaderUser)
            .Include(d => d.Asset)
            .Include(d => d.Material)
            .Where(d => !d.IsDeleted);

        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        if (!isAdmin)
        {
            query = query.Where(d => !d.ProjectId.HasValue || authorizedProjectIds.Contains(d.ProjectId.Value));
        }

        if (projectId.HasValue)
        {
            if (!isAdmin && !authorizedProjectIds.Contains(projectId.Value)) return Forbid();
            query = query.Where(d => d.ProjectId == projectId.Value);
        }

        if (siteId.HasValue)
        {
            query = query.Where(d => d.SiteId == siteId.Value);
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(d => d.Category.ToLower() == category.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d => d.Product.ToLower().Contains(s) ||
                                     d.Manufacturer.ToLower().Contains(s) ||
                                     d.Model.ToLower().Contains(s) ||
                                     (d.PartNumber != null && d.PartNumber.ToLower().Contains(s)) ||
                                     d.Category.ToLower().Contains(s));
        }

        var list = await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        var dtos = new List<ProductDataSheetDto>();
        foreach (var d in list)
        {
            var downloadUrl = await ResolveDownloadUrlAsync(d.StorageKey, cancellationToken);

            dtos.Add(new ProductDataSheetDto(
                d.Id,
                d.DocumentId,
                d.ProjectId,
                d.Project?.Name,
                d.SiteId,
                d.Site?.Name,
                d.AssetId,
                d.Asset?.Name,
                d.MaterialId,
                d.Material?.Name,
                d.Product,
                d.Manufacturer,
                d.Model,
                d.PartNumber,
                d.Category,
                d.Version,
                d.StorageKey,
                d.FileName,
                d.FileSizeBytes,
                d.UploadedBy,
                d.UploaderUser?.FullName ?? "Unknown",
                d.UploadedAt,
                downloadUrl
            ));
        }

        return Ok(ApiResponse<List<ProductDataSheetDto>>.SuccessResult(dtos));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<ProductDataSheetDto>>> GetById(Guid id, CancellationToken cancellationToken = default)
    {
        var d = await _context.ProductDataSheets
            .Include(x => x.Project)
            .Include(x => x.Site)
            .Include(x => x.Document)
            .Include(x => x.UploaderUser)
            .Include(x => x.Asset)
            .Include(x => x.Material)
            .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);

        if (d == null) return NotFound(ApiResponse<ProductDataSheetDto>.ErrorResult("Product data sheet not found."));

        var downloadUrl = await ResolveDownloadUrlAsync(d.StorageKey, cancellationToken);

        var dto = new ProductDataSheetDto(
            d.Id,
            d.DocumentId,
            d.ProjectId,
            d.Project?.Name,
            d.SiteId,
            d.Site?.Name,
            d.AssetId,
            d.Asset?.Name,
            d.MaterialId,
            d.Material?.Name,
            d.Product,
            d.Manufacturer,
            d.Model,
            d.PartNumber,
            d.Category,
            d.Version,
            d.StorageKey,
            d.FileName,
            d.FileSizeBytes,
            d.UploadedBy,
            d.UploaderUser?.FullName ?? "Unknown",
            d.UploadedAt,
            downloadUrl
        );

        return Ok(ApiResponse<ProductDataSheetDto>.SuccessResult(dto));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<ProductDataSheetDto>>> Create(
        [FromBody] CreateProductDataSheetRequest request,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        if (request.ProjectId.HasValue)
        {
            var authorizedProjectIds = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(userId.Value);
            var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
            if (!isAdmin && !authorizedProjectIds.Contains(request.ProjectId.Value)) return Forbid();
        }

        var sheet = new ProductDataSheet
        {
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            Product = request.Product.Trim(),
            Manufacturer = request.Manufacturer.Trim(),
            Model = request.Model.Trim(),
            PartNumber = request.PartNumber?.Trim(),
            Category = request.Category.Trim(),
            Version = 1,
            AssetId = request.AssetId,
            MaterialId = request.MaterialId,
            UploadedBy = userId.Value,
            StorageKey = request.StorageKey,
            FileName = request.FileName,
            FileSizeBytes = request.FileSizeBytes
        };

        _context.ProductDataSheets.Add(sheet);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "CreateProductDataSheet",
            "ProductDataSheet",
            sheet.Id.ToString(),
            null,
            new { sheet.Product, sheet.Manufacturer, sheet.Model, sheet.Category, sheet.Version },
            cancellationToken: cancellationToken);

        return await GetById(sheet.Id, cancellationToken);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken cancellationToken = default)
    {
        var sheet = await _context.ProductDataSheets.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        if (sheet == null) return NotFound(ApiResponse<bool>.ErrorResult("Data sheet not found."));

        var userId = _currentUserService.UserId;
        var isAdmin = _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
        if (sheet.UploadedBy != userId && !isAdmin)
        {
            return Forbid();
        }

        sheet.IsDeleted = true;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("DeleteProductDataSheet", "ProductDataSheet", id.ToString(), null, null, cancellationToken: cancellationToken);
        return Ok(ApiResponse<bool>.SuccessResult(true, "Data sheet deleted successfully."));
    }
}
