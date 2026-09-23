using System.Security.Claims;
using MTI.ProjectManagement.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Application.Security;
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
    private readonly ICurrentUserService _currentUser;

    public ChatController(
        IAppDbContext dbContext,
        IHubContext<ProjectHub> hubContext,
        INotificationService notificationService,
        IMediaStorageService mediaStorage,
        IAuditService auditService,
        ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _hubContext = hubContext;
        _notificationService = notificationService;
        _mediaStorage = mediaStorage;
        _auditService = auditService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// Accounting role without Chat.View must not access chat contact/direct endpoints.
    /// </summary>
    private bool IsAccountingBlockedFromChat()
    {
        var isAccountingOnly =
            (_currentUser.Roles.Contains("Accounting") || _currentUser.Roles.Contains("Accountant")) &&
            !_currentUser.IsAdmin &&
            !_currentUser.IsSystemAdmin;

        if (!isAccountingOnly) return false;
        return !_currentUser.Permissions.Contains(Permissions.ChatView);
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<List<ConversationSummaryDto>>> GetConversations(CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

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

    /// <summary>CHAT-SECURITY: Returns only users the current user is allowed to chat with.</summary>
    [HttpGet("contacts")]
    [HttpGet("allowed-users")]
    public async Task<ActionResult<List<object>>> GetAllowedUsers(
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        if (IsAccountingBlockedFromChat()) return Forbid();

        if (!UserClaims.TryGetUserId(User, out var currentUserId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");

        IQueryable<User> query;

        if (isAdmin)
        {
            // Admins can chat with all active users
            query = _dbContext.Users
                .AsNoTracking()
                .Where(u => !u.IsDeleted && u.IsActive && u.Id != currentUserId);
        }
        else
        {
            // CHAT-SECURITY: A user can only see/chat with users sharing the same project or site.
            // Accounting users do NOT automatically see engineering chats.
            var myProjectIds = await _dbContext.ProjectMembers
                .Where(pm => pm.UserId == currentUserId)
                .Select(pm => pm.ProjectId)
                .ToListAsync(cancellationToken);

            var mySiteIds = await _dbContext.SiteAssignments
                .Where(sa => sa.UserId == currentUserId && sa.RemovedAt == null)
                .Select(sa => sa.SiteId)
                .ToListAsync(cancellationToken);

            var sharedProjectUserIds = await _dbContext.ProjectMembers
                .Where(pm => myProjectIds.Contains(pm.ProjectId) && pm.UserId != currentUserId)
                .Select(pm => pm.UserId)
                .ToListAsync(cancellationToken);

            var sharedSiteUserIds = await _dbContext.SiteAssignments
                .Where(sa => mySiteIds.Contains(sa.SiteId) && sa.UserId != currentUserId && sa.RemovedAt == null)
                .Select(sa => sa.UserId)
                .ToListAsync(cancellationToken);

            var allowedIds = sharedProjectUserIds.Concat(sharedSiteUserIds).Distinct().ToList();

            // Also always allow chatting with admins/project managers
            var adminRoleUserIds = await _dbContext.UserRoles
                .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" || ur.Role.Name == "ProjectManager" || ur.Role.Name == "SuperAdmin")
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            allowedIds = allowedIds.Concat(adminRoleUserIds).Where(id => id != currentUserId).Distinct().ToList();

            query = _dbContext.Users
                .AsNoTracking()
                .Where(u => allowedIds.Contains(u.Id) && !u.IsDeleted && u.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(u => u.FirstName.Contains(s) || u.LastName.Contains(s) || u.Email.Contains(s));
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
            .Take(50)
            .ToListAsync(cancellationToken);

        var result = users.Select(u => (object)new
        {
            u.id, u.fullName, u.email, u.jobTitle, u.role,
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
        if (IsAccountingBlockedFromChat()) return Forbid();

        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        if (dto.OtherUserId == userId)
            return BadRequest(new { message = "Cannot start a conversation with yourself." });

        var otherUser = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.OtherUserId && !u.IsDeleted, cancellationToken: cancellationToken);
        if (otherUser == null) return NotFound(new { message = "Recipient user not found." });

        // CHAT-SECURITY: Verify users are allowed to communicate (shared project/site or admin role)
        var isCurrentAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        if (!isCurrentAdmin)
        {
            var canChat = await CanChatWithAsync(userId, dto.OtherUserId, ct: cancellationToken);
            if (!canChat)
                return StatusCode(403, new { message = "You are not allowed to initiate a chat with this user based on current project/site assignments." });
        }

        // Normalize & sort IDs to create deterministic DirectConversationKey (PROMPT CHAT-02)
        var minId = userId.CompareTo(dto.OtherUserId) < 0 ? userId : dto.OtherUserId;
        var maxId = userId.CompareTo(dto.OtherUserId) < 0 ? dto.OtherUserId : userId;
        var directKey = $"direct:{minId}:{maxId}";

        // Check if direct conversation already exists by deterministic key
        var existingConv = await _dbContext.Conversations
            .Include(c => c.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => !c.IsDeleted && c.DirectConversationKey == directKey, cancellationToken: cancellationToken);

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
            Type = ConversationType.Direct,
            DirectConversationKey = directKey,
            Title = $"{otherUser.FirstName} {otherUser.LastName}",
            CreatedBy = userId
        };

        conv.Members.Add(new ConversationMember { Conversation = conv, UserId = userId, IsAdmin = true, JoinedAt = DateTime.UtcNow });
        conv.Members.Add(new ConversationMember { Conversation = conv, UserId = dto.OtherUserId, IsAdmin = false, JoinedAt = DateTime.UtcNow });

        _dbContext.Conversations.Add(conv);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Concurrent creation caught by unique index
            var reloaded = await _dbContext.Conversations
                .Include(c => c.Members).ThenInclude(m => m.User)
                .FirstOrDefaultAsync(c => !c.IsDeleted && c.DirectConversationKey == directKey, cancellationToken: cancellationToken);

            if (reloaded != null)
            {
                var members = reloaded.Members.Select(MapMember).ToList();
                return Ok(new ConversationSummaryDto(
                    reloaded.Id,
                    $"{otherUser.FirstName} {otherUser.LastName}",
                    false,
                    null,
                    null,
                    0,
                    null,
                    members,
                    reloaded.CreatedAt
                ));
            }
            throw;
        }

        var currentUser = await _dbContext.Users.FindAsync(new object[] { userId }, cancellationToken: cancellationToken);
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

    [HttpPost("conversations/project")]
    public async Task<ActionResult<ConversationSummaryDto>> GetOrCreateProjectConversation(
        [FromBody] CreateProjectConversationDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var project = await _dbContext.Projects
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dto.ProjectId && !p.IsDeleted, cancellationToken);
        if (project == null) return NotFound(new { message = "Project not found." });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        if (!isAdmin)
        {
            var isMember = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == dto.ProjectId && pm.UserId == userId, cancellationToken);
            if (!isMember)
                return StatusCode(403, new { message = "Only project members can join the project conversation." });
        }

        var uniqueKey = $"project:{dto.ProjectId}";
        var existing = await _dbContext.Conversations
            .Include(c => c.Members).ThenInclude(m => m.User)
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c => !c.IsDeleted && c.DirectConversationKey == uniqueKey, cancellationToken);

        if (existing != null)
        {
            if (!existing.Members.Any(m => m.UserId == userId))
            {
                existing.Members.Add(new ConversationMember
                {
                    ConversationId = existing.Id,
                    UserId = userId,
                    IsAdmin = isAdmin,
                    JoinedAt = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync(cancellationToken);
                existing = await _dbContext.Conversations
                    .Include(c => c.Members).ThenInclude(m => m.User)
                    .Include(c => c.Project)
                    .FirstAsync(c => c.Id == existing.Id, cancellationToken);
            }

            return Ok(new ConversationSummaryDto(
                existing.Id,
                existing.Title ?? project.Name,
                true,
                existing.ProjectId,
                existing.Project?.Name ?? project.Name,
                0,
                null,
                existing.Members.Select(MapMember).ToList(),
                existing.CreatedAt,
                ConversationType.Project.ToString()));
        }

        var memberUserIds = await _dbContext.ProjectMembers
            .Where(pm => pm.ProjectId == dto.ProjectId)
            .Select(pm => pm.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (!memberUserIds.Contains(userId))
            memberUserIds.Add(userId);

        var conv = new Conversation
        {
            IsGroup = true,
            Type = ConversationType.Project,
            ProjectId = dto.ProjectId,
            DirectConversationKey = uniqueKey,
            Title = project.Name,
            CreatedBy = userId
        };

        foreach (var mid in memberUserIds)
        {
            conv.Members.Add(new ConversationMember
            {
                Conversation = conv,
                UserId = mid,
                IsAdmin = mid == userId,
                JoinedAt = DateTime.UtcNow
            });
        }

        _dbContext.Conversations.Add(conv);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            var reloaded = await _dbContext.Conversations
                .Include(c => c.Members).ThenInclude(m => m.User)
                .Include(c => c.Project)
                .FirstOrDefaultAsync(c => !c.IsDeleted && c.DirectConversationKey == uniqueKey, cancellationToken);
            if (reloaded != null)
            {
                return Ok(new ConversationSummaryDto(
                    reloaded.Id,
                    reloaded.Title ?? project.Name,
                    true,
                    reloaded.ProjectId,
                    reloaded.Project?.Name ?? project.Name,
                    0,
                    null,
                    reloaded.Members.Select(MapMember).ToList(),
                    reloaded.CreatedAt,
                    ConversationType.Project.ToString()));
            }
            throw;
        }

        var saved = await _dbContext.Conversations
            .Include(c => c.Members).ThenInclude(m => m.User)
            .Include(c => c.Project)
            .FirstAsync(c => c.Id == conv.Id, cancellationToken);

        return Ok(new ConversationSummaryDto(
            saved.Id,
            saved.Title,
            true,
            saved.ProjectId,
            saved.Project?.Name ?? project.Name,
            0,
            null,
            saved.Members.Select(MapMember).ToList(),
            saved.CreatedAt,
            ConversationType.Project.ToString()));
    }

    [HttpPost("conversations/site")]
    public async Task<ActionResult<ConversationSummaryDto>> GetOrCreateSiteConversation(
        [FromBody] CreateSiteConversationDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var site = await _dbContext.Sites
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == dto.SiteId && !s.IsDeleted, cancellationToken);
        if (site == null) return NotFound(new { message = "Site not found." });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("SuperAdmin");
        if (!isAdmin)
        {
            var assignedToSite = await _dbContext.SiteAssignments
                .AnyAsync(sa => sa.SiteId == dto.SiteId && sa.UserId == userId && sa.RemovedAt == null, cancellationToken);
            var projectMember = await _dbContext.ProjectMembers
                .AnyAsync(pm => pm.ProjectId == site.ProjectId && pm.UserId == userId, cancellationToken);
            if (!assignedToSite && !projectMember)
                return StatusCode(403, new { message = "Only site/project assigned users can join the site conversation." });
        }

        var uniqueKey = $"site:{dto.SiteId}";
        var existing = await _dbContext.Conversations
            .Include(c => c.Members).ThenInclude(m => m.User)
            .Include(c => c.Site)
            .FirstOrDefaultAsync(c => !c.IsDeleted && c.DirectConversationKey == uniqueKey, cancellationToken);

        if (existing != null)
        {
            if (!existing.Members.Any(m => m.UserId == userId))
            {
                existing.Members.Add(new ConversationMember
                {
                    ConversationId = existing.Id,
                    UserId = userId,
                    IsAdmin = isAdmin,
                    JoinedAt = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync(cancellationToken);
                existing = await _dbContext.Conversations
                    .Include(c => c.Members).ThenInclude(m => m.User)
                    .Include(c => c.Site)
                    .FirstAsync(c => c.Id == existing.Id, cancellationToken);
            }

            return Ok(new ConversationSummaryDto(
                existing.Id,
                existing.Title ?? site.Name,
                true,
                site.ProjectId,
                null,
                0,
                null,
                existing.Members.Select(MapMember).ToList(),
                existing.CreatedAt,
                ConversationType.Site.ToString()));
        }

        var siteUserIds = await _dbContext.SiteAssignments
            .Where(sa => sa.SiteId == dto.SiteId && sa.RemovedAt == null)
            .Select(sa => sa.UserId)
            .ToListAsync(cancellationToken);

        var projectUserIds = await _dbContext.ProjectMembers
            .Where(pm => pm.ProjectId == site.ProjectId)
            .Select(pm => pm.UserId)
            .ToListAsync(cancellationToken);

        var memberUserIds = siteUserIds.Concat(projectUserIds).Distinct().ToList();
        if (!memberUserIds.Contains(userId))
            memberUserIds.Add(userId);

        var conv = new Conversation
        {
            IsGroup = true,
            Type = ConversationType.Site,
            ProjectId = site.ProjectId,
            SiteId = dto.SiteId,
            DirectConversationKey = uniqueKey,
            Title = site.Name,
            CreatedBy = userId
        };

        foreach (var mid in memberUserIds)
        {
            conv.Members.Add(new ConversationMember
            {
                Conversation = conv,
                UserId = mid,
                IsAdmin = mid == userId,
                JoinedAt = DateTime.UtcNow
            });
        }

        _dbContext.Conversations.Add(conv);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            var reloaded = await _dbContext.Conversations
                .Include(c => c.Members).ThenInclude(m => m.User)
                .FirstOrDefaultAsync(c => !c.IsDeleted && c.DirectConversationKey == uniqueKey, cancellationToken);
            if (reloaded != null)
            {
                return Ok(new ConversationSummaryDto(
                    reloaded.Id,
                    reloaded.Title ?? site.Name,
                    true,
                    site.ProjectId,
                    null,
                    0,
                    null,
                    reloaded.Members.Select(MapMember).ToList(),
                    reloaded.CreatedAt,
                    ConversationType.Site.ToString()));
            }
            throw;
        }

        var saved = await _dbContext.Conversations
            .Include(c => c.Members).ThenInclude(m => m.User)
            .FirstAsync(c => c.Id == conv.Id, cancellationToken);

        return Ok(new ConversationSummaryDto(
            saved.Id,
            saved.Title,
            true,
            site.ProjectId,
            null,
            0,
            null,
            saved.Members.Select(MapMember).ToList(),
            saved.CreatedAt,
            ConversationType.Site.ToString()));
    }

    [HttpGet("conversations/{id}/messages")]
    public async Task<ActionResult> GetMessages(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken: cancellationToken);
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
                    var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);
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
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken: cancellationToken);
        if (!isMember) return Forbid();

        // 1. Idempotency Check (Prompt CHAT-01: ClientMessageId must be unique per sender)
        // Prevents duplicate creation on SignalR reconnects, HTTP retries, frontend retries, and network timeouts.
        if (!string.IsNullOrWhiteSpace(dto.ClientMessageId))
        {
            var existing = await _dbContext.Messages
                .Include(m => m.Sender)
                .Include(m => m.Attachments).ThenInclude(a => a.MediaFile)
                .Include(m => m.Reactions).ThenInclude(r => r.User)
                .Include(m => m.ReadStates).ThenInclude(rs => rs.User)
                .Include(m => m.Receipts).ThenInclude(rc => rc.User)
                .FirstOrDefaultAsync(m => m.SenderUserId == userId && m.ClientMessageId == dto.ClientMessageId, cancellationToken: cancellationToken);

            if (existing != null)
            {
                var existingAttachments = new List<MessageAttachmentDto>();
                foreach (var att in existing.Attachments)
                {
                    if (att.MediaFile != null && !att.MediaFile.IsDeleted)
                    {
                        var dUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);
                        existingAttachments.Add(new MessageAttachmentDto(att.Id, att.MediaFileId, att.MediaFile.OriginalFileName, att.MediaFile.ContentType, att.MediaFile.FileSize, dUrl));
                    }
                }
                var existingReactions = existing.Reactions.Select(r => new MessageReactionDto(r.Id, r.UserId, $"{r.User?.FirstName} {r.User?.LastName}", r.Reaction, r.ReactedAt)).ToList();
                var existingReadStates = existing.ReadStates.Select(rs => new MessageReadStateDto(rs.UserId, $"{rs.User?.FirstName} {rs.User?.LastName}", rs.ReadAt)).ToList();
                var existingReceipts = existing.Receipts.Select(rc => new MessageReceiptDto(rc.UserId, $"{rc.User?.FirstName} {rc.User?.LastName}", rc.DeliveredAt, rc.ReadAt)).ToList();

                var existingDto = new MessageDto(
                    existing.Id,
                    existing.ConversationId,
                    existing.SenderUserId,
                    $"{existing.Sender?.FirstName} {existing.Sender?.LastName}",
                    existing.Content,
                    existing.IsEdited,
                    existing.EditedAt,
                    existing.CreatedAt,
                    existingAttachments,
                    existingReactions,
                    existingReadStates,
                    existing.ClientMessageId,
                    existingReceipts
                );

                return Ok(existingDto);
            }
        }

        var clientMsgId = !string.IsNullOrWhiteSpace(dto.ClientMessageId) ? dto.ClientMessageId : Guid.NewGuid().ToString("N");
        var msg = new Message
        {
            ConversationId = id,
            SenderUserId = userId,
            ClientMessageId = clientMsgId,
            Type = (dto.AttachmentMediaIds != null && dto.AttachmentMediaIds.Count > 0) ? "File" : "Text",
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
                    MediaFileId = mediaId,
                    Type = "File"
                });
            }
        }

        _dbContext.Messages.Add(msg);

        // Update conversation last message pointers
        var conv = await _dbContext.Conversations.FirstOrDefaultAsync(c => c.Id == id, cancellationToken: cancellationToken);
        if (conv != null)
        {
            conv.LastMessageId = msg.Id;
            conv.LastMessageAt = msg.CreatedAt;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var sender = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken: cancellationToken);
        var senderName = $"{sender?.FirstName} {sender?.LastName}";

        var attachments = new List<MessageAttachmentDto>();
        if (dto.AttachmentMediaIds != null)
        {
            var mediaFiles = await _dbContext.MediaFiles.AsNoTracking().Where(m => dto.AttachmentMediaIds.Contains(m.Id)).ToListAsync(cancellationToken);
            foreach (var mf in mediaFiles)
            {
                var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(mf.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);
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
            new List<MessageReadStateDto>(),
            msg.ClientMessageId,
            new List<MessageReceiptDto>()
        );

        // Broadcast to conversation group via SignalR (PROMPT REALTIME-01: MessageCreated)
        await _hubContext.Clients.Group($"conversation:{id}").SendAsync("MessageCreated", messageDto, cancellationToken: cancellationToken);
        await _hubContext.Clients.Group($"conversation:{id}").SendAsync("MessageSent", messageDto, cancellationToken: cancellationToken);

        // Notify other conversation members using centralized notification service with EventKey deduplication (PROMPT NOTIFY-01)
        var otherMembers = await _dbContext.ConversationMembers
            .Where(m => m.ConversationId == id && m.UserId != userId)
            .Select(m => m.UserId)
            .ToListAsync(cancellationToken);

        foreach (var memberId in otherMembers)
        {
            await _notificationService.NotifyChatMessageAsync(
                id, msg.Id, userId, senderName ?? "User", memberId, cancellationToken);
        }

        return Ok(messageDto);
    }

    [HttpPut("messages/{id}")]
    public async Task<IActionResult> EditMessage(
        Guid id,
        [FromBody] UpdateMessageDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);
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
        }, cancellationToken: cancellationToken);

        return Ok(new { success = true, isEdited = true, content = msg.Content, editedAt = msg.EditedAt });
    }

    [HttpDelete("messages/{id}")]
    public async Task<IActionResult> DeleteMessage(Guid id, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);
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
        }, cancellationToken: cancellationToken);

        return NoContent();
    }

    [HttpPost("messages/{id}/reactions")]
    public async Task<IActionResult> AddReaction(
        Guid id,
        [FromBody] ToggleReactionDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);
        if (msg == null) return NotFound();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == msg.ConversationId && m.UserId == userId, cancellationToken: cancellationToken);
        if (!isMember) return Forbid();

        var existing = await _dbContext.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == userId && r.Reaction == dto.Reaction, cancellationToken: cancellationToken);

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

            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken: cancellationToken);

            await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageReactionAdded", new
            {
                id = reaction.Id,
                messageId = id,
                conversationId = msg.ConversationId,
                userId,
                userName = $"{user?.FirstName} {user?.LastName}",
                reaction = dto.Reaction
            }, cancellationToken: cancellationToken);
        }

        return Ok(new { success = true });
    }

    [HttpDelete("messages/{id}/reactions")]
    public async Task<IActionResult> RemoveReaction(
        Guid id,
        [FromQuery] string reaction,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);
        if (msg == null) return NotFound();

        var existing = await _dbContext.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == userId && r.Reaction == reaction, cancellationToken: cancellationToken);

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
            }, cancellationToken: cancellationToken);
        }

        return Ok(new { success = true });
    }

    [HttpPost("conversations/{id}/read")]
    public async Task<IActionResult> MarkConversationRead(Guid id, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken: cancellationToken);
        if (!isMember) return Forbid();

        var unreadMessages = await _dbContext.Messages
            .Where(m => m.ConversationId == id && !m.IsDeleted && m.SenderUserId != userId &&
                        !m.ReadStates.Any(rs => rs.UserId == userId))
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var member = await _dbContext.ConversationMembers.FirstOrDefaultAsync(m => m.ConversationId == id && m.UserId == userId, cancellationToken: cancellationToken);
        if (member != null)
        {
            member.LastReadMessageId = unreadMessages.LastOrDefault()?.Id ?? member.LastReadMessageId;
            member.LastReadAt = now;
        }

        foreach (var m in unreadMessages)
        {
            _dbContext.MessageReadStates.Add(new MessageReadState
            {
                MessageId = m.Id,
                UserId = userId,
                ReadAt = now
            });

            // Prompt CHAT-01: MessageReceipts UNIQUE(MessageId, UserId)
            var receipt = await _dbContext.MessageReceipts.FirstOrDefaultAsync(r => r.MessageId == m.Id && r.UserId == userId, cancellationToken: cancellationToken);
            if (receipt == null)
            {
                _dbContext.MessageReceipts.Add(new MessageReceipt
                {
                    MessageId = m.Id,
                    UserId = userId,
                    DeliveredAt = now,
                    ReadAt = now
                });
            }
            else
            {
                receipt.ReadAt = now;
            }
        }

        if (unreadMessages.Count > 0 || member != null)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);

            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken: cancellationToken);

            await _hubContext.Clients.Group($"conversation:{id}").SendAsync("MessageRead", new
            {
                conversationId = id,
                userId,
                userName = $"{user?.FirstName} {user?.LastName}",
                readAt = now,
                count = unreadMessages.Count
            }, cancellationToken: cancellationToken);
        }

        return Ok(new { success = true, markedCount = unreadMessages.Count });
    }

    [HttpPost("messages/{id}/delivered")]
    public async Task<IActionResult> MarkMessageDelivered(Guid id, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var msg = await _dbContext.Messages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken: cancellationToken);
        if (msg == null) return NotFound();

        var isMember = await _dbContext.ConversationMembers.AnyAsync(m => m.ConversationId == msg.ConversationId && m.UserId == userId, cancellationToken: cancellationToken);
        if (!isMember) return Forbid();

        var now = DateTime.UtcNow;
        var receipt = await _dbContext.MessageReceipts.FirstOrDefaultAsync(r => r.MessageId == id && r.UserId == userId, cancellationToken: cancellationToken);
        if (receipt == null)
        {
            _dbContext.MessageReceipts.Add(new MessageReceipt
            {
                MessageId = id,
                UserId = userId,
                DeliveredAt = now
            });
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (!receipt.DeliveredAt.HasValue)
        {
            receipt.DeliveredAt = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        await _hubContext.Clients.Group($"conversation:{msg.ConversationId}").SendAsync("MessageDelivered", new
        {
            messageId = id,
            conversationId = msg.ConversationId,
            recipientUserId = userId,
            deliveredAt = now
        }, cancellationToken: cancellationToken);

        return Ok(new { success = true });
    }

    [HttpGet("messages/{id}/receipts")]
    public async Task<ActionResult<List<MessageReceiptDto>>> GetMessageReceipts(Guid id, CancellationToken cancellationToken)
    {
        var receipts = await _dbContext.MessageReceipts
            .AsNoTracking()
            .Include(r => r.User)
            .Where(r => r.MessageId == id)
            .Select(r => new MessageReceiptDto(
                r.UserId,
                r.User != null ? $"{r.User.FirstName} {r.User.LastName}" : "",
                r.DeliveredAt,
                r.ReadAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(receipts);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // CHAT-SECURITY: business-rule enforcement helpers
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /// <summary>
    /// Returns true if userA and userB share at least one project or site,
    /// OR if targetUser is an admin/project-manager (always reachable).
    /// </summary>
    private async Task<bool> CanChatWithAsync(Guid userA, Guid userB, CancellationToken ct)
    {
        // Admins/PM are always reachable
        var targetIsAdmin = await _dbContext.UserRoles.AnyAsync(
            ur => ur.UserId == userB &&
                  (ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" ||
                   ur.Role.Name == "ProjectManager" || ur.Role.Name == "SuperAdmin"), ct);
        if (targetIsAdmin) return true;

        // Check shared project
        var sharedProject = await _dbContext.ProjectMembers
            .AnyAsync(pm => pm.UserId == userA &&
                _dbContext.ProjectMembers.Any(pm2 => pm2.UserId == userB && pm2.ProjectId == pm.ProjectId), ct);
        if (sharedProject) return true;

        // Check shared site
        var sharedSite = await _dbContext.SiteAssignments
            .AnyAsync(sa => sa.UserId == userA && sa.RemovedAt == null &&
                _dbContext.SiteAssignments.Any(sa2 => sa2.UserId == userB && sa2.SiteId == sa.SiteId && sa2.RemovedAt == null), ct);

        return sharedSite;
    }
}

