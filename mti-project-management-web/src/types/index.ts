export type UserRole = 'SystemAdmin' | 'Admin' | 'ProjectManager' | 'Engineer' | 'Viewer';

export type ProjectStatus = 'Planning' | 'Active' | 'OnHold' | 'Completed' | 'Archived';
export type SiteStatus = 'Pending' | 'Active' | 'Suspended' | 'Completed' | 'Closed';

export type TaskStatus = 'ToDo' | 'InProgress' | 'UnderReview' | 'Completed' | 'Blocked' | 'Cancelled';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

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

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  clientName: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  totalSitesCount: number;
  createdAt: string;
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
  taskNumber: string;
  title: string;
  description?: string;
  projectId: string;
  projectName?: string;
  siteId?: string;
  siteName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedToUserId?: string;
  assignedToName?: string;
  dueAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ProjectDataRecord {
  id: string;
  title: string;
  description?: string;
  category: DataCategory;
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
  createdAt: string;
  attachments?: {
    id: string;
    mediaFileId: string;
    fileName: string;
    fileSize: number;
    downloadUrl?: string;
  }[];
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
