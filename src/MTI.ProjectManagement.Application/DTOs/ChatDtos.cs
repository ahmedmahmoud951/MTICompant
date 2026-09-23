namespace MTI.ProjectManagement.Application.DTOs;

public record ConversationMemberDto(
    Guid UserId,
    string UserName,
    string Email,
    string Role,
    DateTime JoinedAt,
    DateTime? LastSeenAt = null,
    bool IsOnline = false
);

public record MessageAttachmentDto(
    Guid Id,
    Guid MediaFileId,
    string FileName,
    string ContentType,
    long FileSize,
    string DownloadUrl
);

public record MessageReactionDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Reaction,
    DateTime ReactedAt
);

public record MessageReadStateDto(
    Guid UserId,
    string UserName,
    DateTime ReadAt
);

public record MessageReceiptDto(
    Guid UserId,
    string UserName,
    DateTime? DeliveredAt,
    DateTime? ReadAt
);

public record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderUserId,
    string SenderName,
    string Content,
    bool IsEdited,
    DateTime? EditedAt,
    DateTime CreatedAt,
    List<MessageAttachmentDto> Attachments,
    List<MessageReactionDto> Reactions,
    List<MessageReadStateDto> ReadStates,
    string? ClientMessageId = null,
    List<MessageReceiptDto>? Receipts = null
);

public record ConversationSummaryDto(
    Guid Id,
    string? Title,
    bool IsGroup,
    Guid? ProjectId,
    string? ProjectName,
    int UnreadCount,
    MessageDto? LastMessage,
    List<ConversationMemberDto> Members,
    DateTime CreatedAt,
    string? Type = null
);

public record CreateDirectConversationDto(
    Guid OtherUserId
);

public record CreateProjectConversationDto(
    Guid ProjectId
);

public record CreateSiteConversationDto(
    Guid SiteId
);

public record SendMessageDto(
    string Content,
    string? ClientMessageId = null,
    Guid? ReplyToMessageId = null,
    List<Guid>? AttachmentMediaIds = null
);

public record UpdateMessageDto(
    string Content
);

public record ToggleReactionDto(
    string Reaction
);
