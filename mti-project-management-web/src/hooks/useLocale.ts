'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

/**
 * WEB-I18N: Centralized locale utilities.
 * Provides direction-aware formatting for dates, numbers, and currency
 * without duplicating pages. A single component calls useLocale() and
 * renders correctly in both Arabic and English.
 */
export function useLocale() {
  const { t } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'ar';
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  /** I18N-01: Localized date formatting */
  const formatDate = (date: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options,
    }).format(d);
  };

  /** I18N-01: Localized date+time formatting */
  const formatDateTime = (date: string | Date | null | undefined): string => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  /** I18N-01: Relative time (e.g. "قبل 3 ساعات" / "3 hours ago") */
  const formatRelativeTime = (date: string | Date | null | undefined): string => {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    const rtf = new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-EG' : 'en', { numeric: 'auto' });

    if (diffSec < 60) return rtf.format(-diffSec, 'second');
    if (diffMin < 60) return rtf.format(-diffMin, 'minute');
    if (diffHr < 24) return rtf.format(-diffHr, 'hour');
    return rtf.format(-diffDay, 'day');
  };

  /** I18N-01: Localized number formatting */
  const formatNumber = (n: number | null | undefined, options?: Intl.NumberFormatOptions): string => {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', options).format(n);
  };

  /** I18N-01: Currency formatting */
  const formatCurrency = (amount: number | null | undefined, currency = 'EGP'): string => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  /** Duration from seconds to human-readable */
  const formatDuration = (seconds: number): string => {
    if (seconds <= 0) return lang === 'ar' ? 'منتهية' : 'Overdue';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (lang === 'ar') {
      if (days > 0) return `${formatNumber(days)} يوم`;
      if (hrs > 0) return `${formatNumber(hrs)} ساعة`;
      return `${formatNumber(mins)} دقيقة`;
    } else {
      if (days > 0) return `${days}d`;
      if (hrs > 0) return `${hrs}h`;
      return `${mins}m`;
    }
  };

  return {
    lang,
    isRtl,
    dir,
    t,
    formatDate,
    formatDateTime,
    formatRelativeTime,
    formatNumber,
    formatCurrency,
    formatDuration,
  };
}
