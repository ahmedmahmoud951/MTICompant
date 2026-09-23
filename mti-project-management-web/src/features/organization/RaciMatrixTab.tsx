'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Plus,
  Trash2,
  RefreshCw,
  Building,
  CheckCircle2,
  FolderGit2,
  MapPin,
  User as UserIcon,
  Users as UsersIcon,
  HelpCircle
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { projectService, siteService } from '@/services/project.service';
import { usersAdminService } from '@/services/users-admin.service';
import {
  RaciMatrix,
  ResourceResponsibility,
  ResponsibilityType,
  Project,
  Site,
  AdminUserDetail,
  Team
} from '@/types';
import { Language } from '@/lib/i18n';

interface RaciMatrixTabProps {
  currentUser: any;
  lang: Language;
}

export const RaciMatrixTab: React.FC<RaciMatrixTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [resourceType, setResourceType] = useState<'Project' | 'Site'>('Project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [matrix, setMatrix] = useState<RaciMatrix | null>(null);
  const [loading, setLoading] = useState(false);

  // Users & Teams for assignment modal
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState<ResponsibilityType>('Responsible');
  const [assigneeType, setAssigneeType] = useState<'User' | 'Team'>('User');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadResources();
    loadAssignees();
  }, []);

  useEffect(() => {
    if (resourceType === 'Project' && projects.length > 0 && !selectedResourceId) {
      setSelectedResourceId(projects[0].id);
    } else if (resourceType === 'Site' && sites.length > 0 && !selectedResourceId) {
      setSelectedResourceId(sites[0].id);
    }
  }, [resourceType, projects, sites]);

  useEffect(() => {
    if (selectedResourceId) {
      loadMatrix();
    }
  }, [selectedResourceId, resourceType]);

  const loadResources = async () => {
    try {
      const projRes = await projectService.getProjects({ pageSize: 100 });
      if (projRes.success && projRes.data?.items) {
        setProjects(projRes.data.items);
        if (projRes.data.items.length > 0 && !selectedResourceId) {
          setSelectedResourceId(projRes.data.items[0].id);
        }
      }
      const siteRes = await siteService.getAllSites();
      if (siteRes.success && siteRes.data) {
        setSites(siteRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssignees = async () => {
    try {
      const [uRes, tRes] = await Promise.all([
        usersAdminService.getUsers({ pageSize: 100 }),
        organizationService.getTeams()
      ]);
      if (uRes.success && uRes.data) setUsers(uRes.data);
      if (tRes.success && tRes.data) setTeams(tRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMatrix = async () => {
    if (!selectedResourceId) return;
    setLoading(true);
    try {
      const res = await organizationService.getRaciMatrix(resourceType, selectedResourceId);
      if (res.success && res.data) {
        setMatrix(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceId || !assigneeId) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await organizationService.assignResponsibility({
        resourceType,
        resourceId: selectedResourceId,
        userId: assigneeType === 'User' ? assigneeId : undefined,
        teamId: assigneeType === 'Team' ? assigneeId : undefined,
        responsibilityType: selectedType
      });

      if (res.success) {
        setShowAddModal(false);
        setAssigneeId('');
        loadMatrix();
      } else {
        setErrorMsg(res.message || 'Failed to assign responsibility');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error assigning responsibility');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من إزالة هذا التعيين؟' : 'Are you sure you want to remove this assignment?')) return;
    try {
      const res = await organizationService.removeResponsibility(id);
      if (res.success) {
        loadMatrix();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const columns: {
    type: ResponsibilityType;
    titleEn: string;
    titleAr: string;
    descEn: string;
    descAr: string;
    badgeClass: string;
    borderClass: string;
  }[] = [
    {
      type: 'Responsible',
      titleEn: 'Responsible (R)',
      titleAr: 'المسؤول المباشر (R)',
      descEn: 'The doer who completes the work or activity',
      descAr: 'المنفذ الفعلي للأعمال والمهمات الميدانية',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      borderClass: 'border-emerald-500/30'
    },
    {
      type: 'Accountable',
      titleEn: 'Accountable (A)',
      titleAr: 'المساءل النهائي (A)',
      descEn: 'The decision maker answerable for final outcome',
      descAr: 'صاحب القرار النهائي والمسؤول عن النتيجة والموافقة',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      borderClass: 'border-blue-500/30'
    },
    {
      type: 'Consulted',
      titleEn: 'Consulted (C)',
      titleAr: 'المستشار الفني (C)',
      descEn: 'Two-way consultation for expert technical input',
      descAr: 'الجهة الاستشارية (المكتب الفني / الخبراء) قبل القرار',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      borderClass: 'border-amber-500/30'
    },
    {
      type: 'Informed',
      titleEn: 'Informed (I)',
      titleAr: 'المُبلّغ بالنتائج (I)',
      descEn: 'Kept updated on progress and completed milestones',
      descAr: 'المطلع على مجريات ومستجدات العمل (الحسابات / الإدارة)',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      borderClass: 'border-purple-500/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'مصفوفة المسؤوليات RACI' : 'RACI Responsibility Matrix'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'توزيع الصلاحيات والمسؤوليات (المسؤول، المساءل، المستشار، المبلّغ) لكل مشروع وموقع'
                : 'Define Responsible, Accountable, Consulted, and Informed stakeholders per resource'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Resource Type toggle */}
          <div className="flex rounded-xl bg-slate-800/90 p-1 border border-slate-700">
            <button
              onClick={() => {
                setResourceType('Project');
                if (projects.length > 0) setSelectedResourceId(projects[0].id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                resourceType === 'Project'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'المشاريع' : 'Projects'}</span>
            </button>
            <button
              onClick={() => {
                setResourceType('Site');
                if (sites.length > 0) setSelectedResourceId(sites[0].id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                resourceType === 'Site'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isArabic ? 'المواقع' : 'Sites'}</span>
            </button>
          </div>

          {/* Resource Selector */}
          <select
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {resourceType === 'Project'
              ? projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))
              : sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
          </select>

          <button
            onClick={() => {
              setErrorMsg('');
              setAssigneeId(users[0]?.id || '');
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{isArabic ? 'إسناد مسؤولية' : 'Assign RACI'}</span>
          </button>

          <button
            onClick={loadMatrix}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* RACI Columns Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin me-2 text-teal-400" />
          <span>{isArabic ? 'جاري تحميل مصفوفة المسؤوليات...' : 'Loading RACI matrix...'}</span>
        </div>
      ) : !matrix ? (
        <div className="text-center p-12 bg-slate-800/40 rounded-2xl border border-slate-700/60">
          <HelpCircle className="w-10 h-10 mx-auto text-slate-500 mb-2" />
          <p className="text-sm text-slate-300">{isArabic ? 'يرجى اختيار مورد لعرض المصفوفة' : 'Select a resource to view matrix'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((col) => {
            let items: ResourceResponsibility[] = [];
            if (col.type === 'Responsible') items = matrix.responsible || [];
            else if (col.type === 'Accountable') items = matrix.accountable || [];
            else if (col.type === 'Consulted') items = matrix.consulted || [];
            else if (col.type === 'Informed') items = matrix.informed || [];

            return (
              <div
                key={col.type}
                className={`flex flex-col rounded-2xl bg-slate-800/40 border ${col.borderClass} p-4 space-y-3 backdrop-blur-md shadow-lg`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${col.badgeClass}`}>
                      {isArabic ? col.titleAr : col.titleEn}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                      {isArabic ? col.descAr : col.descEn}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>

                {/* Items */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[380px] pe-1">
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      {isArabic ? 'لا توجد تعيينات محددة' : 'No stakeholders assigned'}
                    </div>
                  ) : (
                    items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-slate-700/60 text-slate-300">
                            {item.userId ? <UserIcon className="w-3.5 h-3.5" /> : <UsersIcon className="w-3.5 h-3.5" />}
                          </div>
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-slate-100 truncate">
                              {item.userId ? item.userName || 'User' : item.teamName || 'Team'}
                            </h5>
                            <p className="text-[10px] text-slate-400 font-mono truncate">
                              {item.userId ? item.userEmail : isArabic ? 'فريق عمل كامل' : 'Full Team'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemove(item.id)}
                          title={isArabic ? 'إزالة' : 'Remove'}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedType(col.type);
                    setErrorMsg('');
                    setAssigneeId(users[0]?.id || '');
                    setShowAddModal(true);
                  }}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إضافة' : 'Add'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add RACI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-100">
              {isArabic ? 'إسناد مسؤولية RACI' : 'Assign RACI Stakeholder'}
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'نوع المسؤولية' : 'Responsibility Type'}
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ResponsibilityType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                >
                  <option value="Responsible">Responsible (R) - منفذ مباشر</option>
                  <option value="Accountable">Accountable (A) - مساءل نهائي</option>
                  <option value="Consulted">Consulted (C) - مستشار فني</option>
                  <option value="Informed">Informed (I) - مُبلّغ بالنتائج</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'التعيين إلى' : 'Assign To'}
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeType('User');
                      setAssigneeId(users[0]?.id || '');
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold ${
                      assigneeType === 'User'
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isArabic ? 'مستخدم فردي' : 'Individual User'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssigneeType('Team');
                      setAssigneeId(teams[0]?.id || '');
                    }}
                    className={`py-1.5 rounded-lg text-xs font-semibold ${
                      assigneeType === 'Team'
                        ? 'bg-teal-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isArabic ? 'فريق عمل' : 'Work Team'}
                  </button>
                </div>

                {assigneeType === 'User' ? (
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.email}) - {u.jobTitle || 'Staff'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !assigneeId}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isArabic ? 'تأكيد التعيين' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
