using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
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

    public async Task<Notification?> CreateNotificationAsync(
        Guid recipientUserId,
        NotificationType type,
        string title,
        string body,
        string? eventKey = null,
        string? entityType = null,
        string? entityId = null,
        string? titleKey = null,
        string? bodyKey = null,
        string? dataJson = null,
        CancellationToken cancellationToken = default)
    {
        // 1. Deduplication Check (Prompt NOTIFY-01: If same EventKey already exists, DO NOT create another notification)
        if (!string.IsNullOrWhiteSpace(eventKey))
        {
            var existing = await _dbContext.Notifications
                .FirstOrDefaultAsync(n => n.EventKey == eventKey, cancellationToken);

            if (existing != null)
            {
                _logger?.LogInformation("Notification with EventKey {EventKey} already exists. Skipping duplicate creation and SignalR broadcast.", eventKey);
                return existing;
            }
        }

        // 2. Persist to SQL (Source of Truth)
        var notification = new Notification
        {
            UserId = recipientUserId,
            Type = type,
            Title = title,
            Body = body,
            TitleKey = titleKey,
            BodyKey = bodyKey,
            DataJson = dataJson,
            EventKey = eventKey,
            EntityType = entityType,
            EntityId = entityId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Notifications.Add(notification);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (!string.IsNullOrWhiteSpace(eventKey))
        {
            _logger?.LogWarning(ex, "Concurrent duplicate notification detected for EventKey {EventKey}", eventKey);
            var existing = await _dbContext.Notifications
                .FirstOrDefaultAsync(n => n.EventKey == eventKey, cancellationToken);
            return existing;
        }

        // 3. User Scoping: Broadcast ONLY to user:{userId} (Prompt NOTIFY-01)
        // "Never broadcast personal notifications to: project group, site group, all users. Use: user:{userId}"
        try
        {
            var payload = new
            {
                id = notification.Id,
                type = notification.Type.ToString(),
                title = notification.Title,
                body = notification.Body,
                titleKey = notification.TitleKey,
                bodyKey = notification.BodyKey,
                dataJson = notification.DataJson,
                eventKey = notification.EventKey,
                entityType = notification.EntityType,
                entityId = notification.EntityId,
                isRead = notification.IsRead,
                createdAt = notification.CreatedAt
            };

            await _hubContext.Clients.Group($"user:{recipientUserId}").SendAsync("NotificationCreated", payload, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to deliver SignalR NotificationCreated to user {UserId}. Record remains safe in database.", recipientUserId);
        }

        return notification;
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
        var result = await CreateNotificationAsync(
            userId, type, title, body,
            eventKey: null, entityType, entityId,
            cancellationToken: cancellationToken);
        return result!;
    }

    public async Task BroadcastToUserAsync(Guid userId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try { await _hubContext.Clients.Group($"user:{userId}").SendAsync(eventName, payload, cancellationToken); }
        catch (Exception ex) { _logger?.LogWarning(ex, "Failed to broadcast {Event} to user {UserId}", eventName, userId); }
    }

    public async Task BroadcastToProjectAsync(Guid projectId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try { await _hubContext.Clients.Group($"project:{projectId}").SendAsync(eventName, payload, cancellationToken); }
        catch (Exception ex) { _logger?.LogWarning(ex, "Failed to broadcast {Event} to project {ProjectId}", eventName, projectId); }
    }

    public async Task BroadcastToSiteAsync(Guid siteId, string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try { await _hubContext.Clients.Group($"site:{siteId}").SendAsync(eventName, payload, cancellationToken); }
        catch (Exception ex) { _logger?.LogWarning(ex, "Failed to broadcast {Event} to site {SiteId}", eventName, siteId); }
    }

    public async Task BroadcastToAdminsAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try { await _hubContext.Clients.Group("admins").SendAsync(eventName, payload, cancellationToken); }
        catch (Exception ex) { _logger?.LogWarning(ex, "Failed to broadcast {Event} to admins", eventName); }
    }

    public async Task BroadcastGlobalAsync(string eventName, object payload, CancellationToken cancellationToken = default)
    {
        try { await _hubContext.Clients.Group("global").SendAsync(eventName, payload, cancellationToken); }
        catch (Exception ex) { _logger?.LogWarning(ex, "Failed to broadcast {Event} globally", eventName); }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFY-02: Typed notification helpers with deterministic EventKey values
    // ─────────────────────────────────────────────────────────────────────────

    public async Task NotifyTaskAssignedAsync(Guid taskId, string taskTitle, Guid assigneeUserId, CancellationToken ct = default)
    {
        var eventKey = $"TaskAssigned:{taskId}:{assigneeUserId}";
        await CreateNotificationAsync(assigneeUserId, NotificationType.TaskAssigned,
            "New Task Assigned", $"You have been assigned to task: '{taskTitle}'",
            eventKey, "Task", taskId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyTaskDueSoonAsync(Guid taskId, string taskTitle, Guid userId, string dueDate, CancellationToken ct = default)
    {
        var eventKey = $"TaskDueSoon:{taskId}:{userId}:{dueDate}";
        await CreateNotificationAsync(userId, NotificationType.TaskDueSoon,
            "Task Due Soon", $"Task '{taskTitle}' is due on {dueDate}.",
            eventKey, "Task", taskId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyTaskOverdueAsync(Guid taskId, string taskTitle, Guid userId, CancellationToken ct = default)
    {
        var eventKey = $"TaskOverdue:{taskId}:{userId}";
        await CreateNotificationAsync(userId, NotificationType.TaskOverdue,
            "Task Overdue", $"Task '{taskTitle}' is past its due date.",
            eventKey, "Task", taskId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyTaskCompletedAsync(Guid taskId, string taskTitle, IEnumerable<Guid> notifyUserIds, Guid completedBy, CancellationToken ct = default)
    {
        foreach (var uid in notifyUserIds.Where(id => id != completedBy))
        {
            var eventKey = $"TaskCompleted:{taskId}:{uid}";
            await CreateNotificationAsync(uid, NotificationType.TaskCompleted,
                "Task Completed", $"Task '{taskTitle}' has been completed.",
                eventKey, "Task", taskId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyDocumentUploadedAsync(Guid documentId, string documentTitle, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default)
    {
        foreach (var uid in notifyUserIds)
        {
            var eventKey = $"DocumentUploaded:{documentId}:{uid}";
            await CreateNotificationAsync(uid, NotificationType.DocumentUploaded,
                "Document Uploaded", $"Document '{documentTitle}' has been uploaded.",
                eventKey, "Document", documentId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyDocumentApprovedAsync(Guid documentId, string documentTitle, Guid uploaderUserId, CancellationToken ct = default)
    {
        var eventKey = $"DocumentApproved:{documentId}:{uploaderUserId}";
        await CreateNotificationAsync(uploaderUserId, NotificationType.DocumentApproved,
            "Document Approved", $"Your document '{documentTitle}' has been approved.",
            eventKey, "Document", documentId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyDocumentRejectedAsync(Guid documentId, string documentTitle, Guid uploaderUserId, CancellationToken ct = default)
    {
        var eventKey = $"DocumentRejected:{documentId}:{uploaderUserId}";
        await CreateNotificationAsync(uploaderUserId, NotificationType.DocumentRejected,
            "Document Rejected", $"Your document '{documentTitle}' has been rejected.",
            eventKey, "Document", documentId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyCorrectionRequestedAsync(Guid documentId, string documentTitle, Guid targetUserId, CancellationToken ct = default)
    {
        var eventKey = $"CorrectionRequested:{documentId}:{targetUserId}";
        await CreateNotificationAsync(targetUserId, NotificationType.CorrectionRequested,
            "Correction Requested", $"A correction has been requested for document '{documentTitle}'.",
            eventKey, "Document", documentId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyProjectAssignedAsync(Guid projectId, string projectName, Guid assigneeUserId, CancellationToken ct = default)
    {
        var eventKey = $"ProjectAssigned:{projectId}:{assigneeUserId}";
        await CreateNotificationAsync(assigneeUserId, NotificationType.ProjectAssigned,
            "Project Assigned", $"You have been assigned to project: '{projectName}'.",
            eventKey, "Project", projectId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyProjectUpdatedAsync(Guid projectId, string projectName, IEnumerable<Guid> memberUserIds, CancellationToken ct = default)
    {
        // Use a date-bucketed key so each member gets one notification per day per project
        var dateKey = DateTime.UtcNow.ToString("yyyyMMdd");
        foreach (var uid in memberUserIds)
        {
            var eventKey = $"ProjectUpdated:{projectId}:{uid}:{dateKey}";
            await CreateNotificationAsync(uid, NotificationType.ProjectUpdated,
                "Project Updated", $"Project '{projectName}' has been updated.",
                eventKey, "Project", projectId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyMilestoneCompletedAsync(Guid milestoneId, string milestoneName, Guid projectId, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default)
    {
        foreach (var uid in notifyUserIds)
        {
            var eventKey = $"MilestoneCompleted:{milestoneId}:{uid}";
            await CreateNotificationAsync(uid, NotificationType.MilestoneCompleted,
                "Milestone Completed", $"Milestone '{milestoneName}' has been completed.",
                eventKey, "Milestone", milestoneId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyIssueCreatedAsync(Guid issueId, string issueTitle, Guid projectId, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default)
    {
        foreach (var uid in notifyUserIds)
        {
            var eventKey = $"IssueCreated:{issueId}:{uid}";
            await CreateNotificationAsync(uid, NotificationType.IssueCreated,
                "New Issue Created", $"Issue '{issueTitle}' has been created.",
                eventKey, "Issue", issueId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyIssueAssignedAsync(Guid issueId, string issueTitle, Guid assigneeUserId, CancellationToken ct = default)
    {
        var eventKey = $"IssueAssigned:{issueId}:{assigneeUserId}";
        await CreateNotificationAsync(assigneeUserId, NotificationType.IssueAssigned,
            "Issue Assigned", $"You have been assigned to issue: '{issueTitle}'.",
            eventKey, "Issue", issueId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyIssueOverdueAsync(Guid issueId, string issueTitle, Guid assigneeUserId, CancellationToken ct = default)
    {
        var eventKey = $"IssueOverdue:{issueId}:{assigneeUserId}";
        await CreateNotificationAsync(assigneeUserId, NotificationType.IssueOverdue,
            "Issue Overdue", $"Issue '{issueTitle}' is past its due date.",
            eventKey, "Issue", issueId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyMaintenanceCreatedAsync(Guid assetId, string assetName, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default)
    {
        foreach (var uid in notifyUserIds)
        {
            var eventKey = $"MaintenanceCreated:{assetId}:{uid}:{DateTime.UtcNow:yyyyMMdd}";
            await CreateNotificationAsync(uid, NotificationType.MaintenanceCreated,
                "Maintenance Task Created", $"A maintenance task has been created for asset '{assetName}'.",
                eventKey, "Asset", assetId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyMaintenanceAssignedAsync(Guid assetId, string assetName, Guid assigneeUserId, CancellationToken ct = default)
    {
        var eventKey = $"MaintenanceAssigned:{assetId}:{assigneeUserId}";
        await CreateNotificationAsync(assigneeUserId, NotificationType.MaintenanceAssigned,
            "Maintenance Assigned", $"You have been assigned a maintenance task for asset '{assetName}'.",
            eventKey, "Asset", assetId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyWarrantyExpiringAsync(Guid assetId, string assetName, int daysRemaining, IEnumerable<Guid> notifyUserIds, CancellationToken ct = default)
    {
        foreach (var uid in notifyUserIds)
        {
            var eventKey = $"WarrantyExpiring:{assetId}:{daysRemaining}:{uid}";
            await CreateNotificationAsync(uid, NotificationType.WarrantyExpiring,
                "Warranty Expiring", $"Warranty for asset '{assetName}' expires in {daysRemaining} day(s).",
                eventKey, "Asset", assetId.ToString(), cancellationToken: ct);
        }
    }

    public async Task NotifyChatMessageAsync(Guid conversationId, Guid messageId, Guid senderUserId, string senderName, Guid recipientUserId, CancellationToken ct = default)
    {
        // Chat messages do NOT use EventKey dedup — each message is unique
        await CreateNotificationAsync(recipientUserId, NotificationType.ChatMessage,
            "New Message", $"{senderName} sent you a message.",
            eventKey: null, "Message", messageId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyMentionAsync(Guid entityId, string entityType, Guid mentionedUserId, Guid mentionedBy, CancellationToken ct = default)
    {
        var eventKey = $"Mention:{entityType}:{entityId}:{mentionedUserId}:{mentionedBy}";
        await CreateNotificationAsync(mentionedUserId, NotificationType.Mention,
            "You Were Mentioned", $"You were mentioned in a {entityType}.",
            eventKey, entityType, entityId.ToString(), cancellationToken: ct);
    }

    public async Task NotifyApprovalRequestedAsync(Guid entityId, string entityType, string entityTitle, Guid approverUserId, CancellationToken ct = default)
    {
        var eventKey = $"ApprovalRequested:{entityType}:{entityId}:{approverUserId}";
        await CreateNotificationAsync(approverUserId, NotificationType.ApprovalRequested,
            "Approval Required", $"Your approval is required for {entityType}: '{entityTitle}'.",
            eventKey, entityType, entityId.ToString(), cancellationToken: ct);
    }
}
