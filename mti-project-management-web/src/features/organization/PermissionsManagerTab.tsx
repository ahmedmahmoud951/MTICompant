'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Save,
  RefreshCw,
  Search,
  Filter,
  Check,
  Cpu,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { permissionsService } from '@/services/permissions.service';
import { usersAdminService } from '@/services/users-admin.service';
import { projectService, siteService } from '@/services/project.service';
import {
  ModulePermissionsDto,
  RolePermissionsDto,
  PermissionDto,
  AdminUserDetail,
  Project,
  Site,
  ResourceHierarchyType,
  EvaluateScopeResult
} from '@/types';
import { Language } from '@/lib/i18n';

interface PermissionsManagerTabProps {
  currentUser: any;
  lang: Language;
}

// Enterprise Bilingual Dictionaries
const ROLE_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  SuperAdmin: { ar: 'المدير العام (Super Admin)', en: 'Super Admin' },
  SystemAdmin: { ar: 'مسؤول النظام المركزي (System Admin)', en: 'System Administrator' },
  Admin: { ar: 'مدير المنظومة (Admin)', en: 'Enterprise Admin' },
  ProjectManager: { ar: 'مدير المشاريع (Project Manager)', en: 'Project Manager' },
  Engineer: { ar: 'مهندس ميداني (Field Engineer)', en: 'Field Engineer' },
  SiteEngineer: { ar: 'مهندس موقع (Site Engineer)', en: 'Site Engineer' },
  SoftwareEngineer: { ar: 'مهندس برمجيات ونظم (Software Engineer)', en: 'Software Engineer' },
  TechnicalOffice: { ar: 'المكتب الفني والعطاءات (Technical Office)', en: 'Technical Office' },
  Accounting: { ar: 'الإدارة المالية والمستخلصات (Accounting)', en: 'Accounting & Finance' },
  Procurement: { ar: 'المشتريات وسلاسل الإمداد (Procurement)', en: 'Procurement & Supply' },
  Maintenance: { ar: 'الصيانة والتشغيل الميداني (Maintenance)', en: 'Maintenance & Ops' },
  Viewer: { ar: 'مطلع ومراقب فقط (Viewer)', en: 'Read-Only Viewer' }
};

const MODULE_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  Projects: { ar: 'المشاريع والمخططات الهندسية', en: 'Projects & Schemes' },
  Sites: { ar: 'المواقع الميدانية والمحطات', en: 'Field Sites & Hubs' },
  Tasks: { ar: 'إدارة المهام وجداول الأعمال', en: 'Tasks & Schedule' },
  Documents: { ar: 'الأرشيف السحابي والوثائق B2', en: 'Cloud Documents & Storage' },
  TechnicalOffice: { ar: 'المكتب الفني وجداول الكميات BOQ', en: 'Technical Office & BOQ' },
  Accounting: { ar: 'الحسابات والمستخلصات المالية', en: 'Accounting & Invoices' },
  Materials: { ar: 'المواد المستلمة وأصول الشركة', en: 'Materials & Assets' },
  Operations: { ar: 'العمليات الميدانية والتقارير', en: 'Field Operations & Logs' },
  Reports: { ar: 'التقارير اليومية والتحليلات', en: 'Reports & Analytics' },
  Users: { ar: 'إدارة المستخدمين وحسابات المهندسين', en: 'Users Management' },
  Roles: { ar: 'الأدوار الوظيفية والصلاحيات', en: 'Roles & Privileges' },
  Permissions: { ar: 'مصفوفة الصلاحيات الديناميكية', en: 'Permissions Matrix' },
  Organization: { ar: 'الهيكل المؤسسي وفرق العمل', en: 'Organization & Teams' },
  Audit: { ar: 'سجلات المراقبة وتتبع النظام', en: 'Audit & Compliance' },
  SystemSettings: { ar: 'إعدادات النظام والتهيئة العامة', en: 'System Settings' },
  Security: { ar: 'الأمان والتحكم بنطاقات الوصول', en: 'Security & Scopes' }
};

function getRoleLabel(roleName: string, isArabic: boolean): string {
  const match = ROLE_NAMES_MAP[roleName];
  if (match) return isArabic ? match.ar : match.en;
  return roleName;
}

function getModuleLabel(moduleName: string, isArabic: boolean): string {
  const match = MODULE_NAMES_MAP[moduleName];
  if (match) return isArabic ? match.ar : match.en;
  return moduleName;
}

