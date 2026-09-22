using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;

namespace MTI.ProjectManagement.Infrastructure.SignalR;

[Authorize]
public class ProjectHub : Hub
{
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAppDbContext _dbContext;

    public ProjectHub(
        IResourceAuthorizationService resourceAuthorizationService,
        ICurrentUserService currentUserService,
        IAppDbContext dbContext)
    {
        _resourceAuthorizationService = resourceAuthorizationService;
        _currentUserService = currentUserService;
        _dbContext = dbContext;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId.Value}");
            await Groups.AddToGroupAsync(Context.ConnectionId, "global");

            var user = Context.User;
            if (user != null && (user.IsInRole("Admin") || user.IsInRole("SystemAdmin") || user.IsInRole("ProjectManager")))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "admins");
            }

            await Clients.Others.SendAsync("UserOnline", new { userId = userId.Value, timestamp = DateTime.UtcNow });
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Clients.Others.SendAsync("UserOffline", new { userId = userId.Value, timestamp = DateTime.UtcNow });
        }
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinProject(string projectIdStr)
    {
        if (Guid.TryParse(projectIdStr, out var projectId))
        {
            var userId = GetUserId();
            if (userId.HasValue && await _resourceAuthorizationService.CanAccessProjectAsync(userId.Value, projectId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"project:{projectId}");
            }
        }
    }

    public async Task LeaveProject(string projectIdStr)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"project:{projectIdStr}");
    }

    public async Task JoinSite(string siteIdStr)
    {
        if (Guid.TryParse(siteIdStr, out var siteId))
        {
            var userId = GetUserId();
            if (userId.HasValue && await _resourceAuthorizationService.CanAccessSiteAsync(userId.Value, siteId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"site:{siteId}");
            }
        }
    }

    public async Task LeaveSite(string siteIdStr)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"site:{siteIdStr}");
    }

    public async Task JoinConversation(string conversationIdStr)
    {
        if (Guid.TryParse(conversationIdStr, out var conversationId))
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                var isMember = await _dbContext.ConversationMembers
                    .AnyAsync(m => m.ConversationId == conversationId && m.UserId == userId.Value);
                if (isMember)
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation:{conversationIdStr}");
                }
            }
        }
    }

    public async Task LeaveConversation(string conversationIdStr)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation:{conversationIdStr}");
    }

    public async Task StartTyping(string conversationIdStr)
    {
        if (Guid.TryParse(conversationIdStr, out var conversationId))
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                var isMember = await _dbContext.ConversationMembers
                    .AnyAsync(m => m.ConversationId == conversationId && m.UserId == userId.Value);
                if (isMember)
                {
                    await Clients.Group($"conversation:{conversationIdStr}").SendAsync("TypingStarted", new { conversationId = conversationIdStr, userId = userId.Value });
                }
            }
        }
    }

    public async Task StopTyping(string conversationIdStr)
    {
        if (Guid.TryParse(conversationIdStr, out var conversationId))
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                var isMember = await _dbContext.ConversationMembers
                    .AnyAsync(m => m.ConversationId == conversationId && m.UserId == userId.Value);
                if (isMember)
                {
                    await Clients.Group($"conversation:{conversationIdStr}").SendAsync("TypingStopped", new { conversationId = conversationIdStr, userId = userId.Value });
                }
            }
        }
    }

    public async Task AcknowledgeDelivery(string messageIdStr, string conversationIdStr)
    {
        if (Guid.TryParse(messageIdStr, out var messageId) && Guid.TryParse(conversationIdStr, out var conversationId))
        {
            var userId = GetUserId();
            if (userId.HasValue)
            {
                var isMember = await _dbContext.ConversationMembers
                    .AnyAsync(m => m.ConversationId == conversationId && m.UserId == userId.Value);
                if (isMember)
                {
                    await Clients.Group($"conversation:{conversationIdStr}").SendAsync("MessageDelivered", new
                    {
                        messageId = messageId,
                        conversationId = conversationIdStr,
                        recipientUserId = userId.Value,
                        deliveredAt = DateTime.UtcNow
                    });
                }
            }
        }
    }

    private Guid? GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : _currentUserService.UserId;
    }
}
