'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserX,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  RefreshCw,
  FolderGit2,
  MapPin,
  Users,
  ShieldCheck,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { usersAdminService } from '@/services/users-admin.service';
import { projectService, siteService } from '@/services/project.service';
import { Delegation, AdminUserDetail, Project, Site, Team } from '@/types';
import { Language } from '@/lib/i18n';

interface DelegationsTabProps {
  currentUser: any;
  lang: Language;
}

export const DelegationsTab: React.FC<DelegationsTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [delegateUserId, setDelegateUserId] = useState('');
  const [scopeType, setScopeType] = useState<'Global' | 'Project' | 'Site' | 'Team'>('Project');
  const [scopeId, setScopeId] = useState('');
  const [permissions, setPermissions] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadDelegations();
    loadLookups();
  }, [activeOnly]);

  const loadDelegations = async () => {
    setLoading(true);
    try {
      const res = await organizationService.getDelegations(undefined, activeOnly);
      if (res.success && res.data) {
        setDelegations(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [uRes, pRes, sRes, tRes] = await Promise.all([
        usersAdminService.getUsers({ pageSize: 100 }),
        projectService.getProjects({ pageSize: 100 }),
        siteService.getAllSites(),
        organizationService.getTeams()
      ]);
      if (uRes.success && uRes.data) setUsers(uRes.data);
      if (pRes.success && pRes.data?.items) setProjects(pRes.data.items);
      if (sRes.success && sRes.data) setSites(sRes.data);
      if (tRes.success && tRes.data) setTeams(tRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !delegateUserId || !startAt || !endAt) return;

    if (userId === delegateUserId) {
      setErrorMsg(isArabic ? 'لا يمكن تفويض المستخدم لنفسه' : 'Cannot delegate to the same user');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await organizationService.createDelegation({
        userId,
        delegateUserId,
        scopeType,
        scopeId: scopeId || undefined,
        permissions: permissions || undefined,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString()
      });

      if (res.success) {
        setShowCreateModal(false);
        resetForm();
        loadDelegations();
      } else {
        setErrorMsg(res.message || 'Failed to create delegation');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating delegation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من إلغاء هذا التفويض فوراً؟' : 'Are you sure you want to revoke this delegation immediately?')) return;
    try {
      const res = await organizationService.revokeDelegation(id);
      if (res.success) {
        loadDelegations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setUserId(users[0]?.id || '');
    setDelegateUserId(users[1]?.id || '');
    setScopeType('Project');
    setScopeId(projects[0]?.id || '');
    setPermissions('');
    const now = new Date();
    setStartAt(now.toISOString().slice(0, 16));
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEndAt(nextWeek.toISOString().slice(0, 16));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'التفويض المؤقت للمسؤوليات (Responsibility Delegation)' : 'Temporary Responsibility Delegation'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'تفويض صلاحيات مؤقتة (مثل تعيين مدير مشروع بديل أثناء الإجازات) تنتهي صلاحيتها آلياً دون تغيير الدور الدائم للمستخدم'
                : 'Assign temporary backup responsibilities with automatic expiry without permanent role alterations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-violet-500 focus:ring-0"
            />
            <span>{isArabic ? 'السارية فقط' : 'Active only'}</span>
          </label>

          <button
            onClick={() => {
              resetForm();
              setErrorMsg('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-500 text-white hover:bg-violet-400 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إنشاء تفويض جديد' : 'New Delegation'}</span>
          </button>

          <button
            onClick={loadDelegations}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Delegations List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin me-2 text-violet-400" />
            <span>{isArabic ? 'جاري تحميل التفويضات...' : 'Loading delegations...'}</span>
          </div>
        ) : delegations.length === 0 ? (
          <div className="text-center p-12 text-slate-500 text-xs">
            {isArabic ? 'لا توجد تفويضات مسجلة حالياً' : 'No responsibility delegations found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 font-semibold">
                <tr>
                  <th className="p-3 text-start">{isArabic ? 'المسؤول الأصيل' : 'Original User'}</th>
                  <th className="p-3 text-start">{isArabic ? 'المفوَّض له (البديل)' : 'Delegate (Backup)'}</th>
                  <th className="p-3 text-start">{isArabic ? 'نطاق التفويض' : 'Scope'}</th>
                  <th className="p-3 text-start">{isArabic ? 'تاريخ البدء والانتهاء' : 'Duration'}</th>
                  <th className="p-3 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-end">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {delegations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-slate-100 block">{d.userName}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 font-bold text-violet-300">
                        <ShieldCheck className="w-4 h-4 text-violet-400" />
                        <span>{d.delegateUserName}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        <span>{d.scopeType}:</span>
                        <strong className="text-slate-100">{d.scopeName || 'All'}</strong>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-[11px] text-slate-300">
                        <div>
                          {isArabic ? 'من:' : 'From:'} {new Date(d.startAt).toLocaleDateString()}
                        </div>
                        <div className={d.isExpired ? 'text-rose-400' : 'text-emerald-400'}>
                          {isArabic ? 'إلى:' : 'To:'} {new Date(d.endAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          !d.isActive
                            ? 'bg-slate-800 text-slate-500 border border-slate-700'
                            : d.isExpired
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {!d.isActive
                          ? isArabic
                            ? 'ملغى'
                            : 'Revoked'
                          : d.isExpired
                          ? isArabic
                            ? 'منتهي الصلاحية'
                            : 'Expired'
                          : isArabic
                          ? 'ساري المفعول'
                          : 'Active'}
                      </span>
                    </td>
                    <td className="p-3 text-end">
                      {d.isActive && !d.isExpired && (
                        <button
                          onClick={() => handleRevoke(d.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                        >
                          {isArabic ? 'إلغاء التفويض' : 'Revoke'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Delegation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-100">
              {isArabic ? 'إنشاء تفويض صلاحية مؤقت' : 'Create Temporary Delegation'}
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateDelegation} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'المسؤول الأصلي (صاحب الصلاحية)' : 'Original User'}
                </label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.jobTitle || u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'المفوَّض له (المسؤول البديل)' : 'Delegate User (Backup)'}
                </label>
                <select
                  value={delegateUserId}
                  onChange={(e) => setDelegateUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.jobTitle || u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'نوع النطاق' : 'Scope Type'}
                  </label>
                  <select
                    value={scopeType}
                    onChange={(e) => setScopeType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  >
                    <option value="Project">{isArabic ? 'مشروع محدد' : 'Project'}</option>
                    <option value="Site">{isArabic ? 'موقع محدد' : 'Site'}</option>
                    <option value="Team">{isArabic ? 'فريق محدد' : 'Team'}</option>
                    <option value="Global">{isArabic ? 'شامل (Global)' : 'Global'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'الهدف / المورد' : 'Target Resource'}
                  </label>
                  {scopeType === 'Project' ? (
                    <select
                      value={scopeId}
                      onChange={(e) => setScopeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  ) : scopeType === 'Site' ? (
                    <select
                      value={scopeId}
                      onChange={(e) => setScopeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : scopeType === 'Team' ? (
                    <select
                      value={scopeId}
                      onChange={(e) => setScopeId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled
                      placeholder="All scopes"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-700 text-slate-500 text-xs"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'تاريخ وساعة البدء' : 'Start Date & Time'}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'تاريخ وساعة الانتهاء' : 'End Date & Time'}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-500 text-white hover:bg-violet-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isArabic ? 'تأكيد التفويض' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