function getPermissionDisplay(p: PermissionDto, isArabic: boolean): { name: string; desc?: string } {
  if (!isArabic) {
    return { name: p.name || p.code, desc: p.description };
  }

  const code = (p.code || '').trim();
  const codeLower = code.toLowerCase();

  // Intelligent translation of permissions
  const prefix = code.split('.')[0] || '';
  const moduleLabel = MODULE_NAMES_MAP[prefix]?.ar || prefix;

  if (codeLower.endsWith('.view') || codeLower.endsWith('.read')) {
    return {
      name: `عرض واستعراض (${moduleLabel})`,
      desc: p.description || `صلاحية الاطلاع واستعراض سجلات وبيانات ${moduleLabel}.`
    };
  }
  if (codeLower.endsWith('.create') || codeLower.endsWith('.add')) {
    return {
      name: `إنشاء وإضافة (${moduleLabel})`,
      desc: p.description || `صلاحية إدخال وإنشاء سجلات جديدة في ${moduleLabel}.`
    };
  }
  if (codeLower.endsWith('.edit') || codeLower.endsWith('.update')) {
    return {
      name: `تعديل وتحديث (${moduleLabel})`,
      desc: p.description || `صلاحية تعديل وتحديث بيانات ${moduleLabel}.`
    };
  }
  if (codeLower.endsWith('.delete')) {
    return {
      name: `حذف واستبعاد (${moduleLabel})`,
      desc: p.description || `صلاحية الحذف الآمن أو الإلغاء في ${moduleLabel}.`
    };
  }
  if (codeLower.endsWith('.approve')) {
    return {
      name: `اعتماد وموافقة نهائية (${moduleLabel})`,
      desc: p.description || `صلاحية مراجعة واعتماد السجلات والمستخلصات في ${moduleLabel}.`
    };
  }
  if (codeLower.endsWith('.upload')) {
    return {
      name: `رفع الملفات والمستندات (${moduleLabel})`,
      desc: p.description || `صلاحية رفع الوثائق والمخططات الهندسية إلى الأرشيف السحابي.`
    };
  }
  if (codeLower.endsWith('.download')) {
    return {
      name: `تحميل وتنزيل الملفات (${moduleLabel})`,
      desc: p.description || `صلاحية تنزيل الملفات والمخططات الأصلية إلى الجهاز.`
    };
  }
  if (codeLower.endsWith('.export')) {
    return {
      name: `تصدير وطباعة التقارير (${moduleLabel})`,
      desc: p.description || `صلاحية تصدير البيانات إلى Excel و PDF.`
    };
  }
  if (codeLower.endsWith('.manage') || codeLower.endsWith('.admin')) {
    return {
      name: `إدارة كاملة وتحكم شامل (${moduleLabel})`,
      desc: p.description || `صلاحية التحكم الإداري الشامل لـ ${moduleLabel}.`
    };
  }

  return {
    name: p.name || p.code,
    desc: p.description
  };
}

