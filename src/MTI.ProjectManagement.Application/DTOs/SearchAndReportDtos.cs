namespace MTI.ProjectManagement.Application.DTOs;

public record SearchResultItemDto(
    string Type, // "Project", "Site", "Task", "ProjectData", "User", "Document"
    Guid Id,
    string Title,
    string? Subtitle,
    string? Status,
    DateTime CreatedAt,
    string? Url
);

public record GlobalSearchResponseDto(
    string Query,
    int TotalResults,
    List<SearchResultItemDto> Results
);

public record AdminDashboardStatsDto(
    int TotalProjects,
    int ActiveProjects,
    int TotalSites,
    int ActiveSites,
    int TotalEngineers,
    int PendingApprovals,
    int ApprovedData,
    int RejectedData,
    int OpenTasks,
    int CompletedTasks,
    int OverdueTasks,
    int UnreadNotifications,
    int UnreadMessages
);

public record EngineerDashboardStatsDto(
    int MyProjectsCount,
    int MySitesCount,
    int MyTasksCount,
    int PendingTasksCount,
    int OverdueTasksCount,
    int CompletedTasksCount,
    int PendingDataCount,
    int ApprovedDataCount,
    int UnreadNotifications,
    int UnreadMessages
);
