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
