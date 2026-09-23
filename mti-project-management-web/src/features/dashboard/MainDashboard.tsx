'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Construction,
  FileCheck2,
  FolderLock,
  Layers,
  LifeBuoy,
  ListTodo,
  LogIn,
  LogOut,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  AdminDashboardStats,
  EngineerDashboardStats,
  Project,
  TaskItem,
  AuditLogItem,
} from '@/types';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';

export interface MainDashboardProps {
  lang: Language;
  isAdmin: boolean;
  userName: string;
  projects: Project[];
  tasks: TaskItem[];
  auditLogs: AuditLogItem[];
  adminStats: AdminDashboardStats | null;
  engineerStats: EngineerDashboardStats | null;
  pendingApprovals: number;
  approvedRecords: number;
  engineerCount: number;
  onNavigate: (tab: string) => void;
  onOpenProject: (project: Project) => void;
  translateStatus: (status?: string | number | null) => string;
}

function Sparkline({ color }: { color: string }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 120 36" className="w-full h-9 mt-2" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${uid}`}>
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0,28 C18,24 24,10 40,14 C56,18 62,6 78,10 C94,14 104,22 120,8 L120,36 L0,36 Z"
        fill={`url(#spark-${uid})`}
      />
      <path
        d="M0,28 C18,24 24,10 40,14 C56,18 62,6 78,10 C94,14 104,22 120,8"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        filter={`url(#glow-${uid})`}
      />
    </svg>
  );
}

