'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  MapPin,
  CheckSquare,
  Users,
  FileText,
  Compass,
  FileSpreadsheet,
  Cpu,
  AlertTriangle,
  Package,
  Activity,
  MessageSquare,
  BarChart3,
  Calendar,
  Clock,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Building2,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { Project, Site, User } from '@/types';
import { Language, formatDateCairo } from '@/lib/i18n';
import { documentsService } from '@/services/documents.service';
import { drawingsService } from '@/services/drawings.service';
import { dataSheetsService } from '@/services/datasheets.service';
import { taskService } from '@/services/task.service';
import { organizationService } from '@/services/organization.service';
import { DrawingsWorkspace } from '@/features/drawings/DrawingsWorkspace';
import { DataSheetsWorkspace } from '@/features/documents/DataSheetsWorkspace';
import { DocumentsManager } from '@/features/documents/DocumentsManager';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { resolveProjectCover, DEFAULT_PROJECT_COVER } from '@/lib/project-cover';

export type ProjectWorkspaceTab =
  | 'overview'
  | 'sites'
  | 'tasks'
  | 'team'
  | 'documents'
  | 'technical-office'
  | 'drawings'
  | 'daily-reports'
  | 'datasheets'
  | 'issues'
  | 'assets'
  | 'activity'
  | 'chat'
  | 'reports';

