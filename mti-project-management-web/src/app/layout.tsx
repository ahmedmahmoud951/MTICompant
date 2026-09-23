import '@/styles/globals.css';
import { Metadata } from 'next';
import { Sora, Manrope, Cairo } from 'next/font/google';
import { I18nProvider } from '@/components/I18nProvider';

const display = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const arabic = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-arabic',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MTI Engineering Solutions | Project Management Platform',
  description: 'Internal Enterprise Project Management, Site Monitoring, and Real-Time Coordination System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // I18N-01: Arabic-first (ar/rtl). Direction updated dynamically by LanguageSwitcher.
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable} ${arabic.variable}`}>
      <body className="bg-[#0b1524] text-[#e8eef8] antialiased font-[family-name:var(--font-body)]">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
