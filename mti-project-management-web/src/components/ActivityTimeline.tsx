'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  FolderOpen,
  MapPin,
  CheckSquare,
  FileText,
  Compass,
  FileSpreadsheet,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldAlert,
  Download,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { ActivityTimelineItem } from '@/types';
import { activityService } from '@/services/activity.service';
import { Language, formatDateCairo } from '@/lib/i18n';

interface ActivityTimelineProps {
  projectId?: string;
  siteId?: string;
  userId?: string;
  teamId?: string;
  projects?: any[];
  lang?: Language;
  title?: string;
  showHeader?: boolean;
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  projectId: propProjectId,
  siteId,
  userId,
  teamId,
  projects,
  lang = 'ar',
  title,
  showHeader = true
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(propProjectId || '');
  const [activities, setActivities] = useState<ActivityTimelineItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (propProjectId) setSelectedProjectId(propProjectId);
  }, [propProjectId]);

  useEffect(() => {
    loadActivities();
  }, [selectedProjectId, siteId, userId, teamId, selectedType]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const res = await activityService.getActivityTimeline({
        projectId: selectedProjectId || undefined,
        siteId,
        userId,
        teamId,
        activityType: selectedType || undefined,
        pageSize: 50
      });
      if (res.success && res.data) {
        setActivities(res.data);
      }
    } catch (err) {
      console.error('Failed to load activities', err);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (entityType: string, action: string) => {
    const act = (action || '').toLowerCase();
    const type = (entityType || '').toLowerCase();

    if (act.includes('download')) return <Download className="w-4 h-4 text-emerald-400" />;
    if (act.includes('approve') || act.includes('complete')) return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (act.includes('reject') || act.includes('delete')) return <ShieldAlert className="w-4 h-4 text-rose-400" />;

    if (type.includes('project')) return <FolderOpen className="w-4 h-4 text-sky-400" />;
    if (type.includes('site')) return <MapPin className="w-4 h-4 text-cyan-400" />;
    if (type.includes('task')) return <CheckSquare className="w-4 h-4 text-amber-400" />;
    if (type.includes('drawing')) return <Compass className="w-4 h-4 text-purple-400" />;
    if (type.includes('report')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (type.includes('document')) return <FileText className="w-4 h-4 text-blue-400" />;
    if (type.includes('user') || type.includes('auth')) return <User className="w-4 h-4 text-indigo-400" />;

    return <Activity className="w-4 h-4 text-cyan-300" />;
  };

  const getActionLabel = (item: ActivityTimelineItem) => {
    const act = item.action.toLowerCase();
    const type = item.entityType.toLowerCase();

    if (lang === 'ar') {
      if (act.includes('create') && type.includes('project')) return 'إنشاء مشروع جديد';
      if (act.includes('create') && type.includes('site')) return 'إنشاء موقع جديد';
      if (act.includes('upload') && type.includes('document')) return 'رفع مستند';
      if (act.includes('upload') && type.includes('drawing')) return 'رفع مخطط هندسي';
      if (act.includes('revise') || act.includes('revision')) return 'إنشاء مراجعة هندسية';
      if (act.includes('approve')) return 'اعتماد رسمي';
      if (act.includes('reject')) return 'رفض العملية';
      if (act.includes('assign')) return 'تعيين مهام';
      if (act.includes('complete')) return 'إكمال مهمة';
      if (act.includes('login')) return 'تسجيل دخول';
      return `${item.action} (${item.entityType})`;
    }
    return `${item.action} ${item.entityType}`;
  };

  return (
    <div className="bg-[#0b1320]/80 rounded-2xl border border-slate-700/60 p-5 space-y-4 backdrop-blur-md shadow-xl text-start">
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-700/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {title || (lang === 'ar' ? 'سجل النشاط والأحداث الموحد' : 'Unified Activity Timeline')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'ar' ? 'تتبع لحظي وتدقيق شامل لجميع العمليات' : 'Real-time timeline and audit across operations'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-xl border border-slate-700/60 text-xs">
              <Filter className="w-3 h-3 text-slate-400" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'جميع الأنشطة' : 'All Activities'}</option>
                <option value="Project" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'المشاريع' : 'Projects'}</option>
                <option value="Site" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'المواقع' : 'Sites'}</option>
                <option value="Task" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'المهام' : 'Tasks'}</option>
                <option value="Document" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'المستندات' : 'Documents'}</option>
                <option value="Drawing" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'المخططات' : 'Drawings'}</option>
                <option value="DailyReport" className="bg-slate-900 text-slate-200">{lang === 'ar' ? 'التقارير اليومية' : 'Daily Reports'}</option>
              </select>
            </div>

            <button
              onClick={loadActivities}
              disabled={loading}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              title={lang === 'ar' ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {loading && activities.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span>{lang === 'ar' ? 'جارٍ تحميل الأنشطة...' : 'Loading activities...'}</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          {lang === 'ar' ? 'لا توجد أنشطة مسجلة حتى الآن' : 'No recorded activity yet'}
        </div>
      ) : (
        <div className="relative border-s border-slate-700/60 ms-3 ps-5 space-y-4">
          {activities.map((act) => {
            const isExpanded = expandedId === act.id;
            return (
              <div key={act.id} className="relative group">
                {/* Timeline node dot */}
                <div className="absolute -start-[29px] top-1.5 p-1 rounded-full bg-slate-950 border border-cyan-400/40 shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                  {getEntityIcon(act.entityType, act.action)}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        {getActionLabel(act)}
                      </span>
                      {act.projectName && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-400/30 text-[10px] text-sky-300 font-medium">
                          {act.projectName}
                        </span>
                      )}
                      {act.siteName && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-400/30 text-[10px] text-cyan-300 font-medium">
                          {act.siteName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatDateCairo(act.createdAt, lang)}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-cyan-300">
                        {(act.userName || act.userEmail || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-slate-300 font-medium">{act.userName || act.userEmail || (lang === 'ar' ? 'النظام' : 'System')}</span>
                    </div>

                    {(act.newValues || act.oldValues) && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : act.id)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                      >
                        {isExpanded ? (lang === 'ar' ? 'إخفاء التفاصيل' : 'Hide') : (lang === 'ar' ? 'عرض التفاصيل' : 'Details')}
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>

                  {isExpanded && (act.newValues || act.oldValues) && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
                      {act.newValues && (
                        <div>
                          <span className="text-cyan-400 font-bold block mb-1">Payload:</span>
                          <pre className="whitespace-pre-wrap">{act.newValues}</pre>
                        </div>
                      )}
                      {act.oldValues && (
                        <div className="mt-2 pt-2 border-t border-slate-800">
                          <span className="text-amber-400 font-bold block mb-1">Previous:</span>
                          <pre className="whitespace-pre-wrap">{act.oldValues}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
