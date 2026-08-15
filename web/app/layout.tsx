import type { Metadata } from 'next';
import './globals.css';
import { ClientShell } from '@/components/layout/ClientShell';

export const metadata: Metadata = {
  title: 'FMMS — Family Mobility Management System',
  description: 'Hệ thống quản lý toàn bộ phương tiện và tài sản di chuyển gia đình',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <ClientShell>{children}</ClientShell>
    </html>
  );
}
