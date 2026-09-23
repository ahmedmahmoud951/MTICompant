'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Link,
  Clock,
  Calendar,
  Trash2,
  Users,
  RefreshCw,
  XCircle,
  GitBranch,
  ShieldAlert,
  Flag,
  PieChart,
  FileStack,
} from 'lucide-react';
import { milestonesService } from '@/services/milestones.service';
import { signalRService } from '@/services/signalr.service';
import { ProjectMilestoneDto, ProjectAssignmentDto, Project, User } from '@/types';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';
import { AppModal } from '@/components/AppModal';

interface MilestonesRoadmapProps {
  currentUser: User | null;
  projects: Project[];
  lang: Language;
  onAddTeam?: () => void;
}

export const MilestonesRoadmap: React.FC<MilestonesRoadmapProps> = ({
  currentUser,
  projects,
  lang,
  onAddTeam,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [milestones, setMilestones] = useState<ProjectMilestoneDto[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignmentDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showAddDep, setShowAddDep] = useState(false);
  const [targetMilestone, setTargetMilestone] = useState<ProjectMilestoneDto | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [weight, setWeight] = useState(10);
  const [dependsOnId, setDependsOnId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = (k: any) => getTranslation(k, lang);
  const isArabic = lang === 'ar';
  const isAdmin = currentUser?.roles?.some(
    (r) => r === 'Admin' || r === 'SystemAdmin' || r === 'ProjectManager'
  );

  useEffect(() => {
    if (!selectedProjectId && projects[0]?.id) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) loadData(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    const handleReload = () => {
      if (selectedProjectId) {
        loadData(selectedProjectId);
      }
    };
    const unsub1 = signalRService.on('MilestoneCreated', handleReload);
    const unsub2 = signalRService.on('MilestoneUpdated', handleReload);
    const unsub3 = signalRService.on('MilestoneDeleted', handleReload);
    const unsub4 = signalRService.on('MilestoneDependencyAdded', handleReload);
    const unsub5 = signalRService.on('AssignmentCreated', handleReload);
    const unsub6 = signalRService.on('ProjectAssignmentCreated', handleReload);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
    };
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const loadData = async (projId: string) => {
    setLoading(true);
    try {
      const [mRes, aRes] = await Promise.all([
        milestonesService.getProjectMilestones(projId),
        milestonesService.getProjectAssignments(projId),
      ]);
      if (mRes.success && mRes.data) setMilestones(mRes.data);
      else setMilestones([]);
      if (aRes.success && aRes.data) setAssignments(aRes.data);
      else setAssignments([]);
    } catch (err) {
      console.error('Failed to load phases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !name) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await milestonesService.createMilestone({
        projectId: selectedProjectId,
        name,
        description,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        weight: Number(weight) || 0,
      });
      if (res.success) {
        setShowAddMilestone(false);
        setName('');
        setDescription('');
        setStartDate('');
        setDueDate('');
        setWeight(10);
        loadData(selectedProjectId);
        signalRService.emit('MilestoneCreated', res.data);
        signalRService.emit('AdminStatsUpdated');
      } else {
        setErrorMsg(res.message || 'Failed to create phase');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create phase');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMilestone || !dependsOnId) return;
    setActionLoading(true);
    setErrorMsg('');
    try {
      const res = await milestonesService.addDependency(targetMilestone.id, dependsOnId);
      if (res.success) {
        setShowAddDep(false);
        setDependsOnId('');
        setTargetMilestone(null);
        loadData(selectedProjectId);
        signalRService.emit('MilestoneDependencyAdded', res.data);
      } else {
        setErrorMsg(res.message || t('circularDependencyError'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('circularDependencyError'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!window.confirm(t('deletePhaseConfirm'))) return;
    try {
      const res = await milestonesService.deleteMilestone(id);
      if (res.success) {
        loadData(selectedProjectId);
        signalRService.emit('MilestoneDeleted', { id });
        signalRService.emit('AdminStatsUpdated');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalWeight = milestones.reduce((sum, m) => sum + (m.weight || 0), 0);
  const completedWeight = milestones
    .filter((m) => m.status === 'Completed')
    .reduce((sum, m) => sum + (m.weight || 0), 0);
  const weightedProgress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  const earliestStart =
    milestones
      .map((m) => m.startDate)
      .filter(Boolean)
      .sort()[0] || selectedProject?.startDate || null;

  const openAddPhase = () => {
    setErrorMsg('');
    setShowAddMilestone(true);
  };

  return (
    <div className="space-y-5 pb-2">
      {/* Hero banner — Company.png + mock copy */}
      <section className="company-hero border border-cyan-400/30 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
        <img src="/images/Company.png" alt="" className="company-hero-img" aria-hidden />
        <div className="company-hero-veil" aria-hidden />
        <div className="company-hero-content">
          <div className="company-hero-slot company-hero-slot-start">
            <div className="company-hero-glass max-w-md">
              <h2 className="font-display text-base sm:text-xl font-bold text-sky-100 leading-snug">
                {t('milestonesTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-100/95 leading-relaxed">
                {t('milestonesSubtitle')}
              </p>
            </div>
          </div>

          <div className="company-hero-slot company-hero-slot-center" aria-hidden />

          <div className="company-hero-slot company-hero-slot-end">
            <div className="company-hero-glass items-end">
              <div className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-white font-bold">
                Engineering a smarter tomorrow
              </div>
              <div className="h-0.5 w-14 rounded-full bg-gradient-to-l from-[#ff003c] to-transparent" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 px-0.5">
        {['Build', 'Plan', 'Manage', 'Succeed'].map((word) => (
          <span
            key={word}
            className="px-3 py-1.5 rounded-xl text-[10px] tracking-[0.16em] uppercase text-cyan-100 font-bold bg-[#0b1526]/85 border border-cyan-400/30 shadow-[0_0_14px_rgba(14,165,233,0.12)]"
          >
            {word}
          </span>
        ))}
      </div>

      {/* Controls + KPI cards */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadData(selectedProjectId)}
            disabled={loading || !selectedProjectId}
            className="p-2.5 rounded-xl border border-cyan-400/30 bg-slate-900/60 text-cyan-200 hover:bg-slate-800/80 transition"
            title={isArabic ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={openAddPhase}
              disabled={!selectedProjectId}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-[#6366f1] via-[#0ea5e9] to-[#22d3ee] shadow-[0_0_24px_rgba(14,165,233,0.45)] hover:brightness-110 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {t('addMilestone')}
            </button>
          )}

          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-900/70 border border-cyan-400/30 text-sm text-slate-100 min-w-[180px]"
          >
            {projects.length === 0 && (
              <option value="">{isArabic ? 'لا توجد مشاريع' : 'No projects'}</option>
            )}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
          <div className="phases-stat-card">
            <div className="phases-stat-icon">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="text-start min-w-0">
              <div className="text-[10px] text-slate-400 font-medium">{t('startDateLabel')}</div>
              <div className="text-sm font-bold text-slate-100 truncate">
                {earliestStart ? formatDateCairo(earliestStart) : '—/—/————'}
              </div>
            </div>
          </div>
          <div className="phases-stat-card">
            <div className="phases-stat-icon">
              <Flag className="w-4 h-4" />
            </div>
            <div className="text-start min-w-0">
              <div className="text-[10px] text-slate-400 font-medium">{t('phasesCountLabel')}</div>
              <div className="text-sm font-bold text-slate-100 tabular-nums">{milestones.length}</div>
            </div>
          </div>
          <div className="phases-stat-card">
            <div className="phases-stat-icon text-amber-300 border-amber-400/30 bg-amber-500/10">
              <PieChart className="w-4 h-4" />
            </div>
            <div className="text-start min-w-0">
              <div className="text-[10px] text-slate-400 font-medium">{t('overallCompletionLabel')}</div>
              <div className="text-sm font-bold text-cyan-300 tabular-nums">{weightedProgress}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule progress */}
      <div className="phases-panel rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm font-bold text-slate-100">
            {t('scheduleProgressLabel')}{' '}
            <span className="text-slate-400 font-medium text-xs">
              ({completedWeight}/{totalWeight} {isArabic ? 'نقطة وزن' : 'weight pts'})
            </span>
          </div>
        </div>
        <div className="relative w-full h-4 rounded-full bg-slate-950/80 border border-slate-700/70 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-l from-cyan-300 via-sky-400 to-blue-600 transition-all duration-500"
            style={{ width: `${weightedProgress}%` }}
          />
          <span className="absolute top-1/2 -translate-y-1/2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.6)]">
            {weightedProgress}%
          </span>
        </div>
      </div>

      {/* Two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Teams */}
        <div className="lg:col-span-5 phases-panel rounded-2xl p-4 flex flex-col min-h-[320px]">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-cyan-300" />
            {t('teamsPanelTitle')}
          </h3>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {isArabic ? 'جاري التحميل…' : 'Loading…'}
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-cyan-400/25 flex items-center justify-center mb-4 shadow-[0_0_28px_rgba(14,165,233,0.2)]">
                <Users className="w-8 h-8 text-cyan-300" />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-xs">{t('teamsEmptyHint')}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onAddTeam?.()}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-l from-sky-500 to-cyan-400 shadow-[0_0_20px_rgba(14,165,233,0.4)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addWorkTeam')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 overflow-y-auto flex-1 pe-1">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="p-3 rounded-xl bg-slate-950/45 border border-slate-700/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100">{asg.userName || asg.teamName}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-400/25">
                      {asg.role}
                    </span>
                  </div>
                  {asg.userEmail && <p className="text-[11px] text-slate-400">{asg.userEmail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Phases list */}
        <div className="lg:col-span-7 phases-panel rounded-2xl p-4 flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-300" />
              {t('phasesListTitle')}
            </h3>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {isArabic ? 'جاري تحميل مراحل التنفيذ…' : 'Loading phases…'}
            </div>
          ) : milestones.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-cyan-400/25 flex items-center justify-center mb-4 shadow-[0_0_28px_rgba(14,165,233,0.2)]">
                <FileStack className="w-8 h-8 text-cyan-300" />
              </div>
              <h4 className="text-sm font-semibold text-slate-100">{t('phasesEmptyTitle')}</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-sm">{t('phasesEmptyHint')}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddPhase}
                  disabled={!selectedProjectId}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-l from-sky-500 to-cyan-400 shadow-[0_0_22px_rgba(14,165,233,0.45)] disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isArabic ? 'إضافة مرحلة جديدة' : 'Add new phase'}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto flex-1 pe-1">
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-xl bg-slate-950/40 border border-cyan-400/20 hover:border-cyan-400/45 transition space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-start min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-100">{m.name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/30">
                          {m.weight}% {t('milestoneWeight')}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                            m.status === 'Completed'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                              : m.status === 'InProgress'
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
                                : 'bg-slate-700/50 text-slate-300 border border-slate-500/40'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      {m.description && <p className="text-xs text-slate-400 mt-1">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetMilestone(m);
                              setErrorMsg('');
                              setShowAddDep(true);
                            }}
                            className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500 text-sky-300 hover:text-white transition-colors"
                            title={t('addDependency')}
                          >
                            <Link className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors"
                            title={isArabic ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {t('startDateLabel')}: {formatDateCairo(m.startDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {isArabic ? 'الاستحقاق' : 'Due'}: {formatDateCairo(m.dueDate)}
                      </span>
                    </div>
                  </div>

                  {m.dependencies?.length > 0 && (
                    <div className="pt-2 border-t border-slate-700/50 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <GitBranch className="w-3 h-3 text-cyan-400" />
                        {isArabic ? 'يعتمد على:' : 'Depends on:'}
                      </span>
                      {m.dependencies.map((dep) => (
                        <span
                          key={dep.id}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
                        >
                          {dep.dependsOnMilestoneName} ({dep.dependsOnStatus})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Add Phase */}
      <AppModal
        open={showAddMilestone}
        onClose={() => !actionLoading && setShowAddMilestone(false)}
        title={t('addMilestone')}
        width="min(100%, 28rem)"
        closeDisabled={actionLoading}
        footer={
          <div className="space-y-2.5">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري حفظ المرحلة وتحديث الجدول الزمني…' : 'Saving milestone phase…'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddMilestone(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="milestone-create-form"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-l from-sky-500 to-cyan-400 text-white disabled:opacity-60"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {actionLoading ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : t('savePhase')}
              </button>
            </div>
          </div>
        }
      >
        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">{errorMsg}</div>
        )}

        <form id="milestone-create-form" onSubmit={handleCreateMilestone} className="space-y-3">
          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">{t('phaseNameLabel')} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={actionLoading}
              placeholder={
                isArabic ? 'مثال: توريد وتركيب كاميرات المراقبة' : 'e.g. CCTV Camera Installation'
              }
              className="field-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>

          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              {isArabic ? 'الوصف' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={actionLoading}
              className="field-input w-full px-3 py-2 rounded-xl text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-200 mb-1">{t('startDateLabel')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={actionLoading}
                className="field-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>
            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                {isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={actionLoading}
                className="field-input w-full px-3 py-2 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1">{t('milestoneWeight')}</label>
            <input
              type="number"
              min="1"
              max="100"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              disabled={actionLoading}
              className="field-input w-full px-3 py-2 rounded-xl text-sm"
            />
          </div>
        </form>
      </AppModal>

      {/* MODAL: Link prerequisite */}
      <AppModal
        open={showAddDep && !!targetMilestone}
        onClose={() => !actionLoading && setShowAddDep(false)}
        title={t('addDependency')}
        width="min(100%, 28rem)"
        closeDisabled={actionLoading}
        footer={
          <div className="space-y-2.5">
            <ActionLoadingBar
              active={actionLoading}
              isArabic={isArabic}
              label={isArabic ? 'جاري فحص العلاقات ومنع الحلقات وتأكيد الربط…' : 'Validating and linking phase…'}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDep(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 disabled:opacity-50"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="milestone-dep-form"
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-l from-sky-500 to-cyan-400 text-white disabled:opacity-60"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                {actionLoading
                  ? isArabic
                    ? 'جاري الفحص والربط…'
                    : 'Validating…'
                  : isArabic
                    ? 'تأكيد الربط'
                    : 'Confirm link'}
              </button>
            </div>
          </div>
        }
      >
        {targetMilestone && (
          <>
            <div className="mb-3 p-3 rounded-xl bg-sky-500/10 border border-cyan-400/30 text-cyan-200 text-xs text-start">
              {isArabic
                ? `ربط المرحلة "${targetMilestone.name}" بمرحلة تسبقها في التنفيذ. يتم فحص الروابط لمنع أي حلقات مغلقة.`
                : `Link "${targetMilestone.name}" to a prerequisite phase. Cycle detection is enforced.`}
            </div>

            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form id="milestone-dep-form" onSubmit={handleAddDependency} className="space-y-3">
              <div className="text-start">
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  {isArabic ? 'يعتمد على المرحلة:' : 'Depends on:'} *
                </label>
                <select
                  value={dependsOnId}
                  onChange={(e) => setDependsOnId(e.target.value)}
                  required
                  disabled={actionLoading}
                  className="field-input w-full px-3 py-2 rounded-xl text-sm"
                >
                  <option value="">{isArabic ? 'اختر المرحلة السابقة' : 'Select preceding phase'}</option>
                  {milestones
                    .filter((m) => m.id !== targetMilestone.id)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.status})
                      </option>
                    ))}
                </select>
              </div>
            </form>
          </>
        )}
      </AppModal>
    </div>
  );
};
