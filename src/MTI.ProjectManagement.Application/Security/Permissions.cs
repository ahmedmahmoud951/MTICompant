namespace MTI.ProjectManagement.Application.Security;

/// <summary>SECURITY-02 permission codes. Includes prompt names (Projects.Edit) plus legacy aliases (Projects.Update).</summary>
public static class Permissions
{
    // Users
    public const string UsersView = "Users.View";
    public const string UsersCreate = "Users.Create";
    public const string UsersUpdate = "Users.Update";
    public const string UsersEdit = "Users.Edit";
    public const string UsersDisable = "Users.Disable";
    public const string UsersDelete = "Users.Delete";

    // Roles & Permissions
    public const string RolesView = "Roles.View";
    public const string RolesManage = "Roles.Manage";

    // Projects
    public const string ProjectsView = "Projects.View";
    public const string ProjectsCreate = "Projects.Create";
    public const string ProjectsUpdate = "Projects.Update";
    public const string ProjectsEdit = "Projects.Edit";
    public const string ProjectsDelete = "Projects.Delete";

    // Sites
    public const string SitesView = "Sites.View";
    public const string SitesCreate = "Sites.Create";
    public const string SitesUpdate = "Sites.Update";
    public const string SitesEdit = "Sites.Edit";
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
    public const string TasksEdit = "Tasks.Edit";
    public const string TasksDelete = "Tasks.Delete";
    public const string TasksAssign = "Tasks.Assign";
    public const string TasksComplete = "Tasks.Complete";

    // Chat
    public const string ChatView = "Chat.View";
    public const string ChatSend = "Chat.Send";
    public const string ChatDelete = "Chat.Delete";
    public const string ChatDeleteOwn = "Chat.DeleteOwn";
    public const string ChatEditOwn = "Chat.EditOwn";

    // Technical Office & BOQ
    public const string BoqView = "BOQ.View";
    public const string BOQView = BoqView; // alias — same code (SQL unique index is case-insensitive)
    public const string BoqCreate = "BOQ.Create";
    public const string BoqEdit = "BOQ.Edit";
    public const string BoqApprove = "BOQ.Approve";
    public const string BoqManage = "Boq.Manage";
    public const string OffersView = "Offers.View";
    public const string OffersManage = "Offers.Manage";
    public const string OffersApprove = "Offers.Approve";
    public const string InvoicesView = "Invoices.View";
    public const string InvoicesCreate = "Invoices.Create";
    public const string InvoicesEdit = "Invoices.Edit";
    public const string InvoicesApprove = "Invoices.Approve";
    public const string InvoicesManage = "Invoices.Manage";

    // Materials & Assets
    public const string MaterialsView = "Materials.View";
    public const string MaterialsRequest = "Materials.Request";
    public const string MaterialsApprove = "Materials.Approve";
    public const string AssetsView = "Assets.View";
    public const string AssetsManage = "Assets.Manage";

    // Governance, Risks & Handover
    public const string GovernanceView = "Governance.View";
    public const string GovernanceManage = "Governance.Manage";

    // Enterprise Documents & Archive
    public const string DocumentsView = "Documents.View";
    public const string DocumentsCreate = "Documents.Create";
    public const string DocumentsUpload = "Documents.Upload";
    public const string DocumentsDownload = "Documents.Download";
    public const string DocumentsUpdate = "Documents.Update";
    public const string DocumentsEditOwnPending = "Documents.EditOwnPending";
    public const string DocumentsDeleteOwnPending = "Documents.DeleteOwnPending";
    public const string DocumentsDelete = "Documents.Delete";
    public const string DocumentsApprove = "Documents.Approve";
    public const string DocumentsReject = "Documents.Reject";
    public const string DocumentsRequestCorrection = "Documents.RequestCorrection";
    public const string DocumentsCorrect = "Documents.Correct";

    // Milestones & Roadmap
    public const string MilestonesView = "Milestones.View";
    public const string MilestonesManage = "Milestones.Manage";

    // Organization & Teams
    public const string OrganizationView = "Organization.View";
    public const string OrganizationManage = "Organization.Manage";

    // Accounting Isolated Permissions (ACCOUNTING-01)
    public const string AccountingViewInvoices = "Accounting.ViewInvoices";
    public const string AccountingDownloadInvoices = "Accounting.DownloadInvoices";
    public const string AccountingViewApprovedBOQ = "Accounting.ViewApprovedBOQ";
    public const string AccountingDownloadApprovedBOQ = "Accounting.DownloadApprovedBOQ";
    public const string AccountingViewPurchaseOrders = "Accounting.ViewPurchaseOrders";
    public const string AccountingViewCommercialDocuments = "Accounting.ViewCommercialDocuments";

    // Site Operations & Daily Reports
    public const string SiteOperationsView = "SiteOperations.View";
    public const string SiteOperationsManage = "SiteOperations.Manage";
    public const string DailyReportsView = "DailyReports.View";
    public const string DailyReportsManage = "DailyReports.Manage";
    public const string DailyReportsApprove = "DailyReports.Approve";

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
        UsersView, UsersCreate, UsersUpdate, UsersEdit, UsersDisable, UsersDelete,
        RolesView, RolesManage,
        ProjectsView, ProjectsCreate, ProjectsUpdate, ProjectsEdit, ProjectsDelete,
        SitesView, SitesCreate, SitesUpdate, SitesEdit, SitesDelete, SitesAssign,
        ProjectDataView, ProjectDataCreate, ProjectDataUpdate, ProjectDataDelete, ProjectDataSubmit, ProjectDataApprove, ProjectDataReject,
        TasksView, TasksCreate, TasksUpdate, TasksEdit, TasksDelete, TasksAssign, TasksComplete,
        ChatView, ChatSend, ChatDelete, ChatDeleteOwn, ChatEditOwn,
        BoqView, BoqCreate, BoqEdit, BoqApprove, BoqManage,
        OffersView, OffersManage, OffersApprove,
        InvoicesView, InvoicesCreate, InvoicesEdit, InvoicesApprove, InvoicesManage,
        AccountingViewInvoices, AccountingDownloadInvoices, AccountingViewApprovedBOQ, AccountingDownloadApprovedBOQ, AccountingViewPurchaseOrders, AccountingViewCommercialDocuments,
        MaterialsView, MaterialsRequest, MaterialsApprove,
        AssetsView, AssetsManage,
        SiteOperationsView, SiteOperationsManage,
        DailyReportsView, DailyReportsManage, DailyReportsApprove,
        GovernanceView, GovernanceManage,
        DocumentsView, DocumentsCreate, DocumentsUpload, DocumentsDownload, DocumentsUpdate,
        DocumentsEditOwnPending, DocumentsDeleteOwnPending, DocumentsDelete, DocumentsApprove, DocumentsReject, DocumentsRequestCorrection, DocumentsCorrect,
        MilestonesView, MilestonesManage,
        OrganizationView, OrganizationManage,
        ReportsView, ReportsExport,
        AuditView,
        SettingsView, SettingsUpdate
    ];
}
