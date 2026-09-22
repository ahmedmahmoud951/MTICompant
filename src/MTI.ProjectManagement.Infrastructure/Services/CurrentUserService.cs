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
            var sub = User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? User?.FindFirstValue("sub");
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email => User?.FindFirstValue(ClaimTypes.Email) ?? User?.FindFirstValue("email");

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;

    public bool IsAdmin => Roles.Contains(nameof(UserRoleType.Admin)) || Roles.Contains(nameof(UserRoleType.SystemAdmin));

    public bool IsSystemAdmin => Roles.Contains(nameof(UserRoleType.SystemAdmin));

    public bool IsEngineer => Roles.Contains(nameof(UserRoleType.Engineer));

    public IReadOnlyList<string> Roles =>
        User?.FindAll(ClaimTypes.Role).Concat(User.FindAll("role")).Select(c => c.Value).Distinct().ToList()
        ?? new List<string>();

    public IReadOnlyList<string> Permissions =>
        User?.FindAll("permission").Select(c => c.Value).Distinct().ToList()
        ?? new List<string>();
}
