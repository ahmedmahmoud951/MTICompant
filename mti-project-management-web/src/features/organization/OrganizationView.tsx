'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Plus,
  Shield,
  UserPlus,
  Trash2,
  RefreshCw,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Database,
  BarChart3,
  UserCheck,
  FolderGit2,
  MapPin,
  ShieldAlert,
  LayoutDashboard,
  KeyRound,
  History,
  Settings
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { Department, Team, TeamMember, User } from '@/types';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';

import { RaciMatrixTab } from './RaciMatrixTab';
import { MasterDataCenterTab } from './MasterDataCenterTab';
import { UserAdminTab } from './UserAdminTab';
import { BatchAssignmentTab } from './BatchAssignmentTab';
import { TeamManagerHubTab } from './TeamManagerHubTab';
import { WorkloadTab } from './WorkloadTab';
import { DelegationsTab } from './DelegationsTab';
import { OrganizationDashboardTab } from './OrganizationDashboardTab';
import { PermissionsManagerTab } from './PermissionsManagerTab';
import { AssignmentHistoryTab } from './AssignmentHistoryTab';
import { AdminSystemSettingsTab } from './AdminSystemSettingsTab';

interface OrganizationViewProps {
  currentUser: User | null;
  lang: Language;
  initialSubTab?: OrgSubTab;
}

export type OrgSubTab =
  | 'dashboard'
  | 'structure'
  | 'raci'
  | 'master-data'
  | 'users'
  | 'permissions'
  | 'batch-assignments'
  | 'assignment-history'
  | 'team-manager'
  | 'workload'
  | 'delegations'
  | 'system-settings';

