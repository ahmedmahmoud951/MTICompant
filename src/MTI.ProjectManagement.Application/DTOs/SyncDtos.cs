namespace MTI.ProjectManagement.Application.DTOs;

public record ProjectSyncDto(
    Guid Id,
    string Code,
    string Name,
    string Status,
    decimal ProgressPercentage,
    DateTime UpdatedAt
);

public record SyncResponseDto(
    DateTime ServerTimestamp,
    List<MessageDto> NewMessages,
    List<NotificationDto> NewNotifications,
    List<TaskSummaryDto> UpdatedTasks,
    List<ProjectSyncDto> ProjectChanges
);
