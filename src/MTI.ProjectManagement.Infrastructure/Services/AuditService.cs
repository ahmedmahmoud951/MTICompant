using System.Text.Json;
using Microsoft.AspNetCore.Http;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly AppDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(
        AppDbContext context,
        ICurrentUserService currentUserService,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _currentUserService = currentUserService;
        _httpContextAccessor = httpContextAccessor;
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles,
        WriteIndented = false
    };

    public async Task LogAsync(
        string action,
        string entityType,
        string? entityId,
        object? oldValues = null,
        object? newValues = null,
        Guid? projectId = null,
        Guid? siteId = null,
        CancellationToken cancellationToken = default)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var ip = httpContext?.Connection.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request.Headers["User-Agent"].ToString();

        var log = new AuditLog
        {
            UserId = _currentUserService.UserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ProjectId = projectId,
            SiteId = siteId,
            OldValues = oldValues != null ? JsonSerializer.Serialize(oldValues, JsonOptions) : null,
            NewValues = newValues != null ? JsonSerializer.Serialize(newValues, JsonOptions) : null,
            IpAddress = ip,
            UserAgent = userAgent,
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