export const OrganizationView: React.FC<OrganizationViewProps> = ({ currentUser, lang, initialSubTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<OrgSubTab>(initialSubTab || 'dashboard');

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modals
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamDeptId, setNewTeamDeptId] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = (k: any) => getTranslation(k, lang);
  const isArabic = lang === 'ar';
  const isAdmin = currentUser?.roles?.some(r => r === 'Admin' || r === 'SystemAdmin' || r === 'SuperAdmin');

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadTeams(selectedDeptId || undefined);
  }, [selectedDeptId]);

  const loadDepartments = async () => {
    try {
      const res = await organizationService.getDepartments();
      if (res.success && res.data) {
        setDepartments(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTeams = async (deptId?: string) => {
    setLoading(true);
    try {
      const res = await organizationService.getTeams(deptId);
      if (res.success && res.data) {
        setTeams(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (team: Team) => {
    setSelectedTeam(team);
    setLoadingMembers(true);
    try {
      const res = await organizationService.getTeamMembers(team.id);
      if (res.success && res.data) {
        setTeamMembers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamDeptId || !newTeamCode || !newTeamName) return;

    setActionLoading(true);
    setErrorMsg('');

    try {
      const res = await organizationService.createTeam({
        departmentId: newTeamDeptId,
        code: newTeamCode,
        name: newTeamName,
        description: newTeamDesc
      });

      if (res.success) {
        setShowAddTeamModal(false);
        setNewTeamCode('');
        setNewTeamName('');
        setNewTeamDesc('');
        loadTeams(selectedDeptId || undefined);
      } else {
        setErrorMsg(res.message || 'Failed to create team');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create team');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation SubTabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>{isArabic ? 'لوحة المؤشرات العامة' : 'Dashboard'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('structure')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'structure'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>{isArabic ? 'الهيكل التنظيمي والفرق' : 'Structure & Teams'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('raci')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'raci'
              ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isArabic ? 'مصفوفة RACI' : 'RACI Matrix'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('master-data')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'master-data'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{isArabic ? 'مركز البيانات الأساسية' : 'Master Data Center'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'users'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isArabic ? 'إدارة المستخدمين' : 'User Administration'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('permissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'permissions'
              ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>{isArabic ? 'إدارة الصلاحيات' : 'Permissions & Scopes'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('batch-assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'batch-assignments'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>{isArabic ? 'التعيين الجماعي' : 'Batch Assignments'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('assignment-history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'assignment-history'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{isArabic ? 'سجل التعيينات' : 'Assignment History'}</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab('system-settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeSubTab === 'system-settings'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isArabic ? 'إعدادات النظام' : 'System Settings'}</span>
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('team-manager')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'team-manager'
              ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{isArabic ? 'لوحة مدير الفريق' : 'Team Manager Hub'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('workload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'workload'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{isArabic ? 'مؤشرات ضغط العمل' : 'Workload'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('delegations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeSubTab === 'delegations'
              ? 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{isArabic ? 'التفويض المؤقت' : 'Delegations'}</span>
        </button>
      </div>

      {/* SubTab Views */}
      {activeSubTab === 'dashboard' && (
        <OrganizationDashboardTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'permissions' && (
        <PermissionsManagerTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'assignment-history' && (
        <AssignmentHistoryTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'raci' && (
        <RaciMatrixTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'master-data' && (
        <MasterDataCenterTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'users' && (
        <UserAdminTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'batch-assignments' && (
        <BatchAssignmentTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'team-manager' && (
        <TeamManagerHubTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'workload' && (
        <WorkloadTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'delegations' && (
        <DelegationsTab currentUser={currentUser} lang={lang} />
      )}

      {activeSubTab === 'system-settings' && (
        <AdminSystemSettingsTab lang={lang} />
      )}

      {activeSubTab === 'structure' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-800/80 to-slate-900/90 border border-slate-700/60 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">{t('organizationTitle')}</h2>
                <p className="text-xs text-slate-400">{t('organizationSubtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    setErrorMsg('');
                    setNewTeamDeptId(selectedDeptId || departments[0]?.id || '');
                    setShowAddTeamModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all shadow-lg shadow-teal-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('addTeam')}</span>
                </button>
              )}

              <button
                onClick={() => loadTeams(selectedDeptId || undefined)}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Departments Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedDeptId('')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                !selectedDeptId
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {isArabic ? 'جميع الأقسام' : 'All Departments'}
            </button>
            {departments.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDeptId(d.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedDeptId === d.id
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* Teams Grid and Team Details Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Teams List */}
        <div className={`${selectedTeam ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin me-2" />
              <span>{isArabic ? 'جاري تحميل الفرق...' : 'Loading teams...'}</span>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center p-12 rounded-2xl border border-dashed border-slate-700/60 bg-slate-800/30">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">{isArabic ? 'لا توجد فرق عمل مسجلة بعد' : 'No teams found'}</h4>
              <p className="text-xs text-slate-500 mt-1">{isArabic ? 'يمكنك إضافة الفرق الهندسية وتعيين المهندسين لها' : 'Create teams and assign members'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map((team) => {
                const isSelected = selectedTeam?.id === team.id;
                return (
                  <div
                    key={team.id}
                    onClick={() => handleSelectTeam(team)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-slate-800/95 border-teal-500/60 shadow-lg shadow-teal-500/5'
                        : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/40">
                        {team.code}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {team.departmentName}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-100">{team.name}</h4>
                    {team.description && <p className="text-xs text-slate-400 line-clamp-2">{team.description}</p>}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs text-slate-400">
                      <span>
                        {t('teamLeader')}: <strong className="text-slate-200">{team.managerUserName || '—'}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] text-slate-300">
                        {team.membersCount} {isArabic ? 'أعضاء' : 'members'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Team Members Pane */}
        {selectedTeam && (
          <div className="lg:col-span-5 space-y-4 p-5 rounded-2xl bg-slate-800/80 border border-slate-700 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div>
                <span className="font-mono text-xs font-bold text-teal-400">{selectedTeam.code}</span>
                <h3 className="text-base font-bold text-slate-100">{selectedTeam.name}</h3>
                <span className="text-xs text-slate-400">
                  {selectedTeam.departmentName}
                </span>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="text-slate-400 hover:text-slate-100">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                  <span>{t('teamMembers')}</span>
                </h4>
              </div>

              {loadingMembers ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />
                  <span>{isArabic ? 'جاري تحميل الأعضاء...' : 'Loading members...'}</span>
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  {isArabic ? 'لا يوجد أعضاء في هذا الفريق بعد' : 'No members in this team yet'}
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {teamMembers.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/60 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{m.userName}</div>
                        <div className="text-[11px] text-slate-400">{m.userEmail}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        {m.teamRole}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Add Team */}
      {showAddTeamModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-panel max-w-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold text-slate-100">{t('addTeam')}</h3>
              <button onClick={() => setShowAddTeamModal(false)} className="text-slate-400 hover:text-slate-100">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateTeam} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{t('departments')} *</label>
                <select
                  value={newTeamDeptId}
                  onChange={(e) => setNewTeamDeptId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200"
                >
                  <option value="">{isArabic ? 'اختر القسم' : 'Select Department'}</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'كود الفريق' : 'Team Code'} *</label>
                <input
                  type="text"
                  value={newTeamCode}
                  onChange={(e) => setNewTeamCode(e.target.value)}
                  required
                  placeholder="e.g. TM-SOFT-01"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'اسم الفريق' : 'Team Name'} *</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  required
                  placeholder={isArabic ? 'مثال: فريق تطوير البنية التحتية والشبكات' : 'e.g. Infrastructure & Networking Team'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">{isArabic ? 'الوصف' : 'Description'}</label>
                <textarea
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-200"
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-700/60">
                <ActionLoadingBar
                  active={actionLoading}
                  isArabic={isArabic}
                  label={isArabic ? 'جاري حفظ الفريق الجديد…' : 'Saving team…'}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTeamModal(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                  >
                    {isArabic ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-60 transition-all shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  >
                    {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                    {actionLoading ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : (isArabic ? 'حفظ الفريق' : 'Save')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
};
