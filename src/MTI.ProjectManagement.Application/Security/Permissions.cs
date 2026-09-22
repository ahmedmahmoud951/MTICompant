namespace MTI.ProjectManagement.Application.Security;

public static class Permissions
{
    // Users
    public const string UsersView = "Users.View";
    public const string UsersCreate = "Users.Create";
    public const string UsersUpdate = "Users.Update";
    public const string UsersDelete = "Users.Delete";

    // Roles & Permissions
    public const string RolesView = "Roles.View";
    public const string RolesManage = "Roles.Manage";

    // Projects
    public const string ProjectsView = "Projects.View";
    public const string ProjectsCreate = "Projects.Create";
    public const string ProjectsUpdate = "Projects.Update";
    public const string ProjectsDelete = "Projects.Delete";

    // Sites
    public const string SitesView = "Sites.View";
    public const string SitesCreate = "Sites.Create";
    public const string SitesUpdate = "Sites.Update";
    public const string SitesDelete = "Sites.Delete";
    public const string SitesAssign = "Sites.Assign";

    // Project Data & Approvals
    public const string ProjectDataView = "ProjectData.View";
    public const string ProjectDataCreate = "ProjectData.Create";
    public const string ProjectDataUpdate = "ProjectData.Update";
    public const string ProjectDataDelete = "ProjectData.Delete";
    public const string ProjectDataSubmit = "ProjectData.Submit";
    public const string ProjectDataApprove = "ProjectData.Approve";
    public const string ProjectDataReject = "ProjectData.Reject";

    // Tasks
    public const string TasksView = "Tasks.View";
    public const string TasksCreate = "Tasks.Create";
    public const string TasksUpdate = "Tasks.Update";
    public const string TasksDelete = "Tasks.Delete";
    public const string TasksAssign = "Tasks.Assign";

    // Chat
    public const string ChatView = "Chat.View";
    public const string ChatSend = "Chat.Send";
    public const string ChatDelete = "Chat.Delete";

    // Reports
    public const string ReportsView = "Reports.View";
    public const string ReportsExport = "Reports.Export";

    // Audit
    public const string AuditView = "Audit.View";

    // Settings
    public const string SettingsView = "Settings.View";
    public const string SettingsUpdate = "Settings.Update";

    public static readonly string[] All =
    [
        UsersView, UsersCreate, UsersUpdate, UsersDelete,
        RolesView, RolesManage,
        ProjectsView, ProjectsCreate, ProjectsUpdate, ProjectsDelete,
        SitesView, SitesCreate, SitesUpdate, SitesDelete, SitesAssign,
        ProjectDataView, ProjectDataCreate, ProjectDataUpdate, ProjectDataDelete, ProjectDataSubmit, ProjectDataApprove, ProjectDataReject,
        TasksView, TasksCreate, TasksUpdate, TasksDelete, TasksAssign,
        ChatView, ChatSend, ChatDelete,
        ReportsView, ReportsExport,
        AuditView,
        SettingsView, SettingsUpdate
    ];
}
