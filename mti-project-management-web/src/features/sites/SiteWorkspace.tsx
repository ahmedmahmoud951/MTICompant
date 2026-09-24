'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  ArrowLeft,
  LayoutDashboard,
  CheckSquare,
  FileText,
  Compass,
  FileSpreadsheet,
  Cpu,
  Wrench,
  Hammer,
  AlertTriangle,
  Package,
  Users,
  MessageSquare,
  Shield,
  Calendar,
  Layers,
  Building2,
  ExternalLink,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { Project, Site, User } from '@/types';
import { Language, formatDateCairo } from '@/lib/i18n';
import { documentsService } from '@/services/documents.service';
import { drawingsService } from '@/services/drawings.service';
import { dataSheetsService } from '@/services/datasheets.service';
import { siteOperationsService } from '@/services/site-operations.service';
import { dailyReportsService } from '@/services/daily-reports.service';
import { taskService } from '@/services/task.service';
import { organizationService } from '@/services/organization.service';
import { DrawingsWorkspace } from '@/features/drawings/DrawingsWorkspace';
import { DataSheetsWorkspace } from '@/features/documents/DataSheetsWorkspace';
import { SiteOperationsManager } from '@/features/operations/SiteOperationsManager';
import { DailySiteReportsManager } from '@/features/reports/DailySiteReportsManager';
import { DocumentsManager } from '@/features/documents/DocumentsManager';
import { ActivityTimeline } from '@/components/ActivityTimeline';

export type SiteWorkspaceTab =
  | 'overview'
  | 'tasks'
  | 'documents'
  | 'drawings'
  | 'daily-reports'
  | 'datasheets'
  | 'installation'
  | 'maintenance'
  | 'issues'
  | 'assets'
  | 'team'
  | 'activity'
  | 'chat';

interface SiteWorkspaceProps {
  site: Site;
  project?: Project | null;
  allProjects?: Project[];
  currentUser: User | null;
  lang: Language;
  onBack: () => void;
}

