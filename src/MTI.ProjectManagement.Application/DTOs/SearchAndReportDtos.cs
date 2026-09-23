namespace MTI.ProjectManagement.Application.DTOs;

public record SearchResultItemDto(
    string Type, // "Project", "Site", "Task", "ProjectData", "User", "Document", etc.
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
    int UnreadMessages,
    int DelayedProjects = 0,
    int TotalTeams = 0,
    int PendingDocuments = 0,
    int OpenIssues = 0,
    int CriticalRisks = 0,
    int MaintenanceTickets = 0,
    int ExpiringWarranties = 0
);

public record RecentMessagePreviewDto(
    Guid Id,
    Guid ConversationId,
    string Preview,
    string SenderName,
    DateTime CreatedAt
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
    int UnreadMessages,
    int TodayTasksCount = 0,
    int PendingDocumentsCount = 0,
    IReadOnlyList<RecentMessagePreviewDto>? RecentMessages = null,
    int DailyReportsCount = 0,
    int OpenIssuesCount = 0,
    int SiteOperationsCount = 0
);

public record TechnicalOfficeDashboardDto(
    int PendingBoqsCount,
    int TechnicalOffersCount,
    int QuotationRequestsCount,
    int SubmittalsCount,
    int DrawingsCount,
    int DatasheetsCount,
    int ClientRequirementsCount,
    int PendingReviewsCount,
    int ExpiringQuotationsCount
);

public record ReportCatalogItemDto(
    string Key,
    string Name,
    string Description,
    string EntityType,
    bool SupportsExport
);
