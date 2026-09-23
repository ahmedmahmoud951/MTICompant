'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  ExternalLink,
  CloudSun,
  Users,
  CheckSquare,
  Building2,
  MapPin,
  User,
  ShieldCheck,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Image as ImageIcon
} from 'lucide-react';
import { AppModal } from '@/components/AppModal';
import { ProjectDataRecord, ProjectDataAttachment } from '@/types';
import { dataRecordService } from '@/services/data-records.service';

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string | null;
  initialRecord?: ProjectDataRecord | null;
  lang?: 'ar' | 'en';
  isAdmin?: boolean;
  onApprove?: (record: ProjectDataRecord, comment: string) => Promise<void>;
  onReject?: (record: ProjectDataRecord, comment: string) => Promise<void>;
  onRequestChanges?: (record: ProjectDataRecord, comment: string) => Promise<void>;
}

export function ReportDetailsModal({
  isOpen,
  onClose,
  recordId,
  initialRecord,
  lang = 'ar',
  isAdmin = false,
  onApprove,
  onReject,
  onRequestChanges
}: ReportDetailsModalProps) {
  const [record, setRecord] = useState<ProjectDataRecord | null>(initialRecord || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [approvalComment, setApprovalComment] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    if (!isOpen || !recordId) {
      if (!isOpen) {
        setRecord(null);
        setApprovalComment('');
        setPreviewImage(null);
      }
      return;
    }

    let isMounted = true;
    setLoading(true);

    dataRecordService
      .getRecordById(recordId)
      .then((data) => {
        if (isMounted) {
          if (data) {
            setRecord(data);
          } else if (initialRecord) {
            setRecord(initialRecord);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load record details:', err);
        if (isMounted && initialRecord) {
          setRecord(initialRecord);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, recordId, initialRecord]);

  if (!isOpen) return null;

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const parseDescription = (desc?: string) => {
    if (!desc) return null;
    const lines = desc.split('\n').map((l) => l.trim()).filter(Boolean);

    let category = '';
    let weather = '';
    let crew = '';
    let workDone = '';
    let notes = '';
    const otherLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('التصنيف:') || line.startsWith('Category:')) {
        category = line.replace(/^(التصنيف:|Category:)\s*/, '');
      } else if (line.startsWith('الطقس:') || line.startsWith('Weather:')) {
        weather = line.replace(/^(الطقس:|Weather:)\s*/, '');
      } else if (line.startsWith('عدد العمالة:') || line.startsWith('Crew count:')) {
        crew = line.replace(/^(عدد العمالة:|Crew count:)\s*/, '');
      } else if (line.startsWith('الأعمال المنفذة:') || line.startsWith('Work done:')) {
        workDone = line.replace(/^(الأعمال المنفذة:|Work done:)\s*/, '');
      } else if (line.startsWith('ملاحظات:') || line.startsWith('Notes:')) {
        notes = line.replace(/^(ملاحظات:|Notes:)\s*/, '');
      } else {
        otherLines.push(line);
      }
    }

    return { category, weather, crew, workDone, notes, otherLines, isStructured: Boolean(weather || crew || workDone || notes) };
  };

  const parsed = parseDescription(record?.description);

  const getFileIcon = (att: ProjectDataAttachment) => {
    const name = (att.fileName || att.originalFileName || '').toLowerCase();
    const type = (att.contentType || '').toLowerCase();

    if (name.endsWith('.pdf') || type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-rose-400" />;
    }
    if (name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/) || type.includes('image')) {
      return <ImageIcon className="w-5 h-5 text-cyan-400" />;
    }
    if (name.match(/\.(xls|xlsx|csv)$/) || type.includes('spreadsheet') || type.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    return <FileText className="w-5 h-5 text-slate-300" />;
  };

  const isImageFile = (att: ProjectDataAttachment) => {
    const name = (att.fileName || att.originalFileName || '').toLowerCase();
    const type = (att.contentType || '').toLowerCase();
    return Boolean(name.match(/\.(jpg|jpeg|png|webp|gif|svg)$/) || type.includes('image'));
  };

  const handleApprove = async () => {
    if (!record || !onApprove) return;
    try {
      setActionInProgress(true);
      await onApprove(record, approvalComment.trim());
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!record || !onReject) return;
    if (!approvalComment.trim()) {
      alert(isAr ? 'يرجى كتابة سبب الرفض في خانة الملاحظات' : 'Please provide a rejection reason in comments.');
      return;
    }
    try {
      setActionInProgress(true);
      await onReject(record, approvalComment.trim());
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!record || !onRequestChanges) return;
    if (!approvalComment.trim()) {
      alert(isAr ? 'يرجى تحديد التعديلات المطلوبة في خانة الملاحظات' : 'Please specify required changes in comments.');
      return;
    }
    try {
      setActionInProgress(true);
      await onRequestChanges(record, approvalComment.trim());
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to request changes');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {isAr ? 'معتمد ومحصن' : 'Approved & Immutable'}
          </span>
        );
      case 'Submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {isAr ? 'قيد المراجعة والاعتماد' : 'Pending Review'}
          </span>
        );
      case 'ChangesRequested':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/15 border border-orange-500/30 text-orange-300">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
            {isAr ? 'مطلوب تعديلات' : 'Changes Requested'}
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            {isAr ? 'مرفوض' : 'Rejected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 border border-slate-600/50 text-slate-300">
            {status || 'Draft'}
          </span>
        );
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      width="min(100%, 46rem)"
      title={isAr ? 'تفاصيل التقرير والبيانات الهندسية' : 'Report Details & Engineering Data'}
      icon={<FileText className="w-5 h-5 text-cyan-400" />}
      footer={
        <div className="space-y-3 w-full">
          {/* Admin Approval Actions Controls when status is Submitted */}
          {isAdmin && record?.status === 'Submitted' && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-2.5">
              <label className="block text-xs font-semibold text-slate-200">
                {isAr ? 'ملاحظات وتوجيهات الاعتماد (اختياري للاعتماد، مطلوب للرفض أو التعديل):' : 'Approval notes / guidance:'}
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب أي ملاحظات أو توجيهات للمهندس أو سبب الاعتماد/الرفض...'
                    : 'Add comments or justification...'
                }
                rows={2}
                disabled={actionInProgress}
                className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 rounded-xl text-slate-100 text-xs resize-none placeholder:text-slate-500"
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {onRequestChanges && (
                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={handleRequestChanges}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    {isAr ? 'طلب تعديل' : 'Request Changes'}
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={handleReject}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    {isAr ? 'رفض التقرير' : 'Reject'}
                  </button>
                )}
                {onApprove && (
                  <button
                    type="button"
                    disabled={actionInProgress}
                    onClick={handleApprove}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50"
                  >
                    {actionInProgress ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    )}
                    {isAr ? 'اعتماد التقرير الآن' : 'Approve Report Now'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-400">
              {record?.id ? `ID: ${record.id.slice(0, 8)}...` : ''}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      }
    >
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-medium">
            {isAr ? 'جاري تحميل تفاصيل ومرفقات التقرير…' : 'Loading report & attachments…'}
          </p>
        </div>
      ) : !record ? (
        <div className="py-12 text-center text-xs text-slate-400">
          {isAr ? 'تعذر العثور على بيانات التقرير' : 'Report data not found.'}
        </div>
      ) : (
        <div className="space-y-5 py-1">
          {/* Main Title & Status Card */}
          <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/80 border border-slate-700/70 space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                  {record.category || 'DailyReport'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-400">
                  v{record.version}
                </span>
              </div>
              <div>{getStatusBadge(record.status)}</div>
            </div>

            <h2 className="text-base md:text-lg font-bold text-slate-100 leading-snug">
              {record.title}
            </h2>

            {/* Metadata Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block">{isAr ? 'المشروع' : 'Project'}</span>
                  <span className="font-semibold text-slate-200">{record.projectName || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block">{isAr ? 'الموقع' : 'Site'}</span>
                  <span className="font-semibold text-slate-200">{record.siteName || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <User className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block">{isAr ? 'المسؤول / المهندس' : 'Submitter'}</span>
                  <span className="font-semibold text-slate-200">{record.submitterName || '—'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 text-[10px] block">{isAr ? 'تاريخ التقديم' : 'Submitted At'}</span>
                  <span className="font-semibold text-slate-200">
                    {record.submittedAt ? new Date(record.submittedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Field Conditions & Crew Breakdown */}
          {parsed?.isStructured && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 flex-shrink-0">
                  <CloudSun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">{isAr ? 'ظروف الطقس' : 'Weather'}</div>
                  <div className="text-xs font-bold text-slate-200">{parsed.weather || '—'}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-300 flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">{isAr ? 'حجم العمالة والطاقم' : 'Crew Count'}</div>
                  <div className="text-xs font-bold text-slate-200">{parsed.crew || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Work Performed Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
              <CheckSquare className="w-4 h-4" />
              <span>{isAr ? 'الأعمال المنفذة والبنود المنجزة' : 'Work Performed'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/60 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {parsed?.workDone || record.description || (isAr ? 'لا يوجد تفاصيل إضافية' : 'No description')}
            </div>
          </div>

          {/* Notes Section (if any) */}
          {parsed?.notes && (
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>{isAr ? 'ملاحظات ميدانية واحتياجات' : 'Field Notes'}</span>
              </div>
              <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {parsed.notes}
              </div>
            </div>
          )}

          {/* Other unstructured lines (if any) */}
          {parsed?.otherLines && parsed.otherLines.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap">
              {parsed.otherLines.join('\n')}
            </div>
          )}

          {/* Attachments Section */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>{isAr ? 'الملفات والمستندات الهندسية المرفقة' : 'Attached Documents & Media'}</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300">
                {record.attachments?.length || 0} {isAr ? 'ملفات' : 'files'}
              </span>
            </div>

            {!record.attachments || record.attachments.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                {isAr ? 'لا توجد ملفات مرفقة بهذا التقرير' : 'No attachments uploaded for this report.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {record.attachments.map((att, idx) => {
                  const fileName = att.originalFileName || att.fileName || `Attachment-${idx + 1}`;
                  const dlUrl = att.downloadUrl;
                  const isImg = isImageFile(att);

                  return (
                    <div
                      key={att.id || idx}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400/40 transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex-shrink-0">
                          {getFileIcon(att)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors" title={fileName}>
                            {fileName}
                          </h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {formatFileSize(att.fileSize)} &bull; {att.contentType || 'file'}
                          </span>
                        </div>
                      </div>

                      {/* Download & Preview Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        {isImg && dlUrl && (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(dlUrl)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
                            {isAr ? 'معاينة' : 'Preview'}
                          </button>
                        )}
                        {dlUrl ? (
                          <a
                            href={dlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={fileName}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-400/35 text-cyan-300 hover:text-cyan-100 text-[11px] font-bold transition-all"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {isAr ? 'تحميل الملف' : 'Download'}
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">
                            {isAr ? 'الرابط غير متاح' : 'URL unavailable'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Image Lightbox Preview if clicked */}
          {previewImage && (
            <div className="p-3 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">{isAr ? 'معاينة الصورة المرفقة' : 'Image Preview'}</span>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="text-xs text-rose-400 hover:text-rose-200"
                >
                  {isAr ? 'إغلاق المعاينة' : 'Close preview'}
                </button>
              </div>
              <div className="flex justify-center p-2 bg-slate-900 rounded-xl overflow-hidden max-h-80">
                <img src={previewImage} alt="Attachment Preview" className="max-h-72 object-contain rounded-lg" />
              </div>
            </div>
          )}

          {/* Approval History Timeline (if any approvals logged) */}
          {record.approvals && record.approvals.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'سجل القرارات والاعتماد' : 'Decision & Approval History'}</span>
              </div>
              <div className="divide-y divide-slate-800">
                {record.approvals.map((app) => (
                  <div key={app.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          app.action === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : app.action === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-300'
                            : app.action === 'ChangesRequested'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {app.action}
                        </span>
                        <span className="font-semibold text-slate-200">{app.performerName}</span>
                      </div>
                      {app.comment && (
                        <p className="text-slate-400 mt-1 text-[11px] italic bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                          &ldquo;{app.comment}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(app.performedAt).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AppModal>
  );
}
