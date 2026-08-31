'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Car, Fuel, Wrench, DollarSign,
  FileText, BarChart3, Settings, Activity, Sparkles, Award, MapPin, Radio,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isEn = language === 'en';

  const NAV_SECTIONS = [
    {
      title: isEn ? 'Mobility Management' : 'Quản lý Mobility',
      items: [
        { name: isEn ? 'Dashboard' : 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: isEn ? 'GPS Map' : 'Bản đồ GPS', href: '/map', icon: MapPin },
        { name: isEn ? 'Vehicles' : 'Phương tiện', href: '/assets', icon: Car },
        { name: isEn ? 'Fuel & Battery' : 'Nhiên liệu & Pin', href: '/fuel', icon: Fuel },
        { name: isEn ? 'Maintenance & Parts' : 'Bảo dưỡng & Phụ tùng', href: '/maintenance', icon: Wrench },
        { name: isEn ? 'Finance & Loans' : 'Chi phí & Khoản vay', href: '/finance', icon: DollarSign },
        { name: isEn ? 'Docs & Insurance' : 'Giấy tờ & Bảo hiểm', href: '/documents', icon: FileText },
        { name: isEn ? 'Warranty & Claims' : 'Sổ Bảo hành & Claim', href: '/warranties', icon: Award },
        { name: isEn ? 'Reports & Analytics' : 'Báo cáo & Phân tích', href: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: isEn ? 'System & AI' : 'Hệ thống & AI',
      items: [
        { name: 'AI Center', href: '/ai-center', icon: Sparkles },
        { name: isEn ? 'OBD Devices' : 'Thiết bị Tracker', href: '/settings/devices', icon: Radio },
        { name: isEn ? 'System Settings' : 'Cài đặt hệ thống', href: '/settings', icon: Settings },
        { name: 'System Health', href: '/settings/health', icon: Activity },
      ],
    },
  ];

  return (
    <aside
      className="w-60 hidden lg:flex flex-col glass-panel"
      style={{
        borderRight: '1px solid var(--border-default)',
        minHeight: 'calc(100vh - 61px)',
        padding: '1rem',
        justifyContent: 'space-between',
      }}
    >
      <div className="space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3
              className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-faint)' }}
            >
              {section.title}
            </h3>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
                    style={isActive
                      ? {
                          background: 'var(--accent-cyan-bg)',
                          color: 'var(--accent-cyan)',
                          border: '1px solid var(--accent-cyan-border)',
                        }
                      : {
                          color: 'var(--text-secondary)',
                          border: '1px solid transparent',
                        }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <Icon
                      className="w-4 h-4 shrink-0"
                      style={{ color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* OBD Status Footer */}
      <div
        className="p-3.5 rounded-2xl text-center mt-4"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2"
          style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}
        >
          <Car className="w-4 h-4" />
        </div>
        <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Mazda2 ZESTECH 9"</p>
        <p className="text-[10px] mt-0.5 flex items-center justify-center space-x-1" style={{ color: 'var(--status-green)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          <span>OBD Telemetry Active</span>
        </p>
      </div>
    </aside>
  );
};
