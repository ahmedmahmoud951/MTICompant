namespace MTI.ProjectManagement.Application.DTOs;

public record LoginRequest(string Email, string Password);

public record RefreshTokenRequest(string RefreshToken);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Email, string Token, string NewPassword);

public record UserDto(
    Guid Id,
    string Email,
    string FirstName,
    string LastName,
    string FullName,
    string? PhoneNumber,
    string? JobTitle,
    bool IsActive,
    List<string> Roles,
    List<string> Permissions
);

public record LoginResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserDto User,
    List<Guid>? AssignedProjectIds = null,
    List<Guid>? AssignedSiteIds = null
);

public record CurrentUserResponse(
    UserDto User,
    List<Guid> AssignedProjectIds,
    List<Guid> AssignedSiteIds
);
