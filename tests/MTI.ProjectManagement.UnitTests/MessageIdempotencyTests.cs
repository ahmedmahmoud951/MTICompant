using Microsoft.EntityFrameworkCore;
using MTI.ProjectManagement.Domain.Entities;
using MTI.ProjectManagement.Infrastructure.Persistence;

namespace MTI.ProjectManagement.UnitTests;

/// <summary>TEST-01: Chat ClientMessageId idempotency — mirrors ChatController duplicate detection.</summary>
public class MessageIdempotencyTests
{
    private static AppDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"msg-idem-{Guid.NewGuid()}")
            .Options;
        return new AppDbContext(options);
    }

    /// <summary>
    /// Simulates ChatController send logic:
    /// if ClientMessageId set, FirstOrDefault by SenderUserId + ClientMessageId;
    /// if exists return existing; else insert.
    /// </summary>
    private static async Task<Message> SendMessageIdempotentAsync(
        AppDbContext db,
        Guid conversationId,
        Guid senderUserId,
        string clientMessageId,
        string content)
    {
        if (!string.IsNullOrWhiteSpace(clientMessageId))
        {
            var existing = await db.Messages
                .FirstOrDefaultAsync(m => m.SenderUserId == senderUserId && m.ClientMessageId == clientMessageId);
            if (existing != null) return existing;
        }

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderUserId = senderUserId,
            ClientMessageId = clientMessageId,
            Content = content,
            Type = "Text",
            CreatedAt = DateTime.UtcNow
        };
        db.Messages.Add(msg);
        await db.SaveChangesAsync();
        return msg;
    }

    [Fact]
    public async Task SameSenderAndClientMessageId_TenInserts_YieldsOneMessage()
    {
        await using var db = CreateInMemoryDb();

        var conversationId = Guid.NewGuid();
        var senderUserId = Guid.NewGuid();
        const string clientMessageId = "msg-dup-1";

        db.Conversations.Add(new Conversation
        {
            Id = conversationId,
            Title = "Test Conv",
            IsGroup = false,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        Message? first = null;
        for (var i = 0; i < 10; i++)
        {
            var result = await SendMessageIdempotentAsync(
                db, conversationId, senderUserId, clientMessageId, $"Hello attempt {i}");
            first ??= result;
            Assert.Equal(first!.Id, result.Id);
            Assert.Equal(clientMessageId, result.ClientMessageId);
        }

        var count = await db.Messages.CountAsync(m =>
            m.SenderUserId == senderUserId && m.ClientMessageId == clientMessageId);
        Assert.Equal(1, count);
        Assert.Equal("Hello attempt 0", first!.Content);
    }
}
