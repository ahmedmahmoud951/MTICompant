'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { authService } from '@/services/auth.service';
import { projectService, siteService } from '@/services/project.service';
import { signalRService } from '@/services/signalr.service';
import { chatService } from '@/services/chat.service';
import { dashboardService } from '@/services/dashboard.service';
import { dataRecordService } from '@/services/data-records.service';
import { taskService } from '@/services/task.service';
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
  SystemSafeConfig
} from '@/types';
import {
  Building2,
  ShieldCheck,
  Radio,
  HardHat,
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
  Sparkles,
  Activity,
  Briefcase
} from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Real-Time Chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');

  // User Management
  const [userList, setUserList] = useState<any[]>([]);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Engineer');
  const [showNewUserModal, setShowNewUserModal] = useState(false);

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
        conn.on('MessageSent', (msg: Message) => {
          setChatMessages((prev) => [...prev, msg]);
        });
        conn.on('MessageReactionAdded', () => {
          if (activeConversation) loadMessages(activeConversation.id);
        });
        conn.on('MessageReactionRemoved', () => {
          if (activeConversation) loadMessages(activeConversation.id);
        });
        conn.on('MessageRead', () => {
          if (activeConversation) loadMessages(activeConversation.id);
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
      chatService.getConversations().then(setConversations).catch(() => {});
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

  const quickLogin = (loginEmail: string, loginPass: string) => {
    setEmail(loginEmail);
    setPassword(loginPass);
    authService.login(loginEmail, loginPass).then((res) => {
      if (res.success && res.data) {
        setCurrentUser(res.data.user);
        loadInitialData(res.data.user);
        initSignalR();
      } else {
        setErrorMsg(res.message || 'Login failed');
      }
    });
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
    if (!activeConversation || !newMessageText.trim()) return;
    const txt = newMessageText.trim();
    setNewMessageText('');
    try {
      const sent = await chatService.sendMessage(activeConversation.id, txt);
      setChatMessages((prev) => [...prev, sent]);
    } catch (err: any) {
      alert(err?.message || 'Failed to send message');
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
      title: 'Approve Submission',
      message: `Are you sure you want to approve "${record.title}" from ${record.submitterName}? Once approved, this record becomes permanent and immutable.`,
      confirmText: 'Approve Record',
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
      title: 'Reject Submission',
      message: `Are you sure you want to reject "${record.title}"? Please provide a clear audit reason.`,
      confirmText: 'Reject Record',
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
      title: 'Request Changes',
      message: `Return "${record.title}" back to ${record.submitterName} with modification instructions.`,
      confirmText: 'Request Changes',
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
        role: newUserRole
      });
      setShowNewUserModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewUserEmail('');
      setNewUserPassword('');
      const users = await dashboardService.getUsers();
      setUserList(users);
      alert('User provisioned successfully.');
    } catch (err: any) {
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

  // Export CSV Helper
  const downloadCsv = (entityType: string) => {
    const token = localStorage.getItem('mti_access_token');
    window.open(`http://localhost:5241/api/reports/export?entityType=${entityType}&access_token=${token}`, '_blank');
  };

  // -------------------------------------------------------------
  // Unauthenticated Login Screen
  // -------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="login-canvas min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center animate-fade-up">
          <div className="icon-badge mx-auto mb-5 h-16 w-16">
            <Building2 className="w-8 h-8" strokeWidth={1.6} />
          </div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-mti-300/80 mb-2 font-semibold">MTI Platform</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineering Solutions
          </h2>
          <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
            Site monitoring, approvals, and field coordination — calm, clear, and always in sync.
          </p>
        </div>

        <div className="mt-9 sm:mx-auto sm:w-full sm:max-w-md animate-fade-up-delay">
          <div className="glass-panel-strong py-8 px-6 rounded-3xl sm:px-9">
            {errorMsg && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-400/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Corporate Email or Username</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mti.com"
                  required
                  className="field-input block w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="field-input block w-full px-3.5 py-2.5 rounded-xl text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-mti-500 hover:bg-mti-400 text-white font-semibold text-sm transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Sign In to Platform
              </button>
            </form>

            <div className="mt-7 pt-6 border-t border-white/8">
              <div className="text-[11px] text-slate-400 mb-3 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-mti-400" />
                Quick persona sign-in
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => quickLogin('admin', 'admin')}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left text-xs transition-all glass-panel-hover"
                >
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-mti-400" />
                    System Admin
                  </div>
                  <div className="text-[10px] text-mti-300/90 font-mono mt-1">admin / admin</div>
                </button>
                <button
                  type="button"
                  onClick={() => quickLogin('engineer@mti.com', 'Engineer@MTI2026!')}
                  className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left text-xs transition-all glass-panel-hover"
                >
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-300" />
                    Field Engineer
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">engineer@mti.com</div>
                </button>
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
  const adminMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'sites', label: 'Sites', icon: MapPin },
    { id: 'engineers', label: 'Users', icon: Users },
    { id: 'project-data', label: 'Project Data', icon: FileSpreadsheet },
    { id: 'approvals', label: 'Approvals', icon: FileCheck, badge: pendingRecords.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'audit', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const engineerMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-projects', label: 'My Projects', icon: FolderKanban },
    { id: 'my-sites', label: 'My Sites', icon: MapPin },
    { id: 'my-data', label: 'My Data', icon: FileSpreadsheet },
    { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: UserCircle }
  ];

  const menuItems: MenuItem[] = isAdmin ? adminMenuItems : engineerMenuItems;

  // -------------------------------------------------------------
  // Authenticated Desktop-First Enterprise Layout (Prompt 20)
  // -------------------------------------------------------------
  return (
    <div className="app-shell min-h-screen text-slate-100 flex font-body overflow-hidden">
      {/* 1. DESKTOP SIDEBAR */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-[4.75rem]' : 'w-64'
        } glass-nav flex flex-col transition-all duration-300 ease-in-out z-30`}
      >
        {/* Sidebar Header / Logo */}
        <div className="p-4 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="icon-badge h-10 w-10 flex-shrink-0">
              <Building2 className="w-5 h-5" strokeWidth={1.7} />
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="font-display font-bold text-white text-sm leading-tight truncate">MTI Solutions</div>
                <div className="text-[10px] text-slate-400 tracking-wide">Enterprise Platform</div>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
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
                  if (item.id === 'my-projects' || item.id === 'projects') loadProjects();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isCurrent
                    ? 'nav-item-active'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
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
        <div className="p-3 border-t border-white/8 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-mti-500/20 border border-mti-400/30 flex items-center justify-center font-bold text-xs text-mti-200 flex-shrink-0">
                {currentUser.firstName[0]}
                {currentUser.lastName[0]}
              </div>
              {!sidebarCollapsed && (
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-white truncate">{currentUser.fullName}</div>
                  <div className="text-[10px] text-mti-300 truncate">{currentUser.roles.join(', ')}</div>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 glass-topbar px-6 flex items-center justify-between z-20">
          <form onSubmit={handleGlobalSearch} className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Search projects, sites, tasks, reports..."
              className="field-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-[11px]">
              <Radio className={`w-3 h-3 ${signalRConnected ? 'text-emerald-400 status-dot-live' : 'text-amber-300'}`} />
              <span className={signalRConnected ? 'text-emerald-300 font-medium' : 'text-amber-200'}>
                {signalRConnected ? 'Live Sync' : 'Connecting'}
              </span>
            </div>

            <button
              onClick={() => setActiveTab('notifications')}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-slate-300 relative transition-colors"
            >
              <Bell className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </header>

        {/* Global Search Results Modal */}
        {searchResults !== null && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-6 pt-20">
            <div className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-mti-400" />
                  Search Results for &ldquo;{globalSearchQuery}&rdquo; ({searchResults.length})
                </h3>
                <button onClick={() => setSearchResults(null)} className="text-slate-400 hover:text-white">
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
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-mti-500/40 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-mti-400 mr-2">
                          {item.type}
                        </span>
                        <span className="font-semibold text-white">{item.title}</span>
                        {item.subtitle && <p className="text-slate-400 text-[11px] mt-0.5">{item.subtitle}</p>}
                      </div>
                      {item.status && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
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
              <div className="h-8 bg-slate-800/60 rounded-xl w-1/4"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
                <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
                <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
                <div className="h-24 bg-slate-800/60 rounded-2xl"></div>
              </div>
              <div className="h-64 bg-slate-800/60 rounded-2xl"></div>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* VIEW: DASHBOARD */}
              {/* ======================================================== */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display text-xl font-bold text-white">
                        {isAdmin ? 'Executive Administration Dashboard' : 'Field Engineer Operational Space'}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        {isAdmin
                          ? 'Central monitoring, approvals, tasks, and audit activity'
                          : 'Assigned construction sites, pending milestones, and submitted records'}
                      </p>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => downloadCsv('ProjectData')}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-mti-400" />
                          Export Data CSV
                        </button>
                        <button
                          onClick={() => downloadCsv('Tasks')}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-mti-400" />
                          Export Tasks CSV
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Cards / KPI Metrics */}
                  {isAdmin && adminStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">Total Projects</div>
                          <div className="kpi-icon text-mti-300"><Briefcase className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-white">{adminStats.totalProjects}</div>
                        <div className="text-[11px] text-emerald-400 mt-1">{adminStats.activeProjects} Active</div>
                      </div>
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">Monitored Sites</div>
                          <div className="kpi-icon text-teal-300"><MapPin className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-white">{adminStats.totalSites}</div>
                        <div className="text-[11px] text-mti-300 mt-1">{adminStats.totalEngineers} Active Engineers</div>
                      </div>
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">Pending Approvals</div>
                          <div className="kpi-icon text-amber-300"><FileCheck className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-amber-300">{adminStats.pendingApprovals}</div>
                        <div className="text-[11px] text-slate-400 mt-1">{adminStats.approvedData} Approved Records</div>
                      </div>
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">Open Tasks</div>
                          <div className="kpi-icon text-sky-300"><Activity className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-white">{adminStats.openTasks}</div>
                        <div className="text-[11px] text-rose-300 mt-1">{adminStats.overdueTasks} Overdue</div>
                      </div>
                    </div>
                  )}

                  {!isAdmin && engineerStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">My Assigned Projects</div>
                          <div className="kpi-icon text-mti-300"><FolderKanban className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-white">{engineerStats.myProjectsCount}</div>
                        <div className="text-[11px] text-mti-300 mt-1">{engineerStats.mySitesCount} Sites</div>
                      </div>
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">My Pending Tasks</div>
                          <div className="kpi-icon text-sky-300"><CheckSquare className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-white">{engineerStats.pendingTasksCount}</div>
                        <div className="text-[11px] text-emerald-400 mt-1">{engineerStats.completedTasksCount} Completed</div>
                      </div>
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">Overdue Tasks</div>
                          <div className="kpi-icon text-rose-300"><AlertCircle className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-rose-300">{engineerStats.overdueTasksCount}</div>
                        <div className="text-[11px] text-slate-400 mt-1">Requires immediate completion</div>
                      </div>
                      <div className="glass-panel glass-panel-hover p-4 rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-slate-400 text-xs">Approved Records</div>
                          <div className="kpi-icon text-emerald-300"><FileCheck className="w-4 h-4" /></div>
                        </div>
                        <div className="font-display text-2xl font-bold text-emerald-300">{engineerStats.approvedDataCount}</div>
                        <div className="text-[11px] text-amber-300 mt-1">{engineerStats.pendingDataCount} Under Review</div>
                      </div>
                    </div>
                  )}

                  {/* Operational Project Monitoring */}
                  <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-mti-400" />
                      Active Monitored Projects
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            selectProject(p.id);
                            setDrawerData({ title: p.name, type: 'Project', details: p });
                          }}
                          className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-mti-400/40 cursor-pointer transition-all space-y-2 glass-panel-hover"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-mti-500/15 text-mti-300">
                              {p.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-emerald-300">
                              {p.status}
                            </span>
                          </div>
                          <div className="font-semibold text-white text-sm">{p.name}</div>
                          <div className="text-xs text-slate-400">{p.clientName}</div>
                          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/8 flex items-center justify-between">
                            <span>{p.totalSitesCount} Sites Monitored</span>
                            <span className="text-mti-300 flex items-center gap-0.5 font-medium">
                              Inspect <ChevronRight className="w-3 h-3" />
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
                  <div className="lg:col-span-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Projects Roster</h3>
                      {isAdmin && (
                        <button
                          onClick={() => setShowNewProjectModal(true)}
                          className="p-1.5 rounded-lg bg-mti-600 hover:bg-mti-500 text-white text-xs flex items-center gap-1 font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          New Project
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
                              ? 'bg-slate-900 border-mti-500 shadow-lg shadow-mti-900/20'
                              : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-mti-400">
                              {proj.code}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400">
                              {proj.status}
                            </span>
                          </div>
                          <div className="font-semibold text-white text-sm mt-1">{proj.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{proj.clientName}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-white">Sites Under Project</h3>
                    {loadingSites ? (
                      <div className="p-8 text-center text-xs text-slate-500">Loading sites...</div>
                    ) : selectedProjectSites.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
                        No sites assigned or active for this project yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedProjectSites.map((site) => (
                          <div key={site.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-300">
                                {site.code}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">{site.status}</span>
                            </div>
                            <div className="font-semibold text-white text-sm">{site.name}</div>
                            <p className="text-xs text-slate-400">{site.description}</p>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{site.address || 'GPS Coordinates Set'}</span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-800 text-[11px]">
                              <div className="text-slate-400 font-medium mb-1">Assigned Field Engineers:</div>
                              {site.assignments && site.assignments.length > 0 ? (
                                <div className="space-y-1">
                                  {site.assignments.map((a) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between text-slate-300 bg-slate-950/60 px-2 py-1 rounded-md border border-slate-800/80"
                                    >
                                      <span>{a.engineerName}</span>
                                      <span className="text-[10px] text-mti-400 font-medium">{a.role}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-slate-500 italic">No engineers assigned yet.</div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Dedicated Approval Center</h3>
                      <p className="text-xs text-slate-400">Review submitted data sheets, inspections, and evidence</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {pendingRecords.length} Pending Review
                    </span>
                  </div>

                  {pendingRecords.length === 0 ? (
                    <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-xs text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      All engineer submissions have been reviewed and approved!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingRecords.map((r) => (
                        <div key={r.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {r.category}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">v{r.version}</span>
                              </div>
                              <h4 className="font-semibold text-white text-sm mt-1">{r.title}</h4>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Project: <span className="text-slate-200">{r.projectName}</span> &bull; Site:{' '}
                                <span className="text-slate-200">{r.siteName}</span>
                              </div>
                            </div>

                            <div className="text-right text-xs text-slate-400">
                              <div>Submitted by: <span className="text-white font-medium">{r.submitterName}</span></div>
                              <div className="text-[11px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
                            </div>
                          </div>

                          {r.dataPayloadJson && (
                            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                              <pre>{r.dataPayloadJson}</pre>
                            </div>
                          )}

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
                            <input
                              type="text"
                              value={approvalComment}
                              onChange={(e) => setApprovalComment(e.target.value)}
                              placeholder="Review comments / rejection reasons / modification guidance..."
                              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-mti-500"
                            />

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => promptRequestChanges(r)}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                              >
                                Request Changes
                              </button>
                              <button
                                onClick={() => promptReject(r)}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => promptApprove(r)}
                                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                              >
                                Approve
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
                    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        <Upload className="w-4 h-4 text-mti-400" />
                        Submit New Field Report / Operational Data
                      </h3>

                      {submitSuccess && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>{submitSuccess}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmitData} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Target Project</label>
                            <select
                              value={selectedProjectId || ''}
                              onChange={(e) => selectProject(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                            >
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} - {p.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">Data Category</label>
                            <select
                              value={submitCategory}
                              onChange={(e) => setSubmitCategory(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
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
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Submission Title</label>
                          <input
                            type="text"
                            value={submitTitle}
                            onChange={(e) => setSubmitTitle(e.target.value)}
                            placeholder="e.g. Soil Foundation Settlement - Sector A"
                            required
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Data Payload (JSON / Key-Values)</label>
                          <textarea
                            value={submitPayload}
                            onChange={(e) => setSubmitPayload(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-emerald-400"
                          />
                        </div>

                        {/* File Upload Dropzone (Prompt 20) */}
                        <div className="border-2 border-dashed border-slate-800 hover:border-mti-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-950/40">
                          <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                          <div className="text-xs text-slate-300 font-medium">Attach Images, Documents, or Sheets</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">B2 Private Storage &bull; PDF, JPG, PNG, XLSX up to 100MB</div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Submit Data Record
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Approved Records (Immutable) */}
                  <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      Approved Historical Records (Permanent & Immutable)
                    </h3>

                    {approvedRecords.length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No approved records available.</p>
                    ) : (
                      <div className="divide-y divide-slate-800/60">
                        {approvedRecords.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => setDrawerData({ title: r.title, type: 'Approved Data', details: r })}
                            className="py-3 flex items-center justify-between hover:bg-slate-900/40 px-2 rounded-lg cursor-pointer"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  {r.category}
                                </span>
                                <span className="font-semibold text-white text-xs">{r.title}</span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Submitter: {r.submitterName} &bull; Approved: {r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : 'N/A'}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-medium">
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
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Operational Tasks Board</h3>
                      <p className="text-xs text-slate-400">Milestone assignments, due dates, and evidence completion</p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => setShowNewTaskModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Create Task
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-mti-400">
                            {task.taskNumber}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              task.priority === 'Urgent' || task.priority === 'High'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="font-semibold text-white text-sm">{task.title}</div>
                        <div className="text-xs text-slate-400">
                          Project: <span className="text-slate-300">{task.projectName || 'Active'}</span>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <div className="text-[11px] text-slate-400">
                            Assigned: <span className="text-white font-medium">{task.assignedToName || 'Field Engineer'}</span>
                          </div>

                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
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
              {activeTab === 'chat' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[650px] glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                  {/* Left Conversations Pane */}
                  <div className="md:col-span-1 border-r border-slate-800 flex flex-col bg-slate-950/40">
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-white text-xs">Direct Conversations</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-mti-400 font-semibold">
                        {conversations.length} Active
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {conversations.map((c) => {
                        const otherMember = c.members.find((m) => m.userId !== currentUser.id);
                        const isSelected = activeConversation?.id === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => openConversation(c)}
                            className={`p-3 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-mti-600/20 border border-mti-500/40 text-white'
                                : 'hover:bg-slate-900 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-white">
                                {c.title || otherMember?.userName || 'Direct Chat'}
                              </span>
                              {c.unreadCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-mti-600 text-white text-[10px] font-bold">
                                  {c.unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-1">
                              {c.lastMessage?.content || 'No messages yet'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Message Stream Pane */}
                  <div className="md:col-span-2 flex flex-col bg-slate-950/20">
                    {activeConversation ? (
                      <>
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-white text-xs">
                              {activeConversation.title ||
                                activeConversation.members.find((m) => m.userId !== currentUser.id)?.userName ||
                                'Direct Chat'}
                            </h4>
                            <div className="text-[10px] text-slate-400">Server-Controlled Read States &bull; SignalR Connected</div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {chatMessages.map((m) => {
                            const isMe = m.senderUserId === currentUser.id;
                            return (
                              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="text-[10px] text-slate-500 mb-0.5">{m.senderName}</div>
                                <div
                                  className={`p-3 rounded-2xl max-w-sm text-xs space-y-1 ${
                                    isMe ? 'bg-mti-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200'
                                  }`}
                                >
                                  <p>{m.content}</p>
                                  {m.isEdited && <span className="text-[9px] opacity-70 italic">(edited)</span>}
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={() => handleToggleReaction(m.id, 'thumbs_up')}
                                    className="text-[10px] text-slate-500 hover:text-amber-400 flex items-center gap-1"
                                  >
                                    <ThumbsUp className="w-3 h-3" />
                                    {m.reactions && m.reactions.length > 0 && <span>{m.reactions.length}</span>}
                                  </button>
                                  {isMe && m.readStates && m.readStates.length > 0 && (
                                    <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Read
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex items-center gap-2">
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={(e) => setNewMessageText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-mti-500"
                          />
                          <button
                            type="submit"
                            className="p-2 rounded-xl bg-mti-600 hover:bg-mti-500 text-white transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500">
                        <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
                        Select a conversation from the left to start communicating securely.
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
                        <h3 className="text-sm font-display font-bold text-white">Users Directory</h3>
                        <p className="text-xs text-slate-400">Provision, deactivate, and assign role permissions</p>
                      </div>

                      <button
                        onClick={() => setShowNewUserModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-mti-600 hover:bg-mti-500 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Provision User
                      </button>
                    </div>

                    <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {userList.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-900/40">
                              <td className="p-3 font-semibold text-white">
                                {u.firstName} {u.lastName}
                              </td>
                              <td className="p-3 text-slate-400">{u.email}</td>
                              <td className="p-3">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-mti-400">
                                  {u.roles?.join(', ') || 'Engineer'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded ${u.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {u.isActive ? 'Active' : 'Disabled'}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  onClick={async () => {
                                    const newPass = prompt('Enter new password for user:');
                                    if (newPass) {
                                      await dashboardService.resetPassword(u.id, newPass);
                                      alert('Password successfully reset.');
                                    }
                                  }}
                                  className="text-[11px] text-amber-400 hover:underline"
                                >
                                  Reset Pass
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Deactivate ${u.email}?`)) {
                                      await dashboardService.deleteUser(u.id);
                                      const updated = await dashboardService.getUsers();
                                      setUserList(updated);
                                    }
                                  }}
                                  className="text-[11px] text-rose-400 hover:underline"
                                >
                                  Deactivate
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
                      <h3 className="text-sm font-bold text-white">Append-Only Enterprise Audit Trail</h3>
                      <p className="text-xs text-slate-400">Tamper-evident logs of all security, project, and data operations</p>
                    </div>

                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        dashboardService.getAuditLogs(1, 20, e.target.value).then((res) => setAuditLogs(res.items));
                      }}
                      placeholder="Filter action, user, entity..."
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">Action</th>
                          <th className="p-3">Entity</th>
                          <th className="p-3">User</th>
                          <th className="p-3">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/40">
                            <td className="p-3 text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                            <td className="p-3 font-semibold text-white">{log.action}</td>
                            <td className="p-3 text-slate-300">
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
                    <h3 className="text-sm font-bold text-white">System Runtime Configuration</h3>
                    <p className="text-xs text-slate-400">Public configuration delivered safely from GET /api/system/config</p>
                  </div>

                  {safeConfig && (
                    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400">Application Name</span>
                        <span className="text-xs font-semibold text-white">{safeConfig.appName}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400">Environment</span>
                        <span className="text-xs font-semibold text-emerald-400">{safeConfig.environment}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400">SignalR Hub Path</span>
                        <span className="text-xs font-mono text-mti-400">{safeConfig.signalR?.hubPath}</span>
                      </div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="text-xs text-slate-400">SignalR Enabled</span>
                        <span className="text-xs font-semibold text-emerald-400">
                          {safeConfig.signalR?.enabled ? 'True' : 'False'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Enterprise Security Hardened
                        </div>
                        <p>
                          Zero database connection strings, JWT signing keys, or Backblaze B2 master secrets are exposed
                          to client devices or browsers.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. ENTERPRISE INSPECTION DRAWER (Prompt 20) */}
      {drawerData && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerData(null)} />
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-slate-950 border-l border-slate-800 p-6 flex flex-col shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-mti-400">
                  {drawerData.type}
                </span>
                <h3 className="font-bold text-white text-base mt-1">{drawerData.title}</h3>
              </div>
              <button onClick={() => setDrawerData(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-300">
              <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                {JSON.stringify(drawerData.details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRMATION DIALOG (Prompt 20) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-sm w-full p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-300">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold ${
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create New Engineering Project</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Project Code</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="PRJ-2026-ALEX"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Project Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Alexandria Port Hub"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Client Name</label>
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Port Authority"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mti-600 text-white text-xs font-semibold"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. NEW TASK MODAL */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Create Site Milestone Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Excavate foundation row B"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Priority</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mti-600 text-white text-xs font-semibold"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. NEW USER MODAL */}
      {showNewUserModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Provision Corporate User</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Corporate Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="field.engineer@mti.com"
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Initial Password</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Role Assignment</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                >
                  <option value="Engineer">Field Engineer</option>
                  <option value="ProjectManager">Project Manager</option>
                  <option value="Admin">System Administrator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewUserModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-mti-600 text-white text-xs font-semibold"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
