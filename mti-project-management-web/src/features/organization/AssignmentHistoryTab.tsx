'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  UserMinus,
  Users,
  Shield,
  FolderGit2,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';
import { organizationService } from '@/services/organization.service';
import { AssignmentHistoryDto, AssignmentHistoryFilterRequest } from '@/types';
import { Language } from '@/lib/i18n';

interface AssignmentHistoryTabProps {
  currentUser: any;
  lang: Language;
}

export const AssignmentHistoryTab: React.FC<AssignmentHistoryTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [historyItems, setHistoryItems] = useState<AssignmentHistoryDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, [pageNumber, resourceTypeFilter, actionFilter]);

  const loadHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await organizationService.getAssignmentHistory({
        resourceType: resourceTypeFilter || undefined,
        action: actionFilter || undefined,
        pageNumber,
        pageSize
      });

      if (res.success && res.data) {
        setHistoryItems(res.data.items || []);
        setTotalCount(res.data.totalCount || 0);
        setTotalPages(res.data.totalPages || 1);
      } else {
        setErrorMsg(res.message || (isArabic ? 'فشل تحميل سجل التعيينات' : 'Failed to load assignment history'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isArabic ? 'حدث خطأ أثناء تحميل السجل' : 'Error loading history'));
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'assigned':
      case 'batchassigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
            <UserCheck className="w-3 h-3" />
            {isArabic ? 'إسناد جديد' : 'Assigned'}
          </span>
        );
      case 'reassigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
            <RefreshCw className="w-3 h-3" />
            {isArabic ? 'إعادة إسناد' : 'Reassigned'}
          </span>
        );
      case 'removed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300">
            <UserMinus className="w-3 h-3" />
            {isArabic ? 'إزالة' : 'Removed'}
          </span>
        );
      case 'rolechanged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
            <Shield className="w-3 h-3" />
            {isArabic ? 'تغيير الدور' : 'Role Changed'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            {action}
          </span>
        );
    }
  };

  const filteredItems = historyItems.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.targetName.toLowerCase().includes(q) ||
      (item.resourceName && item.resourceName.toLowerCase().includes(q)) ||
      (item.role && item.role.toLowerCase().includes(q)) ||
      (item.reason && item.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {isArabic ? 'سجل تاريخ التعيينات والانتقالات (ORG-12: Assignment History)' : 'Assignment History & Transitions Audit'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isArabic
              ? 'أرشفة غير قابلة للحذف لكافة حركات إسناد وإلغاء وتعديل أدوار المستخدمين وفرق العمل مع توثيق الأسباب والمنفذين وتواريخ الإلغاء.'
              : 'Permanent audit trail of all assignment transitions (users/teams assigned, removed, role changed) with reasons and actors.'}
          </p>
        </div>

        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {isArabic ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Query */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder={isArabic ? 'بحث بالمستخدم أو المورد أو الدور...' : 'Search by user, resource, role...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2 pl-3 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          {/* Resource Type Filter */}
          <select
            value={resourceTypeFilter}
            onChange={e => {
              setResourceTypeFilter(e.target.value);
              setPageNumber(1);
            }}
            className="text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="">{isArabic ? 'كل أنواع الموارد' : 'All Resource Types'}</option>
            <option value="Project">Project</option>
            <option value="Site">Site</option>
            <option value="Team">Team</option>
            <option value="Department">Department</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={e => {
              setActionFilter(e.target.value);
              setPageNumber(1);
            }}
            className="text-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
          >
            <option value="">{isArabic ? 'كل الإجراءات' : 'All Actions'}</option>
            <option value="Assigned">{isArabic ? 'إسناد جديد' : 'Assigned'}</option>
            <option value="Reassigned">{isArabic ? 'إعادة إسناد' : 'Reassigned'}</option>
            <option value="RoleChanged">{isArabic ? 'تغيير الدور' : 'Role Changed'}</option>
            <option value="Removed">{isArabic ? 'إزالة' : 'Removed'}</option>
          </select>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 self-end md:self-center font-mono">
          {isArabic ? `إجمالي السجلات: ${totalCount}` : `Total records: ${totalCount}`}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 text-[11px] uppercase border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'الإجراء' : 'Action'}</th>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'المورد المسند إليه' : 'Resource'}</th>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'الهدف المسند (مستخدم / فريق)' : 'Target'}</th>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'الدور الوظيفي' : 'Role'}</th>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'تاريخ ومنفذ الإسناد' : 'Assigned At / By'}</th>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'تاريخ ومنفذ الإلغاء' : 'Removed At / By'}</th>
                <th className="px-4 py-3 font-semibold">{isArabic ? 'السبب والبيان' : 'Reason'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    {loading ? (isArabic ? 'جارٍ التحميل...' : 'Loading...') : (isArabic ? 'لم يتم العثور على سجلات تعيينات سابقة' : 'No assignment records found.')}
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                    {/* Action Badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>

                    {/* Resource Name and Type */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {item.assignmentType === 'Project' && <FolderGit2 className="w-3.5 h-3.5 text-indigo-500" />}
                        {item.assignmentType === 'Site' && <MapPin className="w-3.5 h-3.5 text-teal-500" />}
                        {item.assignmentType === 'Team' && <Users className="w-3.5 h-3.5 text-blue-500" />}
                        <span>{item.resourceName || (isArabic ? 'مورد غير مسمى' : 'Unnamed Resource')}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase font-mono">{item.assignmentType}</span>
                    </td>

                    {/* Target Name (User or Team) */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                        {item.targetUserId ? <User className="w-3 h-3 text-gray-400" /> : <Users className="w-3 h-3 text-blue-400" />}
                        <span>{item.targetName}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.role ? (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono text-[11px]">
                          {item.role}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Assigned At & By */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-gray-800 dark:text-gray-200 flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {new Date(item.assignedAt).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {item.assignedByName && (
                        <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]">
                          {isArabic ? 'بواسطة:' : 'By:'} {item.assignedByName}
                        </div>
                      )}
                    </td>

                    {/* Removed At & By */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.removedAt ? (
                        <>
                          <div className="text-rose-700 dark:text-rose-400 flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3" />
                            {new Date(item.removedAt).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {item.removedByName && (
                            <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px]">
                              {isArabic ? 'بواسطة:' : 'By:'} {item.removedByName}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                          {isArabic ? 'نشط حالياً' : 'Active'}
                        </span>
                      )}
                    </td>

                    {/* Reason */}
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <span className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2" title={item.reason || ''}>
                        {item.reason || (isArabic ? 'إجراء نظام تلقائي' : 'System action')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-750 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
            <span className="text-gray-500 dark:text-gray-400">
              {isArabic ? `صفحة ${pageNumber} من ${totalPages}` : `Page ${pageNumber} of ${totalPages}`}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber === 1 || loading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                disabled={pageNumber === totalPages || loading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
