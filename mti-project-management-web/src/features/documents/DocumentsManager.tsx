'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Download,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Lock,
  History,
  FileCheck,
  Trash2,
  AlertCircle,
  Briefcase,
  FolderOpen,
  Cloud,
  Users,
  Zap,
  Layers,
  CloudUpload,
  Image as ImageIcon,
  Film,
  FileSpreadsheet,
  Upload,
  Edit,
  User as UserIcon,
} from 'lucide-react';
import { documentsService, CreateDocumentRequest } from '@/services/documents.service';
import { projectService } from '@/services/project.service';
import { signalRService } from '@/services/signalr.service';
import { DocumentDto, DocumentTypeDto, DocumentDetailDto, Project, Site, User } from '@/types';
import { UploadProgressBar } from '@/components/UploadProgressBar';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';

interface DocumentsManagerProps {
  currentUser: User | null;
  projects: Project[];
  lang: Language;
  initialCategory?: string;
}

const DOCUMENT_CATEGORIES = [
  { key: 'All', labelAr: 'الكل', labelEn: 'All Documents' },
  { key: 'TechnicalOffice', labelAr: 'المكتب الفني', labelEn: 'Technical Office' },
  { key: 'Accounting', labelAr: 'الحسابات والمالية', labelEn: 'Accounting' },
  { key: 'Drawings', labelAr: 'المخططات الهندسية', labelEn: 'Drawings' },
  { key: 'DailyReports', labelAr: 'التقارير اليومية', labelEn: 'Daily Reports' },
  { key: 'SiteDocuments', labelAr: 'مستندات الموقع', labelEn: 'Site Documents' },
  { key: 'DataSheets', labelAr: 'لوائح البيانات الفنية', labelEn: 'Data Sheets' },
  { key: 'Software', labelAr: 'البرمجيات والأنظمة', labelEn: 'Software' },
  { key: 'Installation', labelAr: 'أعمال التركيب', labelEn: 'Installation' },
  { key: 'Maintenance', labelAr: 'أعمال الصيانة', labelEn: 'Maintenance' },
  { key: 'Contracts', labelAr: 'العقود والاتفاقيات', labelEn: 'Contracts' },
  { key: 'Procurement', labelAr: 'المشتريات والتوريدات', labelEn: 'Procurement' },
  { key: 'Other', labelAr: 'أخرى', labelEn: 'Other' },
];

