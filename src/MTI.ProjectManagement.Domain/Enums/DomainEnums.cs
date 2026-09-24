namespace MTI.ProjectManagement.Domain.Enums;

public enum UserRoleType
{
    SuperAdmin = 0,
    SystemAdmin = 1, // legacy alias of SuperAdmin
    Admin = 2,
    ProjectManager = 3,
    Engineer = 4,
    SiteEngineer = 5,
    SoftwareEngineer = 6,
    TechnicalOffice = 7,
    Accounting = 8,
    Procurement = 9,
    Maintenance = 10,
    Viewer = 11,
    Accountant = 12 // legacy alias of Accounting
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
    Backlog = 0,
    ToDo = 1,
    InProgress = 2,
    Blocked = 3,
    Review = 4,
    Completed = 5,
    Cancelled = 6
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
    // Task notifications (NOTIFY-02)
    TaskAssigned = 1,
    TaskDueSoon = 2,
    TaskOverdue = 3,
    TaskCompleted = 4,

    // Document notifications
    DocumentUploaded = 5,
    DocumentApproved = 6,
    DocumentRejected = 7,
    CorrectionRequested = 8,

    // Project notifications
    ProjectAssigned = 9,
    ProjectUpdated = 10,
    MilestoneCompleted = 11,

    // Issue notifications
    IssueCreated = 12,
    IssueAssigned = 13,
    IssueOverdue = 14,

    // Maintenance & Asset notifications
    MaintenanceCreated = 15,
    MaintenanceAssigned = 16,
    WarrantyExpiring = 17,

    // Communication notifications
    ChatMessage = 18,
    Mention = 19,
    ApprovalRequested = 20,

    // Legacy / system
    TaskUpdated = 21,
    DataSubmitted = 22,
    DataApproved = 23,
    DataRejected = 24,
    NewMessage = 25,
    UserAssignedToSite = 26,
    SystemNotification = 27
}

public enum ProjectType
{
    GeneralEngineering = 1,
    Software = 2,
    CCTV = 3,
    AccessControl = 4,
    Networking = 5,
    Maintenance = 6,
    Integration = 7,
    Other = 8
}

public enum ProjectPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum MilestoneStatus
{
    Pending = 1,
    InProgress = 2,
    Completed = 3,
    Delayed = 4
}

public enum DocumentStatus
{
    Draft = 1,
    Submitted = 2,
    UnderReview = 3,
    Approved = 4,
    Rejected = 5,
    CorrectionRequested = 6,
    Locked = 7,
    Archived = 8
}

public enum DocumentVersionStatus
{
    Draft = 1,
    Active = 2,
    Superseded = 3,
    Locked = 4,
    Approved = 5,
    Rejected = 6,
    PendingReview = 7
}

public enum DocumentApprovalStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    CorrectionRequested = 4
}

public enum CorrectionStatus
{
    Pending = 1,
    InProgress = 2,
    Resolved = 3,
    Cancelled = 4
}

public enum OfferStatus
{
    Draft = 1,
    Submitted = 2,
    ClientReview = 3,
    Accepted = 4,
    Rejected = 5,
    Revised = 6
}

public enum InvoiceStatus
{
    Draft = 1,
    PendingApproval = 2,
    Approved = 3,
    Sent = 4,
    Issued = 4,
    Paid = 5,
    PartiallyPaid = 6,
    Overdue = 7,
    Cancelled = 8
}

public enum OperationType
{
    Installation = 1,
    Maintenance = 2,
    Programming = 3,
    Configuration = 4,
    Inspection = 5,
    Testing = 6,
    Troubleshooting = 7,
    SiteSurvey = 8,
    Handover = 9
}

public enum SiteOperationStatus
{
    Pending = 1,
    InProgress = 2,
    Completed = 3,
    Delayed = 4,
    Cancelled = 5
}

public enum DailyReportStatus
{
    Draft = 1,
    Submitted = 2,
    Reviewed = 3,
    Approved = 4,
    Rejected = 5
}

public enum ConversationType
{
    Direct = 1,
    Project = 2,
    Site = 3,
    Team = 4,
    Group = 5
}