interface ProjectWorkspaceProps {
  project: Project;
  allSites?: Site[];
  currentUser: User | null;
  lang?: Language;
  onBack: () => void;
  onSelectSite?: (site: Site) => void;
  onOpenChat?: (projectId: string) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  allSites = [],
  currentUser,
  lang = 'ar',
  onBack,
  onSelectSite,
  onOpenChat
}) => {
  const [activeTab, setActiveTab] = useState<ProjectWorkspaceTab>('overview');

  // Stats & counts
  const [counts, setCounts] = useState({
    sites: 0,
    documents: 0,
    drawings: 0,
    datasheets: 0,
    tasks: 0,
    members: 0
  });

  const [projectSites, setProjectSites] = useState<Site[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Calculate Days Remaining
  const calculateDaysRemaining = () => {
    if (!project.endDate) return null;
    const now = new Date();
    const end = new Date(project.endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();

  useEffect(() => {
    loadProjectOverview();
  }, [project.id]);

  const loadProjectOverview = async () => {
    try {
      setLoadingOverview(true);
      const sites = allSites.filter((s) => s.projectId === project.id);
      setProjectSites(sites);

      const [docRes, drawRes, dataRes, taskRes] = await Promise.allSettled([
        documentsService.getProjectDocumentCenter(project.id),
        drawingsService.getDrawings({ projectId: project.id, pageSize: 1 }),
        dataSheetsService.getDataSheets({ projectId: project.id }),
        taskService.getTasks()
      ]);

      let docsCount = 0;
      if (docRes.status === 'fulfilled' && docRes.value?.success && docRes.value?.data) {
        docsCount = docRes.value.data.documents?.length || 0;
      }

      let drawCount = 0;
      if (drawRes.status === 'fulfilled' && drawRes.value?.success && drawRes.value?.data) {
        drawCount = drawRes.value.data.totalCount || 0;
      }

      let dataCount = 0;
      if (dataRes.status === 'fulfilled' && dataRes.value?.success && dataRes.value?.data) {
        dataCount = Array.isArray(dataRes.value.data) ? dataRes.value.data.length : 0;
      }

      let tasksForProject: any[] = [];
      if (taskRes.status === 'fulfilled') {
        const val: any = taskRes.value;
        const list = Array.isArray(val) ? val : (val?.data || []);
        tasksForProject = list.filter((t: any) => t.projectId === project.id);
        setProjectTasks(tasksForProject);
      }

      setCounts({
        sites: sites.length,
        documents: docsCount,
        drawings: drawCount,
        datasheets: dataCount,
        tasks: tasksForProject.length,
        members: (project.members as any[])?.length || 0
      });
    } catch (err) {
      console.error('Failed to load project workspace data', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const tabs: { id: ProjectWorkspaceTab; labelAr: string; labelEn: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', labelAr: 'نظرة عامة', labelEn: 'Overview', icon: <Layers className="w-4 h-4" /> },
    { id: 'sites', labelAr: 'المواقع', labelEn: 'Sites', icon: <MapPin className="w-4 h-4" />, count: counts.sites },
    { id: 'tasks', labelAr: 'المهام', labelEn: 'Tasks', icon: <CheckSquare className="w-4 h-4" />, count: counts.tasks },
    { id: 'team', labelAr: 'فريق العمل', labelEn: 'Team', icon: <Users className="w-4 h-4" />, count: counts.members },
    { id: 'documents', labelAr: 'المستندات', labelEn: 'Documents', icon: <FileText className="w-4 h-4" />, count: counts.documents },
    { id: 'technical-office', labelAr: 'المكتب الفني', labelEn: 'Technical Office', icon: <Briefcase className="w-4 h-4" /> },
    { id: 'drawings', labelAr: 'المخططات الهندسية', labelEn: 'Drawings', icon: <Compass className="w-4 h-4" />, count: counts.drawings },
    { id: 'daily-reports', labelAr: 'التقارير اليومية', labelEn: 'Daily Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'datasheets', labelAr: 'لوائح البيانات', labelEn: 'Data Sheets', icon: <Cpu className="w-4 h-4" />, count: counts.datasheets },
    { id: 'issues', labelAr: 'المشكلات والمخاطر', labelEn: 'Issues & Risks', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'assets', labelAr: 'الأصول والمعدات', labelEn: 'Assets', icon: <Package className="w-4 h-4" /> },
    { id: 'activity', labelAr: 'سجل النشاط', labelEn: 'Activity', icon: <Activity className="w-4 h-4" /> },
    { id: 'chat', labelAr: 'المحادثة', labelEn: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'reports', labelAr: 'التقارير والإحصاءات', labelEn: 'Reports', icon: <BarChart3 className="w-4 h-4" /> }
  ];

  const progress = Math.min(100, Math.max(0, project.progressPercentage ?? 0));
  const coverImage = resolveProjectCover(project.coverImageUrl);

  return (
    <div className="space-y-5 animate-fadeIn text-start">
      {/* ======================================================== */}
      {/* UX-02: UNIFIED PROJECT HEADER */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-400/30 bg-[#09111e]/90 backdrop-blur-xl shadow-[0_0_35px_rgba(14,165,233,0.18)]">
        {/* Background Cover & Overlay */}
        <div className="absolute inset-0 h-44 overflow-hidden pointer-events-none">
          <img
            src={coverImage}
            alt={project.name}
            className="w-full h-full object-cover blur-sm opacity-25 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#09111e]/40 via-[#09111e]/85 to-[#09111e]" />
        </div>

        <div className="relative z-10 p-5 sm:p-6 space-y-4">
          {/* Top Bar with Back Button & Badges */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{lang === 'ar' ? 'العودة للمشاريع' : 'Back to Projects'}</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {project.status || 'Active'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                {project.code}
              </span>
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-8 space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-cyan-400" />
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {project.name}
                </h1>
              </div>
              {project.description && (
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                  {project.description}
                </p>
              )}

              {/* Metadata Pills */}
              <div className="flex items-center gap-4 flex-wrap pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'العميل:' : 'Client:'}</span>
                  <span className="font-bold text-white">{project.clientName || '—'}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'مدير المشروع:' : 'PM:'}</span>
                  <span className="font-bold text-white">
                    {project.projectManagerName || (lang === 'ar' ? 'غير محدد' : 'Unassigned')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'البدء:' : 'Start:'}</span>
                  <span className="font-mono text-white">
                    {project.startDate ? formatDateCairo(project.startDate, lang) : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'المستهدف:' : 'Target:'}</span>
                  <span className="font-mono text-white">
                    {project.endDate ? formatDateCairo(project.endDate, lang) : '—'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'الأيام المتبقية:' : 'Days Remaining:'}</span>
                  <span className={`font-bold font-mono ${daysRemaining !== null && daysRemaining < 0 ? 'text-rose-400' : 'text-amber-300'}`}>
                    {daysRemaining !== null ? `${daysRemaining} ${lang === 'ar' ? 'يوم' : 'days'}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">{lang === 'ar' ? 'نسبة الإنجاز الإجمالية' : 'Overall Progress'}</span>
                <span className="text-cyan-300 font-extrabold text-base font-mono tabular-nums">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>{counts.sites} {lang === 'ar' ? 'مواقع عمل' : 'Sites'}</span>
                <span>{counts.tasks} {lang === 'ar' ? 'مهام تشغيلية' : 'Tasks'}</span>
                <span>{counts.documents} {lang === 'ar' ? 'مستندات' : 'Docs'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 14 Tabs Navigation Bar */}
        <div className="px-4 sm:px-6 bg-[#070d17] border-t border-slate-800 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-3.5 text-xs font-bold flex items-center gap-2 whitespace-nowrap border-b-2 transition-all ${
                  active
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.icon}
                <span>{lang === 'ar' ? tab.labelAr : tab.labelEn}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB CONTENT PANELS */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {/* 1. OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { labelAr: 'المواقع', labelEn: 'Sites', val: counts.sites, icon: <MapPin className="w-4 h-4 text-cyan-400" /> },
                { labelAr: 'المهام', labelEn: 'Tasks', val: counts.tasks, icon: <CheckSquare className="w-4 h-4 text-amber-400" /> },
                { labelAr: 'المستندات', labelEn: 'Documents', val: counts.documents, icon: <FileText className="w-4 h-4 text-blue-400" /> },
                { labelAr: 'المخططات', labelEn: 'Drawings', val: counts.drawings, icon: <Compass className="w-4 h-4 text-purple-400" /> },
                { labelAr: 'لوائح البيانات', labelEn: 'Data Sheets', val: counts.datasheets, icon: <Cpu className="w-4 h-4 text-emerald-400" /> },
                { labelAr: 'الفريق', labelEn: 'Team Members', val: counts.members, icon: <Users className="w-4 h-4 text-indigo-400" /> }
              ].map((m, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-start space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{lang === 'ar' ? m.labelAr : m.labelEn}</span>
                    {m.icon}
                  </div>
                  <div className="text-xl font-bold font-mono text-white">{m.val}</div>
                </div>
              ))}
            </div>

            {/* Sites preview under project */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  {lang === 'ar' ? 'مواقع المشروع النشطة' : 'Active Project Sites'}
                </h3>
                <button
                  onClick={() => setActiveTab('sites')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold"
                >
                  {lang === 'ar' ? 'عرض الكل' : 'View All'} ({projectSites.length})
                </button>
              </div>

              {projectSites.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {lang === 'ar' ? 'لا توجد مواقع مضافة لهذا المشروع حتى الآن' : 'No sites added to this project yet'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projectSites.slice(0, 6).map((st) => (
                    <div
                      key={st.id}
                      onClick={() => onSelectSite && onSelectSite(st)}
                      className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-400/40 cursor-pointer transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">{st.code}</span>
                          <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {st.name}
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {st.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {st.address || (lang === 'ar' ? 'بدون عنوان' : 'No address')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent activity in project */}
            <ActivityTimeline
              projectId={project.id}
              lang={lang}
              title={lang === 'ar' ? 'أحدث الأنشطة والعمليات في المشروع' : 'Recent Project Activity'}
            />
          </div>
        )}

        {/* 2. SITES */}
        {activeTab === 'sites' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                {lang === 'ar' ? 'مواقع المشروع' : 'Project Sites'} ({projectSites.length})
              </h3>
            </div>
            {projectSites.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800">
                {lang === 'ar' ? 'لا توجد مواقع مسجلة' : 'No sites recorded'}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectSites.map((site) => (
                  <div
                    key={site.id}
                    onClick={() => onSelectSite && onSelectSite(site)}
                    className="p-4 rounded-2xl bg-slate-900/70 hover:bg-slate-850 border border-slate-800 hover:border-cyan-400/50 cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-300">{site.code}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        {site.status}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {site.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {site.address || (lang === 'ar' ? 'بدون عنوان' : 'No address')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>{lang === 'ar' ? 'دخول مساحة الموقع' : 'Open Site Workspace'}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. TASKS */}
        {activeTab === 'tasks' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              {lang === 'ar' ? 'مهام المشروع' : 'Project Tasks'} ({projectTasks.length})
            </h3>
            {projectTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {lang === 'ar' ? 'لا توجد مهام مسجلة لهذا المشروع' : 'No tasks recorded for this project'}
              </div>
            ) : (
              <div className="space-y-2">
                {projectTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">{task.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{task.description || '—'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. TEAM */}
        {activeTab === 'team' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              {lang === 'ar' ? 'أعضاء فريق المشروع' : 'Project Team'}
            </h3>
            {project.members && (project.members as any[]).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(project.members as any[]).map((m: any) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-xs font-bold text-cyan-300">
                      {((m.user?.firstName || m.name || 'U') as string).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{m.user ? `${m.user.firstName} ${m.user.lastName}` : (m.name || 'Engineer')}</div>
                      <div className="text-[11px] text-slate-400">{m.role || 'Member'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                {lang === 'ar' ? 'لم يتم تعيين أعضاء لهذا المشروع' : 'No members assigned'}
              </div>
            )}
          </div>
        )}

        {/* 5. DOCUMENTS */}
        {activeTab === 'documents' && (
          <DocumentsManager
            currentUser={currentUser}
            projects={[project]}
            lang={lang}
          />
        )}

        {/* 6. TECHNICAL OFFICE */}
        {activeTab === 'technical-office' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-400" />
              {lang === 'ar' ? 'المكتب الفني - العروض والمقايسات' : 'Technical Office - Boq & Offers'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'إدارة المقايسات الهندسية (BOQ) والعروض الفنية والمالية لهذا المشروع' : 'Manage BOQ, technical and commercial offers for this project'}
            </p>
          </div>
        )}

        {/* 7. DRAWINGS */}
        {activeTab === 'drawings' && (
          <DrawingsWorkspace
            initialProjectId={project.id}
          />
        )}

        {/* 8. DAILY REPORTS */}
        {activeTab === 'daily-reports' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              {lang === 'ar' ? 'التقارير اليومية لمواقع المشروع' : 'Daily Site Reports'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تقارير الإنجاز اليومية والعمالة والمعدات بمواقع هذا المشروع' : 'Daily progress reports, manpower, and equipment across sites'}
            </p>
          </div>
        )}

        {/* 9. DATA SHEETS */}
        {activeTab === 'datasheets' && (
          <DataSheetsWorkspace
            initialProjectId={project.id}
          />
        )}

        {/* 10. ISSUES */}
        {activeTab === 'issues' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {lang === 'ar' ? 'سجل المشكلات والمخاطر' : 'Project Issues & Risks'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تتبع المخاطر والعوائق الميدانية' : 'Field issues and risk tracking'}
            </p>
          </div>
        )}

        {/* 11. ASSETS */}
        {activeTab === 'assets' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              {lang === 'ar' ? 'الأصول والمعدات في المشروع' : 'Project Assets & Equipment'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'المعدات والأدوات المسندة لمواقع هذا المشروع' : 'Equipment assigned to project sites'}
            </p>
          </div>
        )}

        {/* 12. ACTIVITY */}
        {activeTab === 'activity' && (
          <ActivityTimeline
            projectId={project.id}
            lang={lang}
            title={lang === 'ar' ? `سجل النشاط لمشروع ${project.name}` : `Activity Timeline for ${project.name}`}
          />
        )}

        {/* 13. CHAT */}
        {activeTab === 'chat' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-pink-400" />
              {lang === 'ar' ? 'محادثة المشروع' : 'Project Chat'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'قناة التواصل الفوري الخاصة بالمشروع (CHAT-01)' : 'Direct project communication channel (CHAT-01)'}
            </p>
            {onOpenChat && (
              <button
                onClick={() => onOpenChat(project.id)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs"
              >
                <MessageSquare className="w-4 h-4" />
                {lang === 'ar' ? 'فتح محادثة المشروع في الشات' : 'Open in Chat Center'}
              </button>
            )}
          </div>
        )}

        {/* 14. REPORTS */}
        {activeTab === 'reports' && (
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              {lang === 'ar' ? 'تقارير وإحصاءات المشروع' : 'Project Reports & Analytics'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تحليلات تقدم الأعمال، نسب الإنجاز، والتكاليف' : 'Analytics for progress, completion, and costs'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
