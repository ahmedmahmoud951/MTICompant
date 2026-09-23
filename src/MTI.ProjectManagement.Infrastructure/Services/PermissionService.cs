using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

/// <summary>
/// SECURITY-02: Checks permissions by resolving UserRoles → RolePermissions → Permission.Code.
/// Results are cached per user for 5 minutes to avoid N+1 queries on every request.
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public PermissionService(AppDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string permissionCode, CancellationToken cancellationToken = default)
    {
        var permissions = await GetUserPermissionsAsync(userId, cancellationToken);
        return permissions.Contains(permissionCode, StringComparer.OrdinalIgnoreCase);
    }

    public async Task<IReadOnlyList<string>> GetUserPermissionsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"perms:{userId}";
        if (_cache.TryGetValue(cacheKey, out IReadOnlyList<string>? cached) && cached != null)
            return cached;

        var permissions = await _context.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToListAsync(cancellationToken);

        var result = (IReadOnlyList<string>)permissions.AsReadOnly();
        _cache.Set(cacheKey, result, CacheDuration);
        return result;
    }

    /// <summary>Call this after role/permission changes to force re-evaluation.</summary>
    public void InvalidateCache(Guid userId)
    {
        _cache.Remove($"perms:{userId}");
    }
}
