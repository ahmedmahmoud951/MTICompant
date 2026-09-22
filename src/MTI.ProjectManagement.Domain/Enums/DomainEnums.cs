namespace MTI.ProjectManagement.Domain.Enums;

public enum UserRoleType
{
    SystemAdmin = 1,
    Admin = 2,
    ProjectManager = 3,
    Engineer = 4,
    Viewer = 5
}

public enum ProjectStatus
{
    Planning = 1,
    Active = 2,
    OnHold = 3,
    Completed = 4,
    Archived = 5
}

public enum SiteStatus
{
    Pending = 1,
    Active = 2,
    Suspended = 3,
    Completed = 4,
    Closed = 5
}

public enum DataRecordStatus
{
    Draft = 1,
    Submitted = 2,
    UnderReview = 3,
    Approved = 4,
    Rejected = 5,
    ChangesRequested = 6
}

public enum ApprovalAction
{
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    ChangesRequested = 4
}

public enum TaskPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum TaskItemStatus
{
    ToDo = 1,
    InProgress = 2,
    UnderReview = 3,
    Completed = 4,
    Cancelled = 5
}

public enum MediaType
{
    Image = 1,
    Video = 2,
    Audio = 3,
    Document = 4,
    DataSheet = 5,
    Other = 6
}

public enum NotificationType
{
    TaskAssigned = 1,
    TaskUpdated = 2,
    TaskCompleted = 3,
    TaskOverdue = 4,
    DataSubmitted = 5,
    DataApproved = 6,
    DataRejected = 7,
    ChangesRequested = 8,
    NewMessage = 9,
    UserAssignedToSite = 10,
    ProjectUpdated = 11,
    SystemNotification = 12
}
