'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'dropdown' | 'toggle';
}

/**
 * WEB-I18N: Language switcher component.
 * Changing language updates: RTL/LTR, text, date/number formatting,
 * toast messages, and notifications — WITHOUT page duplication.
 */
export function LanguageSwitcher({ className = '', variant = 'toggle' }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'ar';
  const isArabic = currentLang === 'ar';

  const switchLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    localStorage.setItem('mti-language', lang);

    // Update document direction
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;

    // Persist to API if user is logged in
    const token = localStorage.getItem('mti-token');
    if (token) {
      fetch('/api/languages/preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ languageCode: lang }),
      }).catch(() => {}); // Non-critical
    }
  };

  // Sync direction on mount
  useEffect(() => {
    const dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  if (variant === 'toggle') {
    return (
      <button
        id="language-switcher"
        onClick={() => switchLanguage(isArabic ? 'en' : 'ar')}
        className={`lang-switcher-btn ${className}`}
        title={t('language.switch')}
        aria-label={t('language.switch')}
      >
        <span className="lang-icon">🌐</span>
        <span className="lang-label">
          {isArabic ? 'English' : 'العربية'}
        </span>
      </button>
    );
  }

  return (
    <div className={`lang-dropdown ${className}`} id="language-dropdown">
      <button
        className={`lang-option ${isArabic ? 'active' : ''}`}
        onClick={() => switchLanguage('ar')}
        id="lang-ar-btn"
      >
        <span>🇸🇦</span> العربية
      </button>
      <button
        className={`lang-option ${!isArabic ? 'active' : ''}`}
        onClick={() => switchLanguage('en')}
        id="lang-en-btn"
      >
        <span>🇬🇧</span> English
      </button>
    </div>
  );
}
