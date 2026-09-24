using MTI.ProjectManagement.Domain.Common;
using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Domain.Entities;

public class Conversation : FullAuditedEntity
{
    public string? Title { get; set; }
    public bool IsGroup { get; set; } = false;
    public ConversationType Type { get; set; } = ConversationType.Direct;
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }
    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }
    public Guid? LastMessageId { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public string? DirectConversationKey { get; set; } // Deterministic key: direct:{minUserId}:{maxUserId}

    public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

public class ConversationMember : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public Guid? LastReadMessageId { get; set; }
    public DateTime? LastReadAt { get; set; }
    public bool Muted { get; set; } = false;
    public bool Archived { get; set; } = false;
    public bool IsAdmin { get; set; } = false;
}

public class Message : FullAuditedEntity
{
    public Guid ConversationId { get; set; }
    public Conversation Conversation { get; set; } = null!;

    public Guid SenderUserId { get; set; }
    public User Sender { get; set; } = null!;

    public string ClientMessageId { get; set; } = string.Empty; // Idempotency key per sender
    public string Type { get; set; } = "Text"; // Text, Image, File, Audio, System
    public string Content { get; set; } = string.Empty;
    public Guid? ReplyToMessageId { get; set; }
    public Message? ReplyToMessage { get; set; }

    public bool IsEdited { get; set; } = false;
    public DateTime? EditedAt { get; set; }

    // Navigation
    public ICollection<MessageAttachment> Attachments { get; set; } = new List<MessageAttachment>();
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
    public ICollection<MessageReadState> ReadStates { get; set; } = new List<MessageReadState>();
    public ICollection<MessageReceipt> Receipts { get; set; } = new List<MessageReceipt>();
}

public class MessageAttachment : BaseEntity
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid MediaFileId { get; set; }
    public MediaFile MediaFile { get; set; } = null!;

    public string Type { get; set; } = "Document";
    public Guid? ThumbnailMediaFileId { get; set; }
    public int? Duration { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
}

public class MessageReaction : BaseEntity
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Reaction { get; set; } = string.Empty; // Emoji
    public DateTime ReactedAt { get; set; } = DateTime.UtcNow;
}

public class MessageReadState : BaseEntity
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}

public class MessageReceipt : BaseEntity
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime? DeliveredAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid RecipientUserId
    {
        get => UserId;
        set => UserId = value;
    }

    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? TitleKey { get; set; }
    public string? BodyKey { get; set; }
    public string? DataJson { get; set; }
    public string? EventKey { get; set; } // Unique event deduplication key
    public string? DeduplicationKey
    {
        get => EventKey;
        set => EventKey = value;
    }
    public string? EntityType { get; set; }
    public string? EntityId { get; set; }
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}

public class NotificationPreference : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public bool EmailNotifications { get; set; } = true;
    public bool PushNotifications { get; set; } = true;
    public bool TaskAssigned { get; set; } = true;
    public bool DataApproved { get; set; } = true;
    public bool ChatMessages { get; set; } = true;
}
