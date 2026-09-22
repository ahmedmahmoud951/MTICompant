using MTI.ProjectManagement.Domain.Enums;

namespace MTI.ProjectManagement.Application.DTOs;

public record NotificationDto(
    Guid Id,
    NotificationType Type,
    string Title,
    string Body,
    string? EntityType,
    string? EntityId,
    bool IsRead,
    DateTime CreatedAt,
    DateTime? ReadAt
);

public record NotificationSummaryDto(
    List<NotificationDto> Items,
    int TotalCount,
    int UnreadCount
);