public enum AssetType
{
    Camera = 1,
    NVR = 2,
    Switch = 3,
    AccessController = 4,
    Reader = 5,
    DoorController = 6,
    Server = 7,
    UPS = 8,
    Other = 9
}

public enum MaterialRequestStatus
{
    Pending = 1,
    Approved = 2,
    Dispatched = 3,
    ReceivedOnSite = 4,
    Rejected = 5
}

public enum AssetStatus
{
    Available = 1,
    AssignedToSite = 2,
    AssignedToEngineer = 3,
    UnderMaintenance = 4,
    Retired = 5
}

public enum RiskSeverity
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum RiskStatus
{
    Identified = 1,
    Mitigating = 2,
    Closed = 3
}

public enum IssueStatus
{
    Open = 1,
    InProgress = 2,
    Resolved = 3,
    Closed = 4
}

public enum HandoverStatus
{
    PendingSnagList = 1,
    SnagsInProgress = 2,
    PreliminaryHandover = 3,
    FinalHandover = 4,
    UnderWarranty = 5
}
public enum AuditAction
{
    Create = 1,
    Update = 2,
    Delete = 3,
    Upload = 4,
    Download = 5,
    Approve = 6,
    Reject = 7,
    Assign = 8,
    Unassign = 9,
    Login = 10,
    Logout = 11,
    PermissionChange = 12,
    DocumentCorrection = 13,
    MessageEdit = 14,
    MessageDelete = 15,
    ChangeStatus = 16,
    RequestCorrection = 17
}

public enum ResourceScopeType
{
    Global = 1,
    Department = 2,
    Team = 3,
    Project = 4,
    Site = 5,
    Own = 6
}

public enum ResourceHierarchyType
{
    Company = 1,
    Department = 2,
    Team = 3,
    Project = 4,
    Site = 5,
    Operation = 6,
    Task = 7,
    Document = 8,
    Media = 9
}

// ==========================================
// CORE-01 & DOC-01: Standard Document Categories
// ==========================================
public enum DocumentCategory
{
    TechnicalOffice = 1,
    Accounting = 2,
    Drawings = 3,
    DailyReports = 4,
    SiteDocuments = 5,
    DataSheets = 6,
    Software = 7,
    Installation = 8,
    Maintenance = 9,
    Contracts = 10,
    Procurement = 11,
    Other = 12
}

// ==========================================
// DRAW-01: Drawing Disciplines
// ==========================================
public enum DrawingDiscipline
{
    Architecture = 1,
    Electrical = 2,
    Mechanical = 3,
    CCTV = 4,
    AccessControl = 5,
    Network = 6,
    FireAlarm = 7,
    Security = 8,
    Civil = 9,
    Other = 10
}

public enum DrawingType
{
    CADDrawing = 1,
    ShopDrawing = 2,
    AsBuiltDrawing = 3,
    TechnicalDrawing = 4,
    PDFDrawing = 5,
    ImageDrawing = 6,
    Other = 7
}

// ==========================================
// DRAW-02: Drawing Markups
// ==========================================
public enum DrawingMarkupType
{
    Pin = 1,
    Rectangle = 2,
    Circle = 3,
    Arrow = 4,
    Line = 5,
    Text = 6,
    Cloud = 7,
    Comment = 8
}

// ==========================================
// DOC-04: Technical Office Document Types
// ==========================================
public enum TechnicalOfficeDocumentType
{
    TechnicalOffer = 1,
    BOQ = 2,
    Quotation = 3,
    MaterialSubmittal = 4,
    TechnicalSubmittal = 5,
    MethodStatement = 6,
    ShopDrawing = 7,
    AsBuiltDrawing = 8,
    Specification = 9,
    Calculation = 10,
    TechnicalCorrespondence = 11
}

// ==========================================
// DOC-05: Accounting Document Types
// ==========================================
public enum AccountingDocumentType
{
    Invoice = 1,
    PurchaseInvoice = 2,
    SalesInvoice = 3,
    PaymentDocument = 4,
    Receipt = 5,
    FinancialReport = 6,
    CostSheet = 7,
    ExpenseDocument = 8,
    PaymentCertificate = 9,
    OtherFinancialDocument = 10
}


