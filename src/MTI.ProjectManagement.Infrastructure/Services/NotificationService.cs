using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.SignalR;

namespace MTI.ProjectManagement.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly IAppDbContext _dbContext;
    private readonly IHubContext<ProjectHub> _hubContext;
    private readonly ILogger<NotificationService>? _logger;

    public NotificationService(
        IAppDbContext dbContext,
        IHubContext<ProjectHub> hubContext,
        ILogger<NotificationService>? logger = null)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task<Notification> SendNotificationAsync(
        Guid userId,
        NotificationType type,
        string title,
        string body,
        string? entityType = null,
        string? entityId = null,
        CancellationToken cancellationToken = default)
    {
        // 1. Persist notification in SQL Server (Source of Truth)
        var notification = new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Body = body,
            EntityType = entityType,
            EntityId = entityId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Notifications.Add(notification);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // 2. Broadcast to user:{userId} via SignalR
        try
        {
            var payload = new
            {
                id = notification.Id,
                type = notification.Type.ToString(),
                title = notification.Title,
                body = notification.Body,
                entityType = notification.EntityType,
                entityId = notification.EntityId,
                isRead = notification.IsRead,
                createdAt = notification.CreatedAt
            };

            await _hubContext.Clients.Group($"user:{userId}").SendAsync("NotificationCreated", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to deliver SignalR notification to user {UserId}. Record remains safe in database.", userId);
        }

        return notification;
    }

    public async Task BroadcastToUserAsync(Guid userId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"user:{userId}").SendAsync(eventName, payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to broadcast {Event} to user {UserId}", eventName, userId);
        }
    }

    public async Task BroadcastToProjectAsync(Guid projectId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"project:{projectId}").SendAsync(eventName, payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to broadcast {Event} to project {ProjectId}", eventName, projectId);
        }
    }

    public async Task BroadcastToSiteAsync(Guid siteId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group($"site:{siteId}").SendAsync(eventName, payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to broadcast {Event} to site {SiteId}", eventName, siteId);
        }
    }

    public async Task BroadcastToAdminsAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group("admins").SendAsync(eventName, payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to broadcast {Event} to admins", eventName);
        }
    }

    public async Task BroadcastGlobalAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.Group("global").SendAsync(eventName, payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to broadcast {Event} globally", eventName);
        }
    }
}
