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
[Route("api/admin/permissions")]
[Authorize(Roles = "SuperAdmin,SystemAdmin,Admin")]
public class PermissionsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IResourceScopeEngine _scopeEngine;
    private readonly IAuditService _auditService;

    public PermissionsController(
        AppDbContext context,
        IResourceScopeEngine scopeEngine,
        IAuditService auditService)
    {
        _context = context;
        _scopeEngine = scopeEngine;
        _auditService = auditService;
    }

    /// <summary>
    /// SECURITY-03: Get all permissions grouped by module with active status.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<ModulePermissionsDto>>>> GetPermissions(
        [FromQuery] bool activeOnly = false,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Permissions.AsNoTracking().AsQueryable();
        if (activeOnly)
            query = query.Where(p => p.IsActive);

        var permissions = await query
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .Select(p => new PermissionDto(p.Id, p.Code, p.Name, p.Module, p.Description, p.IsActive))
            .ToListAsync(cancellationToken);

        var grouped = permissions
            .GroupBy(p => p.Module)
            .Select(g => new ModulePermissionsDto(g.Key, g.ToList()))
            .OrderBy(g => g.Module)
            .ToList();

        return Ok(ApiResponse<List<ModulePermissionsDto>>.Ok(grouped));
    }

    /// <summary>
    /// SECURITY-03: Get all system roles with their assigned permission codes.
    /// </summary>
    [HttpGet("roles")]
    public async Task<ActionResult<ApiResponse<List<RolePermissionsDto>>>> GetRolePermissions(
        CancellationToken cancellationToken = default)
    {
        var roles = await _context.Roles
            .AsNoTracking()
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.Name)
            .Select(r => new RolePermissionsDto(
                r.Id,
                r.Name,
                r.Description,
                r.RolePermissions.Where(rp => rp.Permission.IsActive).Select(rp => rp.Permission.Code).ToList()
            ))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<RolePermissionsDto>>.Ok(roles));
    }

    /// <summary>
    /// SECURITY-03: Get permissions assigned to a specific role.
    /// </summary>
    [HttpGet("roles/{roleId}")]
    public async Task<ActionResult<ApiResponse<RolePermissionsDto>>> GetRolePermissionsById(
        Guid roleId,
        CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles
            .AsNoTracking()
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
            return NotFound(ApiResponse<RolePermissionsDto>.Fail("Role not found"));

        var result = new RolePermissionsDto(
            role.Id,
            role.Name,
            role.Description,
            role.RolePermissions.Where(rp => rp.Permission.IsActive).Select(rp => rp.Permission.Code).ToList()
        );

        return Ok(ApiResponse<RolePermissionsDto>.Ok(result));
    }

    /// <summary>
    /// SECURITY-03: Update permissions assigned to a role.
    /// </summary>
    [HttpPost("roles/{roleId}")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateRolePermissions(
        Guid roleId,
        [FromBody] UpdateRolePermissionsRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = await _context.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken);

        if (role == null)
            return NotFound(ApiResponse<bool>.Fail("Role not found"));

        // Load targeted permissions
        var targetPermissions = await _context.Permissions
            .Where(p => request.PermissionCodes.Contains(p.Code) && p.IsActive)
            .ToListAsync(cancellationToken);

        // Remove existing
        _context.RolePermissions.RemoveRange(role.RolePermissions);

        // Add new
        foreach (var p in targetPermissions)
        {
            role.RolePermissions.Add(new RolePermission
            {
                RoleId = role.Id,
                PermissionId = p.Id
            });
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "PermissionChange",
            entityType: "Role",
            entityId: role.Id.ToString(),
            newValues: new { TargetPermissions = targetPermissions.Count, RoleName = role.Name },
            cancellationToken: cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(true, "Role permissions updated successfully"));
    }

    /// <summary>
    /// SECURITY-03: Toggle permission active status.
    /// </summary>
    [HttpPatch("{id}/toggle-status")]
    public async Task<ActionResult<ApiResponse<bool>>> TogglePermissionStatus(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var permission = await _context.Permissions.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (permission == null)
            return NotFound(ApiResponse<bool>.Fail("Permission not found"));

        permission.IsActive = !permission.IsActive;
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            action: "Update",
            entityType: "Permission",
            entityId: permission.Id.ToString(),
            newValues: new { PermissionCode = permission.Code, IsActive = permission.IsActive },
            cancellationToken: cancellationToken
        );

        return Ok(ApiResponse<bool>.Ok(permission.IsActive, $"Permission is now {(permission.IsActive ? "Active" : "Inactive")}"));
    }

    /// <summary>
    /// SECURITY-04: Evaluate permission against resource scope engine.
    /// </summary>
    [HttpGet("evaluate-scope")]
    public async Task<ActionResult<ApiResponse<EvaluateScopeResponseDto>>> EvaluateScope(
        [FromQuery] Guid userId,
        [FromQuery] string permissionCode,
        [FromQuery] ResourceHierarchyType resourceType,
        [FromQuery] Guid resourceId,
        CancellationToken cancellationToken = default)
    {
        var hasAccess = await _scopeEngine.CanAccessResourceAsync(userId, permissionCode, resourceType, resourceId, cancellationToken);
        var context = await _scopeEngine.ResolveUserScopeContextAsync(userId, cancellationToken);

        var result = new EvaluateScopeResponseDto(
            userId,
            permissionCode,
            resourceId,
            hasAccess,
            context
        );

        return Ok(ApiResponse<EvaluateScopeResponseDto>.Ok(result));
    }
}
