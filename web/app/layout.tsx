import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientShell } from '@/components/layout/ClientShell';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FFMS — Family Finance & Mobility System',
  description: 'Hệ thống quản lý tài chính gia đình thông minh & giám sát phương tiện xe theo thời gian thực.',
  metadataBase: new URL('https://fmms.vercel.app'),
  manifest: '/manifest.json',
  openGraph: {
    title: 'FFMS — Family Finance & Mobility System',
    description: 'Quản lý tài chính gia đình thông minh, ngân sách 6 chiếc hũ, khoản vay và phương tiện xe.',
    url: 'https://fmms.vercel.app',
    siteName: 'FFMS',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FFMS — Family Finance & Mobility System',
    description: 'Quản lý tài chính gia đình & phương tiện xe thông minh',
  },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`dark ${inter.className}`}>
      <ClientShell>{children}</ClientShell>
    </html>
  );
}

