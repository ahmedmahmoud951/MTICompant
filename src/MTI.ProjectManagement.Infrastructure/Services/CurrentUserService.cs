using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public Guid? UserId
    {
        get
        {
            var sub =
                User?.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User?.FindFirstValue("sub")
                ?? User?.FindFirstValue(ClaimTypes.Name);
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email =>
        User?.FindFirstValue(ClaimTypes.Email)
        ?? User?.FindFirstValue("email")
        ?? User?.FindFirstValue(ClaimTypes.Upn);

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool IsAdmin =>
        HasRole(nameof(UserRoleType.Admin)) || HasRole(nameof(UserRoleType.SystemAdmin));

    public bool IsSystemAdmin => HasRole(nameof(UserRoleType.SystemAdmin));

    public bool IsEngineer => HasRole(nameof(UserRoleType.Engineer));

    public IReadOnlyList<string> Roles
    {
        get
        {
            if (User == null) return Array.Empty<string>();

            return User.Claims
                .Where(c =>
                    c.Type == ClaimTypes.Role
                    || c.Type == "role"
                    || c.Type == "roles"
                    || c.Type.EndsWith("/role", StringComparison.OrdinalIgnoreCase)
                    || c.Type.EndsWith("/identity/claims/role", StringComparison.OrdinalIgnoreCase))
                .Select(c => c.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }

    public IReadOnlyList<string> Permissions
    {
        get
        {
            if (User == null) return Array.Empty<string>();

            return User.Claims
                .Where(c =>
                    c.Type == "permission"
                    || c.Type == "permissions"
                    || c.Type.EndsWith("/permission", StringComparison.OrdinalIgnoreCase))
                .Select(c => c.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }

    private bool HasRole(string roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName) || User == null) return false;

        if (User.IsInRole(roleName)) return true;

        return Roles.Any(r => string.Equals(r, roleName, StringComparison.OrdinalIgnoreCase));
    }
}
