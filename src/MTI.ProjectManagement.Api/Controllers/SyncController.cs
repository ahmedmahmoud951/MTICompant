using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SyncController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IMediaStorageService _mediaStorage;

    public SyncController(IAppDbContext dbContext, IMediaStorageService mediaStorage)
    {
        _dbContext = dbContext;
        _mediaStorage = mediaStorage;
    }

    /// <summary>
    /// Centralized Reconnection Synchronization API (PROMPT REALTIME-01)
    /// Fetches new messages, notifications, updated tasks, and project changes
    /// after a SignalR reconnection using last known server timestamp or cursor.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<SyncResponseDto>> Sync(
        [FromQuery] DateTime? since,
        [FromQuery] string? cursor,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var syncSince = since;
        if (!syncSince.HasValue && !string.IsNullOrWhiteSpace(cursor) && long.TryParse(cursor, out var unixMs))
        {
            syncSince = DateTimeOffset.FromUnixTimeMilliseconds(unixMs).UtcDateTime;
        }

        // Default to last 24 hours if no timestamp provided
        var threshold = syncSince ?? DateTime.UtcNow.AddDays(-1);
        var now = DateTime.UtcNow;

        // 1. Fetch new messages in user's conversations
        var userConvIds = await _dbContext.ConversationMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => m.ConversationId)
            .ToListAsync(cancellationToken);

        var messages = await _dbContext.Messages
            .AsNoTracking()
            .Include(m => m.Sender)
            .Include(m => m.Attachments).ThenInclude(a => a.MediaFile)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReadStates).ThenInclude(rs => rs.User)
            .Include(m => m.Receipts).ThenInclude(rc => rc.User)
            .Where(m => userConvIds.Contains(m.ConversationId) && !m.IsDeleted &&
                        (m.CreatedAt > threshold || (m.EditedAt.HasValue && m.EditedAt.Value > threshold)))
            .OrderBy(m => m.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        var messageDtos = new List<MessageDto>();
        foreach (var m in messages)
        {
            var attachments = new List<MessageAttachmentDto>();
            foreach (var att in m.Attachments)
            {
                if (att.MediaFile != null && !att.MediaFile.IsDeleted)
                {
                    var dUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);
                    attachments.Add(new MessageAttachmentDto(att.Id, att.MediaFileId, att.MediaFile.OriginalFileName, att.MediaFile.ContentType, att.MediaFile.FileSize, dUrl));
                }
            }

            var reactions = m.Reactions.Select(r => new MessageReactionDto(r.Id, r.UserId, $"{r.User?.FirstName} {r.User?.LastName}", r.Reaction, r.ReactedAt)).ToList();
            var readStates = m.ReadStates.Select(rs => new MessageReadStateDto(rs.UserId, $"{rs.User?.FirstName} {rs.User?.LastName}", rs.ReadAt)).ToList();
            var receipts = m.Receipts.Select(rc => new MessageReceiptDto(rc.UserId, $"{rc.User?.FirstName} {rc.User?.LastName}", rc.DeliveredAt, rc.ReadAt)).ToList();

            messageDtos.Add(new MessageDto(
                m.Id,
                m.ConversationId,
                m.SenderUserId,
                $"{m.Sender?.FirstName} {m.Sender?.LastName}",
                m.Content,
                m.IsEdited,
                m.EditedAt,
                m.CreatedAt,
                attachments,
                reactions,
                readStates,
                m.ClientMessageId,
                receipts
            ));
        }

        // 2. Fetch new notifications for the user
        var notifications = await _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId && n.CreatedAt > threshold)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto(
                n.Id,
                n.Type,
                n.Title,
                n.Body,
                n.EntityType,
                n.EntityId,
                n.IsRead,
                n.CreatedAt,
                n.ReadAt,
                n.TitleKey,
                n.BodyKey,
                n.DataJson,
                n.EventKey
            ))
            .ToListAsync(cancellationToken);

        // 3. Fetch updated tasks
        var taskEntities = await _dbContext.Tasks
            .AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.Site)
            .Include(t => t.AssignedToUser)
            .Where(t => !t.IsDeleted && (t.AssignedToUserId == userId || t.CreatedBy == userId) &&
                        (t.UpdatedAt.HasValue ? t.UpdatedAt.Value > threshold : t.CreatedAt > threshold))
            .OrderByDescending(t => t.UpdatedAt ?? t.CreatedAt)
            .Take(50)
            .ToListAsync(cancellationToken);

        var updatedTasks = taskEntities.Select(t =>
        {
            var closed = t.Status == TaskItemStatus.Completed || t.Status == TaskItemStatus.Cancelled;
            var isOverdue = t.DueAt.HasValue && t.DueAt.Value < now && !closed;
            TimeSpan? remaining = null;
            TimeSpan? overdue = null;
            if (t.DueAt.HasValue && !closed)
            {
                if (t.DueAt.Value >= now) remaining = t.DueAt.Value - now;
                else overdue = now - t.DueAt.Value;
            }

            return new TaskSummaryDto(
                t.Id,
                t.ProjectId,
                t.Project != null ? t.Project.Name : "",
                t.SiteId,
                t.Site?.Name,
                t.Title,
                t.Priority,
                t.Status,
                isOverdue,
                remaining,
                overdue,
                t.AssignedToUserId,
                t.AssignedToUser != null ? $"{t.AssignedToUser.FirstName} {t.AssignedToUser.LastName}" : null,
                t.AssignedToTeamId,
                t.ProgressPercentage,
                t.DueAt,
                t.CreatedBy,
                t.CreatedAt
            );
        }).ToList();

        // 4. Fetch project changes
        var userProjects = await _dbContext.ProjectMembers
            .AsNoTracking()
            .Where(pm => pm.UserId == userId)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        var projectChanges = await _dbContext.Projects
            .AsNoTracking()
            .Where(p => !p.IsDeleted && userProjects.Contains(p.Id) &&
                        (p.UpdatedAt.HasValue ? p.UpdatedAt.Value > threshold : p.CreatedAt > threshold))
            .Select(p => new ProjectSyncDto(
                p.Id,
                p.Code,
                p.Name,
                p.Status.ToString(),
                p.ProgressPercentage,
                p.UpdatedAt ?? p.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(new SyncResponseDto(
            now,
            messageDtos,
            notifications,
            updatedTasks,
            projectChanges
        ));
    }
}

