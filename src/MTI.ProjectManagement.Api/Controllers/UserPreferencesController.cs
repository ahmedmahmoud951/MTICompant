using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserPreferencesController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IAuditService _auditService;

    public UserPreferencesController(IAppDbContext dbContext, IAuditService auditService)
    {
        _dbContext = dbContext;
        _auditService = auditService;
    }

    private Guid? GetCurrentUserId()
    {
        var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(idStr, out var id) ? id : null;
    }

    [HttpGet("preferences")]
    public async Task<ActionResult<ApiResponse<UserPreferenceDto>>> GetPreferences(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<UserPreferenceDto>.Fail("Unauthorized"));

        var pref = await _dbContext.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId.Value, cancellationToken: cancellationToken);

        if (pref == null)
        {
            pref = new UserPreference
            {
                UserId = userId.Value,
                Language = "ar",
                TimeZone = "Africa/Cairo",
                Theme = "light",
                NotificationsEnabled = true,
                EmailNotifications = true,
                UpdatedAt = DateTime.UtcNow
            };
            _dbContext.UserPreferences.Add(pref);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var dto = new UserPreferenceDto(
            pref.UserId,
            pref.Language,
            pref.TimeZone,
            pref.Theme,
            pref.NotificationsEnabled,
            pref.EmailNotifications,
            pref.UpdatedAt
        );

        return Ok(ApiResponse<UserPreferenceDto>.Ok(dto));
    }

    [HttpPut("preferences")]
    public async Task<ActionResult<ApiResponse<UserPreferenceDto>>> UpdatePreferences(
        [FromBody] UpdateUserPreferenceRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<UserPreferenceDto>.Fail("Unauthorized"));

        var pref = await _dbContext.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId.Value, cancellationToken: cancellationToken);

        if (pref == null)
        {
            pref = new UserPreference
            {
                UserId = userId.Value
            };
            _dbContext.UserPreferences.Add(pref);
        }

        pref.Language = string.IsNullOrWhiteSpace(request.Language) ? "ar" : request.Language.Trim().ToLower();
        pref.TimeZone = string.IsNullOrWhiteSpace(request.TimeZone) ? "Africa/Cairo" : request.TimeZone.Trim();
        pref.Theme = string.IsNullOrWhiteSpace(request.Theme) ? "light" : request.Theme.Trim().ToLower();
        pref.NotificationsEnabled = request.NotificationsEnabled;
        pref.EmailNotifications = request.EmailNotifications;
        pref.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var dto = new UserPreferenceDto(
            pref.UserId,
            pref.Language,
            pref.TimeZone,
            pref.Theme,
            pref.NotificationsEnabled,
            pref.EmailNotifications,
            pref.UpdatedAt
        );

        return Ok(ApiResponse<UserPreferenceDto>.Ok(dto, "Preferences updated successfully."));
    }

    [HttpGet("profile")]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> GetProfile(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<UserProfileDto>.Fail("Unauthorized"));

        var profile = await _dbContext.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId.Value && !p.IsDeleted, cancellationToken: cancellationToken);

        if (profile == null)
        {
            profile = new UserProfile
            {
                UserId = userId.Value,
                CreatedBy = userId.Value,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.UserProfiles.Add(profile);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var dto = new UserProfileDto(
            profile.UserId,
            profile.Bio,
            profile.ProfilePictureUrl,
            profile.PhoneNumber2,
            profile.Address,
            profile.NationalId,
            profile.BirthDate,
            profile.SkillsJson,
            profile.EmergencyContact
        );

        return Ok(ApiResponse<UserProfileDto>.Ok(dto));
    }

    [HttpPut("profile")]
    public async Task<ActionResult<ApiResponse<UserProfileDto>>> UpdateProfile(
        [FromBody] UpdateUserProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<UserProfileDto>.Fail("Unauthorized"));

        var profile = await _dbContext.UserProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId.Value && !p.IsDeleted, cancellationToken: cancellationToken);

        if (profile == null)
        {
            profile = new UserProfile
            {
                UserId = userId.Value,
                CreatedBy = userId.Value,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.UserProfiles.Add(profile);
        }

        profile.Bio = request.Bio;
        profile.ProfilePictureUrl = request.ProfilePictureUrl;
        profile.PhoneNumber2 = request.PhoneNumber2;
        profile.Address = request.Address;
        profile.NationalId = request.NationalId;
        profile.BirthDate = request.BirthDate;
        profile.SkillsJson = request.SkillsJson ?? "[]";
        profile.EmergencyContact = request.EmergencyContact;
        profile.UpdatedBy = userId;
        profile.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "UserProfileUpdated",
            "UserProfile",
            profile.Id.ToString(),
            null,
            new { profile.UserId },
            cancellationToken: cancellationToken);

        var dto = new UserProfileDto(
            profile.UserId,
            profile.Bio,
            profile.ProfilePictureUrl,
            profile.PhoneNumber2,
            profile.Address,
            profile.NationalId,
            profile.BirthDate,
            profile.SkillsJson,
            profile.EmergencyContact
        );

        return Ok(ApiResponse<UserProfileDto>.Ok(dto, "Profile updated successfully."));
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<ApiResponse<List<UserSessionDto>>>> GetSessions(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized(ApiResponse<List<UserSessionDto>>.Fail("Unauthorized"));

        var sessions = await _dbContext.UserSessions
            .AsNoTracking()
            .Where(s => s.UserId == userId.Value && !s.IsRevoked)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new UserSessionDto(
                s.Id,
                s.UserId,
                s.IpAddress,
                s.UserAgent,
                s.CreatedAt,
                s.ExpiresAt,
                s.LastActivityAt,
                s.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Ok(ApiResponse<List<UserSessionDto>>.Ok(sessions));
    }
}


