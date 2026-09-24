export type UserRole =
  | 'SuperAdmin' | 'SystemAdmin' | 'Admin' | 'ProjectManager'
  | 'Engineer' | 'SiteEngineer' | 'SoftwareEngineer'
  | 'TechnicalOffice' | 'Accounting' | 'Procurement' | 'Maintenance' | 'Viewer';

export type ProjectStatus = 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Archived';
export type SiteStatus = 'Pending' | 'Active' | 'Suspended' | 'Completed' | 'Closed';

/** TASK-01: Full status set matching backend TaskItemStatus enum */
export type TaskStatus =
  | 'Backlog' | 'ToDo' | 'InProgress'
  | 'Blocked' | 'Review' | 'Completed' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type DataRecordStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'ChangesRequested';
export type DataCategory =
  | 'DailyReport'
  | 'SiteReport'
  | 'ProgressReport'
  | 'InspectionReport'
  | 'EquipmentData'
  | 'MaterialData'
  | 'ManpowerData'
  | 'Measurements'
  | 'CustomDataSheet';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  jobTitle?: string;
  isActive: boolean;
  roles: UserRole[];
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  assignedProjectIds: string[];
  assignedSiteIds: string[];
  isAuthenticated: boolean;
}

export type ProjectType = 'GeneralEngineering' | 'Software' | 'CCTV' | 'AccessControl' | 'Networking' | 'Maintenance';
export type OfferStatus = 'Draft' | 'Submitted' | 'ClientReview' | 'Accepted' | 'Rejected' | 'Revised';
export type InvoiceStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Sent' | 'Paid' | 'PartiallyPaid' | 'Overdue' | 'Cancelled';
export type MaterialRequestStatus = 'Pending' | 'PendingApproval' | 'Approved' | 'Dispatched' | 'ReceivedOnSite' | 'Delivered' | 'Rejected' | (string & {});
export type AssetStatus = 'Available' | 'Assigned' | 'AssignedToSite' | 'AssignedToEngineer' | 'UnderMaintenance' | 'InMaintenance' | 'Retired' | (string & {});
export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical' | (string & {});
export type RiskStatus = 'Identified' | 'Mitigating' | 'Closed' | (string & {});
export type IssueStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed' | (string & {});
export type HandoverStatus = 'Pending' | 'PendingSnagList' | 'SnagsInProgress' | 'PreliminaryHandover' | 'ConditionallyAccepted' | 'FullyAccepted' | 'FinalHandover' | 'UnderWarranty' | 'Rejected' | (string & {});

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  clientName: string;
  status: ProjectStatus;
  type?: ProjectType | string | number;
  progressPercentage?: number;
  startDate?: string;
  endDate?: string;
  totalSitesCount: number;
  createdAt: string;
  /** Optional cover (URL or data URL). Empty → default card image. */
  coverImageUrl?: string | null;
  projectManagerName?: string;
  projectManagerId?: string;
  members?: Array<{ id: string; name: string; email?: string; role?: string }>;
}

export interface Site {
  id: string;
  projectId: string;
  projectName: string;
  code: string;
  name: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: SiteStatus;
  createdAt: string;
  assignments: SiteAssignment[];
}

export interface SiteAssignment {
  id: string;
  siteId: string;
  userId: string;
  engineerName: string;
  engineerEmail: string;
  role: string;
  isPrimary: boolean;
  assignedAt: string;
}

export interface TaskItem {
  id: string;
  taskNumber?: string;
  title: string;
  description?: string;
  projectId: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  isOverdue: boolean;
  assignedToUserId?: string;
  assignedToName?: string;
  assignedToTeamId?: string;
  startAt?: string;
  dueAt?: string;
  completedAt?: string;
  progressPercentage?: number;
  remainingTime?: string;
  overdueTime?: string;
  /** TASK-01: seconds remaining until due date (positive) */
  remainingTimeSeconds?: number;
  /** TASK-01: seconds past due date (positive when overdue) */
  overdueTimeSeconds?: number;
  createdBy?: string;
  createdAt: string;
}

export interface ProjectDataAttachment {
  id: string;
  mediaFileId: string;
  fileName: string;
  originalFileName?: string;
  fileSize: number;
  contentType?: string;
  downloadUrl?: string;
  caption?: string | null;
}

export interface ProjectDataApproval {
  id: string;
  action: string;
  comment?: string | null;
  performedBy: string;
  performerName: string;
  performedAt: string;
}