export const SiteWorkspace: React.FC<SiteWorkspaceProps> = ({
  site,
  project,
  allProjects = [],
  currentUser,
  lang,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<SiteWorkspaceTab>('overview');

  // Counts / Quick Stats
  const [counts, setCounts] = useState({
    documents: 0,
    drawings: 0,
    dailyReports: 0,
    datasheets: 0,
    tasks: 0,
    installations: 0,
    maintenance: 0,
    members: 0
  });

  const [siteTasks, setSiteTasks] = useState<any[]>([]);
  const [siteMembers, setSiteMembers] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);

  useEffect(() => {
    loadSiteOverviewData();
  }, [site.id]);

  const loadSiteOverviewData = async () => {
    try {
      setLoadingOverview(true);
      const [docRes, drawRes, dataRes, repRes, taskRes, memberRes] = await Promise.allSettled([
        documentsService.getSiteDocumentCenter(site.id),
        drawingsService.getDrawings({ siteId: site.id, pageSize: 1 }),
        dataSheetsService.getDataSheets({ siteId: site.id }),
        dailyReportsService.getReports({ siteId: site.id }),
        taskService.getTasks(),
        organizationService.getSiteMembers(site.id)
      ]);

      let docsCount = 0;
      if (docRes.status === 'fulfilled' && docRes.value?.success && docRes.value?.data) {
        docsCount = docRes.value.data.documents?.length || 0;
      }

      let drawingsCount = 0;
      if (drawRes.status === 'fulfilled' && drawRes.value?.success && drawRes.value?.data) {
        drawingsCount = drawRes.value.data.totalCount;
      }

      let dataSheetsCount = 0;
      if (dataRes.status === 'fulfilled' && dataRes.value?.success && dataRes.value?.data) {
        dataSheetsCount = dataRes.value.data.length;
      }

      let reportsCount = 0;
      if (repRes.status === 'fulfilled' && repRes.value?.success && repRes.value?.data) {
        const d = repRes.value.data;
        reportsCount = Array.isArray(d) ? d.length : ((d as any).totalCount || 0);
      }

      let tasksList: any[] = [];
      if (taskRes.status === 'fulfilled' && Array.isArray(taskRes.value)) {
        tasksList = taskRes.value.filter((t: any) => t.siteId === site.id);
        setSiteTasks(tasksList);
      }

      let membersList: any[] = [];
      if (memberRes.status === 'fulfilled' && memberRes.value?.success && memberRes.value?.data) {
        membersList = memberRes.value.data;
        setSiteMembers(membersList);
      }

      setCounts({
        documents: docsCount,
        drawings: drawingsCount,
        dailyReports: reportsCount,
        datasheets: dataSheetsCount,
        tasks: tasksList.length,
        installations: 0,
        maintenance: 0,
        members: membersList.length
      });
    } catch (e) {
      console.error('Failed to load site overview stats', e);
    } finally {
      setLoadingOverview(false);
    }
  };

  const tabs: { id: SiteWorkspaceTab; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: lang === 'ar' ? 'نظرة عامة' : 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: lang === 'ar' ? 'المهام الميدانية' : 'Tasks', icon: CheckSquare, count: counts.tasks },
    { id: 'documents', label: lang === 'ar' ? 'مستندات الموقع' : 'Documents', icon: FileText, count: counts.documents },
    { id: 'drawings', label: lang === 'ar' ? 'المخططات الهندسية' : 'Drawings', icon: Compass, count: counts.drawings },
    { id: 'daily-reports', label: lang === 'ar' ? 'التقارير اليومية' : 'Daily Reports', icon: FileSpreadsheet, count: counts.dailyReports },
    { id: 'datasheets', label: lang === 'ar' ? 'البيانات الفنية' : 'Data Sheets', icon: Cpu, count: counts.datasheets },
    { id: 'installation', label: lang === 'ar' ? 'أعمال التركيب' : 'Installation', icon: Wrench },
    { id: 'maintenance', label: lang === 'ar' ? 'أعمال الصيانة' : 'Maintenance', icon: Hammer },
    { id: 'issues', label: lang === 'ar' ? 'الملاحظات والمعلقات' : 'Issues & Snags', icon: AlertTriangle },
    { id: 'assets', label: lang === 'ar' ? 'الأصول والمعدات' : 'Assets', icon: Package },
    { id: 'team', label: lang === 'ar' ? 'فريق الموقع' : 'Site Team', icon: Users, count: counts.members },
    { id: 'activity', label: lang === 'ar' ? 'سجل النشاط' : 'Activity', icon: Activity },
    { id: 'chat', label: lang === 'ar' ? 'المحادثة والتواصل' : 'Site Chat', icon: MessageSquare }
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Top Header Card */}
      <div className="glow-card p-5 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-slate-900/90 via-[#0e1d33]/90 to-slate-900/90 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 border border-slate-700 transition-colors shadow-sm"
              title={lang === 'ar' ? 'الرجوع لقائمة المواقع' : 'Back to Sites List'}
            >
              <ArrowLeft className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {site.code}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {site.status || 'Active'}
                </span>
                {site.projectName && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {site.projectName}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                {site.name}
              </h2>
              {site.address && (
                <p className="text-xs text-slate-400 mt-0.5">{site.address}</p>
              )}

              {/* UX-03 Header Metadata Grid */}
              <div className="flex items-center gap-3 flex-wrap pt-2 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Users className="w-3 h-3 text-cyan-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'مدير الموقع:' : 'Site Manager:'}</span>
                  <span className="font-semibold text-white">
                    {(site as any).siteManagerName || (site as any).assignments?.find((a: any) => a.role?.includes('Manager'))?.userName || (lang === 'ar' ? 'مهندس الموقع' : 'Site Engineer')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Calendar className="w-3 h-3 text-indigo-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'تاريخ البدء:' : 'Start:'}</span>
                  <span className="font-mono text-white">
                    {(site as any).startDate ? formatDateCairo((site as any).startDate, lang) : (project?.startDate ? formatDateCairo(project.startDate, lang) : '—')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'الانتهاء المستهدف:' : 'Target:'}</span>
                  <span className="font-mono text-white">
                    {(site as any).targetCompletionDate ? formatDateCairo((site as any).targetCompletionDate, lang) : (project?.endDate ? formatDateCairo(project.endDate, lang) : '—')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-400">{lang === 'ar' ? 'الأيام المتبقية:' : 'Days Left:'}</span>
                  <span className="font-bold font-mono text-amber-300">
                    {(() => {
                      const target = (site as any).targetCompletionDate || project?.endDate;
                      if (!target) return '—';
                      const diff = Math.ceil((new Date(target).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return `${diff} ${lang === 'ar' ? 'يوم' : 'd'}`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold">{lang === 'ar' ? 'نسبة الإنجاز:' : 'Progress:'}</span>
              <span className="text-cyan-300 font-extrabold font-mono text-sm">
                {(site as any).progressPercentage ?? 0}%
              </span>
            </div>
            <div className="w-32 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400"
                style={{ width: `${Math.min(100, Math.max(0, (site as any).progressPercentage ?? 0))}%` }}
              />
            </div>
            <button
              onClick={loadSiteOverviewData}
              className="mt-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* 12 Tabs Navigation Bar */}
        <div className="mt-5 border-t border-slate-700/60 pt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-300 font-bold border border-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div
              onClick={() => setActiveTab('documents')}
              className="glow-card p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{lang === 'ar' ? 'المستندات' : 'Documents'}</span>
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white">{counts.documents}</div>
            </div>

            <div
              onClick={() => setActiveTab('drawings')}
              className="glow-card p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{lang === 'ar' ? 'المخططات' : 'Drawings'}</span>
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white">{counts.drawings}</div>
            </div>

            <div
              onClick={() => setActiveTab('daily-reports')}
              className="glow-card p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{lang === 'ar' ? 'التقارير اليومية' : 'Reports'}</span>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white">{counts.dailyReports}</div>
            </div>

            <div
              onClick={() => setActiveTab('datasheets')}
              className="glow-card p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{lang === 'ar' ? 'البيانات الفنية' : 'Data Sheets'}</span>
                <Cpu className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-white">{counts.datasheets}</div>
            </div>

            <div
              onClick={() => setActiveTab('tasks')}
              className="glow-card p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{lang === 'ar' ? 'المهام' : 'Tasks'}</span>
                <CheckSquare className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white">{counts.tasks}</div>
            </div>

            <div
              onClick={() => setActiveTab('team')}
              className="glow-card p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{lang === 'ar' ? 'الفريق' : 'Team'}</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white">{counts.members}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Information Card */}
            <div className="glow-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                {lang === 'ar' ? 'معلومات الموقع والربط الهندسي' : 'Site & Project Specification'}
              </h3>
              <div className="space-y-2 text-xs divide-y divide-slate-800">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">{lang === 'ar' ? 'كود الموقع' : 'Site Code'}</span>
                  <span className="font-semibold text-slate-200">{site.code}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">{lang === 'ar' ? 'اسم الموقع' : 'Site Name'}</span>
                  <span className="font-semibold text-slate-200">{site.name}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">{lang === 'ar' ? 'المشروع المرتبط' : 'Linked Project'}</span>
                  <span className="font-semibold text-cyan-300">{site.projectName || project?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400">{lang === 'ar' ? 'العنوان الميداني' : 'Address'}</span>
                  <span className="font-semibold text-slate-300">{site.address || '—'}</span>
                </div>
                {site.latitude && site.longitude && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400">{lang === 'ar' ? 'إحداثيات GPS' : 'GPS Coordinates'}</span>
                    <a
                      href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      {site.latitude.toFixed(5)}, {site.longitude.toFixed(5)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="glow-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                {lang === 'ar' ? 'الوصول السريع إلى الأقسام الفنية' : 'Quick Access Hub'}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setActiveTab('drawings')}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-start transition-all"
                >
                  <Compass className="w-4 h-4 text-cyan-400 mb-1" />
                  <div className="font-semibold text-slate-200">{lang === 'ar' ? 'عرض المخططات' : 'View Drawings'}</div>
                  <div className="text-[10px] text-slate-400">{counts.drawings} {lang === 'ar' ? 'مخطط متوفر' : 'drawings'}</div>
                </button>

                <button
                  onClick={() => setActiveTab('daily-reports')}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-start transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-1" />
                  <div className="font-semibold text-slate-200">{lang === 'ar' ? 'التقارير اليومية' : 'Daily Reports'}</div>
                  <div className="text-[10px] text-slate-400">{counts.dailyReports} {lang === 'ar' ? 'تقرير معتمد' : 'reports'}</div>
                </button>

                <button
                  onClick={() => setActiveTab('datasheets')}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-start transition-all"
                >
                  <Cpu className="w-4 h-4 text-purple-400 mb-1" />
                  <div className="font-semibold text-slate-200">{lang === 'ar' ? 'لوائح البيانات الفنية' : 'Data Sheets'}</div>
                  <div className="text-[10px] text-slate-400">{counts.datasheets} {lang === 'ar' ? 'جهاز مسجل' : 'datasheets'}</div>
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/60 text-start transition-all"
                >
                  <FileText className="w-4 h-4 text-cyan-400 mb-1" />
                  <div className="font-semibold text-slate-200">{lang === 'ar' ? 'مستندات الموقع' : 'Site Docs'}</div>
                  <div className="text-[10px] text-slate-400">{counts.documents} {lang === 'ar' ? 'مستند' : 'documents'}</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="glow-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              {lang === 'ar' ? 'المهام الميدانية للموقع' : 'Site Tasks'} ({siteTasks.length})
            </h3>
          </div>
          {siteTasks.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              {lang === 'ar' ? 'لا توجد مهام مسندة لهذا الموقع حالياً.' : 'No tasks assigned to this site currently.'}
            </div>
          ) : (
            <div className="space-y-2">
              {siteTasks.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{t.title}</div>
                    <div className="text-[10px] text-slate-400">{t.description || '—'}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-cyan-300 font-bold">
                    {t.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Documents (Site Document Center) */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <DocumentsManager
            currentUser={currentUser}
            projects={allProjects}
            lang={lang}
          />
        </div>
      )}

      {/* Tab 4: Drawings */}
      {activeTab === 'drawings' && (
        <div className="h-[calc(100vh-14rem)] rounded-2xl overflow-hidden border border-slate-800">
          <DrawingsWorkspace
            initialProjectId={site.projectId}
            initialSiteId={site.id}
          />
        </div>
      )}

      {/* Tab 5: Daily Reports */}
      {activeTab === 'daily-reports' && (
        <div className="space-y-4">
          <DailySiteReportsManager
            currentUser={currentUser}
            projects={allProjects}
            sites={[site]}
            lang={lang}
          />
        </div>
      )}

      {/* Tab 6: Data Sheets */}
      {activeTab === 'datasheets' && (
        <div className="h-[calc(100vh-14rem)] rounded-2xl overflow-hidden border border-slate-800">
          <DataSheetsWorkspace
            initialProjectId={site.projectId}
            initialSiteId={site.id}
          />
        </div>
      )}

      {/* Tab 7: Installation */}
      {activeTab === 'installation' && (
        <div className="space-y-4">
          <SiteOperationsManager
            currentUser={currentUser}
            projects={allProjects}
            sites={[site]}
            lang={lang}
          />
        </div>
      )}

      {/* Tab 8: Maintenance */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <SiteOperationsManager
            currentUser={currentUser}
            projects={allProjects}
            sites={[site]}
            lang={lang}
          />
        </div>
      )}

      {/* Tab 9: Issues & Snags */}
      {activeTab === 'issues' && (
        <div className="glow-card p-6 rounded-2xl border border-slate-800 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-slate-100">
            {lang === 'ar' ? 'سجل الملاحظات والنواقص الميدانية (Snag List)' : 'Site Snags & Issues Register'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {lang === 'ar'
              ? 'يتم توثيق كافة المعلقات والملاحظات الهندسية الخاصة بهذا الموقع ومتابعة تسويتها حتى مرحلة التسليم النهائي.'
              : 'Track engineering snags, field issues, and corrective actions until final handover.'}
          </p>
        </div>
      )}

      {/* Tab 10: Assets */}
      {activeTab === 'assets' && (
        <div className="glow-card p-6 rounded-2xl border border-slate-800 text-center space-y-3">
          <Package className="w-10 h-10 text-cyan-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-slate-100">
            {lang === 'ar' ? 'أصول ومعدات الموقع' : 'Site Assets & Deployed Hardware'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {lang === 'ar'
              ? 'سجل الأجهزة والمعدات المركبة في هذا الموقع مع الأرقام التسلسلية وفترات الضمان.'
              : 'Catalog of installed equipment and assets linked to this site with serials and warranty.'}
          </p>
        </div>
      )}

      {/* Tab 11: Site Team */}
      {activeTab === 'team' && (
        <div className="glow-card p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            {lang === 'ar' ? 'فريق العمل والمهندسين المسندين للموقع' : 'Site Team & Assigned Engineers'} ({siteMembers.length})
          </h3>
          {siteMembers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
              {lang === 'ar' ? 'لم يتم تعيين مهندسين أو فنيين لهذا الموقع بعد.' : 'No members assigned to this site yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {siteMembers.map((m) => (
                <div key={m.userId || m.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                    {(m.userName || m.fullName || 'U')[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-100 truncate">{m.userName || m.fullName}</div>
                    <div className="text-[10px] text-cyan-400">{m.role || 'Site Engineer'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 12: Chat */}
      {activeTab === 'chat' && (
        <div className="glow-card p-6 rounded-2xl border border-slate-800 text-center space-y-3">
          <MessageSquare className="w-10 h-10 text-cyan-400 mx-auto opacity-70" />
          <h3 className="text-base font-bold text-slate-100">
            {lang === 'ar' ? 'قناة التواصل والمحادثة الخاصة بالموقع' : 'Site Communication Channel'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {lang === 'ar'
              ? 'محادثة مباشرة بين مهندسي الموقع وإدارة العمليات لتبادل الرسائل الفورية والتنبيهات الميدانية.'
              : 'Direct communication channel between site engineers and operations management.'}
          </p>
        </div>
      )}

      {/* Tab 13: Activity Center */}
      {activeTab === 'activity' && (
        <ActivityTimeline
          siteId={site.id}
          lang={lang}
          title={lang === 'ar' ? `سجل النشاط الميداني لموقع ${site.name}` : `Field Activity Timeline for ${site.name}`}
        />
      )}
    </div>
  );
};
