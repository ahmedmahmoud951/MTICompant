using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Api.Controllers;

/// <summary>DB-I18N / WEB-I18N: Language management endpoints.</summary>
[ApiController]
[Route("api/[controller]")]
public class LanguagesController : ControllerBase
{
    private readonly IAppDbContext _dbContext;

    public LanguagesController(IAppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>Returns all active supported languages.</summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult> GetSupportedLanguages(CancellationToken ct)
    {
        var langs = await _dbContext.SupportedLanguages
            .AsNoTracking()
            .Where(l => l.IsActive)
            .OrderBy(l => l.SortOrder)
            .Select(l => new
            {
                l.Code,
                l.NameAr,
                l.NameEn,
                l.Direction,
                l.IsDefault
            })
            .ToListAsync(ct);

        return Ok(langs);
    }

    /// <summary>Gets the current user's language preference.</summary>
    [HttpGet("preference")]
    [Authorize]
    public async Task<ActionResult> GetMyPreference(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var pref = await _dbContext.UserLanguagePreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId.Value, ct);

        return Ok(new { languageCode = pref?.LanguageCode ?? "ar" });
    }

    /// <summary>Sets the current user's language preference.</summary>
    [HttpPut("preference")]
    [Authorize]
    public async Task<ActionResult> SetMyPreference([FromBody] SetLanguageDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.LanguageCode))
            return BadRequest(new { message = "LanguageCode is required." });

        var supported = await _dbContext.SupportedLanguages
            .AnyAsync(l => l.Code == dto.LanguageCode && l.IsActive, ct);
        if (!supported)
            return BadRequest(new { message = $"Language '{dto.LanguageCode}' is not supported." });

        var existing = await _dbContext.UserLanguagePreferences
            .FirstOrDefaultAsync(p => p.UserId == userId.Value, ct);

        if (existing == null)
        {
            _dbContext.UserLanguagePreferences.Add(new UserLanguagePreference
            {
                UserId = userId.Value,
                LanguageCode = dto.LanguageCode,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.LanguageCode = dto.LanguageCode;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(ct);
        return Ok(new { languageCode = dto.LanguageCode });
    }

    /// <summary>Admin: upsert a business entity translation entry (DB-I18N).</summary>
    [HttpPost("translations")]
    [Authorize(Roles = "Admin,SystemAdmin,SuperAdmin")]
    public async Task<ActionResult> UpsertTranslation([FromBody] UpsertTranslationDto dto, CancellationToken ct)
    {
        var existing = await _dbContext.TranslationEntries.FirstOrDefaultAsync(
            t => t.EntityType == dto.EntityType &&
                 t.EntityId == dto.EntityId &&
                 t.LanguageCode == dto.LanguageCode &&
                 t.FieldName == dto.FieldName, ct);

        if (existing == null)
        {
            _dbContext.TranslationEntries.Add(new Domain.Entities.TranslationEntry
            {
                EntityType = dto.EntityType,
                EntityId = dto.EntityId,
                LanguageCode = dto.LanguageCode,
                FieldName = dto.FieldName,
                TranslatedValue = dto.TranslatedValue,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.TranslatedValue = dto.TranslatedValue;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(ct);
        return Ok(new { success = true });
    }

    /// <summary>Fetch translations for a specific entity and language.</summary>
    [HttpGet("translations/{entityType}/{entityId}")]
    [AllowAnonymous]
    public async Task<ActionResult> GetTranslations(string entityType, string entityId, [FromQuery] string lang = "ar", CancellationToken ct = default)
    {
        var entries = await _dbContext.TranslationEntries
            .AsNoTracking()
            .Where(t => t.EntityType == entityType && t.EntityId == entityId && t.LanguageCode == lang)
            .ToDictionaryAsync(t => t.FieldName, t => t.TranslatedValue, ct);

        return Ok(entries);
    }

    private Guid? GetUserId()
    {
        var raw = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

public record SetLanguageDto(string LanguageCode);
public record UpsertTranslationDto(string EntityType, string EntityId, string LanguageCode, string FieldName, string TranslatedValue);
