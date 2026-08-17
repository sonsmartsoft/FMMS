'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, Key, Database, Cloud, Bell, Shield, Sliders, ExternalLink } from 'lucide-react';

const SETTINGS_CARDS = [
  {
    href: '/settings/health',
    icon: Activity,
    color: 'var(--accent-cyan)',
    bg: 'var(--accent-cyan-bg)',
    title: 'System Health Center',
    desc: 'Kiểm tra kết nối Supabase DB, RLS, Storage & AI Gateway',
    tag: 'Live',
  },
  {
    href: '/settings/ai',
    icon: Key,
    color: 'var(--status-purple)',
    bg: 'rgba(139,92,246,0.15)',
    title: 'Cấu hình AI Providers',
    desc: 'Kết nối ChatGPT2API Gateway, Gemini, OpenAI — quản lý API Key & model',
    tag: 'Mới',
  },
  {
    href: '/settings/health',
    icon: Database,
    color: 'var(--status-green)',
    bg: 'rgba(52,211,153,0.15)',
    title: 'Supabase Database',
    desc: 'Project Ref: opslebsdmwsnsyfmbynf · Row Level Security · Auth',
    tag: 'DB',
  },
  {
    href: '#',
    icon: Cloud,
    color: 'var(--status-amber)',
    bg: 'rgba(251,191,36,0.15)',
    title: 'Google Sheets Export',
    desc: 'Tự động đồng bộ báo cáo sang Google Sheets hàng tuần',
    tag: null,
  },
  {
    href: '#',
    icon: Bell,
    color: 'var(--status-rose)',
    bg: 'rgba(244,63,94,0.15)',
    title: 'Thông báo & Cảnh báo',
    desc: 'Cấu hình push notification bảo dưỡng, xăng dầu, khoản vay',
    tag: null,
  },
  {
    href: '#',
    icon: Shield,
    color: 'var(--accent-cyan)',
    bg: 'var(--accent-cyan-bg)',
    title: 'Bảo mật & Quyền truy cập',
    desc: 'Quản lý tài khoản, xác thực 2 bước, phân quyền thành viên',
    tag: null,
  },
  {
    href: '#',
    icon: Sliders,
    color: 'var(--text-secondary)',
    bg: 'var(--bg-hover)',
    title: 'Tùy chỉnh Dashboard',
    desc: 'Cấu hình layout, hiển thị thẻ, đơn vị tiền tệ & ngôn ngữ',
    tag: null,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Cài đặt Hệ thống FMMS
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Quản lý cấu hình Web Administration, AI Providers và kết nối Cloud
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SETTINGS_CARDS.map((card) => {
          const Icon = card.icon;
          const Inner = (
            <div
              className="glass-card p-5 rounded-2xl flex items-start space-x-4 transition-all h-full"
              style={{ border: '1px solid var(--border-default)' }}
            >
              <div className="p-3 rounded-xl shrink-0" style={{ background: card.bg, color: card.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                  {card.tag && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: card.bg, color: card.color }}>
                      {card.tag}
                    </span>
                  )}
                  {card.href !== '#' && <ExternalLink className="w-3 h-3 shrink-0" style={{ color: 'var(--text-faint)' }} />}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
              </div>
            </div>
          );

          return card.href !== '#' ? (
            <Link key={card.title} href={card.href} className="block group">
              {Inner}
            </Link>
          ) : (
            <div key={card.title} className="cursor-not-allowed opacity-75">
              {Inner}
            </div>
          );
        })}
      </div>

      {/* Version Info */}
      <div className="p-4 rounded-xl text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div style={{ color: 'var(--text-muted)' }}>
            <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>FMMS v2.0.0</span> — Family Mobility Management System
          </div>
          <div className="flex items-center space-x-4" style={{ color: 'var(--text-faint)' }}>
            <span>Next.js 14.2.25</span>
            <span>Supabase</span>
            <span>ChatGPT2API / Gemini AI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
