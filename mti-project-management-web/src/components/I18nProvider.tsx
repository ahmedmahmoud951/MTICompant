'use client';

import '@/i18n';

/**
 * Client-only bootstrap for i18next / react-i18next.
 * Must not be imported from Server Components except as a wrapper.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
