'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Settings,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  MapPin,
  Users,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  FileText,
  Layers,
  Building2,
  Target,
  LayoutGrid,
  Eye,
  Upload,
  X,
  Sliders,
  DollarSign
} from 'lucide-react';
import {
  siteOperationsService,
  CreateSiteOperationPayload,
  CreateWorkLogPayload
} from '@/services/site-operations.service';
import { mediaService } from '@/services/media.service';
import { signalRService } from '@/services/signalr.service';
import {
  SiteOperationDto,
  OperationWorkLogDto,
  OperationPhotoDto,
  OperationType,
  SiteOperationStatus,
  TaskPriority,
  Project,
  Site,
  User
} from '@/types';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';
import { AppModal } from '@/components/AppModal';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';

interface SiteOperationsManagerProps {
  currentUser: User | null;
  projects: Project[];
  sites?: Site[];
  lang: Language;
}

const OPERATION_TYPES: OperationType[] = [
  'Installation',
  'Maintenance',
  'Programming',
  'Configuration',
  'Inspection',
  'Testing',
  'Troubleshooting',
  'SiteSurvey',
  'Handover'
];

export const SiteOperationsManager: React.FC<SiteOperationsManagerProps> = ({
  currentUser,
  projects,
  sites = [],
  lang
}) => {
  const [operations, setOperations] = useState<SiteOperationDto[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<OperationType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<SiteOperationStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Active operation for drawer/modal
  const [activeOperation, setActiveOperation] = useState<SiteOperationDto | null>(null);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [workLogs, setWorkLogs] = useState<OperationWorkLogDto[]>([]);
  const [photos, setPhotos] = useState<OperationPhotoDto[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateSiteOperationPayload>({
    projectId: '',
    siteId: '',
    operationType: 'Installation',
    title: '',
    description: '',
    priority: 'Medium'
  });
  const [logForm, setLogForm] = useState<CreateWorkLogPayload>({ description: '', hours: 1 });
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const t = (k: any) => getTranslation(k, lang);
  const isArabic = lang === 'ar';

  useEffect(() => {
    loadOperations();
  }, [selectedProjectId, selectedSiteId, selectedType, selectedStatus]);

  useEffect(() => {
    const handleReload = () => {
      loadOperations();
      if (activeOperation) {
        loadOperationDetails(activeOperation.id);
      }
    };
    const unsub1 = signalRService.on('OperationCreated', loadOperations);
    const unsub2 = signalRService.on('OperationUpdated', handleReload);
    const unsub3 = signalRService.on('OperationDeleted', loadOperations);
    const unsub4 = signalRService.on('OperationPhotoUploaded', handleReload);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [activeOperation]);

  const loadOperations = async () => {
    setLoading(true);
    try {
      const res = await siteOperationsService.getOperations({
        projectId: selectedProjectId || undefined,
        siteId: selectedSiteId || undefined,
        operationType: (selectedType as OperationType) || undefined,
        status: (selectedStatus as SiteOperationStatus) || undefined
      });
      if (res.success && res.data) {
        setOperations(res.data);
      }
    } catch (err) {
      console.error('Failed to load operations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOperation = async (op: SiteOperationDto) => {
    setActiveOperation(op);
    setShowDetailDrawer(true);
    loadOperationDetails(op.id);
  };

  const loadOperationDetails = async (opId: string) => {
    setLoadingLogs(true);
    setLoadingPhotos(true);
    try {
      const [logsRes, photosRes] = await Promise.all([
        siteOperationsService.getWorkLogs(opId),
        siteOperationsService.getPhotos(opId)
      ]);
      if (logsRes.success && logsRes.data) setWorkLogs(logsRes.data);
      if (photosRes.success && photosRes.data) setPhotos(photosRes.data);
    } catch (err) {
      console.error('Failed to load details', err);
    } finally {
      setLoadingLogs(false);
      setLoadingPhotos(false);
    }
  };

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.projectId || !createForm.siteId || !createForm.title) {
      setActionError(isArabic ? 'يرجى ملء الحقول الإلزامية' : 'Please fill required fields');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const res = await siteOperationsService.createOperation(createForm);
      if (res.success) {
        setShowCreateModal(false);
        setCreateForm({
          projectId: '',
          siteId: '',
          operationType: 'Installation',
          title: '',
          description: '',
          priority: 'Medium'
        });
        loadOperations();
        signalRService.emit('OperationCreated', res.data);
      } else {
        setActionError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddWorkLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOperation || !logForm.description || logForm.hours <= 0) return;

    setActionLoading(true);
    try {
      const res = await siteOperationsService.addWorkLog(activeOperation.id, logForm);
      if (res.success) {
        setShowLogModal(false);
        setLogForm({ description: '', hours: 1 });
        loadOperationDetails(activeOperation.id);
        loadOperations();
        signalRService.emit('OperationUpdated', { operationId: activeOperation.id });
      }
    } catch (err) {
      console.error('Failed to add work log', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOperation || !photoFile) return;

    setActionLoading(true);
    setActionError('');
    try {
      const uploadedMedia = await mediaService.uploadDirectToB2(photoFile, {
        targetType: 'OperationPhoto',
        projectId: activeOperation.projectId,
        siteId: activeOperation.siteId,
        operationId: activeOperation.id
      });

      const res = await siteOperationsService.addPhoto(activeOperation.id, {
        mediaFileId: uploadedMedia.id,
        caption: photoCaption
      });

      if (res.success) {
        setShowPhotoModal(false);
        setPhotoFile(null);
        setPhotoCaption('');
        loadOperationDetails(activeOperation.id);
        loadOperations();
        signalRService.emit('OperationPhotoUploaded', { operationId: activeOperation.id });
      }
    } catch (err: any) {
      setActionError(err.message || 'Photo upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter operations based on text search
  const filtered = operations.filter(op => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      op.title.toLowerCase().includes(q) ||
      op.projectName.toLowerCase().includes(q) ||
      op.siteName.toLowerCase().includes(q) ||
      (op.description && op.description.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const draftsCount = operations.filter(op => (op.status as string) === 'Draft' || op.status === 'Pending').length;
  const delayedCount = operations.filter(op => op.status === 'Delayed').length;
  const inProgressCount = operations.filter(op => op.status === 'InProgress').length;
  const completedCount = operations.filter(op => op.status === 'Completed').length;
  const totalProjectsCount = projects.length || operations.length;

  return (
    <div className="space-y-5 animate-fadeIn text-slate-100">
      {/* ========================================================================= */}
      {/* 1. TOP HERO BANNER (Architectural Blueprint + Neon Header + Filter Pills) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-[#071328]/95 via-[#0b1c38]/90 to-[#071328]/95 shadow-[0_0_35px_rgba(6,182,212,0.15)] backdrop-blur-xl p-6 sm:p-7">
        {/* Subtle background ambient glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Section: Cog Icon + Titles on Left, Blueprint Skyscraper on Right */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-cyan-500/20">
          {/* Left: Glowing Cog + Title & Subtitle */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/20 border-2 border-cyan-400/70 shadow-[0_0_22px_rgba(34,211,238,0.4)] flex items-center justify-center text-cyan-300 shrink-0">
              <Settings className="w-7 h-7 text-cyan-300 stroke-[2.2] animate-[spin_12s_linear_infinite]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                {isArabic ? 'عمليات المواقع والتنفيذ الميداني' : 'Site Operations & Field Execution'}
              </h1>
              <p className="text-xs sm:text-sm text-cyan-100/70 font-normal mt-1 leading-relaxed">
                {isArabic
                  ? 'توحيد الجهود، تنظيم العمليات، وتحقيق أعلى جودة في العمل الميداني'
                  : 'Unifying efforts, organizing operations, and achieving highest quality in field execution'}
              </p>
            </div>
          </div>

          {/* Right: Architectural Wireframe Blueprint Graphic + Technical Motto */}
          <div className="flex items-center gap-4 select-none shrink-0 self-end md:self-auto">
            <div className="text-[10px] sm:text-[11px] font-mono tracking-widest leading-relaxed text-cyan-400/80 font-bold hidden sm:block text-end uppercase">
              <div>BUILD</div>
              <div>MONITOR</div>
              <div>IMPROVE</div>
              <div>TOGETHER</div>
            </div>

            {/* Skyscraper Blueprint SVG */}
            <svg
              className="w-36 h-24 sm:w-48 sm:h-28 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              viewBox="0 0 200 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="blueprintGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                </linearGradient>
              </defs>
              {/* Crane */}
              <line x1="160" y1="15" x2="160" y2="115" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
              <line x1="120" y1="22" x2="185" y2="22" stroke="#38bdf8" strokeWidth="1.6" opacity="0.8" />
              <polygon points="160,15 185,22 160,22" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1" />
              <line x1="120" y1="22" x2="135" y2="45" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
              <circle cx="135" cy="45" r="2.5" fill="#22d3ee" />

              {/* Building Facade Wireframe */}
              <polygon
                points="40,115 40,45 100,25 150,45 150,115 100,115"
                fill="url(#blueprintGrad)"
                stroke="#0ea5e9"
                strokeWidth="1.4"
                opacity="0.75"
              />

              {/* Floor Levels */}
              <line x1="40" y1="62" x2="100" y2="45" stroke="#38bdf8" strokeWidth="0.9" opacity="0.5" />
              <line x1="100" y1="45" x2="150" y2="62" stroke="#38bdf8" strokeWidth="0.9" opacity="0.5" />

              <line x1="40" y1="78" x2="100" y2="62" stroke="#38bdf8" strokeWidth="0.9" opacity="0.5" />
              <line x1="100" y1="62" x2="150" y2="78" stroke="#38bdf8" strokeWidth="0.9" opacity="0.5" />

              <line x1="40" y1="94" x2="100" y2="78" stroke="#38bdf8" strokeWidth="0.9" opacity="0.5" />
              <line x1="100" y1="78" x2="150" y2="94" stroke="#38bdf8" strokeWidth="0.9" opacity="0.5" />

              {/* Center Ridge */}
              <line x1="100" y1="25" x2="100" y2="115" stroke="#22d3ee" strokeWidth="1.4" opacity="0.8" />

              {/* Columns */}
              <line x1="60" y1="52" x2="60" y2="115" stroke="#38bdf8" strokeWidth="0.7" opacity="0.4" />
              <line x1="80" y1="46" x2="80" y2="115" stroke="#38bdf8" strokeWidth="0.7" opacity="0.4" />
              <line x1="120" y1="46" x2="120" y2="115" stroke="#38bdf8" strokeWidth="0.7" opacity="0.4" />
              <line x1="135" y1="52" x2="135" y2="115" stroke="#38bdf8" strokeWidth="0.7" opacity="0.4" />

              {/* Glowing Corner Nodes */}
              <circle cx="100" cy="25" r="3" fill="#22d3ee" />
              <circle cx="40" cy="45" r="2" fill="#38bdf8" />
              <circle cx="150" cy="45" r="2" fill="#38bdf8" />
            </svg>
          </div>
        </div>

        {/* Bottom Section inside Hero: Operation Type Quick Pills */}
        <div className="relative z-10 pt-5 flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {/* All Types Pill (Active / Glowing Solid Cyan in Screenshot) */}
          <button
            onClick={() => setSelectedType('')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
              selectedType === ''
                ? 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.5)] border border-cyan-300'
                : 'bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-700/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>
              {isArabic ? 'جميع الأنواع' : 'All Types'} ({operations.length})
            </span>
          </button>

          {/* Individual Operation Type Pills */}
          {OPERATION_TYPES.map(opType => {
            const count = operations.filter(o => o.operationType === opType).length;
            const isSelected = selectedType === opType;
            return (
              <button
                key={opType}
                onClick={() => setSelectedType(opType)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-400 text-slate-950 font-bold shadow-[0_0_18px_rgba(34,211,238,0.5)] border border-cyan-300'
                    : 'bg-slate-900/60 text-slate-300 hover:text-cyan-200 hover:border-cyan-500/50 border border-slate-700/60'
                }`}
              >
                {opType} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. 3-COLUMN FILTER & SEARCH BAR                                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Right Column: Projects Filter */}
        <div className="space-y-1.5 text-start">
          <label className="block text-xs font-semibold text-slate-300">
            {isArabic ? 'المشاريع' : 'Projects'}
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full pr-10 pl-9 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 appearance-none shadow-inner transition-colors"
            >
              <option value="">{isArabic ? 'جميع المشاريع' : 'All Projects'}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Middle Column: Status Filter */}
        <div className="space-y-1.5 text-start">
          <label className="block text-xs font-semibold text-slate-300">
            {isArabic ? 'الحالة' : 'Status'}
          </label>
          <div className="relative">
            <Target className="w-4 h-4 text-cyan-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="w-full pr-10 pl-9 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 appearance-none shadow-inner transition-colors"
            >
              <option value="">{isArabic ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="Pending">{isArabic ? 'المسودات / قيد الانتظار' : 'Pending'}</option>
              <option value="InProgress">{isArabic ? 'قيد التنفيذ' : 'In Progress'}</option>
              <option value="Completed">{isArabic ? 'المكتملة' : 'Completed'}</option>
              <option value="Delayed">{isArabic ? 'متأخرة' : 'Delayed'}</option>
              <option value="Cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Left Column: Universal Search Input */}
        <div className="space-y-1.5 text-start">
          <label className="block text-xs font-semibold text-slate-300">
            {isArabic ? 'البحث في المشاريع، المواقع، المهام، التقارير' : 'Search projects, sites, tasks, reports'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isArabic ? 'بحث بالاسم أو الكود أو العنوان...' : 'Search by name, code or title...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/70 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-inner transition-colors"
            />
            <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FIVE COLORFUL SUMMARY STATS CARDS (Matching Screenshot Colors & Order) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 5 (Far Right in RTL): Drafts (المسودات) - Purple */}
        <div className="relative p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/30 via-slate-900/85 to-[#0b0c1e] shadow-[0_0_20px_rgba(168,85,247,0.08)] hover:border-purple-400/80 transition-all flex items-center justify-between">
          <div className="text-start">
            <span className="text-xs font-semibold text-purple-200 block">
              {isArabic ? 'المسودات' : 'Drafts'}
            </span>
            <div className="text-2xl font-black text-white mt-0.5">{draftsCount}</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isArabic ? 'طلب غير مكتمل' : 'Incomplete request'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-purple-300" />
          </div>
        </div>

        {/* Card 4: Delayed (متأخرة) - Crimson / Red */}
        <div className="relative p-4 rounded-2xl border border-rose-500/40 bg-gradient-to-b from-rose-950/30 via-slate-900/85 to-[#190910] shadow-[0_0_20px_rgba(244,63,94,0.08)] hover:border-rose-400/80 transition-all flex items-center justify-between">
          <div className="text-start">
            <span className="text-xs font-semibold text-rose-200 block">
              {isArabic ? 'متأخرة' : 'Delayed'}
            </span>
            <div className="text-2xl font-black text-white mt-0.5">{delayedCount}</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isArabic ? 'عملية متأخرة' : 'Delayed operation'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-300" />
          </div>
        </div>

        {/* Card 3: In Progress (قيد التنفيذ) - Amber / Golden */}
        <div className="relative p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/30 via-slate-900/85 to-[#1a1205] shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:border-amber-400/80 transition-all flex items-center justify-between">
          <div className="text-start">
            <span className="text-xs font-semibold text-amber-200 block">
              {isArabic ? 'قيد التنفيذ' : 'In Progress'}
            </span>
            <div className="text-2xl font-black text-white mt-0.5">{inProgressCount}</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isArabic ? 'عملية جارية' : 'Active operation'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-300" />
          </div>
        </div>

        {/* Card 2: Completed (المكتملة) - Emerald / Teal */}
        <div className="relative p-4 rounded-2xl border border-teal-500/40 bg-gradient-to-b from-teal-950/30 via-slate-900/85 to-[#051815] shadow-[0_0_20px_rgba(20,184,166,0.08)] hover:border-teal-400/80 transition-all flex items-center justify-between">
          <div className="text-start">
            <span className="text-xs font-semibold text-teal-200 block">
              {isArabic ? 'المكتملة' : 'Completed'}
            </span>
            <div className="text-2xl font-black text-white mt-0.5">{completedCount}</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isArabic ? 'عملية مكتملة' : 'Completed operation'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-teal-300" />
          </div>
        </div>

        {/* Card 1 (Far Left in RTL): All Projects (جميع المشاريع) - Cyan */}
        <div className="relative p-4 rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/30 via-slate-900/85 to-[#041525] shadow-[0_0_20px_rgba(6,182,212,0.08)] hover:border-cyan-400/80 transition-all flex items-center justify-between">
          <div className="text-start">
            <span className="text-xs font-semibold text-cyan-200 block">
              {isArabic ? 'جميع المشاريع' : 'All Projects'}
            </span>
            <div className="text-2xl font-black text-white mt-0.5">{totalProjectsCount}</div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {isArabic ? 'مشروع مسجل' : 'Registered project'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-cyan-300" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MAIN DATA TABLE CONTAINER                                              */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-[#071328]/95 shadow-[0_0_30px_rgba(6,182,212,0.09)] overflow-hidden">
        {/* Table Header Row (Matching Exact Columns from Screenshot) */}
        <div className="grid grid-cols-8 items-center py-3.5 px-5 bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-slate-300 text-start select-none">
          <div>{isArabic ? 'رقم المشروع' : 'Project Code'}</div>
          <div className="col-span-2">{isArabic ? 'المشروع' : 'Project'}</div>
          <div>{isArabic ? 'الحالة' : 'Status'}</div>
          <div>{isArabic ? 'تاريخ البدء' : 'Start Date'}</div>
          <div>{isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}</div>
          <div>{isArabic ? 'المبلغ' : 'Amount'}</div>
          <div className="text-center">{isArabic ? 'الإجمالي' : 'Total'}</div>
          <div className="text-end">{isArabic ? 'الإجراءات' : 'Actions'}</div>
        </div>

        {/* Table Body: Either Empty State or Rows */}
        {filtered.length === 0 ? (
          /* ===================================================================== */
          /* EMPTY STATE (Matching Screenshot Glowing Folder & Action Button)      */
          /* ===================================================================== */
          <div className="py-20 sm:py-28 px-4 text-center flex flex-col items-center justify-center">
            {/* Glowing Blueprint Folder Graphic */}
            <div className="relative flex items-center justify-center mb-2">
              <svg
                className="w-24 h-24 sm:w-28 sm:h-28 text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                viewBox="0 0 100 100"
                fill="none"
              >
                {/* Radiating Sparkle Rays */}
                <line x1="50" y1="8" x2="50" y2="16" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="32" y1="14" x2="38" y2="20" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="68" y1="14" x2="62" y2="20" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />

                {/* Back Folder Flap */}
                <path
                  d="M18 36 C18 32 21 29 25 29 L39 29 C42 29 45 32 47 35 L51 40 L75 40 C79 40 82 43 82 47 L82 72 C82 76 79 79 75 79 L25 79 C21 79 18 76 18 72 Z"
                  fill="rgba(14, 165, 233, 0.15)"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />

                {/* Document paper inside */}
                <path
                  d="M26 38 L68 38 C70 38 72 40 72 42 L72 58 L26 58 Z"
                  fill="rgba(255, 255, 255, 0.25)"
                  stroke="#7dd3fc"
                  strokeWidth="1.5"
                />

                {/* Front Folder Flap */}
                <path
                  d="M15 48 C15 44 18 42 22 42 L78 42 C82 42 85 45 85 49 L80 75 C79 78 76 81 72 81 L21 81 C17 81 14 78 14 74 Z"
                  fill="rgba(2, 132, 199, 0.35)"
                  stroke="#22d3ee"
                  strokeWidth="2.5"
                />

                {/* Accent glow line on front flap */}
                <line x1="26" y1="52" x2="62" y2="52" stroke="#bae6fd" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              </svg>
            </div>

            {/* Empty State Heading & Subtitle */}
            <h3 className="text-base sm:text-lg font-bold text-slate-100 mt-4">
              {isArabic ? 'لا توجد عمليات مطابقة للمعايير' : 'No operations match the criteria'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md">
              {isArabic
                ? 'اختر معايير البحث أو أضف عملية جديدة لبدء عرض البيانات'
                : 'Adjust your search filters or create a new operation to start displaying records.'}
            </p>

            {/* Neon Cyan Pill Action Button (Matching Screenshot) */}
            <button
              onClick={() => {
                setActionError('');
                setShowCreateModal(true);
              }}
              className="mt-6 px-6 py-2.5 rounded-full font-bold text-sm bg-gradient-to-r from-[#0284c7] via-[#0ea5e9] to-[#06b6d4] text-slate-950 shadow-[0_0_25px_rgba(14,165,233,0.55)] hover:shadow-[0_0_32px_rgba(14,165,233,0.8)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{isArabic ? 'إنشاء عملية جديدة' : 'Create New Operation'}</span>
            </button>
          </div>
        ) : (
          /* ===================================================================== */
          /* POPULATED ROWS                                                        */
          /* ===================================================================== */
          <div className="divide-y divide-slate-800/80">
            {filtered.map(op => {
              const project = projects.find(p => p.id === op.projectId);
              const projectCode = project?.code || op.id.slice(0, 8);

              // Status styles
              let statusBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
              let statusLabel: string = op.status;
              if (op.status === 'Completed') {
                statusBadgeClass = 'bg-teal-500/15 text-teal-300 border-teal-500/30';
                statusLabel = isArabic ? 'مكتمل' : 'Completed';
              } else if (op.status === 'InProgress') {
                statusBadgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
                statusLabel = isArabic ? 'قيد التنفيذ' : 'In Progress';
              } else if (op.status === 'Delayed') {
                statusBadgeClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
                statusLabel = isArabic ? 'متأخرة' : 'Delayed';
              } else if (op.status === 'Pending' || (op.status as string) === 'Draft') {
                statusBadgeClass = 'bg-purple-500/15 text-purple-300 border-purple-500/30';
                statusLabel = isArabic ? 'مسودة' : 'Draft';
              }

              const projectBudget = (project as any)?.budget;
              const projectCurrency = (project as any)?.currency || 'EGP';

              return (
                <div
                  key={op.id}
                  onClick={() => handleSelectOperation(op)}
                  className="grid grid-cols-8 items-center py-4 px-5 hover:bg-slate-800/40 transition-colors text-xs text-start cursor-pointer group"
                >
                  {/* رقم المشروع */}
                  <div className="font-mono text-cyan-400 font-bold tracking-wider">
                    {projectCode}
                  </div>

                  {/* المشروع */}
                  <div className="col-span-2">
                    <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {op.projectName || project?.name || 'MTI Project'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {op.title} • {op.siteName}
                    </div>
                  </div>

                  {/* الحالة */}
                  <div>
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusBadgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* تاريخ البدء */}
                  <div className="text-slate-300">
                    {op.startDate ? formatDateCairo(op.startDate) : formatDateCairo(op.createdAt)}
                  </div>

                  {/* تاريخ الاستحقاق */}
                  <div className="text-slate-400">
                    {op.dueDate ? formatDateCairo(op.dueDate) : '-'}
                  </div>

                  {/* المبلغ */}
                  <div className="font-mono text-slate-300">
                    {projectBudget ? `${Number(projectBudget).toLocaleString()} ${projectCurrency}` : '-'}
                  </div>

                  {/* الإجمالي */}
                  <div className="text-center">
                    <div className="font-mono font-bold text-cyan-300">{op.progress}%</div>
                    <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mt-1 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${op.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* الإجراءات */}
                  <div className="text-end flex items-center justify-end gap-1.5">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleSelectOperation(op);
                      }}
                      className="p-1.5 rounded-lg border border-slate-700 hover:border-cyan-400/60 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 transition-colors"
                      title={isArabic ? 'عرض التفاصيل' : 'View Details'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveOperation(op);
                        setShowLogModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-700 hover:border-amber-400/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 transition-colors"
                      title={isArabic ? 'إضافة سجل عمل' : 'Add Work Log'}
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setActiveOperation(op);
                        setShowPhotoModal(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-700 hover:border-teal-400/60 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 transition-colors"
                      title={isArabic ? 'رفع صورة' : 'Upload Photo'}
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. OPERATION DETAILS DRAWER (Work Logs & Photos)                           */}
      {/* ========================================================================= */}
      {showDetailDrawer && activeOperation && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-end"
          onClick={() => setShowDetailDrawer(false)}
        >
          <div
            className="w-full max-w-xl h-full bg-[#0a1122] border-s border-cyan-500/30 p-6 overflow-y-auto space-y-6 shadow-2xl animate-slideInRight"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1 text-start">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {activeOperation.operationType}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {activeOperation.projectName}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{activeOperation.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeOperation.description || (isArabic ? 'لا يوجد وصف إضافي' : 'No description provided')}
                </p>
              </div>
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="p-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-start">
                <span className="text-[11px] text-slate-400 block">{isArabic ? 'الموقع' : 'Site'}</span>
                <span className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  {activeOperation.siteName}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-start">
                <span className="text-[11px] text-slate-400 block">{isArabic ? 'المسؤول' : 'Assigned'}</span>
                <span className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  {activeOperation.assignedUserName || (isArabic ? 'غير محدد' : 'Unassigned')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-start">
                <span className="text-[11px] text-slate-400 block">{isArabic ? 'نسبة الإنجاز' : 'Progress'}</span>
                <span className="text-xs font-bold text-cyan-400 mt-1 block">
                  {activeOperation.progress}%
                </span>
              </div>
            </div>

            {/* Work Logs Section */}
            <div className="space-y-3 pt-2 text-start">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  {isArabic ? 'سجلات العمل الميداني' : 'Field Work Logs'} ({workLogs.length})
                </h4>
                <button
                  onClick={() => setShowLogModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إضافة سجل' : 'Add Work Log'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {workLogs.length === 0 ? (
                  <div className="text-xs text-slate-500 py-4 text-center rounded-xl bg-slate-900/40 border border-slate-800">
                    {isArabic ? 'لا توجد ساعات عمل مسجلة بعد' : 'No work logs recorded yet.'}
                  </div>
                ) : (
                  workLogs.map(l => (
                    <div
                      key={l.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-200">{l.userName}</span>
                        <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          {l.hours} {isArabic ? 'ساعة' : 'hrs'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{l.description}</p>
                      <span className="text-[10px] text-slate-500 block">
                        {formatDateCairo(l.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Photos Section */}
            <div className="space-y-3 pt-4 border-t border-slate-800 text-start">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  {isArabic ? 'صور وفيديوهات الموقع' : 'Site Media'} ({photos.length})
                </h4>
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-300 hover:bg-teal-500/20 transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'رفع صورة' : 'Upload Photo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {photos.length === 0 ? (
                  <div className="col-span-2 text-xs text-slate-500 py-6 text-center rounded-xl bg-slate-900/40 border border-slate-800">
                    {isArabic ? 'لا توجد صور مرفوعة بعد' : 'No photos uploaded yet.'}
                  </div>
                ) : (
                  photos.map(p => (
                    <a
                      key={p.id}
                      href={p.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video block"
                    >
                      <img
                        src={p.downloadUrl}
                        alt={p.caption || p.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {p.caption && (
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/85 p-1.5 text-[11px] text-slate-200 truncate">
                          {p.caption}
                        </div>
                      )}
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: CREATE OPERATION (With ActionLoadingBar & Live Counter)          */}
      {/* ========================================================================= */}
      <AppModal
        open={showCreateModal}
        onClose={() => !actionLoading && setShowCreateModal(false)}
        title={isArabic ? 'إنشاء عملية موقع جديدة' : 'Create Site Operation'}
        width="min(100%, 32rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Plus className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="space-y-3">
            <ActionLoadingBar active={actionLoading} isArabic={isArabic} />
            <div className="flex justify-end gap-2.5">
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
                form="ops-create-form"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] via-[#0ea5e9] to-[#22d3ee] hover:brightness-110 disabled:opacity-60 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
              >
                {actionLoading
                  ? isArabic
                    ? 'جاري الإنشاء والحفظ…'
                    : 'Saving…'
                  : isArabic
                    ? 'إنشاء العملية'
                    : 'Create Operation'}
              </button>
            </div>
          </div>
        }
      >
        {actionError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 text-start">
            {actionError}
          </div>
        )}
        <form id="ops-create-form" onSubmit={handleCreateOperation} className="space-y-3 text-start">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'المشروع' : 'Project'} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              disabled={actionLoading}
              value={createForm.projectId}
              onChange={e => setCreateForm({ ...createForm, projectId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200"
            >
              <option value="">{isArabic ? 'اختر المشروع...' : 'Select project...'}</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'الموقع الميداني' : 'Field Site'} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              disabled={actionLoading}
              value={createForm.siteId}
              onChange={e => setCreateForm({ ...createForm, siteId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200"
            >
              <option value="">{isArabic ? 'اختر الموقع...' : 'Select site...'}</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'نوع العملية' : 'Operation Type'} <span className="text-rose-400">*</span>
            </label>
            <select
              disabled={actionLoading}
              value={createForm.operationType}
              onChange={e =>
                setCreateForm({ ...createForm, operationType: e.target.value as OperationType })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200"
            >
              {OPERATION_TYPES.map(opType => (
                <option key={opType} value={opType}>
                  {opType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'عنوان العملية' : 'Title'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              disabled={actionLoading}
              value={createForm.title}
              onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder={isArabic ? 'مثال: تركيب وتوصيل كبائن السيرفرات' : 'e.g. Server Rack Setup'}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'الوصف والتفاصيل' : 'Description'}
            </label>
            <textarea
              rows={2}
              disabled={actionLoading}
              value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 resize-none"
            />
          </div>
        </form>
      </AppModal>

      {/* ========================================================================= */}
      {/* 7. MODAL: ADD WORK LOG (With ActionLoadingBar & Live Counter)              */}
      {/* ========================================================================= */}
      <AppModal
        open={showLogModal}
        onClose={() => !actionLoading && setShowLogModal(false)}
        title={isArabic ? 'إضافة سجل عمل ميداني' : 'Add Field Work Log'}
        width="min(100%, 28rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
            <Clock className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="space-y-3">
            <ActionLoadingBar active={actionLoading} isArabic={isArabic} />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="ops-log-form"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-amber-500 to-amber-300 hover:brightness-110 disabled:opacity-60 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
              >
                {actionLoading
                  ? isArabic
                    ? 'جاري الحفظ…'
                    : 'Saving…'
                  : isArabic
                    ? 'حفظ السجل'
                    : 'Save Work Log'}
              </button>
            </div>
          </div>
        }
      >
        <form id="ops-log-form" onSubmit={handleAddWorkLog} className="space-y-3 text-start">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'عدد الساعات المنجزة' : 'Hours'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              required
              min="0.5"
              max="24"
              disabled={actionLoading}
              value={logForm.hours}
              onChange={e => setLogForm({ ...logForm, hours: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'تفاصيل ما تم إنجازه' : 'Work Description'}{' '}
              <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              disabled={actionLoading}
              value={logForm.description}
              onChange={e => setLogForm({ ...logForm, description: e.target.value })}
              placeholder={isArabic ? 'اكتب ما تم إنجازه في الموقع اليوم...' : 'Describe field work completed...'}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 resize-none"
            />
          </div>
        </form>
      </AppModal>

      {/* ========================================================================= */}
      {/* 8. MODAL: UPLOAD PHOTO (With ActionLoadingBar & Storage Indicator)         */}
      {/* ========================================================================= */}
      <AppModal
        open={showPhotoModal}
        onClose={() => !actionLoading && setShowPhotoModal(false)}
        title={isArabic ? 'رفع صورة من الموقع' : 'Upload Site Photo'}
        width="min(100%, 28rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <Camera className="w-4 h-4" />
          </div>
        }
        footer={
          <div className="space-y-3">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري الرفع إلى التخزين السحابي…' : 'Uploading to cloud storage…'}
            />
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="ops-photo-form"
                disabled={actionLoading || !photoFile}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-teal-500 to-cyan-300 hover:brightness-110 disabled:opacity-60 shadow-[0_0_20px_rgba(20,184,166,0.4)]"
              >
                {actionLoading
                  ? isArabic
                    ? 'جاري الرفع…'
                    : 'Uploading…'
                  : isArabic
                    ? 'رفع الصورة'
                    : 'Upload Photo'}
              </button>
            </div>
          </div>
        }
      >
        {actionError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 text-start">
            {actionError}
          </div>
        )}
        <form id="ops-photo-form" onSubmit={handleUploadPhoto} className="space-y-3 text-start">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'اختر ملف الصورة' : 'Select Photo'} <span className="text-rose-400">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              required
              disabled={actionLoading}
              onChange={e => setPhotoFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'وصف / تعليق على الصورة' : 'Caption / Description'}
            </label>
            <input
              type="text"
              disabled={actionLoading}
              value={photoCaption}
              onChange={e => setPhotoCaption(e.target.value)}
              placeholder={isArabic ? 'مثال: صورة الكابلات بعد الترتيب والترقيم' : 'e.g. Rack cabling after labeling'}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-200 placeholder-slate-500"
            />
          </div>
        </form>
      </AppModal>
    </div>
  );
};
