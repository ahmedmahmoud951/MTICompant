using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MTI.ProjectManagement.Infrastructure.Persistence;
using MTI.ProjectManagement.Infrastructure.SignalR;

namespace MTI.ProjectManagement.Infrastructure.Services;

/// <summary>
/// REALTIME-02/03: Background dispatcher — claims Pending rows → Processing,
/// sends to SignalR, then marks Sent. On failure → Failed (after MaxRetries).
/// </summary>
public class OutboxDispatcher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<ProjectHub> _hubContext;
    private readonly ILogger<OutboxDispatcher> _logger;
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    private const int MaxRetries = 5;

    public OutboxDispatcher(
        IServiceScopeFactory scopeFactory,
        IHubContext<ProjectHub> hubContext,
        ILogger<OutboxDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[OutboxDispatcher] Started. Polling every {Interval}s.", PollInterval.TotalSeconds);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingMessages(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[OutboxDispatcher] Unhandled error during poll cycle.");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task ProcessPendingMessages(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Atomic claim: select ids → ExecuteUpdate Pending→Processing → process claimed only
        var batchIds = await db.OutboxMessages
            .Where(m => m.Status == "Pending" && m.RetryCount < MaxRetries)
            .OrderBy(m => m.CreatedAt)
            .Take(50)
            .Select(m => m.Id)
            .ToListAsync(ct);

        if (batchIds.Count == 0) return;

        await db.OutboxMessages
            .Where(m => batchIds.Contains(m.Id) && m.Status == "Pending")
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.Status, "Processing"), ct);

        var toProcess = await db.OutboxMessages
            .Where(m => batchIds.Contains(m.Id) && m.Status == "Processing")
            .ToListAsync(ct);

        foreach (var msg in toProcess)
        {
            try
            {
                await DispatchToSignalR(msg, ct);
                msg.Status = "Sent";
                msg.ProcessedAt = DateTime.UtcNow;
                msg.ErrorMessage = null;
            }
            catch (Exception ex)
            {
                msg.RetryCount++;
                msg.ErrorMessage = ex.Message;
                if (msg.RetryCount >= MaxRetries)
                {
                    msg.Status = "Failed";
                    _logger.LogError(ex, "[OutboxDispatcher] Message {Id} failed after {Retries} retries.", msg.Id, MaxRetries);
                }
                else
                {
                    // Re-queue for another claim cycle
                    msg.Status = "Pending";
                    _logger.LogWarning(ex, "[OutboxDispatcher] Message {Id} retry {Retry}/{Max}.", msg.Id, msg.RetryCount, MaxRetries);
                }
            }
        }

        await db.SaveChangesAsync(ct);
    }

    private async Task DispatchToSignalR(MTI.ProjectManagement.Domain.Entities.OutboxMessage msg, CancellationToken ct)
    {
        var payloadObj = JsonSerializer.Deserialize<Dictionary<string, object>>(msg.Payload)
                         ?? new Dictionary<string, object>();
        payloadObj["eventId"] = msg.Id.ToString();
        payloadObj["eventType"] = msg.EventType;

        if (!string.IsNullOrEmpty(msg.TargetGroup))
        {
            await _hubContext.Clients.Group(msg.TargetGroup)
                .SendAsync(msg.EventType, payloadObj, ct);
        }
        else
        {
            await _hubContext.Clients.All.SendAsync(msg.EventType, payloadObj, ct);
        }
    }
}
