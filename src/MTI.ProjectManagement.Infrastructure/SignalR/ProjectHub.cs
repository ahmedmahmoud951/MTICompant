using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MTI.ProjectManagement.Application.Contracts;

namespace MTI.ProjectManagement.Infrastructure.SignalR;

[Authorize]
public class ProjectHub : Hub
{
    private readonly IResourceAuthorizationService _resourceAuthorizationService;
    private readonly ICurrentUserService _currentUserService;

    public ProjectHub(
        IResourceAuthorizationService resourceAuthorizationService,
        ICurrentUserService currentUserService)
    {
        _resourceAuthorizationService = resourceAuthorizationService;
        _currentUserService = currentUserService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId.Value}");
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
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation:{conversationIdStr}");
    }

    public async Task LeaveConversation(string conversationIdStr)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation:{conversationIdStr}");
    }

    public async Task StartTyping(string conversationIdStr)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Clients.Group($"conversation:{conversationIdStr}").SendAsync("TypingStarted", new { conversationId = conversationIdStr, userId = userId.Value });
        }
    }

    public async Task StopTyping(string conversationIdStr)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await Clients.Group($"conversation:{conversationIdStr}").SendAsync("TypingStopped", new { conversationId = conversationIdStr, userId = userId.Value });
        }
    }

    private Guid? GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(claim, out var id) ? id : _currentUserService.UserId;
    }
}
