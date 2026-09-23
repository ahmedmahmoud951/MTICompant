using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Api.Helpers;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Api.Controllers;

/// <summary>
/// ADMIN-01: Administration Control Center.
/// All endpoints require Admin or SuperAdmin role â€” enforced at API level.
/// Frontend hiding a button is not security.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin,SystemAdmin,SuperAdmin")]
public class AdminController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IAuditService _auditService;
    private readonly IPermissionService _permissionService;

    public AdminController(IAppDbContext dbContext, IAuditService auditService, IPermissionService permissionService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
        _permissionService = permissionService;
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // USERS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u => u.Email.ToLower().Contains(term)
                || u.FirstName.ToLower().Contains(term)
                || u.LastName.ToLower().Contains(term));
        }

        if (isActive.HasValue) query = query.Where(u => u.IsActive == isActive.Value);

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(u => u.UserRoles.Any(ur => ur.Role.Name == role));

        var totalCount = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderBy(u => u.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.Email,
                u.FirstName,
                u.LastName,
                u.JobTitle,
                u.IsActive,
                u.LastLoginAt,
                u.CreatedAt,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items = users, totalCount, page, pageSize });
    }

    [HttpGet("users/{id}")]
    public async Task<IActionResult> GetUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id, u.Email, u.FirstName, u.LastName, u.JobTitle, u.PhoneNumber, u.IsActive, u.LastLoginAt, u.CreatedAt,
                Roles = u.UserRoles.Select(ur => new { ur.RoleId, ur.Role.Name }).ToList(),
                Permissions = u.UserRoles.SelectMany(ur => ur.Role.RolePermissions).Select(rp => rp.Permission.Code).Distinct().ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPut("users/{id}/roles")]
    public async Task<IActionResult> UpdateUserRoles(Guid id, [FromBody] UpdateUserRolesDto dto, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var actorId)) return Unauthorized();

        var user = await _dbContext.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken: cancellationToken);

        if (user == null) return NotFound();

        var oldRoles = user.UserRoles.Select(ur => ur.RoleId).ToList();

        // Remove all current roles
        foreach (var ur in user.UserRoles.ToList())
            _dbContext.UserRoles.Remove(ur);

        // Validate and assign new roles
        var validRoles = await _dbContext.Roles
            .Where(r => dto.RoleIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        foreach (var role in validRoles)
        {
            _dbContext.UserRoles.Add(new UserRole { UserId = id, RoleId = role.Id });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("PermissionChange", "User", id.ToString(),
            new { OldRoles = oldRoles },
            new { NewRoles = validRoles.Select(r => r.Name) },
            cancellationToken: cancellationToken);

        return Ok(new { success = true, assignedRoles = validRoles.Select(r => r.Name) });
    }

    [HttpPut("users/{id}/disable")]
    public async Task<IActionResult> DisableUser(Guid id, [FromBody] DisableUserDto dto, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var actorId)) return Unauthorized();
        if (id == actorId) return BadRequest(new { message = "Cannot disable your own account." });

        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken: cancellationToken);
        if (user == null) return NotFound();

        var wasActive = user.IsActive;
        user.IsActive = dto.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(dto.IsActive ? "Enable" : "Disable", "User", id.ToString(),
            new { WasActive = wasActive }, new { IsActive = dto.IsActive },
            cancellationToken: cancellationToken);

        return Ok(new { success = true, isActive = user.IsActive });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ROLES & PERMISSIONS
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpGet("roles")]
    public async Task<IActionResult> GetRoles(CancellationToken cancellationToken)
    {
        var roles = await _dbContext.Roles
            .AsNoTracking()
            .Select(r => new
            {
                r.Id, r.Name, r.Description, r.IsSystemRole,
                Permissions = r.RolePermissions.Select(rp => new { rp.PermissionId, rp.Permission.Code, rp.Permission.Name }).ToList()
            })
            .OrderBy(r => r.Name)
            .ToListAsync(cancellationToken);

        return Ok(roles);
    }

    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions(CancellationToken cancellationToken)
    {
        var permissions = await _dbContext.Permissions
            .AsNoTracking()
            .OrderBy(p => p.Module)
            .ThenBy(p => p.Code)
            .Select(p => new { p.Id, p.Code, p.Name, p.Module, p.Description })
            .ToListAsync(cancellationToken);

        return Ok(permissions);
    }

    [HttpPut("roles/{roleId}/permissions")]
    public async Task<IActionResult> UpdateRolePermissions(Guid roleId, [FromBody] UpdateRolePermissionsDto dto, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var actorId)) return Unauthorized();

        var role = await _dbContext.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken: cancellationToken);

        if (role == null) return NotFound();

        var oldPermIds = role.RolePermissions.Select(rp => rp.PermissionId).ToList();

        foreach (var rp in role.RolePermissions.ToList())
            _dbContext.RolePermissions.Remove(rp);

        var validPerms = await _dbContext.Permissions
            .Where(p => dto.PermissionIds.Contains(p.Id))
            .ToListAsync(cancellationToken);

        foreach (var perm in validPerms)
            _dbContext.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = perm.Id });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync("PermissionChange", "Role", roleId.ToString(),
            new { OldPermissions = oldPermIds },
            new { NewPermissions = validPerms.Select(p => p.Code) },
            cancellationToken: cancellationToken);

        return Ok(new { success = true, role = role.Name, permissions = validPerms.Select(p => p.Code) });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // TEAMS & ORGANIZATION
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpGet("teams")]
    public async Task<IActionResult> GetTeams(CancellationToken cancellationToken)
    {
        var teams = await _dbContext.Teams
            .AsNoTracking()
            .Select(t => new
            {
                t.Id, t.Name, t.Code,
                Department = t.Department.NameEn,
                LeaderName = t.LeaderUser != null ? t.LeaderUser.FirstName + " " + t.LeaderUser.LastName : null,
                MemberCount = t.Members.Count
            })
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

        return Ok(teams);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // PROJECTS (Admin view â€” all projects regardless of membership)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpGet("projects")]
    public async Task<IActionResult> GetAllProjects([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var total = await _dbContext.Projects.CountAsync(cancellationToken);
        var items = await _dbContext.Projects
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new { p.Id, p.Code, p.Name, p.Status, p.ClientName, p.ProgressPercentage, MemberCount = p.Members.Count, p.CreatedAt })
            .ToListAsync(cancellationToken);

        return Ok(new { items, total, page, pageSize });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SITES (Admin view — all sites)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("sites")]
    public async Task<IActionResult> GetAllSites([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var total = await _dbContext.Sites.CountAsync(s => !s.IsDeleted, cancellationToken);
        var items = await _dbContext.Sites
            .AsNoTracking()
            .Where(s => !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                s.Code,
                s.Name,
                s.Status,
                s.ProjectId,
                ProjectName = s.Project.Name,
                s.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items, total, page, pageSize });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DOCUMENTS (Admin approval queue)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpGet("documents/pending")]
    public async Task<IActionResult> GetPendingDocuments([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var total = await _dbContext.Documents.CountAsync(d => d.Status == Domain.Enums.DocumentStatus.Submitted || d.Status == Domain.Enums.DocumentStatus.UnderReview);
        var items = await _dbContext.Documents
            .AsNoTracking()
            .Where(d => d.Status == Domain.Enums.DocumentStatus.Submitted || d.Status == Domain.Enums.DocumentStatus.UnderReview)
            .OrderByDescending(d => d.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new { d.Id, d.DocumentNumber, d.Title, d.Status, ProjectName = d.Project.Name, d.CreatedAt })
            .ToListAsync(cancellationToken);

        return Ok(new { items, total, page, pageSize });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // NOTIFICATIONS (Admin broadcast)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpPost("notifications/broadcast")]
    public async Task<IActionResult> BroadcastNotification([FromBody] AdminBroadcastDto dto, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var actorId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
            return BadRequest(new { message = "Title and body are required." });

        // Persist a notification for each target user
        var now = DateTime.UtcNow;
        foreach (var uid in dto.RecipientUserIds.Distinct())
        {
            _dbContext.Notifications.Add(new Domain.Entities.Notification
            {
                UserId = uid,
                Type = Domain.Enums.NotificationType.SystemNotification,
                Title = dto.Title,
                Body = dto.Body,
                EventKey = null, // Admin broadcasts are not deduplicated
                IsRead = false,
                CreatedAt = now
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await _auditService.LogAsync("AdminBroadcast", "Notification", null,
            null, new { dto.Title, RecipientCount = dto.RecipientUserIds.Count },
            cancellationToken: cancellationToken);

        return Ok(new { success = true, sent = dto.RecipientUserIds.Count });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // AUDIT LOGS (Admin view â€” read-only, immutable â€” AUDIT-01)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] Guid? userId,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        [FromQuery] Guid? projectId,
        [FromQuery] Guid? siteId,
        [FromQuery] DateTime? dateFrom,
        [FromQuery] DateTime? dateTo,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (userId.HasValue) query = query.Where(a => a.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(action)) query = query.Where(a => a.Action == action);
        if (!string.IsNullOrWhiteSpace(entityType)) query = query.Where(a => a.EntityType == entityType);
        if (projectId.HasValue) query = query.Where(a => a.ProjectId == projectId.Value);
        if (siteId.HasValue) query = query.Where(a => a.SiteId == siteId.Value);
        if (dateFrom.HasValue) query = query.Where(a => a.CreatedAt >= dateFrom.Value);
        if (dateTo.HasValue) query = query.Where(a => a.CreatedAt <= dateTo.Value);

        var total = await query.CountAsync(cancellationToken);
        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id, a.Action, a.EntityType, a.EntityId,
                a.ProjectId, a.SiteId,
                UserEmail = a.User != null ? a.User.Email : null,
                UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : null,
                a.OldValues, a.NewValues, a.IpAddress, a.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items = logs, total, page, pageSize });
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // ASSETS (Admin overview)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    [HttpGet("assets")]
    public async Task<IActionResult> GetAssets([FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken cancellationToken = default)
    {
        var total = await _dbContext.CompanyAssets.CountAsync(cancellationToken);
        var items = await _dbContext.CompanyAssets
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                a.Id, a.AssetTag, a.Name, a.Category, a.Status,
                AssignedTo = a.AssignedToUser != null ? a.AssignedToUser.FirstName + " " + a.AssignedToUser.LastName : null,
                a.WarrantyExpiry
            })
            .ToListAsync(cancellationToken);

        return Ok(new { items, total, page, pageSize });
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin DTOs (ADMIN-01)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
public record UpdateUserRolesDto(List<Guid> RoleIds);
public record DisableUserDto(bool IsActive);
public record UpdateRolePermissionsDto(List<Guid> PermissionIds);
public record AdminBroadcastDto(string Title, string Body, List<Guid> RecipientUserIds);

