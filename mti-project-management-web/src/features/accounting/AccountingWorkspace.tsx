'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Download,
  ShieldCheck,
  Building,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  Calculator,
  Coins,
  BarChart3,
  Settings,
  Wallet,
} from 'lucide-react';
import { accountingService, CreateInvoicePayload } from '@/services/accounting.service';
import { signalRService } from '@/services/signalr.service';
import { AppModal } from '@/components/AppModal';
import { ActionLoadingBar } from '@/components/ActionLoadingBar';
import {
  AccountingDashboardStatsDto,
  AccountingInvoiceDto,
  ApprovedBoqSummaryDto,
  CommercialDocumentDto,
  Project,
  User,
  InvoiceStatus
} from '@/types';
import { Language, getTranslation, formatDateCairo } from '@/lib/i18n';

interface AccountingWorkspaceProps {
  currentUser: User | null;
  projects: Project[];
  lang: Language;
}

export const AccountingWorkspace: React.FC<AccountingWorkspaceProps> = ({
  currentUser,
  projects,
  lang
}) => {
  const [stats, setStats] = useState<AccountingDashboardStatsDto | null>(null);
  const [invoices, setInvoices] = useState<AccountingInvoiceDto[]>([]);
  const [approvedBoqs, setApprovedBoqs] = useState<ApprovedBoqSummaryDto[]>([]);
  const [commercialDocs, setCommercialDocs] = useState<CommercialDocumentDto[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'boqs' | 'commercial' | 'purchase-orders' | 'payments'>('invoices');

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateInvoicePayload>({
    projectId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    amount: 0,
    tax: 0,
    currency: 'EGP',
    notes: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const t = (k: any) => getTranslation(k, lang);
  const isArabic = lang === 'ar';

  useEffect(() => {
    loadData();
  }, [selectedProjectId, selectedStatus]);

  useEffect(() => {
    const unsub1 = signalRService.on('InvoiceCreated', loadData);
    const unsub2 = signalRService.on('InvoiceUpdated', loadData);
    const unsub3 = signalRService.on('PaymentCreated', loadData);
    const unsub4 = signalRService.on('BoqApproved', loadData);
    const unsub5 = signalRService.on('AccountingUpdated', loadData);
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
    };
  }, [selectedProjectId, selectedStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, invoicesRes, boqsRes, commRes, poRes, payRes] = await Promise.all([
        accountingService.getDashboardStats(),
        accountingService.getInvoices({
          projectId: selectedProjectId || undefined,
          status: (selectedStatus as InvoiceStatus) || undefined
        }),
        accountingService.getApprovedBoqs(selectedProjectId || undefined),
        accountingService.getCommercialDocuments(selectedProjectId || undefined),
        accountingService.getPurchaseOrders(),
        accountingService.getPayments(selectedProjectId || undefined)
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (invoicesRes.success && invoicesRes.data) setInvoices(invoicesRes.data);
      if (boqsRes.success && boqsRes.data) setApprovedBoqs(boqsRes.data);
      if (commRes.success && commRes.data) setCommercialDocs(commRes.data);
      if (poRes.success && poRes.data) setPurchaseOrders(poRes.data);
      else setPurchaseOrders([]);
      if (payRes.success && payRes.data) setPayments(payRes.data);
      else setPayments([]);
    } catch (err) {
      console.error('Failed to load accounting data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.projectId || !createForm.invoiceNumber || createForm.amount <= 0) {
      setActionError(isArabic ? 'يرجى استيفاء البيانات الإلزامية' : 'Please fill required fields');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      const payload = {
        ...createForm,
        invoiceDate: createForm.invoiceDate
          ? new Date(createForm.invoiceDate).toISOString()
          : new Date().toISOString(),
        dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : undefined,
      };
      const res = await accountingService.createInvoice(payload);
      if (res.success) {
        setActionSuccess(isArabic ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
        setShowCreateModal(false);
        setCreateForm({
          projectId: '',
          invoiceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: '',
          amount: 0,
          tax: 0,
          currency: 'EGP',
          notes: ''
        });
        loadData();
        signalRService.emit('InvoiceCreated', res.data);
        signalRService.emit('AccountingUpdated');
        signalRService.emit('AdminStatsUpdated');
      } else {
        setActionError(res.message || 'Creation failed');
      }
    } catch (err: any) {
      setActionError(err.message || 'Creation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: InvoiceStatus) => {
    try {
      const res = await accountingService.updateInvoiceStatus(id, { status: newStatus });
      if (res.success) {
        loadData();
        signalRService.emit('InvoiceUpdated', { id, status: newStatus });
        signalRService.emit('AccountingUpdated');
        signalRService.emit('AdminStatsUpdated');
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.projectName.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{status}</span>;
      case 'Approved':
      case 'Sent':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{status}</span>;
      case 'Overdue':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">{status}</span>;
      case 'PartiallyPaid':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">{status}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  const formatMoney = (n?: number) => `${(n ?? 0).toLocaleString()} EGP`;

  const Spark = ({ color }: { color: string }) => (
    <svg viewBox="0 0 120 28" className="w-full h-7 mt-2" preserveAspectRatio="none" aria-hidden>
      <path
        d="M0,22 C20,18 28,8 45,12 C62,16 70,6 88,10 C100,13 110,18 120,8 L120,28 L0,28 Z"
        fill={color}
        fillOpacity="0.25"
      />
      <path
        d="M0,22 C20,18 28,8 45,12 C62,16 70,6 88,10 C100,13 110,18 120,8"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  const kpiCards = [
    {
      title: t('approvedBoqs'),
      value: formatMoney(stats?.totalApprovedBoqValue),
      sub: `${stats?.approvedBoqCount ?? 0} ${isArabic ? 'مقايسة معتمدة' : 'approved BOQs'}`,
      color: '#fb923c',
      icon: FileSpreadsheet,
    },
    {
      title: t('totalOverdue'),
      value: formatMoney(stats?.totalOverdueAmount),
      sub: `${stats?.overdueInvoicesCount ?? 0} ${isArabic ? 'متأخرة' : 'overdue'}`,
      color: '#f87171',
      icon: Wallet,
    },
    {
      title: t('totalDue'),
      value: formatMoney(stats?.totalDueAmount),
      sub: `${stats?.dueInvoicesCount ?? 0} ${isArabic ? 'فاتورة مستحقة' : 'due'}`,
      color: '#2dd4bf',
      icon: Clock,
    },
    {
      title: t('totalPaid'),
      value: formatMoney(stats?.totalPaidAmount),
      sub: isArabic ? 'تم التحصيل' : 'Collected',
      color: '#a78bfa',
      icon: CheckCircle2,
    },
    {
      title: t('totalInvoiced'),
      value: formatMoney(stats?.totalInvoicedAmount),
      sub: `${stats?.totalInvoicesCount ?? 0} ${isArabic ? 'فاتورة' : 'invoices'}`,
      color: '#38bdf8',
      icon: Receipt,
    },
  ];

  const openCreate = () => {
    setActionError('');
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-5 pb-2">
      {/* Hero */}
      <section className="company-hero border border-cyan-400/30 shadow-[0_0_40px_rgba(14,165,233,0.2)]">
        <img src="/images/Company.png" alt="" className="company-hero-img" aria-hidden />
        <div className="company-hero-veil" aria-hidden />
        <div className="company-hero-content">
          <div className="company-hero-slot company-hero-slot-start">
            <div className="company-hero-glass max-w-sm">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 w-fit">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('accountingSecureBadge')}
              </span>
              <h2 className="font-display text-base sm:text-xl font-bold text-white leading-snug">
                {t('accountingTitle')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-100/95 leading-relaxed">
                {t('accountingSubtitle')}
              </p>
            </div>
          </div>

          <div className="company-hero-slot company-hero-slot-center" aria-hidden />

          <div className="company-hero-slot company-hero-slot-end">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee] shadow-[0_0_24px_rgba(14,165,233,0.5)] hover:brightness-110"
            >
              <Plus className="w-4 h-4" />
              {t('createInvoice')}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.25)]">
            <Coins className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_14px_rgba(14,165,233,0.25)]">
            <Calculator className="w-4 h-4" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.25)]">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>
        <div className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] tracking-[0.16em] uppercase text-cyan-100 font-bold bg-[#0b1526]/85 border border-cyan-400/30">
          Accuracy · Control · Growth
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="accounting-panel rounded-2xl p-3.5 text-start"
              style={{
                borderColor: `${card.color}55`,
                boxShadow: `0 0 22px ${card.color}18`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{
                    color: card.color,
                    background: `${card.color}18`,
                    borderColor: `${card.color}44`,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  className="p-1 rounded-lg text-slate-500 hover:text-cyan-300"
                  title={isArabic ? 'تحديث' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-2">{card.title}</div>
              <div className="text-lg font-bold text-slate-50 tabular-nums mt-0.5">{card.value}</div>
              <div className="text-[10px] mt-0.5 font-medium" style={{ color: card.color }}>
                {card.sub}
              </div>
              <Spark color={card.color} />
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="accounting-panel rounded-2xl overflow-hidden">
        <div className="flex flex-wrap gap-1 px-2 pt-2 border-b border-slate-700/60">
          {(
            [
              { id: 'invoices' as const, label: t('invoices'), count: invoices.length, icon: Receipt },
              { id: 'boqs' as const, label: t('approvedBoqs'), count: approvedBoqs.length, icon: FileSpreadsheet },
              { id: 'commercial' as const, label: t('commercialDocuments'), count: commercialDocs.length, icon: FileText },
              { id: 'purchase-orders' as const, label: t('purchaseOrdersTab'), count: purchaseOrders.length, icon: Building },
              { id: 'payments' as const, label: t('paymentsTab'), count: payments.length, icon: TrendingUp },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const on = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  on
                    ? 'border-cyan-400 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isArabic ? 'بحث برقم الفاتورة أو المشروع…' : 'Search invoice # or project…'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-9 pe-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100"
              >
                <option value="">{isArabic ? 'كل الحالات' : 'All statuses'}</option>
                <option value="Draft">{isArabic ? 'مسودة' : 'Draft'}</option>
                <option value="PendingApproval">{isArabic ? 'بانتظار الاعتماد' : 'Pending Approval'}</option>
                <option value="Approved">{isArabic ? 'معتمد' : 'Approved'}</option>
                <option value="Sent">{isArabic ? 'مُرسل' : 'Sent'}</option>
                <option value="Paid">{isArabic ? 'مدفوع' : 'Paid'}</option>
                <option value="PartiallyPaid">{isArabic ? 'مدفوع جزئياً' : 'Partially Paid'}</option>
                <option value="Overdue">{isArabic ? 'متأخر السداد' : 'Overdue'}</option>
                <option value="Cancelled">{isArabic ? 'ملغي' : 'Cancelled'}</option>
              </select>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-cyan-400/25 text-sm text-slate-100"
              >
                <option value="">{isArabic ? 'كل المشاريع' : 'All projects'}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-700/60">
              <table className="w-full text-sm text-slate-300">
                <thead className="bg-slate-950/70 text-[11px] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-start">{t('invoiceNumber')}</th>
                    <th className="px-4 py-3 text-start">{t('navProjects')}</th>
                    <th className="px-4 py-3 text-start">{t('invoiceDate')}</th>
                    <th className="px-4 py-3 text-start">{t('dueDate')}</th>
                    <th className="px-4 py-3 text-start">{t('amount')}</th>
                    <th className="px-4 py-3 text-start">{t('total')}</th>
                    <th className="px-4 py-3 text-start">{t('status')}</th>
                    <th className="px-4 py-3 text-end">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-[0_0_28px_rgba(14,165,233,0.25)]">
                            <Receipt className="w-8 h-8" />
                          </div>
                          <p className="text-sm text-slate-300 font-semibold">{t('accountingEmptyInvoices')}</p>
                          <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-l from-[#0284c7] to-[#22d3ee]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t('createInvoice')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/35 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-100">
                          <span className="inline-flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-cyan-400" />
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{inv.projectName}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{formatDateCairo(inv.invoiceDate)}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {inv.dueDate ? formatDateCairo(inv.dueDate) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">
                          {inv.amount.toLocaleString()} {inv.currency}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                          {inv.total.toLocaleString()} {inv.currency}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(inv.status)}</td>
                        <td className="px-4 py-3 text-end space-x-2 rtl:space-x-reverse">
                          {inv.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(inv.id, 'Paid')}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            >
                              {isArabic ? 'تم التحصيل' : 'Mark Paid'}
                            </button>
                          )}
                          {inv.downloadUrl && (
                            <a
                              href={inv.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'boqs' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-[11px] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-start">{isArabic ? 'كود البند' : 'Item Code'}</th>
                  <th className="px-4 py-3 text-start">{t('navProjects')}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'الوحدة' : 'Unit'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'الكمية' : 'Quantity'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'سعر الوحدة' : 'Unit Price'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {approvedBoqs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      {isArabic ? 'لا توجد مقايسات BOQ معتمدة' : 'No approved BOQ items found.'}
                    </td>
                  </tr>
                ) : (
                  approvedBoqs.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/35">
                      <td className="px-4 py-3 font-semibold text-cyan-300">{b.itemCode}</td>
                      <td className="px-4 py-3">{b.projectName}</td>
                      <td className="px-4 py-3">{b.description}</td>
                      <td className="px-4 py-3 text-slate-400">{b.unit}</td>
                      <td className="px-4 py-3 font-mono">{b.quantity}</td>
                      <td className="px-4 py-3 font-mono">{b.unitPrice.toLocaleString()} EGP</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {b.totalPrice.toLocaleString()} EGP
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'commercial' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-[11px] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-start">{isArabic ? 'عنوان العرض' : 'Title'}</th>
                  <th className="px-4 py-3 text-start">{t('navProjects')}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'القيمة' : 'Amount'}</th>
                  <th className="px-4 py-3 text-start">{t('status')}</th>
                  <th className="px-4 py-3 text-end">{isArabic ? 'تحميل' : 'Download'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {commercialDocs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      {isArabic ? 'لا توجد مستندات تجارية' : 'No commercial documents found.'}
                    </td>
                  </tr>
                ) : (
                  commercialDocs.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/35">
                      <td className="px-4 py-3 font-semibold text-slate-100">{c.title}</td>
                      <td className="px-4 py-3">{c.projectName}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{c.documentType}</td>
                      <td className="px-4 py-3 font-mono font-bold text-cyan-300">
                        {c.amount.toLocaleString()} {c.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                          {c.status} (v{c.version})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-end">
                        {c.downloadUrl && (
                          <a
                            href={c.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'purchase-orders' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-[11px] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-start">{isArabic ? 'رقم الأمر' : 'PO #'}</th>
                  <th className="px-4 py-3 text-start">{t('navProjects')}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'المورد' : 'Vendor'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-start">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      {isArabic ? 'لا توجد أوامر شراء' : 'No purchase orders found.'}
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po: any, idx: number) => (
                    <tr key={po.id || idx} className="hover:bg-slate-800/35">
                      <td className="px-4 py-3 font-semibold text-slate-100">{po.number || po.poNumber || '—'}</td>
                      <td className="px-4 py-3">{po.projectName || '—'}</td>
                      <td className="px-4 py-3 text-slate-400">{po.vendor || po.vendorName || '—'}</td>
                      <td className="px-4 py-3 font-mono text-cyan-300">
                        {po.amount?.toLocaleString?.() ?? '—'}
                      </td>
                      <td className="px-4 py-3">{po.status || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-[11px] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-start">{t('invoiceNumber')}</th>
                  <th className="px-4 py-3 text-start">{t('navProjects')}</th>
                  <th className="px-4 py-3 text-start">{t('amount')}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'تاريخ الدفع' : 'Paid Date'}</th>
                  <th className="px-4 py-3 text-start">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      {isArabic ? 'لا توجد مدفوعات مسجّلة' : 'No payments found.'}
                    </td>
                  </tr>
                ) : (
                  payments.map((p: any, idx: number) => (
                    <tr key={p.id || idx} className="hover:bg-slate-800/35">
                      <td className="px-4 py-3 font-semibold text-slate-100">{p.invoiceNumber || '—'}</td>
                      <td className="px-4 py-3">{p.projectName || '—'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        {p.amount?.toLocaleString?.() ?? '—'} {p.currency || 'EGP'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {p.paidDate ? formatDateCairo(p.paidDate) : '—'}
                      </td>
                      <td className="px-4 py-3">{p.status || 'Paid'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, title: t('accountingFeatReports'), desc: t('accountingFeatReportsDesc') },
          { icon: ShieldCheck, title: t('accountingFeatSecure'), desc: t('accountingFeatSecureDesc') },
          { icon: Clock, title: t('accountingFeatMonitor'), desc: t('accountingFeatMonitorDesc') },
          { icon: Settings, title: t('accountingFeatIntegrate'), desc: t('accountingFeatIntegrateDesc') },
        ].map((feat) => {
          const Icon = feat.icon;
          return (
            <div key={feat.title} className="accounting-panel rounded-2xl p-4 text-start space-y-2">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-slate-100">{feat.title}</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Create Invoice Modal */}
      <AppModal
        open={showCreateModal}
        onClose={() => !actionLoading && setShowCreateModal(false)}
        title={t('createInvoice')}
        width="min(100%, 32rem)"
        closeDisabled={actionLoading}
        icon={
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
            <Receipt className="w-4 h-4" />
          </div>
        }
      >
        {actionError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {actionError}
          </div>
        )}

        <form onSubmit={handleCreateInvoice} className="space-y-3.5">
          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              {t('navProjects')} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              disabled={actionLoading}
              value={createForm.projectId}
              onChange={(e) => setCreateForm({ ...createForm, projectId: e.target.value })}
              className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
            >
              <option value="">{isArabic ? 'اختر المشروع...' : 'Select project...'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              {t('invoiceNumber')} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              disabled={actionLoading}
              placeholder="e.g. INV-2026-001"
              value={createForm.invoiceNumber}
              onChange={(e) => setCreateForm({ ...createForm, invoiceNumber: e.target.value })}
              className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                {t('invoiceDate')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                disabled={actionLoading}
                value={createForm.invoiceDate}
                onChange={(e) => setCreateForm({ ...createForm, invoiceDate: e.target.value })}
                className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t('dueDate')}</label>
              <input
                type="date"
                disabled={actionLoading}
                value={createForm.dueDate || ''}
                onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                {t('amount')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                disabled={actionLoading}
                value={createForm.amount}
                onChange={(e) => setCreateForm({ ...createForm, amount: parseFloat(e.target.value) || 0 })}
                className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
            </div>
            <div className="text-start">
              <label className="block text-xs font-semibold text-slate-200 mb-1.5">{t('tax')}</label>
              <input
                type="number"
                step="0.01"
                disabled={actionLoading}
                value={createForm.tax}
                onChange={(e) => setCreateForm({ ...createForm, tax: parseFloat(e.target.value) || 0 })}
                className="field-input w-full px-3 py-2.5 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="text-start">
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              {isArabic ? 'ملاحظات' : 'Notes'}
            </label>
            <textarea
              rows={2}
              disabled={actionLoading}
              value={createForm.notes || ''}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              className="field-input w-full px-3 py-2.5 rounded-xl text-sm resize-y"
            />
          </div>

          <ActionLoadingBar
            active={actionLoading}
            isArabic={isArabic}
            label={isArabic ? 'جاري تسجيل وتدقيق الفاتورة المالية…' : 'Saving financial invoice…'}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/50">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 disabled:opacity-50"
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-l from-[#0284c7] to-[#22d3ee] hover:brightness-110 disabled:opacity-60 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)]"
            >
              {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              {actionLoading
                ? isArabic
                  ? 'جاري الحفظ…'
                  : 'Saving…'
                : isArabic
                  ? 'حفظ الفاتورة'
                  : 'Save Invoice'}
            </button>
          </div>
        </form>
      </AppModal>
    </div>
  );
};
