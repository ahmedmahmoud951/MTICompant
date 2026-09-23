'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Lock,
  FileText,
  Download,
  ShieldCheck,
  RotateCcw,
  Send,
  Calendar,
  BarChart3,
  Users,
  ClipboardList,
  Upload,
  Building2,
  AlertTriangle,
  Package,
  Wrench,
} from 'lucide-react';
import {
  dailyReportsService,
  CreateDailyReportPayload,
  ReviewDailyReportPayload,
  CreateReportRevisionPayload
} from '@/services/daily-reports.service';
import { mediaService } from '@/services/media.service';
import { signalRService } from '@/services/signalr.service';
import { AppModal } from '@/components/AppModal';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';
import {
  DailySiteReportDto,
  DailySiteReportDetailDto,
  DailyReportStatus,
  Project,
  Site,
  User
} from '@/types';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';

interface DailySiteReportsManagerProps {
  currentUser: User | null;
  projects: Project[];
  sites?: Site[];
  lang: Language;
}

export const DailySiteReportsManager: React.FC<DailySiteReportsManagerProps> = ({
  currentUser,
  projects,
  sites = [],
  lang
}) => {
  const [reports, setReports] = useState<DailySiteReportDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<DailyReportStatus | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Active Report Details
  const [activeReport, setActiveReport] = useState<DailySiteReportDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateDailyReportPayload>({
    projectId: '',
    siteId: '',
    reportDate: new Date().toISOString().split('T')[0],
    manpower: '',
    workCompleted: '',
    problems: '',
    materialsReceived: '',
    materialsUsed: '',
    equipment: '',
    safetyNotes: '',
    tomorrowPlan: ''
  });
  const [revisionForm, setRevisionForm] = useState<CreateReportRevisionPayload>({
    manpower: '',
    workCompleted: '',
    problems: '',
    materialsReceived: '',
    materialsUsed: '',
    equipment: '',
    safetyNotes: '',
    tomorrowPlan: ''
  });
  const [reviewPayload, setReviewPayload] = useState<ReviewDailyReportPayload>({
    status: 'Approved',
    notes: ''
  });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentCaption, setAttachmentCaption] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const t = (k: any) => getTranslation(k, lang);
  const isArabic = lang === 'ar';
  const isAdmin = currentUser?.roles?.some(r => r === 'Admin' || r === 'SystemAdmin' || r === 'ProjectManager');

  useEffect(() => {
    loadReports();
  }, [selectedProjectId, selectedSiteId, selectedStatus, selectedDate]);

  useEffect(() => {
    const handleReportReload = () => {
      loadReports();
      if (activeReport) {
        handleSelectReport(activeReport.id);
      }
    };
    const unsub1 = signalRService.on('ReportCreated', handleReportReload);
    const unsub2 = signalRService.on('ReportUpdated', handleReportReload);
    const unsub3 = signalRService.on('ReportSubmitted', handleReportReload);
    const unsub4 = signalRService.on('ReportReviewed', handleReportReload);
    const unsub5 = signalRService.on('ReportRevisionCreated', handleReportReload);
    const unsub6 = signalRService.on('ReportAttachmentAdded', handleReportReload);
    const unsub7 = signalRService.on('DailyReportCreated', handleReportReload);
    const unsub8 = signalRService.on('DailyReportUpdated', handleReportReload);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      unsub7();
      unsub8();
    };
  }, [activeReport]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await dailyReportsService.getReports({
        projectId: selectedProjectId || undefined,
        siteId: selectedSiteId || undefined,
        status: (selectedStatus as DailyReportStatus) || undefined,
        date: selectedDate || undefined
      });
      if (res.success && res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.error('Failed to load daily reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = async (repId: string) => {
    setLoadingDetail(true);
    try {
      const res = await dailyReportsService.getById(repId);
      if (res.success && res.data) {
        setActiveReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load report detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.projectId || !createForm.siteId || !createForm.workCompleted) {
      setActionError(isArabic ? 'يرجى ملء الحقول الإلزامية' : 'Please fill required fields');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const res = await dailyReportsService.createReport(createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          projectId: '',
          siteId: '',
          reportDate: new Date().toISOString().split('T')[0],
          manpower: '',
          workCompleted: '',
          problems: '',
          materialsReceived: '',
          materialsUsed: '',
          equipment: '',
          safetyNotes: '',
          tomorrowPlan: ''
        });
        loadReports();
        signalRService.emit('ReportCreated', res.data);
        signalRService.emit('AdminStatsUpdated');
      } else {
        setActionError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmit = async (reportId: string) => {
    try {
      const res = await dailyReportsService.submitReport(reportId);
      if (res.success) {
        loadReports();
        handleSelectReport(reportId);
        signalRService.emit('ReportSubmitted', { id: reportId });
        signalRService.emit('AdminStatsUpdated');
      }
    } catch (err) {
      console.error('Failed to submit report', err);
    }
  };

  const handleReview = async () => {
    if (!activeReport) return;
    setActionLoading(true);
    try {
      const res = await dailyReportsService.reviewReport(activeReport.id, reviewPayload);
      if (res.success) {
        setShowReviewModal(false);
        loadReports();
        handleSelectReport(activeReport.id);
        signalRService.emit('ReportReviewed', { id: activeReport.id, status: reviewPayload.status });
        signalRService.emit('AdminStatsUpdated');
      }
    } catch (err) {
      console.error('Failed to review report', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCorrectionRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await dailyReportsService.createRevision(activeReport.id, revisionForm);
      if (res.success && res.data) {
        setShowRevisionModal(false);
        loadReports();
        handleSelectReport(res.data.id);
        signalRService.emit('ReportRevisionCreated', res.data);
      } else {
        setActionError(res.message || 'Revision failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Revision failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !attachmentFile) return;

    setActionLoading(true);
    setActionError('');
    try {
      const uploadedMedia = await mediaService.uploadDirectToB2(attachmentFile, {
        targetType: 'ReportAttachment',
        projectId: activeReport.projectId,
        siteId: activeReport.siteId,
        reportId: activeReport.id
      });

      const res = await dailyReportsService.addAttachment(activeReport.id, {
        mediaFileId: uploadedMedia.id,
        caption: attachmentCaption
      });

      if (res.success) {
        setShowAttachmentModal(false);
        setAttachmentFile(null);
        setAttachmentCaption('');
        handleSelectReport(activeReport.id);
        signalRService.emit('ReportAttachmentAdded', { reportId: activeReport.id });
      }
    } catch (err: any) {
      setActionError(err.message || 'Attachment upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: DailyReportStatus, isImmutable: boolean) => {
    if (isImmutable || status === 'Approved') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
          <Lock className="w-3 h-3" />
          {isArabic ? 'معتمد ومحصن' : 'Approved (Immutable)'}
        </span>
      );
    }
    switch (status) {
      case 'Submitted':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{status}</span>;
      case 'Reviewed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">{status}</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">{status}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const resetFilters = () => {
    setSelectedProjectId('');
    setSelectedSiteId('');
    setSelectedStatus('');
    setSelectedDate('');
  };

  const openCreate = () => {
    setActionError('');
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-5 pb-2">
      {/* Hero — Company.png */}
      <section className="company-hero border border-cyan-400/30 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
        <img src="/images/Company.png" alt="" className="company-hero-img" aria-hidden />
        <div className="company-hero-veil" aria-hidden />
        <div className="company-hero-content">
          <div className="company-hero-slot company-hero-slot-start">
            <div className="company-hero-glass max-w-md">
              <h2 className="font-display text-base sm:text-xl font-bold text-white leading-snug">
                {t('reportsTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-100/95 leading-relaxed">
                {t('reportsSubtitle')}
              </p>
            </div>
          </div>

          <div className="company-hero-slot company-hero-slot-center" aria-hidden />

          <div className="company-hero-slot company-hero-slot-end">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee] shadow-[0_0_24px_rgba(14,165,233,0.5)] hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              {t('createReport')}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] tracking-[0.18em] uppercase text-cyan-100 font-bold bg-[#0b1526]/85 border border-cyan-400/30">
          <ClipboardList className="w-3.5 h-3.5 text-cyan-300" />
          Turn ideas into reality
        </div>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="p-2.5 rounded-xl border border-cyan-400/30 bg-slate-900/60 text-cyan-200 hover:bg-slate-800"
          title={isArabic ? 'تحديث' : 'Refresh'}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Main content */}
        <div className="xl:col-span-8 space-y-4">
          <div className="reports-panel rounded-2xl min-h-[380px] p-4 sm:p-5">
            {loading ? (
              <div className="h-full min-h-[320px] flex items-center justify-center text-slate-400 text-sm gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-300" />
                {isArabic ? 'جاري تحميل التقارير…' : 'Loading reports…'}
              </div>
            ) : activeReport ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/60">
                  <div className="text-start">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-100">
                        {isArabic ? 'تقرير الموقع اليومي' : 'Daily site report'} — {formatDateCairo(activeReport.reportDate)}
                      </h3>
                      {activeReport.revisionNumber > 1 && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300">
                          Rev #{activeReport.revisionNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeReport.projectName} / {activeReport.siteName} — {activeReport.engineerUserName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(activeReport.status, activeReport.isImmutable)}
                    {activeReport.status === 'Draft' && (
                      <button
                        type="button"
                        onClick={() => handleSubmit(activeReport.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {isArabic ? 'تقديم للاعتماد' : 'Submit'}
                      </button>
                    )}
                    {isAdmin && (activeReport.status === 'Submitted' || activeReport.status === 'Reviewed') && (
                      <button
                        type="button"
                        onClick={() => setShowReviewModal(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isArabic ? 'اعتماد / فحص' : 'Review'}
                      </button>
                    )}
                    {(activeReport.isImmutable || activeReport.status === 'Approved' || activeReport.status === 'Rejected') && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevisionForm({
                            manpower: activeReport.manpower,
                            workCompleted: activeReport.workCompleted,
                            problems: activeReport.problems,
                            materialsReceived: activeReport.materialsReceived,
                            materialsUsed: activeReport.materialsUsed,
                            equipment: activeReport.equipment,
                            safetyNotes: activeReport.safetyNotes,
                            tomorrowPlan: activeReport.tomorrowPlan
                          });
                          setShowRevisionModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {isArabic ? 'تعديل / تصحيح' : 'New revision'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveReport(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2"
                    >
                      {isArabic ? 'إغلاق' : 'Close'}
                    </button>
                  </div>
                </div>

                {activeReport.isImmutable && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>
                      {isArabic
                        ? `تم اعتماد هذا التقرير في ${formatDateCairo(activeReport.approvedAt)} بواسطة ${activeReport.approvedByUserName || 'الإدارة'}، وهو مقفل ضد التعديل.`
                        : `Approved on ${formatDateCairo(activeReport.approvedAt)} by ${activeReport.approvedByUserName || 'Admin'}. Locked against edits.`}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-cyan-300">{t('manpower')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.manpower || '—'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-cyan-300">{t('equipment')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.equipment || '—'}</p>
                  </div>
                  <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-cyan-300">{t('workCompleted')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.workCompleted || '—'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-rose-300">{t('problems')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.problems || '—'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-amber-300">{t('safetyNotes')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.safetyNotes || '—'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-cyan-300">{t('materialsReceived')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.materialsReceived || '—'}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-cyan-300">{t('materialsUsed')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.materialsUsed || '—'}</p>
                  </div>
                  <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-950/45 border border-slate-700/60 space-y-1 text-start">
                    <span className="text-xs font-semibold text-cyan-300">{t('tomorrowPlan')}</span>
                    <p className="text-slate-200 text-xs whitespace-pre-line">{activeReport.tomorrowPlan || '—'}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      {isArabic ? 'المرفقات' : 'Attachments'} ({activeReport.attachments.length})
                    </h4>
                    {!activeReport.isImmutable && (
                      <button
                        type="button"
                        onClick={() => setShowAttachmentModal(true)}
                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        + {isArabic ? 'إضافة مرفق' : 'Add attachment'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {activeReport.attachments.length === 0 ? (
                      <div className="col-span-3 text-xs text-slate-500 py-4 text-center">
                        {isArabic ? 'لا توجد مرفقات' : 'No attachments'}
                      </div>
                    ) : (
                      activeReport.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-3 rounded-xl bg-slate-950/50 border border-slate-700/60 flex items-center justify-between"
                        >
                          <div className="overflow-hidden pe-2 text-start">
                            <div className="text-xs font-semibold text-slate-200 truncate">{att.fileName}</div>
                            <div className="text-[10px] text-cyan-300 uppercase">{att.attachmentType}</div>
                          </div>
                          {att.downloadUrl && (
                            <a
                              href={att.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex-shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : reports.length === 0 ? (
              <div className="min-h-[320px] flex flex-col items-center justify-center text-center px-4 py-10 space-y-5">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-sky-500/15 blur-2xl" />
                  <div className="relative w-28 h-28 rounded-2xl border border-cyan-400/40 bg-slate-950/60 flex items-center justify-center shadow-[0_0_40px_rgba(14,165,233,0.35)]">
                    <ClipboardList className="w-12 h-12 text-cyan-300" strokeWidth={1.4} />
                  </div>
                  <Calendar className="absolute -top-1 start-1 w-7 h-7 text-sky-300/85 drop-shadow" />
                  <BarChart3 className="absolute top-2 -end-1 w-7 h-7 text-violet-300/85 drop-shadow" />
                  <Clock className="absolute -bottom-1 start-3 w-7 h-7 text-emerald-300/85 drop-shadow" />
                  <FileText className="absolute bottom-1 -end-2 w-7 h-7 text-amber-300/85 drop-shadow" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{t('reportsEmptyTitle')}</h3>
                  <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">{t('reportsEmptyHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee] shadow-[0_0_28px_rgba(14,165,233,0.5)]"
                >
                  <Plus className="w-4 h-4" />
                  {isArabic ? 'إضافة تقرير يومي جديد' : 'Add new daily report'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-400 mb-2 text-start">{t('reportsSelectHint')}</p>
                {(reports as DailySiteReportDto[]).map((rep: DailySiteReportDto) => {
                  const isSelected = Boolean((activeReport as any)?.id === rep.id);
                  return (
                    <div
                      key={rep.id}
                      onClick={() => handleSelectReport(rep.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all text-start ${
                        isSelected
                          ? 'bg-slate-900/90 border-cyan-400/70 shadow-[0_0_20px_rgba(14,165,233,0.2)]'
                          : 'bg-slate-950/40 border-cyan-400/20 hover:border-cyan-400/45'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 text-sm">{formatDateCairo(rep.reportDate)}</span>
                            {rep.revisionNumber > 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                                Rev #{rep.revisionNumber}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {rep.projectName} — {rep.siteName}
                          </div>
                        </div>
                        {getStatusBadge(rep.status, rep.isImmutable)}
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex justify-between text-[11px] text-slate-500">
                        <span>{rep.engineerUserName}</span>
                        <span>
                          {rep.attachmentsCount} {isArabic ? 'مرفقات' : 'files'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filter panel */}
        <div className="xl:col-span-4">
          <div className="reports-panel rounded-2xl p-4 space-y-4 sticky top-2">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-300" />
              {t('reportsFilterTitle')}
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">{t('navProjects')}</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100"
              >
                <option value="">{t('reportsAllProjects')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">{t('status')}</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100"
              >
                <option value="">{t('reportsAllStatuses')}</option>
                <option value="Draft">{isArabic ? 'مسودة' : 'Draft'}</option>
                <option value="Submitted">{isArabic ? 'مُرسل' : 'Submitted'}</option>
                <option value="Reviewed">{isArabic ? 'تمت المراجعة' : 'Reviewed'}</option>
                <option value="Approved">{isArabic ? 'معتمد' : 'Approved'}</option>
                <option value="Rejected">{isArabic ? 'مرفوض' : 'Rejected'}</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={loadReports}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee] shadow-[0_0_20px_rgba(14,165,233,0.4)]"
              >
                <Search className="w-4 h-4" />
                {t('reportsSearchBtn')}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 border border-slate-600/60 hover:bg-slate-800/60"
              >
                <RotateCcw className="w-4 h-4" />
                {t('reportsResetBtn')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: CheckCircle2, title: t('reportsFeatDocTitle'), desc: t('reportsFeatDocDesc') },
          { icon: Users, title: t('reportsFeatFollowTitle'), desc: t('reportsFeatFollowDesc') },
          { icon: Clock, title: t('reportsFeatOrgTitle'), desc: t('reportsFeatOrgDesc') },
          { icon: ShieldCheck, title: t('reportsFeatApproveTitle'), desc: t('reportsFeatApproveDesc') },
        ].map((feat) => {
          const Icon = feat.icon;
          return (
            <div key={feat.title} className="reports-panel rounded-2xl p-4 text-start space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-slate-100">{feat.title}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Daily Report */}
      <AppModal
        open={showCreateModal}
        onClose={() => !actionLoading && setShowCreateModal(false)}
        title={isArabic ? 'تسجيل تقرير يومي للموقع' : t('createReport')}
        width="min(100%, 46rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
            <ClipboardList className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="space-y-2.5">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري توثيق وحفظ التقرير اليومي…' : 'Saving daily report…'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="daily-create-form"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] hover:brightness-110 disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {actionLoading
                  ? isArabic
                    ? 'جاري الحفظ…'
                    : 'Saving…'
                  : isArabic
                    ? 'حفظ وتوثيق التقرير'
                    : 'Save & Record Report'}
              </button>
            </div>
          </div>
        }
      >
        {actionError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
        <form id="daily-create-form" onSubmit={handleCreateReport} className="space-y-3.5 text-start">
          {/* Card 1: Project & Site Selection */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-400/20 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span>{isArabic ? '1. بيانات المشروع والموقع التابع له' : '1. Project & Site Assignment'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {t('navProjects')} <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={actionLoading}
                  value={createForm.projectId}
                  onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400"
                >
                  <option value="">{isArabic ? 'اختر المشروع المعني...' : 'Select project...'}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {t('navSites')} <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={actionLoading}
                  value={createForm.siteId}
                  onChange={(e) => setCreateForm({ ...createForm, siteId: e.target.value })}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400"
                >
                  <option value="">{isArabic ? 'اختر موقع العمل...' : 'Select site...'}</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Date, Crew & Equipment */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-400/20 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isArabic ? '2. تاريخ العمل وطاقم التنفيذ والمعدات' : '2. Date, Crew & Equipment'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {t('reportDate')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={actionLoading}
                  value={createForm.reportDate}
                  onChange={(e) => setCreateForm({ ...createForm, reportDate: e.target.value })}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    {t('manpower')}
                  </span>
                </label>
                <input
                  type="text"
                  disabled={actionLoading}
                  value={createForm.manpower}
                  onChange={(e) => setCreateForm({ ...createForm, manpower: e.target.value })}
                  placeholder={isArabic ? 'مثال: 2 مهندس، 5 فنيين، 3 عمال' : 'e.g. 2 Engineers, 5 Techs'}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-cyan-400" />
                    {t('equipment')}
                  </span>
                </label>
                <input
                  type="text"
                  disabled={actionLoading}
                  value={createForm.equipment}
                  onChange={(e) => setCreateForm({ ...createForm, equipment: e.target.value })}
                  placeholder={isArabic ? 'مثال: سيارة ورشة، سلم هيدروليكي' : 'e.g. Service Van, Scissor Lift'}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Work Completed */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-400/20 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isArabic ? '3. الأعمال المنفذة وإنجاز اليوم' : '3. Work Accomplished'}</span>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {t('workCompleted')} <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={2}
                disabled={actionLoading}
                value={createForm.workCompleted}
                onChange={(e) => setCreateForm({ ...createForm, workCompleted: e.target.value })}
                placeholder={isArabic ? 'اشرح بالتفصيل ما تم إنجازه اليوم في الموقع...' : 'Detail the tasks completed today...'}
                className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400 resize-none"
              />
            </div>
          </div>

          {/* Card 4: Problems & Safety Notes */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-400/20 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isArabic ? '4. المعوقات والمشاكل واشتراطات السلامة (HSE)' : '4. Site Issues & HSE Safety'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">{t('problems')}</label>
                <textarea
                  rows={2}
                  disabled={actionLoading}
                  value={createForm.problems}
                  onChange={(e) => setCreateForm({ ...createForm, problems: e.target.value })}
                  placeholder={isArabic ? 'أي عائق فني أو تأخير من جهة أخرى...' : 'Any technical or coordination hurdles...'}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">{t('safetyNotes')}</label>
                <textarea
                  rows={2}
                  disabled={actionLoading}
                  value={createForm.safetyNotes}
                  onChange={(e) => setCreateForm({ ...createForm, safetyNotes: e.target.value })}
                  placeholder={isArabic ? 'ملاحظات الأمان والالتزام بمعدات الوقاية الشخصية...' : 'Safety compliance notes...'}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Card 5: Materials & Tomorrow Plan */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-400/20 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
              <Package className="w-3.5 h-3.5" />
              <span>{isArabic ? '5. حركة المواد وخطة الغد' : '5. Materials & Tomorrow’s Plan'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">{t('materialsReceived')}</label>
                <textarea
                  rows={2}
                  disabled={actionLoading}
                  value={createForm.materialsReceived}
                  onChange={(e) => setCreateForm({ ...createForm, materialsReceived: e.target.value })}
                  placeholder={isArabic ? 'مواد أو أجهزة تم توريدها اليوم للموقع...' : 'Materials received today...'}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">{t('materialsUsed')}</label>
                <textarea
                  rows={2}
                  disabled={actionLoading}
                  value={createForm.materialsUsed}
                  onChange={(e) => setCreateForm({ ...createForm, materialsUsed: e.target.value })}
                  placeholder={isArabic ? 'مواد تم استهلاكها أو تركيبها...' : 'Materials consumed or installed...'}
                  className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400 resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  {t('tomorrowPlan')}
                </span>
              </label>
              <textarea
                rows={2}
                disabled={actionLoading}
                value={createForm.tomorrowPlan}
                onChange={(e) => setCreateForm({ ...createForm, tomorrowPlan: e.target.value })}
                placeholder={isArabic ? 'خطة الأعمال المستهدفة ليوم غد...' : 'Key goals planned for tomorrow...'}
                className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 focus:border-cyan-400 resize-none"
              />
            </div>
          </div>
        </form>
      </AppModal>

      {/* Modal: Create Correction Revision */}
      <AppModal
        open={showRevisionModal}
        onClose={() => !actionLoading && setShowRevisionModal(false)}
        title={isArabic ? 'إصدار مراجعة تعديلية للتقرير' : t('newRevision')}
        width="min(100%, 38rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300">
            <RotateCcw className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="space-y-2.5">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري إصدار وتثبيت المراجعة التعديلية…' : 'Issuing revision…'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="daily-revision-form"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {actionLoading
                  ? isArabic
                    ? 'جاري الإصدار…'
                    : 'Saving…'
                  : isArabic
                    ? 'إصدار المراجعة الجديدة'
                    : 'Issue New Revision'}
              </button>
            </div>
          </div>
        }
      >
        <form id="daily-revision-form" onSubmit={handleCreateCorrectionRevision} className="space-y-3 text-start">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-400/20 space-y-2">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {t('workCompleted')} <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              disabled={actionLoading}
              value={revisionForm.workCompleted}
              onChange={(e) => setRevisionForm({ ...revisionForm, workCompleted: e.target.value })}
              className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-200 mb-1">{t('problems')}</label>
              <textarea
                rows={2}
                disabled={actionLoading}
                value={revisionForm.problems}
                onChange={(e) => setRevisionForm({ ...revisionForm, problems: e.target.value })}
                className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 resize-none"
              />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-700/60">
              <label className="block text-xs font-semibold text-slate-200 mb-1">{t('safetyNotes')}</label>
              <textarea
                rows={2}
                disabled={actionLoading}
                value={revisionForm.safetyNotes}
                onChange={(e) => setRevisionForm({ ...revisionForm, safetyNotes: e.target.value })}
                className="field-input w-full px-3 py-2 rounded-xl text-xs bg-slate-900/90 border-slate-700 resize-none"
              />
            </div>
          </div>
        </form>
      </AppModal>

      {/* Modal: Review Report */}
      <AppModal
        open={showReviewModal}
        onClose={() => !actionLoading && setShowReviewModal(false)}
        title={isArabic ? 'اعتماد أو فحص التقرير' : 'Review Report'}
        width="min(100%, 28rem)"
        closeDisabled={actionLoading}
        footer={
          <div className="space-y-2.5">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري توثيق قرار الاعتماد…' : 'Applying review status…'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] disabled:opacity-60"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {actionLoading ? (isArabic ? 'جاري التأكيد…' : 'Confirming…') : isArabic ? 'تأكيد الاعتماد' : 'Confirm Review'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {t('status')} <span className="text-rose-400">*</span>
            </label>
            <select
              value={reviewPayload.status}
              disabled={actionLoading}
              onChange={(e) => setReviewPayload({ ...reviewPayload, status: e.target.value as any })}
              className="field-input w-full px-3 py-2 rounded-xl text-sm"
            >
              <option value="Approved">
                {isArabic ? 'اعتماد (يصبح التقرير محصناً)' : 'Approve (Report becomes immutable)'}
              </option>
              <option value="Reviewed">{isArabic ? 'تمت المراجعة' : 'Reviewed'}</option>
              <option value="Rejected">{isArabic ? 'مرفوض' : 'Rejected'}</option>
            </select>
          </div>
          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              rows={2}
              disabled={actionLoading}
              value={reviewPayload.notes || ''}
              onChange={(e) => setReviewPayload({ ...reviewPayload, notes: e.target.value })}
              className="field-input w-full px-3 py-2 rounded-xl text-sm resize-none"
            />
          </div>
        </div>
      </AppModal>

      {/* Modal: Add Attachment */}
      <AppModal
        open={showAttachmentModal}
        onClose={() => !actionLoading && setShowAttachmentModal(false)}
        title={isArabic ? 'إضافة مرفق للتقرير' : 'Add Attachment'}
        width="min(100%, 28rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
            <Upload className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="space-y-2.5">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري رفع وتوثيق المرفق في التخزين…' : 'Uploading attachment to storage…'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="daily-attachment-form"
                disabled={actionLoading || !attachmentFile}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] disabled:opacity-60"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {actionLoading
                  ? isArabic
                    ? 'جاري الرفع…'
                    : 'Uploading…'
                  : isArabic
                    ? 'رفع المرفق'
                    : 'Upload Attachment'}
              </button>
            </div>
          </div>
        }
      >
        {actionError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {actionError}
          </div>
        )}
        <form id="daily-attachment-form" onSubmit={handleAddAttachment} className="space-y-3">
          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'اختر ملف' : 'Select File'} <span className="text-rose-400">*</span>
            </label>
            <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[80px] px-4 py-3 rounded-xl border border-dashed border-cyan-400/40 bg-slate-950/45 cursor-pointer">
              <Upload className="w-5 h-5 text-cyan-300" />
              <span className="text-xs text-slate-200 font-semibold text-center">
                {attachmentFile
                  ? attachmentFile.name
                  : isArabic
                    ? 'اضغط لاختيار ملف'
                    : 'Click to choose a file'}
              </span>
              <input
                type="file"
                required={!attachmentFile}
                disabled={actionLoading}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>
          </div>
          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'وصف الملف' : 'Caption'}
            </label>
            <input
              type="text"
              disabled={actionLoading}
              value={attachmentCaption}
              onChange={(e) => setAttachmentCaption(e.target.value)}
              className="field-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
};
