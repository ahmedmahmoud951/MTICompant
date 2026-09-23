'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Building2,
  MapPin,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Package,
  ShieldCheck,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Layers,
  ChevronDown
} from 'lucide-react';
import { Project, Site, TaskItem, ProjectDataRecord, User } from '@/types';

interface ReportsAnalyticsHubProps {
  currentUser: User;
  projects: Project[];
  sites: Site[];
  tasks: TaskItem[];
  approvedRecords: ProjectDataRecord[];
  pendingRecords: ProjectDataRecord[];
  adminStats: any;
  lang?: 'ar' | 'en';
  onNavigateTab?: (tabId: string) => void;
}

export function ReportsAnalyticsHub({
  currentUser,
  projects,
  sites,
  tasks,
  approvedRecords,
  pendingRecords,
  adminStats,
  lang = 'ar',
  onNavigateTab
}: ReportsAnalyticsHubProps) {
  const isAr = lang === 'ar';
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [downloadingEntity, setDownloadingEntity] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Compute metrics based on selected project
  const filteredProjects = selectedProjectId === 'ALL'
    ? projects
    : projects.filter((p) => p.id === selectedProjectId);

  const filteredSites = selectedProjectId === 'ALL'
    ? sites
    : sites.filter((s) => s.projectId === selectedProjectId);

  const filteredTasks = selectedProjectId === 'ALL'
    ? tasks
    : tasks.filter((t) => t.projectId === selectedProjectId);

  const filteredApprovedRecords = selectedProjectId === 'ALL'
    ? approvedRecords
    : approvedRecords.filter((r) => r.projectId === selectedProjectId);

  const completedTasks = filteredTasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'InProgress' || t.status === 'ToDo').length;
  const overdueTasks = filteredTasks.filter((t) => {
    if (!t.dueAt || t.status === 'Completed' || t.status === 'Cancelled') return false;
    return new Date(t.dueAt).getTime() < Date.now();
  }).length;

  const taskCompletionRate = filteredTasks.length > 0
    ? Math.round((completedTasks / filteredTasks.length) * 100)
    : 0;

  // Handle authenticated direct file export
  const handleExport = async (entityType: string, label: string) => {
    try {
      setDownloadingEntity(entityType);
      setDownloadSuccess(null);

      const token = typeof window !== 'undefined' ? localStorage.getItem('mti_access_token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mtiapi.runasp.net';
      const params = new URLSearchParams({
        entityType,
        format: exportFormat
      });

      if (selectedProjectId && selectedProjectId !== 'ALL') {
        params.set('projectId', selectedProjectId);
      }

      const url = `${baseUrl}/api/reports/export?${params.toString()}`;

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const ext = exportFormat === 'xlsx' ? 'xls' : 'csv';
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `MTI_${entityType}_Report_${dateStr}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      setDownloadSuccess(label);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      console.error('Download report error:', err);
      alert(isAr ? 'حدث خطأ أثناء تنزيل التقرير، يرجى المحاولة مرة أخرى.' : 'Failed to download report. Please try again.');
    } finally {
      setDownloadingEntity(null);
    }
  };

  // Report Categories Config
  const reportCards = [
    {
      id: 'Projects',
      entityType: 'Projects',
      title: isAr ? 'تقرير ملخص المشاريع التنفيذية' : 'Executive Projects Summary',
      description: isAr
        ? 'بيانات المشاريع المعتمدة، أكوادها، العملاء، نسب الإنجاز التراكمية، والتواريخ التعاقدية'
        : 'Authorized projects, codes, client data, progress metrics, and contractual dates',
      count: filteredProjects.length,
      countLabel: isAr ? 'مشروع مسجل' : 'projects',
      icon: Building2,
      color: 'from-sky-500/20 to-cyan-500/10',
      borderColor: 'border-cyan-500/30',
      accentColor: 'text-cyan-300'
    },
    {
      id: 'Sites',
      entityType: 'Sites',
      title: isAr ? 'تقرير المواقع والمحطات الميدانية' : 'Field Sites & Stations Report',
      description: isAr
        ? 'حصر كامل لكافة المواقع الميدانية، أكواد المحطات، العناوين، وحالة النشاط الميداني'
        : 'Comprehensive list of field locations, station codes, physical addresses, and status',
      count: filteredSites.length,
      countLabel: isAr ? 'موقع ميداني' : 'sites',
      icon: MapPin,
      color: 'from-emerald-500/20 to-teal-500/10',
      borderColor: 'border-emerald-500/30',
      accentColor: 'text-emerald-300'
    },
    {
      id: 'ProjectData',
      entityType: 'ProjectData',
      title: isAr ? 'سجل البيانات والتقارير الميدانية المعتمدة' : 'Approved Field Data & Reports',
      description: isAr
        ? 'سجل الأرشيف المحصن للبيانات الهندسية، تفاصيل الطقس، العمالة، وبنود الأعمال المنفذة'
        : 'Immutable archive of approved data records, weather, crew count, and work logged',
      count: filteredApprovedRecords.length,
      countLabel: isAr ? 'تقرير معتمد ومحصن' : 'approved records',
      icon: ShieldCheck,
      color: 'from-teal-500/20 to-emerald-500/10',
      borderColor: 'border-teal-500/30',
      accentColor: 'text-teal-300'
    },
    {
      id: 'Tasks',
      entityType: 'Tasks',
      title: isAr ? 'تقرير حالة المهام ومعدلات الإنجاز' : 'Task Status & Productivity Report',
      description: isAr
        ? 'توزيع المهام التشغيلية، الأولويات، المهندسين المعينين، التواريخ المستهدفة، ونسب الإتمام'
        : 'Operational tasks breakdown, priorities, assigned engineers, due dates, and completion',
      count: filteredTasks.length,
      countLabel: isAr ? 'مهمة عمل' : 'tasks',
      icon: CheckSquare,
      color: 'from-blue-500/20 to-indigo-500/10',
      borderColor: 'border-blue-500/30',
      accentColor: 'text-blue-300'
    },
    {
      id: 'Documents',
      entityType: 'Documents',
      title: isAr ? 'تقرير مستودع الوثائق والمستندات الهندسية' : 'Engineering Documents Inventory',
      description: isAr
        ? 'حصر الوثائق الفنية، أرقام المستندات، أنواعها، وحالات المراجعة والاعتماد'
        : 'Technical documents inventory, drawing numbers, categories, and review statuses',
      count: adminStats?.pendingDocuments ?? 0,
      countLabel: isAr ? 'مستند قيد المراجعة' : 'pending docs',
      icon: FileText,
      color: 'from-violet-500/20 to-purple-500/10',
      borderColor: 'border-violet-500/30',
      accentColor: 'text-violet-300'
    },
    {
      id: 'Invoices',
      entityType: 'Invoices',
      title: isAr ? 'تقرير الفواتير والتحصيل المالي' : 'Financial Invoices & Billing Report',
      description: isAr
        ? 'سجل الفواتير الهندسية، قيم العقود، الضرائب، التواريخ المستحقة، وحالات السداد'
        : 'Project invoices, contract amounts, taxes, due dates, and payment settlement statuses',
      count: filteredProjects.length,
      countLabel: isAr ? 'مشاريع خاضعة للفوترة' : 'billed projects',
      icon: DollarSign,
      color: 'from-amber-500/20 to-yellow-500/10',
      borderColor: 'border-amber-500/30',
      accentColor: 'text-amber-300'
    },
    {
      id: 'Assets',
      entityType: 'Assets',
      title: isAr ? 'تقرير العهد والمعدات والمخزون' : 'Company Assets & Equipment Inventory',
      description: isAr
        ? 'بيانات العهد والأصول المسجلة بالمواقع، الأرقام التسلسلية، وفترات سريان الضمان'
        : 'Assets inventory assigned to projects, serial numbers, tags, and warranty status',
      count: adminStats?.maintenanceTickets ?? 0,
      countLabel: isAr ? 'أصول تحت الصيانة' : 'in maintenance',
      icon: Package,
      color: 'from-rose-500/20 to-pink-500/10',
      borderColor: 'border-rose-500/30',
      accentColor: 'text-rose-300'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 1. Header & Controls Toolbar */}
      <div className="glow-card p-6 rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-[#0c182b] shadow-[0_0_40px_rgba(6,182,212,0.1)] space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-blue-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_24px_rgba(6,182,212,0.3)] flex-shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-100 tracking-wide">
                  {isAr ? 'مركز التقارير والتحليلات المؤسسية' : 'Enterprise Reports & Analytics Hub'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                  {isAr ? 'توليد وتصدير فوري' : 'Live Export Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                {isAr
                  ? 'كتالوج التقارير التنفيذية الشاملة، استخراج وتصدير البيانات بصيغ Excel و CSV، ومتابعة مؤشرات أداء المشاريع والمواقع'
                  : 'Executive reports catalog, instant CSV and Excel exports, and real-time operational performance analytics'}
              </p>
            </div>
          </div>

          {/* Quick Action Link to Archive */}
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('reports-archive')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex-shrink-0 self-start md:self-auto"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isAr ? 'فتح الأرشيف المحصن للتقارير' : 'Open Reports Archive'}</span>
            </button>
          )}
        </div>

        {/* Global Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Project Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'المشروع المستهدف:' : 'Target Project:'}</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs transition-all"
            >
              <option value="ALL">{isAr ? 'جميع المشاريع (All Projects)' : 'All Projects'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export Format Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'صيغة التصدير:' : 'Export Format:'}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`py-1 rounded-lg text-xs font-bold transition-all ${
                  exportFormat === 'xlsx'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Excel (.xls)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`py-1 rounded-lg text-xs font-bold transition-all ${
                  exportFormat === 'csv'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Quick Summary Badge 1 */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">{isAr ? 'المشاريع المشمولة' : 'Scope Projects'}</div>
              <div className="text-sm font-extrabold text-slate-100">{filteredProjects.length}</div>
            </div>
            <div className="text-end">
              <div className="text-[10px] text-slate-400">{isAr ? 'المواقع الميدانية' : 'Scope Sites'}</div>
              <div className="text-sm font-extrabold text-cyan-300">{filteredSites.length}</div>
            </div>
          </div>

          {/* Quick Summary Badge 2 */}
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">{isAr ? 'نسبة إنجاز المهام' : 'Task Completion'}</div>
              <div className="text-sm font-extrabold text-emerald-400">{taskCompletionRate}%</div>
            </div>
            <div className="text-end">
              <div className="text-[10px] text-slate-400">{isAr ? 'سجلات معتمدة' : 'Approved Records'}</div>
              <div className="text-sm font-extrabold text-teal-300">{filteredApprovedRecords.length}</div>
            </div>
          </div>
        </div>

        {/* Success Alert Banner when Downloaded */}
        {downloadSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-up">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>
              {isAr
                ? `تم تصدير وتنزيل "${downloadSuccess}" بنجاح بصيغة ${exportFormat.toUpperCase()}!`
                : `Successfully exported and downloaded "${downloadSuccess}" as ${exportFormat.toUpperCase()}!`}
            </span>
          </div>
        )}
      </div>

      {/* 2. Executive Analytics Cards (4 Key Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Projects KPI */}
        <div className="glow-card p-4 rounded-2xl border border-cyan-500/30 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">{isAr ? 'المشاريع التنفيذية' : 'Projects'}</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white tabular-nums">{filteredProjects.length}</div>
          <div className="text-[11px] text-cyan-300/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>{isAr ? 'نطاق العمل المحدد' : 'Selected Scope'}</span>
          </div>
        </div>

        {/* Sites KPI */}
        <div className="glow-card p-4 rounded-2xl border border-emerald-500/30 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">{isAr ? 'المواقع والمحطات' : 'Sites'}</span>
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-300 tabular-nums">{filteredSites.length}</div>
          <div className="text-[11px] text-emerald-400/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isAr ? 'محطة ميدانية تحت المتابعة' : 'Monitored Sites'}</span>
          </div>
        </div>

        {/* Tasks Progress KPI */}
        <div className="glow-card p-4 rounded-2xl border border-blue-500/30 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">{isAr ? 'المهام ومعدل الإنجاز' : 'Tasks Progress'}</span>
            <CheckSquare className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-300 tabular-nums">
            {completedTasks} <span className="text-xs text-slate-400">/ {filteredTasks.length}</span>
          </div>
          <div className="text-[11px] text-blue-300/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>{isAr ? `${taskCompletionRate}% نسبة الإنجاز` : `${taskCompletionRate}% completed`}</span>
          </div>
        </div>

        {/* Approved Records KPI */}
        <div className="glow-card p-4 rounded-2xl border border-teal-500/30 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">{isAr ? 'البيانات المعتمدة' : 'Approved Data'}</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-teal-300 tabular-nums">{filteredApprovedRecords.length}</div>
          <div className="text-[11px] text-teal-400/80 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span>{isAr ? 'تقارير موثقة بالأرشيف' : 'Archived records'}</span>
          </div>
        </div>
      </div>

      {/* 3. Report Catalog Grid (Click to Download Instantly) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-300" />
            <h3 className="text-base font-bold text-slate-100">
              {isAr ? 'كتالوج التقارير التنفيذية للتصدير المباشر' : 'Exportable Reports Catalog'}
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {isAr ? `${reportCards.length} تقارير جاهزة للتصدير` : `${reportCards.length} ready reports`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon;
            const isDownloading = downloadingEntity === card.entityType;

            return (
              <div
                key={card.id}
                className={`glow-card p-5 rounded-2xl border ${card.borderColor} bg-slate-900/80 flex flex-col justify-between space-y-4 hover:border-cyan-400/50 transition-all group`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.color} border ${card.borderColor} flex items-center justify-center ${card.accentColor} shadow-md flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-end">
                      <div className="text-lg font-extrabold text-slate-100 tabular-nums">{card.count}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{card.countLabel}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    entityType: {card.entityType}
                  </span>

                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleExport(card.entityType, card.title)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-500/40 border border-cyan-400/40 text-cyan-200 hover:text-white text-xs font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.15)] active:scale-95 disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-cyan-300" />
                    )}
                    <span>
                      {isDownloading
                        ? (isAr ? 'جاري التحميل...' : 'Downloading...')
                        : (isAr ? `تصدير ${exportFormat.toUpperCase()}` : `Export ${exportFormat.toUpperCase()}`)}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
