using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Api.Helpers;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Application.DTOs;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly IAppDbContext _dbContext;
    private readonly IResourceAuthorizationService _resourceAuthorization;
    private readonly INotificationService _notificationService;
    private readonly IAuditService _auditService;
    private readonly IMediaStorageService _mediaStorage;

    public TasksController(
        IAppDbContext dbContext,
        IResourceAuthorizationService resourceAuthorization,
        INotificationService notificationService,
        IAuditService auditService,
        IMediaStorageService mediaStorage)
    {
        _dbContext = dbContext;
        _resourceAuthorization = resourceAuthorization;
        _notificationService = notificationService;
        _auditService = auditService;
        _mediaStorage = mediaStorage;
    }

    [HttpPost]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<ActionResult<TaskDetailDto>> Create(
        [FromBody] CreateTaskDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Task title is required." });

        var projectExists = await _dbContext.Projects.AnyAsync(p => p.Id == dto.ProjectId, cancellationToken: cancellationToken);
        if (!projectExists) return BadRequest(new { message = "Project not found." });

        if (dto.AssignedToUserId.HasValue)
        {
            var assigneeOk = await _dbContext.Users.AnyAsync(
                u => u.Id == dto.AssignedToUserId.Value && u.IsActive && !u.IsDeleted, cancellationToken: cancellationToken);
            if (!assigneeOk) return BadRequest(new { message = "Assigned user is invalid or inactive." });
        }

        var task = new TaskItem
        {
            ProjectId = dto.ProjectId,
            SiteId = dto.SiteId,
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Priority = dto.Priority,
            Status = dto.Status ?? TaskItemStatus.ToDo,
            AssignedToUserId = dto.AssignedToUserId,
            AssignedToTeamId = dto.AssignedToTeamId,
            ProgressPercentage = dto.ProgressPercentage ?? 0,
            StartAt = dto.StartAt,
            DueAt = dto.DueAt,
            CreatedBy = userId
        };

        if (dto.AssignedToUserId.HasValue)
        {
            task.Assignments.Add(new TaskAssignment
            {
                TaskItem = task,
                UserId = dto.AssignedToUserId.Value,
                AssignedBy = userId,
                AssignedAt = DateTime.UtcNow
            });

            // Ensure assignee can see the project
            var isMember = await _dbContext.ProjectMembers.AnyAsync(
                pm => pm.ProjectId == dto.ProjectId && pm.UserId == dto.AssignedToUserId.Value, cancellationToken: cancellationToken);
            if (!isMember)
            {
                _dbContext.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = dto.ProjectId,
                    UserId = dto.AssignedToUserId.Value,
                    Role = "Engineer",
                    JoinedAt = DateTime.UtcNow
                });
            }

            // If task has a site, also assign engineer to that site
            if (dto.SiteId.HasValue)
            {
                var hasSite = await _dbContext.SiteAssignments.AnyAsync(
                    sa => sa.SiteId == dto.SiteId.Value && sa.UserId == dto.AssignedToUserId.Value && sa.RemovedAt == null,
                    cancellationToken: cancellationToken);
                if (!hasSite)
                {
                    _dbContext.SiteAssignments.Add(new SiteAssignment
                    {
                        SiteId = dto.SiteId.Value,
                        UserId = dto.AssignedToUserId.Value,
                        Role = "Engineer",
                        IsPrimary = false,
                        AssignedAt = DateTime.UtcNow,
                        AssignedBy = userId
                    });
                }
            }
        }

        task.StatusHistory.Add(new TaskStatusHistory
        {
            TaskItem = task,
            OldStatus = TaskItemStatus.ToDo,
            NewStatus = TaskItemStatus.ToDo,
            Reason = "Task created",
            ChangedBy = userId,
            ChangedAt = DateTime.UtcNow
        });

        if (dto.AttachmentMediaIds != null)
        {
            foreach (var mediaId in dto.AttachmentMediaIds)
            {
                task.Attachments.Add(new TaskAttachment
                {
                    TaskItem = task,
                    MediaFileId = mediaId,
                    AttachedAt = DateTime.UtcNow
                });
            }
        }

        _dbContext.Tasks.Add(task);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Create",
            "TaskItem",
            task.Id.ToString(),
            null,
            new { task.Title, task.ProjectId, task.SiteId, task.AssignedToUserId, task.Priority },
            cancellationToken: cancellationToken);

        // SignalR & Notifications — deliver to assignee group user:{id}
        if (dto.AssignedToUserId.HasValue)
        {
            await _notificationService.NotifyTaskAssignedAsync(
                task.Id, task.Title, dto.AssignedToUserId.Value, cancellationToken);

            await _notificationService.BroadcastToUserAsync(
                dto.AssignedToUserId.Value,
                "TaskAssigned",
                new { taskId = task.Id, title = task.Title, projectId = task.ProjectId },
                cancellationToken: cancellationToken);
        }

        if (task.SiteId.HasValue)
        {
            await _notificationService.BroadcastToSiteAsync(task.SiteId.Value, "TaskCreated", new { taskId = task.Id, title = task.Title }, cancellationToken: cancellationToken);
        }
        await _notificationService.BroadcastGlobalAsync("TaskCreated", new { taskId = task.Id, title = task.Title }, cancellationToken: cancellationToken);

        return await GetById(task.Id, cancellationToken: cancellationToken);
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] TaskFilterParams filter,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("ProjectManager");

        var query = _dbContext.Tasks
            .AsNoTracking()
            .Where(t => !t.IsDeleted);

        // Engineers: tasks assigned to them OR within authorized sites
        if (!isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken: cancellationToken);
            query = query.Where(t =>
                t.AssignedToUserId == userId
                || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value))
                || t.Assignments.Any(a => a.UserId == userId));
        }

        if (filter.ProjectId.HasValue) query = query.Where(t => t.ProjectId == filter.ProjectId.Value);
        if (filter.SiteId.HasValue) query = query.Where(t => t.SiteId == filter.SiteId.Value);
        if (filter.AssignedToUserId.HasValue) query = query.Where(t => t.AssignedToUserId == filter.AssignedToUserId.Value);
        if (filter.Status.HasValue) query = query.Where(t => t.Status == filter.Status.Value);
        if (filter.Priority.HasValue) query = query.Where(t => t.Priority == filter.Priority.Value);
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(term) || t.Description.ToLower().Contains(term));
        }

        var now = DateTime.UtcNow;
        if (filter.OverdueOnly.HasValue && filter.OverdueOnly.Value)
        {
            query = query.Where(t => t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled);
        }

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize < 1 ? 50 : Math.Min(filter.PageSize, 200);

        var totalCount = await query.CountAsync(cancellationToken);

        var list = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                t.Id,
                t.ProjectId,
                ProjectName = t.Project.Name,
                t.SiteId,
                SiteName = t.Site != null ? t.Site.Name : null,
                t.Title,
                t.Priority,
                t.Status,
                t.DueAt,
                t.AssignedToUserId,
                AssignedToName = t.AssignedToUser != null ? t.AssignedToUser.FirstName + " " + t.AssignedToUser.LastName : null,
                t.AssignedToTeamId,
                t.ProgressPercentage,
                t.CreatedBy,
                t.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var items = list.Select(t =>
        {
            var (isOverdue, remaining, overdue) = ComputeDeadline(t.DueAt, t.Status, now);
            return new TaskSummaryDto(
                t.Id,
                t.ProjectId,
                t.ProjectName,
                t.SiteId,
                t.SiteName,
                t.Title,
                t.Priority,
                t.Status,
                isOverdue,
                remaining,
                overdue,
                t.AssignedToUserId,
                t.AssignedToName,
                t.AssignedToTeamId,
                t.ProgressPercentage,
                t.DueAt,
                t.CreatedBy,
                t.CreatedAt
            );
        }).ToList();

        return Ok(new { items, totalCount, page, pageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDetailDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks
            .AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.Site)
            .Include(t => t.AssignedToUser)
            .Include(t => t.Assignments)
            .Include(t => t.Comments).ThenInclude(c => c.Author)
            .Include(t => t.Attachments).ThenInclude(a => a.MediaFile)
            .Include(t => t.StatusHistory)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken: cancellationToken);

        if (task == null) return NotFound(new { message = "Task not found." });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("ProjectManager");
        if (!isAdmin && task.AssignedToUserId != userId)
        {
            var viaAssignment = task.Assignments?.Any(a => a.UserId == userId) == true;
            if (!viaAssignment && task.SiteId.HasValue)
            {
                var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, task.SiteId.Value, cancellationToken: cancellationToken);
                if (!canAccess) return Forbid();
            }
            else if (!viaAssignment && !task.SiteId.HasValue)
            {
                return Forbid();
            }
        }

        var now = DateTime.UtcNow;
        var (isOverdue, remaining, overdue) = ComputeDeadline(task.DueAt, task.Status, now);

        var comments = task.Comments.OrderBy(c => c.CreatedAt).Select(c => new TaskCommentDto(
            c.Id,
            c.AuthorUserId,
            $"{c.Author.FirstName} {c.Author.LastName}",
            c.Content,
            c.CreatedAt
        )).ToList();

        var attachments = new List<TaskAttachmentDto>();
        foreach (var att in task.Attachments)
        {
            if (att.MediaFile != null && !att.MediaFile.IsDeleted)
            {
                var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken: cancellationToken);
                attachments.Add(new TaskAttachmentDto(
                    att.Id,
                    att.MediaFileId,
                    att.MediaFile.OriginalFileName,
                    att.MediaFile.ContentType,
                    att.MediaFile.FileSize,
                    downloadUrl,
                    att.AttachedAt
                ));
            }
        }

        var statusHistory = new List<TaskStatusHistoryDto>();
        // Query users for history records
        var userIds = task.StatusHistory.Select(h => h.ChangedBy).Distinct().ToList();
        var usersMap = await _dbContext.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken: cancellationToken);

        foreach (var h in task.StatusHistory.OrderBy(h => h.ChangedAt))
        {
            usersMap.TryGetValue(h.ChangedBy, out var changedByName);
            statusHistory.Add(new TaskStatusHistoryDto(
                h.Id,
                h.OldStatus,
                h.NewStatus,
                h.Reason,
                h.ChangedBy,
                changedByName ?? "System",
                h.ChangedAt
            ));
        }

        return Ok(new TaskDetailDto(
            task.Id,
            task.ProjectId,
            task.Project.Name,
            task.SiteId,
            task.Site?.Name,
            task.Title,
            task.Description,
            task.Priority,
            task.Status,
            isOverdue,
            remaining,
            overdue,
            task.AssignedToUserId,
            task.AssignedToUser != null ? $"{task.AssignedToUser.FirstName} {task.AssignedToUser.LastName}" : null,
            task.AssignedToTeamId,
            task.ProgressPercentage,
            task.StartAt,
            task.DueAt,
            task.CompletedAt,
            task.Status == TaskItemStatus.Completed ? task.UpdatedBy : null,
            task.CreatedBy,
            comments,
            attachments,
            statusHistory
        ));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<ActionResult<TaskDetailDto>> Update(
        Guid id,
        [FromBody] UpdateTaskDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.StatusHistory)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken: cancellationToken);

        if (task == null) return NotFound();

        var oldAssignedTo = task.AssignedToUserId;
        var oldStatus = task.Status;

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.Priority = dto.Priority;
        task.StartAt = dto.StartAt;
        task.DueAt = dto.DueAt;
        if (dto.AssignedToTeamId.HasValue) task.AssignedToTeamId = dto.AssignedToTeamId;
        if (dto.ProgressPercentage.HasValue) task.ProgressPercentage = dto.ProgressPercentage.Value;
        task.UpdatedBy = userId;
        task.UpdatedAt = DateTime.UtcNow;

        if (dto.AssignedToUserId != oldAssignedTo)
        {
            task.AssignedToUserId = dto.AssignedToUserId;
            if (dto.AssignedToUserId.HasValue)
            {
                task.Assignments.Add(new TaskAssignment
                {
                    TaskItem = task,
                    UserId = dto.AssignedToUserId.Value,
                    AssignedBy = userId,
                    AssignedAt = DateTime.UtcNow
                });

                await _notificationService.NotifyTaskAssignedAsync(
                    task.Id, task.Title, dto.AssignedToUserId.Value, cancellationToken);

                // Ensure project membership so assignee sees the project
                var isMember = await _dbContext.ProjectMembers.AnyAsync(
                    pm => pm.ProjectId == task.ProjectId && pm.UserId == dto.AssignedToUserId.Value, cancellationToken: cancellationToken);
                if (!isMember)
                {
                    _dbContext.ProjectMembers.Add(new ProjectMember
                    {
                        ProjectId = task.ProjectId,
                        UserId = dto.AssignedToUserId.Value,
                        Role = "Engineer",
                        JoinedAt = DateTime.UtcNow
                    });
                }
            }
        }

        if (dto.Status.HasValue && dto.Status.Value != oldStatus)
        {
            task.Status = dto.Status.Value;
            _dbContext.TaskStatusHistories.Add(new TaskStatusHistory
            {
                TaskItemId = task.Id,
                OldStatus = oldStatus,
                NewStatus = task.Status,
                Reason = "Updated by administrator",
                ChangedBy = userId,
                ChangedAt = DateTime.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Update",
            "TaskItem",
            task.Id.ToString(),
            new { OldStatus = oldStatus, OldAssignedTo = oldAssignedTo },
            new { task.Title, task.Status, task.AssignedToUserId },
            cancellationToken: cancellationToken);

        if (dto.AssignedToUserId.HasValue && dto.AssignedToUserId != oldAssignedTo)
        {
            await _notificationService.BroadcastToUserAsync(
                dto.AssignedToUserId.Value,
                "TaskAssigned",
                new { taskId = task.Id, title = task.Title, projectId = task.ProjectId },
                cancellationToken: cancellationToken);
        }

        if (task.AssignedToUserId.HasValue)
        {
            await _notificationService.BroadcastToUserAsync(task.AssignedToUserId.Value, "TaskUpdated", new { taskId = task.Id, title = task.Title }, cancellationToken: cancellationToken);
        }
        await _notificationService.BroadcastGlobalAsync("TaskUpdated", new { taskId = task.Id, title = task.Title }, cancellationToken: cancellationToken);

        return await GetById(task.Id, cancellationToken: cancellationToken);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken: cancellationToken);
        if (task == null) return NotFound();

        task.IsDeleted = true;
        task.DeletedAt = DateTime.UtcNow;
        task.DeletedBy = userId;
        task.UpdatedAt = DateTime.UtcNow;
        task.UpdatedBy = userId;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "Delete",
            "TaskItem",
            task.Id.ToString(),
            new { task.Title, task.Status },
            null,
            cancellationToken: cancellationToken);

        await _notificationService.BroadcastGlobalAsync("TaskUpdated", new { taskId = task.Id, deleted = true }, cancellationToken: cancellationToken);

        return Ok(new { success = true });
    }

    [HttpPut("{id}/status")]
    [HttpPost("{id}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateTaskStatusDto dto,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        if (dto == null)
            return BadRequest(new { message = "Status payload is required." });

        var task = await _dbContext.Tasks
            .Include(t => t.StatusHistory)
            .Include(t => t.Attachments)
            .Include(t => t.Assignments)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken: cancellationToken);

        if (task == null) return NotFound(new { message = "Task not found." });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin") || User.IsInRole("ProjectManager");
        var isAssignee =
            task.AssignedToUserId == userId
            || task.Assignments.Any(a => a.UserId == userId);

        if (!isAdmin && !isAssignee)
        {
            return Forbid();
        }

        var targetStatus = dto.Status;
        var oldStatus = task.Status;

        if (oldStatus == targetStatus)
        {
            return Ok(new { success = true, status = task.Status.ToString(), unchanged = true });
        }

        task.Status = targetStatus;
        task.UpdatedBy = userId;
        task.UpdatedAt = DateTime.UtcNow;

        if (targetStatus == TaskItemStatus.Completed)
        {
            task.CompletedAt = DateTime.UtcNow;

            if (dto.AttachmentMediaIds != null)
            {
                foreach (var mediaId in dto.AttachmentMediaIds)
                {
                    if (!task.Attachments.Any(a => a.MediaFileId == mediaId))
                    {
                        task.Attachments.Add(new TaskAttachment
                        {
                            TaskItem = task,
                            MediaFileId = mediaId,
                            AttachedAt = DateTime.UtcNow
                        });
                    }
                }
            }
        }
        else if (oldStatus == TaskItemStatus.Completed)
        {
            task.CompletedAt = null;
        }

        _dbContext.TaskStatusHistories.Add(new TaskStatusHistory
        {
            TaskItemId = task.Id,
            OldStatus = oldStatus,
            NewStatus = targetStatus,
            Reason = dto.Notes ?? $"Status changed from {oldStatus} to {targetStatus}",
            ChangedBy = userId,
            ChangedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ChangeStatus",
            "TaskItem",
            task.Id.ToString(),
            new { Status = oldStatus },
            new { Status = targetStatus, dto.Notes },
            cancellationToken: cancellationToken);

        var payload = new
        {
            taskId = task.Id,
            title = task.Title,
            status = targetStatus.ToString(),
            oldStatus = oldStatus.ToString(),
            projectId = task.ProjectId
        };

        // Notify admins (+ assignee on completion) — exclude actor
        var adminUserIds = await _dbContext.UserRoles
            .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" || ur.Role.Name == "ProjectManager")
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (targetStatus == TaskItemStatus.Completed)
        {
            var notifyIds = adminUserIds.ToList();
            if (task.AssignedToUserId.HasValue)
                notifyIds.Add(task.AssignedToUserId.Value);

            await _notificationService.NotifyTaskCompletedAsync(
                task.Id, task.Title, notifyIds.Distinct(), userId, cancellationToken);
        }
        else
        {
            foreach (var adminId in adminUserIds.Where(aid => aid != userId))
            {
                await _notificationService.SendNotificationAsync(
                    adminId,
                    NotificationType.TaskUpdated,
                    "Task Status Updated",
                    $"Task '{task.Title}' changed from {oldStatus} to {targetStatus}.",
                    "Task",
                    task.Id.ToString(),
                    cancellationToken: cancellationToken);
            }
        }

        await _notificationService.BroadcastToAdminsAsync("TaskStatusChanged", payload, cancellationToken: cancellationToken);
        await _notificationService.BroadcastToAdminsAsync("AdminStatsUpdated", new { }, cancellationToken: cancellationToken);
        await _notificationService.BroadcastGlobalAsync("TaskStatusChanged", payload, cancellationToken: cancellationToken);
        await _notificationService.BroadcastGlobalAsync("TaskUpdated", payload, cancellationToken: cancellationToken);

        if (task.SiteId.HasValue)
        {
            await _notificationService.BroadcastToSiteAsync(
                task.SiteId.Value,
                targetStatus == TaskItemStatus.Completed ? "TaskCompleted" : "TaskUpdated",
                payload,
                cancellationToken: cancellationToken);
        }

        if (task.AssignedToUserId.HasValue && task.AssignedToUserId.Value != userId)
        {
            await _notificationService.BroadcastToUserAsync(
                task.AssignedToUserId.Value,
                "TaskStatusChanged",
                payload,
                cancellationToken: cancellationToken);
        }

        return Ok(new { success = true, status = task.Status.ToString() });
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(
        Guid id,
        [FromBody] string content,
        CancellationToken cancellationToken)
    {
        if (!UserClaims.TryGetUserId(User, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken: cancellationToken);
        if (task == null) return NotFound();

        var comment = new TaskComment
        {
            TaskItemId = task.Id,
            AuthorUserId = userId,
            Content = content,
            CreatedBy = userId
        };

        _dbContext.TaskComments.Add(comment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, commentId = comment.Id });
    }

    /// <summary>
    /// TASK-01: compute RemainingTime / OverdueTime without changing status when due date passes.
    /// </summary>
    private static (bool IsOverdue, TimeSpan? RemainingTime, TimeSpan? OverdueTime) ComputeDeadline(
        DateTime? dueAt,
        TaskItemStatus status,
        DateTime now)
    {
        if (!dueAt.HasValue || status == TaskItemStatus.Completed || status == TaskItemStatus.Cancelled)
            return (false, null, null);

        if (dueAt.Value >= now)
            return (false, dueAt.Value - now, null);

        return (true, null, now - dueAt.Value);
    }
}


