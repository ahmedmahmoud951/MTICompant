using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Common;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

/// <summary>
/// ORG-12: Assignment History and Audit Trail Service.
/// Permanently preserves assignment transitions (User assigned/removed, Team assigned/removed, Role changed) with reasons and actors.
/// </summary>
public class AssignmentHistoryService : IAssignmentHistoryService
{
    private readonly AppDbContext _context;

    public AssignmentHistoryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task RecordAssignmentAsync(
        string assignmentType,
        string action,
        Guid resourceId,
        string? resourceName,
        Guid? targetUserId,
        Guid? targetTeamId,
        string targetName,
        string? role,
        Guid? assignedBy,
        string? assignedByName,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var record = new AssignmentHistory
        {
            Id = Guid.NewGuid(),
            AssignmentType = assignmentType,
            Action = action,
            ResourceId = resourceId,
            ResourceName = resourceName,
            TargetUserId = targetUserId,
            TargetTeamId = targetTeamId,
            TargetName = targetName,
            Role = role,
            AssignedAt = DateTime.UtcNow,
            AssignedBy = assignedBy,
            AssignedByName = assignedByName,
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        };

        _context.AssignmentHistories.Add(record);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RecordRemovalAsync(
        string assignmentType,
        Guid resourceId,
        string? resourceName,
        Guid? targetUserId,
        Guid? targetTeamId,
        string targetName,
        Guid? removedBy,
        string? removedByName,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        // Try to update the latest open assignment record for this resource and target
        var existing = await _context.AssignmentHistories
            .Where(h => h.AssignmentType == assignmentType
                && h.ResourceId == resourceId
                && (targetUserId.HasValue ? h.TargetUserId == targetUserId : h.TargetTeamId == targetTeamId)
                && h.RemovedAt == null)
            .OrderByDescending(h => h.AssignedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing != null)
        {
            existing.RemovedAt = DateTime.UtcNow;
            existing.RemovedBy = removedBy;
            existing.RemovedByName = removedByName;
            if (!string.IsNullOrWhiteSpace(reason))
            {
                existing.Reason = string.IsNullOrWhiteSpace(existing.Reason)
                    ? reason
                    : $"{existing.Reason}; Removal Reason: {reason}";
            }
        }
        else
        {
            // Create a specific removal log entry
            _context.AssignmentHistories.Add(new AssignmentHistory
            {
                Id = Guid.NewGuid(),
                AssignmentType = assignmentType,
                Action = "Removed",
                ResourceId = resourceId,
                ResourceName = resourceName,
                TargetUserId = targetUserId,
                TargetTeamId = targetTeamId,
                TargetName = targetName,
                AssignedAt = DateTime.UtcNow,
                RemovedAt = DateTime.UtcNow,
                RemovedBy = removedBy,
                RemovedByName = removedByName,
                Reason = reason,
                CreatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResult<AssignmentHistoryDto>> GetHistoryAsync(
        AssignmentHistoryFilterRequest filter,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AssignmentHistories.AsNoTracking().AsQueryable();

        if (filter.ResourceId.HasValue)
            query = query.Where(h => h.ResourceId == filter.ResourceId.Value);

        if (!string.IsNullOrWhiteSpace(filter.AssignmentType))
            query = query.Where(h => h.AssignmentType == filter.AssignmentType);

        if (filter.TargetUserId.HasValue)
            query = query.Where(h => h.TargetUserId == filter.TargetUserId.Value);

        if (filter.TargetTeamId.HasValue)
            query = query.Where(h => h.TargetTeamId == filter.TargetTeamId.Value);

        if (!string.IsNullOrWhiteSpace(filter.Action))
            query = query.Where(h => h.Action == filter.Action);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(h => h.CreatedAt)
            .Skip((filter.PageNumber - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(h => new AssignmentHistoryDto(
                h.Id,
                h.AssignmentType,
                h.Action,
                h.ResourceId,
                h.ResourceName,
                h.TargetUserId,
                h.TargetTeamId,
                h.TargetName,
                h.Role,
                h.AssignedAt,
                h.AssignedBy,
                h.AssignedByName,
                h.RemovedAt,
                h.RemovedBy,
                h.RemovedByName,
                h.Reason,
                h.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<AssignmentHistoryDto>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = filter.PageNumber,
            PageSize = filter.PageSize
        };
    }
}
