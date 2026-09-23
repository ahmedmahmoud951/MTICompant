using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Controllers;

/// <summary>
/// ADMIN-02 and ADMIN-03: Admin Master Data Center.
/// Allows full configuration of business dictionaries without hardcoding.
/// Controlled soft deletion preserves historical integrity.
/// </summary>
[ApiController]
[Route("api/admin/master-data")]
[Authorize]
public class MasterDataController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public MasterDataController(
        AppDbContext context,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    [HttpGet("categories")]
    public async Task<ActionResult<ApiResponse<List<MasterDataCategoryDto>>>> GetCategories()
    {
        var predefinedCategories = new Dictionary<string, string>
        {
            ["TeamRole"] = "أدوار فرق العمل (Team Roles)",
            ["ProjectRole"] = "أدوار المشاريع (Project Roles)",
            ["SiteRole"] = "أدوار المواقع (Site Roles)",
            ["ProjectType"] = "أنواع المشاريع (Project Types)",
            ["SiteType"] = "أنواع المواقع (Site Types)",
            ["TaskType"] = "أنواع المهام (Task Types)",
            ["TaskPriority"] = "أولويات المهام (Task Priorities)",
            ["TaskStatus"] = "حالات المهام (Task Statuses)",
            ["DocumentType"] = "أنواع المستندات (Document Types)",
            ["DocumentCategory"] = "تصنيفات المستندات (Document Categories)",
            ["ApprovalType"] = "أنواع الموافقات (Approval Types)",
            ["AssetType"] = "أنواع الأصول والمعدات (Asset Types)",
            ["MaterialCategory"] = "تصنيفات المواد والتوريدات (Material Categories)",
            ["MaintenanceType"] = "أنواع الصيانة (Maintenance Types)",
            ["IssueType"] = "أنواع المشاكل والملاحظات (Issue Types)",
            ["RiskType"] = "أنواع المخاطر (Risk Types)",
            ["NotificationType"] = "أنواع الإشعارات (Notification Types)",
            ["Language"] = "اللغات المدعومة (Languages)",
            ["DepartmentRole"] = "أدوار الأقسام (Department Roles)"
        };

        var dbCounts = await _context.MasterDataItems
            .GroupBy(m => m.Category)
            .Select(g => new
            {
                Category = g.Key,
                Total = g.Count(),
                Active = g.Count(x => x.IsActive)
            })
            .ToListAsync();

        var dbCountsDict = dbCounts.ToDictionary(x => x.Category, x => x);

        var list = new List<MasterDataCategoryDto>();

        foreach (var kvp in predefinedCategories)
        {
            if (dbCountsDict.TryGetValue(kvp.Key, out var countInfo))
            {
                list.Add(new MasterDataCategoryDto(kvp.Key, kvp.Value, countInfo.Total, countInfo.Active));
            }
            else
            {
                list.Add(new MasterDataCategoryDto(kvp.Key, kvp.Value, 0, 0));
            }
        }

        // Include any custom categories in the database not in predefined list
        foreach (var item in dbCounts.Where(c => !predefinedCategories.ContainsKey(c.Category)))
        {
            list.Add(new MasterDataCategoryDto(item.Category, item.Category, item.Total, item.Active));
        }

        return Ok(ApiResponse<List<MasterDataCategoryDto>>.Ok(list));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<MasterDataItemDto>>>> GetItems(
        [FromQuery] string? category = null,
        [FromQuery] bool? isActive = null)
    {
        IQueryable<MasterDataItem> query = _context.MasterDataItems.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(m => m.Category == category);
        }

        if (isActive.HasValue)
        {
            query = query.Where(m => m.IsActive == isActive.Value);
        }

        var items = await query
            .OrderBy(m => m.Category)
            .ThenBy(m => m.DisplayOrder)
            .ThenBy(m => m.Code)
            .Select(m => new MasterDataItemDto(
                m.Id,
                m.Category,
                m.Code,
                m.NameAr,
                m.NameEn,
                m.Description,
                m.DisplayOrder,
                m.IsSystem,
                m.IsActive,
                m.MetadataJson,
                m.CreatedAt,
                m.UpdatedAt
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<MasterDataItemDto>>.Ok(items));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ApiResponse<MasterDataItemDto>>> GetById(Guid id)
    {
        var item = await _context.MasterDataItems.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<MasterDataItemDto>.Fail("Master data item not found."));

        var dto = new MasterDataItemDto(
            item.Id,
            item.Category,
            item.Code,
            item.NameAr,
            item.NameEn,
            item.Description,
            item.DisplayOrder,
            item.IsSystem,
            item.IsActive,
            item.MetadataJson,
            item.CreatedAt,
            item.UpdatedAt
        );

        return Ok(ApiResponse<MasterDataItemDto>.Ok(dto));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<MasterDataItemDto>>> Create([FromBody] CreateMasterDataItemRequest request)
    {
        if (!IsAdmin()) return Forbid();

        var code = request.Code.Trim();
        var category = request.Category.Trim();

        var exists = await _context.MasterDataItems.AnyAsync(m => m.Category == category && m.Code == code);
        if (exists) return BadRequest(ApiResponse<MasterDataItemDto>.Fail($"An item with code '{code}' already exists in category '{category}'."));

        var item = new MasterDataItem
        {
            Category = category,
            Code = code,
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn.Trim(),
            Description = request.Description?.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsSystem = false,
            IsActive = true,
            MetadataJson = request.MetadataJson,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = _currentUserService.UserId
        };

        _context.MasterDataItems.Add(item);
        await _context.SaveChangesAsync();

        await _auditService.LogAsync("CreateMasterDataItem", "MasterDataItem", item.Id.ToString(), null, new
        {
            item.Category,
            item.Code,
            item.NameAr,
            item.NameEn
        });

        var dto = new MasterDataItemDto(
            item.Id,
            item.Category,
            item.Code,
            item.NameAr,
            item.NameEn,
            item.Description,
            item.DisplayOrder,
            item.IsSystem,
            item.IsActive,
            item.MetadataJson,
            item.CreatedAt,
            item.UpdatedAt
        );

        return Ok(ApiResponse<MasterDataItemDto>.Ok(dto, "Master data item created successfully."));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<MasterDataItemDto>>> Update(Guid id, [FromBody] UpdateMasterDataItemRequest request)
    {
        if (!IsAdmin()) return Forbid();

        var item = await _context.MasterDataItems.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<MasterDataItemDto>.Fail("Master data item not found."));

        var oldValues = new { item.NameAr, item.NameEn, item.Description, item.DisplayOrder, item.IsActive };

        item.NameAr = request.NameAr.Trim();
        item.NameEn = request.NameEn.Trim();
        item.Description = request.Description?.Trim();
        item.DisplayOrder = request.DisplayOrder;
        item.IsActive = request.IsActive;
        item.MetadataJson = request.MetadataJson;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditService.LogAsync("UpdateMasterDataItem", "MasterDataItem", item.Id.ToString(), oldValues, new
        {
            item.NameAr,
            item.NameEn,
            item.DisplayOrder,
            item.IsActive
        });

        var dto = new MasterDataItemDto(
            item.Id,
            item.Category,
            item.Code,
            item.NameAr,
            item.NameEn,
            item.Description,
            item.DisplayOrder,
            item.IsSystem,
            item.IsActive,
            item.MetadataJson,
            item.CreatedAt,
            item.UpdatedAt
        );

        return Ok(ApiResponse<MasterDataItemDto>.Ok(dto, "Master data item updated successfully."));
    }

    /// <summary>
    /// ADMIN-03: Controlled soft deletion / deactivation preserving historical integrity.
    /// Values already referenced in historical records are preserved with IsActive = false.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id)
    {
        if (!IsAdmin()) return Forbid();

        var item = await _context.MasterDataItems.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<bool>.Fail("Master data item not found."));

        if (item.IsSystem)
        {
            // System items cannot be physically deleted; only deactivated
            item.IsActive = false;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await _auditService.LogAsync("DeactivateSystemMasterData", "MasterDataItem", id.ToString(), null, new { item.Category, item.Code });
            return Ok(ApiResponse<bool>.Ok(true, "System item deactivated to preserve system integrity."));
        }

        // Controlled soft deletion
        item.IsActive = false;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("SoftDeleteMasterDataItem", "MasterDataItem", id.ToString(), new { item.Category, item.Code, item.NameEn }, null);

        return Ok(ApiResponse<bool>.Ok(true, "Master data item deactivated (history preserved)."));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ApiResponse<bool>>> ToggleStatus(Guid id)
    {
        if (!IsAdmin()) return Forbid();

        var item = await _context.MasterDataItems.FindAsync(id);
        if (item == null) return NotFound(ApiResponse<bool>.Fail("Master data item not found."));

        item.IsActive = !item.IsActive;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("ToggleMasterDataItemStatus", "MasterDataItem", id.ToString(), null, new { item.Category, item.Code, item.IsActive });

        return Ok(ApiResponse<bool>.Ok(item.IsActive, $"Item is now {(item.IsActive ? "Active" : "Inactive")}."));
    }

    private bool IsAdmin() => _currentUserService.IsAdmin || _currentUserService.IsSystemAdmin;
}