export interface ProjectDataRecord {
  id: string;
  title: string;
  description?: string;
  category: DataCategory | string;
  status: DataRecordStatus;
  projectId: string;
  projectName: string;
  siteId: string;
  siteName: string;
  submittedBy: string;
  submitterName: string;
  dataPayloadJson?: string;
  version: number;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  createdAt: string;
  approvals?: ProjectDataApproval[];
  attachments?: ProjectDataAttachment[];
}

export interface MessageAttachment {
  id: string;
  mediaFileId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  downloadUrl?: string;
}

export interface MessageReaction {
  id: string;
  userId: string;
  userName: string;
  reaction: string;
  reactedAt: string;
}

export interface MessageReadState {
  userId: string;
  userName: string;
  readAt: string;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderUserId: string;
  senderName: string;
  content: string;
  clientMessageId?: string;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  readStates: MessageReadState[];
  isDelivered?: boolean;
  deliveryStatus?: MessageDeliveryStatus;
}

export interface ConversationMember {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  lastReadAt?: string;
  lastSeenAt?: string;
  isOnline?: boolean;
}

export interface Conversation {
  id: string;
  title?: string;
  isGroup: boolean;
  projectId?: string;
  projectName?: string;
  unreadCount: number;
  lastMessage?: Message;
  members: ConversationMember[];
  createdAt: string;
}

export interface AdminDashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalSites: number;
  activeSites: number;
  totalEngineers: number;
  pendingApprovals: number;
  approvedData: number;
  rejectedData: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  unreadNotifications: number;
  unreadMessages: number;
  delayedProjects?: number;
  totalTeams?: number;
  pendingDocuments?: number;
  openIssues?: number;
  criticalRisks?: number;
  maintenanceTickets?: number;
  expiringWarranties?: number;
}

export interface RecentMessagePreview {
  id: string;
  conversationId: string;
  preview: string;
  senderName: string;
  createdAt: string;
}

export interface EngineerDashboardStats {
  myProjectsCount: number;
  mySitesCount: number;
  myTasksCount: number;
  pendingTasksCount: number;
  overdueTasksCount: number;
  completedTasksCount: number;
  pendingDataCount: number;
  approvedDataCount: number;
  unreadNotifications: number;
  unreadMessages: number;
  todayTasksCount?: number;
  pendingDocumentsCount?: number;
  recentMessages?: RecentMessagePreview[];
  dailyReportsCount?: number;
  openIssuesCount?: number;
  siteOperationsCount?: number;
}

export interface TechnicalOfficeDashboardStats {
  pendingBoqsCount: number;
  technicalOffersCount: number;
  quotationRequestsCount: number;
  submittalsCount: number;
  drawingsCount: number;
  datasheetsCount: number;
  clientRequirementsCount: number;
  pendingReviewsCount: number;
  expiringQuotationsCount: number;
}

