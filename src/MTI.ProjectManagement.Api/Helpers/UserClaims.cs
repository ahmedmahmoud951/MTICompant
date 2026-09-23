using System.Security.Claims;

namespace MTI.ProjectManagement.Api.Helpers;

public static class UserClaims
{
    public static bool TryGetUserId(ClaimsPrincipal? user, out Guid userId)
    {
        userId = Guid.Empty;
        if (user == null) return false;

        var raw =
            user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? user.FindFirstValue("sub")
            ?? user.FindFirstValue(ClaimTypes.Name);

        return Guid.TryParse(raw, out userId);
    }
}
