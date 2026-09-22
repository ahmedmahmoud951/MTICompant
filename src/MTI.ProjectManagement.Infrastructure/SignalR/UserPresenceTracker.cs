using System.Collections.Concurrent;

namespace MTI.ProjectManagement.Infrastructure.SignalR;

/// <summary>In-memory presence for last-seen / online indicators.</summary>
public static class UserPresenceTracker
{
    private static readonly ConcurrentDictionary<Guid, DateTime> OnlineSince = new();
    private static readonly ConcurrentDictionary<Guid, DateTime> LastSeenAt = new();

    public static void SetOnline(Guid userId)
    {
        var now = DateTime.UtcNow;
        OnlineSince[userId] = now;
        LastSeenAt[userId] = now;
    }

    public static void SetOffline(Guid userId)
    {
        OnlineSince.TryRemove(userId, out _);
        LastSeenAt[userId] = DateTime.UtcNow;
    }

    public static bool IsOnline(Guid userId) => OnlineSince.ContainsKey(userId);

    public static DateTime? GetLastSeen(Guid userId)
    {
        if (LastSeenAt.TryGetValue(userId, out var seen)) return seen;
        return null;
    }
}
