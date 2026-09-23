'use client';

import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Users,
  FolderGit2,
  MapPin,
  CheckSquare,
  FileText,
  BarChart2,
  RefreshCw,
  AlertTriangle,
  Lock,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { Team, TeamMember, TeamWorkload } from '@/types';
import { Language } from '@/lib/i18n';

interface TeamManagerHubTabProps {
  currentUser: any;
  lang: Language;
}

export const TeamManagerHubTab: React.FC<TeamManagerHubTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [scopeData, setScopeData] = useState<{
    team: Team;
    members: TeamMember[];
    assignedProjects: any[];
    assignedSites: any[];
    assignedTasks: any[];
    documents: any[];
    workload: TeamWorkload;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams]);

  useEffect(() => {
    if (selectedTeamId) {
      loadScopeData();
    }
  }, [selectedTeamId]);

  const loadTeams = async () => {
    try {
      const res = await organizationService.getTeams();
      if (res.success && res.data) {
        setTeams(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadScopeData = async () => {
    if (!selectedTeamId) return;
    setLoading(true);
    try {
      const res = await organizationService.getTeamManagerScope(selectedTeamId);
      if (res.success && res.data) {
        setScopeData(res.data);
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
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'بوابة مديري الفرق (Team Manager Scoped Operations)' : 'Team Manager Operations Hub'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'إدارة مهام ومشاريع ومستندات وأعباء الفريق المصرح بها دون تسرب لبيانات الأقسام الأخرى أو الحسابات (ORG-07)'
                : 'Scoped workspace for Team Managers with strict cross-department and accounting isolation'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>

          <button
            onClick={loadScopeData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Security Boundaries Alert */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Lock className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-200 block mb-0.5">
            {isArabic ? 'ضوابط وسياسات العزل الأمني لمدير الفريق (Security Boundary Rule):' : 'Manager Scope Policy:'}
          </span>
          <p>
            {isArabic
              ? 'يمتلك مدير الفريق حق مراقبة أعضاء فريقه ومشاريعهم ومواقعهم ومستنداتهم وتقييم ضغط العمل، ولا يملك الصلاحية الآلية للوصول لبيانات الحسابات أو تعديل أذونات النظام العامة أو حذف المستندات المعتمدة.'
              : 'Authorized for assigned projects, sites, and team workload only. Strictly prohibited from accessing unauthorized departments, accounting ledgers, or altering system authorization.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin me-2 text-sky-400" />
          <span>{isArabic ? 'جاري تحميل نطاق الفريق...' : 'Loading manager scope...'}</span>
        </div>
      ) : !scopeData ? (
        <div className="text-center p-12 text-slate-500 text-xs">
          {isArabic ? 'لا توجد بيانات متاحة لهذا الفريق' : 'No team scope data found'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Workload Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{isArabic ? 'مشاريع الفريق' : 'Assigned Projects'}</span>
                <FolderGit2 className="w-4 h-4 text-teal-400" />
              </div>
              <span className="text-2xl font-bold font-mono text-slate-100">
                {scopeData.assignedProjects.length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{isArabic ? 'المواقع الميدانية' : 'Assigned Sites'}</span>
                <MapPin className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="text-2xl font-bold font-mono text-slate-100">
                {scopeData.assignedSites.length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{isArabic ? 'أعضاء الفريق' : 'Team Members'}</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-2xl font-bold font-mono text-slate-100">
                {scopeData.members.length}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs">{isArabic ? 'مهام متأخرة' : 'Overdue Tasks'}</span>
                <Clock className="w-4 h-4 text-rose-400" />
              </div>
              <span className={`text-2xl font-bold font-mono ${scopeData.workload?.overdueTasks > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
                {scopeData.workload?.overdueTasks || 0}
              </span>
            </div>
          </div>

          {/* Members & Assigned Projects side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Members */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                <span>{isArabic ? 'أعضاء الفريق والمسؤوليات' : 'Team Members Roster'}</span>
                <span className="text-xs text-slate-400 font-mono">{scopeData.members.length}</span>
              </h4>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pe-1">
                {scopeData.members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-100 block">{m.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.userEmail}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {m.teamRole}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Projects */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="font-bold text-sm text-slate-100 flex items-center justify-between">
                <span>{isArabic ? 'المشاريع المسندة للفريق' : 'Assigned Projects'}</span>
                <span className="text-xs text-slate-400 font-mono">{scopeData.assignedProjects.length}</span>
              </h4>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pe-1">
                {scopeData.assignedProjects.length === 0 ? (
                  <p className="text-slate-500 text-xs py-8 text-center">
                    {isArabic ? 'لم يتم إسناد مشاريع لهذا الفريق بعد' : 'No projects assigned yet'}
                  </p>
                ) : (
                  scopeData.assignedProjects.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-100 block">{p.name}</span>
                        <span className="text-[10px] text-teal-400 font-mono">{p.code}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{p.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