function WorkflowChart({
  projects,
  tasks,
  sites,
  isAr,
}: {
  projects: number;
  tasks: number;
  sites: number;
  isAr: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const months = isAr
    ? ['أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر']
    : ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const series = [
    {
      key: 'p',
      color: '#38bdf8',
      values: [0.35, 0.42, 0.5, 0.55, 0.7, 1].map((f) => Math.max(1, Math.round(projects * f))),
    },
    {
      key: 't',
      color: '#34d399',
      values: [0.25, 0.4, 0.45, 0.65, 0.8, 1].map((f) => Math.max(1, Math.round(tasks * f))),
    },
    {
      key: 's',
      color: '#a78bfa',
      values: [0.3, 0.38, 0.55, 0.6, 0.85, 1].map((f) => Math.max(1, Math.round(sites * f))),
    },
  ];
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const w = 440;
  const h = 200;
  const padX = 18;
  const padY = 18;
  const bottom = 28;

  const points = (values: number[]) =>
    values.map((v, i) => ({
      x: padX + (i * (w - padX * 2)) / (values.length - 1),
      y: h - bottom - (v / max) * (h - padY - bottom),
    }));

  const smoothPath = (values: number[]) => {
    const pts = points(values);
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const areaPath = (values: number[]) => {
    const line = smoothPath(values);
    const pts = points(values);
    return `${line} L ${pts[pts.length - 1].x},${h - bottom} L ${pts[0].x},${h - bottom} Z`;
  };

  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-xl bg-[radial-gradient(ellipse_at_30%_20%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(ellipse_at_80%_70%,rgba(167,139,250,0.1),transparent_50%)] pointer-events-none" />
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48 relative z-10">
        <defs>
          {series.map((s) => (
            <React.Fragment key={s.key}>
              <linearGradient id={`wf-fill-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.45" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`wf-stroke-${uid}-${s.key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                <stop offset="50%" stopColor={s.color} stopOpacity="1" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.7" />
              </linearGradient>
              <filter id={`wf-glow-${uid}-${s.key}`}>
                <feGaussianBlur stdDeviation="2.2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </React.Fragment>
          ))}
        </defs>

        {[0, 1, 2, 3].map((i) => {
          const y = padY + (i * (h - padY - bottom)) / 3;
          return (
            <line
              key={i}
              x1={padX}
              x2={w - padX}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="4 6"
            />
          );
        })}

        {series.map((s) => (
          <path key={`a-${s.key}`} d={areaPath(s.values)} fill={`url(#wf-fill-${uid}-${s.key})`} />
        ))}
        {series.map((s) => (
          <path
            key={`l-${s.key}`}
            d={smoothPath(s.values)}
            fill="none"
            stroke={`url(#wf-stroke-${uid}-${s.key})`}
            strokeWidth="3"
            strokeLinecap="round"
            filter={`url(#wf-glow-${uid}-${s.key})`}
          />
        ))}
        {series.map((s) =>
          points(s.values).map((pt, i) => (
            <g key={`${s.key}-d-${i}`}>
              <circle cx={pt.x} cy={pt.y} r="5.5" fill={`${s.color}33`} />
              <circle cx={pt.x} cy={pt.y} r="3" fill="#0b1526" stroke={s.color} strokeWidth="2" />
            </g>
          ))
        )}
        {months.map((m, i) => {
          const x = padX + (i * (w - padX * 2)) / (months.length - 1);
          return (
            <text key={m} x={x} y={h - 6} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
              {m}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({
  inProgress,
  completed,
  delayed,
  onHold,
  label,
}: {
  inProgress: number;
  completed: number;
  delayed: number;
  onHold: number;
  label: string;
}) {
  const uid = useId().replace(/:/g, '');
  const rawTotal = inProgress + completed + delayed + onHold;
  const total = Math.max(rawTotal, 1);
  const parts = [
    { v: inProgress, c: '#38bdf8', glow: '#0ea5e9' },
    { v: completed, c: '#34d399', glow: '#10b981' },
    { v: delayed, c: '#fb7185', glow: '#f43f5e' },
    { v: onHold, c: '#94a3b8', glow: '#64748b' },
  ];
  let acc = 0;
  const r = 44;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative w-44 h-44 mx-auto">
      <div className="absolute inset-3 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.18),transparent_65%)] blur-md" />
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90 relative z-10 drop-shadow-[0_0_18px_rgba(56,189,248,0.25)]">
        <defs>
          {parts.map((p, i) => (
            <linearGradient key={i} id={`donut-${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={p.c} />
              <stop offset="100%" stopColor={p.glow} />
            </linearGradient>
          ))}
          <filter id={`donut-glow-${uid}`}>
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(30,41,59,0.95)" strokeWidth="16" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="4" />
        {parts.map((p, i) => {
          const len = (p.v / total) * c;
          if (p.v <= 0 && rawTotal > 0) {
            acc += len;
            return null;
          }
          const segment = rawTotal === 0 && i === 0 ? c * 0.92 : Math.max(len, 0.01);
          const dash = `${segment} ${c - segment}`;
          const el = (
            <circle
              key={i}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={`url(#donut-${uid}-${i})`}
              strokeWidth="15"
              strokeDasharray={dash}
              strokeDashoffset={-acc}
              strokeLinecap="round"
              filter={`url(#donut-glow-${uid})`}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <div className="text-[10px] text-cyan-300/90 font-semibold tracking-wide uppercase flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {label}
        </div>
        <div className="text-3xl font-extrabold text-white tabular-nums drop-shadow">{rawTotal}</div>
        <div className="text-[10px] text-slate-400 font-medium">{Math.round((inProgress / total) * 100)}%</div>
      </div>
    </div>
  );
}

function GlowIcon({
  icon: Icon,
  color,
  size = 'md',
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const box = size === 'lg' ? 'w-12 h-12' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const iconSize = size === 'lg' ? 'w-6 h-6' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={`relative ${box} flex-shrink-0`}>
      <div
        className="absolute inset-0 rounded-2xl blur-md opacity-70"
        style={{ background: `${color}55` }}
      />
      <div
        className={`relative ${box} rounded-2xl flex items-center justify-center border`}
        style={{
          color,
          background: `linear-gradient(145deg, ${color}33, rgba(8,16,32,0.85))`,
          borderColor: `${color}66`,
          boxShadow: `0 0 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
        }}
      >
        <Icon className={iconSize} strokeWidth={2.2} />
      </div>
    </div>
  );
}

const panelClass =
  'rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#121f33]/95 via-[#0d1829]/92 to-[#0a1422]/96 backdrop-blur-md shadow-[0_0_28px_rgba(14,165,233,0.08),inset_0_1px_0_rgba(255,255,255,0.06)]';

export function MainDashboard({
  lang,
  isAdmin,
  userName,
  projects,
  tasks,
  auditLogs,
  adminStats,
  engineerStats,
  pendingApprovals,
  approvedRecords,
  engineerCount,
  onNavigate,
  onOpenProject,
  translateStatus,
}: MainDashboardProps) {
  const t = (k: any) => getTranslation(k, lang);
  const isAr = lang === 'ar';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const openTasks =
    adminStats?.openTasks ??
    tasks.filter((tk) => tk.status !== 'Completed' && tk.status !== 'Cancelled').length;
  const overdueTasks =
    adminStats?.overdueTasks ??
    tasks.filter(
      (tk) =>
        !!tk.dueAt &&
        new Date(tk.dueAt) < new Date() &&
        tk.status !== 'Completed' &&
        tk.status !== 'Cancelled'
    ).length;
  const totalProjects = adminStats?.totalProjects ?? projects.length;
  const totalSites =
    adminStats?.totalSites ?? projects.reduce((sum, p) => sum + (p.totalSitesCount || 0), 0);
  const delayedProjects = adminStats?.delayedProjects ?? 0;
  const closedProjects = Math.max(
    0,
    totalProjects - (adminStats?.activeProjects ?? projects.filter((p) => String(p.status) === 'Active').length)
  );

  const statusCounts = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    let delayed = 0;
    let onHold = 0;
    for (const p of projects) {
      const s = String(p.status);
      if (s === 'Completed' || s === '4') completed++;
      else if (s === 'OnHold' || s === '3') onHold++;
      else if (s === 'Delayed' || s.toLowerCase().includes('delay')) delayed++;
      else inProgress++;
    }
    if (projects.length === 0) inProgress = 0;
    return { inProgress, completed, delayed, onHold };
  }, [projects]);

  const upcomingTasks = useMemo(() => {
    return [...tasks]
      .filter((tk) => tk.status !== 'Completed' && tk.status !== 'Cancelled')
      .sort((a, b) => {
        const da = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      })
      .slice(0, 6);
  }, [tasks]);

  const recentActivity = useMemo(() => {
    const toneFromAction = (action: string) => {
      const a = action.toLowerCase();
      if (a.includes('login')) return 'cyan' as const;
      if (a.includes('logout')) return 'rose' as const;
      if (a.includes('create') || a.includes('add')) return 'emerald' as const;
      if (a.includes('update') || a.includes('edit')) return 'amber' as const;
      if (a.includes('document')) return 'violet' as const;
      return 'cyan' as const;
    };
    if (auditLogs?.length) {
      return auditLogs.slice(0, 5).map((a) => ({
        id: a.id,
        title: a.action,
        subtitle: a.entityType,
        at: a.createdAt,
        tone: toneFromAction(a.action),
      }));
    }
    return projects.slice(0, 4).map((p, i) => ({
      id: p.id,
      title: isAr ? 'تم تحديث مشروع' : 'Project updated',
      subtitle: p.name,
      at: p.createdAt,
      tone: (['cyan', 'emerald', 'amber', 'violet'] as const)[i % 4],
    }));
  }, [auditLogs, projects, isAr]);

  const dateLocale = isAr ? 'ar-EG' : 'en-GB';
  const dateLabel = now.toLocaleDateString(dateLocale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });

  const priorityBadge = (priority?: string) => {
    const p = String(priority || 'Medium');
    if (p === 'High' || p === 'Urgent' || p === 'Critical')
      return { label: isAr ? 'عالية' : 'High', cls: 'bg-rose-500/20 text-rose-300 border-rose-400/30' };
    if (p === 'Low')
      return { label: isAr ? 'منخفضة' : 'Low', cls: 'bg-sky-500/20 text-sky-300 border-sky-400/30' };
    return { label: isAr ? 'متوسطة' : 'Medium', cls: 'bg-amber-500/20 text-amber-300 border-amber-400/30' };
  };

  const kpiCards = [
    {
      title: t('openTasks'),
      value: openTasks,
      sub: `${overdueTasks} ${t('overdueLabel')}`,
      subDanger: overdueTasks > 0,
      color: '#38bdf8',
      icon: ListTodo,
      tab: isAdmin ? 'tasks' : 'my-tasks',
    },
    {
      title: t('pendingApprovals'),
      value: isAdmin ? pendingApprovals : engineerStats?.pendingDataCount ?? pendingApprovals,
      sub: `${approvedRecords} ${t('approvedRecords')}`,
      subDanger: false,
      color: '#34d399',
      icon: FileCheck2,
      tab: isAdmin ? 'approvals' : 'my-data',
    },
    {
      title: t('monitoredSites'),
      value: isAdmin ? totalSites : engineerStats?.mySitesCount ?? totalSites,
      sub: `${isAdmin ? engineerCount : engineerStats?.myProjectsCount ?? projects.length} ${
        isAdmin ? t('activeEngineers') : t('sitesCount')
      }`,
      subDanger: false,
      color: '#a78bfa',
      icon: MapPin,
      tab: isAdmin ? 'sites' : 'my-sites',
    },
    {
      title: t('totalProjects'),
      value: isAdmin ? totalProjects : engineerStats?.myProjectsCount ?? projects.length,
      sub: `${delayedProjects} ${isAr ? 'متأخر' : 'Delayed'}`,
      subDanger: delayedProjects > 0,
      color: '#fb923c',
      icon: Briefcase,
      tab: isAdmin ? 'projects' : 'my-projects',
    },
  ];

  const miniStats = [
    { label: isAr ? 'مشاريع مغلقة' : 'Closed Projects', value: closedProjects, icon: FolderLock, color: '#94a3b8', tab: 'projects' },
    { label: isAr ? 'مشاكل مفتوحة' : 'Open Issues', value: adminStats?.openIssues ?? 0, icon: AlertTriangle, color: '#fb923c', tab: 'governance' },
    { label: isAr ? 'مخاطر حرجة' : 'Critical Risks', value: adminStats?.criticalRisks ?? 0, icon: ShieldAlert, color: '#fb7185', tab: 'governance' },
    { label: isAr ? 'صيانة' : 'Maintenance', value: adminStats?.maintenanceTickets ?? 0, icon: Construction, color: '#22d3ee', tab: 'operations' },
    { label: isAr ? 'مهام محتملة' : 'Potential Tasks', value: openTasks, icon: Zap, color: '#38bdf8', tab: 'tasks' },
    { label: isAr ? 'طلبات دعم' : 'Support Requests', value: adminStats?.pendingDocuments ?? 0, icon: LifeBuoy, color: '#c084fc', tab: 'documents' },
  ];

  const toneMeta = (tone: string) => {
    if (tone === 'emerald') return { Icon: Plus, color: '#34d399' };
    if (tone === 'amber') return { Icon: Pencil, color: '#fbbf24' };
    if (tone === 'violet') return { Icon: Layers, color: '#a78bfa' };
    if (tone === 'rose') return { Icon: LogOut, color: '#fb7185' };
    return { Icon: LogIn, color: '#38bdf8' };
  };

  return (
    <div className="space-y-5 pb-4">
      <section className="company-hero border border-cyan-400/25 shadow-[0_0_40px_rgba(14,165,233,0.18)]">
        <img src="/images/Company.png" alt="MTI Company" className="company-hero-img" />
        <div className="company-hero-veil" aria-hidden />
        <div className="company-hero-content">
          <div className="company-hero-slot company-hero-slot-start">
            <div className="company-hero-glass max-w-md">
              <h2 className="font-display text-base sm:text-xl font-bold text-white leading-snug">
                {isAr ? `مرحباً بك مجدداً 👋` : `Welcome back 👋`}
                {userName ? `، ${userName.split(' ')[0]}` : ''}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-100/95 leading-relaxed">
                {isAr
                  ? 'تابع مشاريعك وراقب الأداء من لوحة التحكم الرئيسية.'
                  : 'Follow your projects and monitor performance from the main dashboard.'}
              </p>
              <div className="text-[10px] tracking-[0.22em] uppercase text-cyan-200/95 font-bold">
                Building a smarter tomorrow.
              </div>
            </div>
          </div>

          <div className="company-hero-slot company-hero-slot-center" aria-hidden />

          <div className="company-hero-slot company-hero-slot-end">
            <div className="company-hero-glass min-w-[10.5rem]">
              <div className="text-[11px] text-slate-100 flex items-center gap-1.5 font-medium">
                <CalendarDays className="w-3.5 h-3.5 text-cyan-300 flex-shrink-0" />
                <span className="leading-snug">{dateLabel}</span>
              </div>
              <div className="text-xl font-bold text-white tabular-nums flex items-center gap-2">
                <Clock3 className="w-5 h-5 text-cyan-300 flex-shrink-0" />
                {timeLabel}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onNavigate(card.tab)}
              className="group text-start rounded-2xl p-4 border backdrop-blur-md transition hover:-translate-y-1 hover:brightness-110"
              style={{
                background: `linear-gradient(165deg, ${card.color}18 0%, rgba(12,22,42,0.92) 42%, rgba(8,16,32,0.96) 100%)`,
                borderColor: `${card.color}55`,
                boxShadow: `0 0 32px ${card.color}28, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <GlowIcon icon={Icon} color={card.color} />
                <div className="text-[11px] text-slate-100 font-semibold text-end leading-snug pt-0.5">
                  {card.title}
                </div>
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white tabular-nums tracking-tight drop-shadow">
                {card.value}
              </div>
              <div
                className="text-[11px] mt-1 font-semibold"
                style={{ color: card.subDanger ? '#fb7185' : card.color }}
              >
                {card.sub}
              </div>
              <Sparkline color={card.color} />
            </button>
          );
        })}
      </section>

      {isAdmin && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {miniStats.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => onNavigate(s.tab)}
                className="rounded-2xl px-3 py-3.5 text-start transition hover:-translate-y-1"
                style={{
                  background: `linear-gradient(160deg, ${s.color}16 0%, rgba(12,22,42,0.94) 55%, rgba(8,16,32,0.97) 100%)`,
                  border: `1px solid ${s.color}50`,
                  boxShadow: `0 0 22px ${s.color}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <GlowIcon icon={Icon} color={s.color} size="sm" />
                  <span className="text-xl font-extrabold tabular-nums" style={{ color: s.color }}>
                    {s.value}
                  </span>
                </div>
                <div className="text-[11px] text-slate-200 mt-2.5 font-semibold leading-snug">{s.label}</div>
              </button>
            );
          })}
        </section>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-5 ${panelClass} p-4`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-300 shadow-[0_0_16px_rgba(56,189,248,0.35)]">
                <TrendingUp className="w-4 h-4" />
              </span>
              {isAr ? 'سير عمل المشاريع' : 'Project Workflow'}
            </h3>
            <span className="text-[10px] text-cyan-200/80 font-semibold px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-400/25">
              {isAr ? 'آخر 6 أشهر' : 'Last 6 months'}
            </span>
          </div>
          <WorkflowChart
            projects={totalProjects || 3}
            tasks={openTasks || 4}
            sites={totalSites || 10}
            isAr={isAr}
          />
          <div className="flex flex-wrap gap-2.5 mt-1 text-[11px]">
            {[
              { c: '#38bdf8', l: isAr ? 'مشاريع' : 'Projects' },
              { c: '#34d399', l: isAr ? 'مهام' : 'Tasks' },
              { c: '#a78bfa', l: isAr ? 'مواقع' : 'Sites' },
            ].map((x) => (
              <span
                key={x.l}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-semibold"
                style={{ borderColor: `${x.c}55`, background: `${x.c}14`, color: x.c }}
              >
                <i className="w-2 h-2 rounded-full" style={{ background: x.c, boxShadow: `0 0 8px ${x.c}` }} />
                {x.l}
              </span>
            ))}
          </div>
        </div>

        <div className={`xl:col-span-3 ${panelClass} p-4`}>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.3)]">
              <Sparkles className="w-4 h-4" />
            </span>
            {isAr ? 'حالة المشاريع' : 'Project Status'}
          </h3>
          <DonutChart
            inProgress={statusCounts.inProgress}
            completed={statusCounts.completed}
            delayed={statusCounts.delayed || delayedProjects}
            onHold={statusCounts.onHold}
            label={isAr ? 'مشاريع' : 'Projects'}
          />
          <div className="mt-3 space-y-2 text-[11px]">
            {[
              { label: isAr ? 'قيد التنفيذ' : 'In Progress', v: statusCounts.inProgress, c: '#38bdf8' },
              { label: isAr ? 'مكتمل' : 'Completed', v: statusCounts.completed, c: '#34d399' },
              { label: isAr ? 'متأخر' : 'Delayed', v: statusCounts.delayed || delayedProjects, c: '#fb7185' },
              { label: isAr ? 'موقوف' : 'On Hold', v: statusCounts.onHold, c: '#94a3b8' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border"
                style={{ borderColor: `${row.c}33`, background: `${row.c}0d` }}
              >
                <span className="inline-flex items-center gap-1.5 text-slate-100 font-medium">
                  <i className="w-2.5 h-2.5 rounded-full" style={{ background: row.c, boxShadow: `0 0 10px ${row.c}` }} />
                  {row.label}
                </span>
                <span className="tabular-nums text-white font-bold">{row.v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`xl:col-span-4 ${panelClass} p-4`}>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-400/35 flex items-center justify-center text-violet-300 shadow-[0_0_16px_rgba(167,139,250,0.3)]">
              <Zap className="w-4 h-4" />
            </span>
            {isAr ? 'أحدث النشاطات' : 'Latest Activity'}
          </h3>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pe-1">
            {recentActivity.length === 0 && (
              <div className="text-xs text-slate-400 py-8 text-center">{isAr ? 'لا يوجد نشاط بعد' : 'No activity yet'}</div>
            )}
            {recentActivity.map((a) => {
              const meta = toneMeta(a.tone);
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-600/40 bg-slate-950/35 hover:border-cyan-400/30 transition"
                >
                  <GlowIcon icon={meta.Icon} color={meta.color} size="sm" />
                  <div className="min-w-0 flex-1 text-start">
                    <div className="text-xs font-bold text-white truncate">{a.title}</div>
                    <div className="text-[11px] text-slate-300 truncate mt-0.5">{a.subtitle}</div>
                    <div className="text-[10px] text-cyan-300/80 mt-1 font-medium">
                      {a.at ? formatDateCairo(a.at) : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-7 ${panelClass} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-cyan-400/15 flex items-center justify-between bg-gradient-to-l from-sky-500/10 to-transparent">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-orange-300" />
              {isAr ? 'أحدث المشاريع' : 'Latest Projects'}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate(isAdmin ? 'projects' : 'my-projects')}
              className="text-[11px] text-cyan-300 font-bold hover:text-cyan-200"
            >
              {isAr ? 'عرض الكل' : 'View all'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-300 border-b border-slate-700/50 bg-slate-950/30">
                  <th className="text-start font-bold px-4 py-2.5">{isAr ? 'المشروع' : 'Project'}</th>
                  <th className="text-start font-bold px-3 py-2.5">{isAr ? 'العميل' : 'Client'}</th>
                  <th className="text-start font-bold px-3 py-2.5">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="text-start font-bold px-3 py-2.5">{isAr ? 'التقدم' : 'Progress'}</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 6).map((p) => {
                  const progress = Number((p as any).progressPercentage ?? (p as any).progress ?? 0) || 0;
                  const status = translateStatus(p.status);
                  const active =
                    String(p.status) === 'Active' ||
                    String(p.status) === '1' ||
                    String(p.status) === 'InProgress';
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-800/80 hover:bg-sky-500/5 cursor-pointer transition"
                      onClick={() => onOpenProject(p)}
                    >
                      <td className="px-4 py-3 text-start">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-cyan-300 mt-0.5 font-semibold">{p.code}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-200 text-start">{p.clientName || '—'}</td>
                      <td className="px-3 py-3 text-start">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold ${
                            active
                              ? 'bg-sky-500/15 text-sky-300 border-sky-400/30 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                              : String(p.status) === 'Completed'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                                : 'bg-slate-700/50 text-slate-200 border-slate-500/40'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-3 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-800/90 overflow-hidden border border-slate-700/60">
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-cyan-300 via-sky-400 to-blue-500 shadow-[0_0_10px_rgba(56,189,248,0.55)]"
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-slate-100 font-bold w-9">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        <MoreHorizontal className="w-4 h-4" />
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      {isAr ? 'لا توجد مشاريع بعد' : 'No projects yet'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={`xl:col-span-5 ${panelClass} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.28)]">
                <ListTodo className="w-4 h-4" />
              </span>
              {isAr ? 'المهام القادمة' : 'Upcoming Tasks'}
            </h3>
            <button
              type="button"
              onClick={() => onNavigate(isAdmin ? 'tasks' : 'my-tasks')}
              className="text-[11px] text-cyan-300 font-bold inline-flex items-center gap-1 hover:text-cyan-200"
            >
              {isAr ? 'الكل' : 'All'}{' '}
              <ChevronLeft className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
            </button>
          </div>
          <div className="space-y-2.5">
            {upcomingTasks.length === 0 && (
              <div className="text-xs text-slate-400 py-10 text-center">
                {isAr ? 'لا توجد مهام قادمة' : 'No upcoming tasks'}
              </div>
            )}
            {upcomingTasks.map((tk) => {
              const badge = priorityBadge(tk.priority as any);
              return (
                <div
                  key={tk.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-600/45 bg-gradient-to-l from-slate-950/50 to-slate-900/30 hover:border-cyan-400/30 transition"
                >
                  <div className="mt-0.5 w-5 h-5 rounded-md border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                    <CheckCircle2 className="w-3 h-3 text-cyan-300/70" />
                  </div>
                  <div className="min-w-0 flex-1 text-start">
                    <div className="text-xs font-bold text-white truncate">{tk.title}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-[10px] text-slate-300 font-medium">
                        {tk.dueAt ? formatDateCairo(tk.dueAt) : isAr ? 'بدون موعد' : 'No due date'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
