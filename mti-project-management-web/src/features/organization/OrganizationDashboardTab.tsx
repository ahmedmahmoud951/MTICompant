'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users2,
  Briefcase,
  UserCheck,
  FolderGit2,
  MapPin,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  RefreshCw,
  UserX,
  ListTodo,
  Clock,
  Layers,
  ShieldAlert,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { OrganizationDashboard, OrgDashboardWarning } from '@/types';
import { Language } from '@/lib/i18n';

interface OrganizationDashboardTabProps {
  currentUser: any;
  lang: Language;
}

export const OrganizationDashboardTab: React.FC<OrganizationDashboardTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [dashboard, setDashboard] = useState<OrganizationDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Critical' | 'Warning'>('All');
  const [activeUnassignedView, setActiveUnassignedView] = useState<'users' | 'projects' | 'sites' | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await organizationService.getOrganizationDashboard();
      if (res.success && res.data) {
        setDashboard(res.data);
      } else {
        setErrorMsg(res.message || (isArabic ? 'فشل تحميل لوحة معلومات المؤسسة' : 'Failed to load organization dashboard'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isArabic ? 'حدث خطأ أثناء تحميل البيانات' : 'An error occurred while loading data'));
    } finally {
      setLoading(false);
    }
  };

  const filteredWarnings = dashboard?.warnings.filter(w => {
    if (filterSeverity === 'All') return true;
    return w.severity === filterSeverity;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {isArabic ? 'لوحة مؤشرات الهيكل التنظيمي (UI-ORG-03)' : 'Organization Health Dashboard'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isArabic
              ? 'مراقبة شاملة للأقسام، فرق العمل، المشاريع، التعيينات، وتنبيهات النواقص التشغيلية الفورية.'
              : 'Comprehensive operational telemetry for departments, teams, projects, assignments, and structural gaps.'}
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {isArabic ? 'تحديث البيانات' : 'Refresh'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 text-sm flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Departments */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'الأقسام' : 'Departments'}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.departmentsCount ?? 0}</div>
          </div>
        </div>

        {/* Teams */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
            <Users2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'فرق العمل' : 'Teams'}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.teamsCount ?? 0}</div>
          </div>
        </div>

        {/* Managers */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'المدراء' : 'Managers'}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.managersCount ?? 0}</div>
          </div>
        </div>

        {/* Employees */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'الموظفين' : 'Employees'}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.employeesCount ?? 0}</div>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-violet-50 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 rounded-xl">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'المشاريع النشطة' : 'Active Projects'}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.activeProjectsCount ?? 0}</div>
          </div>
        </div>

        {/* Active Sites */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3.5">
          <div className="p-3 bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{isArabic ? 'المواقع النشطة' : 'Active Sites'}</div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{dashboard?.activeSitesCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Unassigned Quick Action Strips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unassigned Users */}
        <div
          onClick={() => setActiveUnassignedView(activeUnassignedView === 'users' ? null : 'users')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            (dashboard?.unassignedUsersCount ?? 0) > 0
              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/50'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isArabic ? 'مستخدمون بلا قسم أو فريق' : 'Unassigned Users'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {isArabic ? 'مستخدمين بحاجة لتعيين هيكلي' : 'Users without active team or department'}
                </div>
              </div>
            </div>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {dashboard?.unassignedUsersCount ?? 0}
            </span>
          </div>
        </div>

        {/* Unassigned Projects */}
        <div
          onClick={() => setActiveUnassignedView(activeUnassignedView === 'projects' ? null : 'projects')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            (dashboard?.unassignedProjectsCount ?? 0) > 0
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100/50'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isArabic ? 'مشاريع بلا فرق عمل' : 'Projects without Teams'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {isArabic ? 'مشاريع نشطة بدون فريق مسند' : 'Active projects with 0 teams'}
                </div>
              </div>
            </div>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {dashboard?.unassignedProjectsCount ?? 0}
            </span>
          </div>
        </div>

        {/* Unassigned Sites */}
        <div
          onClick={() => setActiveUnassignedView(activeUnassignedView === 'sites' ? null : 'sites')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            (dashboard?.unassignedSitesCount ?? 0) > 0
              ? 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/60 hover:bg-orange-100/50'
              : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isArabic ? 'مواقع بلا مهندسين' : 'Sites without Engineers'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {isArabic ? 'مواقع بدون مهندس مسؤول نشط' : 'Active sites with 0 engineers'}
                </div>
              </div>
            </div>
            <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {dashboard?.unassignedSitesCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Details Drawer if an unassigned card is clicked */}
      {activeUnassignedView && (
        <div className="bg-gray-50 dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              {activeUnassignedView === 'users' && (isArabic ? 'قائمة المستخدمين غير المسندين' : 'Unassigned Users List')}
              {activeUnassignedView === 'projects' && (isArabic ? 'قائمة المشاريع غير المسندة لفرق' : 'Unassigned Projects List')}
              {activeUnassignedView === 'sites' && (isArabic ? 'قائمة المواقع بدون مهندسين' : 'Unassigned Sites List')}
            </h3>
            <button
              onClick={() => setActiveUnassignedView(null)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
            {activeUnassignedView === 'users' &&
              dashboard?.unassignedUsers.map(u => (
                <div key={u.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <div className="font-semibold text-gray-900 dark:text-white">{u.fullName}</div>
                  <div className="text-gray-500 dark:text-gray-400 truncate">{u.email}</div>
                  {u.roleName && <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px]">{u.roleName}</span>}
                </div>
              ))}

            {activeUnassignedView === 'projects' &&
              dashboard?.unassignedProjects.map(p => (
                <div key={p.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <div className="font-semibold text-gray-900 dark:text-white">{p.name}</div>
                  <div className="text-gray-500 dark:text-gray-400 font-mono text-[10px]">{p.code}</div>
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 rounded text-[10px]">{p.status}</span>
                </div>
              ))}

            {activeUnassignedView === 'sites' &&
              dashboard?.unassignedSites.map(s => (
                <div key={s.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
                  <div className="font-semibold text-gray-900 dark:text-white">{s.name}</div>
                  <div className="text-gray-500 dark:text-gray-400 font-mono text-[10px]">{s.code}</div>
                  {s.projectName && <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">{s.projectName}</div>}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Warnings & Integrity Alerts Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {isArabic ? 'تنبيهات سلامة الهيكل التنظيمي (Structural Health Warnings)' : 'Organization Integrity Warnings'}
            </h3>
            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
              {dashboard?.warnings.length ?? 0}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400">{isArabic ? 'تصفية بالتصنيف:' : 'Filter:'}</span>
            {(['All', 'Critical', 'Warning'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterSeverity === sev
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {sev === 'All' ? (isArabic ? 'الكل' : 'All') : sev === 'Critical' ? (isArabic ? 'حرج' : 'Critical') : (isArabic ? 'تحذير' : 'Warning')}
              </button>
            ))}
          </div>
        </div>

        {filteredWarnings.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <span>{isArabic ? 'لا توجد تنبيهات هيكلية حالياً. الهيكل التنظيمي سليم بنسبة 100%!' : 'No organizational gaps detected. Organization hierarchy is fully integrated!'}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredWarnings.map((w, idx) => {
              const isCrit = w.severity === 'Critical';
              return (
                <div
                  key={`${w.code}-${idx}`}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    isCrit
                      ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isCrit ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'
                    }`}
                  >
                    {isCrit ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{w.title}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCrit
                            ? 'bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                            : 'bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                        }`}
                      >
                        {w.affectedCount} {isArabic ? 'عنصر متأثر' : 'affected'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{w.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Team Cards Grid (PROMPT UI-ORG-03) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {isArabic ? 'بطاقات فرق العمل التشغيلية (Team Cards)' : 'Operational Team Cards'}
            </h3>
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
              {dashboard?.teamCards.length ?? 0}
            </span>
          </div>
        </div>

        {(!dashboard?.teamCards || dashboard.teamCards.length === 0) ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
            {isArabic ? 'لم يتم العثور على فرق عمل مسجلة' : 'No teams found.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.teamCards.map(team => (
              <div
                key={team.id}
                className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  {/* Team Header */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-base text-gray-900 dark:text-white">{team.name}</h4>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                        {team.departmentName}
                      </div>
                    </div>
                    {team.code && (
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-mono rounded">
                        {team.code}
                      </span>
                    )}
                  </div>

                  {/* Manager info */}
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 flex items-center gap-1.5">
                    <span className="text-gray-400">{isArabic ? 'المسؤول:' : 'Manager:'}</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {team.managerName || (isArabic ? 'غير محدد' : 'Unassigned')}
                    </span>
                  </div>

                  <hr className="my-3 border-gray-100 dark:border-gray-700" />

                  {/* Team Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-gray-400">{isArabic ? 'الأعضاء' : 'Members'}</div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{team.membersCount}</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-gray-400">{isArabic ? 'المشاريع' : 'Projects'}</div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{team.projectsCount}</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-gray-400">{isArabic ? 'المواقع' : 'Sites'}</div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{team.sitesCount}</div>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-gray-400">{isArabic ? 'مهام مفتوحة' : 'Open Tasks'}</div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{team.openTasksCount}</div>
                    </div>
                  </div>
                </div>

                {/* Overdue Task alert pill */}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {isArabic ? 'مهام متأخرة:' : 'Overdue Tasks:'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      team.overdueTasksCount > 0
                        ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {team.overdueTasksCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
