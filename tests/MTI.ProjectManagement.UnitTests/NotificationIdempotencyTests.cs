using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Domain.Enums;
using MTI.ProjectManagement.Infrastructure.Persistence;
using MTI.ProjectManagement.Infrastructure.Services;
using MTI.ProjectManagement.Infrastructure.SignalR;
using NSubstitute;

namespace MTI.ProjectManagement.UnitTests;

/// <summary>TEST-01: Notification EventKey idempotency — 10 creates with same key → 1 row.</summary>
public class NotificationIdempotencyTests
{
    private static AppDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"notif-idem-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    private static NotificationService CreateService(AppDbContext db)
    {
        var hubContext = Substitute.For<IHubContext<ProjectHub>>();
        var clients = Substitute.For<IHubClients>();
        var clientProxy = Substitute.For<IClientProxy>();
        hubContext.Clients.Returns(clients);
        clients.Group(Arg.Any<string>()).Returns(clientProxy);
        var logger = Substitute.For<ILogger<NotificationService>>();
        return new NotificationService(db, hubContext, logger);
    }

    [Fact]
    public async Task CreateNotificationAsync_SameEventKey_TenTimes_CreatesOnlyOneRow()
    {
        await using var db = CreateInMemoryDb();
        var service = CreateService(db);
        var userId = Guid.NewGuid();
        var eventKey = "TaskAssigned:dup-test-key";

        Notification? first = null;
        for (var i = 0; i < 10; i++)
        {
            var result = await service.CreateNotificationAsync(
                userId,
                NotificationType.TaskAssigned,
                "Task assigned",
                $"Attempt {i}",
                eventKey: eventKey);

            first ??= result;
            Assert.NotNull(result);
            Assert.Equal(first!.Id, result!.Id);
        }

        var count = await db.Notifications.CountAsync(n => n.EventKey == eventKey);
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task EventKeyLookup_MirrorsServiceDedupe_BeforeInsert()
    {
        await using var db = CreateInMemoryDb();
        var eventKey = "DataApproved:mirror-test";
        var userId = Guid.NewGuid();

        for (var i = 0; i < 10; i++)
        {
            var existing = await db.Notifications.FirstOrDefaultAsync(n => n.EventKey == eventKey);
            if (existing != null) continue;

            db.Notifications.Add(new Notification
            {
                UserId = userId,
                Type = NotificationType.DataApproved,
                Title = "Approved",
                Body = "Body",
                EventKey = eventKey,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        Assert.Equal(1, await db.Notifications.CountAsync(n => n.EventKey == eventKey));
    }
}
