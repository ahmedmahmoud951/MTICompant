'use client';

/**
 * WEB-I18N: Central i18n configuration (browser / Client Components only).
 * - Arabic is the default language.
 * - Languages loaded from /public/locales/{lang}/translation.json via HTTP backend.
 * - Direction is managed by the LanguageProvider (rtl/ltr).
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const initialLng =
  typeof window !== 'undefined'
    ? localStorage.getItem('mti-language') || 'ar'
    : 'ar';

if (!i18n.isInitialized) {
  i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: initialLng,
      fallbackLng: 'ar',
      supportedLngs: ['ar', 'en'],
      defaultNS: 'translation',
      ns: ['translation'],

      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'mti-language',
      },

      interpolation: {
        escapeValue: false,
      },

      // Avoid Suspense barriers during Next.js client hydration
      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
