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
[Route("api/materials-assets")]
[Authorize]
public class MaterialsAndAssetsController : ControllerBase
{
    private readonly IAppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly IAuditService _auditService;
    private readonly INotificationService _notificationService;

    public MaterialsAndAssetsController(
        IAppDbContext context,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService,
        IAuditService auditService,
        INotificationService notificationService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
        _auditService = auditService;
        _notificationService = notificationService;
    }

    private bool HasPermission(string permission)
    {
        return _currentUserService.IsAdmin ||
               _currentUserService.IsSystemAdmin ||
               _currentUserService.Permissions.Contains(permission);
    }

    // ==========================================
    // 1. Materials Catalog
    // ==========================================

    [HttpGet("materials")]
    public async Task<ActionResult<ApiResponse<List<MaterialDto>>>> GetMaterials(
        [FromQuery] string? category = null,
        [FromQuery] string? search = null)
    {
        var query = _context.Materials.AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(m => m.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(m => m.Name.ToLower().Contains(s) || m.Code.ToLower().Contains(s));
        }

        var items = await query
            .OrderBy(m => m.Category)
            .ThenBy(m => m.Name)
            .Select(m => new MaterialDto(
                m.Id,
                m.Code,
                m.Name,
                m.Specification,
                m.Unit,
                m.InStockQuantity,
                m.ReservedQuantity,
                m.AvailableQuantity,
                m.MinimumThreshold,
                m.Category,
                m.CreatedAt,
                m.RequiredQuantity,
                m.OrderedQuantity,
                m.ReceivedQuantity,
                m.InstalledQuantity,
                m.RemainingQuantity > 0 ? m.RemainingQuantity : (m.ReceivedQuantity - m.InstalledQuantity)
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<MaterialDto>>.Ok(items));
    }

    [HttpPost("materials")]
    public async Task<ActionResult<ApiResponse<MaterialDto>>> CreateMaterial([FromBody] CreateMaterialRequest request)
    {
        if (!HasPermission(Permissions.MaterialsApprove) && !HasPermission(Permissions.MaterialsRequest))
        {
            return Forbid();
        }

        var exists = await _context.Materials.AnyAsync(m => m.Code.ToLower() == request.Code.Trim().ToLower());
        if (exists)
        {
            return BadRequest(ApiResponse<MaterialDto>.Fail($"Material code '{request.Code}' already exists."));
        }

        var mat = new Material
        {
            Code = request.Code.Trim().ToUpper(),
            Name = request.Name.Trim(),
            Specification = request.Specification?.Trim() ?? string.Empty,
            Unit = request.Unit.Trim(),
            InStockQuantity = request.InStockQuantity,
            MinimumThreshold = request.MinimumThreshold,
            Category = request.Category.Trim(),
            RequiredQuantity = request.RequiredQuantity,
            OrderedQuantity = request.OrderedQuantity,
            ReceivedQuantity = request.ReceivedQuantity,
            InstalledQuantity = request.InstalledQuantity,
            RemainingQuantity = request.ReceivedQuantity - request.InstalledQuantity
        };

        _context.Materials.Add(mat);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateMaterial", "Material", mat.Id.ToString(), null, mat);

        var dto = new MaterialDto(
            mat.Id,
            mat.Code,
            mat.Name,
            mat.Specification,
            mat.Unit,
            mat.InStockQuantity,
            mat.ReservedQuantity,
            mat.AvailableQuantity,
            mat.MinimumThreshold,
            mat.Category,
            mat.CreatedAt,
            mat.RequiredQuantity,
            mat.OrderedQuantity,
            mat.ReceivedQuantity,
            mat.InstalledQuantity,
            mat.RemainingQuantity
        );

        return Ok(ApiResponse<MaterialDto>.Ok(dto, "Material registered."));
    }

    // ==========================================
    // 2. Site Material Requests
    // ==========================================

    [HttpGet("requests")]
    public async Task<ActionResult<ApiResponse<List<SiteMaterialRequestDto>>>> GetSiteMaterialRequests(
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? siteId = null)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var query = _context.SiteMaterialRequests
            .Include(r => r.Project)
            .Include(r => r.Site)
            .Include(r => r.RequestedByUser)
            .Include(r => r.ApprovedByUser)
            .Include(r => r.Items)
                .ThenInclude(i => i.Material)
            .AsQueryable();

        // Scope by authorization: Engineers only see their sites
        if (!_currentUserService.IsAdmin && !_currentUserService.IsSystemAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(userId.Value);
            query = query.Where(r => authorizedSiteIds.Contains(r.SiteId));
        }

        if (projectId.HasValue) query = query.Where(r => r.ProjectId == projectId.Value);
        if (siteId.HasValue) query = query.Where(r => r.SiteId == siteId.Value);

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new SiteMaterialRequestDto(
                r.Id,
                r.ProjectId,
                r.Project.Name,
                r.SiteId,
                r.Site.Name,
                r.RequestedByUserId,
                r.RequestedByUser.FullName,
                r.RequiredDate,
                r.Status,
                r.ApprovedByUserId,
                r.ApprovedByUser != null ? r.ApprovedByUser.FullName : null,
                r.ApprovedAt,
                r.RejectionReason,
                r.Notes,
                r.CreatedAt,
                r.Items.Select(i => new SiteMaterialRequestItemDto(
                    i.Id,
                    i.MaterialId,
                    i.Material.Code,
                    i.Material.Name,
                    i.Material.Unit,
                    i.QuantityRequested,
                    i.QuantityApproved,
                    i.QuantityDispatched,
                    i.Notes
                )).ToList()
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<SiteMaterialRequestDto>>.Ok(list));
    }

