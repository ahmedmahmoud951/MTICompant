'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { authService } from '@/services/auth.service';
import { projectService, siteService } from '@/services/project.service';
import { signalRService } from '@/services/signalr.service';
import { chatService } from '@/services/chat.service';
import { dashboardService } from '@/services/dashboard.service';
import { dataRecordService } from '@/services/data-records.service';
import { taskService } from '@/services/task.service';
import { notificationService } from '@/services/notification.service';
import { mediaService } from '@/services/media.service';
import { operationsService } from '@/services/operations.service';
import { syncService } from '@/services/sync.service';
import {
  Project,
  Site,
  User,
  Conversation,
  Message,
  ConversationMember,
  TaskItem,
  ProjectDataRecord,
  AdminDashboardStats,
  EngineerDashboardStats,
  TechnicalOfficeDashboardStats,
  AuditLogItem,
  SystemSafeConfig,
  NotificationItem,
  BoqItem,
  TechnicalOffer,
  CommercialOffer,
  ProjectInvoice,
  Material,
  SiteMaterialRequest,
  CompanyAsset,
  ProjectRisk,
  ProjectIssue,
  ProjectHandover,
  ProjectType
} from '@/types';
import {
  DocumentsManager,
  MilestonesRoadmap,
  OrganizationView,
  AccountingWorkspace,
  SiteOperationsManager,
  DailySiteReportsManager,
  ReportsAnalyticsHub,
  MainDashboard
} from '@/features';
import {
  ShieldCheck,
  Radio,
  LogOut,
  MapPin,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  ChevronRight,
  MessageSquare,
  CheckSquare,
  Send,
  ThumbsUp,
  Users,
  History,
  Download,
  RefreshCw,
  X,
  FileCheck,
  FolderKanban,
  Bell,
  BarChart3,
  Settings,
  Upload,
  FileSpreadsheet,
  ChevronLeft,
  UserCircle,
  LayoutDashboard,
  Activity,
  Briefcase,
  Fingerprint,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronDown,
  Menu,
  Globe,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
  Pencil,
  Trash2,
  Package,
  Wrench,
  ShieldAlert,
  Award,
  FileText,
  DollarSign,
  Layers,
  AlertTriangle,
  TrendingUp,
  Image as ImageIcon,
  Camera,
  FolderOpen,
  CloudSun,
  Building2,
  ClipboardList,
  FileUp
} from 'lucide-react';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';
import { ReportDetailsModal } from '@/components/ReportDetailsModal';
import { Language, getTranslation, TranslationKey, formatDateCairo } from '@/lib/i18n';
import { API_BASE_URL, apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { resizeToProjectCover, resolveProjectCover, DEFAULT_PROJECT_COVER } from '@/lib/project-cover';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signalRConnected, setSignalRConnected] = useState(false);

  // Active navigation tab (Prompt 20)
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Dashboard Stats
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [engineerStats, setEngineerStats] = useState<EngineerDashboardStats | null>(null);
  const [techOfficeDashboard, setTechOfficeDashboard] = useState<TechnicalOfficeDashboardStats | null>(null);

  // Projects & Sites
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectSites, setSelectedProjectSites] = useState<Site[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [loadingAllSites, setLoadingAllSites] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  // Data Submissions & Approval Center
  const [pendingRecords, setPendingRecords] = useState<ProjectDataRecord[]>([]);
  const [approvedRecords, setApprovedRecords] = useState<ProjectDataRecord[]>([]);
  const [approvalComment, setApprovalComment] = useState('');

  // Report Inspection Modal
  const [inspectingRecord, setInspectingRecord] = useState<ProjectDataRecord | null>(null);
  const [inspectingRecordId, setInspectingRecordId] = useState<string | null>(null);

  // Approved Records Multi-Filters
  const [approvedSearchQuery, setApprovedSearchQuery] = useState('');
  const [approvedCategoryFilter, setApprovedCategoryFilter] = useState('ALL');
  const [approvedProjectFilter, setApprovedProjectFilter] = useState('ALL');
  const [approvedSiteFilter, setApprovedSiteFilter] = useState('ALL');
  const [approvedSubmitterFilter, setApprovedSubmitterFilter] = useState('ALL');
  const [approvedStartDate, setApprovedStartDate] = useState('');
  const [approvedEndDate, setApprovedEndDate] = useState('');

  // Engineer Data Submission Form
  const [submitCategory, setSubmitCategory] = useState('DailyReport');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitWeather, setSubmitWeather] = useState('');
  const [submitCrewCount, setSubmitCrewCount] = useState('');
  const [submitWorkDone, setSubmitWorkDone] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitSiteId, setSubmitSiteId] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ id?: string; name: string; size: string; file?: File }[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal Saving States with Loading Counters
  const [projectSaving, setProjectSaving] = useState(false);
  const [siteSaving, setSiteSaving] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [chatStarting, setChatStarting] = useState(false);
  const [opsModalSaving, setOpsModalSaving] = useState(false);

  // Real-Time Chat & WhatsApp Message Statuses
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const activeConversationRef = useRef<Conversation | null>(null);
  const selectedProjectIdRef = useRef<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [deliveredMessageIds, setDeliveredMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);

  // Facebook Messenger & Notifications Dropdown in Topbar
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [chatSearchUser, setChatSearchUser] = useState('');
  const [chatListSearch, setChatListSearch] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});

  // Floating Toast Notifications (Tasks & Chat)
  const [toasts, setToasts] = useState<
    { id: string; title: string; message: string; type: 'chat' | 'task' | 'info'; linkTab?: string; conversationId?: string }[]
  >([]);

  const addToast = (
    title: string,
    message: string,
    type: 'chat' | 'task' | 'info' = 'info',
    linkTab?: string,
    conversationId?: string
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type, linkTab, conversationId }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const totalUnreadMessages = useMemo(
    () => conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0),
    [conversations]
  );

  // Real-Time Notifications
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);

  // User Management
  const [userList, setUserList] = useState<any[]>([]);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Engineer');
  const [newUserJobTitle, setNewUserJobTitle] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  // Mobile & Tablet Responsive Navigation
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Bilingual / Internationalization (Arabic 🇪🇬 / English 🇺🇸)
  const [lang, setLang] = useState<Language>('ar');

  const t = (k: TranslationKey) => getTranslation(k, lang);

  const toggleLanguage = () => {
    const next: Language = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mti_lang', next);
      document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = next;
    }
    logger.info('Language toggled', { language: next });
  };

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Global Search
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // System Safe Settings
  const [safeConfig, setSafeConfig] = useState<SystemSafeConfig | null>(null);

  // New Project Form Modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newProjectMemberIds, setNewProjectMemberIds] = useState<string[]>([]);
  const [newProjectType, setNewProjectType] = useState<string>('GeneralEngineering');
  const [newProgressPercentage, setNewProgressPercentage] = useState<number>(0);
  const [newCoverImageUrl, setNewCoverImageUrl] = useState<string | null>(null);
  const [coverImageBusy, setCoverImageBusy] = useState(false);

  // Operations Platform State (Technical Office, Materials & Assets, Governance)
  const [techOfficeSubtab, setTechOfficeSubtab] = useState<'boq' | 'techOffers' | 'commOffers' | 'invoices'>('boq');
  const [materialsSubtab, setMaterialsSubtab] = useState<'catalog' | 'requests' | 'assets'>('catalog');
  const [governanceSubtab, setGovernanceSubtab] = useState<'risks' | 'issues' | 'handover'>('risks');

  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [techOffers, setTechOffers] = useState<TechnicalOffer[]>([]);
  const [commOffers, setCommOffers] = useState<CommercialOffer[]>([]);
  const [invoices, setInvoices] = useState<ProjectInvoice[]>([]);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialRequests, setMaterialRequests] = useState<SiteMaterialRequest[]>([]);
  const [companyAssets, setCompanyAssets] = useState<CompanyAsset[]>([]);

  const [projectRisks, setProjectRisks] = useState<ProjectRisk[]>([]);
  const [projectIssues, setProjectIssues] = useState<ProjectIssue[]>([]);
  const [projectHandovers, setProjectHandovers] = useState<ProjectHandover[]>([]);
  const [loadingOpsData, setLoadingOpsData] = useState(false);

  // Operations Modals State
  const [showBoqModal, setShowBoqModal] = useState(false);
  const [boqItemCode, setBoqItemCode] = useState('');
  const [boqDesc, setBoqDesc] = useState('');
  const [boqUnit, setBoqUnit] = useState('Unit');
  const [boqQty, setBoqQty] = useState(1);
  const [boqUnitPrice, setBoqUnitPrice] = useState(0);
  const [boqEstCost, setBoqEstCost] = useState(0);
  const [boqCategory, setBoqCategory] = useState('Hardware');
  const [boqNotes, setBoqNotes] = useState('');

  const [showTechOfferModal, setShowTechOfferModal] = useState(false);
  const [techOfferTitle, setTechOfferTitle] = useState('');
  const [techOfferScope, setTechOfferScope] = useState('');
  const [techOfferSpecs, setTechOfferSpecs] = useState('');
  const [techOfferDeliverables, setTechOfferDeliverables] = useState('');

  const [showCommOfferModal, setShowCommOfferModal] = useState(false);
  const [commOfferTitle, setCommOfferTitle] = useState('');
  const [commOfferAmount, setCommOfferAmount] = useState(0);
  const [commOfferDiscount, setCommOfferDiscount] = useState(0);
  const [commOfferTax, setCommOfferTax] = useState(0);
  const [commOfferCurrency, setCommOfferCurrency] = useState('EGP');
  const [commOfferTerms, setCommOfferTerms] = useState('');
  const [commOfferValidity, setCommOfferValidity] = useState(30);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invNumber, setInvNumber] = useState('');
  const [invMilestone, setInvMilestone] = useState('');
  const [invAmount, setInvAmount] = useState(0);
  const [invCurrency, setInvCurrency] = useState('EGP');
  const [invDueDate, setInvDueDate] = useState('');
  const [invNotes, setInvNotes] = useState('');

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matCode, setMatCode] = useState('');
  const [matName, setMatName] = useState('');
  const [matSpec, setMatSpec] = useState('');
  const [matUnit, setMatUnit] = useState('Pcs');
  const [matStock, setMatStock] = useState(0);
  const [matThreshold, setMatThreshold] = useState(5);
  const [matCat, setMatCat] = useState('CCTV');

  const [showMatRequestModal, setShowMatRequestModal] = useState(false);
  const [matReqSiteId, setMatReqSiteId] = useState('');
  const [matReqItemCode, setMatReqItemCode] = useState('');
  const [matReqDesc, setMatReqDesc] = useState('');
  const [matReqUnit, setMatReqUnit] = useState('Pcs');
  const [matReqQty, setMatReqQty] = useState(1);
  const [matReqNotes, setMatReqNotes] = useState('');

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetTag, setAssetTag] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetCat, setAssetCat] = useState('Equipment');
  const [assetModel, setAssetModel] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetValue, setAssetValue] = useState(0);

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskDesc, setRiskDesc] = useState('');
  const [riskCat, setRiskCat] = useState('Technical');
  const [riskProb, setRiskProb] = useState(3);
  const [riskImpact, setRiskImpact] = useState(3);
  const [riskSeverity, setRiskSeverity] = useState('Medium');
  const [riskMitigation, setRiskMitigation] = useState('');

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [issuePriority, setIssuePriority] = useState('Medium');
  const [issueAssignedTo, setIssueAssignedTo] = useState('');

  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverDate, setHandoverDate] = useState('');
  const [handoverStatus, setHandoverStatus] = useState('Pending');
  const [handoverSnags, setHandoverSnags] = useState('');
  const [handoverWarrantyStart, setHandoverWarrantyStart] = useState('');
  const [handoverWarrantyEnd, setHandoverWarrantyEnd] = useState('');
  const [handoverWarrantyTerms, setHandoverWarrantyTerms] = useState('');

  // Site Form Modal (Admin)
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [siteCode, setSiteCode] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [siteAddress, setSiteAddress] = useState('');

  // Edit mode for users/tasks
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserActive, setEditingUserActive] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Enterprise Drawer (Side inspection panel)
  const [drawerData, setDrawerData] = useState<{ title: string; type: string; details: any } | null>(null);

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    onConfirm: () => { }
  });

  // Image & Document Preview Modal
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'image' | 'document';
    url: string;
  }>({
    isOpen: false,
    title: '',
    type: 'image',
    url: ''
  });

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  useEffect(() => {
    if (activeTab !== 'chat') return;
    const el = chatMessagesEndRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatMessages, activeConversation?.id, activeTab]);

  useEffect(() => {
    if (showNewChatModal) {
      setLoadingContacts(true);
      const timer = setTimeout(() => {
        chatService
          .getContacts(chatSearchUser)
          .then((data) => setChatContacts(data))
          .catch(() => setChatContacts([]))
          .finally(() => setLoadingContacts(false));
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showNewChatModal, chatSearchUser]);

  useEffect(() => {
    if ((activeTab === 'sites' || activeTab === 'my-sites') && currentUser) {
      loadAllSites();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (currentUser) {
      const isAcc = (currentUser.roles as string[]).includes('Accountant') || (currentUser.roles as string[]).includes('Accounting') || (currentUser.permissions && currentUser.permissions.some((p: string) => p.startsWith('Accounting.')));
      const isAdm = currentUser.roles.includes('Admin') || currentUser.roles.includes('SystemAdmin');
      if (isAcc && !isAdm) {
        const forbiddenTabs = [
          'dashboard', 'projects', 'my-projects', 'sites', 'my-sites', 'tasks', 'my-tasks',
          'project-data', 'my-data', 'approvals', 'engineers', 'audit', 'settings',
          'operations', 'daily-reports', 'technical-office', 'materials-assets', 'governance',
          'documents', 'milestones', 'organization', 'chat', 'reports', 'users'
        ];
        if (forbiddenTabs.includes(activeTab)) {
          setActiveTab('accounting');
        }
      }
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' && currentUser) {
      chatService
        .getConversations()
        .then((convs) => {
          setConversations(convs);
          syncPresenceFromConversations(convs);
          const conn = signalRService.getConnection();
          if (conn) {
            convs.forEach((c) => conn.invoke('JoinConversation', c.id).catch(() => { }));
          }
        })
        .catch(() => { });
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'reports-archive' || activeTab === 'reports') {
      dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => { });
    }
    if (activeTab === 'approvals' || activeTab === 'project-data' || activeTab === 'my-data') {
      dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
      dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => { });
    }
  }, [activeTab, currentUser]);

  const loadTechnicalOfficeData = async (projId: string) => {
    if (!projId) return;
    setLoadingOpsData(true);
    try {
      const [boqRes, techRes, commRes, invRes, dash] = await Promise.all([
        operationsService.getProjectBoq(projId),
        operationsService.getTechnicalOffers(projId),
        operationsService.getCommercialOffers(projId),
        operationsService.getProjectInvoices(projId),
        dashboardService.getTechnicalOfficeDashboard().catch(() => null)
      ]);
      if (boqRes.success && boqRes.data) setBoqItems(boqRes.data);
      if (techRes.success && techRes.data) setTechOffers(techRes.data);
      if (commRes.success && commRes.data) setCommOffers(commRes.data);
      if (invRes.success && invRes.data) setInvoices(invRes.data);
      if (dash) setTechOfficeDashboard(dash);
    } catch (e) {
      console.error('Failed to load technical office data', e);
    } finally {
      setLoadingOpsData(false);
    }
  };

  const loadMaterialsAndAssetsData = async () => {
    setLoadingOpsData(true);
    try {
      const [matRes, reqRes, assetRes] = await Promise.all([
        operationsService.getMaterials(),
        operationsService.getSiteMaterialRequests(selectedProjectId || undefined),
        operationsService.getCompanyAssets()
      ]);
      if (matRes.success && matRes.data) setMaterials(matRes.data);
      if (reqRes.success && reqRes.data) setMaterialRequests(reqRes.data);
      if (assetRes.success && assetRes.data) setCompanyAssets(assetRes.data);
    } catch (e) {
      console.error('Failed to load materials and assets', e);
    } finally {
      setLoadingOpsData(false);
    }
  };

  const loadGovernanceData = async (projId: string) => {
    if (!projId) return;
    setLoadingOpsData(true);
    try {
      const [riskRes, issueRes, handRes] = await Promise.all([
        operationsService.getProjectRisks(projId),
        operationsService.getProjectIssues(projId),
        operationsService.getProjectHandover(projId)
      ]);
      if (riskRes.success && riskRes.data) setProjectRisks(riskRes.data);
      if (issueRes.success && issueRes.data) setProjectIssues(issueRes.data);
      if (handRes.success && handRes.data) setProjectHandovers([handRes.data]);
      else setProjectHandovers([]);
    } catch (e) {
      console.error('Failed to load governance data', e);
    } finally {
      setLoadingOpsData(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    if (activeTab === 'technical-office') {
      const isTechOrAdmin =
        currentUser.roles.includes('TechnicalOffice') ||
        currentUser.roles.includes('Admin') ||
        currentUser.roles.includes('SystemAdmin') ||
        currentUser.roles.includes('SuperAdmin') ||
        currentUser.roles.includes('ProjectManager');
      if (isTechOrAdmin) {
        dashboardService.getTechnicalOfficeDashboard().then(setTechOfficeDashboard).catch(() => { });
      }
      if (selectedProjectId) loadTechnicalOfficeData(selectedProjectId);
    } else if (activeTab === 'materials-assets') {
      loadMaterialsAndAssetsData();
    } else if (activeTab === 'governance' && selectedProjectId) {
      loadGovernanceData(selectedProjectId);
    }
  }, [activeTab, selectedProjectId, currentUser]);

  // Operations Action Handlers
  const handleCreateBoqItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createBoqItem({
        projectId: selectedProjectId,
        itemCode: boqItemCode.trim(),
        description: boqDesc.trim(),
        unit: boqUnit.trim(),
        quantity: Number(boqQty) || 1,
        unitPrice: Number(boqUnitPrice) || 0,
        estimatedCost: Number(boqEstCost) || 0,
        category: boqCategory.trim(),
        notes: boqNotes.trim()
      });
      if (res.success && res.data) {
        setBoqItems((prev) => [...prev, res.data]);
        setShowBoqModal(false);
        setBoqItemCode('');
        setBoqDesc('');
        setBoqNotes('');
        addToast(lang === 'ar' ? 'المكتب الفني' : 'Technical Office', lang === 'ar' ? 'تم إضافة بند المقايسة بنجاح' : 'BOQ Item added successfully');
      } else {
        alert(res.message || 'Failed to create BOQ item');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating BOQ item');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateTechOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createTechnicalOffer({
        projectId: selectedProjectId,
        title: techOfferTitle.trim(),
        scopeOfWork: techOfferScope.trim(),
        specificationsJson: techOfferSpecs.trim(),
        deliverables: techOfferDeliverables.trim()
      });
      if (res.success && res.data) {
        setTechOffers((prev) => [res.data, ...prev]);
        setShowTechOfferModal(false);
        setTechOfferTitle('');
        setTechOfferScope('');
        setTechOfferSpecs('');
        setTechOfferDeliverables('');
        addToast(lang === 'ar' ? 'العروض الفنية' : 'Technical Offers', lang === 'ar' ? 'تم تسجيل العرض الفني بنجاح' : 'Technical offer logged successfully');
      } else {
        alert(res.message || 'Failed to create technical offer');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating technical offer');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateCommOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createCommercialOffer({
        projectId: selectedProjectId,
        title: commOfferTitle.trim(),
        totalAmount: Number(commOfferAmount) || 0,
        discount: Number(commOfferDiscount) || 0,
        tax: Number(commOfferTax) || 0,
        currency: commOfferCurrency,
        paymentTerms: commOfferTerms.trim(),
        validityDays: Number(commOfferValidity) || 30
      });
      if (res.success && res.data) {
        setCommOffers((prev) => [res.data, ...prev]);
        setShowCommOfferModal(false);
        setCommOfferTitle('');
        setCommOfferTerms('');
        addToast(lang === 'ar' ? 'العروض المالية' : 'Commercial Offers', lang === 'ar' ? 'تم حفظ العرض المالي بنجاح' : 'Commercial offer saved');
      } else {
        alert(res.message || 'Failed to create commercial offer');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating commercial offer');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createInvoice({
        projectId: selectedProjectId,
        invoiceNumber: invNumber.trim(),
        milestoneDescription: invMilestone.trim(),
        amount: Number(invAmount) || 0,
        currency: invCurrency,
        issuedDate: new Date().toISOString(),
        dueDate: invDueDate ? new Date(invDueDate).toISOString() : undefined,
        notes: invNotes.trim()
      });
      if (res.success && res.data) {
        setInvoices((prev) => [res.data, ...prev]);
        setShowInvoiceModal(false);
        setInvNumber('');
        setInvMilestone('');
        setInvNotes('');
        addToast(lang === 'ar' ? 'الفواتير' : 'Invoices', lang === 'ar' ? 'تم إصدار الفاتورة بنجاح' : 'Invoice generated successfully');
      } else {
        alert(res.message || 'Failed to create invoice');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating invoice');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createMaterial({
        code: matCode.trim(),
        name: matName.trim(),
        specification: matSpec.trim(),
        unit: matUnit.trim(),
        inStockQuantity: Number(matStock) || 0,
        minimumThreshold: Number(matThreshold) || 5,
        category: matCat.trim()
      });
      if (res.success && res.data) {
        setMaterials((prev) => [...prev, res.data]);
        setShowMaterialModal(false);
        setMatCode('');
        setMatName('');
        setMatSpec('');
        addToast(lang === 'ar' ? 'المخازن والمواد' : 'Warehouse & Materials', lang === 'ar' ? 'تم إضافة المادة إلى الكتالوج' : 'Material added to catalog');
      } else {
        alert(res.message || 'Failed to create material');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating material');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateMatRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createMaterialRequest({
        projectId: selectedProjectId,
        siteId: matReqSiteId || undefined,
        notes: matReqNotes.trim(),
        items: [
          {
            itemCode: matReqItemCode.trim(),
            description: matReqDesc.trim(),
            unit: matReqUnit.trim(),
            requestedQuantity: Number(matReqQty) || 1
          }
        ]
      });
      if (res.success && res.data) {
        setMaterialRequests((prev) => [res.data, ...prev]);
        setShowMatRequestModal(false);
        setMatReqItemCode('');
        setMatReqDesc('');
        setMatReqNotes('');
        addToast(lang === 'ar' ? 'طلبات المواد' : 'Material Requests', lang === 'ar' ? 'تم إرسال طلب المواد للموقع' : 'Site material request sent');
      } else {
        alert(res.message || 'Failed to submit request');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting request');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleUpdateReqStatus = async (id: string, status: string) => {
    try {
      const res = await operationsService.updateMaterialRequestStatus(id, status);
      if (res.success) {
        setMaterialRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: status as any } : r))
        );
        addToast(lang === 'ar' ? 'حالة الطلب' : 'Request Status', lang === 'ar' ? `تم تحديث الحالة إلى ${status}` : `Status updated to ${status}`);
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createAsset({
        assetTag: assetTag.trim(),
        name: assetName.trim(),
        category: assetCat.trim(),
        model: assetModel.trim(),
        serialNumber: assetSerial.trim(),
        purchaseCost: Number(assetValue) || 0
      });
      if (res.success && res.data) {
        setCompanyAssets((prev) => [...prev, res.data]);
        setShowAssetModal(false);
        setAssetTag('');
        setAssetName('');
        setAssetModel('');
        setAssetSerial('');
        addToast(lang === 'ar' ? 'الأصول والمعدات' : 'Company Assets', lang === 'ar' ? 'تم تسجيل الأصل في المنظومة' : 'Asset registered');
      } else {
        alert(res.message || 'Failed to register asset');
      }
    } catch (err: any) {
      alert(err.message || 'Error registering asset');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createRisk({
        projectId: selectedProjectId,
        title: riskTitle.trim(),
        description: riskDesc.trim(),
        category: riskCat.trim(),
        probability: Number(riskProb) || 3,
        impact: Number(riskImpact) || 3,
        severity: riskSeverity,
        mitigationPlan: riskMitigation.trim()
      });
      if (res.success && res.data) {
        setProjectRisks((prev) => [res.data, ...prev]);
        setShowRiskModal(false);
        setRiskTitle('');
        setRiskDesc('');
        setRiskMitigation('');
        addToast(lang === 'ar' ? 'إدارة المخاطر' : 'Risk Management', lang === 'ar' ? 'تم رصد الخطر وخطة الاحتواء' : 'Risk logged with mitigation plan');
      } else {
        alert(res.message || 'Failed to create risk');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating risk');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.createIssue({
        projectId: selectedProjectId,
        title: issueTitle.trim(),
        description: issueDesc.trim(),
        priority: issuePriority,
        assignedToUserId: issueAssignedTo || undefined
      });
      if (res.success && res.data) {
        setProjectIssues((prev) => [res.data, ...prev]);
        setShowIssueModal(false);
        setIssueTitle('');
        setIssueDesc('');
        addToast(lang === 'ar' ? 'المشاكل والمعوقات' : 'Site Issues', lang === 'ar' ? 'تم تسجيل الملاحظة الفنية' : 'Issue recorded');
      } else {
        alert(res.message || 'Failed to create issue');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating issue');
    } finally {
      setOpsModalSaving(false);
    }
  };

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setOpsModalSaving(true);
      const res = await operationsService.recordHandover({
        projectId: selectedProjectId,
        handoverDate: handoverDate ? new Date(handoverDate).toISOString() : new Date().toISOString(),
        acceptanceStatus: handoverStatus,
        snagListJson: handoverSnags.trim(),
        warrantyStartDate: handoverWarrantyStart ? new Date(handoverWarrantyStart).toISOString() : undefined,
        warrantyEndDate: handoverWarrantyEnd ? new Date(handoverWarrantyEnd).toISOString() : undefined,
        warrantyTerms: handoverWarrantyTerms.trim()
      });
      if (res.success && res.data) {
        setProjectHandovers((prev) => [res.data, ...prev]);
        setShowHandoverModal(false);
        setHandoverSnags('');
        setHandoverWarrantyTerms('');
        addToast(lang === 'ar' ? 'التسليم والضمان' : 'Handover & Warranty', lang === 'ar' ? 'تم تسجيل محضر التسليم' : 'Handover recorded');
      } else {
        alert(res.message || 'Failed to record handover');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording handover');
    } finally {
      setOpsModalSaving(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = (localStorage.getItem('mti_lang') as Language) || 'ar';
      setLang(savedLang);
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLang;
    }

    // Stale user profile without a valid access token → force clean login
    if (!authService.hasSession()) {
      apiClient.clearTokens();
      setCurrentUser(null);
      return;
    }

    const user = authService.getCurrentUser();
    if (!user) {
      setCurrentUser(null);
      return;
    }

    // Validate token with server before loading the app shell
    (async () => {
      const me = await authService.getMe();
      if (!me.success || !me.data?.user) {
        apiClient.clearTokens();
        setCurrentUser(null);
        return;
      }
      const freshUser = me.data.user;
      localStorage.setItem('mti_user', JSON.stringify(freshUser));
      setCurrentUser(freshUser);
      loadInitialData(freshUser);
      initSignalR();
    })();
  }, []);

  const initSignalR = async () => {
    try {
      const conn = await signalRService.initialize();
      if (conn) {
        setSignalRConnected(true);

        // Real-Time Chat Handlers (PROMPT REALTIME-01, CHAT-03, CHAT-04)
        const handleIncomingMessage = (msg: Message) => {
          const u = authService.getCurrentUser();
          // 1. If recipient is me, acknowledge delivery to the hub
          if (u && msg.senderUserId !== u.id) {
            conn.invoke('AcknowledgeDelivery', msg.id, msg.conversationId).catch(() => { });
            chatService.markAsDelivered(msg.id).catch(() => { });

            // Show toast if conversation is not currently active
            if (activeConversationRef.current?.id !== msg.conversationId) {
              addToast(msg.senderName, msg.content, 'chat', 'chat', msg.conversationId);
            }
          }

          if (activeConversationRef.current?.id === msg.conversationId) {
            setChatMessages((prev) => {
              // Deduplicate by Message.Id (PROMPT CHAT-04)
              if (prev.some((m) => m.id === msg.id)) {
                return prev.map((m) => (m.id === msg.id ? { ...m, ...msg } : m));
              }
              // Replace optimistic temporary message matching clientMessageId
              if (msg.clientMessageId && prev.some((m) => m.clientMessageId === msg.clientMessageId)) {
                return prev.map((m) => (m.clientMessageId === msg.clientMessageId ? { ...msg, deliveryStatus: 'sent' } : m));
              }
              return [...prev, msg];
            });
            if (u && msg.senderUserId !== u.id) {
              chatService.markAsRead(msg.conversationId).catch(() => { });
            }
          }
          chatService.getConversations().then((convs) => { setConversations(convs); syncPresenceFromConversations(convs); }).catch(() => { });
        };

        conn.on('MessageCreated', handleIncomingMessage);
        conn.on('MessageSent', handleIncomingMessage);

        // Reconnection Synchronization (PROMPT REALTIME-01)
        signalRService.onReconnected(async () => {
          logger.info('SignalR Reconnected: running centralized sync API');
          loadProjects().catch(() => { });
          loadAllSites().catch(() => { });
          taskService.getTasks().then(setTasks).catch(() => { });
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin') || u?.roles.includes('SuperAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
          if (selectedProjectIdRef.current) {
            projectService.getProjectSites(selectedProjectIdRef.current)
              .then((res) => setSelectedProjectSites(res.data || []))
              .catch(() => { });
            signalRService.joinProject(selectedProjectIdRef.current).catch(() => { });
          }
          const lastTs = typeof window !== 'undefined' ? localStorage.getItem('mti_last_sync_ts') : null;
          const syncData = await syncService.sync(lastTs);
          if (syncData) {
            if (typeof window !== 'undefined') localStorage.setItem('mti_last_sync_ts', syncData.serverTimestamp);
            if (syncData.newMessages?.length && activeConversationRef.current) {
              setChatMessages((prev) => {
                let updated = [...prev];
                for (const nm of syncData.newMessages) {
                  if (nm.conversationId === activeConversationRef.current?.id) {
                    const idx = updated.findIndex((m) => m.id === nm.id || (nm.clientMessageId && m.clientMessageId === nm.clientMessageId));
                    if (idx >= 0) updated[idx] = nm;
                    else updated.push(nm);
                  }
                }
                return updated;
              });
            }
            if (syncData.newNotifications?.length) {
              setNotificationsList((prev) => {
                const map = new Map(prev.map((n) => [n.id, n]));
                syncData.newNotifications.forEach((n) => map.set(n.id, n));
                return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              });
            }
            chatService.getConversations().then(setConversations).catch(() => { });
          }
        });

        conn.on('MessageDelivered', (payload: { messageId: string; conversationId: string; recipientUserId: string }) => {
          setDeliveredMessageIds((prev) => {
            const next = new Set(prev);
            next.add(payload.messageId);
            return next;
          });
          setChatMessages((prev) =>
            prev.map((m) => (m.id === payload.messageId ? { ...m, isDelivered: true, deliveryStatus: 'delivered' } : m))
          );
        });

        conn.on('MessageReactionAdded', () => {
          if (activeConversationRef.current) loadMessages(activeConversationRef.current.id);
        });
        conn.on('MessageReactionRemoved', () => {
          if (activeConversationRef.current) loadMessages(activeConversationRef.current.id);
        });
        conn.on('MessageRead', (data: { conversationId: string; userId: string; readAt: string }) => {
          if (activeConversationRef.current?.id === data.conversationId) {
            setChatMessages((prev) =>
              prev.map((m) => {
                if (m.senderUserId !== data.userId && !m.readStates?.some((rs) => rs.userId === data.userId)) {
                  return {
                    ...m,
                    deliveryStatus: 'read',
                    readStates: [...(m.readStates || []), { userId: data.userId, userName: '', readAt: data.readAt }]
                  };
                }
                return m;
              })
            );
          }
          chatService.getConversations().then((convs) => { setConversations(convs); syncPresenceFromConversations(convs); }).catch(() => { });
        });

        conn.on('UserOnline', (payload: { userId: string; timestamp: string }) => {
          const id = String(payload.userId);
          setOnlineUserIds((prev) => new Set(prev).add(id));
          setLastSeenMap((prev) => ({ ...prev, [id]: payload.timestamp || new Date().toISOString() }));
        });
        conn.on('UserOffline', (payload: { userId: string; timestamp: string }) => {
          const id = String(payload.userId);
          setOnlineUserIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setLastSeenMap((prev) => ({ ...prev, [id]: payload.timestamp || new Date().toISOString() }));
        });

        // Real-Time Notifications
        conn.on('NotificationCreated', (notif: NotificationItem) => {
          setNotificationsList((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
          addToast(notif.title, notif.body, 'info', 'notifications');
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        });

        // Real-Time Tasks
        conn.on('TaskCreated', (taskItem?: any) => {
          addToast(t('toastNewTask'), taskItem?.title || 'Task Created', 'task', 'tasks');
          taskService.getTasks().then(setTasks).catch(() => { });
          notificationService.getNotifications().then((res) => setNotificationsList(res.items)).catch(() => { });
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        });
        conn.on('TaskUpdated', () => {
          taskService.getTasks().then(setTasks).catch(() => { });
        });
        conn.on('TaskAssigned', (taskItem?: any) => {
          addToast(t('toastNewTask'), taskItem?.title || 'New Task Assigned', 'task', 'tasks');
          taskService.getTasks().then(setTasks).catch(() => { });
          notificationService.getNotifications().then((res) => setNotificationsList(res.items)).catch(() => { });
          loadProjects().catch(() => { });
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        });
        conn.on('ProjectAssigned', (payload?: { name?: string }) => {
          addToast(
            lang === 'ar' ? 'تم إسنادك لمشروع' : 'Assigned to project',
            payload?.name || (lang === 'ar' ? 'مشروع جديد' : 'New project'),
            'info',
            'projects'
          );
          loadProjects().catch(() => { });
          notificationService.getNotifications().then((res) => setNotificationsList(res.items)).catch(() => { });
        });
        conn.on('TaskStatusChanged', (payload?: { title?: string; status?: string; oldStatus?: string }) => {
          taskService.getTasks().then(setTasks).catch(() => { });
          notificationService.getNotifications().then((res) => setNotificationsList(res.items)).catch(() => { });
          const u = authService.getCurrentUser();
          const isAdminUser = u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin') || u?.roles.includes('ProjectManager');
          if (isAdminUser) {
            addToast(
              lang === 'ar' ? 'تحديث حالة مهمة' : 'Task status updated',
              payload?.title
                ? `${payload.title}: ${payload.oldStatus || ''} → ${payload.status || ''}`
                : (lang === 'ar' ? 'تم تحديث مهمة' : 'A task was updated'),
              'task',
              'tasks'
            );
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        });

        // Real-Time Project Data Submissions & Approvals
        conn.on('ProjectDataSubmitted', () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          }
        });
        conn.on('DataSubmitted', () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          }
        });
        conn.on('ProjectDataApproved', () => {
          dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => { });
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        });
        conn.on('DataApproved', () => {
          dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => { });
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        });
        conn.on('ProjectDataRejected', () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          }
        });

        // Admin & Engineer dashboard live refresh (no full page reload)
        const refreshStats = () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin') || u?.roles.includes('SuperAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
          }
        };

        conn.on('AdminStatsUpdated', refreshStats);

        // Projects live synchronization across all users and tabs
        const handleProjectsChanged = () => {
          loadProjects().catch(() => { });
          refreshStats();
        };
        conn.on('ProjectCreated', handleProjectsChanged);
        conn.on('ProjectUpdated', handleProjectsChanged);
        conn.on('ProjectDeleted', (payload?: { id?: string }) => {
          handleProjectsChanged();
          if (payload?.id && selectedProjectIdRef.current === payload.id) {
            setSelectedProjectId(null);
            setSelectedProjectSites([]);
          }
        });

        // Sites live synchronization
        const handleSitesChanged = () => {
          loadAllSites().catch(() => { });
          if (selectedProjectIdRef.current) {
            projectService.getProjectSites(selectedProjectIdRef.current)
              .then((res) => setSelectedProjectSites(res.data || []))
              .catch(() => { });
          }
        };
        conn.on('SiteCreated', handleSitesChanged);
        conn.on('SiteUpdated', handleSitesChanged);
        conn.on('SiteDeleted', handleSitesChanged);

        // Cross-cutting feature real-time events that impact dashboards & state
        conn.on('DocumentCreated', refreshStats);
        conn.on('DocumentReviewed', refreshStats);
        conn.on('DocumentDeleted', refreshStats);
        conn.on('ReportCreated', refreshStats);
        conn.on('ReportSubmitted', refreshStats);
        conn.on('ReportReviewed', refreshStats);
        conn.on('OperationCreated', refreshStats);
        conn.on('OperationUpdated', refreshStats);
        conn.on('MilestoneCreated', refreshStats);
        conn.on('MilestoneDeleted', refreshStats);
      }
    } catch {
      setSignalRConnected(false);
    }
  };

  const loadInitialData = async (user: User) => {
    setIsLoadingContent(true);
    try {
      await loadProjects();
      const isAdminUser = user.roles.includes('Admin') || user.roles.includes('SystemAdmin');
      if (isAdminUser) {
        dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
        dashboardService.getUsers().then(setUserList).catch(() => { });
        dashboardService.getAuditLogs().then((res) => setAuditLogs(res.items)).catch(() => { });
      } else {
        dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
      }
      // Load both approved and pending data records for ALL roles so the archive and reports are always populated on initial load and page reload
      dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => { });
      dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => { });
      taskService.getTasks().then(setTasks).catch(() => { });
      siteService.getAllSites().then((res) => setAllSites(res.data || [])).catch(() => { });
      chatService.getConversations().then((convs) => {
        setConversations(convs);
        syncPresenceFromConversations(convs);
        const conn = signalRService.getConnection();
        if (conn) {
          convs.forEach((c) => conn.invoke('JoinConversation', c.id).catch(() => { }));
        }
      }).catch(() => { });
      notificationService.getNotifications().then((res) => setNotificationsList(res.items)).catch(() => { });
      dashboardService.getSafeConfig().then(setSafeConfig).catch(() => { });
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authService.login(email, password);
      if (res.success && res.data) {
        setCurrentUser(res.data.user);
        await loadInitialData(res.data.user);
        await initSignalR();
      } else {
        setErrorMsg(res.message || 'Login failed. Check your credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to connect to MTI Backend API.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveConversation(null);
    setChatMessages([]);
  };

  const loadProjects = async () => {
    try {
      const res = await projectService.getProjects();
      const items = res.data?.items || [];
      setProjects(items);
      if (items.length > 0 && !selectedProjectId) {
        selectProject(items[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectProject = async (projId: string) => {
    const prevProjId = selectedProjectIdRef.current;
    if (prevProjId && prevProjId !== projId) {
      signalRService.leaveProject(prevProjId).catch(() => { });
    }
    setSelectedProjectId(projId);
    signalRService.joinProject(projId).catch(() => { });
    setLoadingSites(true);
    try {
      const res = await projectService.getProjectSites(projId);
      setSelectedProjectSites(res.data || []);
      if (activeTab === 'technical-office') loadTechnicalOfficeData(projId);
      if (activeTab === 'governance') loadGovernanceData(projId);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSites(false);
    }
  };

  const loadAllSites = async () => {
    setLoadingAllSites(true);
    try {
      const res = await siteService.getAllSites();
      setAllSites(res.data || []);
    } catch (e) {
      console.error(e);
      setAllSites([]);
    } finally {
      setLoadingAllSites(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProjectSaving(true);
      const payload = {
        code: newCode.trim(),
        name: newName.trim(),
        description: newDesc.trim(),
        clientName: newClient.trim(),
        type: newProjectType,
        progressPercentage: Number(newProgressPercentage) || 0,
        memberUserIds: newProjectMemberIds,
        status: 'Planning',
        coverImageUrl: newCoverImageUrl
      };
      if (!payload.code || !payload.name) {
        alert(lang === 'ar' ? 'اكتب كود واسم المشروع (أرقام أو حروف).' : 'Enter project code and name.');
        return;
      }
      if (editingProjectId) {
        const res = await projectService.updateProject(editingProjectId, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update project');
        signalRService.emit('ProjectUpdated', res.data);
      } else {
        const res = await projectService.createProject(payload);
        if (!res.success) throw new Error(res.message || 'Failed to create project');
        signalRService.emit('ProjectCreated', res.data);
      }
      signalRService.emit('AdminStatsUpdated');
      setShowNewProjectModal(false);
      setEditingProjectId(null);
      setNewCode('');
      setNewName('');
      setNewDesc('');
      setNewClient('');
      setNewProjectType('GeneralEngineering');
      setNewProgressPercentage(0);
      setNewProjectMemberIds([]);
      setNewCoverImageUrl(null);
      await loadProjects();
      dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
    } catch (err: any) {
      alert(
        err?.message
        || (lang === 'ar'
          ? 'فشل حفظ المشروع. لو ظهر 403: سجّل خروج ثم دخول بحساب Admin وانشر الـ API المحدّث.'
          : 'Failed to save project')
      );
    } finally {
      setProjectSaving(false);
    }
  };

  const handleProjectCoverPick = async (file: File | null) => {
    if (!file) {
      setNewCoverImageUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'اختر ملف صورة فقط' : 'Please choose an image file');
      return;
    }
    try {
      setCoverImageBusy(true);
      const dataUrl = await resizeToProjectCover(file);
      setNewCoverImageUrl(dataUrl);
    } catch {
      alert(lang === 'ar' ? 'تعذر معالجة الصورة' : 'Could not process image');
    } finally {
      setCoverImageBusy(false);
    }
  };

  const openEditProject = async (proj: Project) => {
    setEditingProjectId(proj.id);
    setNewCode(proj.code || '');
    setNewName(proj.name || '');
    setNewDesc(proj.description || '');
    setNewClient(proj.clientName || '');
    setNewProjectType(String(proj.type ?? 'GeneralEngineering'));
    setNewProgressPercentage(proj.progressPercentage ?? 0);
    setNewCoverImageUrl(proj.coverImageUrl || null);
    setNewProjectMemberIds([]);
    setShowNewProjectModal(true);
    try {
      const res = await projectService.getProjectMembers(proj.id);
      if (res.success && res.data) {
        setNewProjectMemberIds(res.data.map((m) => m.userId));
      }
    } catch {
      /* ignore */
    }
  };

  const promptDeleteProject = (proj: Project) => {
    setConfirmDialog({
      isOpen: true,
      title: lang === 'ar' ? 'حذف المشروع' : 'Delete Project',
      message:
        lang === 'ar'
          ? `هل تريد حذف المشروع "${proj.name}" نهائياً؟`
          : `Delete project "${proj.name}" permanently?`,
      confirmText: lang === 'ar' ? 'حذف' : 'Delete',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      onConfirm: async () => {
        await projectService.deleteProject(proj.id);
        signalRService.emit('ProjectDeleted', { id: proj.id });
        signalRService.emit('AdminStatsUpdated');
        if (selectedProjectId === proj.id) {
          setSelectedProjectId(null);
          setSelectedProjectSites([]);
        }
        await loadProjects();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const openCreateSite = () => {
    if (!selectedProjectId) {
      alert(lang === 'ar' ? 'اختر مشروعاً أولاً' : 'Select a project first');
      return;
    }
    setEditingSiteId(null);
    setSiteCode('');
    setSiteName('');
    setSiteDesc('');
    setSiteAddress('');
    setShowSiteModal(true);
  };

  const openEditSite = (site: Site) => {
    setEditingSiteId(site.id);
    setSiteCode(site.code || '');
    setSiteName(site.name || '');
    setSiteDesc(site.description || '');
    setSiteAddress(site.address || '');
    setShowSiteModal(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    try {
      setSiteSaving(true);
      const payload = {
        code: siteCode,
        name: siteName,
        description: siteDesc,
        address: siteAddress
      };
      if (editingSiteId) {
        const res = await siteService.updateSite(editingSiteId, payload);
        signalRService.emit('SiteUpdated', res?.data || payload);
      } else {
        const res = await projectService.createSite(selectedProjectId, payload);
        signalRService.emit('SiteCreated', res?.data || payload);
      }
      signalRService.emit('AdminStatsUpdated');
      setShowSiteModal(false);
      setEditingSiteId(null);
      await selectProject(selectedProjectId);
      await loadAllSites();
    } catch (err: any) {
      alert(err?.message || 'Failed to save site');
    } finally {
      setSiteSaving(false);
    }
  };

  const promptDeleteSite = (site: Site) => {
    setConfirmDialog({
      isOpen: true,
      title: lang === 'ar' ? 'حذف الموقع' : 'Delete Site',
      message:
        lang === 'ar'
          ? `هل تريد حذف الموقع "${site.name}"؟`
          : `Delete site "${site.name}"?`,
      confirmText: lang === 'ar' ? 'حذف' : 'Delete',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      onConfirm: async () => {
        await siteService.deleteSite(site.id);
        signalRService.emit('SiteDeleted', { id: site.id });
        signalRService.emit('AdminStatsUpdated');
        if (selectedProjectId) await selectProject(selectedProjectId);
        await loadAllSites();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Chat Actions
  const getConversationDisplayName = (conv: Conversation) => {
    if (!conv.isGroup) {
      const other = conv.members?.find((m) => m.userId !== currentUser?.id);
      const name = other?.userName || (other as any)?.fullName;
      if (name?.trim()) return name.trim();
    }
    if (conv.title?.trim()) return conv.title.trim();
    return lang === 'ar' ? 'محادثة مباشرة' : 'Direct Chat';
  };

  const getOtherMember = (conv: Conversation) => {
    if (conv.isGroup) return null;
    return conv.members?.find((m) => m.userId !== currentUser?.id) || null;
  };

  const syncPresenceFromConversations = (convs: Conversation[]) => {
    setOnlineUserIds((prev) => {
      const next = new Set(prev);
      convs.forEach((c) =>
        c.members?.forEach((m) => {
          if (m.isOnline) next.add(String(m.userId));
        })
      );
      return next;
    });
    setLastSeenMap((prev) => {
      const next = { ...prev };
      convs.forEach((c) =>
        c.members?.forEach((m) => {
          if (m.lastSeenAt) next[String(m.userId)] = m.lastSeenAt!;
        })
      );
      return next;
    });
  };

  const formatLastSeen = (iso?: string | null, isOnline?: boolean) => {
    if (isOnline) return t('online');
    if (!iso) return lang === 'ar' ? 'غير معروف' : 'Unknown';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return lang === 'ar' ? 'غير معروف' : 'Unknown';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return t('lastSeenJustNow');
    if (mins < 60) return t('lastSeenMinutes').replace('{n}', String(mins));
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('lastSeenHours').replace('{n}', String(hours));
    const days = Math.floor(hours / 24);
    return t('lastSeenDays').replace('{n}', String(days));
  };

  const formatDrawerDate = (iso?: string | null) => {
    if (!iso) return lang === 'ar' ? 'غير محدد' : 'Not set';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return lang === 'ar' ? 'غير محدد' : 'Not set';
    return d.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const translateStatusLabel = (status?: string | number | null) => {
    const s = String(status ?? '').trim();
    if (!s) return lang === 'ar' ? 'غير محدد' : 'Not set';
    const map: Record<string, { ar: string; en: string }> = {
      Planning: { ar: 'تخطيط', en: 'Planning' },
      Active: { ar: 'نشط', en: 'Active' },
      OnHold: { ar: 'موقوف مؤقتاً', en: 'On Hold' },
      Completed: { ar: 'مكتمل', en: 'Completed' },
      Cancelled: { ar: 'ملغي', en: 'Cancelled' },
      Pending: { ar: 'قيد الانتظار', en: 'Pending' },
      ToDo: { ar: 'للتنفيذ', en: 'To Do' },
      InProgress: { ar: 'قيد التنفيذ', en: 'In Progress' },
      Review: { ar: 'قيد المراجعة', en: 'Under Review' },
      UnderReview: { ar: 'قيد المراجعة', en: 'Under Review' },
      Submitted: { ar: 'مُرسل', en: 'Submitted' },
      Approved: { ar: 'معتمد', en: 'Approved' },
      Rejected: { ar: 'مرفوض', en: 'Rejected' },
      Draft: { ar: 'مسودة', en: 'Draft' },
      ChangesRequested: { ar: 'مطلوب تعديلات', en: 'Changes Requested' },
      CorrectionRequested: { ar: 'مطلوب تصحيح', en: 'Correction Requested' },
      Reviewed: { ar: 'تمت المراجعة', en: 'Reviewed' },
      Delayed: { ar: 'متأخر', en: 'Delayed' },
      PendingApproval: { ar: 'بانتظار الاعتماد', en: 'Pending Approval' },
      Sent: { ar: 'مُرسل', en: 'Sent' },
      Paid: { ar: 'مدفوع', en: 'Paid' },
      PartiallyPaid: { ar: 'مدفوع جزئياً', en: 'Partially Paid' },
      Overdue: { ar: 'متأخر السداد', en: 'Overdue' },
      Low: { ar: 'منخفضة', en: 'Low' },
      Medium: { ar: 'متوسطة', en: 'Medium' },
      High: { ar: 'عالية', en: 'High' },
      Urgent: { ar: 'عاجلة', en: 'Urgent' },
      Critical: { ar: 'حرجة', en: 'Critical' },
      CCTV: { ar: 'أنظمة مراقبة', en: 'CCTV' },
      AccessControl: { ar: 'تحكم بالدخول', en: 'Access Control' },
      Networking: { ar: 'شبكات', en: 'Networking' },
      Cables: { ar: 'كابلات', en: 'Cables' },
      Tools: { ar: 'أدوات', en: 'Tools' },
      '0': { ar: 'تخطيط', en: 'Planning' },
      '1': { ar: 'نشط', en: 'Active' }
    };
    const hit = map[s];
    if (hit) return lang === 'ar' ? hit.ar : hit.en;
    return s;
  };

  const getDrawerTypeLabel = (type: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      Project: { ar: 'مشروع', en: 'Project' },
      Site: { ar: 'موقع', en: 'Site' },
      Task: { ar: 'مهمة', en: 'Task' },
      'Approved Data': { ar: 'بيانات معتمدة', en: 'Approved Data' },
      Data: { ar: 'بيانات', en: 'Data' },
      User: { ar: 'مستخدم', en: 'User' }
    };
    const hit = map[type];
    if (hit) return lang === 'ar' ? hit.ar : hit.en;
    return type;
  };

  const getDrawerFields = (type: string, details: any): { label: string; value: string }[] => {
    if (!details || typeof details !== 'object') {
      return [{ label: lang === 'ar' ? 'التفاصيل' : 'Details', value: String(details ?? '—') }];
    }

    const empty = lang === 'ar' ? '—' : '—';
    const text = (v: any) => {
      if (v === null || v === undefined || v === '') return empty;
      return String(v);
    };

    const lowerType = type.toLowerCase();

    if (lowerType.includes('project') && details.code !== undefined) {
      return [
        { label: lang === 'ar' ? 'اسم المشروع' : 'Project name', value: text(details.name) },
        { label: t('projectCode'), value: text(details.code) },
        { label: t('clientName'), value: text(details.clientName) },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: translateStatusLabel(details.status) },
        { label: t('description'), value: text(details.description) || empty },
        {
          label: lang === 'ar' ? 'عدد المواقع' : 'Sites count',
          value: text(details.totalSitesCount ?? details.sitesCount ?? 0)
        },
        {
          label: lang === 'ar' ? 'تاريخ البداية' : 'Start date',
          value: formatDrawerDate(details.startDate)
        },
        {
          label: lang === 'ar' ? 'تاريخ النهاية' : 'End date',
          value: formatDrawerDate(details.endDate)
        },
        {
          label: lang === 'ar' ? 'تاريخ الإنشاء' : 'Created at',
          value: formatDrawerDate(details.createdAt)
        }
      ];
    }

    if (lowerType.includes('site') && (details.address !== undefined || details.projectName !== undefined)) {
      return [
        { label: lang === 'ar' ? 'اسم الموقع' : 'Site name', value: text(details.name) },
        { label: lang === 'ar' ? 'كود الموقع' : 'Site code', value: text(details.code) },
        { label: lang === 'ar' ? 'المشروع' : 'Project', value: text(details.projectName) },
        { label: lang === 'ar' ? 'العنوان' : 'Address', value: text(details.address) },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: translateStatusLabel(details.status) },
        { label: t('description'), value: text(details.description) || empty },
        {
          label: lang === 'ar' ? 'تاريخ الإنشاء' : 'Created at',
          value: formatDrawerDate(details.createdAt)
        }
      ];
    }

    if (lowerType.includes('task') || details.priority !== undefined) {
      return [
        { label: lang === 'ar' ? 'عنوان المهمة' : 'Task title', value: text(details.title || details.name) },
        { label: lang === 'ar' ? 'المشروع' : 'Project', value: text(details.projectName) },
        { label: lang === 'ar' ? 'الموقع' : 'Site', value: text(details.siteName) },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: translateStatusLabel(details.status) },
        { label: t('priority'), value: translateStatusLabel(details.priority) },
        {
          label: lang === 'ar' ? 'المُسند إليه' : 'Assigned to',
          value: text(details.assignedToName) || (lang === 'ar' ? 'غير مسند' : 'Unassigned')
        },
        { label: lang === 'ar' ? 'موعد التسليم' : 'Due date', value: formatDrawerDate(details.dueAt) },
        { label: t('description'), value: text(details.description) || empty },
        {
          label: lang === 'ar' ? 'تاريخ الإنشاء' : 'Created at',
          value: formatDrawerDate(details.createdAt)
        }
      ];
    }

    if (
      lowerType.includes('data') ||
      lowerType.includes('approved') ||
      details.submitterName !== undefined ||
      details.category !== undefined
    ) {
      return [
        { label: lang === 'ar' ? 'العنوان' : 'Title', value: text(details.title) },
        { label: lang === 'ar' ? 'المشروع' : 'Project', value: text(details.projectName) },
        { label: lang === 'ar' ? 'الموقع' : 'Site', value: text(details.siteName) },
        { label: lang === 'ar' ? 'التصنيف' : 'Category', value: text(details.category) },
        { label: lang === 'ar' ? 'الحالة' : 'Status', value: translateStatusLabel(details.status) },
        {
          label: lang === 'ar' ? 'مُقدَّم بواسطة' : 'Submitted by',
          value: text(details.submitterName)
        },
        {
          label: lang === 'ar' ? 'تاريخ الإرسال' : 'Submitted at',
          value: formatDrawerDate(details.submittedAt)
        },
        {
          label: lang === 'ar' ? 'تاريخ الاعتماد' : 'Approved at',
          value: formatDrawerDate(details.approvedAt)
        },
        { label: lang === 'ar' ? 'الإصدار' : 'Version', value: text(details.version) }
      ];
    }

    // Generic readable fallback (skip technical ids)
    const skip = new Set(['id', 'projectId', 'siteId', 'userId', 'assignedToUserId', 'submittedBy', 'entityId']);
    return Object.entries(details)
      .filter(([k, v]) => !skip.has(k) && v !== null && v !== undefined && typeof v !== 'object')
      .map(([k, v]) => ({
        label: k
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (c) => c.toUpperCase())
          .trim(),
        value:
          typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
            ? formatDrawerDate(v)
            : text(v)
      }));
  };

  const getMemberPresence = (member?: ConversationMember | null) => {
    if (!member) return { isOnline: false, lastSeenAt: undefined as string | undefined };
    const id = String(member.userId);
    const isOnline = onlineUserIds.has(id) || !!member.isOnline;
    const lastSeenAt = lastSeenMap[id] || member.lastSeenAt;
    return { isOnline, lastSeenAt };
  };

  const getLastMessageTicks = (conv: Conversation) => {
    const lm = conv.lastMessage;
    if (!lm || !currentUser || lm.senderUserId !== currentUser.id) return null;
    const readByOther =
      (lm.readStates && lm.readStates.some((rs) => rs.userId !== currentUser.id)) ||
      lm.deliveryStatus === 'read';
    if (readByOther) return 'read' as const;
    if (lm.isDelivered || lm.deliveryStatus === 'delivered' || deliveredMessageIds.has(lm.id))
      return 'delivered' as const;
    if (lm.deliveryStatus === 'failed') return 'failed' as const;
    if (lm.deliveryStatus === 'sending') return 'sending' as const;
    return 'sent' as const;
  };

  const filteredConversations = useMemo(() => {
    const q = chatListSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = getConversationDisplayName(c).toLowerCase();
      const last = (c.lastMessage?.content || '').toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [conversations, chatListSearch, currentUser, lang]);

  const openConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    try {
      const conn = signalRService.getConnection();
      if (conn) {
        conn.invoke('JoinConversation', conv.id).catch(() => { });
      }
    } catch { }
    await loadMessages(conv.id);
    await chatService.markAsRead(conv.id);
    chatService.getConversations().then((convs) => { setConversations(convs); syncPresenceFromConversations(convs); }).catch(() => { });
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgs = await chatService.getMessages(convId);
      setChatMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newMessageText.trim() || !currentUser) return;
    const txt = newMessageText.trim();
    setNewMessageText('');

    const clientMsgId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      clientMessageId: clientMsgId,
      conversationId: activeConversation.id,
      senderUserId: currentUser.id,
      senderName: currentUser.fullName,
      content: txt,
      isEdited: false,
      createdAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
      readStates: [],
      deliveryStatus: 'sending'
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);

    try {
      const sent = await chatService.sendMessage(activeConversation.id, txt, clientMsgId);
      setChatMessages((prev) => {
        // If message was already added by SignalR MessageCreated event, update it without duplicating (PROMPT CHAT-04)
        const alreadyHasServerMsg = prev.some((m) => m.id === sent.id);
        if (alreadyHasServerMsg) {
          return prev.filter((m) => m.id !== tempId).map((m) => (m.id === sent.id ? { ...sent, deliveryStatus: 'sent' } : m));
        }
        return prev.map((m) => (m.id === tempId || (m.clientMessageId && m.clientMessageId === clientMsgId) ? { ...sent, deliveryStatus: 'sent' } : m));
      });
      chatService.getConversations().then((convs) => { setConversations(convs); syncPresenceFromConversations(convs); }).catch(() => { });
    } catch (err: any) {
      logger.error('Failed to send message', err);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, deliveryStatus: 'failed' } : m))
      );
    }
  };

  const handleStartDirectChat = async (targetUser: any) => {
    try {
      setChatStarting(true);
      const conv = await chatService.createDirectConversation(targetUser.id);
      const updatedConvs = await chatService.getConversations();
      setConversations(updatedConvs);
      setShowNewChatModal(false);
      setShowMessagesDropdown(false);
      setActiveTab('chat');
      const found = updatedConvs.find((c) => c.id === conv.id) || conv;
      await openConversation(found);
      logger.info('Direct conversation started', { targetUser: targetUser.email });
    } catch (err: any) {
      alert(err?.message || 'Failed to start conversation');
    } finally {
      setChatStarting(false);
    }
  };

  const handleToggleReaction = async (msgId: string, reaction: string) => {
    try {
      await chatService.addReaction(msgId, reaction);
      if (activeConversation) loadMessages(activeConversation.id);
    } catch (e) {
      console.error(e);
    }
  };

  // Approval Center Actions
  const promptApprove = (record: ProjectDataRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: t('approve'),
      message: `Are you sure you want to approve "${record.title}" from ${record.submitterName}? Once approved, this record becomes permanent and immutable.`,
      confirmText: t('approve'),
      confirmColor: 'bg-emerald-600 hover:bg-emerald-500',
      onConfirm: async () => {
        await dataRecordService.approve(record.id, approvalComment);
        signalRService.emit('ProjectDataApproved', { id: record.id });
        signalRService.emit('AdminStatsUpdated');
        setApprovalComment('');
        const [updatedPending, updatedApproved] = await Promise.all([
          dataRecordService.getPendingApprovals(),
          dataRecordService.getApprovedRecords()
        ]);
        setPendingRecords(updatedPending);
        setApprovedRecords(updatedApproved);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const promptReject = (record: ProjectDataRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: t('reject'),
      message: `Are you sure you want to reject "${record.title}"? Please provide a clear audit reason.`,
      confirmText: t('reject'),
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      onConfirm: async () => {
        if (!approvalComment.trim()) {
          alert('Rejection reason is required.');
          return;
        }
        await dataRecordService.reject(record.id, approvalComment);
        signalRService.emit('ProjectDataRejected', { id: record.id });
        signalRService.emit('AdminStatsUpdated');
        setApprovalComment('');
        const [updatedPending, updatedApproved] = await Promise.all([
          dataRecordService.getPendingApprovals(),
          dataRecordService.getApprovedRecords()
        ]);
        setPendingRecords(updatedPending);
        setApprovedRecords(updatedApproved);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const promptRequestChanges = (record: ProjectDataRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: t('requestChanges'),
      message: `Return "${record.title}" back to ${record.submitterName} with modification instructions.`,
      confirmText: t('requestChanges'),
      confirmColor: 'bg-amber-600 hover:bg-amber-500',
      onConfirm: async () => {
        if (!approvalComment.trim()) {
          alert('Modification instructions are required.');
          return;
        }
        await dataRecordService.requestChanges(record.id, approvalComment);
        signalRService.emit('ProjectDataRejected', { id: record.id });
        signalRService.emit('AdminStatsUpdated');
        setApprovalComment('');
        const [updatedPending, updatedApproved] = await Promise.all([
          dataRecordService.getPendingApprovals(),
          dataRecordService.getApprovedRecords()
        ]);
        setPendingRecords(updatedPending);
        setApprovedRecords(updatedApproved);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Direct Approval Handlers from Report Details Modal
  const handleApproveFromModal = async (record: ProjectDataRecord, comment: string) => {
    await dataRecordService.approve(record.id, comment);
    signalRService.emit('ProjectDataApproved', { id: record.id });
    signalRService.emit('AdminStatsUpdated');
    const [updatedPending, updatedApproved] = await Promise.all([
      dataRecordService.getPendingApprovals(),
      dataRecordService.getApprovedRecords()
    ]);
    setPendingRecords(updatedPending);
    setApprovedRecords(updatedApproved);
  };

  const handleRejectFromModal = async (record: ProjectDataRecord, comment: string) => {
    await dataRecordService.reject(record.id, comment);
    signalRService.emit('ProjectDataRejected', { id: record.id });
    signalRService.emit('AdminStatsUpdated');
    const [updatedPending, updatedApproved] = await Promise.all([
      dataRecordService.getPendingApprovals(),
      dataRecordService.getApprovedRecords()
    ]);
    setPendingRecords(updatedPending);
    setApprovedRecords(updatedApproved);
  };

  const handleRequestChangesFromModal = async (record: ProjectDataRecord, comment: string) => {
    await dataRecordService.requestChanges(record.id, comment);
    signalRService.emit('ProjectDataRejected', { id: record.id });
    signalRService.emit('AdminStatsUpdated');
    const [updatedPending, updatedApproved] = await Promise.all([
      dataRecordService.getPendingApprovals(),
      dataRecordService.getApprovedRecords()
    ]);
    setPendingRecords(updatedPending);
    setApprovedRecords(updatedApproved);
  };

  // Multi-Filter Computations for Approved Records Archive
  const uniqueSubmitters = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(approvedRecords) ? approvedRecords : []).forEach((r) => {
      if (r.submittedBy && r.submitterName) {
        map.set(r.submittedBy, r.submitterName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [approvedRecords]);

  const availableFilterSites = useMemo(() => {
    if (!approvedProjectFilter || approvedProjectFilter === 'ALL') {
      return allSites;
    }
    return allSites.filter((s: Site) => s.projectId === approvedProjectFilter);
  }, [allSites, approvedProjectFilter]);

  const filteredApprovedRecords = useMemo(() => {
    return (Array.isArray(approvedRecords) ? approvedRecords : []).filter((r) => {
      // 1. Text Search: title or description
      if (approvedSearchQuery.trim()) {
        const q = approvedSearchQuery.trim().toLowerCase();
        const matchTitle = (r.title || '').toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        const matchProj = (r.projectName || '').toLowerCase().includes(q);
        const matchSite = (r.siteName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchProj && !matchSite) return false;
      }

      // 2. Category Filter
      if (approvedCategoryFilter && approvedCategoryFilter !== 'ALL') {
        if (r.category !== approvedCategoryFilter) return false;
      }

      // 3. Project Filter
      if (approvedProjectFilter && approvedProjectFilter !== 'ALL') {
        if (r.projectId !== approvedProjectFilter) return false;
      }

      // 4. Site Filter
      if (approvedSiteFilter && approvedSiteFilter !== 'ALL') {
        if (r.siteId !== approvedSiteFilter) return false;
      }

      // 5. Submitter Filter
      if (approvedSubmitterFilter && approvedSubmitterFilter !== 'ALL') {
        if (r.submittedBy !== approvedSubmitterFilter && r.submitterName !== approvedSubmitterFilter) {
          return false;
        }
      }

      // 6. Date Range From (من تاريخ)
      if (approvedStartDate) {
        const recordDate = new Date(r.approvedAt || r.submittedAt || r.createdAt).getTime();
        const startDate = new Date(approvedStartDate).getTime();
        if (recordDate < startDate) return false;
      }

      // 7. Date Range To (إلى تاريخ)
      if (approvedEndDate) {
        const recordDate = new Date(r.approvedAt || r.submittedAt || r.createdAt).getTime();
        const endDateTime = new Date(approvedEndDate);
        endDateTime.setHours(23, 59, 59, 999);
        if (recordDate > endDateTime.getTime()) return false;
      }

      return true;
    });
  }, [
    approvedRecords,
    approvedSearchQuery,
    approvedCategoryFilter,
    approvedProjectFilter,
    approvedSiteFilter,
    approvedSubmitterFilter,
    approvedStartDate,
    approvedEndDate
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (approvedSearchQuery.trim()) count++;
    if (approvedCategoryFilter !== 'ALL') count++;
    if (approvedProjectFilter !== 'ALL') count++;
    if (approvedSiteFilter !== 'ALL') count++;
    if (approvedSubmitterFilter !== 'ALL') count++;
    if (approvedStartDate) count++;
    if (approvedEndDate) count++;
    return count;
  }, [
    approvedSearchQuery,
    approvedCategoryFilter,
    approvedProjectFilter,
    approvedSiteFilter,
    approvedSubmitterFilter,
    approvedStartDate,
    approvedEndDate
  ]);

  const resetApprovedFilters = () => {
    setApprovedSearchQuery('');
    setApprovedCategoryFilter('ALL');
    setApprovedProjectFilter('ALL');
    setApprovedSiteFilter('ALL');
    setApprovedSubmitterFilter('ALL');
    setApprovedStartDate('');
    setApprovedEndDate('');
  };

  // Engineer Submit Data — normal fields (not JSON) + device file picker
  const handleSubmitData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert(lang === 'ar' ? 'اختر مشروعاً أولاً' : 'Please select a project first.');
      return;
    }
    // Site is optional — API auto-creates a default site when missing
    const siteId = submitSiteId || selectedProjectSites[0]?.id || undefined;
    if (!submitTitle.trim() || !submitWorkDone.trim()) {
      alert(
        lang === 'ar'
          ? 'اكتب عنوان التقرير والأعمال المنفذة.'
          : 'Enter report title and work done.'
      );
      return;
    }

    try {
      setUploadingFiles(true);
      setUploadProgress(10);
      const mediaIds: string[] = [];
      const totalSteps = Math.max(1, uploadedFiles.length + 2);
      let step = 0;

      for (const item of uploadedFiles) {
        if (item.id) {
          mediaIds.push(item.id);
        } else if (item.file) {
          try {
            const uploaded = await mediaService.uploadDirectToB2(item.file, {
              projectId: selectedProjectId,
              siteId,
              targetType: 'ProjectData'
            });
            mediaIds.push(uploaded.id);
          } catch (b2Err) {
            console.warn('Direct B2 upload failed, attempting fallback form upload:', b2Err);
            const uploaded = await mediaService.uploadFile(item.file, {
              projectId: selectedProjectId,
              siteId,
              entityType: 'ProjectData'
            });
            mediaIds.push(uploaded.id);
          }
        }
        step++;
        setUploadProgress(Math.round((step / totalSteps) * 80));
      }

      setUploadProgress(85);
      const descriptionLines = [
        `${lang === 'ar' ? 'التصنيف' : 'Category'}: ${submitCategory}`,
        `${lang === 'ar' ? 'الطقس' : 'Weather'}: ${submitWeather.trim() || '—'}`,
        `${lang === 'ar' ? 'عدد العمالة' : 'Crew count'}: ${submitCrewCount.trim() || '—'}`,
        `${lang === 'ar' ? 'الأعمال المنفذة' : 'Work done'}: ${submitWorkDone.trim()}`,
        submitNotes.trim()
          ? `${lang === 'ar' ? 'ملاحظات' : 'Notes'}: ${submitNotes.trim()}`
          : null
      ].filter(Boolean);

      const record = await dataRecordService.createRecord({
        projectId: selectedProjectId,
        siteId,
        title: submitTitle.trim(),
        description: descriptionLines.join('\n'),
        submitDirectly: true,
        attachmentMediaIds: mediaIds
      });

      setUploadProgress(95);

      // Already submitted directly; call submit only if still draft
      if ((record as any).status === 'Draft') {
        await dataRecordService.submitRecord(record.id);
      }

      setUploadProgress(100);

      signalRService.emit('ProjectDataSubmitted', { id: record.id, title: submitTitle.trim() });
      signalRService.emit('AdminStatsUpdated');

      setSubmitSuccess(
        lang === 'ar'
          ? `تم إرسال التقرير "${submitTitle}" لمراجعة الأدمن`
          : `Report "${submitTitle}" submitted for Admin review`
      );
      setSubmitTitle('');
      setSubmitWeather('');
      setSubmitCrewCount('');
      setSubmitWorkDone('');
      setSubmitNotes('');
      setUploadedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => { });
      loadAllSites().catch(() => { });
      if (selectedProjectId) selectProject(selectedProjectId).catch(() => { });
      setTimeout(() => setSubmitSuccess(''), 5000);
    } catch (err: any) {
      alert(err?.message || (lang === 'ar' ? 'فشل إرسال التقرير' : 'Failed to submit data'));
    } finally {
      setUploadingFiles(false);
      setUploadProgress(undefined);
    }
  };

  const handleReportFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({
      name: file.name,
      size: file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      file
    }));
    setUploadedFiles((prev) => [...prev, ...next]);
  };

  // Task Center Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId && !editingTaskId) {
      alert(lang === 'ar' ? 'اختر مشروعاً أولاً' : 'Please select a project first.');
      return;
    }
    try {
      setTaskSaving(true);
      if (editingTaskId) {
        const existing = tasks.find((tk) => tk.id === editingTaskId);
        await taskService.updateTask(editingTaskId, {
          title: newTaskTitle,
          description: newTaskDesc || '',
          priority: newTaskPriority,
          assignedToUserId: newTaskAssigneeId || undefined,
          status: existing?.status
        });
        signalRService.emit('TaskUpdated', { id: editingTaskId, title: newTaskTitle });
      } else {
        await taskService.createTask({
          projectId: selectedProjectId!,
          siteId: selectedProjectSites[0]?.id,
          title: newTaskTitle,
          description: newTaskDesc || undefined,
          priority: newTaskPriority,
          assignedToUserId: newTaskAssigneeId || undefined
        });
        signalRService.emit('TaskCreated', { title: newTaskTitle });
      }
      signalRService.emit('AdminStatsUpdated');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskAssigneeId('');
      setEditingTaskId(null);
      setShowNewTaskModal(false);
      const updated = await taskService.getTasks();
      setTasks(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to save task');
    } finally {
      setTaskSaving(false);
    }
  };

  const openEditTask = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setNewTaskTitle(task.title || '');
    setNewTaskDesc((task as any).description || '');
    setNewTaskPriority(task.priority || 'Medium');
    setNewTaskAssigneeId(task.assignedToUserId || '');
    setShowNewTaskModal(true);
  };

  const promptDeleteTask = (task: TaskItem) => {
    setConfirmDialog({
      isOpen: true,
      title: lang === 'ar' ? 'حذف المهمة' : 'Delete Task',
      message:
        lang === 'ar'
          ? `هل تريد حذف المهمة "${task.title}"؟`
          : `Delete task "${task.title}"?`,
      confirmText: lang === 'ar' ? 'حذف' : 'Delete',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      onConfirm: async () => {
        await taskService.deleteTask(task.id);
        signalRService.emit('TaskUpdated', { id: task.id });
        signalRService.emit('AdminStatsUpdated');
        const updated = await taskService.getTasks();
        setTasks(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    const previous = tasks.find((tk) => tk.id === taskId)?.status;
    // Optimistic UI so the engineer sees the change immediately
    setTasks((prev) =>
      prev.map((tk) => (tk.id === taskId ? { ...tk, status: newStatus as any } : tk))
    );
    try {
      await taskService.updateStatus(taskId, newStatus);
      signalRService.emit('TaskStatusChanged', { taskId, status: newStatus, oldStatus: previous });
      signalRService.emit('AdminStatsUpdated');
      const updated = await taskService.getTasks();
      setTasks(updated);
      const roles = authService.getCurrentUser()?.roles || [];
      if (roles.includes('Admin') || roles.includes('SystemAdmin')) {
        dashboardService.getAdminStats().then(setAdminStats).catch(() => { });
      } else {
        dashboardService.getEngineerStats().then(setEngineerStats).catch(() => { });
      }
    } catch (err: any) {
      // Revert on failure
      if (previous !== undefined) {
        setTasks((prev) =>
          prev.map((tk) => (tk.id === taskId ? { ...tk, status: previous } : tk))
        );
      }
      alert(err?.message || (lang === 'ar' ? 'فشل تحديث حالة المهمة' : 'Failed to update status'));
    }
  };

  // User Management Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const wasEdit = !!editingUserId;
    try {
      setUserSaving(true);
      if (editingUserId) {
        await dashboardService.updateUser(editingUserId, {
          firstName: newFirstName,
          lastName: newLastName,
          jobTitle: newUserJobTitle.trim() || undefined,
          isActive: editingUserActive,
          roles: [newUserRole]
        });
      } else {
        await dashboardService.createUser({
          firstName: newFirstName,
          lastName: newLastName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          jobTitle: newUserJobTitle.trim() || undefined
        });
      }
      setShowNewUserModal(false);
      setEditingUserId(null);
      setNewFirstName('');
      setNewLastName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserJobTitle('');
      setNewUserRole('Engineer');
      setEditingUserActive(true);
      const users = await dashboardService.getUsers();
      setUserList(users);
      logger.info(wasEdit ? 'User updated' : 'User provisioned', { email: newUserEmail });
      alert(wasEdit ? (lang === 'ar' ? 'تم تحديث المستخدم' : 'User updated') : t('userCreatedSuccess'));
    } catch (err: any) {
      logger.error('Failed to save user', err);
      alert(err?.message || 'Failed to save user');
    } finally {
      setUserSaving(false);
    }
  };

  const openEditUser = (u: any) => {
    setEditingUserId(u.id);
    setNewFirstName(u.firstName || '');
    setNewLastName(u.lastName || '');
    setNewUserEmail(u.email || '');
    setNewUserJobTitle(u.jobTitle || '');
    setNewUserRole(u.roles?.[0] || 'Engineer');
    setEditingUserActive(u.isActive !== false);
    setNewUserPassword('');
    setShowNewUserModal(true);
  };

  const promptDeleteDataRecord = (record: ProjectDataRecord) => {
    setConfirmDialog({
      isOpen: true,
      title: lang === 'ar' ? 'حذف السجل' : 'Delete Record',
      message:
        lang === 'ar'
          ? `هل تريد حذف السجل "${record.title}"؟`
          : `Delete record "${record.title}"?`,
      confirmText: lang === 'ar' ? 'حذف' : 'Delete',
      confirmColor: 'bg-rose-600 hover:bg-rose-500',
      onConfirm: async () => {
        await dataRecordService.deleteRecord(record.id);
        const updated = await dataRecordService.getPendingApprovals();
        setPendingRecords(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Global Search
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await dashboardService.search(globalSearchQuery);
      setSearchResults(res.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Export CSV Helper (Uses dynamic API_BASE_URL for cloud & local)
  const downloadCsv = (entityType: string) => {
    const token = localStorage.getItem('mti_access_token');
    window.open(`${API_BASE_URL}/api/reports/export?entityType=${entityType}&access_token=${token}`, '_blank');
  };

  // -------------------------------------------------------------
  // Unauthenticated Login Screen — cinematic mock match
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="login-canvas min-h-screen text-slate-100">
        <img
          src="/images/Company1.png"
          alt=""
          className="login-bg-img"
          aria-hidden
        />
        <div className="login-bg-veil" aria-hidden />
        <div className="login-bg-glow login-bg-glow-blue" aria-hidden />
        <div className="login-bg-glow login-bg-glow-red" aria-hidden />

        {/* Peripheral copy — desktop */}
        <div className="login-edge login-edge-tr hidden lg:block" aria-hidden>
          <span>{t('loginTagline')}</span>
          <i />
        </div>
        <div className="login-edge login-edge-left hidden lg:flex" aria-hidden>
          <div className="login-edge-stack">
            <span>BUILD</span>
            <span>PLAN</span>
            <span>MANAGE</span>
            <span>SUCCEED</span>
          </div>
          <div className="login-edge-ar">
            <span>{t('loginSideTag')}</span>
            <i />
          </div>
          <div className="login-edge-micro">ENGINEERING A SMARTER TOMORROW</div>
        </div>
        <div className="login-edge login-edge-br hidden lg:flex" aria-hidden>
          <span>PEOPLE</span>
          <span>PROJECTS</span>
          <span>SOLUTIONS</span>
          <i />
        </div>

        {/* Language switcher */}
        <button
          onClick={toggleLanguage}
          type="button"
          className="login-lang"
        >
          <span className="text-base leading-none">{lang === 'ar' ? '🇺🇸' : '🇪🇬'}</span>
          <span className="font-semibold tracking-wide">{lang === 'ar' ? 'English' : 'العربية'}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
          <div className="w-full max-w-[420px] animate-fade-up">
            <div className="login-card">
              <div className="login-card-shine" aria-hidden />
              <div className="login-card-edge" aria-hidden />

              <div className="relative px-7 pt-8 pb-2 text-center">
                <div className="login-logo-shell mx-auto mb-5">
                  <img
                    src="/images/CompanyLogo.png"
                    alt="MTI Engineering Solutions"
                    className="login-logo-img"
                  />
                </div>

                <div className="login-product-name">
                  <span className="login-product-mark login-product-mark-red" aria-hidden />
                  <h1>
                    <span className="login-product-mti">MTI</span>
                  </h1>
                  <span className="login-product-mark login-product-mark-blue" aria-hidden />
                </div>
                <h2 className="login-product-mgmt mt-2">{t('productName')}</h2>
                <p className="login-subtitle mt-2 px-2">{t('loginSubtitle')}</p>
              </div>

              <div className="relative px-7 pb-8 pt-4">
                {errorMsg && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                <form className="space-y-3.5" onSubmit={handleLogin}>
                  <div className="login-field-block">
                    <div className="relative group">
                      <span className="login-field-icon login-field-icon-start">
                        <UserIcon className="w-4 h-4" strokeWidth={1.7} />
                      </span>
                      <input
                        id="login-email"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailOrUsername')}
                        required
                        autoComplete="username"
                        className="field-input login-field block w-full px-11 py-3.5 rounded-xl text-sm"
                      />
                      <span className="login-field-icon login-field-icon-end">
                        <Mail className="w-4 h-4" strokeWidth={1.7} />
                      </span>
                    </div>
                  </div>

                  <div className="login-field-block">
                    <div className="relative group">
                      <span className="login-field-icon login-field-icon-start">
                        <Lock className="w-4 h-4" strokeWidth={1.7} />
                      </span>
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('password')}
                        required
                        autoComplete="current-password"
                        className="field-input login-field block w-full px-11 py-3.5 rounded-xl text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="login-field-icon login-field-icon-end login-field-btn"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="login-remember">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="login-remember-check"
                    />
                    <span>{t('rememberMe')}</span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="login-submit group w-full mt-1 py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-between disabled:opacity-60"
                  >
                    <span className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Fingerprint className="w-4 h-4" strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="flex-1 text-center tracking-wide">
                      {loading ? t('signingIn') : t('signIn')}
                    </span>
                    {!loading ? (
                      <ArrowRight
                        className={`w-5 h-5 opacity-90 group-hover:-translate-x-0.5 transition-transform ${lang === 'ar' ? 'rotate-180' : ''
                          }`}
                      />
                    ) : (
                      <span className="w-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.roles.includes('Admin') || currentUser.roles.includes('SystemAdmin');

  interface MenuItem {
    id: string;
    label: string;
    icon: any;
    badge?: number;
  }

  // Sidebar Menu Items based on Persona (Prompt 20)
  // Sidebar Menu Items based on Persona with bilingual support
  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'projects', label: t('navProjects'), icon: FolderKanban },
    { id: 'milestones', label: t('navMilestones'), icon: Layers },
    { id: 'documents', label: t('navDocuments'), icon: FileText },
    { id: 'operations', label: t('navSiteOperations'), icon: Wrench },
    { id: 'daily-reports', label: t('navDailyReports'), icon: FileSpreadsheet },
    { id: 'accounting', label: t('navAccounting'), icon: DollarSign },
    { id: 'organization', label: t('navOrganization'), icon: Users },
    { id: 'technical-office', label: t('navTechnicalOffice'), icon: Briefcase },
    { id: 'materials-assets', label: t('navMaterialsAssets'), icon: Package },
    { id: 'governance', label: t('navGovernance'), icon: Award },
    { id: 'sites', label: t('navSites'), icon: MapPin },
    { id: 'engineers', label: t('navEngineers'), icon: Users },
    { id: 'project-data', label: t('navProjectData'), icon: FileSpreadsheet },
    { id: 'reports-archive', label: t('navReportsArchive'), icon: ShieldCheck, badge: approvedRecords.length },
    { id: 'approvals', label: t('navApprovals'), icon: FileCheck, badge: pendingRecords.length },
    { id: 'tasks', label: t('navTasks'), icon: CheckSquare },
    { id: 'chat', label: t('navChat'), icon: MessageSquare },
    { id: 'notifications', label: t('navNotifications'), icon: Bell },
    { id: 'reports', label: t('navReports'), icon: BarChart3 },
    { id: 'audit', label: t('navAudit'), icon: History },
    { id: 'settings', label: t('navSettings'), icon: Settings }
  ];

  const engineerMenuItems: MenuItem[] = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'my-projects', label: t('navMyProjects'), icon: FolderKanban },
    { id: 'milestones', label: t('navMilestones'), icon: Layers },
    { id: 'documents', label: t('navDocuments'), icon: FileText },
    { id: 'operations', label: t('navSiteOperations'), icon: Wrench },
    { id: 'daily-reports', label: t('navDailyReports'), icon: FileSpreadsheet },
    { id: 'my-sites', label: t('navMySites'), icon: MapPin },
    { id: 'my-data', label: t('navMyData'), icon: FileSpreadsheet },
    { id: 'reports-archive', label: t('navReportsArchive'), icon: ShieldCheck, badge: approvedRecords.length },
    { id: 'reports', label: t('navReports'), icon: BarChart3 },
    { id: 'my-tasks', label: t('navMyTasks'), icon: CheckSquare },
    { id: 'chat', label: t('navChat'), icon: MessageSquare },
    { id: 'notifications', label: t('navNotifications'), icon: Bell },
    { id: 'profile', label: t('navProfile'), icon: UserCircle }
  ];

  const technicalOfficeMenuItems: MenuItem[] = [
    { id: 'dashboard', label: t('navDashboard'), icon: LayoutDashboard },
    { id: 'my-projects', label: t('navMyProjects'), icon: FolderKanban },
    { id: 'milestones', label: t('navMilestones'), icon: Layers },
    { id: 'documents', label: t('navDocuments'), icon: FileText },
    { id: 'operations', label: t('navSiteOperations'), icon: Wrench },
    { id: 'daily-reports', label: t('navDailyReports'), icon: FileSpreadsheet },
    { id: 'technical-office', label: t('navTechnicalOffice'), icon: Briefcase },
    { id: 'my-sites', label: t('navMySites'), icon: MapPin },
    { id: 'my-data', label: t('navMyData'), icon: FileSpreadsheet },
    { id: 'reports-archive', label: t('navReportsArchive'), icon: ShieldCheck, badge: approvedRecords.length },
    { id: 'reports', label: t('navReports'), icon: BarChart3 },
    { id: 'my-tasks', label: t('navMyTasks'), icon: CheckSquare },
    { id: 'chat', label: t('navChat'), icon: MessageSquare },
    { id: 'notifications', label: t('navNotifications'), icon: Bell },
    { id: 'profile', label: t('navProfile'), icon: UserCircle }
  ];

  const isAccountant =
    (currentUser.roles as string[]).includes('Accountant') ||
    (currentUser.roles as string[]).includes('Accounting') ||
    (currentUser.permissions && currentUser.permissions.some((p: string) => p.startsWith('Accounting.')));
  const isTechnicalOffice = (currentUser.roles as string[]).includes('TechnicalOffice');
  const accountantMenuItems: MenuItem[] = [
    { id: 'accounting', label: t('navAccounting'), icon: DollarSign },
    { id: 'notifications', label: t('navNotifications'), icon: Bell },
    { id: 'profile', label: t('navProfile'), icon: UserCircle }
  ];

  const menuItems: MenuItem[] = isAdmin
    ? adminMenuItems
    : isAccountant
      ? accountantMenuItems
      : isTechnicalOffice
        ? technicalOfficeMenuItems
        : engineerMenuItems;

  // -------------------------------------------------------------
  // Authenticated Desktop & Mobile Responsive Enterprise Layout
  // -------------------------------------------------------------
  return (
    <div className="app-shell min-h-screen text-slate-100 flex font-body overflow-hidden">
      {/* 1. DESKTOP SIDEBAR (Visible on lg and larger) */}
      <aside
        className={`hidden lg:flex ${sidebarCollapsed ? 'w-[4.75rem]' : 'w-64'
          } glass-nav flex-col transition-all duration-300 ease-in-out z-30`}
      >
        {/* Sidebar Header / Logo */}
        <div className="p-4 border-b border-slate-600/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden min-w-0">
            <div className="rounded-xl bg-[#0a1220] border border-cyan-400/20 p-1.5 flex-shrink-0 flex items-center justify-center shadow-[0_0_18px_rgba(56,189,248,0.15)]">
              <img
                src="/images/CompanyLogo.png"
                alt="MTI Logo"
                className="h-9 w-auto object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 text-start">
                <div className="font-display font-bold text-slate-100 text-sm leading-tight truncate">
                  MTI Engineering
                </div>
                <div className="text-[10px] text-cyan-300 tracking-wide font-medium truncate">
                  Solutions
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-700/40 text-slate-400 hover:text-slate-100 transition-colors flex-shrink-0"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  logger.info('Tab switched', { tab: item.id });
                  if (item.id === 'my-projects' || item.id === 'projects') loadProjects();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isCurrent
                    ? 'nav-item-active'
                    : 'text-slate-500 hover:text-slate-100 hover:bg-slate-700/40'
                  }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.badge && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-white font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer — logout then logo only */}
        <div className="p-3 border-t border-slate-600/50 space-y-2.5">
          {!sidebarCollapsed ? (
            <>
              <button
                onClick={handleLogout}
                title={t('signOut')}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-rose-300 bg-slate-900/50 hover:bg-rose-500/10 border border-slate-600/50 hover:border-rose-400/35 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('signOut')}
              </button>
              <div className="rounded-2xl border border-cyan-400/25 bg-[#0b1526]/80 px-2.5 py-2.5 flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(14,165,233,0.12)] min-h-[108px]">
                <img
                  src="/images/CompanyLogo.png"
                  alt="MTI Logo"
                  className="w-full max-h-[72px] h-auto object-contain drop-shadow-lg"
                />
                <div className="text-[9px] tracking-[0.16em] uppercase text-cyan-100/90 font-semibold text-center leading-tight">
                  Innovation · People · Solutions
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleLogout}
                title={t('signOut')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/40 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <img src="/images/CompanyLogo.png" alt="MTI" className="h-8 w-auto object-contain" />
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE & TABLET DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 start-0 max-w-xs w-full glass-nav flex flex-col z-50 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-600/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-lg bg-[#0b0b0b] flex items-center justify-center">
                  <img
                    src="/images/CompanyLogo.png"
                    alt="MTI Logo"
                    className="h-7 w-auto object-contain"
                  />
                </div>
                <div>
                  <div className="font-display font-bold text-slate-100 text-sm">{t('appName')}</div>
                  <div className="text-[10px] text-cyan-300 font-medium">{t('appSubtitle')}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                      logger.info('Mobile tab switched', { tab: item.id });
                      if (item.id === 'my-projects' || item.id === 'projects') loadProjects();
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${isCurrent
                        ? 'nav-item-active'
                        : 'text-slate-500 hover:text-slate-100 hover:bg-slate-700/40'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-white font-bold text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-600/50 space-y-3">
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-rose-300 bg-slate-900/50 hover:bg-rose-500/10 border border-slate-600/50 hover:border-rose-400/35 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('signOut')}
              </button>
              <div className="rounded-2xl border border-cyan-400/25 bg-[#0b1526]/80 px-2.5 py-2.5 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                <img src="/images/CompanyLogo.png" alt="MTI Logo" className="w-full max-h-[68px] h-auto object-contain" />
                <div className="text-[9px] tracking-[0.16em] uppercase text-cyan-100/90 font-semibold text-center leading-tight">
                  Innovation · People · Solutions
                </div>
              </div>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-mti-100 border border-cyan-400/25 flex items-center justify-center font-bold text-xs text-mti-700">
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </div>
                <div className="truncate text-start">
                  <div className="text-xs font-semibold text-slate-100 truncate">{currentUser.fullName}</div>
                  <div className="text-[10px] text-cyan-300 truncate">
                    {currentUser.jobTitle || currentUser.roles.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 glass-topbar px-4 sm:px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-800/45 hover:bg-slate-700/45 border border-slate-600/50 text-slate-300"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Permanent Top Company Logo & Identity Badge */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-slate-800/70 border border-slate-600/50 shadow-sm backdrop-blur-md flex-shrink-0">
              <div className="p-1 rounded-lg bg-[#0b0b0b] flex items-center justify-center">
                <img
                  src="/images/CompanyLogo.png"
                  alt="MTI Engineering Solutions"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div className="hidden sm:block border-l border-slate-600/50 pl-2.5 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2.5">
                <div className="text-[11px] font-bold text-slate-100 tracking-wide leading-none">{t('appName')}</div>
                <div className="text-[9px] text-cyan-300 font-medium uppercase tracking-wider mt-0.5">{t('portalBadge')}</div>
              </div>
            </div>

            <form onSubmit={handleGlobalSearch} className="relative max-w-md w-full hidden md:block">
              <Search className="w-5 h-5 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 text-cyan-300" strokeWidth={2.4} />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="field-input w-full pl-11 rtl:pl-4 rtl:pr-11 pr-4 py-2.5 rounded-xl text-sm font-medium text-slate-50 placeholder:text-slate-400 border-cyan-400/40"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Language Switcher Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/45 hover:bg-slate-700/45 border border-slate-600/50 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
            >
              <span className="text-sm">{lang === 'ar' ? '🇺🇸' : '🇪🇬'}</span>
              <span className="hidden sm:inline">{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* SignalR Connection Status Pill */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-slate-800/70 border border-slate-600/50 text-[11px]">
              <Radio className={`w-3 h-3 ${signalRConnected ? 'text-emerald-400 status-dot-live' : 'text-amber-400'}`} />
              <span className={`hidden sm:inline ${signalRConnected ? 'text-emerald-400 font-medium' : 'text-amber-400'}`}>
                {signalRConnected ? t('liveSync') : t('connecting')}
              </span>
            </div>

            {/* Facebook Messenger Style Messages Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowMessagesDropdown((v) => !v);
                  setShowNotificationsDropdown(false);
                }}
                className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/40 border border-slate-600/50 text-slate-300 relative transition-colors"
                title={t('messagesTitle')}
              >
                <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
                {totalUnreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-cyan-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-sky-500/50">
                    {totalUnreadMessages}
                  </span>
                )}
              </button>

              {/* Facebook Messenger Dropdown Popover */}
              {showMessagesDropdown && (
                <div className="absolute end-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-[#1a2f4a] border-2 border-cyan-400/25 shadow-xl z-50 overflow-hidden animate-fade-up">
                  <div className="p-3.5 border-b-2 border-cyan-400/20 flex items-center justify-between bg-[#15294a]">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-300" />
                      <span className="font-bold text-slate-100 text-xs">{t('messagesTitle')}</span>
                      {totalUnreadMessages > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500 text-white font-semibold">
                          {totalUnreadMessages} {t('messagesUnread')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowNewChatModal(true);
                        setShowMessagesDropdown(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      {t('startChat')}
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-400/40">
                    {conversations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-200 space-y-2">
                        <MessageSquare className="w-8 h-8 text-slate-500 mx-auto opacity-70" />
                        <p>{t('noConversationsFound')}</p>
                        <button
                          onClick={() => {
                            setShowNewChatModal(true);
                            setShowMessagesDropdown(false);
                          }}
                          className="text-cyan-300 font-semibold hover:underline"
                        >
                          {t('startChat')}
                        </button>
                      </div>
                    ) : (
                      conversations.slice(0, 6).map((c) => {
                        const displayName = getConversationDisplayName(c);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              openConversation(c);
                              setActiveTab('chat');
                              setShowMessagesDropdown(false);
                            }}
                            className={`p-3.5 hover:bg-cyan-500/15 transition-colors cursor-pointer flex items-center gap-3 ${c.unreadCount > 0 ? 'bg-cyan-500/10' : 'bg-slate-800/60'
                              }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {displayName[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-bold text-xs truncate ${c.unreadCount > 0 ? 'text-slate-100' : 'text-slate-100'}`}>
                                  {displayName}
                                </span>
                                {c.unreadCount > 0 && (
                                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                    {c.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] truncate mt-0.5 ${c.unreadCount > 0 ? 'text-cyan-300 font-medium' : 'text-slate-300'}`}>
                                {c.lastMessage?.content || (lang === 'ar' ? 'لا رسائل بعد' : 'No messages yet')}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2.5 border-t-2 border-cyan-400/20 bg-[#15294a] text-center">
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        setShowMessagesDropdown(false);
                      }}
                      className="w-full py-2 rounded-xl bg-[#1e334f] hover:bg-cyan-500/15 border border-slate-500/40 text-cyan-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>{t('viewAllMessages')}</span>
                      <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Bell & Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotificationsDropdown((v) => !v);
                  setShowMessagesDropdown(false);
                }}
                className="p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/40 border border-slate-600/50 text-slate-300 relative transition-colors"
                title={t('navNotifications')}
              >
                <Bell className="w-4 h-4" strokeWidth={1.8} />
                {notificationsList.filter((n) => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-slate-100 rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
                    {notificationsList.filter((n) => !n.isRead).length}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute end-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm rounded-2xl bg-slate-800/45 border border-slate-600/50 shadow-xl backdrop-blur-xl z-50 overflow-hidden animate-fade-up">
                  <div className="p-3.5 border-b border-slate-600/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-300" />
                      <span className="font-bold text-slate-100 text-xs">{t('realTimeNotifications')}</span>
                    </div>
                    {notificationsList.some((n) => !n.isRead) && (
                      <button
                        onClick={async () => {
                          await notificationService.markAllAsRead();
                          setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
                        }}
                        className="text-[11px] text-cyan-300 hover:underline"
                      >
                        {t('markAllAsRead')}
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/60">
                    {notificationsList.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        {t('noNotifications')}
                      </div>
                    ) : (
                      notificationsList.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            if (!n.isRead) {
                              await notificationService.markAsRead(n.id);
                              setNotificationsList((prev) =>
                                prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
                              );
                            }
                            if (n.type === 'TaskAssigned' || n.type === 'NewTask') setActiveTab('tasks');
                            if (n.type === 'SystemNotification' || n.entityType === 'Project') setActiveTab('projects');
                            if (n.type === 'DataApproval') setActiveTab('approvals');
                            if (n.type === 'NewMessage') setActiveTab('chat');
                            setShowNotificationsDropdown(false);
                          }}
                          className={`p-3.5 hover:bg-slate-700/40 transition-colors cursor-pointer flex items-start gap-3 ${!n.isRead ? 'bg-mti-500/[0.06]' : ''
                            }`}
                        >
                          <div className="p-1.5 rounded-lg bg-slate-700/45 text-cyan-300 flex-shrink-0 mt-0.5">
                            <Radio className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-100 truncate">{n.title}</div>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.body}</p>
                            <span className="text-[9px] text-slate-500 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 border-t border-slate-600/50 bg-slate-800/50 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotificationsDropdown(false);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/45 border border-slate-600/50 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      {t('navNotifications')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Global Search Results Modal */}
        {searchResults !== null && (
          <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-start justify-center p-6 pt-20">
            <div className="app-modal-panel max-w-2xl space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-600/50 pb-3">
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-300" />
                  Search Results for &ldquo;{globalSearchQuery}&rdquo; ({searchResults.length})
                </h3>
                <button onClick={() => setSearchResults(null)} className="text-slate-400 hover:text-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {searchResults.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No matching records found.</p>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSearchResults(null);
                        setDrawerData({ title: item.title, type: item.type, details: item });
                      }}
                      className="p-3 rounded-xl bg-slate-800/70 border border-slate-600/50 hover:border-cyan-400/25 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700/45 text-cyan-300 mr-2">
                          {item.type}
                        </span>
                        <span className="font-semibold text-slate-100">{item.title}</span>
                        {item.subtitle && <p className="text-slate-400 text-[11px] mt-0.5">{item.subtitle}</p>}
                      </div>
                      {item.status && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/45 text-slate-300">
                          {translateStatusLabel(item.status)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scrollable View Content */}
        <main
          className={`flex-1 p-3 sm:p-6 pb-24 lg:pb-6 space-y-6 min-h-0 ${activeTab === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'
            }`}
        >
          {/* Skeleton Loader while content switching */}
          {isLoadingContent ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-slate-700/45 rounded-xl w-1/4"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-24 bg-slate-700/45 rounded-2xl"></div>
                <div className="h-24 bg-slate-700/45 rounded-2xl"></div>
                <div className="h-24 bg-slate-700/45 rounded-2xl"></div>
                <div className="h-24 bg-slate-700/45 rounded-2xl"></div>
              </div>
              <div className="h-64 bg-slate-700/45 rounded-2xl"></div>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* VIEW: DASHBOARD */}
              {/* ======================================================== */}
              {activeTab === 'dashboard' && (
                <MainDashboard
                  lang={lang}
                  isAdmin={isAdmin}
                  userName={currentUser.fullName || currentUser.firstName || ''}
                  projects={projects}
                  tasks={tasks}
                  auditLogs={auditLogs}
                  adminStats={adminStats}
                  engineerStats={engineerStats}
                  pendingApprovals={adminStats?.pendingApprovals ?? pendingRecords.length}
                  approvedRecords={adminStats?.approvedData ?? approvedRecords.length}
                  engineerCount={
                    adminStats?.totalEngineers ??
                    userList.filter((u) => (u.roles || []).some((r: string) => r === 'Engineer')).length
                  }
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenProject={(p) => {
                    selectProject(p.id);
                    setDrawerData({ title: p.name, type: 'Project', details: p });
                  }}
                  translateStatus={translateStatusLabel}
                />
              )}

              {/* ======================================================== */}
              {/* VIEW: PROJECTS / MY PROJECTS */}
              {/* ======================================================== */}
              {(activeTab === 'projects' || activeTab === 'my-projects') && (
                <div className="projects-workspace grid grid-cols-1 xl:grid-cols-12 gap-5">
                  {/* Project list */}
                  <div className="xl:col-span-4 projects-panel rounded-2xl p-4 flex flex-col min-h-[620px]">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="text-start">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-cyan-300" />
                          {t('projectsRoster')}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {lang === 'ar' ? 'عرض وإدارة كل المشاريع' : 'Browse and manage all projects'}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingProjectId(null);
                            setNewCode('');
                            setNewName('');
                            setNewDesc('');
                            setNewClient('');
                            setNewProjectMemberIds([]);
                            setNewCoverImageUrl(null);
                            setNewProgressPercentage(0);
                            setNewProjectType('GeneralEngineering');
                            setShowNewProjectModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold flex items-center gap-1 shadow-[0_0_18px_rgba(14,165,233,0.45)]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t('newProject')}
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pe-1">
                      {projects.length === 0 && (
                        <div className="py-16 text-center text-xs text-slate-400">
                          {lang === 'ar' ? 'لا توجد مشاريع بعد' : 'No projects yet'}
                        </div>
                      )}
                      {projects.map((proj) => {
                        const progress = Math.min(100, Math.max(0, proj.progressPercentage ?? 0));
                        const selected = selectedProjectId === proj.id;
                        const cover = resolveProjectCover(proj.coverImageUrl);
                        return (
                          <div
                            key={proj.id}
                            onClick={() => selectProject(proj.id)}
                            className={`project-card rounded-2xl overflow-hidden cursor-pointer transition-all ${selected ? 'project-card-active' : ''
                              }`}
                          >
                            <div className="relative aspect-[16/9] overflow-hidden">
                              <img
                                src={cover}
                                alt={proj.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_PROJECT_COVER;
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#06101c]/95 via-[#06101c]/35 to-transparent" />
                              <span className="absolute top-2.5 start-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/90 text-white border border-emerald-300/40">
                                {translateStatusLabel(proj.status)}
                              </span>
                              <div className="absolute bottom-0 inset-x-0 p-3 text-start">
                                <div className="text-[11px] font-bold text-cyan-300 tracking-wide">{proj.code}</div>
                                <div className="text-sm font-bold text-white leading-snug mt-0.5 line-clamp-1">{proj.name}</div>
                                <div className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">{proj.clientName || '—'}</div>
                              </div>
                            </div>
                            <div className="px-3 pb-3 pt-2 space-y-2 bg-[#0b1526]/90">
                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                <span>{lang === 'ar' ? 'نسبة الإنجاز' : 'Progress'}</span>
                                <span className="text-cyan-300 font-bold tabular-nums">{progress}%</span>
                              </div>
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700/80">
                                <div
                                  className="h-full rounded-full bg-gradient-to-l from-cyan-300 to-sky-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              {isAdmin && (
                                <div className="pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => openEditProject(proj)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0ea5e9]/90 hover:bg-[#0284c7] text-white text-[11px] font-bold"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => promptDeleteProject(proj)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#7f1d1d]/95 hover:bg-rose-800 text-rose-100 text-[11px] font-bold"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    {lang === 'ar' ? 'حذف' : 'Delete'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sites panel */}
                  <div className="xl:col-span-8 projects-panel projects-sites-panel rounded-2xl p-4 flex flex-col min-h-[620px] relative overflow-hidden">
                    <div className="projects-map-bg" aria-hidden />
                    <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
                      <div className="text-start">
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-cyan-300" />
                          {t('sitesUnderProject')}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {selectedProjectId
                            ? projects.find((p) => p.id === selectedProjectId)?.name || ''
                            : lang === 'ar'
                              ? 'اختر مشروعاً لعرض مواقعه'
                              : 'Select a project to view its sites'}
                        </p>
                      </div>
                      {isAdmin && selectedProjectId && (
                        <button
                          type="button"
                          onClick={openCreateSite}
                          className="px-3 py-1.5 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold flex items-center gap-1 shadow-[0_0_18px_rgba(14,165,233,0.45)]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'إضافة موقع' : 'Add Site'}
                        </button>
                      )}
                    </div>

                    <div className="relative z-10 flex-1 overflow-y-auto">
                      {loadingSites ? (
                        <div className="p-8 text-center text-xs text-slate-500">{t('loading')}</div>
                      ) : !selectedProjectId ? (
                        <div className="h-full min-h-[360px] flex items-center justify-center text-sm text-slate-400">
                          {lang === 'ar' ? 'اختر مشروعاً من القائمة' : 'Pick a project from the list'}
                        </div>
                      ) : selectedProjectSites.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-slate-900/55 border border-cyan-400/20 text-center space-y-3 backdrop-blur-md">
                          <p className="text-xs text-slate-300">{t('noSitesYet')}</p>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={openCreateSite}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {lang === 'ar' ? 'إضافة موقع' : 'Add Site'}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {selectedProjectSites.map((site) => (
                            <div key={site.id} className="site-hero-card rounded-2xl overflow-hidden border border-cyan-400/30 bg-[#0b1526]/75 backdrop-blur-md shadow-[0_0_28px_rgba(14,165,233,0.18)]">
                              <div className="grid grid-cols-1 md:grid-cols-12">
                                <div className="md:col-span-5 relative aspect-[16/10] md:aspect-auto md:min-h-[200px]">
                                  <img
                                    src={DEFAULT_PROJECT_COVER}
                                    alt={site.name}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-l from-[#06101c]/80 to-transparent" />
                                  <span className="absolute top-3 start-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-slate-950/70 text-amber-200 border border-amber-400/30">
                                    <Clock className="w-3 h-3" />
                                    {translateStatusLabel(site.status)}
                                  </span>
                                </div>
                                <div className="md:col-span-7 p-4 flex flex-col gap-3 text-start">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-[11px] font-bold text-cyan-300">{site.code}</div>
                                      <div className="text-base font-bold text-white mt-0.5">{site.name}</div>
                                      <div className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-cyan-400" />
                                        {site.address || (lang === 'ar' ? 'بدون عنوان' : 'No address')}
                                      </div>
                                    </div>
                                  </div>
                                  {site.description && (
                                    <p className="text-xs text-slate-400 line-clamp-2">{site.description}</p>
                                  )}
                                  <div className="text-[11px]">
                                    <div className="text-slate-400 font-medium mb-1.5">{t('assignedEngineers')}:</div>
                                    {site.assignments && site.assignments.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {site.assignments.map((a) => (
                                          <span
                                            key={a.id}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 border border-slate-600/50 text-slate-200"
                                          >
                                            {a.engineerName}
                                            <span className="text-cyan-300 text-[10px]">{a.role}</span>
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-slate-500 italic">{t('noEngineersAssigned')}</div>
                                    )}
                                  </div>
                                  {isAdmin && (
                                    <div className="mt-auto pt-2 flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openEditSite(site)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#0ea5e9]/90 hover:bg-[#0284c7] text-white text-xs font-bold"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                        {lang === 'ar' ? 'تعديل' : 'Edit'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => promptDeleteSite(site)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#7f1d1d]/95 hover:bg-rose-800 text-rose-100 text-xs font-bold"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {lang === 'ar' ? 'حذف' : 'Delete'}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: SITES (standalone page) */}
              {/* ======================================================== */}
              {(activeTab === 'sites' || activeTab === 'my-sites') && (
                <div className="space-y-4">
                  <div className="glow-card p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cyan-300" />
                        {t('sitesPageTitle')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{t('sitesPageSubtitle')}</p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedProjectId || ''}
                          onChange={(e) => selectProject(e.target.value)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800/70 border border-slate-500/40 text-xs text-slate-200"
                        >
                          <option value="">
                            {lang === 'ar' ? 'اختر مشروعاً للإضافة' : 'Select project to add'}
                          </option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProjectId) {
                              alert(lang === 'ar' ? 'اختر مشروعاً أولاً' : 'Select a project first');
                              return;
                            }
                            openCreateSite();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'إضافة موقع' : 'Add Site'}
                        </button>
                      </div>
                    )}
                  </div>

                  {loadingAllSites ? (
                    <div className="p-10 text-center text-xs text-slate-400">{t('loading')}</div>
                  ) : allSites.length === 0 ? (
                    <div className="glow-card p-10 rounded-2xl text-center space-y-3">
                      <MapPin className="w-10 h-10 text-slate-500 mx-auto opacity-60" />
                      <p className="text-sm text-slate-200 font-medium">{t('sitesEmptyHint')}</p>
                      {isAdmin && projects.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedProjectId && projects[0]) selectProject(projects[0].id);
                            setTimeout(() => openCreateSite(), 50);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'إضافة أول موقع' : 'Add first site'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {allSites.map((site) => (
                        <div key={site.id} className="glow-card p-4 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                              {site.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/45 text-slate-300">
                              {translateStatusLabel(site.status)}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-100 text-sm">{site.name}</div>
                          <div className="text-xs text-slate-400">
                            {lang === 'ar' ? 'المشروع' : 'Project'}:{' '}
                            <span className="text-slate-200">{site.projectName || '—'}</span>
                          </div>
                          {site.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">{site.description}</p>
                          )}
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{site.address || (lang === 'ar' ? 'بدون عنوان' : 'No address')}</span>
                          </div>
                          {isAdmin && (
                            <div className="pt-2 flex items-center gap-2 border-t border-slate-600/40">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProjectId(site.projectId);
                                  openEditSite(site);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 text-[11px] font-semibold"
                              >
                                <Pencil className="w-3 h-3" />
                                {lang === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => promptDeleteSite(site)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-semibold"
                              >
                                <Trash2 className="w-3 h-3" />
                                {lang === 'ar' ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: APPROVALS (Prompt 14 & 20) */}
              {/* ======================================================== */}
              {activeTab === 'approvals' && isAdmin && (
                <div className="space-y-4">
                  <div className="glow-card p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{t('approvalCenterTitle')}</h3>
                      <p className="text-xs text-slate-400">{t('approvalCenterSubtitle')}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                      {pendingRecords.length} {t('pendingReview')}
                    </span>
                  </div>

                  {pendingRecords.length === 0 ? (
                    <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      {t('allReviewed')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Array.isArray(pendingRecords) ? pendingRecords : []).map((r) => (
                        <div key={r.id} className="glow-card p-5 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  {r.category}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/45 text-slate-400">v{r.version}</span>
                              </div>
                              <h4 className="font-semibold text-slate-100 text-sm mt-1">{r.title}</h4>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Project: <span className="text-slate-200">{r.projectName}</span> &bull; Site:{' '}
                                <span className="text-slate-200">{r.siteName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/90 border border-cyan-500/35 shadow-sm text-start">
                              <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {r.submitterName ? r.submitterName[0] : 'U'}
                              </div>
                              <div className="text-start">
                                <span className="text-[10px] text-cyan-300 font-bold block">
                                  {lang === 'ar' ? 'المهندس القائم بالرفع:' : 'Uploaded by:'}
                                </span>
                                <span className="text-xs font-bold text-white block">
                                  {r.submitterName || (lang === 'ar' ? 'غير محدد' : 'Unknown')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(r.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {(r as any).description || r.dataPayloadJson ? (
                            <div className="p-3 rounded-xl bg-slate-800/45 border border-slate-600/50 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                              {(r as any).description || r.dataPayloadJson}
                            </div>
                          ) : null}

                          <div className="pt-2 border-t border-slate-600/50 space-y-1.5">
                            <div className="flex items-center justify-between gap-4">
                              <input
                                type="text"
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                                placeholder={t('commentsPlaceholder')}
                                className="flex-1 px-3 py-1.5 bg-slate-800/70 border border-slate-600/50 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                              />

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingRecord(r);
                                    setInspectingRecordId(r.id);
                                  }}
                                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 text-xs font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] transition-all"
                                >
                                  <Eye className="w-3.5 h-3.5 text-cyan-300" />
                                  {lang === 'ar' ? 'عرض وقراءة التقرير' : 'View Details'}
                                </button>
                                <button
                                  onClick={() => promptDeleteDataRecord(r)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-rose-300 text-xs font-semibold flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {lang === 'ar' ? 'حذف' : 'Delete'}
                                </button>
                                <button
                                  onClick={() => promptRequestChanges(r)}
                                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                                >
                                  {t('requestChanges')}
                                </button>
                                <button
                                  onClick={() => promptReject(r)}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                                >
                                  {t('reject')}
                                </button>
                                <button
                                  onClick={() => promptApprove(r)}
                                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                                >
                                  {t('approve')}
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400">{t('hintApprovalComment')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: PROJECT DATA / MY DATA */}
              {/* ======================================================== */}
              {(activeTab === 'project-data' || activeTab === 'my-data') && (
                <div className="space-y-6">
                  {/* Redesigned Enterprise Daily / Site Report Submission Card */}
                  <div className="glow-card p-6 md:p-8 rounded-3xl border border-cyan-500/30 bg-slate-900/85 shadow-[0_0_50px_rgba(6,182,212,0.12)] space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 end-0 w-72 h-72 bg-gradient-to-bl from-cyan-500/10 via-sky-500/5 to-transparent rounded-bl-full pointer-events-none" />

                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-700/60 relative z-10">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-sky-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.35)] flex-shrink-0">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-100 text-base md:text-lg tracking-wide">
                              {lang === 'ar' ? 'إضافة تقرير موقع جديد' : 'Submit Daily Site Report'}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                              {submitCategory === 'DailyReport'
                                ? (lang === 'ar' ? 'تقرير يومي' : 'Daily Report')
                                : submitCategory}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {lang === 'ar'
                              ? 'توثيق سير الأعمال المنفذة، ظروف الطقس، حجم العمالة، والمرفقات الهندسية'
                              : 'Log daily execution progress, field weather, crew count, and attachments'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/60 border border-slate-700/70 text-[11px] text-slate-300 font-medium">
                          <Clock className="w-3.5 h-3.5 text-cyan-300" />
                          {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {submitSuccess && (
                      <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span className="font-medium">{submitSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitData} className="space-y-5 relative z-10">
                      {/* Section 1: Project & Location */}
                      <div className="p-4 md:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          <FolderKanban className="w-4 h-4" />
                          <span>{lang === 'ar' ? '1. المشروع والموقع' : '1. Target Project & Site'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                              {t('targetProject')} <span className="text-rose-400">*</span>
                            </label>
                            <div className="relative">
                              <select
                                required
                                disabled={uploadingFiles}
                                value={selectedProjectId || ''}
                                onChange={(e) => {
                                  selectProject(e.target.value);
                                  setSubmitSiteId('');
                                }}
                                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all"
                              >
                                {projects.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} - {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{t('hintReportProject')}</p>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                              {t('reportSelectSite')}{' '}
                              <span className="text-slate-500 font-normal">
                                ({lang === 'ar' ? 'اختياري' : 'optional'})
                              </span>
                            </label>
                            <div className="relative">
                              <select
                                disabled={uploadingFiles}
                                value={submitSiteId}
                                onChange={(e) => setSubmitSiteId(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all"
                              >
                                <option value="">
                                  {lang === 'ar' ? 'تلقائي / بدون تحديد' : 'Auto / not specified'}
                                </option>
                                {selectedProjectSites.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.code} - {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">{t('hintReportSite')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Category & Title */}
                      <div className="p-4 md:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          <FileText className="w-4 h-4" />
                          <span>{lang === 'ar' ? '2. تصنيف التقرير وعنوانه' : '2. Category & Title'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t('dataCategory')}</label>
                            <select
                              disabled={uploadingFiles}
                              value={submitCategory}
                              onChange={(e) => setSubmitCategory(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all"
                            >
                              <option value="DailyReport">{lang === 'ar' ? 'تقرير يومي (Daily Report)' : 'Daily Report'}</option>
                              <option value="SiteReport">{lang === 'ar' ? 'تقرير موقع (Site Report)' : 'Site Report'}</option>
                              <option value="InspectionReport">{lang === 'ar' ? 'تقرير معاينة فنية (Inspection Report)' : 'Inspection Report'}</option>
                              <option value="EquipmentData">{lang === 'ar' ? 'بيانات معدات (Equipment Data)' : 'Equipment Data'}</option>
                              <option value="MaterialData">{lang === 'ar' ? 'بيانات مواد وتوريدات (Material Data)' : 'Material Data'}</option>
                              <option value="Measurements">{lang === 'ar' ? 'قياسات وحصر كميات (Measurements)' : 'Measurements'}</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">{t('hintReportCategory')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                              {t('submissionTitle')} <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              disabled={uploadingFiles}
                              value={submitTitle}
                              onChange={(e) => setSubmitTitle(e.target.value)}
                              placeholder={lang === 'ar' ? 'مثال: صب خرسانة القواعد — محور أ' : 'e.g. Concrete casting — Sector A'}
                              required
                              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all placeholder:text-slate-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">{t('hintReportTitle')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Field Conditions & Manpower */}
                      <div className="p-4 md:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          <CloudSun className="w-4 h-4" />
                          <span>{lang === 'ar' ? '3. الظروف الميدانية وحجم العمالة' : '3. Site Conditions & Manpower'}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                              <CloudSun className="w-3.5 h-3.5 text-amber-300" />
                              <span>{t('reportWeather')}</span>
                            </label>
                            <input
                              type="text"
                              disabled={uploadingFiles}
                              value={submitWeather}
                              onChange={(e) => setSubmitWeather(e.target.value)}
                              placeholder={lang === 'ar' ? 'مثال: صافي، 28 درجة مئوية' : 'e.g. Clear, 28°C'}
                              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all placeholder:text-slate-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">{t('hintReportWeather')}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-sky-400" />
                              <span>{t('reportCrewCount')}</span>
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              disabled={uploadingFiles}
                              value={submitCrewCount}
                              onChange={(e) => setSubmitCrewCount(e.target.value)}
                              placeholder={lang === 'ar' ? 'مثال: 2 مهندس، 6 فنيين، 12 عامل' : 'e.g. 2 Engineers, 6 Techs, 12 Laborers'}
                              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all placeholder:text-slate-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">{t('hintReportCrew')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Work Performed */}
                      <div className="p-4 md:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          <CheckSquare className="w-4 h-4" />
                          <span>{lang === 'ar' ? '4. الأعمال المنفذة والملاحظات' : '4. Work Done & Notes'}</span>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                            {t('reportWorkDone')} <span className="text-rose-400">*</span>
                          </label>
                          <textarea
                            value={submitWorkDone}
                            disabled={uploadingFiles}
                            onChange={(e) => setSubmitWorkDone(e.target.value)}
                            rows={3}
                            required
                            placeholder={
                              lang === 'ar'
                                ? 'اكتب بالتفصيل ما تم إنجازه اليوم في الموقع، بنود العمل، والمحاور المنفذة...'
                                : 'Describe in detail the tasks and activities completed on site today...'
                            }
                            className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all resize-none placeholder:text-slate-500 leading-relaxed"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">{t('hintReportWork')}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                            <span>{t('reportNotes')}</span>
                          </label>
                          <textarea
                            value={submitNotes}
                            disabled={uploadingFiles}
                            onChange={(e) => setSubmitNotes(e.target.value)}
                            rows={2}
                            placeholder={lang === 'ar' ? 'ملاحظات اختيارية، مشاكل ميدانية أو احتياجات غداً...' : 'Optional notes, issues, or tomorrow requirements...'}
                            className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-slate-100 text-xs font-medium transition-all resize-none placeholder:text-slate-500"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">{t('hintReportNotes')}</p>
                        </div>
                      </div>

                      {/* Section 5: Attachments & Media Dropzone */}
                      <div className="p-4 md:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-3.5">
                        <div className="flex items-center justify-between text-xs font-bold text-cyan-300 uppercase tracking-wider">
                          <span className="flex items-center gap-2">
                            <FileUp className="w-4 h-4" />
                            {lang === 'ar' ? '5. المرفقات والصور الميدانية' : '5. Field Attachments & Photos'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-normal normal-case">
                            ({uploadedFiles.length} {lang === 'ar' ? 'ملفات محددة' : 'files selected'})
                          </span>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx,image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            handleReportFilesSelected(e.target.files);
                            e.target.value = '';
                          }}
                        />

                        <button
                          type="button"
                          disabled={uploadingFiles}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-cyan-400/35 hover:border-cyan-400/70 hover:bg-cyan-500/5 rounded-2xl p-5 text-center transition-all bg-slate-900/60 group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 mx-auto mb-2 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="text-xs text-slate-100 font-bold">{t('attachFiles')}</div>
                          <div className="text-[11px] text-slate-400 mt-1">{t('attachSubtext')}</div>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/70 border border-slate-700/60 text-[10px] text-cyan-300">
                            PDF, JPG, PNG, XLSX, DOCX
                          </div>
                        </button>

                        {uploadedFiles.length > 0 && (
                          <div className="space-y-2 pt-2">
                            <span className="text-[11px] font-semibold text-slate-300">
                              {lang === 'ar' ? 'الملفات المجهزة للرفع:' : 'Files ready for upload:'}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {uploadedFiles.map((f, idx) => (
                                <div
                                  key={`${f.name}-${idx}`}
                                  className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-cyan-400/25 text-xs text-slate-200"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-cyan-300 flex-shrink-0" />
                                    <span className="truncate font-medium">{f.name}</span>
                                    <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">({f.size})</span>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={uploadingFiles}
                                    onClick={() =>
                                      setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
                                    }
                                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-colors flex-shrink-0"
                                    title={lang === 'ar' ? 'إزالة الملف' : 'Remove file'}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Live Loading Counter & Progress Meter */}
                      <ActionLoadingBar
                        active={uploadingFiles}
                        percent={uploadProgress}
                        isArabic={lang === 'ar'}
                        label={
                          lang === 'ar'
                            ? `جاري رفع المرفقات وإرسال التقرير…`
                            : `Uploading attachments & submitting report…`
                        }
                      />

                      {/* Form Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
                        <div className="text-[11px] text-slate-400">
                          {lang === 'ar'
                            ? '* الحقول المعلمة بـ (*) مطلوبة لحفظ التقرير وإرساله'
                            : '* Fields marked with (*) are required'}
                        </div>
                        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            disabled={uploadingFiles}
                            onClick={() => {
                              setSubmitTitle('');
                              setSubmitWeather('');
                              setSubmitCrewCount('');
                              setSubmitWorkDone('');
                              setSubmitNotes('');
                              setUploadedFiles([]);
                            }}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
                          >
                            {lang === 'ar' ? 'إعادة تعيين' : 'Reset Form'}
                          </button>
                          <button
                            type="submit"
                            disabled={uploadingFiles}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-l from-[#0284c7] to-[#22d3ee] hover:brightness-110 active:scale-[0.98] disabled:opacity-60 text-slate-950 text-xs font-bold shadow-[0_0_25px_rgba(14,165,233,0.4)] transition-all"
                          >
                            {uploadingFiles ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            ) : (
                              <Send className="w-4 h-4 text-slate-950" />
                            )}
                            {uploadingFiles
                              ? (lang === 'ar' ? 'جاري الإرسال…' : 'Submitting…')
                              : t('submitReportBtn')}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Pending Records Waiting for Approval (Visible in Project Data) */}
                  {pendingRecords.length > 0 && (
                    <div className="glow-card p-6 rounded-3xl border border-amber-500/35 bg-slate-900/85 space-y-4 shadow-[0_0_35px_rgba(245,158,11,0.1)]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex-shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-slate-100 text-sm md:text-base">
                                {lang === 'ar' ? 'تقارير وسجلات قيد الاعتماد والمراجعة' : 'Reports Awaiting Administrative Review'}
                              </h3>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                                {pendingRecords.length} {lang === 'ar' ? 'قيد الانتظار' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {lang === 'ar'
                                ? 'تقارير تم رفعها وتنتظر فحص تفاصيلها واعتمادها النهائي من الإدارة الهندسية'
                                : 'Submitted records awaiting detailed inspection and final approval'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {pendingRecords.map((r) => (
                          <div
                            key={r.id}
                            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3 relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    {r.category}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                    v{r.version}
                                  </span>
                                </div>
                                <h4 className="font-bold text-slate-100 text-sm mt-1.5 group-hover:text-amber-300 transition-colors">
                                  {r.title}
                                </h4>
                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                                  <Building2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                  <span>{r.projectName}</span>
                                  <span>&bull;</span>
                                  <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                  <span>{r.siteName}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {new Date(r.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-800/80">
                              <div className="flex items-center gap-2 truncate">
                                <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[9px] uppercase flex-shrink-0">
                                  {r.submitterName ? r.submitterName[0] : 'U'}
                                </div>
                                <div className="text-[11px] truncate">
                                  <span className="text-slate-400">{lang === 'ar' ? 'الرافع: ' : 'Uploaded by: '}</span>
                                  <span className="text-slate-100 font-bold">{r.submitterName || (lang === 'ar' ? 'غير محدد' : 'Unknown')}</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setInspectingRecord(r);
                                  setInspectingRecordId(r.id);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.25)] flex-shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                                {lang === 'ar' ? 'عرض الداتا والاعتماد' : 'Inspect & Approve'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dedicated Reports Archive Quick-Access Card */}
                  <div className="glow-card p-6 md:p-7 rounded-3xl border border-emerald-500/35 bg-gradient-to-br from-slate-900/95 via-slate-900/85 to-slate-950/90 shadow-[0_0_40px_rgba(16,185,129,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600/35 to-teal-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-[0_0_24px_rgba(16,185,129,0.35)] flex-shrink-0">
                        <ShieldCheck className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-100 text-base md:text-lg">
                            {lang === 'ar' ? 'الأرشيف المحصن للتقارير والبيانات الهندسية المعتمدة' : 'Immutable Archive of Approved Reports'}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                            {approvedRecords.length} {lang === 'ar' ? 'تقارير معتمدة ومحصنة' : 'Approved'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 max-w-xl">
                          {lang === 'ar'
                            ? 'تم تخصيص صفحة مستقلة كاملة للأرشيف المحصن؛ للبحث المتقدم وتصفية التقارير بالاسم والنوع والمشروع والموقع والمستخدم ونطاق التواريخ مع إمكانية التحميل والمعاينة.'
                            : 'Access the dedicated archive page for advanced multi-filters, date range search, and full report inspection.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('reports-archive')}
                      className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-xs shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex-shrink-0 relative z-10"
                    >
                      <FileCheck className="w-4 h-4 text-slate-950" />
                      {lang === 'ar' ? 'الانتقال لصفحة الأرشيف المحصن' : 'Open Reports Archive'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: IMMUTABLE REPORTS & DATA ARCHIVE (DEDICATED PAGE) */}
              {/* ======================================================== */}
              {activeTab === 'reports-archive' && (
                <div className="space-y-6">
                  {/* Enterprise Approved Records (Immutable Archive) with Advanced Search & Multi-Filters */}
                  <div className="glow-card p-6 md:p-8 rounded-3xl border border-emerald-500/30 bg-slate-900/85 space-y-6 shadow-[0_0_45px_rgba(16,185,129,0.08)]">
                    {/* Archive Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-400/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex-shrink-0">
                          <FileCheck className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-100 text-base md:text-lg tracking-wide">
                              {lang === 'ar'
                                ? 'الأرشيف المحصن للتقارير والبيانات الهندسية المعتمدة'
                                : 'Immutable Archive of Approved Reports & Data'}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                              {lang === 'ar' ? 'محصن وموثق (Immutable)' : 'Immutable Archive'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            {lang === 'ar'
                              ? 'بحث وتصفية بالاسم، النوع، المشروع، الموقع، المستخدم، والتواريخ مع إمكانية التحميل والمعاينة'
                              : 'Multi-filter search by title, category, project, site, user, and dates with direct downloads'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <span className="px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-700 text-xs font-semibold text-slate-300">
                          {lang === 'ar' ? 'إجمالي السجلات:' : 'Total Approved:'}{' '}
                          <span className="text-emerald-400 font-bold">{approvedRecords.length}</span>
                        </span>
                      </div>
                    </div>

                    {/* Advanced Multi-Filters Toolbar */}
                    <div className="p-4 md:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/90 space-y-3.5">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-4 h-4" />
                          {lang === 'ar' ? 'فلاتر البحث والوصول السريع:' : 'Search & Filter Controls:'}
                        </span>
                        {activeFilterCount > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                              {activeFilterCount} {lang === 'ar' ? 'فلاتر مفعلة' : 'active filters'}
                            </span>
                            <button
                              type="button"
                              onClick={resetApprovedFilters}
                              className="text-[11px] text-rose-400 hover:text-rose-200 underline"
                            >
                              {lang === 'ar' ? 'إعادة تعيين الكل' : 'Reset All'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Row 1: Search Query + Project + Site */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Search by Title / Keywords */}
                        <div className="relative">
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'بحث باسم التقرير أو المحتوى:' : 'Search by report title or notes:'}
                          </label>
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3 pointer-events-none" />
                            <input
                              type="text"
                              value={approvedSearchQuery}
                              onChange={(e) => setApprovedSearchQuery(e.target.value)}
                              placeholder={
                                lang === 'ar'
                                  ? 'اكتب اسم التقرير، المحتوى، أو كلمات مفتاحية...'
                                  : 'Search title, keyword, notes...'
                              }
                              className="w-full ps-9 pe-8 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all placeholder:text-slate-500"
                            />
                            {approvedSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setApprovedSearchQuery('')}
                                className="absolute end-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Filter by Project */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'بحث بالمشروع:' : 'Filter by Project:'}
                          </label>
                          <select
                            value={approvedProjectFilter}
                            onChange={(e) => {
                              setApprovedProjectFilter(e.target.value);
                              setApprovedSiteFilter('ALL');
                            }}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
                          >
                            <option value="ALL">{lang === 'ar' ? 'جميع المشاريع' : 'All Projects'}</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.code} - {p.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Filter by Site */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'بحث بالموقع:' : 'Filter by Site:'}
                          </label>
                          <select
                            value={approvedSiteFilter}
                            onChange={(e) => setApprovedSiteFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
                          >
                            <option value="ALL">{lang === 'ar' ? 'جميع المواقع' : 'All Sites'}</option>
                            {availableFilterSites.map((s: Site) => (
                              <option key={s.id} value={s.id}>
                                {s.code} - {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Row 2: Category + Submitter + Date Range (From - To) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Filter by Category / Type */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'بحث بنوع / تصنيف التقرير:' : 'Filter by Category / Type:'}
                          </label>
                          <select
                            value={approvedCategoryFilter}
                            onChange={(e) => setApprovedCategoryFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
                          >
                            <option value="ALL">{lang === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
                            <option value="DailyReport">{lang === 'ar' ? 'تقرير يومي (Daily Report)' : 'Daily Report'}</option>
                            <option value="SiteReport">{lang === 'ar' ? 'تقرير موقع (Site Report)' : 'Site Report'}</option>
                            <option value="InspectionReport">{lang === 'ar' ? 'تقرير معاينة فنية (Inspection Report)' : 'Inspection Report'}</option>
                            <option value="EquipmentData">{lang === 'ar' ? 'بيانات معدات (Equipment Data)' : 'Equipment Data'}</option>
                            <option value="MaterialData">{lang === 'ar' ? 'بيانات مواد وتوريدات (Material Data)' : 'Material Data'}</option>
                            <option value="Measurements">{lang === 'ar' ? 'قياسات وحصر كميات (Measurements)' : 'Measurements'}</option>
                          </select>
                        </div>

                        {/* Filter by Submitter / User */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'بحث بالمستخدم / من قام بالرفع:' : 'Filter by Submitter / User:'}
                          </label>
                          <select
                            value={approvedSubmitterFilter}
                            onChange={(e) => setApprovedSubmitterFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
                          >
                            <option value="ALL">{lang === 'ar' ? 'جميع المستخدمين' : 'All Users'}</option>
                            {uniqueSubmitters.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Date From (من تاريخ) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'من تاريخ:' : 'From Date:'}
                          </label>
                          <input
                            type="date"
                            value={approvedStartDate}
                            onChange={(e) => setApprovedStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
                          />
                        </div>

                        {/* Date To (إلى تاريخ) */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            {lang === 'ar' ? 'إلى تاريخ:' : 'To Date:'}
                          </label>
                          <input
                            type="date"
                            value={approvedEndDate}
                            onChange={(e) => setApprovedEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Results Counter */}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div>
                        {lang === 'ar' ? 'نتائج التصفية:' : 'Results:'}{' '}
                        <span className="font-bold text-emerald-400">{filteredApprovedRecords.length}</span>{' '}
                        {lang === 'ar' ? `تقرير من أصل ${approvedRecords.length}` : `of ${approvedRecords.length} reports`}
                      </div>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={resetApprovedFilters}
                          className="text-cyan-400 hover:text-cyan-200 font-semibold"
                        >
                          {lang === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                        </button>
                      )}
                    </div>

                    {/* Filtered Records List */}
                    {filteredApprovedRecords.length === 0 ? (
                      <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-3">
                        <FileCheck className="w-10 h-10 text-slate-500 mx-auto" />
                        <div className="text-sm font-bold text-slate-300">
                          {approvedRecords.length === 0
                            ? (lang === 'ar' ? 'لا توجد تقارير معتمدة حتى الآن' : 'No approved reports yet')
                            : (lang === 'ar' ? 'لا توجد نتائج تطابق فلاتر البحث الحالية' : 'No reports match current filters')}
                        </div>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          {approvedRecords.length === 0
                            ? (lang === 'ar'
                              ? 'عندما يتم اعتماد التقارير المرسلة ستظهر هنا موثقة ومحصنة للأبد مع إمكانية تحميلها في أي وقت'
                              : 'Approved reports will be permanently archived here for instant search and retrieval.')
                            : (lang === 'ar'
                              ? 'جرب تغيير معايير البحث، توسيع نطاق التواريخ، أو مسح الفلاتر.'
                              : 'Try adjusting search terms, expanding date range, or clearing filters.')}
                        </p>
                        {activeFilterCount > 0 && (
                          <button
                            type="button"
                            onClick={resetApprovedFilters}
                            className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all"
                          >
                            {lang === 'ar' ? 'إعادة ضبط كل الفلاتر' : 'Reset All Filters'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredApprovedRecords.map((r) => {
                          const hasAttachments = Boolean(r.attachments && r.attachments.length > 0);
                          const approvalDate = r.approvedAt ? new Date(r.approvedAt) : null;

                          return (
                            <div
                              key={r.id}
                              className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-md"
                            >
                              <div className="space-y-3">
                                {/* Badges Header */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300">
                                      {r.category}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                                      v{r.version}
                                    </span>
                                  </div>
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                    {lang === 'ar' ? 'معتمد ومحصن' : 'Approved & Immutable'}
                                  </span>
                                </div>

                                {/* Title */}
                                <h4 className="font-extrabold text-slate-100 text-sm md:text-base group-hover:text-emerald-300 transition-colors leading-snug">
                                  {r.title}
                                </h4>

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Building2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                                    <span className="text-slate-300 truncate">{r.projectName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="text-slate-300 truncate">{r.siteName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate col-span-full sm:col-span-1 bg-cyan-950/40 px-2 py-1 rounded-lg border border-cyan-500/25">
                                    <div className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-[9px] uppercase flex-shrink-0">
                                      {r.submitterName ? r.submitterName[0] : 'U'}
                                    </div>
                                    <span className="text-slate-400 text-[10px]">{lang === 'ar' ? 'الرافع:' : 'Uploaded by:'}</span>
                                    <span className="text-cyan-200 font-bold truncate">{r.submitterName || (lang === 'ar' ? 'غير محدد' : 'Unknown')}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate col-span-full sm:col-span-1 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/25">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span className="text-slate-400 text-[10px]">{lang === 'ar' ? 'الاعتماد:' : 'Approved:'}</span>
                                    <span className="text-emerald-200 font-bold truncate">
                                      {approvalDate ? approvalDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '—'}
                                    </span>
                                  </div>
                                </div>

                                {/* Description Excerpt */}
                                {r.description && (
                                  <p className="text-xs text-slate-400 line-clamp-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                                    {r.description}
                                  </p>
                                )}
                              </div>

                              {/* Card Actions: View Details & Download */}
                              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2.5">
                                <div className="text-[11px] text-slate-500">
                                  {hasAttachments ? (
                                    <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold">
                                      <FileText className="w-3.5 h-3.5" />
                                      {r.attachments?.length} {lang === 'ar' ? 'مرفقات متاحة' : 'attachments'}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">{lang === 'ar' ? 'بيانات موثقة' : 'Archived'}</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectingRecord(r);
                                      setInspectingRecordId(r.id);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-400/40 text-cyan-200 text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-cyan-300" />
                                    {lang === 'ar' ? 'عرض وقراءة التقرير' : 'View Full Report'}
                                  </button>
                                  {hasAttachments && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectingRecord(r);
                                        setInspectingRecordId(r.id);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                      title={lang === 'ar' ? 'تحميل الملفات والمرفقات' : 'Download Attachments'}
                                    >
                                      <Download className="w-3.5 h-3.5 text-emerald-300" />
                                      {lang === 'ar' ? 'تحميل' : 'Download'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: TASKS / MY TASKS */}
              {/* ======================================================== */}
              {(activeTab === 'tasks' || activeTab === 'my-tasks') && (
                <div className="space-y-4">
                  <div className="glow-card p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{t('tasksBoardTitle')}</h3>
                      <p className="text-xs text-slate-400">{t('tasksBoardSubtitle')}</p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setEditingTaskId(null);
                          setNewTaskTitle('');
                          setNewTaskDesc('');
                          setNewTaskAssigneeId('');
                          setNewTaskPriority('Medium');
                          setShowNewTaskModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t('createTask')}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(Array.isArray(tasks) ? tasks : []).map((task) => (
                      <div key={task.id} className="glow-card p-4 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700/45 text-cyan-300">
                            {task.taskNumber}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${task.priority === 'Critical' || task.priority === 'High'
                                ? 'bg-rose-500/15 text-rose-400'
                                : 'bg-slate-700/45 text-slate-300'
                              }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-100 text-sm">{task.title}</div>
                        <div className="text-xs text-slate-400">
                          Project: <span className="text-slate-300">{task.projectName || 'Active'}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-600/50 flex items-center justify-between">
                          <div className="text-[11px] text-slate-400">
                            Assigned: <span className="text-slate-100 font-medium">{task.assignedToName || 'Field Engineer'}</span>
                          </div>

                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="px-2 py-1 bg-slate-800/70 border border-slate-600/50 rounded-lg text-xs text-slate-200"
                          >
                            <option value="ToDo">{translateStatusLabel('ToDo')}</option>
                            <option value="InProgress">{translateStatusLabel('InProgress')}</option>
                            <option value="Review">{translateStatusLabel('Review')}</option>
                            <option value="Completed">{translateStatusLabel('Completed')}</option>
                          </select>
                        </div>

                        {isAdmin && (
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditTask(task)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 text-[11px] font-semibold"
                            >
                              <Pencil className="w-3 h-3" />
                              {lang === 'ar' ? 'تعديل' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={() => promptDeleteTask(task)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[11px] font-semibold"
                            >
                              <Trash2 className="w-3 h-3" />
                              {lang === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: CHAT (Prompt 13 & 20) */}
              {/* ======================================================== */}
              {/* VIEW: CHAT & WHATSAPP MESSAGE STATUSES */}
              {activeTab === 'chat' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 flex-1 min-h-0 h-full max-h-[calc(100dvh-10.5rem)] rounded-2xl border-2 border-cyan-400/25 overflow-hidden shadow-xl bg-[#0f1c30]">
                  {/* Conversations list (by name) — scrollable */}
                  <div className={`md:col-span-1 border-e-2 border-slate-500/40 flex-col min-h-0 h-full overflow-hidden bg-[#132238] ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
                    <div className="flex-shrink-0 p-3.5 border-b-2 border-cyan-400/20 space-y-3 bg-[#15294a]">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                            <MessageCircle className="w-4 h-4 text-cyan-300" />
                            <span>{t('conversations')}</span>
                          </h3>
                          <span className="text-[10px] text-slate-200 font-medium">
                            {conversations.length}{' '}
                            {lang === 'ar' ? 'محادثة محفوظة' : 'saved chats'}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowNewChatModal(true)}
                          className="px-2.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-md"
                          title={t('startChat')}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'جديد' : 'New'}</span>
                        </button>
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-300 absolute start-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={chatListSearch}
                          onChange={(e) => setChatListSearch(e.target.value)}
                          placeholder={t('searchChannels')}
                          className="w-full ps-8 pe-3 py-2 rounded-xl bg-[#1e334f] border-2 border-cyan-400/25 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1.5">
                      {filteredConversations.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-200 space-y-3">
                          <MessageSquare className="w-9 h-9 text-slate-300 mx-auto opacity-70" />
                          <p className="font-medium">{t('noConversationsFound')}</p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {lang === 'ar'
                              ? 'ابدأ محادثة جديدة مع زميل، وهتتحفظ باسمه هنا عشان ترجع لها في أي وقت.'
                              : 'Start a chat with a colleague — it will be saved here by name.'}
                          </p>
                          <button
                            onClick={() => setShowNewChatModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t('startChat')}
                          </button>
                        </div>
                      ) : (
                        filteredConversations.map((c) => {
                          const displayName = getConversationDisplayName(c);
                          const isSelected = activeConversation?.id === c.id;
                          const other = getOtherMember(c);
                          const presence = getMemberPresence(other);
                          const ticks = getLastMessageTicks(c);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => openConversation(c)}
                              className={`w-full text-start p-3 rounded-xl transition-all flex items-center gap-3 border-2 ${isSelected
                                  ? 'bg-cyan-700/90 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                                  : 'bg-[#1a2f4a] border-cyan-400/25 text-slate-100 hover:bg-[#243b58] hover:border-cyan-400/45'
                                }`}
                            >
                              <div className="relative flex-shrink-0">
                                <div
                                  className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm ${isSelected
                                      ? 'bg-white/20 text-white border border-white/30'
                                      : 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-200'
                                    }`}
                                >
                                  {displayName[0]}
                                </div>
                                <span
                                  className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 ${isSelected ? 'border-cyan-700' : 'border-[#1a2f4a]'
                                    } ${presence.isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}
                                  title={formatLastSeen(presence.lastSeenAt, presence.isOnline)}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-50'
                                      }`}
                                  >
                                    {displayName}
                                  </span>
                                  {c.unreadCount > 0 && (
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${isSelected
                                          ? 'bg-white text-cyan-800'
                                          : 'bg-cyan-500 text-white'
                                        }`}
                                    >
                                      {c.unreadCount}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-xs truncate mt-0.5 flex items-center gap-1.5 ${isSelected ? 'text-cyan-50' : 'text-slate-200'
                                    }`}
                                >
                                  {ticks && (
                                    <span className="inline-flex flex-shrink-0" title={
                                      ticks === 'read' ? t('chatStatusRead')
                                        : ticks === 'delivered' ? t('chatStatusDelivered')
                                          : ticks === 'sending' ? t('chatStatusSending')
                                            : ticks === 'failed' ? t('chatStatusFailed')
                                              : t('chatStatusSent')
                                    }>
                                      {ticks === 'sending' ? (
                                        <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`} />
                                      ) : ticks === 'failed' ? (
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                                      ) : ticks === 'read' ? (
                                        <CheckCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-sky-200' : 'text-cyan-300'}`} />
                                      ) : ticks === 'delivered' ? (
                                        <CheckCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white/80' : 'text-slate-300'}`} />
                                      ) : (
                                        <Check className={`w-3.5 h-3.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`} />
                                      )}
                                    </span>
                                  )}
                                  <span className="truncate">
                                    {c.lastMessage?.content ||
                                      (lang === 'ar' ? 'لا رسائل بعد' : 'No messages yet')}
                                  </span>
                                </div>
                                <div
                                  className={`text-[11px] mt-0.5 font-medium ${isSelected
                                      ? presence.isOnline
                                        ? 'text-emerald-200'
                                        : 'text-cyan-100/80'
                                      : presence.isOnline
                                        ? 'text-emerald-400'
                                        : 'text-slate-400'
                                    }`}
                                >
                                  {presence.isOnline
                                    ? t('online')
                                    : `${t('lastSeen')}: ${formatLastSeen(presence.lastSeenAt, false)}`}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Message stream — scroll messages, pin composer */}
                  <div className={`md:col-span-2 flex-col min-h-0 h-full overflow-hidden bg-[#15253c] ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
                    {activeConversation ? (
                      <>
                        <div className="flex-shrink-0 p-3.5 border-b-2 border-cyan-400/20 flex items-center justify-between bg-[#15294a]">
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => setActiveConversation(null)}
                              className="md:hidden p-2 -ms-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border border-cyan-400/30 flex items-center justify-center flex-shrink-0"
                              title={lang === 'ar' ? 'رجوع للمحادثات' : 'Back to chats'}
                              aria-label={lang === 'ar' ? 'رجوع للمحادثات' : 'Back to chats'}
                            >
                              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                            </button>
                            <div className="relative flex-shrink-0">
                              <div className="w-11 h-11 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                                {getConversationDisplayName(activeConversation)[0]}
                              </div>
                              {(() => {
                                const p = getMemberPresence(getOtherMember(activeConversation));
                                return (
                                  <span
                                    className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-[#15294a] ${p.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                                      }`}
                                  />
                                );
                              })()}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-50 text-base">
                                {getConversationDisplayName(activeConversation)}
                              </h4>
                              <div className="text-xs text-slate-200 flex items-center gap-1.5 mt-0.5 font-medium">
                                {(() => {
                                  const p = getMemberPresence(getOtherMember(activeConversation));
                                  return (
                                    <>
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${p.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                          }`}
                                      />
                                      <span className={p.isOnline ? 'text-emerald-400' : 'text-slate-300'}>
                                        {p.isOnline
                                          ? t('online')
                                          : `${t('lastSeen')}: ${formatLastSeen(p.lastSeenAt, false)}`}
                                      </span>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowNewChatModal(true)}
                            className="px-2.5 py-1.5 rounded-xl bg-[#1e334f] hover:bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 text-xs font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {lang === 'ar' ? 'شخص جديد' : 'New person'}
                          </button>
                        </div>

                        <div
                          ref={chatMessagesContainerRef}
                          className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 bg-[#112033]"
                        >
                          {chatMessages.length === 0 && (
                            <div className="h-full min-h-[120px] flex items-center justify-center text-xs text-slate-300">
                              {lang === 'ar'
                                ? 'ابدأ الكتابة في الحقل بالأسفل…'
                                : 'Start typing in the box below…'}
                            </div>
                          )}
                          {chatMessages.map((m) => {
                            const isMe = m.senderUserId === currentUser.id;
                            const isRead =
                              (m.readStates && m.readStates.some((rs) => rs.userId !== currentUser.id)) ||
                              m.deliveryStatus === 'read';
                            const isDelivered =
                              isRead ||
                              m.isDelivered ||
                              deliveredMessageIds.has(m.id) ||
                              m.deliveryStatus === 'delivered';

                            return (
                              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="text-[10px] text-slate-200 mb-0.5 px-1 font-medium">
                                  {m.senderName}
                                </div>
                                <div
                                  className={`p-3 rounded-2xl max-w-sm sm:max-w-md text-xs space-y-1.5 shadow-md ${isMe
                                      ? 'bg-cyan-500 text-white rounded-br-sm'
                                      : 'bg-[#243b58] border-2 border-cyan-400/20 text-slate-100 rounded-bl-sm'
                                    }`}
                                >
                                  <p className="leading-relaxed break-words">{m.content}</p>
                                  {m.isEdited && (
                                    <span className="text-[9px] opacity-70 italic block">(edited)</span>
                                  )}
                                  <div
                                    className={`flex items-center gap-1 text-[10px] ${isMe ? 'justify-end text-cyan-50' : 'justify-end text-slate-500'
                                      }`}
                                  >
                                    <span>
                                      {new Date(m.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    {isMe && (
                                      <span className="inline-flex items-center ms-0.5">
                                        {m.deliveryStatus === 'sending' ? (
                                          <Clock className="w-3 h-3 text-cyan-100 animate-spin" />
                                        ) : m.deliveryStatus === 'failed' ? (
                                          <AlertCircle
                                            className="w-3.5 h-3.5 text-rose-200 cursor-pointer"
                                            onClick={() =>
                                              handleSendMessage({ preventDefault: () => { } } as any)
                                            }
                                          />
                                        ) : isRead ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-cyan-100" />
                                        ) : isDelivered ? (
                                          <CheckCheck className="w-3.5 h-3.5 text-cyan-100/80" />
                                        ) : (
                                          <Check className="w-3.5 h-3.5 text-cyan-100/70" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-1 px-1">
                                  <button
                                    onClick={() => handleToggleReaction(m.id, 'thumbs_up')}
                                    className="text-[10px] text-slate-300 hover:text-amber-700 flex items-center gap-1"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    {m.reactions && m.reactions.length > 0 && (
                                      <span>{m.reactions.length}</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={chatMessagesEndRef} className="h-px w-full" />
                        </div>

                        <form
                          onSubmit={handleSendMessage}
                          className="flex-shrink-0 p-3 border-t-2 border-slate-500/40 flex items-center gap-2 bg-[#15294a] sticky bottom-0 z-10"
                        >
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder={t('typeMessagePlaceholder')}
                            className="flex-1 px-4 py-3 bg-[#1a2d45] border-2 border-cyan-400/35 rounded-xl text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/25 shadow-inner"
                          />
                          <button
                            type="submit"
                            className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white transition-colors shadow-md flex-shrink-0"
                            title={t('send')}
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-[#112033]">
                        <MessageSquare className="w-14 h-14 text-slate-500 opacity-60" />
                        <div className="space-y-1.5 max-w-sm">
                          <p className="text-sm font-bold text-slate-100">
                            {lang === 'ar' ? 'اختر محادثة من القائمة' : 'Pick a conversation'}
                          </p>
                          <p className="text-xs text-slate-200 leading-relaxed">
                            {lang === 'ar'
                              ? 'المحادثات السابقة تظهر بالاسم على الجانب. أو ابدأ محادثة جديدة مع شخص آخر.'
                              : 'Saved chats appear by name on the side — or start a new one.'}
                          </p>
                        </div>
                        <button
                          onClick={() => setShowNewChatModal(true)}
                          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          {t('startChat')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: USER MANAGEMENT (Admin Only) */}
              {/* ======================================================== */}
              {activeTab === 'engineers' || activeTab === 'users' ? (
                isAdmin ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-display font-bold text-slate-100">{t('usersDirectory')}</h3>
                        <p className="text-xs text-slate-400">{t('usersSubtitle')}</p>
                      </div>

                      <button
                        onClick={() => {
                          setEditingUserId(null);
                          setNewFirstName('');
                          setNewLastName('');
                          setNewUserEmail('');
                          setNewUserPassword('');
                          setNewUserJobTitle('');
                          setNewUserRole('Engineer');
                          setEditingUserActive(true);
                          setShowNewUserModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t('provisionUser')}
                      </button>
                    </div>

                    <div className="glow-card rounded-2xl overflow-x-auto">
                      <table className="w-full text-start text-xs text-slate-300 min-w-[650px]">
                        <thead className="bg-slate-800/55 border-b border-slate-600/50 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="p-3 text-start">{t('userColName')}</th>
                            <th className="p-3 text-start">{t('userColJobTitle')}</th>
                            <th className="p-3 text-start">{t('userColEmail')}</th>
                            <th className="p-3 text-start">{t('userColRole')}</th>
                            <th className="p-3 text-start">{t('userColStatus')}</th>
                            <th className="p-3 text-end">{t('userColActions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/60">
                          {userList.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-800/75 transition-colors">
                              <td className="p-3 font-semibold text-slate-100">
                                {u.firstName} {u.lastName}
                              </td>
                              <td className="p-3 text-cyan-400 font-medium">
                                {u.jobTitle || '—'}
                              </td>
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{u.email}</td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700/45 text-cyan-300">
                                  {u.roles?.join(', ') || 'Engineer'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded ${u.isActive ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'}`}>
                                  {u.isActive ? t('statusActive') : t('statusDisabled')}
                                </span>
                              </td>
                              <td className="p-3 text-end space-x-2 rtl:space-x-reverse">
                                <button
                                  onClick={() => openEditUser(u)}
                                  className="text-[11px] text-cyan-300 hover:underline font-semibold"
                                >
                                  {lang === 'ar' ? 'تعديل' : 'Edit'}
                                </button>
                                <button
                                  onClick={async () => {
                                    const newPass = prompt(lang === 'ar' ? 'أدخل كلمة المرور الجديدة للمستخدم:' : 'Enter new password for user:');
                                    if (newPass) {
                                      await dashboardService.resetPassword(u.id, newPass);
                                      alert(lang === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح.' : 'Password successfully reset.');
                                    }
                                  }}
                                  className="text-[11px] text-amber-400 hover:underline"
                                >
                                  {t('actionResetPass')}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(lang === 'ar' ? `هل أنت متأكد من تعطيل/حذف حساب ${u.email}؟` : `Deactivate/delete ${u.email}?`)) {
                                      await dashboardService.deleteUser(u.id);
                                      const updated = await dashboardService.getUsers();
                                      setUserList(updated);
                                    }
                                  }}
                                  className="text-[11px] text-rose-400 hover:underline"
                                >
                                  {lang === 'ar' ? 'حذف' : 'Delete'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null
              ) : null}

              {/* ======================================================== */}
              {/* VIEW: AUDIT LOGS (Admin Only) */}
              {/* ======================================================== */}
              {activeTab === 'audit' && isAdmin && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{t('auditTitle')}</h3>
                      <p className="text-xs text-slate-400">{t('auditSubtitle')}</p>
                    </div>

                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        dashboardService.getAuditLogs(1, 20, e.target.value).then((res) => setAuditLogs(res.items));
                      }}
                      placeholder={t('auditSearchPlaceholder')}
                      className="px-3 py-1.5 bg-slate-800/70 border border-slate-600/50 rounded-xl text-xs text-slate-100"
                    />
                  </div>

                  <div className="glow-card rounded-2xl overflow-x-auto table-responsive-container">
                    <table className="w-full text-start text-xs text-slate-300 min-w-[550px]">
                      <thead className="bg-slate-800/55 border-b border-slate-600/50 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">{t('auditColTime')}</th>
                          <th className="p-3">{t('auditColAction')}</th>
                          <th className="p-3">{t('auditColEntity')}</th>
                          <th className="p-3">{t('auditColUser')}</th>
                          <th className="p-3">{t('auditColIp')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/60">
                        {auditLogs.map((log) => {
                          const actionUpper = (log.action || '').toUpperCase();
                          const isCreate = actionUpper.includes('CREATE') || actionUpper.includes('UPLOAD') || actionUpper.includes('POST');
                          const isDelete = actionUpper.includes('DELETE') || actionUpper.includes('REJECT');
                          const isReview = actionUpper.includes('APPROV') || actionUpper.includes('UPDATE');

                          return (
                            <tr key={log.id} className="hover:bg-slate-800/75 transition-colors">
                              <td className="p-3 text-[11px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</td>
                              <td className="p-3">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isCreate
                                    ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                                    : isDelete
                                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                                    : isReview
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-200'
                                }`}>
                                  {log.action}
                                </span>
                              </td>
                              <td className="p-3 text-slate-300">
                                <span className="font-semibold text-slate-200">{log.entityType}</span>{' '}
                                <span className="text-[10px] font-mono text-slate-500">({log.entityId?.substring(0, 8)}...)</span>
                              </td>
                              <td className="p-3">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/25">
                                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px] uppercase">
                                    {(log.userEmail || 'S')[0]}
                                  </div>
                                  <span className="font-semibold text-slate-100 text-xs">
                                    {log.userEmail || (lang === 'ar' ? 'النظام التلقائي' : 'System')}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-[11px] text-slate-500 font-mono">{log.ipAddress || '127.0.0.1'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: REPORTS & ANALYTICS HUB (Catalog & Exports) */}
              {/* ======================================================== */}
              {activeTab === 'reports' && (
                <ReportsAnalyticsHub
                  currentUser={currentUser}
                  projects={projects}
                  sites={allSites}
                  tasks={tasks}
                  approvedRecords={approvedRecords}
                  pendingRecords={pendingRecords}
                  adminStats={adminStats}
                  lang={lang}
                  onNavigateTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {/* ======================================================== */}
              {/* VIEW: SETTINGS & SAFE RUNTIME TELEMETRY */}
              {/* ======================================================== */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{t('settingsTitle')}</h3>
                    <p className="text-xs text-slate-400">{t('settingsSubtitle')}</p>
                  </div>

                  {safeConfig && (
                    <div className="glow-card p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-600/50">
                        <span className="text-xs text-slate-400">{t('appNameField')}</span>
                        <span className="text-xs font-semibold text-slate-100">{safeConfig.appName}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-600/50">
                        <span className="text-xs text-slate-400">{t('environmentField')}</span>
                        <span className="text-xs font-semibold text-emerald-400">{safeConfig.environment}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-600/50">
                        <span className="text-xs text-slate-400">{t('signalRPathField')}</span>
                        <span className="text-xs font-mono text-cyan-300">{safeConfig.signalR?.hubPath}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-600/50">
                        <span className="text-xs text-slate-400">{t('signalREnabledField')}</span>
                        <span className="text-xs font-semibold text-emerald-400">
                          {safeConfig.signalR?.enabled ? 'True' : 'False'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-600/50">
                        <span className="text-xs text-slate-400">{t('signalRUrlField')}</span>
                        <span className="text-xs font-mono text-emerald-400">
                          {safeConfig.signalR?.hubUrl || 'https://mtiapi.runasp.net/hubs/project'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-600/50 text-[11px] text-slate-400 space-y-1">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          {t('securityHardened')}
                        </div>
                        <p>
                          {t('securityDetails')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: REAL-TIME NOTIFICATIONS CENTER */}
              {/* ======================================================== */}
              {activeTab === 'notifications' && (
                <div className="max-w-3xl mx-auto space-y-4 animate-fade-up">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-display font-bold text-slate-100 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-cyan-300" />
                        {t('realtimeNotifications')}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {t('liveSignalRHint')}
                      </p>
                    </div>

                    {notificationsList.some((n) => !n.isRead) && (
                      <button
                        onClick={async () => {
                          await notificationService.markAllAsRead();
                          setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800/45 hover:bg-slate-700/45 border border-slate-600/50 text-xs text-slate-200 transition-colors"
                      >
                        {t('markAllAsRead')}
                      </button>
                    )}
                  </div>

                  <div className="glass-panel rounded-2xl border border-slate-600/50 overflow-hidden divide-y divide-slate-700/60">
                    {notificationsList.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                        {t('noNotificationsYet')}
                      </div>
                    ) : (
                      notificationsList.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={async () => {
                            if (!notif.isRead) {
                              await notificationService.markAsRead(notif.id);
                              setNotificationsList((prev) =>
                                prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
                              );
                            }
                          }}
                          className={`p-4 transition-colors flex items-start gap-3.5 cursor-pointer ${notif.isRead ? 'bg-transparent hover:bg-slate-700/35' : 'bg-cyan-500/10 hover:bg-cyan-500/15'
                            }`}
                        >
                          <div
                            className={`p-2 rounded-xl border flex-shrink-0 ${notif.isRead
                                ? 'bg-slate-700/45 border-slate-500/40 text-slate-400'
                                : 'bg-mti-100 border-cyan-400/25 text-cyan-300 shadow-md shadow-mti-500/10'
                              }`}
                          >
                            <Radio className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs font-semibold ${notif.isRead ? 'text-slate-300' : 'text-slate-100'}`}>
                                {notif.title}
                              </h4>
                              <span className="text-[10px] text-slate-500 flex-shrink-0">
                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {notif.body}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-700/45/80 text-slate-400 border border-slate-500/40 uppercase tracking-wider font-semibold">
                                {notif.type}
                              </span>
                              {!notif.isRead && (
                                <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: TECHNICAL OFFICE & COMMERCIAL */}
              {/* ======================================================== */}
              {activeTab === 'technical-office' && (
                <div className="space-y-6 animate-fade-up">
                  {/* Header & Project Selector */}
                  <div className="glow-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-cyan-300" />
                        <h3 className="text-base font-bold text-slate-100">{t('navTechnicalOffice')}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {lang === 'ar'
                          ? 'إدارة جداول الكميات (BOQ)، المواصفات الفنية، العروض التجارية، والفواتير الهندسية'
                          : 'Bill of quantities, technical specifications, commercial proposals, and engineering invoices'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                          {lang === 'ar' ? 'المشروع:' : 'Project:'}
                        </span>
                        <select
                          value={selectedProjectId || ''}
                          onChange={(e) => selectProject(e.target.value)}
                          className="px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} - {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          if (techOfficeSubtab === 'boq') setShowBoqModal(true);
                          else if (techOfficeSubtab === 'techOffers') setShowTechOfferModal(true);
                          else if (techOfficeSubtab === 'commOffers') setShowCommOfferModal(true);
                          else setShowInvoiceModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {techOfficeSubtab === 'boq' && (lang === 'ar' ? 'إضافة بند مقايسة' : 'Add BOQ Item')}
                        {techOfficeSubtab === 'techOffers' && (lang === 'ar' ? 'عرض فني جديد' : 'New Technical Offer')}
                        {techOfficeSubtab === 'commOffers' && (lang === 'ar' ? 'عرض مالي جديد' : 'New Commercial Offer')}
                        {techOfficeSubtab === 'invoices' && (lang === 'ar' ? 'إصدار فاتورة' : 'Issue Invoice')}
                      </button>
                    </div>
                  </div>

                  {/* Technical Office dashboard counts from /api/dashboard/technical-office */}
                  {techOfficeDashboard && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <button
                        type="button"
                        onClick={() => setTechOfficeSubtab('boq')}
                        className="glow-card glow-card-hover p-4 rounded-2xl text-start w-full cursor-pointer"
                      >
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'بنود BOQ' : 'Pending BOQs'}</div>
                        <div className="font-display text-2xl font-bold text-slate-100">{techOfficeDashboard.pendingBoqsCount}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTechOfficeSubtab('techOffers')}
                        className="glow-card glow-card-hover p-4 rounded-2xl text-start w-full cursor-pointer"
                      >
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'عروض فنية' : 'Technical Offers'}</div>
                        <div className="font-display text-2xl font-bold text-cyan-300">{techOfficeDashboard.technicalOffersCount}</div>
                      </button>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'طلبات تسعير' : 'Quotation Requests'}</div>
                        <div className="font-display text-2xl font-bold text-slate-100">{techOfficeDashboard.quotationRequestsCount}</div>
                      </div>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'مستندات قيد المراجعة' : 'Pending Reviews'}</div>
                        <div className="font-display text-2xl font-bold text-amber-400">{techOfficeDashboard.pendingReviewsCount}</div>
                      </div>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'عروض تنتهي قريباً' : 'Expiring Quotations'}</div>
                        <div className="font-display text-2xl font-bold text-rose-400">{techOfficeDashboard.expiringQuotationsCount}</div>
                      </div>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'مذكرات تسليم' : 'Submittals'}</div>
                        <div className="font-display text-2xl font-bold text-slate-100">{techOfficeDashboard.submittalsCount}</div>
                      </div>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'رسومات' : 'Drawings'}</div>
                        <div className="font-display text-2xl font-bold text-slate-100">{techOfficeDashboard.drawingsCount}</div>
                      </div>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'بيانات فنية' : 'Datasheets'}</div>
                        <div className="font-display text-2xl font-bold text-slate-100">{techOfficeDashboard.datasheetsCount}</div>
                      </div>
                      <div className="glow-card p-4 rounded-2xl">
                        <div className="text-slate-400 text-xs mb-2">{lang === 'ar' ? 'متطلبات العميل' : 'Client Requirements'}</div>
                        <div className="font-display text-2xl font-bold text-slate-100">{techOfficeDashboard.clientRequirementsCount}</div>
                      </div>
                    </div>
                  )}

                  {/* Subtabs Bar */}
                  <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setTechOfficeSubtab('boq')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${techOfficeSubtab === 'boq'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'جدول الكميات (BOQ)' : 'Bill of Quantities (BOQ)'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {boqItems.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setTechOfficeSubtab('techOffers')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${techOfficeSubtab === 'techOffers'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'العروض الفنية' : 'Technical Offers'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {techOffers.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setTechOfficeSubtab('commOffers')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${techOfficeSubtab === 'commOffers'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'العروض التجارية والمالية' : 'Commercial Proposals'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {commOffers.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setTechOfficeSubtab('invoices')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${techOfficeSubtab === 'invoices'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'الفواتير والمستخلصات' : 'Project Invoices'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {invoices.length}
                      </span>
                    </button>
                  </div>

                  {/* Subtab Content: BOQ */}
                  {techOfficeSubtab === 'boq' && (
                    <div className="space-y-4">
                      {/* Metric cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="glow-card p-4 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي بنود المقايسة' : 'Total BOQ Items'}</span>
                          <div className="text-xl font-bold text-slate-100 mt-1">{boqItems.length}</div>
                        </div>
                        <div className="glow-card p-4 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي التكلفة التقديرية' : 'Total Estimated Cost'}</span>
                          <div className="text-xl font-bold text-cyan-300 mt-1">
                            {boqItems.reduce((acc, b) => acc + (b.estimatedCost || (b.quantity * b.unitPrice)), 0).toLocaleString()} EGP
                          </div>
                        </div>
                        <div className="glow-card p-4 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي سعر المقايسة' : 'Total Quoted Value'}</span>
                          <div className="text-xl font-bold text-emerald-400 mt-1">
                            {boqItems.reduce((acc, b) => acc + (b.totalPrice || (b.quantity * b.unitPrice)), 0).toLocaleString()} EGP
                          </div>
                        </div>
                      </div>

                      {/* BOQ Items Table */}
                      <div className="glow-card rounded-2xl overflow-hidden border border-slate-700/60">
                        {boqItems.length === 0 ? (
                          <div className="p-12 text-center text-xs text-slate-400">
                            <Layers className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                            {lang === 'ar' ? 'لا توجد بنود مقايسة مسجلة لهذا المشروع حتى الآن.' : 'No BOQ items recorded for this project yet.'}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-start text-xs text-slate-200">
                              <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/60 text-[11px] uppercase tracking-wider font-semibold">
                                <tr>
                                  <th className="p-3 text-start">#</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'كود البند' : 'Item Code'}</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'الوحدة' : 'Unit'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                                  <th className="p-3 text-end">{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                                  <th className="p-3 text-end">{lang === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {boqItems.map((item, idx) => (
                                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 text-slate-500">{idx + 1}</td>
                                    <td className="p-3 font-semibold text-cyan-300">{item.itemCode}</td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-300 border border-slate-600/40">
                                        {item.category}
                                      </span>
                                    </td>
                                    <td className="p-3 max-w-xs truncate" title={item.description}>{item.description}</td>
                                    <td className="p-3 text-center text-slate-400">{item.unit}</td>
                                    <td className="p-3 text-center font-medium">{item.quantity}</td>
                                    <td className="p-3 text-end text-slate-300">{item.unitPrice?.toLocaleString()}</td>
                                    <td className="p-3 text-end font-bold text-emerald-400">
                                      {(item.totalPrice || item.quantity * item.unitPrice)?.toLocaleString()} EGP
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subtab Content: Technical Offers */}
                  {techOfficeSubtab === 'techOffers' && (
                    <div className="space-y-4">
                      {techOffers.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد عروض فنية مسجلة لهذا المشروع بعد.' : 'No technical offers registered for this project yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {techOffers.map((offer) => (
                            <div key={offer.id} className="glow-card p-5 rounded-2xl space-y-3 border border-slate-700/60">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                      v{offer.version}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                                      {translateStatusLabel(offer.status)}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-slate-100 text-sm mt-1.5">{offer.title}</h4>
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {formatDateCairo(offer.createdAt)}
                                </span>
                              </div>

                              <div className="text-xs text-slate-300 space-y-1.5 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40">
                                <div>
                                  <span className="text-slate-400 font-medium">{lang === 'ar' ? 'نطاق العمل: ' : 'Scope of Work: '}</span>
                                  {offer.scopeOfWork}
                                </div>
                                {offer.deliverables && (
                                  <div>
                                    <span className="text-slate-400 font-medium">{lang === 'ar' ? 'المخرجات: ' : 'Deliverables: '}</span>
                                    {offer.deliverables}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Commercial Offers */}
                  {techOfficeSubtab === 'commOffers' && (
                    <div className="space-y-4">
                      {commOffers.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <DollarSign className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد عروض تجارية مسجلة لهذا المشروع بعد.' : 'No commercial proposals registered yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {commOffers.map((offer) => (
                            <div key={offer.id} className="glow-card p-5 rounded-2xl space-y-3 border border-slate-700/60">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                    {offer.currency || 'EGP'}
                                  </span>
                                  <h4 className="font-bold text-slate-100 text-sm mt-1">{offer.title}</h4>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                                  {translateStatusLabel(offer.status)}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 text-center">
                                <div>
                                  <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'القيمة' : 'Amount'}</div>
                                  <div className="text-xs font-semibold text-slate-200 mt-0.5">{offer.totalAmount?.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'الخصم/الضريبة' : 'Tax/Disc'}</div>
                                  <div className="text-xs font-medium text-slate-300 mt-0.5">+{offer.tax}% / -{offer.discount}%</div>
                                </div>
                                <div>
                                  <div className="text-[10px] text-slate-400">{lang === 'ar' ? 'الصافي' : 'Final Total'}</div>
                                  <div className="text-xs font-bold text-emerald-400 mt-0.5">{offer.finalAmount?.toLocaleString()}</div>
                                </div>
                              </div>

                              {offer.paymentTerms && (
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  <span className="font-medium text-slate-300">{lang === 'ar' ? 'شروط الدفع: ' : 'Terms: '}</span>
                                  {offer.paymentTerms}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Invoices */}
                  {techOfficeSubtab === 'invoices' && (
                    <div className="space-y-4">
                      {invoices.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد فواتير أو مستخلصات مسجلة لهذا المشروع بعد.' : 'No invoices issued for this project yet.'}
                        </div>
                      ) : (
                        <div className="glow-card rounded-2xl overflow-hidden border border-slate-700/60">
                          <div className="overflow-x-auto">
                            <table className="w-full text-start text-xs text-slate-200">
                              <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/60 text-[11px] uppercase tracking-wider font-semibold">
                                <tr>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'المرحلة / المستخلص' : 'Milestone'}</th>
                                  <th className="p-3 text-end">{lang === 'ar' ? 'القيمة' : 'Amount'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'تاريخ الإصدار' : 'Issue Date'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {invoices.map((inv) => (
                                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 font-semibold text-cyan-300">{inv.invoiceNumber}</td>
                                    <td className="p-3">{inv.milestoneDescription}</td>
                                    <td className="p-3 text-end font-bold text-emerald-400">
                                      {inv.amount?.toLocaleString()} {inv.currency || 'EGP'}
                                    </td>
                                    <td className="p-3 text-center text-slate-400">{formatDateCairo(inv.issuedDate)}</td>
                                    <td className="p-3 text-center text-slate-400">{inv.dueDate ? formatDateCairo(inv.dueDate) : '-'}</td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.status === 'Paid'
                                          ? 'bg-emerald-500/20 text-emerald-300'
                                          : inv.status === 'Overdue'
                                            ? 'bg-rose-500/20 text-rose-300'
                                            : 'bg-amber-500/20 text-amber-300'
                                        }`}>
                                        {translateStatusLabel(inv.status)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: MATERIALS & ASSETS */}
              {/* ======================================================== */}
              {activeTab === 'materials-assets' && (
                <div className="space-y-6 animate-fade-up">
                  {/* Header */}
                  <div className="glow-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-cyan-300" />
                        <h3 className="text-base font-bold text-slate-100">{t('navMaterialsAssets')}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {lang === 'ar'
                          ? 'إدارة مخزون المواد والتجهيزات، طلبات المواد للمواقع، وتتبع عهد وأصول الشركة'
                          : 'Warehouse materials catalog, site logistics requests, and high-value company asset tracking'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          if (materialsSubtab === 'catalog') setShowMaterialModal(true);
                          else if (materialsSubtab === 'requests') setShowMatRequestModal(true);
                          else setShowAssetModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {materialsSubtab === 'catalog' && (lang === 'ar' ? 'إضافة مادة جديدة' : 'Add Material')}
                        {materialsSubtab === 'requests' && (lang === 'ar' ? 'طلب مواد للموقع' : 'Request Materials')}
                        {materialsSubtab === 'assets' && (lang === 'ar' ? 'تسجيل أصل / عهدة' : 'Register Asset')}
                      </button>
                    </div>
                  </div>

                  {/* Subtabs Bar */}
                  <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setMaterialsSubtab('catalog')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${materialsSubtab === 'catalog'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'كتالوج المواد والمخزون' : 'Materials Catalog & Stock'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {materials.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setMaterialsSubtab('requests')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${materialsSubtab === 'requests'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'طلبات توريد الموقع' : 'Site Material Requests'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {materialRequests.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setMaterialsSubtab('assets')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${materialsSubtab === 'assets'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'أصول ومعدات الشركة' : 'Company Assets & Tools'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {companyAssets.length}
                      </span>
                    </button>
                  </div>

                  {/* Subtab Content: Catalog */}
                  {materialsSubtab === 'catalog' && (
                    <div className="space-y-4">
                      {/* Metric cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="glow-card p-4 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'إجمالي الأصناف' : 'Total Items'}</span>
                          <div className="text-xl font-bold text-slate-100 mt-1">{materials.length}</div>
                        </div>
                        <div className="glow-card p-4 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts'}</span>
                          <div className="text-xl font-bold text-rose-400 mt-1">
                            {materials.filter((m) => m.inStockQuantity <= m.minimumThreshold).length}
                          </div>
                        </div>
                        <div className="glow-card p-4 rounded-xl border border-slate-700/60">
                          <span className="text-xs text-slate-400 font-medium">{lang === 'ar' ? 'الأصناف المتوفرة بكفاية' : 'Adequately Stocked'}</span>
                          <div className="text-xl font-bold text-emerald-400 mt-1">
                            {materials.filter((m) => m.inStockQuantity > m.minimumThreshold).length}
                          </div>
                        </div>
                      </div>

                      {/* Materials Table */}
                      <div className="glow-card rounded-2xl overflow-hidden border border-slate-700/60">
                        {materials.length === 0 ? (
                          <div className="p-12 text-center text-xs text-slate-400">
                            <Package className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                            {lang === 'ar' ? 'لا توجد مواد مسجلة في الكتالوج حتى الآن.' : 'No materials recorded in catalog yet.'}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-start text-xs text-slate-200">
                              <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/60 text-[11px] uppercase tracking-wider font-semibold">
                                <tr>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'كود المادة' : 'Code'}</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'اسم الصنف' : 'Item Name'}</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'التصنيف' : 'Category'}</th>
                                  <th className="p-3 text-start">{lang === 'ar' ? 'المواصفات' : 'Specification'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'الوحدة' : 'Unit'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'المخزون الحالي' : 'Stock'}</th>
                                  <th className="p-3 text-center">{lang === 'ar' ? 'حد الطلب' : 'Min Threshold'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60">
                                {materials.map((m) => {
                                  const isLow = m.inStockQuantity <= m.minimumThreshold;
                                  return (
                                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                                      <td className="p-3 font-semibold text-cyan-300">{m.code}</td>
                                      <td className="p-3 font-medium text-slate-100">{m.name}</td>
                                      <td className="p-3">
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700/50 text-slate-300 border border-slate-600/40">
                                          {m.category}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-400 max-w-xs truncate" title={m.specification}>{m.specification}</td>
                                      <td className="p-3 text-center text-slate-400">{m.unit}</td>
                                      <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300'
                                          }`}>
                                          {m.inStockQuantity}
                                        </span>
                                      </td>
                                      <td className="p-3 text-center text-slate-400">{m.minimumThreshold}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subtab Content: Material Requests */}
                  {materialsSubtab === 'requests' && (
                    <div className="space-y-4">
                      {materialRequests.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <Layers className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد طلبات مواد للموقع حتى الآن.' : 'No site material requests logged yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {materialRequests.map((req) => (
                            <div key={req.id} className="glow-card p-5 rounded-2xl space-y-3 border border-slate-700/60">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700/50 text-cyan-300">
                                    {req.requestNumber || `REQ-${req.id.substring(0, 6).toUpperCase()}`}
                                  </span>
                                  <h4 className="font-bold text-slate-100 text-sm mt-1">
                                    {req.siteName || (lang === 'ar' ? 'الموقع العام' : 'General Site')}
                                  </h4>
                                </div>
                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${req.status === 'Delivered'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : req.status === 'Dispatched'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : req.status === 'Approved'
                                        ? 'bg-cyan-500/20 text-cyan-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                  {translateStatusLabel(req.status)}
                                </span>
                              </div>

                              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 space-y-1">
                                <div className="text-[11px] font-semibold text-slate-300">{lang === 'ar' ? 'الأصناف المطلوبة:' : 'Requested Items:'}</div>
                                {req.items?.map((it) => (
                                  <div key={it.id} className="flex items-center justify-between text-xs text-slate-300">
                                    <span>{it.materialName || it.materialCode}</span>
                                    <span className="font-semibold text-cyan-300">{it.quantityRequested} {it.unit}</span>
                                  </div>
                                ))}
                              </div>

                              {req.notes && (
                                <p className="text-[11px] text-slate-400">
                                  <span className="font-medium text-slate-300">{lang === 'ar' ? 'ملاحظات: ' : 'Notes: '}</span>
                                  {req.notes}
                                </p>
                              )}

                              {isAdmin && req.status !== 'Delivered' && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                                  {req.status === 'PendingApproval' && (
                                    <button
                                      onClick={() => handleUpdateReqStatus(req.id, 'Approved')}
                                      className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 text-xs font-semibold"
                                    >
                                      {lang === 'ar' ? 'موافقة على الصرف' : 'Approve'}
                                    </button>
                                  )}
                                  {req.status === 'Approved' && (
                                    <button
                                      onClick={() => handleUpdateReqStatus(req.id, 'Dispatched')}
                                      className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs font-semibold"
                                    >
                                      {lang === 'ar' ? 'تم الشحن للموقع' : 'Dispatch'}
                                    </button>
                                  )}
                                  {req.status === 'Dispatched' && (
                                    <button
                                      onClick={() => handleUpdateReqStatus(req.id, 'Delivered')}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 text-xs font-semibold"
                                    >
                                      {lang === 'ar' ? 'تأكيد الاستلام بالموقع' : 'Confirm Delivered'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Company Assets */}
                  {materialsSubtab === 'assets' && (
                    <div className="space-y-4">
                      {companyAssets.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <Wrench className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد أصول أو معدات مسجلة حتى الآن.' : 'No company assets recorded yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {companyAssets.map((asset) => (
                            <div key={asset.id} className="glow-card p-4 rounded-2xl space-y-2.5 border border-slate-700/60">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                                    {asset.assetTag}
                                  </span>
                                  <h4 className="font-bold text-slate-100 text-sm mt-1">{asset.name}</h4>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${asset.status === 'Available'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : asset.status === 'Assigned'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                  {translateStatusLabel(asset.status)}
                                </span>
                              </div>

                              <div className="text-xs text-slate-300 space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/40">
                                <div>
                                  <span className="text-slate-400">{lang === 'ar' ? 'الموديل: ' : 'Model: '}</span>
                                  {asset.model || '-'}
                                </div>
                                <div>
                                  <span className="text-slate-400">{lang === 'ar' ? 'الرقم التسلسلي: ' : 'Serial: '}</span>
                                  {asset.serialNumber || '-'}
                                </div>
                                {asset.assignedToUserName && (
                                  <div>
                                    <span className="text-slate-400">{lang === 'ar' ? 'العهدة مع: ' : 'Assigned to: '}</span>
                                    <span className="text-cyan-300 font-medium">{asset.assignedToUserName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: PROJECT GOVERNANCE, RISKS & HANDOVER */}
              {/* ======================================================== */}
              {activeTab === 'governance' && (
                <div className="space-y-6 animate-fade-up">
                  {/* Header & Project Selector */}
                  <div className="glow-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-cyan-300" />
                        <h3 className="text-base font-bold text-slate-100">{t('navGovernance')}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {lang === 'ar'
                          ? 'إدارة وحوكمة مخاطر المشروع، سجل الملاحظات والمعوقات، وإجراءات التسليم والضمان'
                          : 'Project risk matrix, site snag resolution, and final handover & warranty certification'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                          {lang === 'ar' ? 'المشروع:' : 'Project:'}
                        </span>
                        <select
                          value={selectedProjectId || ''}
                          onChange={(e) => selectProject(e.target.value)}
                          className="px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} - {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          if (governanceSubtab === 'risks') setShowRiskModal(true);
                          else if (governanceSubtab === 'issues') setShowIssueModal(true);
                          else setShowHandoverModal(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {governanceSubtab === 'risks' && (lang === 'ar' ? 'تسجيل خطر جديد' : 'Log Risk')}
                        {governanceSubtab === 'issues' && (lang === 'ar' ? 'تسجيل مشكلة / عائق' : 'Report Issue')}
                        {governanceSubtab === 'handover' && (lang === 'ar' ? 'توثيق تسليم / ضمان' : 'Record Handover')}
                      </button>
                    </div>
                  </div>

                  {/* Subtabs Bar */}
                  <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2 overflow-x-auto">
                    <button
                      onClick={() => setGovernanceSubtab('risks')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${governanceSubtab === 'risks'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'مصفوفة المخاطر' : 'Project Risks Matrix'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {projectRisks.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setGovernanceSubtab('issues')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${governanceSubtab === 'issues'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'سجل المشاكل والمعوقات' : 'Issues & Snag Log'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {projectIssues.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setGovernanceSubtab('handover')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${governanceSubtab === 'handover'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'التسليم والضمان' : 'Handover & Warranty'}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700/60 text-slate-300">
                        {projectHandovers.length}
                      </span>
                    </button>
                  </div>

                  {/* Subtab Content: Risks */}
                  {governanceSubtab === 'risks' && (
                    <div className="space-y-4">
                      {projectRisks.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <AlertTriangle className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد مخاطر مرصودة لهذا المشروع حالياً.' : 'No risks recorded for this project yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projectRisks.map((risk) => {
                            const isCritical = risk.severity === 'Critical';
                            const isHigh = risk.severity === 'High';
                            return (
                              <div key={risk.id} className="glow-card p-5 rounded-2xl space-y-3 border border-slate-700/60">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isCritical
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                          : isHigh
                                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                            : 'bg-blue-500/20 text-blue-300'
                                        }`}>
                                        {risk.severity} Severity
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
                                        {risk.category}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-slate-100 text-sm mt-1.5">{risk.title}</h4>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-400 font-medium">
                                    {translateStatusLabel(risk.status)}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-300 leading-relaxed">{risk.description}</p>

                                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 text-xs space-y-1">
                                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                                    <span>{lang === 'ar' ? 'الاحتمالية: ' : 'Probability: '}{risk.probability}/5</span>
                                    <span>{lang === 'ar' ? 'الأثر: ' : 'Impact: '}{risk.impact}/5</span>
                                    <span className="font-semibold text-cyan-300">{lang === 'ar' ? 'الدرجة: ' : 'Score: '}{risk.riskScore}</span>
                                  </div>
                                  {risk.mitigationPlan && (
                                    <div className="pt-1.5 border-t border-slate-700/40">
                                      <span className="text-slate-400 font-medium">{lang === 'ar' ? 'خطة الاحتواء: ' : 'Mitigation: '}</span>
                                      <span className="text-slate-200">{risk.mitigationPlan}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Issues */}
                  {governanceSubtab === 'issues' && (
                    <div className="space-y-4">
                      {projectIssues.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لا توجد مشاكل أو معوقات فنية مفتوحة لهذا المشروع.' : 'No active site issues recorded for this project.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {projectIssues.map((issue) => (
                            <div key={issue.id} className="glow-card p-5 rounded-2xl space-y-3 border border-slate-700/60">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${issue.priority === 'Critical'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                      : issue.priority === 'High'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                    {issue.priority} Priority
                                  </span>
                                  <h4 className="font-bold text-slate-100 text-sm mt-1">{issue.title}</h4>
                                </div>
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-slate-700/60 text-slate-300">
                                  {translateStatusLabel(issue.status)}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed">{issue.description}</p>

                              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/40">
                                <span>{lang === 'ar' ? 'بواسطة: ' : 'Reported by: '}{issue.reportedByUserName}</span>
                                <span>{formatDateCairo(issue.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Subtab Content: Handover & Warranty */}
                  {governanceSubtab === 'handover' && (
                    <div className="space-y-4">
                      {projectHandovers.length === 0 ? (
                        <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                          <Award className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                          {lang === 'ar' ? 'لم يتم توثيق محاضر استلام أو فترات ضمان لهذا المشروع بعد.' : 'No handover or warranty certificates logged yet.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {projectHandovers.map((h) => (
                            <div key={h.id} className="glow-card p-6 rounded-2xl space-y-4 border border-cyan-400/20">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
                                <div>
                                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${h.acceptanceStatus === 'FullyAccepted'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                      : h.acceptanceStatus === 'ConditionallyAccepted'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                    {h.acceptanceStatus}
                                  </span>
                                  <h4 className="text-base font-bold text-slate-100 mt-2">
                                    {lang === 'ar' ? 'محضر استلام المشروع وشهادة الضمان' : 'Project Handover & Warranty Certificate'}
                                  </h4>
                                </div>
                                <div className="text-xs text-slate-400 text-start sm:text-end">
                                  <div>{lang === 'ar' ? 'تاريخ الاستلام:' : 'Handover Date:'}</div>
                                  <div className="text-sm font-semibold text-cyan-300">{formatDateCairo(h.handoverDate)}</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 space-y-1.5">
                                  <h5 className="text-xs font-bold text-slate-200">{lang === 'ar' ? 'فترة سريان الضمان' : 'Warranty Coverage'}</h5>
                                  <div className="text-xs text-slate-300">
                                    <span className="text-slate-400">{lang === 'ar' ? 'من: ' : 'From: '}</span>
                                    {h.warrantyStartDate ? formatDateCairo(h.warrantyStartDate) : '-'}
                                    <span className="text-slate-400 mx-2">{lang === 'ar' ? 'إلى: ' : 'To: '}</span>
                                    {h.warrantyEndDate ? formatDateCairo(h.warrantyEndDate) : '-'}
                                  </div>
                                  {h.warrantyTerms && (
                                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                                      <span className="font-semibold text-slate-300">{lang === 'ar' ? 'شروط الضمان: ' : 'Terms: '}</span>
                                      {h.warrantyTerms}
                                    </p>
                                  )}
                                </div>

                                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/40 space-y-1.5">
                                  <h5 className="text-xs font-bold text-slate-200">{lang === 'ar' ? 'ملاحظات وقائمة النواقص (Snag List)' : 'Snag List & Notes'}</h5>
                                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                                    {h.snagListJson || (lang === 'ar' ? 'لا توجد نواقص أو معلقات مسجلة.' : 'No open snags recorded.')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: ENTERPRISE DOCUMENTS & ARCHIVE (B2 STORAGE) */}
              {/* ======================================================== */}
              {activeTab === 'documents' && (
                <div className="space-y-6 animate-fade-up">
                  <DocumentsManager
                    currentUser={currentUser}
                    projects={projects}
                    lang={lang}
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: PROJECT MILESTONES & ROADMAP */}
              {/* ======================================================== */}
              {activeTab === 'milestones' && (
                <div className="space-y-6 animate-fade-up">
                  <MilestonesRoadmap
                    currentUser={currentUser}
                    projects={projects}
                    lang={lang}
                    onAddTeam={() => setActiveTab('organization')}
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: ORGANIZATION & TEAMS */}
              {/* ======================================================== */}
              {activeTab === 'organization' && (
                <div className="space-y-6 animate-fade-up">
                  <OrganizationView
                    currentUser={currentUser}
                    lang={lang}
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: ACCOUNTING WORKSPACE (PROMPT ACCOUNTING-01) */}
              {/* ======================================================== */}
              {activeTab === 'accounting' && (
                <div className="space-y-6 animate-fade-up">
                  <AccountingWorkspace
                    currentUser={currentUser}
                    projects={projects}
                    lang={lang}
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: SITE OPERATIONS & WORK LOGS (PROMPT OPERATIONS-01) */}
              {/* ======================================================== */}
              {activeTab === 'operations' && (
                <div className="space-y-6 animate-fade-up">
                  <SiteOperationsManager
                    currentUser={currentUser}
                    projects={projects}
                    sites={allSites}
                    lang={lang}
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: DAILY SITE REPORTS & REVISIONS (PROMPT SITE-REPORT-01) */}
              {/* ======================================================== */}
              {activeTab === 'daily-reports' && (
                <div className="space-y-6 animate-fade-up">
                  <DailySiteReportsManager
                    currentUser={currentUser}
                    projects={projects}
                    sites={allSites}
                    lang={lang}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* MOBILE BOTTOM NAVIGATION BAR (Glass Bottom Nav for Smartphones & Tablets) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0c1626]/95 backdrop-blur-xl border-t border-cyan-500/25 px-2 py-1.5 flex items-center justify-around pb-safe shadow-[0_-4px_30px_rgba(0,0,0,0.6)]">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'text-cyan-300 font-bold bg-cyan-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">{t('navDashboard')}</span>
          </button>

          {/* 2. Project Data / Reports */}
          <button
            type="button"
            onClick={() => {
              setActiveTab(isAdmin ? 'project-data' : 'my-data');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
              activeTab === 'project-data' || activeTab === 'my-data'
                ? 'text-cyan-300 font-bold bg-cyan-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">{lang === 'ar' ? 'البيانات' : 'Data'}</span>
          </button>

          {/* 3. Reports Archive */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('reports-archive');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'reports-archive'
                ? 'text-emerald-400 font-bold bg-emerald-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <ShieldCheck className="w-5 h-5 mb-0.5 text-emerald-400" />
              {approvedRecords.length > 0 && (
                <span className="absolute -top-1 -end-2 px-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[9px] leading-tight">
                  {approvedRecords.length}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight">{lang === 'ar' ? 'الأرشيف' : 'Archive'}</span>
          </button>

          {/* 4. Chat */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('chat');
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              activeTab === 'chat'
                ? 'text-cyan-300 font-bold bg-cyan-500/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 mb-0.5" />
              {totalUnreadMessages > 0 && (
                <span className="absolute -top-1 -end-2 px-1 rounded-full bg-cyan-500 text-white font-bold text-[9px] leading-tight animate-pulse">
                  {totalUnreadMessages}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight">{lang === 'ar' ? 'المحادثات' : 'Chat'}</span>
          </button>

          {/* 5. Menu / More */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] leading-tight">{lang === 'ar' ? 'المزيد' : 'Menu'}</span>
          </button>
        </nav>
      </div>

      {/* 3. ENTERPRISE INSPECTION DRAWER (Prompt 20) */}
      {drawerData && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={() => setDrawerData(null)} />
          <div className="fixed inset-y-0 end-0 max-w-md w-full bg-[#152438] border-s border-cyan-400/25 p-6 flex flex-col shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-600/50 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {getDrawerTypeLabel(drawerData.type)}
                </span>
                <h3 className="font-bold text-slate-100 text-base mt-1">{drawerData.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerData(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-sm">
              {getDrawerFields(drawerData.type, drawerData.details).map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl bg-[#1a2f4a]/80 border border-cyan-400/15 px-3.5 py-2.5"
                >
                  <div className="text-[11px] text-slate-400 mb-0.5">{row.label}</div>
                  <div className="text-slate-100 font-medium leading-relaxed break-words">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDrawerData(null)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION DIALOG (Prompt 20) */}
      {confirmDialog.isOpen && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-slate-600/50 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-300">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/45 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-slate-100 text-xs font-semibold ${confirmDialog.confirmColor || 'bg-mti-600 hover:bg-mti-500'
                  }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. NEW / EDIT PROJECT MODAL */}
      {showNewProjectModal && (
        <div
          className="app-modal-overlay p-4 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget && !projectSaving) {
              setShowNewProjectModal(false);
              setEditingProjectId(null);
              setNewProjectMemberIds([]);
              setNewCoverImageUrl(null);
            }
          }}
        >
          <div className="glass-panel w-full max-w-5xl my-auto rounded-3xl border border-slate-700/80 shadow-2xl bg-slate-900/95 backdrop-blur-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700/60 bg-slate-950/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    {editingProjectId
                      ? (lang === 'ar' ? 'تعديل بيانات المشروع' : 'Edit Project Details')
                      : (lang === 'ar' ? 'إنشاء مشروع هندسي جديد' : t('createProject'))}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'تعبئة وتوزيع بيانات المشروع الأساسية وفريق العمل والصورة بطريقة أفقية منظمة'
                      : 'Enter project details, assigned members, and cover image'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!projectSaving) {
                    setShowNewProjectModal(false);
                    setEditingProjectId(null);
                    setNewProjectMemberIds([]);
                    setNewCoverImageUrl(null);
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={lang === 'ar' ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateProject} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                {/* 2-Column Horizontal Distribution Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* Core Details Column (7 cols) */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {lang === 'ar' ? 'البيانات الأساسية للمشروع' : 'Project Information'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                            {t('projectCode')} <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            placeholder="PRJ-2026-ALEX"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">{t('hintProjectCode')}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                            {t('projectName')} <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Alexandria Port Hub"
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">{t('hintProjectName')}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t('clientName')}</label>
                          <input
                            type="text"
                            value={newClient}
                            onChange={(e) => setNewClient(e.target.value)}
                            placeholder="Port Authority / العميل"
                            className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">{t('hintClientName')}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-200 mb-1.5">{lang === 'ar' ? 'نوع المشروع' : 'Project Type'}</label>
                          <select
                            value={newProjectType}
                            onChange={(e) => setNewProjectType(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition cursor-pointer"
                          >
                            <option value="GeneralEngineering">{lang === 'ar' ? 'هندسة عامة' : 'General Engineering'}</option>
                            <option value="Software">{lang === 'ar' ? 'مشروع برمجي' : 'Software Development'}</option>
                            <option value="CCTV">{lang === 'ar' ? 'أنظمة مراقبة CCTV' : 'CCTV Surveillance'}</option>
                            <option value="AccessControl">{lang === 'ar' ? 'أنظمة تحكم بالأبواب Access Control' : 'Access Control'}</option>
                            <option value="Networking">{lang === 'ar' ? 'شبكات وبنية تحتية Networking' : 'Networking Infrastructure'}</option>
                            <option value="Maintenance">{lang === 'ar' ? 'صيانة وعمليات تشغيلية' : 'Operations & Maintenance'}</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t('description')}</label>
                        <textarea
                          value={newDesc}
                          onChange={(e) => setNewDesc(e.target.value)}
                          rows={2}
                          placeholder={lang === 'ar' ? 'اكتب نبذة أو نطاق عمل المشروع وأهدافه…' : 'Enter project scope and description…'}
                          className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-600/50 rounded-xl text-white text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition resize-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">{t('hintProjectDesc')}</p>
                      </div>
                    </div>

                    {/* Assign Members Section (Horizontal Cards) */}
                    {isAdmin && (
                      <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {lang === 'ar' ? 'إسناد مستخدمين وفريق العمل' : 'Assign Project Team'}
                          </label>
                          {newProjectMemberIds.length > 0 && (
                            <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                              {lang === 'ar'
                                ? `${newProjectMemberIds.length} مستخدم محدد`
                                : `${newProjectMemberIds.length} selected`}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                          {userList.length === 0 ? (
                            <div className="col-span-2 py-4 text-center text-xs text-slate-400">
                              {lang === 'ar' ? 'لا يوجد مستخدمون متاحون' : 'No users loaded'}
                            </div>
                          ) : (
                            userList.map((u) => {
                              const checked = newProjectMemberIds.includes(u.id);
                              return (
                                <label
                                  key={u.id}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition cursor-pointer ${checked
                                      ? 'bg-cyan-500/15 border-cyan-500/50 shadow-sm'
                                      : 'bg-slate-900/60 border-slate-700/40 hover:bg-slate-800/80 hover:border-slate-600/60'
                                    }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setNewProjectMemberIds((prev) =>
                                        checked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                                      );
                                    }}
                                    className="rounded border-slate-600 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                                  />
                                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                                    {u.firstName?.[0] || 'U'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-slate-100 truncate">
                                      {u.firstName} {u.lastName}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                                  </div>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{t('hintProjectMembers')}</p>
                      </div>
                    )}
                  </div>

                  {/* Visuals & Progress Column (5 cols) */}
                  <div className="lg:col-span-5 space-y-5">
                    {/* Cover Image Section */}
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        {lang === 'ar' ? 'صورة غلاف المشروع' : 'Project Cover'}
                      </h4>

                      <div className="rounded-2xl border border-slate-600/50 bg-slate-950/80 overflow-hidden shadow-lg group">
                        <div className="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                          <img
                            src={resolveProjectCover(newCoverImageUrl)}
                            alt="cover preview"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                          {/* Live project title & code on the cover preview */}
                          <div className="absolute bottom-2.5 start-3 end-3">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-300 bg-slate-900/80 px-2 py-0.5 rounded-md border border-cyan-500/30">
                              {newCode || 'PRJ-CODE'}
                            </span>
                            <p className="text-xs font-bold text-white truncate mt-1">
                              {newName || (lang === 'ar' ? 'عنوان المشروع' : 'Project Name')}
                            </p>
                          </div>

                          {!newCoverImageUrl && (
                            <div className="absolute top-2.5 end-3 px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 text-[10px] text-slate-300">
                              {lang === 'ar' ? 'صورة افتراضية' : 'Default Cover'}
                            </div>
                          )}
                        </div>

                        <div className="p-3 bg-slate-900/90 flex items-center gap-2 flex-wrap border-t border-slate-800">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-200 text-xs font-semibold cursor-pointer transition">
                            <Camera className="w-3.5 h-3.5" />
                            {coverImageBusy
                              ? (lang === 'ar' ? 'جاري المعالجة…' : 'Processing…')
                              : (lang === 'ar' ? 'اختيار صورة' : 'Choose image')}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={coverImageBusy}
                              onChange={(e) => handleProjectCoverPick(e.target.files?.[0] || null)}
                            />
                          </label>
                          {newCoverImageUrl && (
                            <button
                              type="button"
                              onClick={() => setNewCoverImageUrl(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              {lang === 'ar' ? 'استعادة الافتراضية' : 'Clear (default)'}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {lang === 'ar'
                          ? 'تُضبط الصورة تلقائياً بنسبة 16:9 وتُستخدم كواجهة للمشروع.'
                          : 'Auto-cropped to 16:9 for cards and dashboard view.'}
                      </p>
                    </div>

                    {/* Progress Slider Section */}
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          {lang === 'ar' ? 'نسبة الإنجاز الحالية' : 'Completion Progress'}
                        </h4>
                        <span className="text-sm font-black text-cyan-300 bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 rounded-lg">
                          {newProgressPercentage}%
                        </span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-700/60 p-0.5">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-cyan-500/50"
                            style={{ width: `${Math.min(100, Math.max(0, newProgressPercentage))}%` }}
                          />
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={newProgressPercentage}
                          onChange={(e) => setNewProgressPercentage(Number(e.target.value))}
                          className="w-full accent-cyan-400 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                          <span>0% (بداية)</span>
                          <span>50% (منتصف)</span>
                          <span>100% (مكتمل)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-slate-700/60 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="w-full sm:w-auto flex-1">
                  <ActionLoadingBar
                    active={projectSaving}
                    isArabic={lang === 'ar'}
                    label={lang === 'ar' ? 'جاري حفظ بيانات المشروع…' : 'Saving project…'}
                  />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    disabled={projectSaving}
                    onClick={() => {
                      setShowNewProjectModal(false);
                      setEditingProjectId(null);
                      setNewProjectMemberIds([]);
                      setNewCoverImageUrl(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-300 text-sm font-semibold transition"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={projectSaving}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg shadow-cyan-600/30 disabled:opacity-60 text-white text-sm font-bold flex items-center gap-2 transition"
                  >
                    {projectSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {editingProjectId
                      ? (lang === 'ar' ? 'حفظ تعديلات المشروع' : 'Save Changes')
                      : (lang === 'ar' ? 'إنشاء وحفظ المشروع' : t('createProject'))}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5b. SITE CREATE / EDIT MODAL */}
      {showSiteModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/50 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingSiteId
                ? lang === 'ar'
                  ? 'تعديل الموقع'
                  : 'Edit Site'
                : lang === 'ar'
                  ? 'إضافة موقع'
                  : 'Add Site'}
            </h3>
            <form onSubmit={handleSaveSite} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'كود الموقع' : 'Site Code'}</label>
                <input
                  type="text"
                  value={siteCode}
                  onChange={(e) => setSiteCode(e.target.value)}
                  required
                  placeholder="SITE-A1"
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintSiteCode')}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'اسم الموقع' : 'Site Name'}</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintSiteName')}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'العنوان' : 'Address'}</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintSiteAddress')}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-200 mb-1">{t('description')}</label>
                <textarea
                  value={siteDesc}
                  onChange={(e) => setSiteDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintSiteDesc')}</p>
              </div>
              <ActionLoadingBar
                active={siteSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ بيانات الموقع…' : 'Saving site…'}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={siteSaving}
                  onClick={() => setShowSiteModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={siteSaving}
                  className="px-5 py-2 rounded-xl bg-mti-600 hover:bg-mti-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-1.5"
                >
                  {siteSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : null}
                  {lang === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. NEW / EDIT TASK MODAL */}
      {showNewTaskModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/50 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingTaskId
                ? lang === 'ar'
                  ? 'تعديل المهمة'
                  : 'Edit Task'
                : t('createTask')}
            </h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{t('taskTitle')}</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Excavate foundation row B"
                  required
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintTaskTitle')}</p>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{t('description')}</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintTaskDesc')}</p>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{t('priority')}</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                >
                  <option value="Low">{t('priorityLow')}</option>
                  <option value="Medium">{t('priorityMedium')}</option>
                  <option value="High">{t('priorityHigh')}</option>
                  <option value="Urgent">{t('priorityUrgent')}</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">{t('hintTaskPriority')}</p>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs text-slate-200 mb-1">
                    {lang === 'ar' ? 'تعيين لمستخدم' : 'Assign to'}
                  </label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    required={!editingTaskId}
                    className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                  >
                    <option value="">
                      {lang === 'ar' ? 'اختر مستخدماً...' : 'Select a user...'}
                    </option>
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">{t('hintTaskAssignee')}</p>
                  {userList.length === 0 && (
                    <p className="text-[11px] text-amber-300 mt-1">
                      {lang === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
                    </p>
                  )}
                </div>
              )}

              <ActionLoadingBar
                active={taskSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ المهمة…' : 'Saving task…'}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={taskSaving}
                  onClick={() => {
                    setShowNewTaskModal(false);
                    setEditingTaskId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={taskSaving}
                  className="px-5 py-2 rounded-xl bg-mti-600 hover:bg-mti-500 disabled:opacity-60 text-white text-sm font-semibold flex items-center gap-1.5"
                >
                  {taskSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {editingTaskId
                    ? lang === 'ar'
                      ? 'حفظ'
                      : 'Save'
                    : t('createTask')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. NEW USER MODAL */}
      {showNewUserModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">
                {editingUserId
                  ? lang === 'ar'
                    ? 'تعديل المستخدم'
                    : 'Edit User'
                  : t('createCorporateUser')}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('firstName')}</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-slate-200 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('hintUserFirst')}</p>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('lastName')}</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-slate-200 text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">{t('hintUserLast')}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('jobTitle')}</label>
                <input
                  type="text"
                  value={newUserJobTitle}
                  onChange={(e) => setNewUserJobTitle(e.target.value)}
                  placeholder={t('jobTitlePlaceholder')}
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-slate-200 text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('hintUserJob')}</p>
              </div>

              {!editingUserId && (
                <>
                  <div>
                    <label className="block text-xs text-slate-200 mb-1">{t('corporateEmail')}</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="field.engineer@mti.com"
                      required
                      className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{t('hintUserEmail')}</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-200 mb-1">{t('initialPassword')}</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">{t('hintUserPassword')}</p>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-slate-200 mb-1">{t('roleAssignment')}</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/70 border border-slate-500/40 rounded-xl text-white text-sm"
                >
                  <option value="Engineer">{t('userRoleEngineer')}</option>
                  <option value="ProjectManager">{t('userRolePM')}</option>
                  <option value="Admin">{t('userRoleAdmin')}</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">{t('hintUserRole')}</p>
              </div>

              {editingUserId && (
                <label className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="checkbox"
                    checked={editingUserActive}
                    onChange={(e) => setEditingUserActive(e.target.checked)}
                    className="rounded"
                  />
                  {lang === 'ar' ? 'حساب نشط' : 'Account active'}
                </label>
              )}

              <ActionLoadingBar
                active={userSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ بيانات المستخدم…' : 'Saving user…'}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={userSaving}
                  onClick={() => {
                    setShowNewUserModal(false);
                    setEditingUserId(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={userSaving}
                  className="px-5 py-2 rounded-xl bg-mti-600 hover:bg-mti-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  {userSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {editingUserId
                    ? lang === 'ar'
                      ? 'حفظ التعديل'
                      : 'Save Changes'
                    : t('provisionUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start Direct Chat Modal / User Search */}
      {showNewChatModal && (
        <div className="app-modal-overlay">
          <div className="bg-[#152438] border-2 border-cyan-400/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b-2 border-cyan-400/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-300" />
                <div>
                  <h3 className="font-bold text-white text-base">{t('startChat')}</h3>
                  <p className="text-xs text-slate-200 mt-0.5">
                    {lang === 'ar'
                      ? 'ابحث عن شخص وابدأ محادثة — هتتحفظ باسمه في القائمة'
                      : 'Find someone to chat — saved by name in the list'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ActionLoadingBar
              active={chatStarting}
              isArabic={lang === 'ar'}
              label={lang === 'ar' ? 'جاري فتح المحادثة…' : 'Opening conversation…'}
            />

            <div className="relative">
              <Search className="w-5 h-5 text-cyan-300 absolute start-3 top-1/2 -translate-y-1/2" strokeWidth={2.4} />
              <input
                type="text"
                value={chatSearchUser}
                onChange={(e) => setChatSearchUser(e.target.value)}
                placeholder={t('searchUsersChat')}
                autoFocus
                className="w-full ps-11 pe-4 py-3.5 bg-[#0f1c2e] border-2 border-cyan-400/50 rounded-xl text-white text-sm font-medium placeholder:text-slate-300 focus:outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
              />
            </div>

            <div className="max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain space-y-2 pr-1">
              {loadingContacts ? (
                <div className="py-8 text-center text-sm text-slate-200 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>{t('loading')}</span>
                </div>
              ) : chatContacts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-200">
                  {lang === 'ar' ? 'لم يتم العثور على مستخدمين بهذا الاسم' : 'No users found'}
                </div>
              ) : (
                chatContacts.map((contact) => {
                  const presence = getMemberPresence({
                    userId: String(contact.id),
                    userName: contact.fullName || '',
                    userEmail: contact.email || '',
                    role: contact.role || '',
                    lastSeenAt: contact.lastSeenAt,
                    isOnline: contact.isOnline,
                  });
                  return (
                    <div
                      key={contact.id}
                      onClick={() => handleStartDirectChat(contact)}
                      className="p-3.5 rounded-xl bg-[#1e334f] hover:bg-[#25405c] border-2 border-slate-500/50 hover:border-cyan-400/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-11 h-11 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-base shadow-sm">
                            {(contact.fullName || 'U')[0]}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full border-2 border-[#1e334f] ${presence.isOnline ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white truncate">
                              {contact.fullName}
                            </span>
                            {contact.role && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/25 border border-cyan-400/40 text-cyan-100 font-semibold flex-shrink-0">
                                {contact.role}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-200 mt-1 flex-wrap">
                            {contact.jobTitle && (
                              <span className="text-cyan-200 font-semibold truncate">{contact.jobTitle}</span>
                            )}
                            {contact.jobTitle && <span className="text-slate-400">•</span>}
                            <span className="truncate text-slate-200">{contact.email}</span>
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 font-medium ${presence.isOnline ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                          >
                            {presence.isOnline
                              ? t('online')
                              : `${t('lastSeen')}: ${formatLastSeen(presence.lastSeenAt, false)}`}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDirectChat(contact);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-bold flex items-center gap-1 transition-colors flex-shrink-0 shadow-md"
                      >
                        <span>{lang === 'ar' ? 'محادثة' : 'Chat'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t-2 border-cyan-400/30">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold border border-slate-400/40 transition-colors"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OPERATIONS PLATFORM MODALS */}
      {/* 1. BOQ Item Modal */}
      {showBoqModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'إضافة بند مقايسة (BOQ)' : 'Add BOQ Item'}
            </h3>
            <form onSubmit={handleCreateBoqItem} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'كود البند' : 'Item Code'}</label>
                  <input
                    type="text"
                    value={boqItemCode}
                    onChange={(e) => setBoqItemCode(e.target.value)}
                    placeholder="BOQ-CCTV-01"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={boqCategory}
                    onChange={(e) => setBoqCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  >
                    <option value="Hardware">{lang === 'ar' ? 'أجهزة ومعدات' : 'Hardware'}</option>
                    <option value="Software">{lang === 'ar' ? 'برمجيات وتراخيص' : 'Software & Licenses'}</option>
                    <option value="Cabling">{lang === 'ar' ? 'كابلات وتمديدات' : 'Cabling & Infrastructure'}</option>
                    <option value="Installation">{lang === 'ar' ? 'أعمال تركيب وتشغيل' : 'Installation & Labor'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الوصف الفني' : 'Description'}</label>
                <textarea
                  value={boqDesc}
                  onChange={(e) => setBoqDesc(e.target.value)}
                  rows={2}
                  required
                  placeholder="Hikvision 4MP IP Dome Camera with IR..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                  <input
                    type="text"
                    value={boqUnit}
                    onChange={(e) => setBoqUnit(e.target.value)}
                    placeholder="Unit / Meter"
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الكمية' : 'Qty'}</label>
                  <input
                    type="number"
                    value={boqQty}
                    onChange={(e) => setBoqQty(Number(e.target.value))}
                    min="1"
                    required
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                  <input
                    type="number"
                    value={boqUnitPrice}
                    onChange={(e) => setBoqUnitPrice(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-end"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <input
                  type="text"
                  value={boqNotes}
                  onChange={(e) => setBoqNotes(e.target.value)}
                  placeholder="Include wall mount bracket..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ بند المقايسة…' : 'Saving BOQ item…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowBoqModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'إضافة بند' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Technical Offer Modal */}
      {showTechOfferModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'تسجيل عرض فني جديد' : 'New Technical Offer'}
            </h3>
            <form onSubmit={handleCreateTechOffer} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'عنوان العرض' : 'Offer Title'}</label>
                <input
                  type="text"
                  value={techOfferTitle}
                  onChange={(e) => setTechOfferTitle(e.target.value)}
                  placeholder="Technical Architecture & CCTV SOW Rev. 1"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'نطاق العمل (SOW)' : 'Scope of Work'}</label>
                <textarea
                  value={techOfferScope}
                  onChange={(e) => setTechOfferScope(e.target.value)}
                  rows={3}
                  required
                  placeholder="Supply, installation, cabling, testing, and commissioning..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'المخرجات والتسليمات' : 'Deliverables'}</label>
                <textarea
                  value={techOfferDeliverables}
                  onChange={(e) => setTechOfferDeliverables(e.target.value)}
                  rows={2}
                  placeholder="As-built drawings, user manuals, warranty certificates..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ العرض الفني…' : 'Saving technical offer…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowTechOfferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'حفظ العرض' : 'Save Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Commercial Offer Modal */}
      {showCommOfferModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'تسجيل عرض مالي وتجاري' : 'New Commercial Offer'}
            </h3>
            <form onSubmit={handleCreateCommOffer} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'عنوان العرض' : 'Offer Title'}</label>
                <input
                  type="text"
                  value={commOfferTitle}
                  onChange={(e) => setCommOfferTitle(e.target.value)}
                  placeholder="Commercial Quotation - Phase 1"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'القيمة الإجمالية' : 'Total Amount'}</label>
                  <input
                    type="number"
                    value={commOfferAmount}
                    onChange={(e) => setCommOfferAmount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'العملة' : 'Currency'}</label>
                  <select
                    value={commOfferCurrency}
                    onChange={(e) => setCommOfferCurrency(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  >
                    <option value="EGP">{lang === 'ar' ? 'جنيه مصري (EGP)' : 'EGP'}</option>
                    <option value="USD">{lang === 'ar' ? 'دولار أمريكي (USD)' : 'USD'}</option>
                    <option value="EUR">{lang === 'ar' ? 'يورو (EUR)' : 'EUR'}</option>
                    <option value="SAR">{lang === 'ar' ? 'ريال سعودي (SAR)' : 'SAR'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'نسبة الخصم %' : 'Discount %'}</label>
                  <input
                    type="number"
                    value={commOfferDiscount}
                    onChange={(e) => setCommOfferDiscount(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'ضريبة القيمة المضافة %' : 'VAT %'}</label>
                  <input
                    type="number"
                    value={commOfferTax}
                    onChange={(e) => setCommOfferTax(Number(e.target.value))}
                    min="0"
                    max="100"
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</label>
                <input
                  type="text"
                  value={commOfferTerms}
                  onChange={(e) => setCommOfferTerms(e.target.value)}
                  placeholder="50% Advance, 40% on Delivery, 10% on Handover"
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ العرض المالي…' : 'Saving commercial offer…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowCommOfferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'حفظ العرض' : 'Save Quote'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Invoice Modal */}
      {showInvoiceModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'إصدار فاتورة / مستخلص' : 'Issue Invoice'}
            </h3>
            <form onSubmit={handleCreateInvoice} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}</label>
                  <input
                    type="text"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    placeholder="INV-2026-001"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    value={invAmount}
                    onChange={(e) => setInvAmount(Number(e.target.value))}
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'المرحلة / المستخلص' : 'Milestone Description'}</label>
                <input
                  type="text"
                  value={invMilestone}
                  onChange={(e) => setInvMilestone(e.target.value)}
                  placeholder="Phase 1 - Completion of CCTV cabling"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
                <input
                  type="date"
                  value={invDueDate}
                  onChange={(e) => setInvDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                <input
                  type="text"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="Subject to site engineer approval"
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري إصدار الفاتورة…' : 'Issuing invoice…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'إصدار الفاتورة' : 'Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Material Modal */}
      {showMaterialModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'تسجيل صنف مادة جديد' : 'Register New Material'}
            </h3>
            <form onSubmit={handleCreateMaterial} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'كود الصنف' : 'Code'}</label>
                  <input
                    type="text"
                    value={matCode}
                    onChange={(e) => setMatCode(e.target.value)}
                    placeholder="MAT-CAT6-01"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={matCat}
                    onChange={(e) => setMatCat(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  >
                    <option value="CCTV">{translateStatusLabel('CCTV')}</option>
                    <option value="AccessControl">{translateStatusLabel('AccessControl')}</option>
                    <option value="Networking">{translateStatusLabel('Networking')}</option>
                    <option value="Cables">{translateStatusLabel('Cables')}</option>
                    <option value="Tools">{translateStatusLabel('Tools')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'اسم الصنف' : 'Material Name'}</label>
                <input
                  type="text"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="Cat6 UTP Cable 305M Roll"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'المواصفة' : 'Specification'}</label>
                <input
                  type="text"
                  value={matSpec}
                  onChange={(e) => setMatSpec(e.target.value)}
                  placeholder="Schneider / Legrand Pure Copper"
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الوحدة' : 'Unit'}</label>
                  <input
                    type="text"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="Roll / Pcs"
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'المخزون' : 'Stock'}</label>
                  <input
                    type="number"
                    value={matStock}
                    onChange={(e) => setMatStock(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'حد الطلب' : 'Min Threshold'}</label>
                  <input
                    type="number"
                    value={matThreshold}
                    onChange={(e) => setMatThreshold(Number(e.target.value))}
                    min="0"
                    required
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري حفظ بيانات المادة…' : 'Saving material…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'حفظ الصنف' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Material Request Modal */}
      {showMatRequestModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'طلب توريد مواد للموقع' : 'Site Material Request'}
            </h3>
            <form onSubmit={handleCreateMatRequest} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الموقع' : 'Site'}</label>
                <select
                  value={matReqSiteId}
                  onChange={(e) => setMatReqSiteId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                >
                  <option value="">{lang === 'ar' ? 'عام / غير محدد' : 'General / Unspecified'}</option>
                  {selectedProjectSites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'كود المادة' : 'Item Code'}</label>
                  <input
                    type="text"
                    value={matReqItemCode}
                    onChange={(e) => setMatReqItemCode(e.target.value)}
                    placeholder="MAT-01"
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الكمية المطلوبة' : 'Requested Qty'}</label>
                  <input
                    type="number"
                    value={matReqQty}
                    onChange={(e) => setMatReqQty(Number(e.target.value))}
                    min="1"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'بيان الصنف والمواصفة' : 'Description'}</label>
                <input
                  type="text"
                  value={matReqDesc}
                  onChange={(e) => setMatReqDesc(e.target.value)}
                  placeholder="RJ45 Connectors Box..."
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'ملاحظات الموقع' : 'Site Notes'}</label>
                <input
                  type="text"
                  value={matReqNotes}
                  onChange={(e) => setMatReqNotes(e.target.value)}
                  placeholder="Urgent for rack termination..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري إرسال طلب التوريد…' : 'Submitting material request…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowMatRequestModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'إرسال الطلب' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Asset Modal */}
      {showAssetModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-300" />
              {lang === 'ar' ? 'تسجيل أصل / معدة للشركة' : 'Register Company Asset'}
            </h3>
            <form onSubmit={handleCreateAsset} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'كود الأصل' : 'Asset Tag'}</label>
                  <input
                    type="text"
                    value={assetTag}
                    onChange={(e) => setAssetTag(e.target.value)}
                    placeholder="AST-FIBER-01"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'التصنيف' : 'Category'}</label>
                  <input
                    type="text"
                    value={assetCat}
                    onChange={(e) => setAssetCat(e.target.value)}
                    placeholder="Fusion Splicer / OTDR"
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'اسم المعدة / الأصل' : 'Asset Name'}</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Fujikura 90S+ Optical Fiber Fusion Splicer"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الموديل' : 'Model'}</label>
                  <input
                    type="text"
                    value={assetModel}
                    onChange={(e) => setAssetModel(e.target.value)}
                    placeholder="90S+"
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الرقم التسلسلي' : 'Serial Number'}</label>
                  <input
                    type="text"
                    value={assetSerial}
                    onChange={(e) => setAssetSerial(e.target.value)}
                    placeholder="SN-2026849"
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري تسجيل الأصل والمعدة…' : 'Registering asset…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowAssetModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'تسجيل الأصل' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Risk Modal */}
      {showRiskModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-300" />
              {lang === 'ar' ? 'تسجيل وحوكمة خطر في المشروع' : 'Log Project Risk'}
            </h3>
            <form onSubmit={handleCreateRisk} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'عنوان الخطر' : 'Risk Title'}</label>
                <input
                  type="text"
                  value={riskTitle}
                  onChange={(e) => setRiskTitle(e.target.value)}
                  placeholder="Potential shipment delay for core switches"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                <textarea
                  value={riskDesc}
                  onChange={(e) => setRiskDesc(e.target.value)}
                  rows={2}
                  required
                  placeholder="Port customs clearance may delay delivery by 14 days..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الاحتمالية (1-5)' : 'Prob (1-5)'}</label>
                  <input
                    type="number"
                    value={riskProb}
                    onChange={(e) => setRiskProb(Number(e.target.value))}
                    min="1"
                    max="5"
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الأثر (1-5)' : 'Impact (1-5)'}</label>
                  <input
                    type="number"
                    value={riskImpact}
                    onChange={(e) => setRiskImpact(Number(e.target.value))}
                    min="1"
                    max="5"
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'المستوى' : 'Severity'}</label>
                  <select
                    value={riskSeverity}
                    onChange={(e) => setRiskSeverity(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  >
                    <option value="Low">{translateStatusLabel('Low')}</option>
                    <option value="Medium">{translateStatusLabel('Medium')}</option>
                    <option value="High">{translateStatusLabel('High')}</option>
                    <option value="Critical">{translateStatusLabel('Critical')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'خطة الاحتواء والمعالجة' : 'Mitigation Plan'}</label>
                <textarea
                  value={riskMitigation}
                  onChange={(e) => setRiskMitigation(e.target.value)}
                  rows={2}
                  placeholder="Pre-clearance documentation filed with forwarder..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري تسجيل وتحليل الخطر…' : 'Logging project risk…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowRiskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'تسجيل الخطر' : 'Log Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Issue Modal */}
      {showIssueModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              {lang === 'ar' ? 'تسجيل مشكلة فنية أو عائق بالموقع' : 'Report Site Issue'}
            </h3>
            <form onSubmit={handleCreateIssue} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'عنوان المشكلة' : 'Issue Title'}</label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="Power socket missing at Gate 3 for camera pole"
                  required
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'الوصف والتفاصيل' : 'Description'}</label>
                <textarea
                  value={issueDesc}
                  onChange={(e) => setIssueDesc(e.target.value)}
                  rows={3}
                  required
                  placeholder="Civil works team has not delivered 220V conduit..."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'درجة الأولوية' : 'Priority'}</label>
                <select
                  value={issuePriority}
                  onChange={(e) => setIssuePriority(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                >
                  <option value="Low">{translateStatusLabel('Low')}</option>
                  <option value="Medium">{translateStatusLabel('Medium')}</option>
                  <option value="High">{translateStatusLabel('High')}</option>
                  <option value="Urgent">{translateStatusLabel('Urgent')}</option>
                </select>
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري توثيق المشكلة وإخطار الفريق…' : 'Logging issue…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'تسجيل المشكلة' : 'Report Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Handover & Warranty Modal */}
      {showHandoverModal && (
        <div className="app-modal-overlay">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-600/60 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              {lang === 'ar' ? 'توثيق محضر تسليم وشهادة ضمان' : 'Record Handover & Warranty'}
            </h3>
            <form onSubmit={handleCreateHandover} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'تاريخ التسليم' : 'Handover Date'}</label>
                  <input
                    type="date"
                    value={handoverDate}
                    onChange={(e) => setHandoverDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'حالة الاستلام' : 'Acceptance Status'}</label>
                  <select
                    value={handoverStatus}
                    onChange={(e) => setHandoverStatus(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  >
                    <option value="Pending">{lang === 'ar' ? 'معلق' : 'Pending'}</option>
                    <option value="ConditionallyAccepted">{lang === 'ar' ? 'استلام ابتدائي مع ملاحظات' : 'Conditionally Accepted'}</option>
                    <option value="FullyAccepted">{lang === 'ar' ? 'استلام نهائي بدون ملاحظات' : 'Fully Accepted'}</option>
                    <option value="Rejected">{lang === 'ar' ? 'مرفوض' : 'Rejected'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'قائمة النواقص والملاحظات (Snag List)' : 'Snag List Notes'}</label>
                <textarea
                  value={handoverSnags}
                  onChange={(e) => setHandoverSnags(e.target.value)}
                  rows={2}
                  placeholder="1. Camera 4 angle adjustment needed. 2. Rack labels to be replaced."
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'بدء سريان الضمان' : 'Warranty Start'}</label>
                  <input
                    type="date"
                    value={handoverWarrantyStart}
                    onChange={(e) => setHandoverWarrantyStart(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'انتهاء الضمان' : 'Warranty End'}</label>
                  <input
                    type="date"
                    value={handoverWarrantyEnd}
                    onChange={(e) => setHandoverWarrantyEnd(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-200 mb-1">{lang === 'ar' ? 'شروط الضمان' : 'Warranty Terms'}</label>
                <input
                  type="text"
                  value={handoverWarrantyTerms}
                  onChange={(e) => setHandoverWarrantyTerms(e.target.value)}
                  placeholder="1 Year 24/7 on-site warranty including parts and replacement"
                  className="w-full px-3 py-1.5 bg-slate-800/80 border border-slate-500/40 rounded-xl text-white text-xs"
                />
              </div>

              <ActionLoadingBar
                active={opsModalSaving}
                isArabic={lang === 'ar'}
                label={lang === 'ar' ? 'جاري توثيق محضر التسليم والضمان…' : 'Saving handover certificate…'}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/60">
                <button
                  type="button"
                  disabled={opsModalSaving}
                  onClick={() => setShowHandoverModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={opsModalSaving}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  {opsModalSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  {lang === 'ar' ? 'توثيق المحضر' : 'Save Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT / PROJECT DATA INSPECTION & APPROVAL MODAL */}
      <ReportDetailsModal
        isOpen={Boolean(inspectingRecordId)}
        onClose={() => {
          setInspectingRecordId(null);
          setInspectingRecord(null);
        }}
        recordId={inspectingRecordId}
        initialRecord={inspectingRecord}
        lang={lang}
        isAdmin={isAdmin}
        onApprove={handleApproveFromModal}
        onReject={handleRejectFromModal}
        onRequestChanges={handleRequestChangesFromModal}
      />

      {/* Floating Real-Time Notifications Container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 end-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              onClick={() => {
                if (toast.linkTab) setActiveTab(toast.linkTab);
                if (toast.conversationId) {
                  const conv = conversations.find((c) => c.id === toast.conversationId);
                  if (conv) openConversation(conv);
                }
              }}
              className={`p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl pointer-events-auto cursor-pointer transition-all hover:scale-[1.02] flex items-start gap-3 animate-fade-up ${toast.type === 'chat'
                  ? 'bg-slate-950/90 border-cyan-400/35 text-cyan-50'
                  : toast.type === 'task'
                    ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                    : 'bg-slate-800/90 border-slate-600/50 text-slate-100'
                }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${toast.type === 'chat'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : toast.type === 'task'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-mti-100 text-cyan-300'
                  }`}
              >
                {toast.type === 'chat' ? (
                  <MessageSquare className="w-4 h-4" />
                ) : toast.type === 'task' ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span className="truncate">{toast.title}</span>
                  <span className="text-[10px] text-slate-400 ms-2 font-mono">Real-time</span>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
