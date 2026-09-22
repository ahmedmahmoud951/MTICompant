using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var task = new TaskItem
        {
            ProjectId = dto.ProjectId,
            SiteId = dto.SiteId,
            Title = dto.Title,
            Description = dto.Description,
            Priority = dto.Priority,
            Status = TaskItemStatus.ToDo,
            AssignedToUserId = dto.AssignedToUserId,
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
            cancellationToken);

        // SignalR & Notifications
        if (dto.AssignedToUserId.HasValue)
        {
            await _notificationService.SendNotificationAsync(
                dto.AssignedToUserId.Value,
                NotificationType.TaskAssigned,
                "New Task Assigned",
                $"You have been assigned to task: '{task.Title}'",
                "Task",
                task.Id.ToString(),
                cancellationToken);

            await _notificationService.BroadcastToUserAsync(dto.AssignedToUserId.Value, "TaskAssigned", new { taskId = task.Id, title = task.Title }, cancellationToken);
        }

        if (task.SiteId.HasValue)
        {
            await _notificationService.BroadcastToSiteAsync(task.SiteId.Value, "TaskCreated", new { taskId = task.Id, title = task.Title }, cancellationToken);
        }
        await _notificationService.BroadcastGlobalAsync("TaskCreated", new { taskId = task.Id, title = task.Title }, cancellationToken);

        return await GetById(task.Id, cancellationToken);
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] TaskFilterParams filter,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");

        var query = _dbContext.Tasks
            .AsNoTracking()
            .Where(t => !t.IsDeleted);

        // Scoping: If engineer, can view tasks assigned to them OR within authorized sites
        if (!isAdmin)
        {
            var authorizedSiteIds = await _resourceAuthorization.GetAuthorizedSiteIdsAsync(userId, cancellationToken);
            query = query.Where(t => t.AssignedToUserId == userId || (t.SiteId.HasValue && authorizedSiteIds.Contains(t.SiteId.Value)));
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

        var totalCount = await query.CountAsync(cancellationToken);

        var list = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
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
                t.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var items = list.Select(t =>
        {
            var isOverdue = t.DueAt.HasValue && t.DueAt < now && t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled;
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
                t.AssignedToUserId,
                t.AssignedToName,
                t.DueAt,
                t.CreatedAt
            );
        }).ToList();

        return Ok(new { items, totalCount, page = filter.Page, pageSize = filter.PageSize });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDetailDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks
            .AsNoTracking()
            .Include(t => t.Project)
            .Include(t => t.Site)
            .Include(t => t.AssignedToUser)
            .Include(t => t.Comments).ThenInclude(c => c.Author)
            .Include(t => t.Attachments).ThenInclude(a => a.MediaFile)
            .Include(t => t.StatusHistory)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);

        if (task == null) return NotFound(new { message = "Task not found." });

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        if (!isAdmin && task.AssignedToUserId != userId)
        {
            if (task.SiteId.HasValue)
            {
                var canAccess = await _resourceAuthorization.CanAccessSiteAsync(userId, task.SiteId.Value, cancellationToken);
                if (!canAccess) return Forbid();
            }
        }

        var now = DateTime.UtcNow;
        var isOverdue = task.DueAt.HasValue && task.DueAt < now && task.Status != TaskItemStatus.Completed && task.Status != TaskItemStatus.Cancelled;

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
                var downloadUrl = await _mediaStorage.GeneratePreSignedDownloadUrlAsync(att.MediaFile.ObjectKey, TimeSpan.FromHours(2), cancellationToken);
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
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken);

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
            task.AssignedToUserId,
            task.AssignedToUser != null ? $"{task.AssignedToUser.FirstName} {task.AssignedToUser.LastName}" : null,
            task.StartAt,
            task.DueAt,
            task.CompletedAt,
            null, // CompletedBy
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
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.StatusHistory)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);

        if (task == null) return NotFound();

        var oldAssignedTo = task.AssignedToUserId;
        var oldStatus = task.Status;

        task.Title = dto.Title;
        task.Description = dto.Description;
        task.Priority = dto.Priority;
        task.StartAt = dto.StartAt;
        task.DueAt = dto.DueAt;
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

                await _notificationService.SendNotificationAsync(
                    dto.AssignedToUserId.Value,
                    NotificationType.TaskAssigned,
                    "Task Reassigned",
                    $"You have been assigned to task: '{task.Title}'",
                    "Task",
                    task.Id.ToString(),
                    cancellationToken);
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
            cancellationToken);

        if (task.AssignedToUserId.HasValue)
        {
            await _notificationService.BroadcastToUserAsync(task.AssignedToUserId.Value, "TaskUpdated", new { taskId = task.Id, title = task.Title }, cancellationToken);
        }
        await _notificationService.BroadcastGlobalAsync("TaskUpdated", new { taskId = task.Id, title = task.Title }, cancellationToken);

        return await GetById(task.Id, cancellationToken);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,SystemAdmin,ProjectManager")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
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
            cancellationToken);

        await _notificationService.BroadcastGlobalAsync("TaskUpdated", new { taskId = task.Id, deleted = true }, cancellationToken);

        return Ok(new { success = true });
    }

    [HttpPost("{id}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] CompleteTaskDto dto,
        [FromQuery] TaskItemStatus targetStatus,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks
            .Include(t => t.StatusHistory)
            .Include(t => t.Attachments)
            .FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);

        if (task == null) return NotFound();

        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SystemAdmin");
        if (!isAdmin && task.AssignedToUserId != userId)
        {
            return Forbid();
        }

        var oldStatus = task.Status;
        task.Status = targetStatus;
        task.UpdatedBy = userId;
        task.UpdatedAt = DateTime.UtcNow;

        if (targetStatus == TaskItemStatus.Completed)
        {
            task.CompletedAt = DateTime.UtcNow;

            // Link completion attachments if provided
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

            // Notify Admins
            var adminUserIds = await _dbContext.UserRoles
                .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" || ur.Role.Name == "ProjectManager")
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);

            foreach (var adminId in adminUserIds)
            {
                await _notificationService.SendNotificationAsync(
                    adminId,
                    NotificationType.TaskCompleted,
                    "Task Completed",
                    $"Task '{task.Title}' has been marked completed.",
                    "Task",
                    task.Id.ToString(),
                    cancellationToken);
            }
        }

        _dbContext.TaskStatusHistories.Add(new TaskStatusHistory
        {
            TaskItemId = task.Id,
            OldStatus = oldStatus,
            NewStatus = targetStatus,
            Reason = dto.CompletionComment ?? $"Status changed to {targetStatus}",
            ChangedBy = userId,
            ChangedAt = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            "ChangeStatus",
            "TaskItem",
            task.Id.ToString(),
            new { Status = oldStatus },
            new { Status = targetStatus, dto.CompletionComment },
            cancellationToken);

        if (task.SiteId.HasValue)
        {
            await _notificationService.BroadcastToSiteAsync(task.SiteId.Value, targetStatus == TaskItemStatus.Completed ? "TaskCompleted" : "TaskUpdated", new { taskId = task.Id, title = task.Title, status = targetStatus.ToString() }, cancellationToken);
        }
        await _notificationService.BroadcastGlobalAsync("TaskStatusChanged", new { taskId = task.Id, status = targetStatus.ToString() }, cancellationToken);

        return Ok(new { success = true, status = task.Status.ToString() });
    }

    [HttpPost("{id}/comments")]
    public async Task<IActionResult> AddComment(
        Guid id,
        [FromBody] string content,
        CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId)) return Unauthorized();

        var task = await _dbContext.Tasks.FirstOrDefaultAsync(t => t.Id == id && !t.IsDeleted, cancellationToken);
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
}
