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
  nameAr: string;
  nameEn: string;
  description?: string;
  isActive: boolean;
  teamsCount: number;
}

export interface TeamDto {
  id: string;
  departmentId: string;
  departmentNameAr: string;
  departmentNameEn: string;
  code: string;
  name: string;
  description?: string;
  leaderUserId?: string;
  leaderName?: string;
  isActive: boolean;
  membersCount: number;
}

export interface TeamMemberDto {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInTeam: string;
  joinedAt: string;
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