    [HttpPost("requests")]
    public async Task<ActionResult<ApiResponse<bool>>> CreateSiteMaterialRequest([FromBody] CreateSiteMaterialRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var canAccess = await _resourceAuthorizationService.CanAccessSiteAsync(userId.Value, request.SiteId);
        if (!canAccess) return Forbid();

        var req = new SiteMaterialRequest
        {
            ProjectId = request.ProjectId,
            SiteId = request.SiteId,
            RequestedByUserId = userId.Value,
            RequiredDate = request.RequiredDate,
            Status = MaterialRequestStatus.Pending,
            Notes = request.Notes?.Trim()
        };

        foreach (var item in request.Items)
        {
            req.Items.Add(new SiteMaterialRequestItem
            {
                MaterialId = item.MaterialId,
                QuantityRequested = item.QuantityRequested,
                Notes = item.Notes?.Trim()
            });
        }

        _context.SiteMaterialRequests.Add(req);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateMaterialRequest", "SiteMaterialRequest", req.Id.ToString(), null, req);

        return Ok(ApiResponse<bool>.Ok(true, "Material request submitted."));
    }

    [HttpPut("requests/{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateMaterialRequestStatus(Guid id, [FromBody] UpdateMaterialRequestStatusRequest request)
    {
        if (!HasPermission(Permissions.MaterialsApprove)) return Forbid();

        var userId = _currentUserService.UserId;
        var req = await _context.SiteMaterialRequests
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (req == null) return NotFound(ApiResponse<bool>.Fail("Request not found."));

        req.Status = request.Status;
        if (request.Status == MaterialRequestStatus.Approved)
        {
            req.ApprovedByUserId = userId;
            req.ApprovedAt = DateTime.UtcNow;

            if (request.ApprovedQuantities != null)
            {
                foreach (var item in req.Items)
                {
                    if (request.ApprovedQuantities.TryGetValue(item.Id, out var approvedQty))
                    {
                        item.QuantityApproved = approvedQty;
                    }
                    else
                    {
                        item.QuantityApproved = item.QuantityRequested;
                    }
                }
            }
        }
        else if (request.Status == MaterialRequestStatus.Rejected)
        {
            req.RejectionReason = request.RejectionReason;
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("UpdateMaterialRequestStatus", "SiteMaterialRequest", id.ToString(), null, request);

        return Ok(ApiResponse<bool>.Ok(true, "Status updated."));
    }

    // ==========================================
    // 3. Company Assets
    // ==========================================

    [HttpGet("assets")]
    public async Task<ActionResult<ApiResponse<List<CompanyAssetDto>>>> GetAssets(
        [FromQuery] string? category = null,
        [FromQuery] AssetStatus? status = null,
        [FromQuery] AssetType? assetType = null,
        [FromQuery] Guid? projectId = null,
        [FromQuery] Guid? siteId = null)
    {
        var query = _context.CompanyAssets
            .Include(a => a.AssignedToUser)
            .Include(a => a.AssignedToSite)
            .Include(a => a.Project)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(a => a.Category == category);
        if (status.HasValue) query = query.Where(a => a.Status == status.Value);
        if (assetType.HasValue) query = query.Where(a => a.AssetType == assetType.Value);
        if (projectId.HasValue) query = query.Where(a => a.ProjectId == projectId.Value);
        if (siteId.HasValue) query = query.Where(a => a.SiteId == siteId.Value || a.AssignedToSiteId == siteId.Value);

        var list = await query
            .OrderBy(a => a.Category)
            .ThenBy(a => a.Name)
            .Select(a => new CompanyAssetDto(
                a.Id,
                a.AssetTag,
                a.Name,
                a.Model,
                a.SerialNumber,
                a.Category,
                a.AssignedToUserId,
                a.AssignedToUser != null ? a.AssignedToUser.FullName : null,
                a.AssignedToSiteId ?? a.SiteId,
                a.AssignedToSite != null ? a.AssignedToSite.Name : null,
                a.Status,
                a.PurchaseDate,
                a.WarrantyEnd ?? a.WarrantyExpiry,
                a.MaintenanceNotes,
                a.CreatedAt,
                a.AssetCode,
                a.ProjectId,
                a.Project != null ? a.Project.Name : null,
                a.AssetType,
                a.Brand,
                a.IPAddress,
                a.MacAddress,
                a.Location,
                a.InstallationDate,
                a.WarrantyStart,
                a.WarrantyEnd ?? a.WarrantyExpiry
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<CompanyAssetDto>>.Ok(list));
    }

    [HttpPost("assets")]
    public async Task<ActionResult<ApiResponse<CompanyAssetDto>>> CreateAsset([FromBody] CreateCompanyAssetRequest request)
    {
        if (!HasPermission(Permissions.AssetsManage)) return Forbid();

        var assetCode = !string.IsNullOrWhiteSpace(request.AssetCode) ? request.AssetCode.Trim().ToUpper() : request.AssetTag.Trim().ToUpper();
        var exists = await _context.CompanyAssets.AnyAsync(a => a.AssetTag.ToLower() == request.AssetTag.Trim().ToLower() || (a.AssetCode != "" && a.AssetCode.ToLower() == assetCode.ToLower()));
        if (exists)
        {
            return BadRequest(ApiResponse<CompanyAssetDto>.Fail($"Asset tag or code '{request.AssetTag}' already exists."));
        }

        var asset = new CompanyAsset
        {
            AssetTag = request.AssetTag.Trim().ToUpper(),
            AssetCode = assetCode,
            ProjectId = request.ProjectId,
            SiteId = request.AssignedToSiteId,
            AssetType = request.AssetType,
            Brand = request.Brand?.Trim() ?? string.Empty,
            Name = request.Name.Trim(),
            Model = request.Model.Trim(),
            SerialNumber = request.SerialNumber.Trim(),
            IPAddress = request.IPAddress?.Trim(),
            MacAddress = request.MacAddress?.Trim(),
            Location = request.Location?.Trim(),
            Category = request.Category.Trim(),
            AssignedToUserId = request.AssignedToUserId,
            AssignedToSiteId = request.AssignedToSiteId,
            Status = request.Status,
            InstallationDate = request.InstallationDate,
            PurchaseDate = request.PurchaseDate,
            WarrantyStart = request.WarrantyStart ?? request.PurchaseDate,
            WarrantyEnd = request.WarrantyEnd ?? request.WarrantyExpiry,
            WarrantyExpiry = request.WarrantyEnd ?? request.WarrantyExpiry,
            MaintenanceNotes = request.MaintenanceNotes?.Trim()
        };

        _context.CompanyAssets.Add(asset);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync("CreateAsset", "CompanyAsset", asset.Id.ToString(), null, asset);

        var notifyIds = await _context.UserRoles
            .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "Maintenance" || ur.Role.Name == "SuperAdmin")
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync();
        if (notifyIds.Count > 0)
        {
            await _notificationService.NotifyMaintenanceCreatedAsync(asset.Id, asset.Name, notifyIds);
        }
        if (asset.AssignedToUserId.HasValue)
        {
            await _notificationService.NotifyMaintenanceAssignedAsync(asset.Id, asset.Name, asset.AssignedToUserId.Value);
        }

        var dto = new CompanyAssetDto(
            asset.Id,
            asset.AssetTag,
            asset.Name,
            asset.Model,
            asset.SerialNumber,
            asset.Category,
            asset.AssignedToUserId,
            null,
            asset.AssignedToSiteId,
            null,
            asset.Status,
            asset.PurchaseDate,
            asset.WarrantyEnd,
            asset.MaintenanceNotes,
            asset.CreatedAt,
            asset.AssetCode,
            asset.ProjectId,
            null,
            asset.AssetType,
            asset.Brand,
            asset.IPAddress,
            asset.MacAddress,
            asset.Location,
            asset.InstallationDate,
            asset.WarrantyStart,
            asset.WarrantyEnd
        );

        return Ok(ApiResponse<CompanyAssetDto>.Ok(dto, "Asset registered successfully."));
    }

    /// <summary>
    /// Deduplicated Warranty Alerts (Prompt ASSET-01)
    /// Checks 30 days, 15 days, 7 days, and Expired. Deduplicates alerts via WarrantyAlertLog.
    /// </summary>
    [HttpGet("warranty-alerts")]
    public async Task<ActionResult<ApiResponse<List<WarrantyAlertDto>>>> GetWarrantyAlerts()
    {
        var now = DateTime.UtcNow.Date;
        var assets = await _context.CompanyAssets
            .AsNoTracking()
            .Include(a => a.Project)
            .Where(a => a.WarrantyEnd.HasValue || a.WarrantyExpiry.HasValue)
            .ToListAsync();

        var alerts = new List<WarrantyAlertDto>();

        foreach (var asset in assets)
        {
            var warrantyEnd = (asset.WarrantyEnd ?? asset.WarrantyExpiry)!.Value.Date;
            var daysRemaining = (int)(warrantyEnd - now).TotalDays;

            int? threshold = null;
            string? alertLevel = null;

            if (daysRemaining <= 0)
            {
                threshold = 0; // Expired
                alertLevel = "Expired";
            }
            else if (daysRemaining <= 7)
            {
                threshold = 7;
                alertLevel = "7 Days";
            }
            else if (daysRemaining <= 15)
            {
                threshold = 15;
                alertLevel = "15 Days";
            }
            else if (daysRemaining <= 30)
            {
                threshold = 30;
                alertLevel = "30 Days";
            }

            if (threshold.HasValue && alertLevel != null)
            {
                // Check if alert is already logged to prevent duplicates
                var alreadyLogged = await _context.WarrantyAlertLogs
                    .AnyAsync(l => l.CompanyAssetId == asset.Id && l.AlertThresholdDays == threshold.Value);

                if (!alreadyLogged)
                {
                    // Deduplicated logging
                    var alertLog = new WarrantyAlertLog
                    {
                        CompanyAssetId = asset.Id,
                        AlertThresholdDays = threshold.Value,
                        SentAt = DateTime.UtcNow
                    };
                    _context.WarrantyAlertLogs.Add(alertLog);
                    await _context.SaveChangesAsync();
                }

                alerts.Add(new WarrantyAlertDto(
                    asset.Id,
                    asset.AssetCode ?? asset.AssetTag,
                    asset.Name,
                    asset.Model,
                    asset.SerialNumber,
                    asset.AssetType,
                    asset.ProjectId,
                    asset.Project?.Name,
                    warrantyEnd,
                    daysRemaining,
                    alertLevel,
                    alreadyLogged
                ));
            }
        }

        return Ok(ApiResponse<List<WarrantyAlertDto>>.Ok(alerts));
    }
}

