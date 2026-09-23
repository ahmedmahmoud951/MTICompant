namespace MTI.ProjectManagement.Application.DTOs;

public record AdminUserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    string? JobTitle,
    bool IsActive,
    List<string> Roles,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);

public record CreateUserRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string? PhoneNumber,
    string? JobTitle = null,
    string Role = "Engineer"
);

public record UpdateUserRequest(
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string? JobTitle = null,
    bool IsActive = true,
    List<string>? Roles = null
);

public record AdminResetPasswordRequest(
    string NewPassword
);

public record UserProfileDto(
    Guid UserId,
    string? Bio,
    string? ProfilePictureUrl,
    string? PhoneNumber2,
    string? Address,
    string? NationalId,
    DateTime? BirthDate,
    string? SkillsJson,
    string? EmergencyContact
);

public record UpdateUserProfileRequest(
    string? Bio,
    string? ProfilePictureUrl,
    string? PhoneNumber2,
    string? Address,
    string? NationalId,
    DateTime? BirthDate,
    string? SkillsJson,
    string? EmergencyContact
);

public record UserPreferenceDto(
    Guid UserId,
    string Language,
    string TimeZone,
    string Theme,
    bool NotificationsEnabled,
    bool EmailNotifications,
    DateTime UpdatedAt
);

public record UpdateUserPreferenceRequest(
    string Language = "ar",
    string TimeZone = "Africa/Cairo",
    string Theme = "light",
    bool NotificationsEnabled = true,
    bool EmailNotifications = true
);

public record UserSessionDto(
    Guid Id,
    Guid UserId,
    string? IpAddress,
    string? UserAgent,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? LastActivityAt,
    bool IsActive
);

