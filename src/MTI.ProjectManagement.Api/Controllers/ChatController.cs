using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.SignalR;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IHubContext<ProjectHub> _hubContext;
    private readonly INotificationService _notificationService;
    private readonly IMediaStorageService _mediaStorage;
    private readonly IAuditService _auditService;

    public ChatController(
        IAppDbContext dbContext,
        IHubContext<ProjectHub> hubContext,
        INotificationService notificationService,
        IMediaStorageService mediaStorage,
        IAuditService auditService)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
        _notificationService = notificationService;
        _mediaStorage = mediaStorage;
        _auditService = auditService;
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<List<ConversationSummaryDto>>> GetConversations(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var convs = await _dbContext.Conversations
            .AsNoTracking()
            .Where(c => !c.IsDeleted && c.Members.Any(m => m.UserId == userId))
            .Include(c => c.Project)
            .Include(c => c.Members).ThenInclude(m => m.User)
            .Include(c => c.Messages.Where(m => !m.IsDeleted)).ThenInclude(m => m.Sender)
            .Include(c => c.Messages.Where(m => !m.IsDeleted)).ThenInclude(m => m.ReadStates).ThenInclude(rs => rs.User)
            .OrderByDescending(c => c.Messages.Max(m => (DateTime?)m.CreatedAt) ?? c.CreatedAt)
            .ToListAsync(cancellationToken);

        var list = new List<ConversationSummaryDto>();

        foreach (var c in convs)
        {
            var members = c.Members.Select(m => MapMember(m)).ToList();

            var lastMsg = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
            MessageDto? lastMsgDto = null;
            if (lastMsg != null)
            {
                var readStates = lastMsg.ReadStates.Select(rs => new MessageReadStateDto(
                    rs.UserId,
                    rs.User != null ? $"{rs.User.FirstName} {rs.User.LastName}" : "",
                    rs.ReadAt
                )).ToList();

                lastMsgDto = new MessageDto(
                    lastMsg.Id,
                    lastMsg.ConversationId,
                    lastMsg.SenderUserId,
                    $"{lastMsg.Sender.FirstName} {lastMsg.Sender.LastName}",
                    lastMsg.Content,
                    lastMsg.IsEdited,
                    lastMsg.EditedAt,
                    lastMsg.CreatedAt,
                    new List<MessageAttachmentDto>(),
                    new List<MessageReactionDto>(),
                    readStates
                );
            }

            var unreadCount = await _dbContext.Messages
                .AsNoTracking()
                .Where(m => m.ConversationId == c.Id && !m.IsDeleted && m.SenderUserId != userId &&
                            !m.ReadStates.Any(rs => rs.UserId == userId))
                .CountAsync(cancellationToken);

            var displayTitle = c.Title;
            if (!c.IsGroup)
            {
                var other = c.Members.FirstOrDefault(m => m.UserId != userId)?.User;
                if (other != null)
                    displayTitle = $"{other.FirstName} {other.LastName}";
            }

            list.Add(new ConversationSummaryDto(
                c.Id,
                displayTitle,
                c.IsGroup,
                c.ProjectId,
                c.Project?.Name,
                unreadCount,
                lastMsgDto,
                members,
                c.CreatedAt
            ));
        }

        return Ok(list);
    }

    private static ConversationMemberDto MapMember(ConversationMember m)
    {
        var lastSeen = UserPresenceTracker.GetLastSeen(m.UserId) ?? m.User?.LastLoginAt;
        var isOnline = UserPresenceTracker.IsOnline(m.UserId);
        return new ConversationMemberDto(
            m.UserId,
            m.User != null ? $"{m.User.FirstName} {m.User.LastName}" : "",
            m.User?.Email ?? "",
            m.IsAdmin ? "Admin" : "Member",
            m.JoinedAt,
            lastSeen,
            isOnline
        );
    }

    [HttpGet("contacts")]
    public async Task<ActionResult<List<object>>> GetContacts(
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var currentUserId)) return Unauthorized();

        var query = _dbContext.Users
            .AsNoTracking()
            .Where(u => !u.IsDeleted && u.IsActive && u.Id != currentUserId);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u => u.FirstName.Contains(s) || u.LastName.Contains(s) || u.Email.Contains(s) || (u.JobTitle != null && u.JobTitle.Contains(s)));
        }

        var users = await query
            .Select(u => new
            {
                id = u.Id,
                fullName = $"{u.FirstName} {u.LastName}",
                email = u.Email,
                jobTitle = u.JobTitle,
                role = u.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault() ?? "Member",
                lastLoginAt = u.LastLoginAt
            })
            .Take(40)
            .ToListAsync(cancellationToken);

        var result = users.Select(u => new
        {
            u.id,
            u.fullName,
            u.email,
            u.jobTitle,
            u.role,
            lastSeenAt = UserPresenceTracker.GetLastSeen(u.id) ?? u.lastLoginAt,
            isOnline = UserPresenceTracker.IsOnline(u.id)
        });

        return Ok(result);
    }

    [HttpPost("conversations/direct")]
    public async Task<ActionResult<ConversationSummaryDto>> StartDirectConversation(
        [FromBody] CreateDirectConversationDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        if (dto.OtherUserId == userId)
            return BadRequest(new { message = "Cannot start a conversation with yourself." });

        var otherUser = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.OtherUserId && !u.IsDeleted, cancellationToken);
        if (otherUser == null) return NotFound(new { message = "Recipient user not found." });

        // Check if direct conversation already exists
        var existingConv = await _dbContext.Conversations
            .Include(c => c.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => !c.IsGroup && !c.IsDeleted &&
                                      c.Members.Any(m => m.UserId == userId) &&
                                      c.Members.Any(m => m.UserId == dto.OtherUserId), cancellationToken);

        if (existingConv != null)
        {
            var members = existingConv.Members.Select(MapMember).ToList();

            return Ok(new ConversationSummaryDto(
                existingConv.Id,
                $"{otherUser.FirstName} {otherUser.LastName}",
                false,
                null,
                null,
                0,
                null,
                members,
                existingConv.CreatedAt
            ));
        }

        var conv = new Conversation
        {
            IsGroup = false,
            Title = $"{otherUser.FirstName} {otherUser.LastName}",
            CreatedBy = userId
        };

        conv.Members.Add(new ConversationMember { Conversation = conv, UserId = userId, IsAdmin = true, JoinedAt = DateTime.UtcNow });
        conv.Members.Add(new ConversationMember { Conversation = conv, UserId = dto.OtherUserId, IsAdmin = false, JoinedAt = DateTime.UtcNow });

        _dbContext.Conversations.Add(conv);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var currentUser = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken);
        var memberDtos = new List<ConversationMemberDto>
        {
            new ConversationMemberDto(
                userId,
                $"{currentUser?.FirstName} {currentUser?.LastName}",
                currentUser?.Email ?? "",
                "Admin",
                DateTime.UtcNow,
                UserPresenceTracker.GetLastSeen(userId) ?? currentUser?.LastLoginAt,
                UserPresenceTracker.IsOnline(userId)),
            new ConversationMemberDto(
                otherUser.Id,
                $"{otherUser.FirstName} {otherUser.LastName}",
                otherUser.Email,
                "Member",
                DateTime.UtcNow,
                UserPresenceTracker.GetLastSeen(otherUser.Id) ?? otherUser.LastLoginAt,
                UserPresenceTracker.IsOnline(otherUser.Id))
        };

        return Ok(new ConversationSummaryDto(
            conv.Id,
            conv.Title,
            false,
            null,
            null,
            0,
            null,
            memberDtos,
            conv.CreatedAt
        ));
    }

    [HttpGet("conversations/{id}/messages")]
    public async Task<ActionResult> GetMessages(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken);
        if (!isMember) return Forbid();

        var query = _dbContext.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == id && !m.IsDeleted)
            .Include(m => m.Sender)
            .Include(m => m.Attachments).ThenInclude(a => a.MediaFile)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReadStates).ThenInclude(rs => rs.User);

        var totalCount = await query.CountAsync(cancellationToken);

        var msgs = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var list = new List<MessageDto>();
        foreach (var m in msgs.OrderBy(m => m.CreatedAt))
        {
            var attachments = new List<MessageAttachmentDto>();
            foreach (var att in m.Attachments)
            {
                if (att.MediaFile != null && !att.MediaFile.IsDeleted)
                {
                    var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken);
                    attachments.Add(new MessageAttachmentDto(
                        att.Id,
                        att.MediaFileId,
                        att.MediaFile.OriginalFileName,
                        att.MediaFile.ContentType,
                        att.MediaFile.FileSize,
                        downloadUrl
                    ));
                }
            }

            var reactions = m.Reactions.Select(r => new MessageReactionDto(
                r.Id,
                r.UserId,
                $"{r.User.FirstName} {r.User.LastName}",
                r.Reaction,
                r.ReactedAt
            )).ToList();

            var readStates = m.ReadStates.Select(rs => new MessageReadStateDto(
                rs.UserId,
                $"{rs.User.FirstName} {rs.User.LastName}",
                rs.ReadAt
            )).ToList();

            list.Add(new MessageDto(
                m.Id,
                m.ConversationId,
                m.SenderUserId,
                $"{m.Sender.FirstName} {m.Sender.LastName}",
                m.Content,
                m.IsEdited,
                m.EditedAt,
                m.CreatedAt,
                attachments,
                reactions,
                readStates
            ));
        }

        return Ok(new { items = list, totalCount, page, pageSize });
    }

    [HttpPost("conversations/{id}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(
        Guid id,
        [FromBody] SendMessageDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken);
        if (!isMember) return Forbid();

        var msg = new Message
        {
            ConversationId = id,
            SenderUserId = userId,
            Content = dto.Content ?? string.Empty,
            ReplyToMessageId = dto.ReplyToMessageId,
            CreatedBy = userId
        };

        if (dto.AttachmentMediaIds != null)
        {
            foreach (var mediaId in dto.AttachmentMediaIds)
            {
                msg.Attachments.Add(new MessageAttachment
                {
                    Message = msg,
                    MediaFileId = mediaId
                });
            }
        }

        _dbContext.Messages.Add(msg);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var sender = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        var senderName = $"{sender?.FirstName} {sender?.LastName}";

        var attachments = new List<MessageAttachmentDto>();
        if (dto.AttachmentMediaIds != null)
        {
            var mediaFiles = await _dbContext.MediaFiles.AsNoTracking().Where(m => dto.AttachmentMediaIds.Contains(m.Id)).ToListAsync(cancellationToken);
            foreach (var mf in mediaFiles)
            {
                var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mf.ObjectKey, TimeSpan.FromHours(2), cancellationToken);
                attachments.Add(new MessageAttachmentDto(Guid.NewGuid(), mf.Id, mf.OriginalFileName, mf.ContentType, mf.FileSize, downloadUrl));
            }
        }

        var messageDto = new MessageDto(
            msg.Id,
            msg.ConversationId,
            msg.SenderUserId,
            senderName,
            msg.Content,
            false,
            null,
            msg.CreatedAt,
            attachments,
            new List<MessageReactionDto>(),
            new List<MessageReadStateDto>()
        );

        // Broadcast to conversation group via SignalR
        await _hubContext.Clients.Group($"conversation:{id}").SendAsync("MessageSent", messageDto, cancellationToken);

        // Notify other conversation members if offline / background
        var otherMembers = await _dbContext.ConversationMembers
            .Where(m => m.ConversationId == id && m.UserId != userId)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

        foreach (var memberId in otherMembers)
        {
            await _notificationService.SendNotificationAsync(
                memberId,
                NotificationType.NewMessage,
                $"New message from {senderName}",
                msg.Content.Length > 60 ? msg.Content[..60] + "..." : msg.Content,
                "Conversation",
                id.ToString(),
                cancellationToken);
        }

        return Ok(messageDto);
    }

    [HttpPut("messages/{id}")]
    public async Task<IActionResult> EditMessage(
        Guid id,
        [FromBody] UpdateMessageDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);
        if (msg == null) return NotFound();

        if (msg.SenderUserId != userId) return Forbid();

        msg.Content = dto.Content;
        msg.IsEdited = true;
        msg.EditedAt = DateTime.UtcNow;
        msg.UpdatedBy = userId;
        msg.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageEdited", new
        {
            messageId = msg.Id,
            conversationId = msg.ConversationId,
            content = msg.Content,
            editedAt = msg.EditedAt
        }, cancellationToken);

        return Ok(new { success = true, isEdited = true, content = msg.Content, editedAt = msg.EditedAt });
    }

    [HttpDelete("messages/{id}")]
    public async Task<IActionResult> DeleteMessage(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);
        if (msg == null) return NotFound();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        if (msg.SenderUserId != userId && !isAdmin) return Forbid();

        msg.IsDeleted = true;
        msg.DeletedAt = DateTime.UtcNow;
        msg.DeletedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageDeleted", new
        {
            messageId = msg.Id,
            conversationId = msg.ConversationId
        }, cancellationToken);

        return NoContent();
    }

    [HttpPost("messages/{id}/reactions")]
    public async Task<IActionResult> AddReaction(
        Guid id,
        [FromBody] ToggleReactionDto dto,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);
        if (msg == null) return NotFound();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == msg.ConversationId && m.UserId == userId, cancellationToken);
        if (!isMember) return Forbid();

        var existing = await _dbContext.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == userId && r.Reaction == dto.Reaction, cancellationToken);

        if (existing == null)
        {
            var reaction = new MessageReaction
            {
                MessageId = id,
                UserId = userId,
                Reaction = dto.Reaction,
                ReactedAt = DateTime.UtcNow
            };
            _dbContext.MessageReactions.Add(reaction);
            await _dbContext.SaveChangesAsync(cancellationToken);

            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageReactionAdded", new
            {
                id = reaction.Id,
                messageId = id,
                conversationId = msg.ConversationId,
                userId,
                userName = $"{user?.FirstName} {user?.LastName}",
                reaction = dto.Reaction
            }, cancellationToken);
        }

        return Ok(new { success = true });
    }

    [HttpDelete("messages/{id}/reactions")]
    public async Task<IActionResult> RemoveReaction(
        Guid id,
        [FromQuery] string reaction,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);
        if (msg == null) return NotFound();

        var existing = await _dbContext.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == userId && r.Reaction == reaction, cancellationToken);

        if (existing != null)
        {
            _dbContext.MessageReactions.Remove(existing);
            await _dbContext.SaveChangesAsync(cancellationToken);

            await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageReactionRemoved", new
            {
                messageId = id,
                conversationId = msg.ConversationId,
                userId,
                reaction
            }, cancellationToken);
        }

        return Ok(new { success = true });
    }

    [HttpPost("conversations/{id}/read")]
    public async Task<IActionResult> MarkConversationRead(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken);
        if (!isMember) return Forbid();

        var unreadMessages = await _dbContext.Messages
            .Where(m => m.ConversationId == id && !m.IsDeleted && m.SenderUserId != userId &&
                        !m.ReadStates.Any(rs => rs.UserId == userId))
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var m in unreadMessages)
        {
            _dbContext.MessageReadStates.Add(new MessageReadState
            {
                MessageId = m.Id,
                UserId = userId,
                ReadAt = now
            });
        }

        if (unreadMessages.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            await _hubContext.Clients.Group($"conversation:{id}").SendAsync("MessageRead", new
            {
                conversationId = id,
                userId,
                userName = $"{user?.FirstName} {user?.LastName}",
                readAt = now,
                count = unreadMessages.Count
            }, cancellationToken);
        }

        return Ok(new { success = true, markedCount = unreadMessages.Count });
    }

    [HttpPost("messages/{id}/delivered")]
    public async Task<IActionResult> MarkMessageDelivered(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken);
        if (msg == null) return NotFound();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == msg.ConversationId && m.UserId == userId, cancellationToken);
        if (!isMember) return Forbid();

        await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageDelivered", new
        {
            messageId = id,
            conversationId = msg.ConversationId,
            recipientUserId = userId,
            deliveredAt = DateTime.UtcNow
        }, cancellationToken);

        return Ok(new { success = true });
    }
}
