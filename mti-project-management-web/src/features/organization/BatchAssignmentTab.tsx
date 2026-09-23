'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  Plus,
  Trash2,
  RefreshCw,
  FolderGit2,
  MapPin,
  CheckSquare,
  Square,
  Shield,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { projectService, siteService } from '@/services/project.service';
import { usersAdminService } from '@/services/users-admin.service';
import { Project, Site, AdminUserDetail, Team, ProjectMember, SiteMember } from '@/types';
import { Language } from '@/lib/i18n';

interface BatchAssignmentTabProps {
  currentUser: any;
  lang: Language;
}

export const BatchAssignmentTab: React.FC<BatchAssignmentTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [assignmentScope, setAssignmentScope] = useState<'project' | 'site'>('project');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');

  const [allUsers, setAllUsers] = useState<AdminUserDetail[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  // Assigned members & teams
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [siteMembers, setSiteMembers] = useState<SiteMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch Selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [assignRole, setAssignRole] = useState<string>('Site Engineer');
  const [isPrimary, setIsPrimary] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter users search
  const [userSearch, setUserSearch] = useState('');

  const projectRoles = [
    'Project Manager',
    'Site Engineer',
    'Supervisor',
    'Technical Office',
    'QA/QC Engineer',
    'Safety Officer',
    'Commissioning Engineer',
    'Accounting Representative',
    'Procurement Representative'
  ];

  const siteRoles = [
    'Site Manager',
    'Site Engineer',
    'Electrical Supervisor',
    'Mechanical Supervisor',
    'Low Current Technician',
    'Programmer',
    'Maintenance Specialist',
    'Safety Officer'
  ];

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    if (assignmentScope === 'project' && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    } else if (assignmentScope === 'site' && sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [assignmentScope, projects, sites]);

  useEffect(() => {
    loadCurrentAssignments();
    setSelectedUserIds([]);
    setSelectedTeamIds([]);
  }, [assignmentScope, selectedProjectId, selectedSiteId]);

  const loadLookups = async () => {
    try {
      const [pRes, sRes, uRes, tRes] = await Promise.all([
        projectService.getProjects({ pageSize: 100 }),
        siteService.getAllSites(),
        usersAdminService.getUsers({ pageSize: 150 }),
        organizationService.getTeams()
      ]);
      if (pRes.success && pRes.data?.items) setProjects(pRes.data.items);
      if (sRes.success && sRes.data) setSites(sRes.data);
      if (uRes.success && uRes.data) setAllUsers(uRes.data);
      if (tRes.success && tRes.data) setAllTeams(tRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCurrentAssignments = async () => {
    setLoading(true);
    try {
      if (assignmentScope === 'project' && selectedProjectId) {
        const res = await organizationService.getProjectMembers(selectedProjectId);
        if (res.success && res.data) setProjectMembers(res.data);
      } else if (assignmentScope === 'site' && selectedSiteId) {
        const res = await organizationService.getSiteMembers(selectedSiteId);
        if (res.success && res.data) setSiteMembers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleSelectAllFilteredUsers = () => {
    const filtered = filteredUsers.map((u) => u.id);
    const allSelected = filtered.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds(selectedUserIds.filter((id) => !filtered.includes(id)));
    } else {
      setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...filtered])));
    }
  };

  const handleBatchAssign = async () => {
    if (selectedUserIds.length === 0) return;

    setSubmitting(true);
    setMessage(null);
    try {
      if (assignmentScope === 'project' && selectedProjectId) {
        const res = await organizationService.batchAssignProjectMembers(selectedProjectId, {
          userIds: selectedUserIds,
          role: assignRole,
          isPrimary
        });
        if (res.success) {
          setMessage({
            text: isArabic
              ? `تم تعيين ${selectedUserIds.length} مهندس بنجاح إلى المشروع`
              : `Successfully assigned ${selectedUserIds.length} engineers to project`,
            type: 'success'
          });
          setSelectedUserIds([]);
          loadCurrentAssignments();
        } else {
          setMessage({ text: res.message || 'Batch assign failed', type: 'error' });
        }
      } else if (assignmentScope === 'site' && selectedSiteId) {
        const res = await organizationService.batchAssignSiteMembers(selectedSiteId, {
          userIds: selectedUserIds,
          role: assignRole,
          isPrimary
        });
        if (res.success) {
          setMessage({
            text: isArabic
              ? `تم تعيين ${selectedUserIds.length} مهندس/فني بنجاح إلى الموقع`
              : `Successfully assigned ${selectedUserIds.length} members to site`,
            type: 'success'
          });
          setSelectedUserIds([]);
          loadCurrentAssignments();
        } else {
          setMessage({ text: res.message || 'Batch assign failed', type: 'error' });
        }
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Error occurred during batch assignment', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(userSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'التعيين الجماعي للمشاريع والمواقع (Batch Assignment)' : 'Multi-Select Batch Assignment UI'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'اختيار عدة مهندسين أو فرق دفعة واحدة وإسنادهم للمشروع أو الموقع مع تحديد الدور والمسؤولية المباشرة (UI-ORG-01 / UI-ORG-02)'
                : 'Select multiple engineers simultaneously and batch-assign with designated project/site roles'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
            <button
              onClick={() => {
                setAssignmentScope('project');
                setAssignRole('Site Engineer');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assignmentScope === 'project'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{isArabic ? 'مشروع (UI-ORG-01)' : 'Project'}</span>
            </button>
            <button
              onClick={() => {
                setAssignmentScope('site');
                setAssignRole('Site Engineer');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                assignmentScope === 'site'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{isArabic ? 'موقع (UI-ORG-02)' : 'Site'}</span>
            </button>
          </div>

          {assignmentScope === 'project' ? (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadCurrentAssignments}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Multi-select User Picker on Left, Assignment Action on Top Right, Current Roster on Bottom Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Multi-select User List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={isArabic ? 'بحث في قائمة المهندسين...' : 'Filter engineers...'}
              className="w-full max-w-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={handleSelectAllFilteredUsers}
              className="text-xs text-emerald-400 font-semibold hover:underline"
            >
              {isArabic ? 'تحديد الكل' : 'Select All Filtered'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 max-h-[500px] overflow-y-auto divide-y divide-slate-800">
            {filteredUsers.map((u) => {
              const isChecked = selectedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  onClick={() => handleToggleUserSelection(u.id)}
                  className={`flex items-center justify-between p-3.5 cursor-pointer transition-colors ${
                    isChecked ? 'bg-emerald-500/10' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600" />
                    )}
                    <div>
                      <span className="font-bold text-slate-100 text-xs block">{u.fullName}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{u.employeeCode || 'NO-CODE'}</span>
                        <span>•</span>
                        <span>{u.jobTitle || 'Staff'}</span>
                        <span>•</span>
                        <span>{u.departmentName || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {u.activeProjectsCount} {isArabic ? 'مشاريع' : 'proj'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Batch Assign Actions & Current Roster */}
        <div className="lg:col-span-5 space-y-4">
          {/* Action Box */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h4 className="font-bold text-sm text-slate-100 flex items-center justify-between">
              <span>{isArabic ? 'بيانات التعيين الجماعي' : 'Batch Assign Parameters'}</span>
              <span className="font-mono text-emerald-400 text-xs">
                {selectedUserIds.length} {isArabic ? 'محدد' : 'selected'}
              </span>
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {isArabic ? 'الدور في المشروع / الموقع' : 'Assigned Role'}
              </label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {(assignmentScope === 'project' ? projectRoles : siteRoles).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'تعيين كمسؤول رئيسي (Primary Responsible)' : 'Set as Primary Responsible'}</span>
            </label>

            <button
              onClick={handleBatchAssign}
              disabled={submitting || selectedUserIds.length === 0}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40"
            >
              {submitting
                ? isArabic
                  ? 'جاري التعيين...'
                  : 'Assigning...'
                : isArabic
                ? `تعيين (${selectedUserIds.length}) مهندسين الآن`
                : `Assign (${selectedUserIds.length}) Engineers Now`}
            </button>
          </div>

          {/* Current Roster */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h5 className="font-bold text-xs text-slate-300">
              {isArabic ? 'فريق العمل المسند حالياً' : 'Currently Assigned Personnel'}
            </h5>

            <div className="max-h-[260px] overflow-y-auto space-y-1.5 pe-1">
              {assignmentScope === 'project' ? (
                projectMembers.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4 text-center">
                    {isArabic ? 'لا يوجد مهندسين مسندين للمشروع' : 'No members currently assigned'}
                  </p>
                ) : (
                  projectMembers.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          {m.isPrimary && <Star className="w-3 h-3 text-amber-400" />}
                          <span className="font-bold text-slate-200">{m.userName}</span>
                        </div>
                        <span className="text-[10px] text-teal-400">{m.projectRole}</span>
                      </div>
                    </div>
                  ))
                )
              ) : siteMembers.length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">
                  {isArabic ? 'لا يوجد أفراد مسندين للموقع' : 'No site members currently assigned'}
                </p>
              ) : (
                siteMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        {m.isPrimary && <Star className="w-3 h-3 text-amber-400" />}
                        <span className="font-bold text-slate-200">{m.userName}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400">{m.siteRole}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