export const DocumentsManager: React.FC<DocumentsManagerProps> = ({ currentUser, projects, lang, initialCategory }) => {
  const [documents, setDocuments] = useState<DocumentDto[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetailDto | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showNewVersionModal, setShowNewVersionModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDocTypeId, setNewDocTypeId] = useState('');
  const [newProjId, setNewProjId] = useState('');
  const [newSiteId, setNewSiteId] = useState('');
  const [projectSites, setProjectSites] = useState<Site[]>([]);
  const [loadingProjectSites, setLoadingProjectSites] = useState(false);
  const [newCategory, setNewCategory] = useState<string>('TechnicalOffice');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (newProjId) {
      setLoadingProjectSites(true);
      projectService
        .getProjectSites(newProjId)
        .then((res) => {
          if (res.success && res.data) {
            setProjectSites(res.data);
          } else {
            setProjectSites([]);
          }
        })
        .catch(() => setProjectSites([]))
        .finally(() => setLoadingProjectSites(false));
    } else {
      setProjectSites([]);
    }
    setNewSiteId('');
  }, [newProjId]);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDocTypeId, setEditDocTypeId] = useState('');
  const [versionReason, setVersionReason] = useState('');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'Approved' | 'Rejected' | 'CorrectionRequested'>('Approved');
  const [reviewReason, setReviewReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [portalReady, setPortalReady] = useState(false);

  const t = (k: any) => getTranslation(k, lang);
  const isArabic = lang === 'ar';
  const isAdmin = currentUser?.roles?.some(r => r === 'Admin' || r === 'SystemAdmin' || r === 'SuperAdmin' || r === 'ProjectManager');

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    loadDocumentTypes();
    loadDocuments();
  }, [selectedProjectId, selectedTypeId, selectedCategory]);

  // Real-time synchronization via SignalR & Multi-tab channel
  useEffect(() => {
    const unsub1 = signalRService.on('DocumentCreated', (payload?: any) => {
      loadDocuments();
    });
    const unsub2 = signalRService.on('DocumentUpdated', (payload?: any) => {
      loadDocuments();
      if (selectedDoc?.id) handleOpenDetail(selectedDoc.id);
    });
    const unsub3 = signalRService.on('DocumentDeleted', (payload?: any) => {
      loadDocuments();
      if (selectedDoc?.id && payload?.id === selectedDoc.id) {
        setSelectedDoc(null);
      }
    });
    const unsub4 = signalRService.on('DocumentReviewed', (payload?: any) => {
      loadDocuments();
      if (selectedDoc?.id) handleOpenDetail(selectedDoc.id);
    });
    const unsub5 = signalRService.on('DocumentVersionUploaded', (payload?: any) => {
      loadDocuments();
      if (selectedDoc?.id) handleOpenDetail(selectedDoc.id);
    });
    const unsub6 = signalRService.on('DocumentVersionDeleted', (payload?: any) => {
      loadDocuments();
      if (selectedDoc?.id) handleOpenDetail(selectedDoc.id);
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [selectedDoc?.id, selectedProjectId, selectedTypeId, searchQuery]);

  const loadDocumentTypes = async () => {
    try {
      const res = await documentsService.getDocumentTypes();
      if (res.success && res.data) {
        setDocumentTypes(res.data);
      }
    } catch (err) {
      console.error('Failed to load document types', err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentsService.getDocuments({
        projectId: selectedProjectId || undefined,
        documentTypeId: selectedTypeId || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery || undefined
      });
      if (res.success && res.data) {
        setDocuments(res.data);
      }
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (docId: string) => {
    setLoadingDetail(true);
    try {
      const res = await documentsService.getDocumentById(docId);
      if (res.success && res.data) {
        setSelectedDoc(res.data);
      }
    } catch (err) {
      console.error('Failed to load doc detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownload = async (documentId?: string, versionId?: string) => {
    const effectiveDocId = (documentId && documentId !== 'undefined')
      ? documentId
      : (selectedDoc?.id || (selectedDoc as any)?.document?.id);

    if (!effectiveDocId || effectiveDocId === 'undefined') {
      alert(isArabic ? 'معرف المستند غير صالح' : 'Invalid document ID');
      return;
    }

    try {
      // 1. If the version object already has downloadUrl pre-signed, use it directly!
      const verObj = selectedDoc?.versions?.find((v) => v.id === versionId) || selectedDoc?.versions?.[0];
      if (verObj && (verObj as any).downloadUrl) {
        window.open((verObj as any).downloadUrl, '_blank');
        return;
      }

      const res = await documentsService.getDownloadUrl(effectiveDocId, versionId);
      if (res.success && res.data?.downloadUrl) {
        window.open(res.data.downloadUrl, '_blank');
      } else {
        alert(res.message || (isArabic ? 'لا توجد ملفات مرفوعة لهذا المستند بعد' : 'No file uploaded for this document yet'));
      }
    } catch (err: any) {
      alert(err.message || 'Download failed');
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjId || !selectedFile) {
      setActionError(isArabic ? 'يرجى اختيار المشروع وتحديد الملف المطلوب رفعه' : 'Please select a project and a file to upload');
      return;
    }

    const effectiveTitle = newTitle.trim() || selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) || selectedFile.name;
    const effectiveTypeId = newDocTypeId || (documentTypes[0]?.id || '');

    setActionLoading(true);
    setUploadPercent(0);
    setActionError('');
    setActionSuccess('');

    try {
      const res = await documentsService.createDocument(
        {
          projectId: newProjId,
          siteId: newSiteId || undefined,
          documentTypeId: effectiveTypeId,
          title: effectiveTitle,
          description: newDescription,
          file: selectedFile,
          category: newCategory
        },
        (pct) => setUploadPercent(pct)
      );

      if (res.success) {
        setActionSuccess(isArabic ? 'تم رفع المستند وتأمينه بنجاح في Backblaze B2' : 'Document uploaded and secured in Backblaze B2');
        setShowUploadModal(false);
        setNewTitle('');
        setNewDescription('');
        setNewSiteId('');
        setSelectedFile(null);
        setUploadPercent(0);
        loadDocuments();
        signalRService.emit('DocumentCreated', res.data);
        signalRService.emit('AdminStatsUpdated');
      } else {
        setActionError(res.message || (res.errors?.[0] as string) || 'Upload failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !versionFile) {
      setActionError(isArabic ? 'يرجى اختيار ملف الإصدار الجديد' : 'Please select the new version file');
      return;
    }

    const effectiveDocId = selectedDoc.id || (selectedDoc as any)?.document?.id;
    if (!effectiveDocId || effectiveDocId === 'undefined') {
      setActionError(isArabic ? 'معرف المستند غير صالح' : 'Document ID not found');
      return;
    }

    setActionLoading(true);
    setUploadPercent(0);
    setActionError('');

    try {
      const res = await documentsService.uploadNewVersion(
        effectiveDocId,
        {
          changeReason: versionReason,
          file: versionFile
        },
        (pct) => setUploadPercent(pct)
      );

      if (res.success) {
        setActionSuccess(isArabic ? 'تم حفظ الإصدار الجديد بنجاح مع الحفاظ على النسخ السابقة' : 'New version saved without overwriting history');
        setShowNewVersionModal(false);
        setVersionReason('');
        setVersionFile(null);
        setUploadPercent(0);
        handleOpenDetail(effectiveDocId);
        loadDocuments();
        signalRService.emit('DocumentVersionUploaded', { documentId: effectiveDocId });
        signalRService.emit('AdminStatsUpdated');
      } else {
        setActionError(res.message || (res.errors?.[0] as string) || 'Failed to upload version');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to upload version');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    const effectiveDocId = selectedDoc.id || (selectedDoc as any)?.document?.id;
    if (!effectiveDocId || effectiveDocId === 'undefined') {
      setActionError(isArabic ? 'تعذر تحديد المستند' : 'Document ID not found');
      return;
    }
    if (!selectedDoc.versions || selectedDoc.versions.length === 0) {
      setActionError(isArabic ? 'لا يمكن اعتماد مستند لا يحتوي على أي ملفات أو إصدارات مرفقة' : 'Cannot review a document without any uploaded versions');
      return;
    }

    setActionLoading(true);
    setActionError('');

    const latestVersion = selectedDoc.versions[0];
    try {
      const res = await documentsService.reviewDocument(effectiveDocId, {
        versionId: latestVersion.id,
        status: reviewStatus,
        reason: reviewReason
      });

      if (res.success) {
        setActionSuccess(isArabic ? 'تم تحديث حالة الاعتماد والحصانة بنجاح' : 'Approval and immutability status updated');
        setShowReviewModal(false);
        setReviewReason('');
        handleOpenDetail(effectiveDocId);
        loadDocuments();
        signalRService.emit('DocumentReviewed', { documentId: effectiveDocId, status: reviewStatus });
        signalRService.emit('AdminStatsUpdated');
      } else {
        setActionError(res.message || 'Review failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Review failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (doc: DocumentDto | DocumentDetailDto | null | undefined) => {
    if (!doc || !doc.id) return;

    const confirmMsg = isArabic
      ? `هل أنت متأكد من حذف المستند "${doc.title}"؟`
      : `Are you sure you want to delete "${doc.title}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await documentsService.deleteDocument(doc.id, 'User deleted');
      if (res.success) {
        loadDocuments();
        if (selectedDoc?.id === doc.id) setSelectedDoc(null);
        signalRService.emit('DocumentDeleted', { id: doc.id });
        signalRService.emit('AdminStatsUpdated');
      } else {
        alert(res.message || 'Delete rejected by policy');
      }
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleDeleteVersion = async (docId: string, versionId: string, verNum: number) => {
    const confirmMsg = isArabic
      ? `هل أنت متأكد من حذف الإصدار v${verNum}؟`
      : `Are you sure you want to delete version v${verNum}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await documentsService.deleteVersion(docId, versionId, 'Deleted by user');
      if (res.success) {
        handleOpenDetail(docId);
        loadDocuments();
        signalRService.emit('DocumentVersionDeleted', { docId, versionId });
        signalRService.emit('AdminStatsUpdated');
      } else {
        alert(res.message || 'Delete failed');
      }
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !editTitle.trim()) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await documentsService.updateDocument(selectedDoc.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        documentTypeId: editDocTypeId || undefined
      });
      if (res.success) {
        setShowEditModal(false);
        handleOpenDetail(selectedDoc.id);
        loadDocuments();
        signalRService.emit('DocumentUpdated', res.data);
      } else {
        setActionError(res.message || 'Update failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for 24-hour remaining countdown
  const getWindowBadge = (editableUntil?: string, isLocked?: boolean, status?: string) => {
    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          {t('approvedImmutable')}
        </span>
      );
    }

    if (isLocked || !editableUntil) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Lock className="w-3.5 h-3.5" />
          {t('editWindowLocked')}
        </span>
      );
    }

    const diff = new Date(editableUntil).getTime() - new Date().getTime();
    if (diff <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <Lock className="w-3.5 h-3.5" />
          {t('editWindowLocked')}
        </span>
      );
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 animate-pulse">
        <Clock className="w-3.5 h-3.5" />
        {isArabic ? `نشط (${hours}س ${minutes}د)` : `24h Window (${hours}h ${minutes}m left)`}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-2">
      {/* Hero — Company.png + archive copy */}
      <section className="company-hero border border-cyan-400/30 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
        <img src="/images/Company.png" alt="" className="company-hero-img" aria-hidden />
        <div className="company-hero-veil" aria-hidden />
        <div className="company-hero-content">
          <div className="company-hero-slot company-hero-slot-start">
            <div className="company-hero-glass max-w-lg">
              <h2 className="font-display text-base sm:text-xl font-bold text-white leading-snug">
                {t('documentsTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-100/95 leading-relaxed">
                {t('documentsSubtitle')}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { icon: ShieldCheck, label: t('docsFeatureSecure') },
                  { icon: Zap, label: t('docsFeatureFast') },
                  { icon: Layers, label: t('docsFeatureVersions') },
                  { icon: FolderOpen, label: t('docsFeatureOrganize') },
                ].map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <span
                      key={chip.label}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-sky-100 bg-slate-950/45 border border-cyan-400/25"
                    >
                      <Icon className="w-3 h-3 text-cyan-300" />
                      {chip.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="company-hero-slot company-hero-slot-center" aria-hidden />

          <div className="company-hero-slot company-hero-slot-end">
            <button
              type="button"
              onClick={() => {
                setActionError('');
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee] shadow-[0_0_24px_rgba(14,165,233,0.5)] hover:brightness-110 transition"
            >
              <CloudUpload className="w-4 h-4" />
              {t('uploadDocument')}
            </button>
          </div>
        </div>
      </section>

      {/* DOC-01: Central Document Center - 12 Standard Business Categories */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
        {DOCUMENT_CATEGORIES.map(cat => {
          const count = cat.key === 'All'
            ? documents.length
            : documents.filter(d => (d.category?.toString() === cat.key || d.category?.toString() === (DOCUMENT_CATEGORIES.findIndex(x => x.key === cat.key)).toString())).length;
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${isSelected ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md shadow-cyan-500/20' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              {isArabic ? cat.labelAr : cat.labelEn}
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isSelected ? 'bg-slate-950 text-cyan-300 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* DOC-05: Accounting Security Banner */}
      {selectedCategory === 'Accounting' && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
          <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            {isArabic
              ? 'مستندات الحسابات والمالية (DOC-05): هذه المساحة معزولة ومحمية، ولا تظهر للمستخدمين العاديين، الوصول مقيد للمحاسبين ومدراء النظام فقط.'
              : 'Accounting Document Center (DOC-05): This workspace is strictly isolated from standard project viewers and accessible only to authorized Accounting Officers and Administrators.'}
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="docs-panel rounded-2xl p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-cyan-300" />
            {t('navProjects')}
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
          >
            <option value="">{t('docsAllProjects')}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-300" />
            {t('documentType')}
          </label>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
          >
            <option value="">{t('docsAllTypes')}</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {isArabic ? dt.nameAr : dt.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-cyan-300" />
            {t('docsSearchLabel')}
          </label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
                placeholder={t('docsSearchPlaceholder')}
                className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              onClick={() => loadDocuments()}
              disabled={loading}
              className="p-2.5 rounded-xl border border-cyan-400/30 bg-slate-900/70 text-cyan-200 hover:bg-slate-800"
              title={isArabic ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${selectedDoc ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="docs-panel rounded-2xl flex items-center justify-center p-16 text-slate-400 gap-2 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-300" />
              {isArabic ? 'جاري تحميل الأرشيف…' : 'Loading archive…'}
            </div>
          ) : documents.length === 0 ? (
            <div className="docs-panel rounded-2xl px-6 py-14 text-center space-y-5">
              <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-2xl" />
                <div className="relative w-24 h-24 rounded-2xl border border-cyan-400/40 bg-slate-950/80 flex items-center justify-center shadow-[0_0_40px_rgba(14,165,233,0.35)]">
                  <FolderOpen className="w-12 h-12 text-cyan-400" strokeWidth={1.5} />
                </div>
                <ImageIcon className="absolute -top-1 start-1 w-6 h-6 text-sky-300/80 drop-shadow" />
                <Film className="absolute top-2 -end-1 w-6 h-6 text-violet-300/80 drop-shadow" />
                <FileSpreadsheet className="absolute -bottom-1 start-2 w-6 h-6 text-emerald-300/80 drop-shadow" />
                <FileText className="absolute bottom-1 -end-1 w-6 h-6 text-amber-300/80 drop-shadow" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">{t('docsEmptyTitle')}</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">{t('docsEmptyHint')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActionError('');
                  setShowUploadModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee] shadow-[0_0_28px_rgba(14,165,233,0.5)]"
              >
                <CloudUpload className="w-4 h-4" />
                {t('uploadDocument')}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {documents.map((doc) => {
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenDetail(doc.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900/90 border-cyan-400/70 shadow-[0_0_24px_rgba(14,165,233,0.2)]'
                        : 'bg-slate-900/55 border-cyan-400/20 hover:border-cyan-400/45'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-3 text-start">
                        <div className="p-2 rounded-lg bg-sky-500/10 text-cyan-300 border border-cyan-400/25 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700/50">
                              {doc.documentNumber}
                            </span>
                            <span className="text-xs font-semibold text-amber-200/90 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-700/40">
                              {isArabic ? doc.documentTypeNameAr : doc.documentTypeNameEn}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('versionBadge')} {doc.currentVersionNumber}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-100 mt-1">{doc.title}</h4>
                          <div className="flex items-center gap-2.5 text-[11px] text-slate-400 mt-2 flex-wrap">
                            <span className="font-medium text-slate-300 flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-cyan-400" />
                              {doc.projectName}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-[11px] font-semibold text-cyan-200 shadow-sm">
                              <div className="w-4 h-4 rounded-full bg-cyan-500/30 text-cyan-300 flex items-center justify-center font-bold text-[9px] uppercase">
                                {doc.ownerUserName ? doc.ownerUserName[0] : 'U'}
                              </div>
                              <span className="text-slate-400 text-[10px]">{isArabic ? 'الرافع:' : 'Uploaded by:'}</span>
                              <span className="text-white font-bold">{doc.ownerUserName || (isArabic ? 'غير محدد' : 'Unknown')}</span>
                            </span>
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatDateCairo(doc.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 mt-2 sm:mt-0">
                        {getWindowBadge(doc.editableUntil, doc.isLocked, doc.status)}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {doc.currentVersionNumber > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(doc.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors"
                              title={t('downloadFile')}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              title={isArabic ? 'لم يتم رفع ملف لهذا المستند بعد' : 'No file uploaded yet'}
                            >
                              {isArabic ? 'بدون ملف' : 'No file'}
                            </span>
                          )}
                          {(doc.canEdit || (doc as any).isEditable || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition-colors"
                              title={isArabic ? 'حذف المستند' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedDoc && (
          <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl docs-panel">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="text-start">
                <span className="font-mono text-xs font-bold text-cyan-300">{selectedDoc.documentNumber}</span>
                <h3 className="text-base font-bold text-slate-100">{selectedDoc.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  {isArabic ? 'حالة الاعتماد' : 'Approval status'}
                </span>
                {getWindowBadge(selectedDoc.editableUntil, selectedDoc.isLocked, selectedDoc.status)}
              </div>
              {selectedDoc.status === 'Approved' || selectedDoc.status === 'Locked' ? (
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {isArabic
                      ? 'المستند معتمد ومحصّن — لا يمكن تعديله أو حذفه إلا بصلاحية أدمن.'
                      : 'Document is approved and locked — edits require admin authority.'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="w-4 h-4 flex-shrink-0 text-cyan-400" />
                  <span>
                    {selectedDoc.canEdit
                      ? isAdmin
                        ? isArabic
                          ? 'صلاحية الأدمن تتيح التعديل والحذف لهذا المستند.'
                          : 'Admin rights allow editing and deleting this document.'
                        : isArabic
                          ? 'يمكن تعديل هذه النسخة خلال 24 ساعة من الرفع.'
                          : 'This version can be edited within 24 hours of upload.'
                      : isArabic
                        ? 'انتهت نافذة التعديل. أي تغيير يحتاج رفع إصدار جديد.'
                        : 'Edit window expired. Changes require a new version.'}
                  </span>
                </div>
              )}
            </div>

            {/* Prominent Uploader & Responsibility Badge */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-cyan-500/30 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-sky-400/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center font-bold text-sm uppercase shadow-[0_0_15px_rgba(6,182,212,0.25)] flex-shrink-0">
                  {selectedDoc.ownerUserName ? selectedDoc.ownerUserName[0] : 'U'}
                </div>
                <div className="text-start">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-cyan-400" />
                    {isArabic ? 'المسؤول القائم برفع المستند' : 'Document Uploader & Owner'}
                  </div>
                  <div className="text-sm font-bold text-slate-100 mt-0.5">
                    {selectedDoc.ownerUserName || (isArabic ? 'غير محدد' : 'Unknown')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{isArabic ? 'تاريخ الرفع: ' : 'Uploaded: '}</span>
                    <span className="text-slate-300">{formatDateCairo(selectedDoc.createdAt)}</span>
                  </div>
                </div>
              </div>
              <div className="text-end flex-shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 block">
                  {selectedDoc.projectName}
                </span>
                {selectedDoc.siteName && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {selectedDoc.siteName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {selectedDoc.versions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleDownload(selectedDoc.id)}
                  className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-200 border border-cyan-400/30 hover:bg-cyan-500 hover:text-slate-950 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('downloadFile')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setActionError('');
                  setShowNewVersionModal(true);
                }}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('uploadVersion')}
              </button>
              {(selectedDoc.canEdit || (selectedDoc as any).isEditable || isAdmin) && (
                <button
                  type="button"
                  onClick={() => {
                    setEditTitle(selectedDoc.title);
                    setEditDescription(selectedDoc.description || '');
                    setEditDocTypeId(selectedDoc.documentTypeId);
                    setShowEditModal(true);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-all"
                  title={isArabic ? 'تعديل البيانات' : 'Edit Info'}
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تعديل' : 'Edit'}</span>
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  disabled={!selectedDoc.versions || selectedDoc.versions.length === 0}
                  onClick={() => {
                    if (!selectedDoc.versions || selectedDoc.versions.length === 0) {
                      setActionError(isArabic ? 'المستند لا يحتوي على أي ملفات مرفقة للاعتماد' : 'Document has no files to approve');
                      return;
                    }
                    setActionError('');
                    setShowReviewModal(true);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    !selectedDoc.versions || selectedDoc.versions.length === 0
                      ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950'
                  }`}
                  title={!selectedDoc.versions || selectedDoc.versions.length === 0 ? (isArabic ? 'يرجى رفع ملف أولاً' : 'Upload file first') : undefined}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {t('reviewAction')}
                </button>
              )}
              {(selectedDoc.canEdit || (selectedDoc as any).isEditable || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(selectedDoc)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all"
                  title={isArabic ? 'حذف المستند بالكامل' : 'Delete Document'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'حذف' : 'Delete'}</span>
                </button>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  {t('docsVersionHistory')}
                </h4>
                <span className="text-[10px] text-slate-500">
                  {selectedDoc.versions.length} {isArabic ? 'إصدار' : 'versions'}
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
                {selectedDoc.versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 rounded-xl bg-slate-950/45 border border-slate-700/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-cyan-300">v{ver.versionNumber}</span>
                        <span className="text-slate-400 truncate">{ver.fileName}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownload(selectedDoc.id, ver.id)}
                          className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1 text-[11px]"
                        >
                          <Download className="w-3 h-3" />
                          {(ver.fileSize / 1024).toFixed(1)} KB
                        </button>
                        {(ver.canEdit || (ver as any).isEditable || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVersion(selectedDoc.id, ver.id, ver.versionNumber)}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10 transition-colors"
                            title={isArabic ? 'حذف هذا الإصدار' : 'Delete version'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80 mt-1">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[9px] uppercase">
                          {(ver.uploadedByUserName || selectedDoc.ownerUserName || 'U')[0]}
                        </div>
                        <span className="text-[11px] text-slate-400">{isArabic ? 'رُفع بواسطة:' : 'Uploaded by:'}</span>
                        <span className="font-semibold text-white">{ver.uploadedByUserName || selectedDoc.ownerUserName || '—'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{formatDateCairo(ver.uploadedAt)}</span>
                    </div>
                    {ver.changeReason && (
                      <p className="text-[11px] text-amber-200/80 italic bg-amber-950/20 px-2 py-1 rounded border border-amber-900/30">
                        {ver.changeReason}
                      </p>
                    )}
                    {ver.checksum && (
                      <div className="pt-1 text-[10px] font-mono text-slate-500 truncate" title={ver.checksum}>
                        SHA-256: {ver.checksum.substring(0, 16)}…
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedDoc.approvals.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {t('docsApprovalsLog')}
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedDoc.approvals.map((app) => (
                    <div key={app.id} className="p-3 rounded-xl bg-slate-950/60 text-xs border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className={app.status === 'Approved' ? 'text-emerald-400 flex items-center gap-1' : 'text-amber-300 flex items-center gap-1'}>
                          {app.status === 'Approved' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {app.status} (v{app.versionNumber})
                        </span>
                        <span className="text-[10px] text-slate-500">{formatDateCairo(app.createdAt)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] border-t border-slate-900">
                        {app.requestedByUserName && (
                          <div className="text-slate-400">
                            <span>{isArabic ? 'طالب الاعتماد: ' : 'Requester: '}</span>
                            <span className="font-semibold text-slate-200">{app.requestedByUserName}</span>
                          </div>
                        )}
                        {app.reviewedByUserName && (
                          <div className="text-slate-400">
                            <span>{isArabic ? 'المعتمد/المراجع: ' : 'Reviewer: '}</span>
                            <span className="font-semibold text-emerald-300">{app.reviewedByUserName}</span>
                          </div>
                        )}
                      </div>
                      {app.reason && <p className="text-[11px] text-slate-300 mt-1 italic bg-slate-900/60 p-2 rounded-lg">{app.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer capabilities */}
      <div className="docs-panel rounded-2xl px-4 py-3.5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: t('docsFootFormats') },
          { icon: History, label: t('docsFootVersions') },
          { icon: Cloud, label: t('docsFootBackup') },
          { icon: Users, label: t('docsFootShare') },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <span className="w-9 h-9 rounded-xl bg-sky-500/10 border border-cyan-400/25 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Icon className="w-4 h-4" />
              </span>
              {item.label}
            </div>
          );
        })}
      </div>

      {/* Modals — portaled to body so they aren't clipped by page overflow */}
      {portalReady &&
        createPortal(
          <>
            {showUploadModal && (
              <div className="app-modal-overlay" onClick={() => !actionLoading && setShowUploadModal(false)}>
                <div
                  className="app-modal-panel"
                  style={{ width: 'min(100%, 32rem)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 pb-3 mb-1 border-b border-cyan-400/20">
                    <div className="flex items-center gap-2.5 text-start">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
                        <CloudUpload className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-white">{t('uploadDocument')}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => !actionLoading && setShowUploadModal(false)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80"
                      aria-label="Close"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {actionError && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateDocument} className="space-y-3.5">
                    {/* 1. Select Project */}
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {t('navProjects')} <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={newProjId}
                        onChange={(e) => setNewProjId(e.target.value)}
                        required
                        disabled={actionLoading}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      >
                        <option value="">{isArabic ? 'اختر المشروع' : 'Select Project'}</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Select Site */}
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'الموقع الميداني (اختياري)' : 'Site (Optional)'}
                      </label>
                      <select
                        value={newSiteId}
                        onChange={(e) => setNewSiteId(e.target.value)}
                        disabled={actionLoading || !newProjId}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      >
                        <option value="">
                          {loadingProjectSites
                            ? isArabic ? 'جاري تحميل المواقع...' : 'Loading sites...'
                            : isArabic ? 'كافة المواقع / المشروع ككل' : 'All Sites / Project-level'}
                        </option>
                        {projectSites.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code || 'Site'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Select Category */}
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'تصنيف المستند' : 'Document Category'} <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        required
                        disabled={actionLoading}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      >
                        {DOCUMENT_CATEGORIES.filter((c) => c.key !== 'All').map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {isArabic ? cat.labelAr : cat.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. Upload File */}
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'الملف (PDF, DWG, DOCX, ZIP)' : 'File (PDF, DWG, DOCX, ZIP)'}{' '}
                        <span className="text-rose-400">*</span>
                      </label>
                      <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[96px] px-4 py-4 rounded-xl border border-dashed border-cyan-400/40 bg-slate-950/45 hover:border-cyan-400/70 hover:bg-slate-900/50 cursor-pointer transition">
                        <Upload className="w-5 h-5 text-cyan-300" />
                        <span className="text-xs text-slate-200 font-semibold text-center">
                          {selectedFile
                            ? selectedFile.name
                            : isArabic
                              ? 'اضغط لاختيار ملف أو اسحبه هنا'
                              : 'Click to choose a file or drag it here'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setSelectedFile(file);
                            if (file && !newTitle) {
                              const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                              setNewTitle(base);
                            }
                          }}
                          required={!selectedFile}
                          disabled={actionLoading}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {/* 5. Document Type & Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-start">
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                          {t('documentType')}
                        </label>
                        <select
                          value={newDocTypeId}
                          onChange={(e) => setNewDocTypeId(e.target.value)}
                          disabled={actionLoading}
                          className="field-input w-full px-3 py-2 rounded-xl text-xs"
                        >
                          <option value="">
                            {isArabic ? 'افتراضي حسب التصنيف' : 'Default by category'}
                          </option>
                          {documentTypes.map((dt) => (
                            <option key={dt.id} value={dt.id}>
                              {isArabic ? dt.nameAr : dt.nameEn}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                          {isArabic ? 'عنوان المستند' : 'Title'}
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          disabled={actionLoading}
                          placeholder={
                            isArabic ? 'اسم المستند' : 'Document title'
                          }
                          className="field-input w-full px-3 py-2 rounded-xl text-xs"
                        />
                      </div>
                    </div>

                    {actionLoading && <UploadProgressBar percent={uploadPercent} isArabic={isArabic} />}

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-700/50">
                      <button
                        type="button"
                        onClick={() => setShowUploadModal(false)}
                        disabled={actionLoading}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80"
                      >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] hover:brightness-110 disabled:opacity-60"
                      >
                        <CloudUpload className="w-3.5 h-3.5" />
                        {actionLoading
                          ? isArabic
                            ? `جاري الرفع… ${uploadPercent}%`
                            : `Uploading… ${uploadPercent}%`
                          : isArabic
                            ? 'تأكيد الرفع'
                            : 'Upload'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showNewVersionModal && selectedDoc && (
              <div
                className="app-modal-overlay"
                onClick={() => !actionLoading && setShowNewVersionModal(false)}
              >
                <div
                  className="app-modal-panel"
                  style={{ width: 'min(100%, 28rem)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 mb-1 border-b border-cyan-400/20">
                    <h3 className="text-base font-bold text-white text-start">
                      {t('uploadVersion')} (v{selectedDoc.currentVersionNumber + 1})
                    </h3>
                    <button
                      type="button"
                      onClick={() => !actionLoading && setShowNewVersionModal(false)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {actionError && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {actionError}
                    </div>
                  )}

                  <form onSubmit={handleUploadVersion} className="space-y-3.5">
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {t('changeReason')}
                      </label>
                      <input
                        type="text"
                        value={versionReason}
                        onChange={(e) => setVersionReason(e.target.value)}
                        disabled={actionLoading}
                        placeholder={
                          isArabic
                            ? 'مثال: تعديل المقايسة بناء على مراجعة الاستشاري'
                            : 'e.g. Revised based on consultant comments'
                        }
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      />
                    </div>

                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'الملف المعدل' : 'Revised File'}{' '}
                        <span className="text-rose-400">*</span>
                      </label>
                      <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[88px] px-4 py-3 rounded-xl border border-dashed border-cyan-400/40 bg-slate-950/45 cursor-pointer">
                        <Upload className="w-5 h-5 text-cyan-300" />
                        <span className="text-xs text-slate-200 font-semibold text-center">
                          {versionFile
                            ? versionFile.name
                            : isArabic
                              ? 'اضغط لاختيار الملف'
                              : 'Click to choose file'}
                        </span>
                        <input
                          type="file"
                          onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                          required={!versionFile}
                          disabled={actionLoading}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    {actionLoading && <UploadProgressBar percent={uploadPercent} isArabic={isArabic} />}

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-700/50">
                      <button
                        type="button"
                        onClick={() => setShowNewVersionModal(false)}
                        disabled={actionLoading}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80"
                      >
                        {isArabic ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] disabled:opacity-60"
                      >
                        {actionLoading
                          ? isArabic
                            ? `جاري الحفظ… ${uploadPercent}%`
                            : `Saving… ${uploadPercent}%`
                          : isArabic
                            ? 'حفظ الإصدار الجديد'
                            : 'Save Version'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showReviewModal && selectedDoc && (
              <div className="app-modal-overlay" onClick={() => !actionLoading && setShowReviewModal(false)}>
                <div
                  className="app-modal-panel"
                  style={{ width: 'min(100%, 28rem)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 mb-1 border-b border-cyan-400/20">
                    <h3 className="text-base font-bold text-white text-start">{t('reviewAction')}</h3>
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(false)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {actionError && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {actionError}
                    </div>
                  )}

                  <form onSubmit={handleReview} className="space-y-3.5">
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'قرار الاعتماد' : 'Decision'} <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={reviewStatus}
                        onChange={(e) => setReviewStatus(e.target.value as any)}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      >
                        <option value="Approved">
                          {isArabic ? 'اعتماد نهائي (يصبح المستند محصناً)' : 'Approve (Seals Immutability)'}
                        </option>
                        <option value="CorrectionRequested">
                          {isArabic ? 'طلب تصحيح / تعديل' : 'Request Correction'}
                        </option>
                        <option value="Rejected">{isArabic ? 'رفض المستند' : 'Reject'}</option>
                      </select>
                    </div>

                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'ملاحظات الاعتماد / التصحيح' : 'Reason / Notes'}
                      </label>
                      <textarea
                        value={reviewReason}
                        onChange={(e) => setReviewReason(e.target.value)}
                        rows={3}
                        placeholder={
                          isArabic
                            ? 'اكتب ملاحظاتك الهندسية هنا...'
                            : 'Enter your notes or correction feedback...'
                        }
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                      />
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-700/50">
                      <ActionLoadingBar
                        active={actionLoading}
                        isArabic={isArabic}
                        label={isArabic ? 'جاري حفظ قرار الفحص…' : 'Saving review decision…'}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowReviewModal(false)}
                          disabled={actionLoading}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800/80"
                        >
                          {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                        >
                          {actionLoading
                            ? isArabic
                              ? 'جاري الحفظ…'
                              : 'Saving…'
                            : isArabic
                              ? 'اعتماد القرار'
                              : 'Confirm Decision'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {/* Modal: Edit Document Metadata */}
            {showEditModal && selectedDoc && (
              <div
                className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
                onClick={() => !actionLoading && setShowEditModal(false)}
              >
                <div
                  className="rounded-3xl border border-cyan-400/35 bg-gradient-to-b from-[#0f1d32] to-[#0a1322] p-6 shadow-2xl space-y-4"
                  style={{ width: 'min(100%, 32rem)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-3 mb-1 border-b border-cyan-400/20">
                    <div className="flex items-center gap-2">
                      <Edit className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-base font-bold text-white text-start">
                        {isArabic ? 'تعديل بيانات المستند' : 'Edit Document Details'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setShowEditModal(false)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>

                  {actionError && (
                    <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {actionError}
                    </div>
                  )}

                  <form onSubmit={handleUpdateDocument} className="space-y-3.5">
                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'عنوان المستند' : 'Title'} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={actionLoading}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      />
                    </div>

                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'نوع المستند' : 'Document Type'}
                      </label>
                      <select
                        disabled={actionLoading}
                        value={editDocTypeId}
                        onChange={(e) => setEditDocTypeId(e.target.value)}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
                      >
                        {documentTypes.map((dt) => (
                          <option key={dt.id} value={dt.id}>
                            {dt.code} — {isArabic ? dt.nameAr : dt.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-start">
                      <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                        {isArabic ? 'الوصف' : 'Description'}
                      </label>
                      <textarea
                        disabled={actionLoading}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="field-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                      />
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-700/50">
                      <ActionLoadingBar
                        active={actionLoading}
                        isArabic={isArabic}
                        label={isArabic ? 'جاري تحديث البيانات…' : 'Updating details…'}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          disabled={actionLoading}
                          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800/80"
                        >
                          {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
                        >
                          {actionLoading
                            ? isArabic
                              ? 'جاري الحفظ…'
                              : 'Saving…'
                            : isArabic
                              ? 'حفظ التعديلات'
                              : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>,
          document.body
        )}
    </div>
  );
};
