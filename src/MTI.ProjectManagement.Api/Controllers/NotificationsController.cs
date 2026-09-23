using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Api.Helpers;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly IAppDbContext _dbContext;

    public NotificationsController(IAppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<NotificationSummaryDto>> GetNotifications(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null,
        CancellationToken cancellationToken = default)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly.HasValue && unreadOnly.Value)
        {
            query = query.Where(n => !n.IsRead);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var unreadCount = await _dbContext.Notifications
            .AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead, cancellationToken: cancellationToken);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return Ok(new NotificationSummaryDto(items, totalCount, unreadCount));
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var notification = await _dbContext.Notifications
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken: cancellationToken);

        if (notification == null) return NotFound();

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { success = true, id });
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllAsRead(CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var unread = await _dbContext.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var item in unread)
        {
            item.IsRead = true;
            item.ReadAt = now;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, markedCount = unread.Count });
    }
}

