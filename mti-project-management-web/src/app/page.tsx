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
import {
  Project,
  Site,
  User,
  Conversation,
  Message,
  TaskItem,
  ProjectDataRecord,
  AdminDashboardStats,
  EngineerDashboardStats,
  AuditLogItem,
  SystemSafeConfig,
  NotificationItem
} from '@/types';
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
  Eye,
  EyeOff,
  ArrowRight,
  Menu,
  Globe,
  Check,
  CheckCheck,
  Clock,
  MessageCircle
} from 'lucide-react';
import { Language, getTranslation, TranslationKey } from '@/lib/i18n';
import { API_BASE_URL } from '@/lib/api-client';
import { logger } from '@/lib/logger';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  // Projects & Sites
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectSites, setSelectedProjectSites] = useState<Site[]>([]);
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

  // Engineer Data Submission Form
  const [submitCategory, setSubmitCategory] = useState('DailyReport');
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitPayload, setSubmitPayload] = useState('{\n  "weather": "Clear",\n  "crewCount": 14,\n  "workDone": "Reinforced concrete casting - Pier 4"\n}');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string }[]>([]);

  // Real-Time Chat & WhatsApp Message Statuses
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const activeConversationRef = useRef<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [deliveredMessageIds, setDeliveredMessageIds] = useState<Set<string>>(new Set());

  // Facebook Messenger & Notifications Dropdown in Topbar
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [chatSearchUser, setChatSearchUser] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

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
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newClient, setNewClient] = useState('');

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
    onConfirm: () => {}
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
    if (typeof window !== 'undefined') {
      const savedLang = (localStorage.getItem('mti_lang') as Language) || 'ar';
      setLang(savedLang);
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = savedLang;
    }
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      loadInitialData(user);
      initSignalR();
    }
  }, []);

  const initSignalR = async () => {
    try {
      const conn = await signalRService.initialize();
      if (conn) {
        setSignalRConnected(true);

        // Real-Time Chat Handlers
        conn.on('MessageSent', (msg: Message) => {
          const u = authService.getCurrentUser();
          // 1. If recipient is me, acknowledge delivery to the hub
          if (u && msg.senderUserId !== u.id) {
            conn.invoke('AcknowledgeDelivery', msg.id, msg.conversationId).catch(() => {});
            chatService.markAsDelivered(msg.id).catch(() => {});

            // Show toast if conversation is not currently active
            if (activeConversationRef.current?.id !== msg.conversationId) {
              addToast(msg.senderName, msg.content, 'chat', 'chat', msg.conversationId);
            }
          }

          if (activeConversationRef.current?.id === msg.conversationId) {
            setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            if (u && msg.senderUserId !== u.id) {
              chatService.markAsRead(msg.conversationId).catch(() => {});
            }
          }
          chatService.getConversations().then(setConversations).catch(() => {});
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
          chatService.getConversations().then(setConversations).catch(() => {});
        });

        // Real-Time Notifications
        conn.on('NotificationCreated', (notif: NotificationItem) => {
          setNotificationsList((prev) => [notif, ...prev.filter((n) => n.id !== notif.id)]);
          addToast(notif.title, notif.body, 'info', 'notifications');
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
          }
        });

        // Real-Time Tasks
        conn.on('TaskCreated', (taskItem?: any) => {
          addToast(t('toastNewTask'), taskItem?.title || 'Task Created', 'task', 'tasks');
          taskService.getTasks().then(setTasks).catch(() => {});
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
          }
        });
        conn.on('TaskUpdated', () => {
          taskService.getTasks().then(setTasks).catch(() => {});
        });
        conn.on('TaskAssigned', (taskItem?: any) => {
          addToast(t('toastNewTask'), taskItem?.title || 'New Task Assigned', 'task', 'tasks');
          taskService.getTasks().then(setTasks).catch(() => {});
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
          }
        });
        conn.on('TaskStatusChanged', () => {
          taskService.getTasks().then(setTasks).catch(() => {});
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
          }
        });

        // Real-Time Project Data Submissions & Approvals
        conn.on('ProjectDataSubmitted', () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => {});
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          }
        });
        conn.on('DataSubmitted', () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => {});
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          }
        });
        conn.on('ProjectDataApproved', () => {
          dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => {});
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => {});
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
          }
        });
        conn.on('DataApproved', () => {
          dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => {});
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => {});
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          } else {
            dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
          }
        });
        conn.on('ProjectDataRejected', () => {
          const u = authService.getCurrentUser();
          if (u?.roles.includes('Admin') || u?.roles.includes('SystemAdmin')) {
            dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => {});
            dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
          }
        });
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
        dashboardService.getAdminStats().then(setAdminStats).catch(() => {});
        dataRecordService.getPendingApprovals().then(setPendingRecords).catch(() => {});
        dashboardService.getUsers().then(setUserList).catch(() => {});
        dashboardService.getAuditLogs().then((res) => setAuditLogs(res.items)).catch(() => {});
      } else {
        dashboardService.getEngineerStats().then(setEngineerStats).catch(() => {});
        dataRecordService.getApprovedRecords().then(setApprovedRecords).catch(() => {});
      }
      taskService.getTasks().then(setTasks).catch(() => {});
      chatService.getConversations().then((convs) => {
        setConversations(convs);
        const conn = signalRService.getConnection();
        if (conn) {
          convs.forEach((c) => conn.invoke('JoinConversation', c.id).catch(() => {}));
        }
      }).catch(() => {});
      notificationService.getNotifications().then((res) => setNotificationsList(res.items)).catch(() => {});
      dashboardService.getSafeConfig().then(setSafeConfig).catch(() => {});
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
    setSelectedProjectId(projId);
    setLoadingSites(true);
    try {
      const res = await projectService.getProjectSites(projId);
      setSelectedProjectSites(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSites(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectService.createProject({
        code: newCode,
        name: newName,
        description: newDesc,
        clientName: newClient
      });
      setShowNewProjectModal(false);
      setNewCode('');
      setNewName('');
      setNewDesc('');
      setNewClient('');
      await loadProjects();
    } catch (err: any) {
      alert(err?.message || 'Failed to create project');
    }
  };

  // Chat Actions
  const openConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    try {
      const conn = signalRService.getConnection();
      if (conn) {
        conn.invoke('JoinConversation', conv.id).catch(() => {});
      }
    } catch {}
    await loadMessages(conv.id);
    await chatService.markAsRead(conv.id);
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

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
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
      const sent = await chatService.sendMessage(activeConversation.id, txt);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...sent, deliveryStatus: 'sent' } : m))
      );
      chatService.getConversations().then(setConversations).catch(() => {});
    } catch (err: any) {
      logger.error('Failed to send message', err);
      setChatMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, deliveryStatus: 'failed' } : m))
      );
    }
  };

  const handleStartDirectChat = async (targetUser: any) => {
    try {
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
        setApprovalComment('');
        const updated = await dataRecordService.getPendingApprovals();
        setPendingRecords(updated);
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
        setApprovalComment('');
        const updated = await dataRecordService.getPendingApprovals();
        setPendingRecords(updated);
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
        setApprovalComment('');
        const updated = await dataRecordService.getPendingApprovals();
        setPendingRecords(updated);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Engineer Submit Data
  const handleSubmitData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || selectedProjectSites.length === 0) {
      alert('Please select a project with at least one assigned site.');
      return;
    }
    try {
      const record = await dataRecordService.createRecord({
        projectId: selectedProjectId,
        siteId: selectedProjectSites[0].id,
        title: submitTitle,
        category: submitCategory,
        dataPayloadJson: submitPayload
      });
      await dataRecordService.submitRecord(record.id);
      setSubmitSuccess(`Report "${submitTitle}" submitted successfully for Admin review!`);
      setSubmitTitle('');
      setUploadedFiles([]);
      setTimeout(() => setSubmitSuccess(''), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit data');
    }
  };

  // Task Center Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project first.');
      return;
    }
    try {
      await taskService.createTask({
        projectId: selectedProjectId,
        siteId: selectedProjectSites[0]?.id,
        title: newTaskTitle,
        priority: newTaskPriority
      });
      setNewTaskTitle('');
      setShowNewTaskModal(false);
      const updated = await taskService.getTasks();
      setTasks(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to create task');
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      const updated = await taskService.getTasks();
      setTasks(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to update status');
    }
  };

  // User Management Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await dashboardService.createUser({
        firstName: newFirstName,
        lastName: newLastName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        jobTitle: newUserJobTitle.trim() || undefined
      });
      setShowNewUserModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserJobTitle('');
      const users = await dashboardService.getUsers();
      setUserList(users);
      logger.info('User provisioned', { email: newUserEmail, jobTitle: newUserJobTitle });
      alert(t('userCreatedSuccess'));
    } catch (err: any) {
      logger.error('Failed to create user', err);
      alert(err?.message || 'Failed to create user');
    }
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
  // Unauthenticated Login Screen
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="login-canvas min-h-screen flex items-center justify-center px-4 py-10 text-slate-800">
        <div className="login-orb login-orb-a" aria-hidden />
        <div className="login-orb login-orb-b" aria-hidden />
        <div className="login-orb login-orb-c" aria-hidden />
        <div className="login-grid-fade" aria-hidden />

        <div className="relative z-10 w-full max-w-[460px] animate-fade-up">
          {/* Language Switcher on Login Screen */}
          <div className="flex justify-end mb-3">
            <button
              onClick={toggleLanguage}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-sky-200 text-xs text-slate-700 transition-all backdrop-blur-md shadow-lg"
            >
              <span>{lang === 'ar' ? '🇺🇸' : '🇪🇬'}</span>
              <span className="font-semibold">{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>
          </div>

          <div className="login-card">
            <div className="login-card-shine" aria-hidden />
            <div className="login-card-edge" aria-hidden />

            {/* Brand hero — logo + iconic product name */}
            <div className="relative px-7 pt-8 pb-2 text-center">
              <div className="login-logo-shell mx-auto mb-6">
                <img
                  src="/images/CompanyLogo.png"
                  alt="MTI Engineering Solutions"
                  className="login-logo-img"
                />
              </div>

              <div className="login-product-name">
                <span className="login-product-mark" aria-hidden />
                <h1>
                  <span className="login-product-mti">MTI</span>
                  <span className="login-product-mgmt">{t('productName')}</span>
                </h1>
                <span className="login-product-mark" aria-hidden />
              </div>
              <p className="login-subtitle mt-3 px-3">
                {t('loginSubtitle')}
              </p>
            </div>

            <div className="relative px-7 pb-8 pt-5">
              {errorMsg && (
                <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="login-field-block">
                  <label className="login-label" htmlFor="login-email">
                    {t('emailOrUsername')}
                  </label>
                  <div className="relative group">
                    <span className="login-field-icon">
                      <Mail className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <input
                      id="login-email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('emailPlaceholder')}
                      required
                      autoComplete="username"
                      className="field-input login-field block w-full pl-11 rtl:pl-3.5 rtl:pr-11 pr-3.5 py-3.5 rounded-2xl text-sm"
                    />
                  </div>
                </div>

                <div className="login-field-block">
                  <label className="login-label" htmlFor="login-password">
                    {t('password')}
                  </label>
                  <div className="relative group">
                    <span className="login-field-icon">
                      <Lock className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('passwordPlaceholder')}
                      required
                      autoComplete="current-password"
                      className="field-input login-field block w-full pl-11 rtl:pl-11 rtl:pr-11 pr-11 py-3.5 rounded-2xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-500 hover:text-sky-600 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-submit group w-full mt-2 py-3.5 px-4 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Fingerprint className="w-4 h-4" strokeWidth={1.9} />
                  )}
                  <span>{loading ? t('signingIn') : t('signIn')}</span>
                  {!loading && (
                    <ArrowRight className={`w-4 h-4 opacity-85 group-hover:translate-x-0.5 transition-transform ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  )}
                </button>
              </form>
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
    { id: 'sites', label: t('navSites'), icon: MapPin },
    { id: 'engineers', label: t('navEngineers'), icon: Users },
    { id: 'project-data', label: t('navProjectData'), icon: FileSpreadsheet },
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
    { id: 'my-sites', label: t('navMySites'), icon: MapPin },
    { id: 'my-data', label: t('navMyData'), icon: FileSpreadsheet },
    { id: 'my-tasks', label: t('navMyTasks'), icon: CheckSquare },
    { id: 'chat', label: t('navChat'), icon: MessageSquare },
    { id: 'notifications', label: t('navNotifications'), icon: Bell },
    { id: 'profile', label: t('navProfile'), icon: UserCircle }
  ];

  const menuItems: MenuItem[] = isAdmin ? adminMenuItems : engineerMenuItems;

  // -------------------------------------------------------------
  // Authenticated Desktop & Mobile Responsive Enterprise Layout
  // -------------------------------------------------------------
  return (
    <div className="app-shell min-h-screen text-slate-800 flex font-body overflow-hidden">
      {/* 1. DESKTOP SIDEBAR (Visible on lg and larger) */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? 'w-[4.75rem]' : 'w-64'
        } glass-nav flex-col transition-all duration-300 ease-in-out z-30`}
      >
        {/* Sidebar Header / Logo */}
        <div className="p-4 border-b border-sky-100 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-1 rounded-xl bg-[#0b0b0b] border border-sky-200 flex-shrink-0 flex items-center justify-center">
              <img
                src="/images/CompanyLogo.png"
                alt="MTI Logo"
                className="h-7 w-auto object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="font-display font-bold text-slate-800 text-sm leading-tight truncate">{t('appName')}</div>
                <div className="text-[10px] text-mti-600 tracking-wide font-medium">{t('appSubtitle')}</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-slate-800 transition-colors"
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isCurrent
                    ? 'nav-item-active'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-sky-50'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.badge && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-sky-100 bg-sky-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-mti-100 border border-mti-200 flex items-center justify-center font-bold text-xs text-mti-700 flex-shrink-0">
                {currentUser.firstName[0]}
                {currentUser.lastName[0]}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate text-start">
                  <div className="text-xs font-semibold text-slate-800 truncate">{currentUser.fullName}</div>
                  <div className="text-[10px] text-mti-600 truncate">
                    {currentUser.jobTitle || currentUser.roles.join(', ')}
                  </div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                title={t('signOut')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-sky-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE & TABLET DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 start-0 max-w-xs w-full glass-nav flex flex-col z-50 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-sky-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-lg bg-[#0b0b0b] flex items-center justify-center">
                  <img
                    src="/images/CompanyLogo.png"
                    alt="MTI Logo"
                    className="h-7 w-auto object-contain"
                  />
                </div>
                <div>
                  <div className="font-display font-bold text-slate-800 text-sm">{t('appName')}</div>
                  <div className="text-[10px] text-mti-600 font-medium">{t('appSubtitle')}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800"
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
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition-all ${
                      isCurrent
                        ? 'nav-item-active'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-sky-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-sky-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-mti-100 border border-mti-200 flex items-center justify-center font-bold text-xs text-mti-700">
                  {currentUser.firstName[0]}
                  {currentUser.lastName[0]}
                </div>
                <div className="truncate text-start">
                  <div className="text-xs font-semibold text-slate-800 truncate">{currentUser.fullName}</div>
                  <div className="text-[10px] text-mti-600 truncate">
                    {currentUser.jobTitle || currentUser.roles.join(', ')}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-sky-50"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
              className="lg:hidden p-2 rounded-xl bg-sky-50 hover:bg-white/[0.08] border border-sky-100 text-slate-600"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Permanent Top Company Logo & Identity Badge */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-sky-100 shadow-sm backdrop-blur-md flex-shrink-0">
              <div className="p-1 rounded-lg bg-[#0b0b0b] flex items-center justify-center">
                <img
                  src="/images/CompanyLogo.png"
                  alt="MTI Engineering Solutions"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div className="hidden sm:block border-l border-sky-100 pl-2.5 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-2.5">
                <div className="text-[11px] font-bold text-slate-800 tracking-wide leading-none">{t('appName')}</div>
                <div className="text-[9px] text-mti-600 font-medium uppercase tracking-wider mt-0.5">{t('portalBadge')}</div>
              </div>
            </div>

            <form onSubmit={handleGlobalSearch} className="relative max-w-md w-full hidden md:block">
              <Search className="w-4 h-4 absolute left-3.5 rtl:left-auto rtl:right-3.5 top-2.5 text-slate-500" />
              <input
                type="text"
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="field-input w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 rounded-xl text-xs"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Bilingual Language Switcher Toggle Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-white/[0.08] border border-sky-100 text-xs font-semibold text-slate-700 transition-colors shadow-sm"
              title={lang === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
            >
              <span className="text-sm">{lang === 'ar' ? '🇺🇸' : '🇪🇬'}</span>
              <span className="hidden sm:inline">{lang === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* SignalR Connection Status Pill */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-sky-100 text-[11px]">
              <Radio className={`w-3 h-3 ${signalRConnected ? 'text-emerald-600 status-dot-live' : 'text-amber-600'}`} />
              <span className={`hidden sm:inline ${signalRConnected ? 'text-emerald-600 font-medium' : 'text-amber-600'}`}>
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
                className="p-2.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-100 text-slate-600 relative transition-colors"
                title={t('messagesTitle')}
              >
                <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
                {totalUnreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-sky-500 text-slate-800 rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-sky-500/50">
                    {totalUnreadMessages}
                  </span>
                )}
              </button>

              {/* Facebook Messenger Dropdown Popover */}
              {showMessagesDropdown && (
                <div className="absolute end-0 mt-2 w-80 sm:w-96 rounded-2xl bg-sky-50 border border-sky-100 shadow-xl backdrop-blur-xl z-50 overflow-hidden animate-fade-up">
                  <div className="p-3.5 border-b border-sky-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-sky-600" />
                      <span className="font-bold text-slate-800 text-xs">{t('messagesTitle')}</span>
                      {totalUnreadMessages > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 border border-sky-500/30 font-semibold">
                          {totalUnreadMessages} {t('messagesUnread')}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowNewChatModal(true);
                        setShowMessagesDropdown(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-800 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      {t('startChat')}
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-sky-100/50">
                    {conversations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                        {t('noConversationsFound')}
                      </div>
                    ) : (
                      conversations.slice(0, 6).map((c) => {
                        const otherMember = c.members.find((m) => m.userId !== currentUser.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              openConversation(c);
                              setActiveTab('chat');
                              setShowMessagesDropdown(false);
                            }}
                            className={`p-3.5 hover:bg-sky-50 transition-colors cursor-pointer flex items-center gap-3 ${
                              c.unreadCount > 0 ? 'bg-sky-500/[0.05]' : ''
                            }`}
                          >
                            <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center font-bold text-xs text-sky-600 flex-shrink-0">
                              {(otherMember?.userName || 'C')[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-semibold text-xs truncate ${c.unreadCount > 0 ? 'text-slate-800' : 'text-slate-700'}`}>
                                  {c.title || otherMember?.userName || 'Direct Chat'}
                                </span>
                                {c.unreadCount > 0 && (
                                  <span className="min-w-[16px] h-4 px-1 rounded-full bg-sky-500 text-slate-800 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                                    {c.unreadCount}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] truncate mt-0.5 ${c.unreadCount > 0 ? 'text-sky-200 font-medium' : 'text-slate-400'}`}>
                                {c.lastMessage?.content || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2.5 border-t border-sky-100 bg-sky-50/80 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        setShowMessagesDropdown(false);
                      }}
                      className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-sky-100 text-sky-600 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
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
                className="p-2.5 rounded-xl bg-white hover:bg-sky-50 border border-sky-100 text-slate-600 relative transition-colors"
                title={t('navNotifications')}
              >
                <Bell className="w-4 h-4" strokeWidth={1.8} />
                {notificationsList.filter((n) => !n.isRead).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-slate-800 rounded-full text-[9px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-rose-500/50">
                    {notificationsList.filter((n) => !n.isRead).length}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute end-0 mt-2 w-80 sm:w-96 rounded-2xl bg-sky-50 border border-sky-100 shadow-xl backdrop-blur-xl z-50 overflow-hidden animate-fade-up">
                  <div className="p-3.5 border-b border-sky-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-mti-600" />
                      <span className="font-bold text-slate-800 text-xs">{t('realTimeNotifications')}</span>
                    </div>
                    {notificationsList.some((n) => !n.isRead) && (
                      <button
                        onClick={async () => {
                          await notificationService.markAllAsRead();
                          setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
                        }}
                        className="text-[11px] text-mti-600 hover:underline"
                      >
                        {t('markAllAsRead')}
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-sky-100/50">
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
                            if (n.type === 'NewTask') setActiveTab('tasks');
                            if (n.type === 'DataApproval') setActiveTab('approvals');
                            if (n.type === 'NewMessage') setActiveTab('chat');
                            setShowNotificationsDropdown(false);
                          }}
                          className={`p-3.5 hover:bg-sky-50 transition-colors cursor-pointer flex items-start gap-3 ${
                            !n.isRead ? 'bg-mti-500/[0.06]' : ''
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 text-mti-600 flex-shrink-0 mt-0.5">
                            <Radio className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-800 truncate">{n.title}</div>
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{n.body}</p>
                            <span className="text-[9px] text-slate-500 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 border-t border-sky-100 bg-sky-50/80 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotificationsDropdown(false);
                      }}
                      className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-sky-100 text-slate-600 text-xs font-semibold transition-colors"
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
          <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-start justify-center p-6 pt-20">
            <div className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-sky-100 shadow-xl space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-mti-600" />
                  Search Results for &ldquo;{globalSearchQuery}&rdquo; ({searchResults.length})
                </h3>
                <button onClick={() => setSearchResults(null)} className="text-slate-400 hover:text-slate-800">
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
                      className="p-3 rounded-xl bg-white border border-sky-100 hover:border-mti-200 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-mti-600 mr-2">
                          {item.type}
                        </span>
                        <span className="font-semibold text-slate-800">{item.title}</span>
                        {item.subtitle && <p className="text-slate-400 text-[11px] mt-0.5">{item.subtitle}</p>}
                      </div>
                      {item.status && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.status}
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
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Skeleton Loader while content switching */}
          {isLoadingContent ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-8 bg-slate-100 rounded-xl w-1/4"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-24 bg-slate-100 rounded-2xl"></div>
                <div className="h-24 bg-slate-100 rounded-2xl"></div>
                <div className="h-24 bg-slate-100 rounded-2xl"></div>
                <div className="h-24 bg-slate-100 rounded-2xl"></div>
              </div>
              <div className="h-64 bg-slate-100 rounded-2xl"></div>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* VIEW: DASHBOARD */}
              {/* ======================================================== */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="glow-card p-5 rounded-2xl">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-display text-xl font-bold text-slate-800">
                          {isAdmin ? t('adminDashboardTitle') : t('engineerDashboardTitle')}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                          {isAdmin ? t('adminDashboardSubtitle') : t('engineerDashboardSubtitle')}
                        </p>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => downloadCsv('ProjectData')}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-mti-200 text-xs text-slate-600 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-mti-600" />
                            {t('exportDataCsv')}
                          </button>
                          <button
                            onClick={() => downloadCsv('Tasks')}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-mti-200 text-xs text-slate-600 flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5 text-mti-600" />
                            {t('exportTasksCsv')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cards / KPI Metrics */}
                  {isAdmin && adminStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('totalProjects')}</div>
                          <div className="kpi-icon text-mti-600"><Briefcase className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-slate-800">{adminStats.totalProjects}</div>
                        <div className="text-[11px] text-emerald-600 mt-1">{adminStats.activeProjects} {t('activeProjects')}</div>
                      </div>
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('monitoredSites')}</div>
                          <div className="kpi-icon text-teal-600"><MapPin className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-slate-800">{adminStats.totalSites}</div>
                        <div className="text-[11px] text-mti-600 mt-1">{adminStats.totalEngineers} {t('activeEngineers')}</div>
                      </div>
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('pendingApprovals')}</div>
                          <div className="kpi-icon text-amber-600"><FileCheck className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-amber-600">{adminStats.pendingApprovals}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{adminStats.approvedData} {t('approvedRecords')}</div>
                      </div>
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('openTasks')}</div>
                          <div className="kpi-icon text-sky-600"><Activity className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-slate-800">{adminStats.openTasks}</div>
                        <div className="text-[11px] text-rose-600 mt-1">{adminStats.overdueTasks} {t('overdueLabel')}</div>
                      </div>
                    </div>
                  )}

                  {!isAdmin && engineerStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('myAssignedProjects')}</div>
                          <div className="kpi-icon text-mti-600"><FolderKanban className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-slate-800">{engineerStats.myProjectsCount}</div>
                        <div className="text-[11px] text-mti-600 mt-1">{engineerStats.mySitesCount} {t('sitesCount')}</div>
                      </div>
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('myPendingTasks')}</div>
                          <div className="kpi-icon text-sky-600"><CheckSquare className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-slate-800">{engineerStats.pendingTasksCount}</div>
                        <div className="text-[11px] text-emerald-600 mt-1">{engineerStats.completedTasksCount} {t('completedLabel')}</div>
                      </div>
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('overdueTasks')}</div>
                          <div className="kpi-icon text-rose-600"><AlertCircle className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-rose-600">{engineerStats.overdueTasksCount}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{t('needsAttention')}</div>
                      </div>
                      <div className="glow-card glow-card-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">{t('approvedRecords')}</div>
                          <div className="kpi-icon text-emerald-600"><FileCheck className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-emerald-600">{engineerStats.approvedDataCount}</div>
                        <div className="text-[11px] text-amber-600 mt-1">{engineerStats.pendingDataCount} {t('underReview')}</div>
                      </div>
                    </div>
                  )}

                  {/* Operational Project Monitoring */}
                  <div className="glow-card p-5 rounded-2xl space-y-4">
                    <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-mti-600" />
                      {t('activeMonitoredProjects')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            selectProject(p.id);
                            setDrawerData({ title: p.name, type: 'Project', details: p });
                          }}
                          className="glow-card glow-card-hover p-4 rounded-xl cursor-pointer space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-mti-50 text-mti-600">
                              {p.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">
                              {p.status === 'Active' ? t('activeLabel') : p.status}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 text-sm">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.clientName}</div>
                          <div className="text-[11px] text-slate-500 pt-2 border-t border-sky-100 flex items-center justify-between gap-2">
                            <span>{p.totalSitesCount} {t('sitesMonitored')}</span>
                            <span className="text-mti-600 flex items-center gap-0.5 font-medium">
                              {t('inspect')} <ChevronRight className={`w-3 h-3 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: PROJECTS / MY PROJECTS */}
              {/* ======================================================== */}
              {(activeTab === 'projects' || activeTab === 'my-projects') && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 glow-card p-4 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">{t('projectsRoster')}</h3>
                      {isAdmin && (
                        <button
                          onClick={() => setShowNewProjectModal(true)}
                          className="p-1.5 rounded-lg bg-mti-600 hover:bg-mti-500 text-white text-xs flex items-center gap-1 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t('newProject')}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {projects.map((proj) => (
                        <div
                          key={proj.id}
                          onClick={() => selectProject(proj.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            selectedProjectId === proj.id
                              ? 'bg-white border-mti-500 shadow-lg shadow-mti-200/40'
                              : 'bg-white/80 border-sky-100 hover:border-sky-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-mti-600">
                              {proj.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-emerald-600">
                              {proj.status}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 text-sm mt-1">{proj.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{proj.clientName}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 glow-card p-4 rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-slate-800">{t('sitesUnderProject')}</h3>
                    {loadingSites ? (
                      <div className="p-8 text-center text-xs text-slate-500">{t('loading')}</div>
                    ) : selectedProjectSites.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-white/80 border border-sky-100 text-center text-xs text-slate-400">
                        {t('noSitesYet')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedProjectSites.map((site) => (
                          <div key={site.id} className="p-4 rounded-xl bg-white border border-sky-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">
                                {site.code}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{site.status}</span>
                            </div>
                            <div className="font-semibold text-slate-800 text-sm">{site.name}</div>
                            <p className="text-xs text-slate-400">{site.description}</p>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{site.address || 'GPS Coordinates Set'}</span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-sky-100 text-[11px]">
                              <div className="text-slate-400 font-medium mb-1">{t('assignedEngineers')}:</div>
                              {site.assignments && site.assignments.length > 0 ? (
                                <div className="space-y-1">
                                  {site.assignments.map((a) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between text-slate-600 bg-slate-50/80 px-2 py-1 rounded-md border border-sky-100"
                                    >
                                      <span>{a.engineerName}</span>
                                      <span className="text-[10px] text-mti-600 font-medium">{a.role}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-slate-500 italic">{t('noEngineersAssigned')}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: APPROVALS (Prompt 14 & 20) */}
              {/* ======================================================== */}
              {activeTab === 'approvals' && isAdmin && (
                <div className="space-y-4">
                  <div className="glow-card p-4 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{t('approvalCenterTitle')}</h3>
                      <p className="text-xs text-slate-400">{t('approvalCenterSubtitle')}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
                      {pendingRecords.length} {t('pendingReview')}
                    </span>
                  </div>

                  {pendingRecords.length === 0 ? (
                    <div className="glow-card p-12 text-center rounded-2xl text-xs text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      {t('allReviewed')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(Array.isArray(pendingRecords) ? pendingRecords : []).map((r) => (
                        <div key={r.id} className="glow-card p-5 rounded-2xl space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                                  {r.category}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-400">v{r.version}</span>
                              </div>
                              <h4 className="font-semibold text-slate-800 text-sm mt-1">{r.title}</h4>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Project: <span className="text-slate-700">{r.projectName}</span> &bull; Site:{' '}
                                <span className="text-slate-700">{r.siteName}</span>
                              </div>
                            </div>

                            <div className="text-right text-xs text-slate-400">
                              <div>{t('submittedBy')}: <span className="text-slate-800 font-medium">{r.submitterName}</span></div>
                              <div className="text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
                            </div>
                          </div>

                          {r.dataPayloadJson && (
                            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs font-mono text-emerald-600 overflow-x-auto">
                              <pre>{r.dataPayloadJson}</pre>
                            </div>
                          )}

                          <div className="pt-2 border-t border-sky-100 flex items-center justify-between gap-4">
                            <input
                              type="text"
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              placeholder={t('commentsPlaceholder')}
                              className="flex-1 px-3 py-1.5 bg-white border border-sky-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-mti-500"
                            />

                            <div className="flex items-center gap-2">
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
                  {!isAdmin && (
                    <div className="glow-card p-6 rounded-2xl space-y-4">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Upload className="w-4 h-4 text-mti-600" />
                        {t('submitDataTitle')}
                      </h3>

                      {submitSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>{submitSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitData} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('targetProject')}</label>
                            <select
                              value={selectedProjectId || ''}
                              onChange={(e) => selectProject(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                            >
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('dataCategory')}</label>
                            <select
                              value={submitCategory}
                              onChange={(e) => setSubmitCategory(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                            >
                              <option value="DailyReport">Daily Report</option>
                              <option value="SiteReport">Site Report</option>
                              <option value="InspectionReport">Inspection Report</option>
                              <option value="EquipmentData">Equipment Data</option>
                              <option value="MaterialData">Material Data</option>
                              <option value="Measurements">Measurements</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('submissionTitle')}</label>
                          <input
                            type="text"
                            value={submitTitle}
                            onChange={(e) => setSubmitTitle(e.target.value)}
                            placeholder="e.g. Soil Foundation Settlement - Sector A"
                            required
                            className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">{t('dataPayload')}</label>
                          <textarea
                            value={submitPayload}
                            onChange={(e) => setSubmitPayload(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 bg-white border border-sky-100 rounded-xl font-mono text-xs text-emerald-600"
                          />
                        </div>

                        {/* File Upload Dropzone (Prompt 20) */}
                        <div className="border-2 border-dashed border-sky-100 hover:border-mti-300 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/70">
                          <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                          <div className="text-xs text-slate-600 font-medium">{t('attachFiles')}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{t('attachSubtext')}</div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {t('submitReportBtn')}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Approved Records (Immutable) */}
                  <div className="glow-card p-5 rounded-2xl space-y-3">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      {t('approvedHistoryTitle')}
                    </h3>

                    {approvedRecords.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">{t('noApprovedRecords')}</p>
                    ) : (
                      <div className="divide-y divide-sky-100">
                        {(Array.isArray(approvedRecords) ? approvedRecords : []).map((r) => (
                          <div
                            key={r.id}
                            onClick={() => setDrawerData({ title: r.title, type: 'Approved Data', details: r })}
                            className="py-3 flex items-center justify-between hover:bg-white/80 px-2 rounded-lg cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600">
                                  {r.category}
                                </span>
                                <span className="font-semibold text-slate-800 text-xs">{r.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Submitter: {r.submitterName} &bull; Approved: {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-emerald-600 font-medium">
                              Immutable (v{r.version})
                            </span>
                          </div>
                        ))}
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
                      <h3 className="text-sm font-bold text-slate-800">{t('tasksBoardTitle')}</h3>
                      <p className="text-xs text-slate-400">{t('tasksBoardSubtitle')}</p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setShowNewTaskModal(true)}
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
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-mti-600">
                            {task.taskNumber}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              task.priority === 'Urgent' || task.priority === 'High'
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-800 text-sm">{task.title}</div>
                        <div className="text-xs text-slate-400">
                          Project: <span className="text-slate-600">{task.projectName || 'Active'}</span>
                        </div>

                        <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
                          <div className="text-[11px] text-slate-400">
                            Assigned: <span className="text-slate-800 font-medium">{task.assignedToName || 'Field Engineer'}</span>
                          </div>

                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="px-2 py-1 bg-white border border-sky-100 rounded-lg text-xs text-slate-700"
                          >
                            <option value="ToDo">To Do</option>
                            <option value="InProgress">In Progress</option>
                            <option value="UnderReview">Under Review</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 h-[700px] glass-panel rounded-2xl border border-sky-100 overflow-hidden shadow-xl">
                  {/* Left Conversations Pane */}
                  <div className="md:col-span-1 border-r border-sky-100 flex flex-col bg-sky-50/50">
                    <div className="p-3.5 border-b border-sky-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 text-sky-600" />
                          <span>{t('conversations')}</span>
                        </h3>
                        <span className="text-[10px] text-slate-400">
                          {conversations.length} {lang === 'ar' ? 'محادثات نشطة' : 'active chats'}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowNewChatModal(true)}
                        className="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        title={t('startChat')}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('startChat')}</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {conversations.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                          <MessageSquare className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                          <p>{t('noConversationsFound')}</p>
                          <button
                            onClick={() => setShowNewChatModal(true)}
                            className="text-xs text-sky-600 font-semibold hover:underline"
                          >
                            {t('startChat')}
                          </button>
                        </div>
                      ) : (
                        conversations.map((c) => {
                          const otherMember = c.members.find((m) => m.userId !== currentUser.id);
                          const isSelected = activeConversation?.id === c.id;
                          return (
                            <div
                              key={c.id}
                              onClick={() => openConversation(c)}
                              className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                                isSelected
                                  ? 'bg-sky-600/20 border border-sky-500/40 text-slate-800 shadow-sm'
                                  : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                              }`}
                            >
                              <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center font-bold text-xs text-sky-600 flex-shrink-0">
                                {(otherMember?.userName || 'C')[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-xs text-slate-800 truncate">
                                    {c.title || otherMember?.userName || 'Direct Chat'}
                                  </span>
                                  {c.unreadCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-slate-800 text-[10px] font-bold">
                                      {c.unreadCount}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {c.lastMessage?.content || 'No messages yet'}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Message Stream Pane */}
                  <div className="md:col-span-2 flex flex-col bg-sky-50/60">
                    {activeConversation ? (
                      <>
                        {/* Conversation Top Header */}
                        <div className="p-3.5 border-b border-sky-100 flex items-center justify-between bg-white/80">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center font-bold text-xs text-sky-600">
                              {(activeConversation.title ||
                                activeConversation.members.find((m) => m.userId !== currentUser.id)?.userName ||
                                'C')[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">
                                {activeConversation.title ||
                                  activeConversation.members.find((m) => m.userId !== currentUser.id)?.userName ||
                                  'Direct Chat'}
                              </h4>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>{t('online')}</span>
                                <span>&bull;</span>
                                <span className="font-mono text-[9px] text-sky-600">SignalR Real-Time Sync</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Messages Stream */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {chatMessages.map((m) => {
                            const isMe = m.senderUserId === currentUser.id;
                            const isRead =
                              (m.readStates && m.readStates.some((rs) => rs.userId !== currentUser.id)) ||
                              m.deliveryStatus === 'read';
                            const isDelivered =
                              isRead || m.isDelivered || deliveredMessageIds.has(m.id) || m.deliveryStatus === 'delivered';

                            return (
                              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="text-[10px] text-slate-500 mb-0.5 px-1">{m.senderName}</div>
                                <div
                                  className={`p-3 rounded-2xl max-w-sm sm:max-w-md text-xs space-y-1.5 shadow-md ${
                                    isMe
                                      ? 'bg-sky-600 text-white rounded-br-xs'
                                      : 'bg-white border border-sky-100 text-slate-800 rounded-bl-xs'
                                  }`}
                                >
                                  <p className="leading-relaxed break-words">{m.content}</p>
                                  {m.isEdited && <span className="text-[9px] opacity-70 italic block">(edited)</span>}

                                  {/* WhatsApp Style Timestamp & Delivery Checkmarks */}
                                  <div
                                    className={`flex items-center gap-1 text-[10px] ${
                                      isMe ? 'justify-end text-sky-100/70' : 'justify-end text-slate-400'
                                    }`}
                                  >
                                    <span>
                                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {isMe && (
                                      <span className="inline-flex items-center ml-0.5">
                                        {m.deliveryStatus === 'sending' ? (
                                          <span title={t('chatStatusSending')} className="inline-flex items-center">
                                            <Clock className="w-3 h-3 text-slate-600 animate-spin" />
                                          </span>
                                        ) : m.deliveryStatus === 'failed' ? (
                                          <span
                                            onClick={() => handleSendMessage({ preventDefault: () => {} } as any)}
                                            title={t('chatStatusFailed')}
                                            className="inline-flex items-center cursor-pointer text-rose-600"
                                          >
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                          </span>
                                        ) : isRead ? (
                                          <span title={t('chatStatusRead')} className="inline-flex items-center">
                                            <CheckCheck className="w-3.5 h-3.5 text-sky-600 filter drop-shadow-[0_0_4px_rgba(56,189,248,0.9)]" />
                                          </span>
                                        ) : isDelivered ? (
                                          <span title={t('chatStatusDelivered')} className="inline-flex items-center">
                                            <CheckCheck className="w-3.5 h-3.5 text-slate-600" />
                                          </span>
                                        ) : (
                                          <span title={t('chatStatusSent')} className="inline-flex items-center">
                                            <Check className="w-3.5 h-3.5 text-slate-600" />
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Reactions */}
                                <div className="flex items-center gap-2 mt-1 px-1">
                                  <button
                                    onClick={() => handleToggleReaction(m.id, 'thumbs_up')}
                                    className="text-[10px] text-slate-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    {m.reactions && m.reactions.length > 0 && <span>{m.reactions.length}</span>}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Send Message Form */}
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-sky-100 flex items-center gap-2 bg-white/30">
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder={t('typeMessagePlaceholder')}
                            className="flex-1 px-3.5 py-2.5 bg-white border border-sky-100 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 transition-colors"
                          />
                          <button
                            type="submit"
                            className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-800 transition-colors shadow-sm flex-shrink-0"
                            title={t('send')}
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-3">
                        <MessageSquare className="w-12 h-12 text-slate-600 opacity-40 mx-auto" />
                        <p>{t('noConversationsFound')}</p>
                        <button
                          onClick={() => setShowNewChatModal(true)}
                          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-slate-800 text-xs font-semibold transition-colors"
                        >
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
                        <h3 className="text-sm font-display font-bold text-slate-800">{t('usersDirectory')}</h3>
                        <p className="text-xs text-slate-400">{t('usersSubtitle')}</p>
                      </div>

                      <button
                        onClick={() => setShowNewUserModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t('provisionUser')}
                      </button>
                    </div>

                    <div className="glow-card rounded-2xl overflow-x-auto">
                      <table className="w-full text-start text-xs text-slate-600 min-w-[650px]">
                        <thead className="bg-slate-50 border-b border-sky-100 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="p-3 text-start">{t('userColName')}</th>
                            <th className="p-3 text-start">{t('userColJobTitle')}</th>
                            <th className="p-3 text-start">{t('userColEmail')}</th>
                            <th className="p-3 text-start">{t('userColRole')}</th>
                            <th className="p-3 text-start">{t('userColStatus')}</th>
                            <th className="p-3 text-end">{t('userColActions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-100">
                          {userList.map((u) => (
                            <tr key={u.id} className="hover:bg-white/80 transition-colors">
                              <td className="p-3 font-semibold text-slate-800">
                                {u.firstName} {u.lastName}
                              </td>
                              <td className="p-3 text-sky-600 font-medium">
                                {u.jobTitle || '—'}
                              </td>
                              <td className="p-3 text-slate-400 font-mono text-[11px]">{u.email}</td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-mti-600">
                                  {u.roles?.join(', ') || 'Engineer'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded ${u.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                                  {u.isActive ? t('statusActive') : t('statusDisabled')}
                                </span>
                              </td>
                              <td className="p-3 text-end space-x-2 rtl:space-x-reverse">
                                <button
                                  onClick={async () => {
                                    const newPass = prompt(lang === 'ar' ? 'أدخل كلمة المرور الجديدة للمستخدم:' : 'Enter new password for user:');
                                    if (newPass) {
                                      await dashboardService.resetPassword(u.id, newPass);
                                      alert(lang === 'ar' ? 'تم إعادة تعيين كلمة المرور بنجاح.' : 'Password successfully reset.');
                                    }
                                  }}
                                  className="text-[11px] text-amber-600 hover:underline"
                                >
                                  {t('actionResetPass')}
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(lang === 'ar' ? `هل أنت متأكد من تعطيل حساب ${u.email}؟` : `Deactivate ${u.email}?`)) {
                                      await dashboardService.deleteUser(u.id);
                                      const updated = await dashboardService.getUsers();
                                      setUserList(updated);
                                    }
                                  }}
                                  className="text-[11px] text-rose-600 hover:underline"
                                >
                                  {t('actionDeactivate')}
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
                      <h3 className="text-sm font-bold text-slate-800">{t('auditTitle')}</h3>
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
                      className="px-3 py-1.5 bg-white border border-sky-100 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <div className="glow-card rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead className="bg-slate-50 border-b border-sky-100 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">{t('auditColTime')}</th>
                          <th className="p-3">{t('auditColAction')}</th>
                          <th className="p-3">{t('auditColEntity')}</th>
                          <th className="p-3">{t('auditColUser')}</th>
                          <th className="p-3">{t('auditColIp')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sky-100">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/80">
                            <td className="p-3 text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="p-3 font-semibold text-slate-800">{log.action}</td>
                            <td className="p-3 text-slate-600">
                              {log.entityType} ({log.entityId?.substring(0, 8)}...)
                            </td>
                            <td className="p-3 text-slate-400">{log.userEmail || 'System'}</td>
                            <td className="p-3 text-[11px] text-slate-500 font-mono">{log.ipAddress || '127.0.0.1'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* VIEW: SETTINGS & SAFE RUNTIME TELEMETRY */}
              {/* ======================================================== */}
              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{t('settingsTitle')}</h3>
                    <p className="text-xs text-slate-400">{t('settingsSubtitle')}</p>
                  </div>

                  {safeConfig && (
                    <div className="glow-card p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs text-slate-400">{t('appNameField')}</span>
                        <span className="text-xs font-semibold text-slate-800">{safeConfig.appName}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs text-slate-400">{t('environmentField')}</span>
                        <span className="text-xs font-semibold text-emerald-600">{safeConfig.environment}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs text-slate-400">{t('signalRPathField')}</span>
                        <span className="text-xs font-mono text-mti-600">{safeConfig.signalR?.hubPath}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs text-slate-400">{t('signalREnabledField')}</span>
                        <span className="text-xs font-semibold text-emerald-600">
                          {safeConfig.signalR?.enabled ? 'True' : 'False'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                        <span className="text-xs text-slate-400">{t('signalRUrlField')}</span>
                        <span className="text-xs font-mono text-emerald-600">
                          {safeConfig.signalR?.hubUrl || 'https://mtiapi.runasp.net/hubs/project'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-sky-100 text-[11px] text-slate-400 space-y-1">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
                      <h3 className="text-sm font-display font-bold text-slate-800 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-mti-600" />
                        Real-Time Notifications
                      </h3>
                      <p className="text-xs text-slate-400">
                        Live SignalR instant notifications &bull; Auto-syncs across users and sites
                      </p>
                    </div>

                    {notificationsList.some((n) => !n.isRead) && (
                      <button
                        onClick={async () => {
                          await notificationService.markAllAsRead();
                          setNotificationsList((prev) => prev.map((n) => ({ ...n, isRead: true })));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-white/[0.08] border border-sky-100 text-xs text-slate-700 transition-colors"
                      >
                        Mark All as Read
                      </button>
                    )}
                  </div>

                  <div className="glass-panel rounded-2xl border border-sky-100 overflow-hidden divide-y divide-sky-100">
                    {notificationsList.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500">
                        <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                        No notifications yet. New live events from SignalR will appear here instantly.
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
                          className={`p-4 transition-colors flex items-start gap-3.5 cursor-pointer ${
                            notif.isRead ? 'bg-transparent hover:bg-white/30' : 'bg-mti-500/[0.05] hover:bg-mti-500/[0.08]'
                          }`}
                        >
                          <div
                            className={`p-2 rounded-xl border flex-shrink-0 ${
                              notif.isRead
                                ? 'bg-slate-100 border-sky-200 text-slate-400'
                                : 'bg-mti-100 border-mti-200 text-mti-600 shadow-md shadow-mti-500/10'
                            }`}
                          >
                            <Radio className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-xs font-semibold ${notif.isRead ? 'text-slate-600' : 'text-slate-800'}`}>
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
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-400 border border-sky-200 uppercase tracking-wider font-semibold">
                                {notif.type}
                              </span>
                              {!notif.isRead && (
                                <span className="text-[9px] text-emerald-600 font-medium flex items-center gap-1">
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
            </>
          )}
        </main>
      </div>

      {/* 3. ENTERPRISE INSPECTION DRAWER (Prompt 20) */}
      {drawerData && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={() => setDrawerData(null)} />
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-sky-50 border-l border-sky-100 p-6 flex flex-col shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-mti-600">
                  {drawerData.type}
                </span>
                <h3 className="font-bold text-slate-800 text-base mt-1">{drawerData.title}</h3>
              </div>
              <button onClick={() => setDrawerData(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-600">
              <pre className="p-3 rounded-xl bg-white border border-sky-100 font-mono text-[11px] text-emerald-600 overflow-x-auto">
                {JSON.stringify(drawerData.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION DIALOG (Prompt 20) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-sky-100 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-600">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-slate-800 text-xs font-semibold ${
                  confirmDialog.confirmColor || 'bg-mti-600 hover:bg-mti-500'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. NEW PROJECT MODAL */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-sky-100 shadow-xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">{t('createProject')}</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('projectCode')}</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="PRJ-2026-ALEX"
                  required
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('projectName')}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Alexandria Port Hub"
                  required
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('clientName')}</label>
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Port Authority"
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('description')}</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-white text-slate-600 text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mti-600 text-white text-xs font-semibold"
                >
                  {t('createProject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. NEW TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-sky-100 shadow-xl">
            <h3 className="text-base font-bold text-slate-800 mb-4">{t('createTask')}</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('taskTitle')}</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Excavate foundation row B"
                  required
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('priority')}</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                >
                  <option value="Low">{t('priorityLow')}</option>
                  <option value="Medium">{t('priorityMedium')}</option>
                  <option value="High">{t('priorityHigh')}</option>
                  <option value="Urgent">{t('priorityUrgent')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-white text-slate-600 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mti-600 text-white text-xs font-semibold"
                >
                  {t('createTask')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. NEW USER MODAL */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-sky-100 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">{t('createCorporateUser')}</h3>
              <button
                type="button"
                onClick={() => setShowNewUserModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 transition-colors"
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
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">{t('lastName')}</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('jobTitle')}</label>
                <input
                  type="text"
                  value={newUserJobTitle}
                  onChange={(e) => setNewUserJobTitle(e.target.value)}
                  placeholder={t('jobTitlePlaceholder')}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('corporateEmail')}</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="field.engineer@mti.com"
                  required
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('initialPassword')}</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">{t('roleAssignment')}</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-slate-700 text-xs"
                >
                  <option value="Engineer">{t('userRoleEngineer')}</option>
                  <option value="ProjectManager">{t('userRolePM')}</option>
                  <option value="Admin">{t('userRoleAdmin')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  {t('provisionUser')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Start Direct Chat Modal / User Search */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-sky-50 border border-sky-100 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-sm">{t('startChat')}</h3>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={chatSearchUser}
                onChange={(e) => setChatSearchUser(e.target.value)}
                placeholder={t('searchUsersChat')}
                autoFocus
                className="w-full ps-9 pe-4 py-2.5 bg-white/90 border border-sky-100 rounded-xl text-slate-800 text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Contacts list */}
            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {loadingContacts ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  <span>{t('loading')}</span>
                </div>
              ) : chatContacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  {lang === 'ar' ? 'لم يتم العثور على مستخدمين بهذا الاسم' : 'No users found'}
                </div>
              ) : (
                chatContacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => handleStartDirectChat(contact)}
                    className="p-3 rounded-xl bg-sky-50/80 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center font-bold text-xs text-sky-600 flex-shrink-0">
                        {(contact.fullName || 'U')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800 group-hover:text-sky-600 transition-colors truncate">
                            {contact.fullName}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 border border-sky-200 text-slate-600 font-mono flex-shrink-0">
                            {contact.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {contact.jobTitle && (
                            <span className="text-sky-600/90 font-medium truncate">
                              {contact.jobTitle}
                            </span>
                          )}
                          {contact.jobTitle && <span className="text-slate-600">&bull;</span>}
                          <span className="text-slate-500 truncate">{contact.email}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDirectChat(contact);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors flex-shrink-0 shadow-sm"
                    >
                      <span>{t('startChat')}</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-sky-100">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 text-xs transition-colors"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              className={`p-3.5 rounded-2xl border shadow-xl backdrop-blur-xl pointer-events-auto cursor-pointer transition-all hover:scale-[1.02] flex items-start gap-3 animate-fade-up ${
                toast.type === 'chat'
                  ? 'bg-sky-950/90 border-sky-500/40 text-sky-100'
                  : toast.type === 'task'
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                  : 'bg-sky-50/90 border-sky-100 text-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  toast.type === 'chat'
                    ? 'bg-sky-500/20 text-sky-600'
                    : toast.type === 'task'
                    ? 'bg-amber-50 text-amber-600'
                    : 'bg-mti-100 text-mti-600'
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
                <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="text-slate-400 hover:text-slate-800 p-1 rounded-lg transition-colors flex-shrink-0"
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
