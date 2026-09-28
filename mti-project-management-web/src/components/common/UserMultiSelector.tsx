'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Users,
  Check,
  X,
  Briefcase,
  Shield,
  RefreshCw,
  UserCheck,
  Filter,
  CheckSquare,
  Square,
  Mail,
  Phone
} from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';

export interface UserSelectorItem {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email: string;
  phoneNumber?: string | null;
  jobTitle?: string | null;
  isActive?: boolean;
  roles?: string[];
  department?: string | { name?: string };
}

interface UserMultiSelectorProps {
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  users?: UserSelectorItem[];
  isArabic?: boolean;
  mode?: 'multi' | 'single';
  maxHeight?: string;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  requiredRole?: string;
}

const ROLE_DISPLAY_MAP: Record<string, { ar: string; en: string; color: string }> = {
  SuperAdmin: { ar: 'المدير العام', en: 'Super Admin', color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30' },
  SystemAdmin: { ar: 'مسؤول النظام', en: 'System Admin', color: 'from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30' },
  Admin: { ar: 'مدير المنظومة', en: 'Enterprise Admin', color: 'from-indigo-500/20 to-blue-500/20 text-indigo-300 border-indigo-500/30' },
  ProjectManager: { ar: 'مدير مشاريع', en: 'Project Manager', color: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30' },
  Engineer: { ar: 'مهندس ميداني', en: 'Field Engineer', color: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30' },
  SiteEngineer: { ar: 'مهندس موقع', en: 'Site Engineer', color: 'from-cyan-500/20 to-teal-500/20 text-cyan-300 border-cyan-500/30' },
  SoftwareEngineer: { ar: 'مهندس برمجيات', en: 'Software Eng', color: 'from-blue-500/20 to-indigo-500/20 text-blue-300 border-blue-500/30' },
  TechnicalOffice: { ar: 'المكتب الفني', en: 'Technical Office', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30' },
  Accounting: { ar: 'الحسابات', en: 'Accounting', color: 'from-teal-500/20 to-emerald-500/20 text-teal-300 border-teal-500/30' },
  Procurement: { ar: 'المشتريات', en: 'Procurement', color: 'from-orange-500/20 to-amber-500/20 text-orange-300 border-orange-500/30' },
  Maintenance: { ar: 'الصيانة', en: 'Maintenance', color: 'from-rose-500/20 to-pink-500/20 text-rose-300 border-rose-500/30' },
  Viewer: { ar: 'مشاهد فقط', en: 'Viewer', color: 'from-slate-500/20 to-gray-500/20 text-slate-300 border-slate-500/30' }
};

export const UserMultiSelector: React.FC<UserMultiSelectorProps> = ({
  selectedUserIds = [],
  onChange,
  users: externalUsers,
  isArabic = true,
  mode = 'multi',
  maxHeight = 'max-h-72',
  title,
  subtitle,
  onRefresh,
  requiredRole
}) => {
  const [internalUsers, setInternalUsers] = useState<UserSelectorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Load / sync users
  const loadUsersList = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.getUsers();
      if (Array.isArray(data)) {
        setInternalUsers(data);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[UserMultiSelector] Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalUsers && externalUsers.length > 0) {
      setInternalUsers(externalUsers);
    } else {
      loadUsersList();
    }
  }, [externalUsers]);

  // Listen for user updates broadcast from other tabs/dialogs
  useEffect(() => {
    const handleUpdate = () => {
      loadUsersList();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('mti_users_updated', handleUpdate);
      return () => window.removeEventListener('mti_users_updated', handleUpdate);
    }
  }, []);

  const allUsers = (externalUsers && externalUsers.length > 0) ? externalUsers : internalUsers;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      // 1. Role filter tab
      if (selectedRoleFilter !== 'ALL') {
        const hasRole = (u.roles || []).some((r) => {
          if (selectedRoleFilter === 'ENGINEERS') return r.toLowerCase().includes('engineer');
          if (selectedRoleFilter === 'PM') return r === 'ProjectManager';
          if (selectedRoleFilter === 'ADMINS') return r === 'Admin' || r === 'SystemAdmin' || r === 'SuperAdmin';
          if (selectedRoleFilter === 'TECH') return r === 'TechnicalOffice';
          return r === selectedRoleFilter;
        });
        if (!hasRole) return false;
      }

      // 2. Specific role requirement prop
      if (requiredRole && !(u.roles || []).includes(requiredRole)) {
        return false;
      }

      // 3. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const fullName = (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase();
      const email = (u.email || '').toLowerCase();
      const jobTitle = (u.jobTitle || '').toLowerCase();
      const phone = (u.phoneNumber || '').toLowerCase();
      const rolesStr = (u.roles || []).join(' ').toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        jobTitle.includes(q) ||
        phone.includes(q) ||
        rolesStr.includes(q)
      );
    });
  }, [allUsers, selectedRoleFilter, requiredRole, searchQuery]);

  // Toggle user selection
  const handleToggle = (userId: string) => {
    if (mode === 'single') {
      if (selectedUserIds.includes(userId)) {
        onChange([]);
      } else {
        onChange([userId]);
      }
    } else {
      if (selectedUserIds.includes(userId)) {
        onChange(selectedUserIds.filter((id) => id !== userId));
      } else {
        onChange([...selectedUserIds, userId]);
      }
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredUsers.map((u) => u.id);
    const combined = Array.from(new Set([...selectedUserIds, ...filteredIds]));
    onChange(combined);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  // Helper to format user display
  const getUserDisplayName = (u: UserSelectorItem) => {
    return (u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).trim() || u.email;
  };

  const getUserInitials = (u: UserSelectorItem) => {
    const first = u.firstName?.[0] || u.email?.[0] || 'U';
    const last = u.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  // Selected users list for chips display
  const selectedUsers = useMemo(() => {
    return allUsers.filter((u) => selectedUserIds.includes(u.id));
  }, [allUsers, selectedUserIds]);

  const roleFilterTabs = [
    { id: 'ALL', label: isArabic ? 'الكل' : 'All' },
    { id: 'ENGINEERS', label: isArabic ? 'المهندسون' : 'Engineers' },
    { id: 'PM', label: isArabic ? 'مدراء المشاريع' : 'Project Managers' },
    { id: 'TECH', label: isArabic ? 'المكتب الفني' : 'Technical' },
    { id: 'ADMINS', label: isArabic ? 'الإدارة' : 'Admins' }
  ];

  return (
    <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-700/60 shadow-inner">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{title || (isArabic ? 'إسناد فريق العمل والمستخدمين' : 'Assign Team & Members')}</span>
              {selectedUserIds.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {selectedUserIds.length} {isArabic ? 'محدد' : 'selected'}
                </span>
              )}
            </h5>
            {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'multi' && (
            <>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                disabled={filteredUsers.length === 0}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition disabled:opacity-40"
              >
                {isArabic ? 'تحديد الظاهرين' : 'Select Shown'}
              </button>
              {selectedUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition"
                >
                  {isArabic ? 'إلغاء التحديد' : 'Clear All'}
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={loadUsersList}
            disabled={loading}
            title={isArabic ? 'تحديث قائمة المستخدمين الآن' : 'Refresh users now'}
            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Selected Users Chips Bar */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800 max-h-24 overflow-y-auto custom-scrollbar">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-950/60 to-slate-900 border border-cyan-500/40 text-slate-200 text-xs shadow-sm animate-fade-in"
            >
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[9px] font-bold">
                {getUserInitials(u)}
              </span>
              <span className="font-semibold text-[11px] max-w-[130px] truncate">{getUserDisplayName(u)}</span>
              <button
                type="button"
                onClick={() => handleToggle(u.id)}
                className="text-slate-400 hover:text-rose-400 transition"
                title={isArabic ? 'إلغاء الإسناد' : 'Remove'}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search and Role Filter Tabs */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isArabic
                ? 'ابحث بالاسم، البريد الإلكتروني، المسمى الوظيفي، أو الدور...'
                : 'Search by name, email, job title, or role...'
            }
            className="w-full ps-9 pe-8 py-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {roleFilterTabs.map((tab) => {
            const isActive = selectedRoleFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setSelectedRoleFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Cards Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto custom-scrollbar p-0.5 ${maxHeight}`}>
        {loading && allUsers.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
            <span>{isArabic ? 'جاري تحميل قائمة المستخدمين...' : 'Loading users list...'}</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800/80 p-4 space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-300">
              {searchQuery
                ? isArabic ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching users found'
                : isArabic ? 'لا يوجد مستخدمون مسجلون في هذه الفئة' : 'No users found in this category'}
            </p>
            <button
              type="button"
              onClick={loadUsersList}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold transition border border-slate-700"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isArabic ? 'إعادة فحص المستخدمين' : 'Refresh Users'}</span>
            </button>
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isSelected = selectedUserIds.includes(u.id);
            const primaryRole = u.roles?.[0] || 'Engineer';
            const roleMeta = ROLE_DISPLAY_MAP[primaryRole] || {
              ar: primaryRole,
              en: primaryRole,
              color: 'from-slate-500/20 to-gray-500/20 text-slate-300 border-slate-500/30'
            };

            return (
              <div
                key={u.id}
                onClick={() => handleToggle(u.id)}
                className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border-cyan-500/60 shadow-md shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950/50 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                {/* Selection Checkbox */}
                <div className="pt-0.5 shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-md bg-cyan-500 text-slate-950 flex items-center justify-center shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-md border border-slate-700 bg-slate-900 group-hover:border-slate-500 transition flex items-center justify-center" />
                  )}
                </div>

                {/* Avatar with Initials */}
                <div className="relative shrink-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shadow-sm transition-all ${
                      isSelected
                        ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 group-hover:border-slate-600'
                    }`}
                  >
                    {getUserInitials(u)}
                  </div>
                  {u.isActive !== false && (
                    <span
                      title={isArabic ? 'حساب نشط' : 'Active'}
                      className="absolute -bottom-0.5 -end-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition">
                      {getUserDisplayName(u)}
                    </p>
                  </div>

                  {/* Job Title and Email */}
                  <div className="flex flex-col gap-0.5">
                    {u.jobTitle ? (
                      <p className="text-[11px] text-cyan-400 font-medium truncate flex items-center gap-1">
                        <Briefcase className="w-3 h-3 shrink-0" />
                        <span>{u.jobTitle}</span>
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span>{u.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Role Badge and Status */}
                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border bg-gradient-to-r ${roleMeta.color}`}
                    >
                      {isArabic ? roleMeta.ar : roleMeta.en}
                    </span>

                    {u.phoneNumber && (
                      <span className="text-[9px] text-slate-500 font-mono flex items-center gap-0.5">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{u.phoneNumber}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Hint */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
        <span>
          {isArabic
            ? `إجمالي المستخدمين المتاحين: ${allUsers.length} | الظاهر: ${filteredUsers.length}`
            : `Total users: ${allUsers.length} | Shown: ${filteredUsers.length}`}
        </span>
        <span className="text-slate-500">
          {mode === 'multi'
            ? (isArabic ? 'يمكنك تحديد أكثر من عضو في نفس المشروع' : 'You can select multiple members')
            : (isArabic ? 'اختيار عضو واحد فقط' : 'Single member selection')}
        </span>
      </div>
    </div>
  );
};