export const PermissionsManagerTab: React.FC<PermissionsManagerTabProps> = ({ currentUser, lang }) => {
  const isArabic = lang === 'ar';

  const [modules, setModules] = useState<ModulePermissionsDto[]>([]);
  const [roles, setRoles] = useState<RolePermissionsDto[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set());
  const [originalPermissions, setOriginalPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scope Evaluator Sandbox (SECURITY-04)
  const [showSandbox, setShowSandbox] = useState(false);
  const [users, setUsers] = useState<AdminUserDetail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [evalUserId, setEvalUserId] = useState('');
  const [evalPermCode, setEvalPermCode] = useState('Documents.View');
  const [evalResourceType, setEvalResourceType] = useState<ResourceHierarchyType>('Project');
  const [evalResourceId, setEvalResourceId] = useState('');
  const [evalResult, setEvalResult] = useState<EvaluateScopeResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadData();
    loadLookups();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const [modulesRes, rolesRes] = await Promise.all([
        permissionsService.getPermissions(),
        permissionsService.getRolePermissions()
      ]);

      if (modulesRes.success && modulesRes.data) {
        setModules(modulesRes.data);
      }

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
        if (rolesRes.data.length > 0 && !selectedRoleId) {
          const firstRole = rolesRes.data[0];
          setSelectedRoleId(firstRole.roleId);
          setActivePermissions(new Set(firstRole.permissionCodes));
          setOriginalPermissions(new Set(firstRole.permissionCodes));
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || (isArabic ? 'فشل تحميل الصلاحيات' : 'Failed to load permissions') });
    } finally {
      setLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [uRes, pRes, sRes] = await Promise.all([
        usersAdminService.getUsers({ pageSize: 50 }),
        projectService.getProjects({ pageSize: 50 }),
        siteService.getAllSites()
      ]);
      if (uRes.success && uRes.data) setUsers(uRes.data);
      if (pRes.success && pRes.data) setProjects(pRes.data.items || (Array.isArray(pRes.data) ? pRes.data : []));
      if (sRes.success && sRes.data) setSites(sRes.data);
    } catch (err) {
      console.error('Error loading lookups for scope evaluator', err);
    }
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const target = roles.find(r => r.roleId === roleId);
    if (target) {
      setActivePermissions(new Set(target.permissionCodes));
      setOriginalPermissions(new Set(target.permissionCodes));
    }
    setStatusMsg(null);
  };

  const togglePermission = (code: string) => {
    setActivePermissions(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const toggleModuleAll = (modulePerms: PermissionDto[]) => {
    const allChecked = modulePerms.every(p => activePermissions.has(p.code));
    setActivePermissions(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => {
        if (allChecked) {
          next.delete(p.code);
        } else {
          next.add(p.code);
        }
      });
      return next;
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await permissionsService.updateRolePermissions(selectedRoleId, {
        permissionCodes: Array.from(activePermissions)
      });
      if (res.success) {
        setStatusMsg({
          type: 'success',
          text: isArabic ? 'تم حفظ وتحديث صلاحيات الدور الوظيفي بنجاح' : 'Role permissions updated successfully'
        });
        setOriginalPermissions(new Set(activePermissions));
        setRoles(prev =>
          prev.map(r => (r.roleId === selectedRoleId ? { ...r, permissionCodes: Array.from(activePermissions) } : r))
        );
      } else {
        setStatusMsg({ type: 'error', text: res.message || 'Error saving permissions' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePermissionActive = async (permId: string) => {
    try {
      const res = await permissionsService.togglePermissionStatus(permId);
      if (res.success) {
        setModules(prev =>
          prev.map(m => ({
            ...m,
            permissions: m.permissions.map(p => (p.id === permId ? { ...p, isActive: res.data ?? !p.isActive } : p))
          }))
        );
      }
    } catch (err) {
      console.error('Error toggling permission status', err);
    }
  };

  const handleEvaluateScope = async () => {
    if (!evalUserId || !evalPermCode || !evalResourceId) {
      alert(isArabic ? 'يرجى اختيار المستخدم ونوع المورد وتحديده' : 'Please select user, resource type, and resource');
      return;
    }
    setEvaluating(true);
    setEvalResult(null);
    try {
      const res = await permissionsService.evaluateScope({
        userId: evalUserId,
        permissionCode: evalPermCode,
        resourceType: evalResourceType,
        resourceId: evalResourceId
      });
      if (res.success && res.data) {
        setEvalResult(res.data);
      }
    } catch (err) {
      console.error('Scope evaluation error', err);
    } finally {
      setEvaluating(false);
    }
  };

  const isDirty =
    activePermissions.size !== originalPermissions.size ||
    Array.from(activePermissions).some(p => !originalPermissions.has(p));

  const selectedRole = roles.find(r => r.roleId === selectedRoleId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900/70 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            {isArabic ? 'إدارة الصلاحيات الديناميكية ومحرك النطاق المركزي' : 'Dynamic Permissions & Scope Engine'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {isArabic
              ? 'تكوين مصفوفة الصلاحيات حسب الأدوار الوظيفية، والتحقق المركزي من نطاقات الوصول للمشاريع والمواقع والمستندات.'
              : 'Configure dynamic role-permission matrix and verify centralized resource scope resolution.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSandbox(!showSandbox)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
              showSandbox
                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-750'
            }`}
          >
            <Cpu className="w-4 h-4 text-indigo-500" />
            {isArabic ? 'محاكي فحص النطاق (Scope Engine Sandbox)' : 'Scope Engine Sandbox'}
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {isArabic ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2.5 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Scope Engine Tester Sandbox */}
      {showSandbox && (
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 dark:from-indigo-950/30 dark:to-blue-950/30 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold text-sm">
            <Cpu className="w-5 h-5 text-indigo-500" />
            <span>{isArabic ? 'محاكي تقييم النطاق المركزي (Centralized Scope Engine)' : 'Centralized Scope Engine Sandbox'}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-slate-300">
            {isArabic
              ? 'يتحقق المحرك مركزياً من صحة وصول المستخدم للمورد استناداً إلى هرمية المنظومة (Company -> Dept -> Team -> Project -> Site -> Task -> Document).'
              : 'The centralized engine dynamically evaluates access based on organizational hierarchy and permission inheritance.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* User */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                {isArabic ? 'المستخدم المراد اختباره:' : 'User:'}
              </label>
              <select
                value={evalUserId}
                onChange={e => setEvalUserId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-100"
              >
                <option value="">{isArabic ? '-- اختر المستخدم --' : '-- Select User --'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.roles.map(r => getRoleLabel(r, isArabic)).join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Permission Code */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                {isArabic ? 'الصلاحية المطلوبة:' : 'Permission:'}
              </label>
              <select
                value={evalPermCode}
                onChange={e => setEvalPermCode(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-100"
              >
                <option value="Projects.View">{isArabic ? 'Projects.View — عرض تفاصيل المشروع' : 'Projects.View (View Project)'}</option>
                <option value="Projects.Edit">{isArabic ? 'Projects.Edit — تعديل بيانات المشروع' : 'Projects.Edit (Edit Project)'}</option>
                <option value="Sites.View">{isArabic ? 'Sites.View — استعراض الموقع الميداني' : 'Sites.View (View Site)'}</option>
                <option value="Documents.View">{isArabic ? 'Documents.View — استعراض المستندات' : 'Documents.View (View Documents)'}</option>
                <option value="Documents.Upload">{isArabic ? 'Documents.Upload — رفع ملفات ومخططات' : 'Documents.Upload (Upload Documents)'}</option>
                <option value="Tasks.View">{isArabic ? 'Tasks.View — استعراض المهام والأنشطة' : 'Tasks.View (View Tasks)'}</option>
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                {isArabic ? 'نوع المورد:' : 'Resource Type:'}
              </label>
              <select
                value={evalResourceType}
                onChange={e => {
                  setEvalResourceType(e.target.value as ResourceHierarchyType);
                  setEvalResourceId('');
                }}
                className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-100"
              >
                <option value="Project">{isArabic ? 'مشروع هندسي (Project)' : 'Project'}</option>
                <option value="Site">{isArabic ? 'موقع ميداني (Site)' : 'Field Site'}</option>
                <option value="Document">{isArabic ? 'مستند أو مخطط (Document)' : 'Document'}</option>
                <option value="Task">{isArabic ? 'مهمة عمل (Task)' : 'Task'}</option>
              </select>
            </div>

            {/* Resource Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">
                {isArabic ? 'المورد المراد فحصه:' : 'Target Resource:'}
              </label>
              {evalResourceType === 'Project' && (
                <select
                  value={evalResourceId}
                  onChange={e => setEvalResourceId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-100"
                >
                  <option value="">{isArabic ? '-- اختر المشروع المطلوب --' : '-- Select Project --'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              )}
              {evalResourceType === 'Site' && (
                <select
                  value={evalResourceId}
                  onChange={e => setEvalResourceId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-100"
                >
                  <option value="">{isArabic ? '-- اختر الموقع المطلوب --' : '-- Select Site --'}</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              )}
              {evalResourceType !== 'Project' && evalResourceType !== 'Site' && (
                <input
                  type="text"
                  placeholder={isArabic ? 'مثال: DOC-2026-001 أو رمز المورد' : 'e.g. DOC-2026-001 or Resource Code'}
                  value={evalResourceId}
                  onChange={e => setEvalResourceId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-100"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleEvaluateScope}
              disabled={evaluating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {evaluating ? (isArabic ? 'جارٍ الفحص والتحليل...' : 'Evaluating...') : (isArabic ? 'فحص الصلاحية والنطاق' : 'Evaluate Access')}
            </button>
          </div>

          {evalResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              evalResult.hasAccess
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
            }`}>
              <div className="font-bold flex items-center gap-2 text-sm">
                {evalResult.hasAccess ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                {evalResult.hasAccess
                  ? (isArabic ? 'مسموح بالوصول وفق النطاق المحدد (Access Granted)' : 'Access Granted by Scope Engine')
                  : (isArabic ? 'ممنوع الوصول — خارج نطاق الصلاحيات المسندة (Access Denied)' : 'Access Denied by Scope Engine')}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-emerald-200/50 dark:border-slate-700">
                <div>
                  <strong>{isArabic ? 'الأدوار المسندة:' : 'Roles:'}</strong>{' '}
                  {evalResult.resolvedScopeContext.roles.map(r => getRoleLabel(r, isArabic)).join(', ') || (isArabic ? 'لا توجد' : 'None')}
                </div>
                <div>
                  <strong>{isArabic ? 'المشاريع المصرح بها مباشرة:' : 'Direct Authorized Projects:'}</strong> {evalResult.resolvedScopeContext.projectIds.length}
                </div>
                <div>
                  <strong>{isArabic ? 'المواقع المصرح بها مباشرة:' : 'Direct Authorized Sites:'}</strong> {evalResult.resolvedScopeContext.siteIds.length}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Roles List (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900/70 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              {isArabic ? 'الأدوار الوظيفية (Roles)' : 'System Roles'}
            </h3>
            <span className="text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded text-gray-600 dark:text-slate-300 font-mono">
              {roles.length}
            </span>
          </div>

          <div className="space-y-2">
            {roles.map(role => {
              const isSelected = role.roleId === selectedRoleId;
              return (
                <div
                  key={role.roleId}
                  onClick={() => handleSelectRole(role.roleId)}
                  className={`p-3.5 rounded-xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-sm ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-slate-200'}`}>
                      {getRoleLabel(role.roleName, isArabic)}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded-full font-mono text-gray-600 dark:text-slate-300">
                      {role.permissionCodes.length} {isArabic ? 'صلاحية' : 'perms'}
                    </span>
                  </div>
                  {role.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {role.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Permission Modules Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900/70 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
          {/* Header & Role Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
            <div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {isArabic ? 'تعديل صلاحيات الدور الوظيفي المختار:' : 'Editing permissions for role:'}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>{selectedRole ? getRoleLabel(selectedRole.roleName, isArabic) : (isArabic ? 'اختر دوراً' : 'Select a Role')}</span>
                <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full font-bold">
                  {activePermissions.size} {isArabic ? 'صلاحية مفعلة' : 'selected'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث بالاسم أو الرمز (مثال: Projects.View)...' : 'Search by name or code (e.g. Projects.View)...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs py-1.5 pl-3 pr-8 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleSaveRolePermissions}
                disabled={!isDirty || saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الصلاحيات' : 'Save Changes')}
              </button>
            </div>
          </div>

          {/* Module List with Toggles */}
          <div className="space-y-4 max-h-[650px] overflow-y-auto pr-1">
            {modules.map(mod => {
              const matchingPerms = mod.permissions.filter(
                p =>
                  (p?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                  (p?.code || '').toLowerCase().includes((searchQuery || '').toLowerCase())
              );

              if (searchQuery && matchingPerms.length === 0) return null;

              const allChecked = matchingPerms.every(p => activePermissions.has(p.code));

              return (
                <div
                  key={mod.module}
                  className="rounded-xl border border-gray-200 dark:border-slate-750 overflow-hidden bg-gray-50/50 dark:bg-slate-800/40"
                >
                  {/* Module Header */}
                  <div className="px-4 py-3 bg-gray-100/70 dark:bg-slate-800 flex justify-between items-center border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {getModuleLabel(mod.module, isArabic)}
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400 font-mono">
                        ({matchingPerms.length} {isArabic ? 'صلاحيات' : 'permissions'})
                      </span>
                    </div>

                    <button
                      onClick={() => toggleModuleAll(matchingPerms)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {allChecked ? (isArabic ? 'إلغاء تحديد الكل' : 'Deselect All') : (isArabic ? 'تحديد الكل' : 'Select All')}
                    </button>
                  </div>

                  {/* Permissions inside Module */}
                  <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {matchingPerms.map(p => {
                      const isGranted = activePermissions.has(p.code);
                      const display = getPermissionDisplay(p, isArabic);
                      return (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-lg border transition-all flex items-start justify-between gap-2 ${
                            isGranted
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                              : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                          }`}
                        >
                          <label className="flex items-start gap-2.5 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => togglePermission(p.code)}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            />
                            <div>
                              <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                <span>{display.name}</span>
                                {!p.isActive && (
                                  <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-[9px] rounded font-bold">
                                    {isArabic ? 'معطلة' : 'Inactive'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 dark:text-slate-400 font-mono mt-0.5">{p.code}</div>
                              {display.desc && (
                                <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {display.desc}
                                </div>
                              )}
                            </div>
                          </label>

                          <button
                            onClick={() => handleTogglePermissionActive(p.id)}
                            title={isArabic ? 'تفعيل / تعطيل الصلاحية في النظام ككل' : 'Toggle Global Active Status'}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                          >
                            {p.isActive ? <Lock className="w-3.5 h-3.5 text-emerald-500" /> : <Unlock className="w-3.5 h-3.5 text-amber-500" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
