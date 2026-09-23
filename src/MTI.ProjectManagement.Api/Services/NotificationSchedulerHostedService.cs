using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Api.Services;

/// <summary>
/// NOTIFY-02 background scheduler: TaskDueSoon, TaskOverdue, WarrantyExpiring every 15 minutes.
/// </summary>
public class NotificationSchedulerHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(15);
    private static readonly int[] WarrantyThresholdDays = [30, 14, 7, 1];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationSchedulerHostedService> _logger;

    public NotificationSchedulerHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<NotificationSchedulerHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("NotificationSchedulerHostedService started (interval {Interval}).", Interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Notification scheduler cycle failed.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;
        var dueSoonCutoff = now.AddHours(24);

        // TaskDueSoon: due within 24h, not completed/cancelled, has assignee
        var dueSoonTasks = await db.Tasks
            .AsNoTracking()
            .Where(t => !t.IsDeleted
                && t.AssignedToUserId.HasValue
                && t.DueAt.HasValue
                && t.DueAt >= now
                && t.DueAt <= dueSoonCutoff
                && t.Status != TaskItemStatus.Completed
                && t.Status != TaskItemStatus.Cancelled)
            .Select(t => new { t.Id, t.Title, AssigneeId = t.AssignedToUserId!.Value, DueAt = t.DueAt!.Value })
            .ToListAsync(ct);

        foreach (var task in dueSoonTasks)
        {
            var dueDateKey = task.DueAt.ToString("yyyy-MM-dd");
            await notifications.NotifyTaskDueSoonAsync(task.Id, task.Title, task.AssigneeId, dueDateKey, ct);
        }

        // TaskOverdue: dueAt < now, not completed/cancelled
        var overdueTasks = await db.Tasks
            .AsNoTracking()
            .Where(t => !t.IsDeleted
                && t.AssignedToUserId.HasValue
                && t.DueAt.HasValue
                && t.DueAt < now
                && t.Status != TaskItemStatus.Completed
                && t.Status != TaskItemStatus.Cancelled)
            .Select(t => new { t.Id, t.Title, AssigneeId = t.AssignedToUserId!.Value })
            .ToListAsync(ct);

        foreach (var task in overdueTasks)
        {
            await notifications.NotifyTaskOverdueAsync(task.Id, task.Title, task.AssigneeId, ct);
        }

        // IssueOverdue
        var overdueIssues = await db.ProjectIssues
            .AsNoTracking()
            .Where(i => !i.IsDeleted
                && i.AssignedToUserId.HasValue
                && i.DueDate.HasValue
                && i.DueDate < now
                && i.Status != IssueStatus.Resolved
                && i.Status != IssueStatus.Closed)
            .Select(i => new { i.Id, i.Title, AssigneeId = i.AssignedToUserId!.Value })
            .ToListAsync(ct);

        foreach (var issue in overdueIssues)
        {
            await notifications.NotifyIssueOverdueAsync(issue.Id, issue.Title, issue.AssigneeId, ct);
        }

        // WarrantyExpiring: CompanyAsset.WarrantyExpiry days remaining in {30,14,7,1}
        var assetsWithWarranty = await db.CompanyAssets
            .AsNoTracking()
            .Where(a => !a.IsDeleted && a.WarrantyExpiry.HasValue)
            .Select(a => new { a.Id, a.Name, WarrantyEnd = a.WarrantyExpiry!.Value })
            .ToListAsync(ct);

        if (assetsWithWarranty.Count > 0)
        {
            var adminIds = await db.UserRoles
                .Where(ur => ur.Role.Name == "Admin" || ur.Role.Name == "SystemAdmin" || ur.Role.Name == "ProjectManager")
                .Select(ur => ur.UserId)
                .Distinct()
                .ToListAsync(ct);

            foreach (var asset in assetsWithWarranty)
            {
                var daysRemaining = (int)Math.Ceiling((asset.WarrantyEnd.Date - now.Date).TotalDays);
                if (!WarrantyThresholdDays.Contains(daysRemaining))
                    continue;

                var notifyIds = adminIds.AsEnumerable();
                await notifications.NotifyWarrantyExpiringAsync(
                    asset.Id, asset.Name, daysRemaining, notifyIds, ct);
            }
        }

        _logger.LogDebug(
            "Notification scheduler cycle done: dueSoon={DueSoon}, overdue={Overdue}, warrantiesChecked={Warranty}.",
            dueSoonTasks.Count, overdueTasks.Count, assetsWithWarranty.Count);
    }
}
