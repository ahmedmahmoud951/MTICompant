'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Briefcase,
  AlertOctagon,
  Clock,
  CheckCircle,
  FolderGit2,
  RefreshCw,
  Building,
  Calendar,
  Layers,
  Flame
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { UserWorkload, TeamWorkload, ProjectWorkload, Department } from '@/types';
import { Language } from '@/lib/i18n';

interface WorkloadTabProps {
  currentUser: any;
  lang: Language;
}

export const WorkloadTab: React.FC<WorkloadTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [viewMode, setViewMode] = useState<'users' | 'teams' | 'projects'>('users');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  const [userWorkloads, setUserWorkloads] = useState<UserWorkload[]>([]);
  const [teamWorkloads, setTeamWorkloads] = useState<TeamWorkload[]>([]);
  const [projectWorkloads, setProjectWorkloads] = useState<ProjectWorkload[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadData();
  }, [viewMode, selectedDeptId]);

  const loadDepartments = async () => {
    try {
      const res = await organizationService.getDepartments();
      if (res.success && res.data) setDepartments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (viewMode === 'users') {
        const res = await organizationService.getUsersWorkload(selectedDeptId || undefined);
        if (res.success && res.data) setUserWorkloads(res.data);
      } else if (viewMode === 'teams') {
        const res = await organizationService.getTeamsWorkload(selectedDeptId || undefined);
        if (res.success && res.data) setTeamWorkloads(res.data);
      } else {
        const res = await organizationService.getProjectsWorkload();
        if (res.success && res.data) setProjectWorkloads(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'إدارة ضغط وحجم العمل (Workload Visibility)' : 'Workload Capacity & Visibility'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'متابعة أعباء المهام والمشاريع المفتوحة والمتأخرة لكل مهندس وفريق ومشروع لاتخاذ قرارات التوزيع العادل'
                : 'Monitor active projects, sites, open & overdue tasks, and deadlines across users, teams, and projects'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => setViewMode('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'users'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isArabic ? 'المهندسين' : 'Users'}</span>
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'teams'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{isArabic ? 'الفرق' : 'Teams'}</span>
            </button>
            <button
              onClick={() => setViewMode('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'projects'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'المشاريع' : 'Projects'}</span>
            </button>
          </div>

          {viewMode !== 'projects' && (
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
            >
              <option value="">{isArabic ? 'جميع الأقسام' : 'All Departments'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin me-2 text-amber-400" />
          <span>{isArabic ? 'جاري حساب مؤشرات ضغط العمل...' : 'Calculating workload metrics...'}</span>
        </div>
      ) : viewMode === 'users' ? (
        /* Users Workload Table */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 font-semibold">
                <tr>
                  <th className="p-3 text-start">{isArabic ? 'المهندس / المستخدم' : 'Engineer / User'}</th>
                  <th className="p-3 text-start">{isArabic ? 'القسم' : 'Department'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مشاريع نشطة' : 'Active Proj'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مواقع نشطة' : 'Active Sites'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مهام مفتوحة' : 'Open Tasks'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مهام متأخرة' : 'Overdue Tasks'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مواعيد قريبة' : 'Upcoming'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مهام منجزة' : 'Completed'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مؤشر الضغط' : 'Capacity Index'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {userWorkloads.map((u) => {
                  const isHighLoad = u.overdueTasks > 0 || u.openTasks > 5;
                  return (
                    <tr key={u.userId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-slate-100 block">{u.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{u.email}</span>
                      </td>
                      <td className="p-3 text-slate-300">{u.departmentName || '—'}</td>
                      <td className="p-3 text-center font-mono font-bold text-teal-400">{u.activeProjects}</td>
                      <td className="p-3 text-center font-mono font-bold text-cyan-400">{u.activeSites}</td>
                      <td className="p-3 text-center font-mono font-bold text-blue-400">{u.openTasks}</td>
                      <td className="p-3 text-center font-mono">
                        {u.overdueTasks > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <AlertOctagon className="w-3 h-3" />
                            <span>{u.overdueTasks}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-amber-400 font-bold">{u.upcomingDeadlines}</td>
                      <td className="p-3 text-center font-mono text-emerald-400 font-bold">{u.completedTasks}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            u.overdueTasks > 0
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : isHighLoad
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.overdueTasks > 0
                            ? isArabic
                              ? 'حرج (متأخر)'
                              : 'Critical'
                            : isHighLoad
                            ? isArabic
                              ? 'مرتفع'
                              : 'High'
                            : isArabic
                            ? 'معتدل'
                            : 'Optimal'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'teams' ? (
        /* Teams Workload Table */
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 font-semibold">
                <tr>
                  <th className="p-3 text-start">{isArabic ? 'فريق العمل' : 'Team'}</th>
                  <th className="p-3 text-start">{isArabic ? 'مدير الفريق' : 'Manager'}</th>
                  <th className="p-3 text-center">{isArabic ? 'الأعضاء' : 'Members'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مشاريع نشطة' : 'Active Proj'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مواقع نشطة' : 'Active Sites'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مهام مفتوحة' : 'Open Tasks'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مهام متأخرة' : 'Overdue'}</th>
                  <th className="p-3 text-center">{isArabic ? 'مهام منجزة' : 'Completed'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {teamWorkloads.map((t) => (
                  <tr key={t.teamId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-slate-100 block">{t.teamName}</span>
                      <span className="text-[10px] text-teal-400 font-mono">{t.teamCode}</span>
                    </td>
                    <td className="p-3 text-slate-300">{t.managerName || '—'}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-300">{t.membersCount}</td>
                    <td className="p-3 text-center font-mono font-bold text-teal-400">{t.activeProjects}</td>
                    <td className="p-3 text-center font-mono font-bold text-cyan-400">{t.activeSites}</td>
                    <td className="p-3 text-center font-mono font-bold text-blue-400">{t.openTasks}</td>
                    <td className="p-3 text-center font-mono">
                      {t.overdueTasks > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {t.overdueTasks}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-400 font-bold">{t.completedTasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Projects Workload Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectWorkloads.map((p) => (
            <div
              key={p.projectId}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {p.projectCode}
                </span>
                <span className="text-xs font-semibold text-slate-400">{p.status}</span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-100">{p.projectName}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{p.membersCount} {isArabic ? 'مهندس' : 'engineers'}</span>
                  <span>•</span>
                  <span>{p.teamsCount} {isArabic ? 'فريق' : 'teams'}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-400">{isArabic ? 'نسبة إنجاز المهام' : 'Completion'}</span>
                  <span className="text-emerald-400 font-bold">{p.completionPercentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, p.completionPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div className="p-2 rounded-xl bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">{isArabic ? 'إجمالي' : 'Total'}</span>
                  <span className="font-mono font-bold text-slate-200">{p.totalTasks}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">{isArabic ? 'مفتوحة' : 'Open'}</span>
                  <span className="font-mono font-bold text-blue-400">{p.openTasks}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/40">
                  <span className="text-[10px] text-slate-400 block">{isArabic ? 'متأخرة' : 'Overdue'}</span>
                  <span className={`font-mono font-bold ${p.overdueTasks > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {p.overdueTasks}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
