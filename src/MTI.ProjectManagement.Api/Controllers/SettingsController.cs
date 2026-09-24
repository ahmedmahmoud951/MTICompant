using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Route("api/system")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public SettingsController(
        AppDbContext context,
        ICurrentUserService currentUserService,
        IAuditService auditService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    /// <summary>
    /// Safe public runtime configuration for frontend (Prompt 18)
    /// </summary>
    [HttpGet("config")]
    [AllowAnonymous]
    public async Task<ActionResult> GetSafePublicConfig()
    {
        var settings = await _context.SystemSettings
            .AsNoTracking()
            .Where(s => s.Category == "SignalR")
            .ToListAsync();

        var hubEnabled = bool.TryParse(settings.FirstOrDefault(s => s.Key == "HubEnabled")?.Value, out var he) && he;
        var hubPath = settings.FirstOrDefault(s => s.Key == "HubPath")?.Value ?? "/hubs/project";
        var hubUrl = settings.FirstOrDefault(s => s.Key == "HubUrl")?.Value ?? "https://mtiapi.runasp.net/hubs/project";
        var reconnectEnabled = bool.TryParse(settings.FirstOrDefault(s => s.Key == "ReconnectEnabled")?.Value, out var re) && re;

        return Ok(new
        {
            appName = "MTI Engineering Solutions",
            environment = "Production",
            signalR = new
            {
                enabled = hubEnabled,
                hubPath,
                hubUrl,
                reconnectEnabled
            }
        });
    }

    [HttpGet("signalr")]
    [AllowAnonymous]
    public async Task<ActionResult<ApiResponse<SignalRConfigDto>>> GetSignalRConfig()
    {
        var settings = await _context.SystemSettings
            .Where(s => s.Category == "SignalR")
            .ToListAsync();

        var hubEnabled = bool.TryParse(settings.FirstOrDefault(s => s.Key == "HubEnabled")?.Value, out var he) && he;
        var hubPath = settings.FirstOrDefault(s => s.Key == "HubPath")?.Value ?? "/hubs/project";
        var hubUrl = settings.FirstOrDefault(s => s.Key == "HubUrl")?.Value ?? string.Empty;
        var reconnectEnabled = bool.TryParse(settings.FirstOrDefault(s => s.Key == "ReconnectEnabled")?.Value, out var re) && re;
        var allowedOriginsRaw = settings.FirstOrDefault(s => s.Key == "AllowedOrigins")?.Value ?? "http://localhost:3000";
        var allowedOrigins = allowedOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var config = new SignalRConfigDto(hubEnabled, hubPath, hubUrl, reconnectEnabled, allowedOrigins);
        return Ok(ApiResponse<SignalRConfigDto>.Ok(config));
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<List<SystemSetting>>>> GetAllSettings()
    {
        if (!_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SettingsView))
        {
            return Forbid();
        }

        var settings = await _context.SystemSettings.OrderBy(s => s.Category).ThenBy(s => s.Key).ToListAsync();
        return Ok(ApiResponse<List<SystemSetting>>.Ok(settings));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ApiResponse<SystemSetting>>> UpdateSetting(Guid id, [FromBody] string newValue)
    {
        if (!_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SettingsUpdate))
        {
            return Forbid();
        }

        var setting = await _context.SystemSettings.FindAsync(id);
        if (setting == null) return NotFound(ApiResponse<SystemSetting>.Fail("Setting not found."));

        var oldValue = setting.Value;
        setting.Value = newValue;

        await _context.SaveChangesAsync();
        await _auditService.LogAsync("UpdateSystemSetting", "SystemSetting", id.ToString(), new { Value = oldValue }, new { Value = newValue });

        return Ok(ApiResponse<SystemSetting>.Ok(setting, "Setting updated."));
    }

    /// <summary>
    /// ADMIN-05: Returns all enterprise configuration categories:
    /// Company Name, Logo, Default Language, Available Languages, Document Edit Window,
    /// File Size Limits, Allowed File Extensions, Task Default Priorities, Task Statuses,
    /// Project Statuses, Site Statuses, Notification Rules, Chat Settings, Drawing Settings, Document Approval Rules.
    /// </summary>
    [HttpGet("system-config")]
    public async Task<ActionResult<ApiResponse<Dictionary<string, Dictionary<string, string>>>>> GetSystemConfiguration()
    {
        await EnsureDefaultSystemSettingsAsync();

        var settings = await _context.SystemSettings
            .AsNoTracking()
            .ToListAsync();

        var grouped = settings
            .GroupBy(s => s.Category)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(s => s.Key, s => s.Value)
            );

        return Ok(ApiResponse<Dictionary<string, Dictionary<string, string>>>.Ok(grouped));
    }

    /// <summary>
    /// ADMIN-05: Bulk update system settings
    /// </summary>
    [HttpPut("bulk")]
    public async Task<ActionResult<ApiResponse<bool>>> UpdateBulkSettings([FromBody] List<UpdateSettingItemDto> items)
    {
        if (!_currentUserService.IsSystemAdmin && !_currentUserService.Permissions.Contains(Permissions.SettingsUpdate))
        {
            return Forbid();
        }

        if (items == null || items.Count == 0)
        {
            return BadRequest(ApiResponse<bool>.Fail("No settings provided to update."));
        }

        foreach (var item in items)
        {
            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(s => s.Category == item.Category && s.Key == item.Key);

            if (setting != null)
            {
                var oldVal = setting.Value;
                setting.Value = item.Value;
                await _auditService.LogAsync("UpdateSystemSetting", "SystemSetting", setting.Id.ToString(), new { Value = oldVal }, new { Value = item.Value });
            }
            else
            {
                var newSetting = new SystemSetting
                {
                    Category = item.Category,
                    Key = item.Key,
                    Value = item.Value,
                    Description = item.Description ?? item.Key
                };
                _context.SystemSettings.Add(newSetting);
                await _auditService.LogAsync("CreateSystemSetting", "SystemSetting", newSetting.Id.ToString(), null, new { Value = item.Value });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<bool>.Ok(true, "Settings updated successfully."));
    }

    private async Task EnsureDefaultSystemSettingsAsync()
    {
        var defaults = new (string Category, string Key, string Value, string Description)[]
        {
            ("Company", "CompanyName", "MTI Engineering Solutions", "Official company name"),
            ("Company", "LogoUrl", "/images/CompanyLogo.png", "Company logo path"),
            ("Localization", "DefaultLanguage", "ar", "Default system language (ar or en)"),
            ("Localization", "AvailableLanguages", "ar,en", "Comma-separated list of enabled languages"),
            ("Localization", "DefaultDateFormat", "YYYY-MM-DD", "Default system date format"),
            ("Localization", "DefaultTimeFormat", "24h", "Default system time format"),
            ("Documents", "EditWindowHours", "24", "Editable grace period for newly uploaded documents in hours"),
            ("Documents", "ApprovalWorkflowEnabled", "true", "Whether documents require multi-stage approval"),
            ("Documents", "RequireManagerSignOff", "true", "Whether manager sign-off is mandatory"),
            ("Storage", "MaxFileSizeMB", "100", "Maximum uploaded file size in megabytes"),
            ("Storage", "AllowedFileExtensions", ".pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg,.mp4,.zip", "Allowed file extensions"),
            ("Tasks", "DefaultPriority", "Medium", "Default priority for newly created tasks"),
            ("Tasks", "AllowedPriorities", "Low,Medium,High,Urgent,Critical", "Allowed task priorities"),
            ("Tasks", "AllowedStatuses", "Pending,InProgress,UnderReview,Completed,Cancelled", "Allowed task statuses"),
            ("Projects", "AllowedStatuses", "Draft,Active,OnHold,UnderReview,Completed,Archived", "Allowed project statuses"),
            ("Sites", "AllowedStatuses", "Active,UnderConstruction,Commissioning,Maintenance,Completed,Archived", "Allowed site statuses"),
            ("Notifications", "EmailNotificationsEnabled", "true", "Enable outbound email notifications"),
            ("Notifications", "InAppNotificationsEnabled", "true", "Enable real-time in-app notifications"),
            ("Chat", "DirectMessagesEnabled", "true", "Enable peer-to-peer direct messaging"),
            ("Chat", "ProjectChannelsEnabled", "true", "Enable automatic project chat channels"),
            ("Chat", "MaxAttachmentSizeMB", "50", "Maximum chat media attachment size in MB"),
            ("Drawings", "RequireApprovalBeforePublish", "true", "Require engineering approval before drawing revision is active"),
            ("Drawings", "LockApprovedRevisions", "true", "Prevent edits or deletion of approved drawing revisions")
        };

        bool hasChanges = false;
        foreach (var def in defaults)
        {
            var exists = await _context.SystemSettings.AnyAsync(s => s.Category == def.Category && s.Key == def.Key);
            if (!exists)
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    Category = def.Category,
                    Key = def.Key,
                    Value = def.Value,
                    Description = def.Description
                });
                hasChanges = true;
            }
        }

        if (hasChanges)
        {
            await _context.SaveChangesAsync();
        }
    }
}

public class UpdateSettingItemDto
{
    public string Category { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Description { get; set; }
}

