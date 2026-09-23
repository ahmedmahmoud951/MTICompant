using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Api.Helpers;

namespace MTI.ProjectManagement.Api.Middleware;

/// <summary>
/// SECURITY-02: Action filter that enforces permission-based authorization.
/// Usage: [RequirePermission("Projects.Edit")]
/// Frontend hiding a button is NOT security — this enforces it at the API level.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute, IAsyncActionFilter
{
    private readonly string _permissionCode;

    public RequirePermissionAttribute(string permissionCode)
    {
        _permissionCode = permissionCode;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated == true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // SuperAdmin bypasses all permission checks
        if (user.IsInRole("SuperAdmin") || user.IsInRole("SystemAdmin"))
        {
            await next();
            return;
        }

        if (!UserClaims.TryGetUserId(user, out var userId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var permissionService = context.HttpContext.RequestServices.GetRequiredService<IPermissionService>();
        var hasPermission = await permissionService.HasPermissionAsync(userId, _permissionCode);

        if (!hasPermission)
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}
