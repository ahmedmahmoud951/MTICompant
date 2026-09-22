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
    List<MessageReadStateDto> ReadStates
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
    DateTime CreatedAt
);

public record CreateDirectConversationDto(
    Guid OtherUserId
);

public record SendMessageDto(
    string Content,
    Guid? ReplyToMessageId = null,
    List<Guid>? AttachmentMediaIds = null
);

public record UpdateMessageDto(
    string Content
);

public record ToggleReactionDto(
    string Reaction
);
