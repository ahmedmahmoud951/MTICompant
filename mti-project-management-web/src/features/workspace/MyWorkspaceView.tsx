'use client';

import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  MapPin,
  CheckSquare,
  FileUp,
  MessageSquare,
  Bell,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Plus,
  ArrowRight,
  TrendingUp,
  FileText,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Shield,
  Briefcase
} from 'lucide-react';
import { User, Project, Site, TaskItem, ProjectDataRecord } from '@/types';
import { logger } from '@/lib/logger';

interface MyWorkspaceViewProps {
  currentUser: User;
  projects: Project[];
  allSites: Site[];
  tasks: TaskItem[];
  pendingRecords: ProjectDataRecord[];
  approvedRecords: ProjectDataRecord[];
  totalUnreadMessages?: number;
  unreadNotificationsCount?: number;
  lang: 'ar' | 'en';
  onNavigateTab: (tab: string) => void;
  onEnterProjectWorkspace?: (project: Project) => void;
  onEnterSiteWorkspace?: (site: Site) => void;
  onOpenNewTaskModal?: () => void;
  onToggleTaskStatus?: (task: TaskItem) => void;
  onRefresh?: () => void;
}

export const MyWorkspaceView: React.FC<MyWorkspaceViewProps> = ({
  currentUser,
  projects,
  allSites,
  tasks,
  pendingRecords,
  approvedRecords,
  totalUnreadMessages = 0,
  unreadNotificationsCount = 0,
  lang,
  onNavigateTab,
  onEnterProjectWorkspace,
  onEnterSiteWorkspace,
  onOpenNewTaskModal,
  onToggleTaskStatus,
  onRefresh
}) => {
  const isAr = lang === 'ar';
  const isAdmin =
    currentUser.roles.includes('SuperAdmin') ||
    currentUser.roles.includes('SystemAdmin') ||
    currentUser.roles.includes('Admin');

  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'urgent' | 'completed'>('pending');
  const [activeItemsTab, setActiveItemsTab] = useState<'projects' | 'sites'>('projects');

  // Filter items assigned to the current user (if Admin, show all or user's primarily)
  const myProjects = useMemo(() => {
    if (isAdmin) return projects;
    return projects.filter(
      (p) =>
        p.projectManagerId === currentUser.id ||
        p.members?.some((m) => m.id === currentUser.id)
    );
  }, [projects, currentUser, isAdmin]);

  const mySites = useMemo(() => {
    if (isAdmin) return allSites;
    return allSites.filter((s) =>
      s.assignments?.some((a) => a.userId === currentUser.id)
    );
  }, [allSites, currentUser, isAdmin]);

  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (isAdmin) return true;
      return t.assignedToUserId === currentUser.id;
    });
  }, [tasks, currentUser, isAdmin]);

  const filteredTasks = useMemo(() => {
    switch (taskFilter) {
      case 'urgent':
        return myTasks.filter((t) => t.priority === 'Critical' || t.priority === 'High' || t.isOverdue);
      case 'completed':
        return myTasks.filter((t) => t.status === 'Completed');
      case 'pending':
        return myTasks.filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled');
      case 'all':
      default:
        return myTasks;
    }
  }, [myTasks, taskFilter]);

  const mySubmissions = useMemo(() => {
    const all = [...pendingRecords, ...approvedRecords];
    if (isAdmin) return all;
    return all.filter((r) => r.submittedBy === currentUser.id);
  }, [pendingRecords, approvedRecords, currentUser, isAdmin]);

  const pendingSubmissionsCount = useMemo(() => {
    return pendingRecords.filter((r) => isAdmin || r.submittedBy === currentUser.id).length;
  }, [pendingRecords, currentUser, isAdmin]);

  const urgentTasksCount = useMemo(() => {
    return myTasks.filter((t) => (t.priority === 'Critical' || t.priority === 'High' || t.isOverdue) && t.status !== 'Completed').length;
  }, [myTasks]);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 1. WELCOME COCKPIT BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-cyan-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5" />
                {isAr ? 'مساحة العمل الموحدة' : 'Personal Workspace Cockpit'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'متصل بالمنظومة' : 'Live Sync Active'}
              </span>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Shield className="w-3 h-3" />
                  {isAr ? 'صلاحيات المدير العام الكاملة' : 'Full Administrator Mode'}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              {isAr ? `أهلاً بك، المهندس ${currentUser.fullName || currentUser.firstName || currentUser.email}` : `Welcome back, ${currentUser.fullName || currentUser.email}`}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {isAr
                ? 'لوحتك المركزية لمتابعة مشاريعك، مواقعك الميدانية، المهام المكلف بها، ورفع وتدقيق البيانات الهندسية في مكان واحد.'
                : 'Your central hub for tracking assigned projects, field sites, immediate tasks, and reviewing engineering submissions.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onRefresh && (
              <button
                onClick={() => {
                  logger.info('[MyWorkspace] Manual refresh triggered');
                  onRefresh();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                title={isAr ? 'تحديث البيانات' : 'Refresh Data'}
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAr ? 'تحديث' : 'Refresh'}</span>
              </button>
            )}

            {onOpenNewTaskModal && (
              <button
                onClick={onOpenNewTaskModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'مهمة جديدة' : 'New Task'}</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('project-data')}
              className="px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <FileUp className="w-4 h-4" />
              <span>{isAr ? 'رفع بيانات موقع' : 'Submit Data'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. PERSONAL METRICS / KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* KPI 1: My Projects */}
        <div
          onClick={() => onNavigateTab('my-projects')}
          className="glow-card p-4 rounded-2xl cursor-pointer hover:border-cyan-400/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{isAr ? 'مشاريعي المسندة' : 'My Projects'}</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-display text-white">{myProjects.length}</div>
            <div className="text-[11px] text-cyan-400/80 mt-0.5 flex items-center gap-1">
              <span>{isAr ? 'عرض المشاريع' : 'View Projects'}</span>
              <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* KPI 2: My Sites */}
        <div
          onClick={() => onNavigateTab('my-sites')}
          className="glow-card p-4 rounded-2xl cursor-pointer hover:border-emerald-400/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{isAr ? 'مواقعي الميدانية' : 'My Sites'}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-display text-white">{mySites.length}</div>
            <div className="text-[11px] text-emerald-400/80 mt-0.5 flex items-center gap-1">
              <span>{isAr ? 'عرض المواقع' : 'View Sites'}</span>
              <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* KPI 3: My Tasks */}
        <div
          onClick={() => onNavigateTab('my-tasks')}
          className="glow-card p-4 rounded-2xl cursor-pointer hover:border-amber-400/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{isAr ? 'مهامي النشطة' : 'My Active Tasks'}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-display text-white">{myTasks.filter(t => t.status !== 'Completed').length}</div>
            <div className="text-[11px] text-amber-400/90 mt-0.5 flex items-center gap-1">
              {urgentTasksCount > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
                  <span className="text-red-300 font-semibold">{urgentTasksCount} {isAr ? 'عاجلة / متأخرة' : 'Urgent/Overdue'}</span>
                </>
              ) : (
                <span>{isAr ? 'لا توجد مهام متأخرة' : 'All on track'}</span>
              )}
            </div>
          </div>
        </div>

        {/* KPI 4: My Submissions */}
        <div
          onClick={() => onNavigateTab('my-data')}
          className="glow-card p-4 rounded-2xl cursor-pointer hover:border-purple-400/50 transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{isAr ? 'سجلاتي المرفوعة' : 'My Submissions'}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <FileUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-display text-white">{mySubmissions.length}</div>
            <div className="text-[11px] text-purple-300 mt-0.5 flex items-center gap-1">
              <span>{pendingSubmissionsCount} {isAr ? 'قيد المراجعة' : 'Pending Review'}</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Chat & Notifications */}
        <div
          onClick={() => onNavigateTab('chat')}
          className="glow-card p-4 rounded-2xl cursor-pointer hover:border-blue-400/50 transition-all group flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">{isAr ? 'المحادثات والتنبيهات' : 'Chat & Alerts'}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-display text-white">
              {totalUnreadMessages}
            </div>
            <div className="text-[11px] text-blue-300 mt-0.5 flex items-center gap-1">
              <span>{unreadNotificationsCount} {isAr ? 'إشعارات جديدة' : 'Notifications'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. QUICK ENTERPRISE LAUNCHPAD */}
      <div className="glow-card p-5 rounded-3xl border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          {isAr ? 'منصة الإجراءات السريعة (Quick Launchpad)' : 'Quick Action Launchpad'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigateTab('project-data')}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-cyan-950/40 border border-slate-700/60 hover:border-cyan-500/40 text-start transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileUp className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
              {isAr ? 'رفع بيانات موقع' : 'Submit Site Data'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? 'صور، تقارير، مناسيب' : 'Photos, surveys, logs'}
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('daily-reports')}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-emerald-950/40 border border-slate-700/60 hover:border-emerald-500/40 text-start transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
              {isAr ? 'التقرير اليومي للموقع' : 'Daily Site Report'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? 'تسجيل أعمال اليوم' : 'Daily work progress'}
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('operations')}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-amber-950/40 border border-slate-700/60 hover:border-amber-500/40 text-start transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
              {isAr ? 'العمليات الميدانية' : 'Site Operations'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? 'أنشطة المواقع والفرق' : 'Live site activities'}
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('documents')}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-blue-950/40 border border-slate-700/60 hover:border-blue-500/40 text-start transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-blue-300">
              {isAr ? 'مستندات وأرشيف' : 'Documents Archive'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? 'الأرشيف السحابي B2' : 'Cloud B2 storage'}
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('drawings')}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-purple-950/40 border border-slate-700/60 hover:border-purple-500/40 text-start transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300">
              {isAr ? 'المخططات الهندسية' : 'Engineering Drawings'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? 'استعراض ومراجعة PDF' : 'CAD & PDF viewer'}
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('chat')}
            className="p-3 rounded-2xl bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/40 text-start transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
              {isAr ? 'المحادثات المباشرة' : 'Live Chat Hub'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isAr ? 'غرف الفرق والمشاريع' : 'Team channels'}
            </div>
          </button>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE CONTENT: 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 Cols): My Active Tasks */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glow-card p-5 rounded-3xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  {isAr ? 'مهامي الحالية والمكلف بها' : 'My Assigned Tasks'}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {filteredTasks.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAr ? 'متابعة المهام المسندة إليك بحسب الأولوية وتاريخ الاستحقاق' : 'Track tasks assigned to you by priority and due date'}
                </p>
              </div>

              {/* Task Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setTaskFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    taskFilter === 'pending'
                      ? 'bg-cyan-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'قيد التنفيذ' : 'Pending'}
                </button>
                <button
                  onClick={() => setTaskFilter('urgent')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    taskFilter === 'urgent'
                      ? 'bg-red-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'عاجلة' : 'Urgent'}
                </button>
                <button
                  onClick={() => setTaskFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    taskFilter === 'completed'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isAr ? 'مكتملة' : 'Done'}
                </button>
              </div>
            </div>

            {/* Task Items List */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/60">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <div className="text-sm font-semibold text-slate-300">
                  {isAr ? 'لا توجد مهام معلقة في هذه الفئة!' : 'No tasks in this category!'}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isAr ? 'عمل رائع، لقد أنجزت جميع المهام المحددة.' : 'Great job, you are all caught up.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredTasks.slice(0, 10).map((t) => {
                  const isDone = t.status === 'Completed';
                  const isCritical = t.priority === 'Critical' || t.priority === 'High' || t.isOverdue;

                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                        isDone
                          ? 'bg-slate-900/40 border-slate-800 opacity-60'
                          : isCritical
                          ? 'bg-red-950/15 border-red-500/30 hover:border-red-500/50'
                          : 'bg-slate-850/60 border-slate-750/50 hover:border-slate-600'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (onToggleTaskStatus) {
                            onToggleTaskStatus(t);
                          }
                        }}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 ${
                          isDone
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-500 hover:border-cyan-400'
                        }`}
                        title={isAr ? 'تغيير حالة الإنجاز' : 'Toggle Completion'}
                      >
                        {isDone && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`text-xs sm:text-sm font-semibold truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              t.priority === 'Critical'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : t.priority === 'High'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700/40 text-slate-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {t.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                          {t.projectName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300">
                              <FolderKanban className="w-3 h-3" />
                              {t.projectName}
                            </span>
                          )}
                          {t.siteName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-emerald-300">
                              <MapPin className="w-3 h-3" />
                              {t.siteName}
                            </span>
                          )}
                          {t.dueAt && (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                t.isOverdue ? 'text-red-400 font-bold' : 'text-slate-400'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {new Date(t.dueAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                              {t.isOverdue && ` (${isAr ? 'متأخرة' : 'Overdue'})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {isAr ? `إجمالي المهام المتاحة: ${myTasks.length}` : `Total tasks: ${myTasks.length}`}
              </span>
              <button
                onClick={() => onNavigateTab('my-tasks')}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>{isAr ? 'عرض جدول المهام الكامل' : 'Open Full Tasks Kanban'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): My Assigned Projects & Sites */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glow-card p-5 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveItemsTab('projects')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    activeItemsTab === 'projects'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  {isAr ? `مشاريعي (${myProjects.length})` : `Projects (${myProjects.length})`}
                </button>
                <button
                  onClick={() => setActiveItemsTab('sites')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    activeItemsTab === 'sites'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900/60'
                  }`}
                >
                  {isAr ? `مواقعي الميدانية (${mySites.length})` : `Sites (${mySites.length})`}
                </button>
              </div>

              <button
                onClick={() => onNavigateTab(activeItemsTab === 'projects' ? 'projects' : 'sites')}
                className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              >
                {isAr ? 'عرض الكل' : 'View All'}
              </button>
            </div>

            {/* List of Projects */}
            {activeItemsTab === 'projects' && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {myProjects.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    {isAr ? 'لا توجد مشاريع مسندة إليك حالياً' : 'No projects assigned'}
                  </div>
                ) : (
                  myProjects.slice(0, 6).map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {proj.code}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate mt-1">
                            {proj.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {proj.clientName || (isAr ? 'عميل المنظومة' : 'Enterprise Client')}
                          </p>
                        </div>

                        {onEnterProjectWorkspace && (
                          <button
                            onClick={() => onEnterProjectWorkspace(proj)}
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 transition-all flex-shrink-0"
                            title={isAr ? 'دخول مساحة المشروع' : 'Enter Workspace'}
                          >
                            <span>{isAr ? 'دخول' : 'Enter'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{isAr ? 'نسبة الإنجاز' : 'Progress'}</span>
                          <span className="font-bold text-cyan-300">{proj.progressPercentage || 0}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${proj.progressPercentage || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* List of Sites */}
            {activeItemsTab === 'sites' && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {mySites.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    {isAr ? 'لا توجد مواقع ميدانية مسندة إليك' : 'No sites assigned'}
                  </div>
                ) : (
                  mySites.slice(0, 6).map((site) => (
                    <div
                      key={site.id}
                      className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            {site.code}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate mt-1">
                            {site.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {site.projectName}
                          </p>
                        </div>

                        {onEnterSiteWorkspace && (
                          <button
                            onClick={() => onEnterSiteWorkspace(site)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all flex-shrink-0"
                            title={isAr ? 'دخول مساحة الموقع' : 'Enter Workspace'}
                          >
                            <span>{isAr ? 'مساحة الموقع' : 'Workspace'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span className="truncate max-w-[150px]">{site.address || (isAr ? 'الموقع الميداني' : 'Field site')}</span>
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {site.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. RECENT SUBMISSIONS / ACTIVITY ROW */}
      <div className="glow-card p-5 rounded-3xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileUp className="w-4 h-4 text-purple-400" />
              {isAr ? 'آخر البيانات والسجلات المرفوعة' : 'Recent Submissions & Reviews'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr ? 'متابعة حالة اعتماد ومراجعة البيانات الهندسية المرفوعة' : 'Engineering data review and approval statuses'}
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('project-data')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>{isAr ? 'سجل البيانات الكامل' : 'All Data Records'}</span>
            <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {mySubmissions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            {isAr ? 'لم تقم برفع أي سجلات بعد. يمكنك رفع تقارير وبيانات جديدة عبر الزر أعلاه.' : 'No data records submitted yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mySubmissions.slice(0, 6).map((rec) => {
              const isApproved = rec.status === 'Approved';
              const isPending = rec.status === 'Submitted';

              return (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {rec.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : isPending
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {isApproved
                        ? (isAr ? 'معتمد' : 'Approved')
                        : isPending
                        ? (isAr ? 'قيد المراجعة' : 'Pending')
                        : (isAr ? 'مرفوض' : 'Rejected')}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                    {rec.title}
                  </h4>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="truncate">{rec.projectName} - {rec.siteName}</span>
                    <span className="text-[10px] text-slate-500">
                      v{rec.version}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default MyWorkspaceView;
