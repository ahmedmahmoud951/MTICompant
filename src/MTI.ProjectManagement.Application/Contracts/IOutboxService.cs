using MTI.ProjectManagement.Domain.Entities;

namespace MTI.ProjectManagement.Application.Contracts;

/// <summary>REALTIME-02: Outbox service interface for writing events in the same DB transaction.</summary>
public interface IOutboxService
{
    /// <summary>
    /// Adds an outbox message to the current DbContext change tracker.
    /// Must be called BEFORE SaveChangesAsync so both are committed atomically.
    /// </summary>
    void Enqueue(
        string eventType,
        string aggregateType,
        string aggregateId,
        object payload,
        string? targetGroup = null);
}