export interface AuditLogItem {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SystemSafeConfig {
  appName: string;
  environment: string;
  signalR: {
    enabled: boolean;
    hubPath: string;
    hubUrl?: string;
    reconnectEnabled: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface SignalRConfig {
  hubEnabled: boolean;
  hubPath: string;
  hubUrl: string;
  reconnectEnabled: boolean;
  allowedOrigins: string[];
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface BoqItem {
  id: string;
  projectId: string;
  siteId?: string;
  siteName?: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  estimatedCost: number;
  totalPrice: number;
  category: string;
  notes?: string;
  createdAt: string;
}

export interface TechnicalOffer {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  scopeOfWork: string;
  specificationsJson: string;
  deliverables: string;
  status: OfferStatus;
  version: number;
  documentMediaFileId?: string;
  createdAt: string;
}

export interface CommercialOffer {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  totalAmount: number;
  discount: number;
  tax: number;
  finalAmount: number;
  currency: string;
  paymentTerms: string;
  validityDays: number;
  status: OfferStatus;
  version: number;
  documentMediaFileId?: string;
  createdAt: string;
}

export interface ProjectInvoice {
  id: string;
  projectId: string;
  projectName: string;
  invoiceNumber: string;
  milestoneDescription: string;
  amount: number;
  currency: string;
  issuedDate: string;
  dueDate?: string;
  paidDate?: string;
  status: InvoiceStatus;
  notes?: string;
  attachmentMediaFileId?: string;
  createdAt: string;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  inStockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minimumThreshold: number;
  category: string;
  createdAt: string;
}

export interface SiteMaterialRequestItem {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantityRequested: number;
  quantityApproved: number;
  quantityDispatched: number;
  notes?: string;
}

export interface SiteMaterialRequest {
  id: string;
  requestNumber?: string;
  projectId: string;
  projectName: string;
  siteId: string;
  siteName: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requiredDate: string;
  status: MaterialRequestStatus;
  approvedByUserId?: string;
  approvedByUserName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  items: SiteMaterialRequestItem[];
}

export interface CompanyAsset {
  id: string;
  assetTag: string;
  name: string;
  model: string;
  serialNumber: string;
  category: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  assignedToSiteId?: string;
  assignedToSiteName?: string;
  status: AssetStatus;
  purchaseDate?: string;
  warrantyExpiry?: string;
  maintenanceNotes?: string;
  createdAt: string;
}

export interface ProjectRisk {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  category?: string;
  severity: RiskSeverity;
  probability: number;
  impact?: number;
  riskScore?: number;
  mitigationPlan: string;
  ownerUserId?: string;
  ownerUserName?: string;
  status: RiskStatus;
  createdAt: string;
}

export interface ProjectIssue {
  id: string;
  projectId: string;
  projectName: string;
  siteId?: string;
  siteName?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  rootCause?: string;
  resolution?: string;
  status: IssueStatus;
  reportedByUserId: string;
  reportedByUserName: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface ProjectHandover {
  id: string;
  projectId: string;
  projectName: string;
  handoverDate: string;
  status: HandoverStatus;
  acceptanceStatus?: HandoverStatus;
  snagListJson: string;
  preliminaryAcceptedBy?: string;
  finalAcceptedBy?: string;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  warrantyTerms?: string;
  maintenanceContractRef?: string;
  createdAt: string;
}

// Enterprise Documents
export interface DocumentTypeDto {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DocumentDto {
  id: string;
  documentNumber: string;
  projectId: string;
  projectName: string;
  siteId?: string;
  siteName?: string;
  documentTypeId: string;
  documentTypeNameAr: string;
  documentTypeNameEn: string;
  title: string;
  description?: string;
  status: 'Draft' | 'UnderReview' | 'Approved' | 'Rejected' | 'CorrectionRequested' | 'Archived' | string;
  ownerUserId: string;
  ownerUserName: string;
  currentVersionNumber: number;
  isLocked: boolean;
  canEdit?: boolean;
  isEditable?: boolean;
  editableUntil?: string;
  createdAt: string;
  updatedAt?: string;
  category?: DocumentCategory | number | string;
}

export interface DocumentVersionDto {
  id: string;
  documentId: string;
  versionNumber: number;
  fileId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  checksum: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  uploadedAt: string;
  status: 'Active' | 'Superceded' | 'Archived' | 'Locked' | string;
  changeReason?: string;
  isLocked: boolean;
  canEdit: boolean;
  editableUntil?: string;
  downloadUrl?: string;
}

export interface DocumentApprovalDto {
  id: string;
  documentId: string;
  versionId: string;
  versionNumber: number;
  requestedByUserId: string;
  requestedByUserName: string;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'CorrectionRequested' | string;
  reason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface DocumentCorrectionDto {
  id: string;
  documentId: string;
  originalVersionId: string;
  originalVersionNumber: number;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedToUserId: string;
  requestedToUserName: string;
  reason: string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Cancelled' | string;
  createdAt: string;
  resolvedAt?: string;
}

export interface DocumentDetailDto extends DocumentDto {
  versions: DocumentVersionDto[];
  approvals: DocumentApprovalDto[];
  corrections: DocumentCorrectionDto[];
}

// Enterprise Milestones & Roadmap
export interface MilestoneDependencyDto {
  id: string;
  milestoneId: string;
  dependsOnMilestoneId: string;
  dependsOnMilestoneName: string;
  dependsOnStatus: string;
}

export interface ProjectMilestoneDto {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  status: 'NotStarted' | 'InProgress' | 'Completed' | 'Delayed' | 'Cancelled' | string;
  weight: number;
  sortOrder: number;
  createdBy: string;
  creatorName: string;
  dependencies: MilestoneDependencyDto[];
}

export interface ProjectAssignmentDto {
  id: string;
  projectId: string;
  projectName: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  teamId?: string;
  teamName?: string;
  role: string;
  assignedAt: string;
  assignedBy?: string;
  isActive: boolean;
}

// Enterprise Organization
export interface DepartmentDto {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  description?: string | null;
  managerUserId?: string | null;
  managerUserName?: string | null;
  parentDepartmentId?: string | null;
  parentDepartmentName?: string | null;
  isActive: boolean;
  subDepartmentsCount?: number;
  teamsCount: number;
  membersCount?: number;
  createdAt?: string;
}

export interface TeamDto {
  id: string;
  departmentId: string;
  departmentName?: string;
  departmentNameAr?: string;
  departmentNameEn?: string;
  code: string;
  name: string;
  description?: string | null;
  managerUserId?: string | null;
  managerUserName?: string | null;
  assistantManagerUserId?: string | null;
  assistantManagerUserName?: string | null;
  supervisorUserId?: string | null;
  supervisorUserName?: string | null;
  leaderUserId?: string;
  leaderName?: string;
  isActive: boolean;
  membersCount: number;
  createdAt?: string;
}

export interface TeamMemberDto {
  id: string;
  teamId: string;
  teamName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamRole?: string;
  roleInTeam?: string;
  isPrimaryTeam?: boolean;
  joinedAt: string;
  leftAt?: string | null;
  isActive: boolean;
}

// Enterprise User Preferences & Profiles
export interface UserPreferenceDto {
  userId: string;
  language: string;
  timeZone: string;
  theme: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  updatedAt: string;
}

export interface UserProfileDto {
  userId: string;
  bio?: string;
  profilePictureUrl?: string;
  phoneNumber2?: string;
  address?: string;
  nationalId?: string;
  birthDate?: string;
  skillsJson?: string;
  emergencyContact?: string;
}

// ============================================================
// Site Operations (Prompt OPERATIONS-01)
// ============================================================
export type OperationType =
  | 'Installation'
  | 'Maintenance'
  | 'Programming'
  | 'Configuration'
  | 'Inspection'
  | 'Testing'
  | 'Troubleshooting'
  | 'SiteSurvey'
  | 'Handover';

export type SiteOperationStatus = 'Pending' | 'InProgress' | 'Completed' | 'Delayed' | 'Cancelled';

export interface SiteOperationDto {
  id: string;
  projectId: string;
  projectName: string;
  siteId: string;
  siteName: string;
  operationType: OperationType;
  title: string;
  description: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  status: SiteOperationStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  createdAt: string;
  workLogsCount: number;
  photosCount: number;
}

export interface OperationWorkLogDto {
  id: string;
  operationId: string;
  userId: string;
  userName: string;
  description: string;
  hours: number;
  createdAt: string;
}

export interface OperationPhotoDto {
  id: string;
  operationId: string;
  projectId: string;
  siteId: string;
  mediaFileId: string;
  fileName: string;
  downloadUrl: string;
  uploaderUserId: string;
  uploaderUserName: string;
  caption?: string;
  createdAt: string;
}

// ============================================================
// Daily Site Reports (Prompt SITE-REPORT-01)
// ============================================================
export type DailyReportStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Approved' | 'Rejected';

export interface DailySiteReportDto {
  id: string;
  projectId: string;
  projectName: string;
  siteId: string;
  siteName: string;
  reportDate: string;
  engineerUserId: string;
  engineerUserName: string;
  teamId?: string;
  teamName?: string;
  status: DailyReportStatus;
  revisionNumber: number;
  isImmutable: boolean;
  createdAt: string;
  approvedAt?: string;
  approvedByUserName?: string;
  attachmentsCount: number;
}

export interface DailyReportAttachmentDto {
  id: string;
  dailySiteReportId: string;
  mediaFileId: string;
  fileName: string;
  attachmentType: 'Photo' | 'Sheet' | 'Document' | string;
  caption?: string;
  downloadUrl: string;
  createdAt: string;
}

export interface DailySiteReportDetailDto extends DailySiteReportDto {
  manpower: string;
  workCompleted: string;
  problems: string;
  materialsReceived: string;
  materialsUsed: string;
  equipment: string;
  safetyNotes: string;
  tomorrowPlan: string;
  parentReportId?: string;
  reviewedAt?: string;
  reviewedByUserName?: string;
  reviewNotes?: string;
  attachments: DailyReportAttachmentDto[];
  weather?: string;
  workersCount?: number;
  workInProgress?: string;
  delays?: string;
}

// ============================================================
// Accounting Workspace (Prompt ACCOUNTING-01)
// ============================================================
export interface AccountingDashboardStatsDto {
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalDueAmount: number;
  totalOverdueAmount: number;
  totalInvoicesCount: number;
  dueInvoicesCount: number;
  overdueInvoicesCount: number;
  pendingApprovalInvoicesCount: number;
  totalApprovedBoqValue: number;
  approvedBoqCount: number;
}

export interface AccountingInvoiceDto {
  id: string;
  projectId: string;
  projectName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  paidDate?: string;
  amount: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  documentId?: string;
  documentNumber?: string;
  attachmentMediaFileId?: string;
  downloadUrl?: string;
  createdBy: string;
  createdAt: string;
}

export interface ApprovedBoqSummaryDto {
  id: string;
  projectId: string;
  projectName: string;
  itemCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  approvedAt: string;
}

export interface CommercialDocumentDto {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  documentType: string;
  amount: number;
  currency: string;
  status: string;
  version: number;
  downloadUrl?: string;
  createdAt: string;
}

// ============================================================
// Assets & Warranty (Prompt ASSET-01)
// ============================================================
export type AssetType =
  | 'Camera'
  | 'NVR'
  | 'Switch'
  | 'AccessController'
  | 'Reader'
  | 'DoorController'
  | 'Server'
  | 'UPS'
  | 'Other';

export interface WarrantyAlertDto {
  assetId: string;
  assetCode: string;
  name: string;
  model?: string;
  serialNumber?: string;
  assetType: AssetType;
  projectId?: string;
  projectName?: string;
  warrantyEnd?: string;
  daysRemaining: number;
  alertLevel: string;
  notificationSent: boolean;
}
// ──────────────────────────────────────────────────────────────
// NOTIFY-02: All 20 notification types
// ──────────────────────────────────────────────────────────────

export type NotificationType =
  | 'TaskAssigned' | 'TaskDueSoon' | 'TaskOverdue' | 'TaskCompleted'
  | 'DocumentUploaded' | 'DocumentApproved' | 'DocumentRejected' | 'CorrectionRequested'
  | 'ProjectAssigned' | 'ProjectUpdated' | 'MilestoneCompleted'
  | 'IssueCreated' | 'IssueAssigned' | 'IssueOverdue'
  | 'MaintenanceCreated' | 'MaintenanceAssigned' | 'WarrantyExpiring'
  | 'ChatMessage' | 'Mention' | 'ApprovalRequested'
  | 'TaskUpdated' | 'DataSubmitted' | 'DataApproved' | 'DataRejected'
  | 'NewMessage' | 'UserAssignedToSite' | 'SystemNotification';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  eventKey?: string;
  isRead: boolean;
  createdAt: string;
}

// ──────────────────────────────────────────────────────────────
// ADMIN-01: Admin dashboard types
// ──────────────────────────────────────────────────────────────

export interface AdminPermission {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  permissions: AdminPermission[];
}

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  roles: string[];
}

// ──────────────────────────────────────────────────────────────
// ORG-01 to ORG-05: MTI Organization Management Types
// ──────────────────────────────────────────────────────────────

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  managerUserId?: string | null;
  managerUserName?: string | null;
  parentDepartmentId?: string | null;
  parentDepartmentName?: string | null;
  isActive: boolean;
  subDepartmentsCount: number;
  teamsCount: number;
  membersCount: number;
  createdAt: string;
}

export interface DepartmentMember {
  id: string;
  departmentId: string;
  departmentName: string;
  userId: string;
  userName: string;
  userEmail: string;
  departmentRole: string;
  isPrimary: boolean;
  joinedAt: string;
  leftAt?: string | null;
  isActive: boolean;
}

export interface DepartmentTreeNode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  managerUserId?: string | null;
  managerUserName?: string | null;
  parentDepartmentId?: string | null;
  isActive: boolean;
  teamsCount: number;
  membersCount: number;
  children: DepartmentTreeNode[];
}

export interface Team {
  id: string;
  departmentId: string;
  departmentName: string;
  code: string;
  name: string;
  description?: string | null;
  managerUserId?: string | null;
  managerUserName?: string | null;
  assistantManagerUserId?: string | null;
  assistantManagerUserName?: string | null;
  supervisorUserId?: string | null;
  supervisorUserName?: string | null;
  isActive: boolean;
  membersCount: number;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamRole: string;
  isPrimaryTeam: boolean;
  joinedAt: string;
  leftAt?: string | null;
  isActive: boolean;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  userEmail: string;
  projectRole: string;
  isPrimary: boolean;
  assignedAt: string;
  assignedBy?: string | null;
  assignedByName?: string | null;
  removedAt?: string | null;
  isActive: boolean;
}

export interface ProjectTeam {
  id: string;
  projectId: string;
  projectName: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  teamManagerName?: string | null;
  teamRole: string;
  teamMembersCount: number;
  assignedAt: string;
  assignedBy?: string | null;
  assignedByName?: string | null;
  removedAt?: string | null;
  isActive: boolean;
}

export interface SiteMember {
  id: string;
  siteId: string;
  siteName: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  userEmail: string;
  siteRole: string;
  isPrimary: boolean;
  assignedAt: string;
  assignedBy?: string | null;
  assignedByName?: string | null;
  removedAt?: string | null;
  isActive: boolean;
}

export interface SiteTeam {
  id: string;
  siteId: string;
  siteName: string;
  teamId: string;
  teamName: string;
  teamCode: string;
  teamManagerName?: string | null;
  teamRole: string;
  teamMembersCount: number;
  assignedAt: string;
  assignedBy?: string | null;
  assignedByName?: string | null;
  removedAt?: string | null;
  isActive: boolean;
}

export interface OrganizationRoles {
  departmentRoles: string[];
  teamRoles: string[];
  projectRoles: string[];
  siteRoles: string[];
}

// ============================================================
// ORG-06: RACI Responsibility Matrix
// ============================================================

export type ResponsibilityType = 'Responsible' | 'Accountable' | 'Consulted' | 'Informed';

export interface ResourceResponsibility {
  id: string;
  resourceType: 'Project' | 'Site' | 'Task' | 'Document' | string;
  resourceId: string;
  resourceName?: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  responsibilityType: ResponsibilityType;
  assignedBy?: string | null;
  assignedByName?: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface AssignResponsibilityRequest {
  resourceType: string;
  resourceId: string;
  userId?: string | null;
  teamId?: string | null;
  responsibilityType: ResponsibilityType;
}

export interface RaciMatrix {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  responsible: ResourceResponsibility[];
  accountable: ResourceResponsibility[];
  consulted: ResourceResponsibility[];
  informed: ResourceResponsibility[];
}

// ============================================================
// ADMIN-02 & ADMIN-03: Master Data Center
// ============================================================

export interface MasterDataItem {
  id: string;
  category: string;
  code: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface MasterDataCategory {
  category: string;
  displayName: string;
  description: string;
  itemCount: number;
}

export interface CreateMasterDataItemRequest {
  category: string;
  code: string;
  name: string;
  nameAr?: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateMasterDataItemRequest {
  name: string;
  nameAr?: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
}

// ============================================================
// ADMIN-04: User Administration & Profile
// ============================================================

export interface UserTeamAssignment {
  teamId: string;
  teamName: string;
  role: string;
  isPrimary: boolean;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string | null;
  employeeCode?: string | null;
  jobTitle?: string | null;
  hireDate?: string | null;
  profileImageUrl?: string | null;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  departmentId?: string | null;
  departmentName?: string | null;
  teams: UserTeamAssignment[];
  activeProjectsCount: number;
  activeSitesCount: number;
  createdAt: string;
}

export interface CreateUserAdminRequest {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  employeeCode?: string;
  jobTitle?: string;
  hireDate?: string;
  departmentId?: string;
  roles?: string[];
  permissions?: string[];
}

export interface UpdateUserAdminRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  employeeCode?: string;
  jobTitle?: string;
  hireDate?: string;
  departmentId?: string;
  roles?: string[];
  permissions?: string[];
  isActive?: boolean;
}

export interface AssignUserDepartmentRequest {
  departmentId: string;
  role?: string;
}

export interface AssignUserTeamRequest {
  teamId: string;
  role?: string;
  isPrimary?: boolean;
}

// ============================================================
// UI-ORG-01 & UI-ORG-02: Batch Assignments
// ============================================================

export interface BatchAssignUsersRequest {
  userIds: string[];
  role: string;
  isPrimary?: boolean;
}

export interface BatchAssignTeamsRequest {
  teamIds: string[];
  role: string;
}

// ============================================================
// ORG-08: Workload Management
// ============================================================

export interface UserWorkload {
  userId: string;
  fullName: string;
  email: string;
  employeeCode?: string | null;
  departmentName?: string | null;
  activeProjects: number;
  activeSites: number;
  openTasks: number;
  overdueTasks: number;
  upcomingDeadlines: number;
  assignedHours: number;
  completedTasks: number;
}

export interface TeamWorkload {
  teamId: string;
  teamName: string;
  teamCode: string;
  managerName?: string | null;
  membersCount: number;
  activeProjects: number;
  activeSites: number;
  openTasks: number;
  overdueTasks: number;
  upcomingDeadlines: number;
  assignedHours: number;
  completedTasks: number;
}

export interface ProjectWorkload {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
  membersCount: number;
  teamsCount: number;
  openTasks: number;
  overdueTasks: number;
  totalTasks: number;
  completionPercentage: number;
}

// ============================================================
// ORG-09: Temporary Responsibility Delegation
// ============================================================

export interface Delegation {
  id: string;
  userId: string;
  userName?: string;
  delegateUserId: string;
  delegateUserName?: string;
  scopeType: 'Global' | 'Project' | 'Site' | 'Team' | string;
  scopeId?: string | null;
  scopeName?: string | null;
  permissions?: string | null;
  startAt: string;
  endAt: string;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  isActive: boolean;
  isExpired: boolean;
}

export interface CreateDelegationRequest {
  userId: string;
  delegateUserId: string;
  scopeType: string;
  scopeId?: string | null;
  permissions?: string | null;
  startAt: string;
  endAt: string;
}

// ============================================================
// SECURITY-03: Dynamic Permission Management
// ============================================================

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  module: string;
  description?: string;
  isActive: boolean;
}

export interface ModulePermissionsDto {
  module: string;
  permissions: PermissionDto[];
}

export interface RolePermissionsDto {
  roleId: string;
  roleName: string;
  description?: string;
  permissionCodes: string[];
}

export interface UpdateRolePermissionsRequest {
  permissionCodes: string[];
}

export type ResourceScopeType = 'Global' | 'Department' | 'Team' | 'Project' | 'Site' | 'Own';

export type ResourceHierarchyType =
  | 'Company'
  | 'Department'
  | 'Team'
  | 'Project'
  | 'Site'
  | 'Operation'
  | 'Task'
  | 'Document'
  | 'Media';

export interface EvaluateScopeResult {
  userId: string;
  permissionCode: string;
  resourceType: string;
  resourceId: string;
  hasAccess: boolean;
  resolvedScopeContext: {
    userId: string;
    fullName: string;
    email: string;
    roles: string[];
    permissions: string[];
    departmentIds: string[];
    teamIds: string[];
    projectIds: string[];
    siteIds: string[];
  };
}

// ============================================================
// UI-ORG-03: Organization Dashboard
// ============================================================

export interface SimpleUserSummary {
  id: string;
  fullName: string;
  email: string;
  roleName?: string;
}

export interface SimpleProjectSummary {
  id: string;
  name: string;
  code: string;
  status: string;
}

export interface SimpleSiteSummary {
  id: string;
  name: string;
  code: string;
  projectName?: string;
}

export interface OrgDashboardTeamCard {
  id: string;
  name: string;
  code?: string;
  departmentName: string;
  managerName?: string;
  membersCount: number;
  projectsCount: number;
  sitesCount: number;
  openTasksCount: number;
  overdueTasksCount: number;
}

export interface OrgDashboardWarning {
  code: string;
  title: string;
  message: string;
  severity: 'Critical' | 'Warning' | 'Info';
  affectedCount: number;
}

export interface OrganizationDashboard {
  departmentsCount: number;
  teamsCount: number;
  managersCount: number;
  employeesCount: number;
  activeProjectsCount: number;
  activeSitesCount: number;
  unassignedUsersCount: number;
  unassignedProjectsCount: number;
  unassignedSitesCount: number;
  unassignedUsers: SimpleUserSummary[];
  unassignedProjects: SimpleProjectSummary[];
  unassignedSites: SimpleSiteSummary[];
  teamCards: OrgDashboardTeamCard[];
  warnings: OrgDashboardWarning[];
}

// ============================================================
// ORG-12: Assignment History & Audit Trail
// ============================================================

export interface AssignmentHistoryDto {
  id: string;
  assignmentType: string;
  action: string;
  resourceId: string;
  resourceName?: string;
  targetUserId?: string;
  targetTeamId?: string;
  targetName: string;
  role?: string;
  assignedAt: string;
  assignedBy?: string;
  assignedByName?: string;
  removedAt?: string;
  removedBy?: string;
  removedByName?: string;
  reason?: string;
}

export interface AssignmentHistoryFilterRequest {
  resourceType?: string;
  resourceId?: string;
  targetUserId?: string;
  targetTeamId?: string;
  action?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ============================================================
// DOC-01 & DOC-02 & DOC-03: Central Document Center
// ============================================================
export type DocumentCategory =
  | 'TechnicalOffice'
  | 'Accounting'
  | 'Drawings'
  | 'DailyReports'
  | 'SiteDocuments'
  | 'DataSheets'
  | 'Software'
  | 'Installation'
  | 'Maintenance'
  | 'Contracts'
  | 'Procurement'
  | 'Other';

export interface CategoryCountDto {
  category: DocumentCategory | number;
  categoryName: string;
  count: number;
}

export interface ProjectDocumentCenterDto {
  projectId: string;
  projectName: string;
  categories: CategoryCountDto[];
  documents: DocumentDto[];
}

export interface SiteDocumentCenterDto {
  siteId: string;
  siteName: string;
  projectId: string;
  projectName: string;
  categories: CategoryCountDto[];
  documents: DocumentDto[];
}

export interface UnifiedUploadDocumentRequest {
  projectId: string;
  siteId?: string;
  category: DocumentCategory | number;
  documentTypeId: string;
  title: string;
  description?: string;
  fileName: string;
  fileExtension?: string;
  mimeType?: string;
  fileSize: number;
  storageKey: string;
}

// ============================================================
// DRAW-01 & DRAW-02: Drawing Management & Drawing Viewer
// ============================================================
export type DrawingDiscipline =
  | 'Architecture'
  | 'Electrical'
  | 'Mechanical'
  | 'CCTV'
  | 'AccessControl'
  | 'Network'
  | 'FireAlarm'
  | 'Security'
  | 'Civil'
  | 'Other';

export type DrawingType =
  | 'ShopDrawing'
  | 'AsBuilt'
  | 'Schematic'
  | 'SingleLineDiagram'
  | 'Layout'
  | 'Detail'
  | 'Other';

export type DrawingMarkupType =
  | 'Pin'
  | 'Rectangle'
  | 'Circle'
  | 'Arrow'
  | 'Line'
  | 'Text'
  | 'Cloud'
  | 'Comment';

export interface DrawingMarkupDto {
  id: string;
  drawingId: string;
  userId: string;
  userName: string;
  type: DrawingMarkupType;
  positionJson: string;
  text: string;
  color?: string;
  createdAt: string;
}

export interface CreateDrawingMarkupRequest {
  type: DrawingMarkupType;
  positionJson: string;
  text: string;
  color?: string;
}

export interface DrawingRevisionDto {
  id: string;
  drawingId: string;
  revision: string;
  versionNumber: number;
  fileId?: string;
  storageKey: string;
  fileName?: string;
  fileExtension?: string;
  fileSizeBytes: number;
  status: string;
  isCurrent: boolean;
  changeReason?: string;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  approvalComments?: string;
  downloadUrl?: string;
}

export interface DrawingDto {
  id: string;
  projectId: string;
  projectName: string;
  siteId?: string;
  siteName?: string;
  documentId?: string;
  drawingNumber: string;
  drawingTitle: string;
  discipline: DrawingDiscipline | number | string;
  drawingType: DrawingType | number | string;
  revision: string;
  version: number;
  status: string;
  isLocked?: boolean;
  currentRevisionId?: string;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  storageKey: string;
  fileName?: string;
  fileExtension?: string;
  fileSizeBytes: number;
  markupsCount: number;
  downloadUrl?: string;
  revisions?: DrawingRevisionDto[];
}

export interface CreateDrawingRequest {
  projectId: string;
  siteId?: string;
  drawingNumber: string;
  drawingTitle: string;
  discipline: DrawingDiscipline | number;
  drawingType: DrawingType | number;
  revision: string;
  storageKey: string;
  fileName?: string;
  fileExtension?: string;
  fileSizeBytes: number;
  changeReason?: string;
}

export interface CreateDrawingRevisionRequest {
  revision: string;
  storageKey: string;
  fileName?: string;
  fileExtension?: string;
  fileSizeBytes: number;
  changeReason: string;
}

// ============================================================
// DOC-06: MTI Data Sheets
// ============================================================
export interface ProductDataSheetDto {
  id: string;
  documentId?: string;
  projectId?: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  assetId?: string;
  assetName?: string;
  materialId?: string;
  materialName?: string;
  product: string;
  manufacturer: string;
  model: string;
  partNumber?: string;
  category: string;
  version: number;
  storageKey?: string;
  fileName?: string;
  fileSizeBytes: number;
  uploadedBy: string;
  uploaderName: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface CreateProductDataSheetRequest {
  projectId?: string;
  siteId?: string;
  assetId?: string;
  materialId?: string;
  product: string;
  manufacturer: string;
  model: string;
  partNumber?: string;
  category: string;
  storageKey?: string;
  fileName?: string;
  fileSizeBytes: number;
}

// ============================================================
// UX-04 & UX-05: Enterprise Global Search & Activity Center
// ============================================================
export interface GlobalSearchFilters {
  q?: string;
  projectId?: string;
  siteId?: string;
  departmentId?: string;
  teamId?: string;
  userId?: string;
  category?: string;
  documentType?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  entityType?: string;
}

export interface ActivityTimelineItem {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  projectId?: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  oldValues?: string;
  newValues?: string;
  createdAt: string;
}


