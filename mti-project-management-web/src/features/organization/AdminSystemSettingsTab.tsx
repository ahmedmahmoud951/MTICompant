'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Globe,
  FileText,
  HardDrive,
  CheckSquare,
  Bell,
  MessageSquare,
  Compass,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { Language } from '@/lib/i18n';

interface AdminSystemSettingsTabProps {
  lang: Language;
}

interface SettingItem {
  category: string;
  key: string;
  value: string;
  description?: string;
}

export function AdminSystemSettingsTab({ lang }: AdminSystemSettingsTabProps) {
  const isArabic = lang === 'ar';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({});

  const loadSettings = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiClient.get<Record<string, Record<string, string>>>('/api/settings/system-config');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isArabic ? 'فشل تحميل إعدادات النظام' : 'Failed to load system settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (category: string, key: string, val: string) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [key]: val
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const items: SettingItem[] = [];
      Object.entries(settings).forEach(([category, catSettings]) => {
        Object.entries(catSettings).forEach(([key, val]) => {
          items.push({ category, key, value: String(val) });
        });
      });

      await apiClient.put('/api/settings/bulk', items);
      setSuccessMsg(isArabic ? 'تم حفظ وتحديث إعدادات النظام بنجاح' : 'System settings saved successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || (isArabic ? 'فشل حفظ الإعدادات' : 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const getVal = (cat: string, k: string, fallback: string = '') => {
    return settings[cat]?.[k] ?? fallback;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
        <span className="text-xs text-slate-400">{isArabic ? 'جاري تحميل الإعدادات المركزية…' : 'Loading enterprise configuration…'}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {isArabic ? 'إعدادات النظام والمنصة المركزية' : 'Enterprise System & Platform Settings'}
            </h2>
            <p className="text-xs text-slate-400">
              {isArabic ? 'التحكم الشامل في قواعد العمل، سياسات التخزين، المخططات، واللغات' : 'Configure company branding, storage policies, drawings, and workflows'}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] hover:brightness-110 disabled:opacity-60 shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? (isArabic ? 'جاري الحفظ…' : 'Saving…') : (isArabic ? 'حفظ كافة الإعدادات' : 'Save All Settings')}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

        {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Company Branding */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Building className="w-4 h-4" />
            <span>{isArabic ? 'هوية الشركة والشعار' : 'Company Branding'}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'اسم الشركة الرسمي' : 'Company Name'}
              </label>
              <input
                type="text"
                value={getVal('Company', 'CompanyName', 'MTI Engineering Solutions')}
                onChange={(e) => handleChange('Company', 'CompanyName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'مسار الشعار' : 'Logo Path'}
              </label>
              <input
                type="text"
                value={getVal('Company', 'LogoUrl', '/images/CompanyLogo.png')}
                onChange={(e) => handleChange('Company', 'LogoUrl', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Localization Settings */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Globe className="w-4 h-4" />
            <span>{isArabic ? 'إعدادات اللغة والمنطقة' : 'Localization'}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'اللغة الافتراضية' : 'Default Language'}
              </label>
              <select
                value={getVal('Localization', 'DefaultLanguage', 'ar')}
                onChange={(e) => handleChange('Localization', 'DefaultLanguage', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="ar">{isArabic ? 'العربية' : 'Arabic'}</option>
                <option value="en">{isArabic ? 'الإنجليزية' : 'English'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'صيغة التاريخ' : 'Date Format'}
              </label>
              <input
                type="text"
                value={getVal('Localization', 'DefaultDateFormat', 'YYYY-MM-DD')}
                onChange={(e) => handleChange('Localization', 'DefaultDateFormat', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 3. Document Policy & Edit Window */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <FileText className="w-4 h-4" />
            <span>{isArabic ? 'سياسات المستندات ونافذة التعديل' : 'Documents & Edit Window'}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'مهلة تعديل المستند المرفوع (ساعات)' : 'Document Edit Window (Hours)'}
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={getVal('Documents', 'EditWindowHours', '24')}
                onChange={(e) => handleChange('Documents', 'EditWindowHours', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'تفعيل مسار الاعتمادات الإلزامي' : 'Approval Workflow Enabled'}</span>
              <input
                type="checkbox"
                checked={getVal('Documents', 'ApprovalWorkflowEnabled', 'true') === 'true'}
                onChange={(e) => handleChange('Documents', 'ApprovalWorkflowEnabled', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>
          </div>
        </div>

        {/* 4. Storage & Backblaze B2 Limits */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <HardDrive className="w-4 h-4" />
            <span>{isArabic ? 'حدود التخزين والملفات' : 'Storage & File Limits'}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'الحد الأقصى لحجم الملف (ميجابايت)' : 'Max File Size (MB)'}
              </label>
              <input
                type="number"
                min="1"
                max="1024"
                value={getVal('Storage', 'MaxFileSizeMB', '100')}
                onChange={(e) => handleChange('Storage', 'MaxFileSizeMB', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'امتدادات الملفات المسموح بها' : 'Allowed File Extensions'}
              </label>
              <input
                type="text"
                value={getVal('Storage', 'AllowedFileExtensions', '.pdf,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.png,.jpg,.jpeg,.mp4')}
                onChange={(e) => handleChange('Storage', 'AllowedFileExtensions', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 5. Tasks Workflow */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <CheckSquare className="w-4 h-4" />
            <span>{isArabic ? 'إعدادات مسار المهام' : 'Tasks Workflow'}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'الأولوية الافتراضية' : 'Default Priority'}
              </label>
              <select
                value={getVal('Tasks', 'DefaultPriority', 'Medium')}
                onChange={(e) => handleChange('Tasks', 'DefaultPriority', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              >
                <option value="Low">{isArabic ? 'منخفضة' : 'Low'}</option>
                <option value="Medium">{isArabic ? 'متوسطة' : 'Medium'}</option>
                <option value="High">{isArabic ? 'عالية' : 'High'}</option>
                <option value="Urgent">{isArabic ? 'عاجلة' : 'Urgent'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isArabic ? 'حالات المهام المسموح بها' : 'Allowed Task Statuses'}
              </label>
              <input
                type="text"
                value={getVal('Tasks', 'AllowedStatuses', 'Pending,InProgress,UnderReview,Completed,Cancelled')}
                onChange={(e) => handleChange('Tasks', 'AllowedStatuses', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-600/60 rounded-xl text-white text-xs focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 6. Engineering Drawings & Revisions */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>{isArabic ? 'سياسات المخططات الهندسية' : 'Drawing Settings'}</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'طلب الاعتماد الفني قبل النشر' : 'Require Approval Before Publish'}</span>
              <input
                type="checkbox"
                checked={getVal('Drawings', 'RequireApprovalBeforePublish', 'true') === 'true'}
                onChange={(e) => handleChange('Drawings', 'RequireApprovalBeforePublish', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'تأمين المخططات المعتمدة ضد الحذف والتعديل' : 'Lock Approved Revisions as Read-Only'}</span>
              <input
                type="checkbox"
                checked={getVal('Drawings', 'LockApprovedRevisions', 'true') === 'true'}
                onChange={(e) => handleChange('Drawings', 'LockApprovedRevisions', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>
          </div>
        </div>

        {/* 7. Chat Channels & Realtime */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <MessageSquare className="w-4 h-4" />
            <span>{isArabic ? 'سياسات وقنوات المحادثة' : 'Chat Settings'}</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'تفعيل قنوات المشاريع التلقائية (CHAT-02)' : 'Enable Auto Project Channels'}</span>
              <input
                type="checkbox"
                checked={getVal('Chat', 'ProjectChannelsEnabled', 'true') === 'true'}
                onChange={(e) => handleChange('Chat', 'ProjectChannelsEnabled', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'السماح بالمحادثات المباشرة بين الأعضاء' : 'Allow Direct Messages'}</span>
              <input
                type="checkbox"
                checked={getVal('Chat', 'DirectMessagesEnabled', 'true') === 'true'}
                onChange={(e) => handleChange('Chat', 'DirectMessagesEnabled', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>
          </div>
        </div>

        {/* 8. Notification Rules */}
        <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-700/50 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-700/50 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Bell className="w-4 h-4" />
            <span>{isArabic ? 'قواعد الإشعارات الفورية' : 'Notification Rules'}</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'الإشعارات الفورية الحية (SignalR)' : 'In-App Realtime Notifications'}</span>
              <input
                type="checkbox"
                checked={getVal('Notifications', 'InAppNotificationsEnabled', 'true') === 'true'}
                onChange={(e) => handleChange('Notifications', 'InAppNotificationsEnabled', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40">
              <span className="text-xs text-slate-300">{isArabic ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}</span>
              <input
                type="checkbox"
                checked={getVal('Notifications', 'EmailNotificationsEnabled', 'true') === 'true'}
                onChange={(e) => handleChange('Notifications', 'EmailNotificationsEnabled', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
