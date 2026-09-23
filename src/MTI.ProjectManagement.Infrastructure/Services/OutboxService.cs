using System.Text.Json;
using MTI.ProjectManagement.Application.Contracts;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.Infrastructure.Services;

/// <summary>
/// REALTIME-02: Writes outbox events into the same AppDbContext instance.
/// The caller must call SaveChangesAsync after calling Enqueue — both the
/// business record and the outbox event are committed atomically.
/// </summary>
public class OutboxService : IOutboxService
{
    private readonly AppDbContext _context;

    public OutboxService(AppDbContext context)
    {
        _context = context;
    }

    public void Enqueue(
        string eventType,
        string aggregateType,
        string aggregateId,
        object payload,
        string? targetGroup = null)
    {
        var message = new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = eventType,
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            Payload = JsonSerializer.Serialize(payload),
            TargetGroup = targetGroup,
            Status = "Pending",
            RetryCount = 0,
            CreatedAt = DateTime.UtcNow
        };

        _context.OutboxMessages.Add(message);
    }
}
