import '@/styles/globals.css';
import { Metadata } from 'next';
import { Sora, Manrope } from 'next/font/google';

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
    <html lang="en" className={`dark ${display.variable} ${body.variable}`}>
      <body className="bg-[#0a101c] text-[#e8eef6] antialiased font-[family-name:var(--font-body)]">
        {children}
      </body>
    </html>
  );
}
