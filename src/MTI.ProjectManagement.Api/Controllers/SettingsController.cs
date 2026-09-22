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
        var reconnectEnabled = bool.TryParse(settings.FirstOrDefault(s => s.Key == "ReconnectEnabled")?.Value, out var re) && re;

        return Ok(new
        {
            appName = "MTI Engineering Solutions",
            environment = "Production",
            signalR = new
            {
                enabled = hubEnabled,
                hubPath,
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
}
