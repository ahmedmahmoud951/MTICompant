using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,SystemAdmin")]
public class AuditController : ControllerBase
{
    private readonly IAppDbContext _dbContext;

    public AuditController(IAppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult> GetLogs(
        [FromQuery] AuditLogFilterParams filter,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (filter.UserId.HasValue)
            query = query.Where(a => a.UserId == filter.UserId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Action))
            query = query.Where(a => a.Action.ToLower() == filter.Action.ToLower());

        if (!string.IsNullOrWhiteSpace(filter.EntityType))
            query = query.Where(a => a.EntityType.ToLower() == filter.EntityType.ToLower());

        if (!string.IsNullOrWhiteSpace(filter.EntityId))
            query = query.Where(a => a.EntityId == filter.EntityId);

        if (filter.DateFrom.HasValue)
            query = query.Where(a => a.CreatedAt >= filter.DateFrom.Value);

        if (filter.DateTo.HasValue)
            query = query.Where(a => a.CreatedAt <= filter.DateTo.Value);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(a => (a.User != null && a.User.Email.ToLower().Contains(term)) ||
                                     a.Action.ToLower().Contains(term) ||
                                     a.EntityType.ToLower().Contains(term) ||
                                     (a.NewValues != null && a.NewValues.ToLower().Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(a => new AuditLogDto(
                a.Id,
                a.UserId,
                a.User != null ? a.User.Email : null,
                a.Action,
                a.EntityType,
                a.EntityId,
                a.OldValues,
                a.NewValues,
                a.IpAddress,
                a.UserAgent,
                a.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Ok(new { items = logs, totalCount, page = filter.Page, pageSize = filter.PageSize });
    }
}
