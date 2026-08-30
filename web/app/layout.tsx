import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientShell } from '@/components/layout/ClientShell';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FMMS — Family Mobility Management System',
  description: 'Hệ thống quản lý toàn bộ phương tiện gia đình — theo dõi nhiên liệu, bảo dưỡng, chi phí và khoản vay theo thời gian thực.',
  metadataBase: new URL('https://fmms.vercel.app'),
  openGraph: {
    title: 'FMMS — Family Mobility Management System',
    description: 'Theo dõi & phân tích xe hơi, xe đạp, xe điện, mô tô gia đình. AI-powered insights.',
    url: 'https://fmms.vercel.app',
    siteName: 'FMMS',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FMMS — Family Mobility Management',
    description: 'Quản lý phương tiện gia đình thông minh',
  },
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`dark ${inter.className}`}>
      <ClientShell>{children}</ClientShell>
    </html>
  );
}

