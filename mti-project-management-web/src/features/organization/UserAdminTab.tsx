'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit,
  KeyRound,
  Shield,
  Building,
  Briefcase,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  FolderGit2,
  MapPin,
  Clock,
  Activity,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';
import { usersAdminService } from '@/services/users-admin.service';
import { organizationService } from '@/services/organization.service';
import { AdminUserDetail, Department, Team } from '@/types';
import { Language } from '@/lib/i18n';

interface UserAdminTabProps {
  currentUser: any;
  lang: Language;
}

export const UserAdminTab: React.FC<UserAdminTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');

  // Selected User for details / assignment modal
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [userAssignments, setUserAssignments] = useState<any | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [detailModalTab, setDetailModalTab] = useState<'profile' | 'assignments' | 'activity'>('profile');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Form states
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmployeeCode, setFormEmployeeCode] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDepartmentId, setFormDepartmentId] = useState('');
  const [formRoles, setFormRoles] = useState<string[]>(['Engineer']);
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const allRoles = [
    'SuperAdmin',
    'SystemAdmin',
    'Admin',
    'ProjectManager',
    'Engineer',
    'SiteEngineer',
    'SoftwareEngineer',
    'TechnicalOffice',
    'Accounting',
    'Procurement',
    'Maintenance',
    'Viewer'
  ];

  useEffect(() => {
    loadUsers();
    loadDepartmentsAndTeams();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAdminService.getUsers({
        search: search || undefined,
        departmentId: selectedDeptId || undefined,
        pageSize: 100
      });
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentsAndTeams = async () => {
    try {
      const [dRes, tRes] = await Promise.all([
        organizationService.getDepartments(),
        organizationService.getTeams()
      ]);
      if (dRes.success && dRes.data) setDepartments(dRes.data);
      if (tRes.success && tRes.data) setTeams(tRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail || !formFirstName || !formLastName) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await usersAdminService.createUser({
        email: formEmail,
        password: formPassword || 'Mti@2026Secure!',
        firstName: formFirstName,
        lastName: formLastName,
        phoneNumber: formPhone || undefined,
        employeeCode: formEmployeeCode || undefined,
        jobTitle: formJobTitle || undefined,
        departmentId: formDepartmentId || undefined,
        roles: formRoles
      });

      if (res.success) {
        setShowCreateModal(false);
        resetForm();
        loadUsers();
      } else {
        setErrorMsg(res.message || 'Failed to create user');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await usersAdminService.updateUserProfile(selectedUser.id, {
        firstName: formFirstName,
        lastName: formLastName,
        phoneNumber: formPhone || undefined,
        employeeCode: formEmployeeCode || undefined,
        jobTitle: formJobTitle || undefined,
        departmentId: formDepartmentId || undefined,
        roles: formRoles
      });

      if (res.success) {
        setShowEditModal(false);
        loadUsers();
      } else {
        setErrorMsg(res.message || 'Failed to update profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AdminUserDetail) => {
    const actionName = user.isActive ? (isArabic ? 'تعطيل' : 'deactivate') : isArabic ? 'تنشيط' : 'activate';
    if (!confirm(isArabic ? `هل تريد ${actionName} المستخدم (${user.fullName})؟` : `Do you want to ${actionName} ${user.fullName}?`)) return;

    try {
      const res = await usersAdminService.toggleUserStatus(user.id, !user.isActive, 'Admin toggle status');
      if (res.success) {
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await usersAdminService.resetPassword(selectedUser.id, newPassword);
      if (res.success) {
        setShowResetPasswordModal(false);
        setNewPassword('');
        alert(isArabic ? 'تم تغيير كلمة المرور بنجاح' : 'Password reset successfully');
      } else {
        setErrorMsg(res.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resetting password');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignmentsModal = async (user: AdminUserDetail) => {
    setSelectedUser(user);
    setDetailModalTab('assignments');
    setShowAssignmentsModal(true);
    try {
      const [assRes, actRes] = await Promise.all([
        usersAdminService.getUserAssignments(user.id),
        usersAdminService.getUserActivity(user.id, 50)
      ]);
      if (assRes.success && assRes.data) setUserAssignments(assRes.data);
      if (actRes.success && actRes.data) setUserActivity(actRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (user: AdminUserDetail) => {
    setSelectedUser(user);
    setFormFirstName(user.firstName);
    setFormLastName(user.lastName);
    setFormPhone(user.phoneNumber || '');
    setFormEmployeeCode(user.employeeCode || '');
    setFormJobTitle(user.jobTitle || '');
    setFormDepartmentId(user.departmentId || '');
    setFormRoles(user.roles || ['Engineer']);
    setErrorMsg('');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormEmail('');
    setFormPassword('');
    setFormFirstName('');
    setFormLastName('');
    setFormPhone('');
    setFormEmployeeCode('');
    setFormJobTitle('');
    setFormDepartmentId('');
    setFormRoles(['Engineer']);
  };

  const toggleRoleSelection = (role: string) => {
    if (formRoles.includes(role)) {
      if (formRoles.length > 1) {
        setFormRoles(formRoles.filter((r) => r !== role));
      }
    } else {
      setFormRoles([...formRoles, role]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              {isArabic ? 'إدارة المستخدمين وحسابات الموظفين (User Administration)' : 'Enterprise User Administration'}
            </h3>
            <p className="text-xs text-slate-400">
              {isArabic
                ? 'إدارة حسابات المهندسين والإداريين، وتعيين الأدوار والصلاحيات، ومتابعة النشاط والتعيينات'
                : 'Manage user profiles, assign roles, teams, departments, reset credentials, and monitor audit activity'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setErrorMsg('');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isArabic ? 'إضافة مستخدم جديد' : 'Add User'}</span>
          </button>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
            placeholder={isArabic ? 'بحث بالاسم، البريد الإلكتروني، أو كود الموظف...' : 'Search by name, email, or employee code...'}
            className="w-full ps-9 pe-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={selectedDeptId}
          onChange={(e) => {
            setSelectedDeptId(e.target.value);
            loadUsers();
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="">{isArabic ? 'جميع الأقسام' : 'All Departments'}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-16 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin me-2 text-indigo-400" />
            <span>{isArabic ? 'جاري تحميل المستخدمين...' : 'Loading users...'}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-12 text-slate-500 text-xs">
            {isArabic ? 'لا يوجد مستخدمين مطابقين للبحث' : 'No users found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-800/80 border-b border-slate-700/60 text-slate-400 font-semibold">
                <tr>
                  <th className="p-3 text-start">{isArabic ? 'الموظف' : 'Employee'}</th>
                  <th className="p-3 text-start">{isArabic ? 'الكود' : 'Code'}</th>
                  <th className="p-3 text-start">{isArabic ? 'المسمى والقسم' : 'Title & Dept'}</th>
                  <th className="p-3 text-start">{isArabic ? 'الأدوار النظامية' : 'Roles'}</th>
                  <th className="p-3 text-center">{isArabic ? 'المشاريع / المواقع' : 'Projects / Sites'}</th>
                  <th className="p-3 text-center">{isArabic ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-end">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-indigo-500/20">
                          {u.firstName?.[0] || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 block">{u.fullName}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-indigo-400 font-bold">
                      {u.employeeCode || '—'}
                    </td>
                    <td className="p-3">
                      <span className="text-slate-200 block font-medium">{u.jobTitle || '—'}</span>
                      <span className="text-[11px] text-slate-400">{u.departmentName || 'General'}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {u.roles?.map((r) => (
                          <span
                            key={r}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className="text-teal-400 font-bold">{u.activeProjectsCount}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-emerald-400 font-bold">{u.activeSitesCount}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                          u.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{u.isActive ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'معطل' : 'Disabled')}</span>
                      </button>
                    </td>
                    <td className="p-3 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openAssignmentsModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-all"
                          title={isArabic ? 'عرض التعيينات وسجل النشاط' : 'View Assignments & Activity'}
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-all"
                          title={isArabic ? 'تعديل البيانات والأدوار' : 'Edit Profile & Roles'}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewPassword('');
                            setErrorMsg('');
                            setShowResetPasswordModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all"
                          title={isArabic ? 'إعادة ضبط كلمة المرور' : 'Reset Password'}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold text-slate-100">
              {isArabic ? 'إضافة مستخدم جديد للنظام' : 'Create New System User'}
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'الاسم الأول' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'الاسم الأخير' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'كود الموظف (Employee Code)' : 'Employee Code'}
                  </label>
                  <input
                    type="text"
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    placeholder="e.g. MTI-ENG-042"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'المسمى الوظيفي (Job Title)' : 'Job Title'}
                  </label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    placeholder="e.g. Senior CCTV Engineer"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isArabic ? 'المسمى للعرض فقط، الصلاحيات تأتي من الأدوار' : 'Display only; authorization comes from roles'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'القسم' : 'Department'}
                  </label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  >
                    <option value="">{isArabic ? 'اختر القسم...' : 'Select Department...'}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الأدوار النظامية (System Roles)' : 'System Roles'}
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700 max-h-32 overflow-y-auto">
                  {allRoles.map((r) => {
                    const isSelected = formRoles.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleRoleSelection(r)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'كلمة المرور الأولية (اختياري)' : 'Initial Password (optional)'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="Defaults to Mti@2026Secure!"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
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
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الإنشاء...' : 'Creating...') : isArabic ? 'إنشاء المستخدم' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Profile & Roles */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold text-slate-100">
              {isArabic ? `تعديل بيانات المستخدم: ${selectedUser.fullName}` : `Edit User: ${selectedUser.fullName}`}
            </h4>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'الاسم الأول' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'الاسم الأخير' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'كود الموظف' : 'Employee Code'}
                  </label>
                  <input
                    type="text"
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'المسمى الوظيفي' : 'Job Title'}
                  </label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isArabic ? 'القسم' : 'Department'}
                  </label>
                  <select
                    value={formDepartmentId}
                    onChange={(e) => setFormDepartmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  >
                    <option value="">{isArabic ? 'بدون قسم' : 'No Department'}</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'الأدوار النظامية' : 'System Roles'}
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700 max-h-32 overflow-y-auto">
                  {allRoles.map((r) => {
                    const isSelected = formRoles.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => toggleRoleSelection(r)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-indigo-500 text-white shadow-sm'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isArabic ? 'تحديث البيانات' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>{isArabic ? 'إعادة ضبط كلمة المرور' : 'Reset Password'}</span>
            </h4>
            <p className="text-xs text-slate-400">
              {isArabic ? `للمستخدم: ${selectedUser.fullName}` : `For user: ${selectedUser.fullName}`}
            </p>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isArabic ? 'كلمة المرور الجديدة' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters with numbers & symbols"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all disabled:opacity-50"
                >
                  {submitting ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : isArabic ? 'تأكيد التغيير' : 'Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View User Assignments & Activity Audit */}
      {showAssignmentsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h4 className="text-base font-bold text-slate-100">{selectedUser.fullName}</h4>
                <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
              </div>
              <div className="flex rounded-xl bg-slate-800 p-1 border border-slate-700">
                <button
                  onClick={() => setDetailModalTab('assignments')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    detailModalTab === 'assignments'
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isArabic ? 'التعيينات والفرق' : 'Assignments'}
                </button>
                <button
                  onClick={() => setDetailModalTab('activity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    detailModalTab === 'activity'
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isArabic ? 'سجل النشاط والأمان' : 'Activity & Audit'}
                </button>
              </div>
            </div>

            {detailModalTab === 'assignments' ? (
              <div className="space-y-4 text-xs">
                {/* Teams */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>{isArabic ? 'فرق العمل المنضم إليها' : 'Assigned Teams'}</span>
                  </h5>
                  {!userAssignments?.teams || userAssignments.teams.length === 0 ? (
                    <p className="text-slate-500">{isArabic ? 'لا ينتمي لأي فريق عمل حالياً' : 'Not assigned to any team'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {userAssignments.teams.map((t: any) => (
                        <div key={t.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700">
                          <span className="font-bold text-slate-200 block">{t.teamName}</span>
                          <span className="text-[10px] text-slate-400">{t.teamRole}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projects */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-teal-400" />
                    <span>{isArabic ? 'المشاريع المسندة' : 'Assigned Projects'}</span>
                  </h5>
                  {!userAssignments?.projectAssignments || userAssignments.projectAssignments.length === 0 ? (
                    <p className="text-slate-500">{isArabic ? 'لا توجد مشاريع مسندة حالياً' : 'No projects assigned'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {userAssignments.projectAssignments.map((p: any) => (
                        <div key={p.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700">
                          <span className="font-bold text-slate-200 block">{p.projectName}</span>
                          <span className="text-[10px] text-teal-400">{p.projectRole}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sites */}
                <div>
                  <h5 className="font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{isArabic ? 'المواقع الميدانية' : 'Assigned Sites'}</span>
                  </h5>
                  {!userAssignments?.siteAssignments || userAssignments.siteAssignments.length === 0 ? (
                    <p className="text-slate-500">{isArabic ? 'لا توجد مواقع مسندة حالياً' : 'No sites assigned'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {userAssignments.siteAssignments.map((s: any) => (
                        <div key={s.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700">
                          <span className="font-bold text-slate-200 block">{s.siteName}</span>
                          <span className="text-[10px] text-emerald-400">{s.siteRole}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pe-1">
                {userActivity.length === 0 ? (
                  <p className="text-slate-500 text-xs text-center py-8">
                    {isArabic ? 'لا يوجد سجل نشاط مسجل' : 'No activity audit trail available'}
                  </p>
                ) : (
                  userActivity.map((act) => (
                    <div key={act.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400">{act.action}</span>
                        <span className="text-[10px] font-mono text-slate-500">{act.createdAt}</span>
                      </div>
                      <p className="text-slate-300 mt-1">{act.description}</p>
                      {act.ipAddress && (
                        <span className="text-[10px] font-mono text-slate-500 block mt-1">
                          IP: {act.ipAddress}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAssignmentsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
