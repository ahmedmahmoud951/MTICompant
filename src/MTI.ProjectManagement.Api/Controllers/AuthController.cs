using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IAuditService _auditService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IResourceAuthorizationService _resourceAuthorizationService;

    public AuthController(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IAuditService auditService,
        ICurrentUserService currentUserService,
        IResourceAuthorizationService resourceAuthorizationService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _auditService = auditService;
        _currentUserService = currentUserService;
        _resourceAuthorizationService = resourceAuthorizationService;
    }

    /// <summary>
    /// Authenticates a user with email and password, returning JWT access and refresh tokens.
    /// </summary>
    /// <param name="request">Email and password credentials</param>
    /// <response code="200">Authentication successful, returns tokens and user permissions</response>
    /// <response code="400">Missing email or password</response>
    /// <response code="401">Invalid credentials or locked user account</response>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 200)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 400)]
    [ProducesResponseType(typeof(ApiResponse<LoginResponse>), 401)]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(ApiResponse<LoginResponse>.Fail("Email and password are required."));
        }

        var identifier = request.Email.Trim().ToLower();
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == identifier 
                || (identifier == "admin" && (u.Email.ToLower() == "admin" || u.Email.ToLower() == "admin@mti.com")));

        if (user == null)
        {
            await _auditService.LogAsync("FailedLogin", "User", null, new { Email = request.Email, Reason = "UserNotFound" });
            return Unauthorized(ApiResponse<LoginResponse>.Fail("Invalid credentials."));
        }

        if (!user.IsActive)
        {
            await _auditService.LogAsync("FailedLogin", "User", user.Id.ToString(), new { Reason = "UserInactive" });
            return Unauthorized(ApiResponse<LoginResponse>.Fail("Account is disabled. Contact system administrator."));
        }

        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remaining = Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
            return StatusCode(423, ApiResponse<LoginResponse>.Fail($"Account is temporarily locked. Try again in {remaining} minute(s)."));
        }

        var isPasswordValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                await _auditService.LogAsync("AccountLocked", "User", user.Id.ToString(), new { Attempts = user.AccessFailedCount });
            }
            await _context.SaveChangesAsync();
            await _auditService.LogAsync("FailedLogin", "User", user.Id.ToString(), new { Reason = "InvalidPassword" });
            return Unauthorized(ApiResponse<LoginResponse>.Fail("Invalid credentials."));
        }

        // Reset failed login state
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        user.LastLoginAt = DateTime.UtcNow;

        var roles = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToList();

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(user, roles, permissions);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();

        // Concurrent sessions allowed: do NOT revoke other devices' refresh tokens.
        // Each login gets its own refresh token so the same Admin user can stay open on multiple devices.
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        var assignedProjects = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(user.Id);
        var assignedSites = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(user.Id);

        await _auditService.LogAsync("Login", "User", user.Id.ToString(), new { user.Email, Roles = roles });

        var userDto = new UserDto(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.FullName,
            user.PhoneNumber,
            user.JobTitle,
            user.IsActive,
            roles,
            permissions
        );

        var response = new LoginResponse(
            accessToken,
            refreshTokenValue,
            expiresAt,
            userDto,
            assignedProjects,
            assignedSites
        );

        return Ok(ApiResponse<LoginResponse>.Ok(response, "Login successful."));
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<LoginResponse>>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest(ApiResponse<LoginResponse>.Fail("Refresh token is required."));
        }

        var token = await _context.RefreshTokens
            .Include(t => t.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken);

        if (token == null || !token.IsActive || token.User.IsDeleted || !token.User.IsActive)
        {
            return Unauthorized(ApiResponse<LoginResponse>.Fail("Invalid or expired refresh token."));
        }

        // Token rotation: Revoke current token
        var newRefreshTokenValue = _tokenService.GenerateRefreshToken();
        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        token.ReplacedByToken = newRefreshTokenValue;

        var newRefreshToken = new RefreshToken
        {
            UserId = token.UserId,
            Token = newRefreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedByIp = HttpContext.Connection.RemoteIpAddress?.ToString()
        };
        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync();

        var roles = token.User.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList();
        var permissions = token.User.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToList();

        var (accessToken, expiresAt) = _tokenService.GenerateAccessToken(token.User, roles, permissions);

        var assignedProjects = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(token.UserId);
        var assignedSites = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(token.UserId);

        var userDto = new UserDto(
            token.User.Id,
            token.User.Email,
            token.User.FirstName,
            token.User.LastName,
            token.User.FullName,
            token.User.PhoneNumber,
            token.User.JobTitle,
            token.User.IsActive,
            roles,
            permissions
        );

        var response = new LoginResponse(
            accessToken,
            newRefreshTokenValue,
            expiresAt,
            userDto,
            assignedProjects,
            assignedSites
        );

        return Ok(ApiResponse<LoginResponse>.Ok(response, "Token refreshed successfully."));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<bool>>> Logout([FromBody] RefreshTokenRequest? request)
    {
        if (!string.IsNullOrWhiteSpace(request?.RefreshToken))
        {
            var token = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.Token == request.RefreshToken);
            if (token != null && !token.IsRevoked)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedByIp = HttpContext.Connection.RemoteIpAddress?.ToString();
                await _context.SaveChangesAsync();
            }
        }

        var userId = _currentUserService.UserId;
        if (userId.HasValue)
        {
            await _auditService.LogAsync("Logout", "User", userId.Value.ToString());
        }

        return Ok(ApiResponse<bool>.Ok(true, "Logged out successfully."));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CurrentUserResponse>>> Me()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized(ApiResponse<CurrentUserResponse>.Fail("Unauthorized"));

        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                    .ThenInclude(r => r.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(u => u.Id == userId.Value);

        if (user == null) return NotFound(ApiResponse<CurrentUserResponse>.Fail("User not found"));

        var roles = user.UserRoles.Select(ur => ur.Role.Name).Distinct().ToList();
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToList();

        var assignedProjects = await _resourceAuthorizationService.GetAuthorizedProjectIdsAsync(user.Id);
        var assignedSites = await _resourceAuthorizationService.GetAuthorizedSiteIdsAsync(user.Id);

        var userDto = new UserDto(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            user.FullName,
            user.PhoneNumber,
            user.JobTitle,
            user.IsActive,
            roles,
            permissions
        );

        var response = new CurrentUserResponse(userDto, assignedProjects, assignedSites);
        return Ok(ApiResponse<CurrentUserResponse>.Ok(response));
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue) return Unauthorized();

        var user = await _context.Users.FindAsync(userId.Value);
        if (user == null) return NotFound();

        if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(ApiResponse<bool>.Fail("Current password does not match."));
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
        {
            return BadRequest(ApiResponse<bool>.Fail("New password must be at least 8 characters long."));
        }

        user.PasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = userId.Value;

        // Revoke all existing refresh tokens
        var tokens = await _context.RefreshTokens.Where(t => t.UserId == user.Id && t.RevokedAt == null).ToListAsync();
        foreach (var t in tokens)
        {
            t.RevokedAt = DateTime.UtcNow;
            t.RevokedByIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        }

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("ChangePassword", "User", user.Id.ToString());

        return Ok(ApiResponse<bool>.Ok(true, "Password changed successfully. Please log in again."));
    }
}

