'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, Key, Database, Users, Sliders, ChevronRight, LayoutDashboard } from 'lucide-react';

const SETTINGS_CARDS = [
  {
    href: '/settings/users',
    icon: Users,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.15)',
    title: 'Quản lý Người dùng & Phân quyền',
    desc: 'Danh sách thành viên gia đình, phân quyền Admin/Member, chỉ định xe & bảo mật tài khoản',
    tag: 'Admin',
  },
  {
    href: '/settings/health',
    icon: Activity,
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.15)',
    title: 'System Health Center',
    desc: 'Kiểm tra trạng thái thời gian thực: Supabase DB, Auth Session & AI Gateway',
    tag: 'Live',
  },
  {
    href: '/settings/ai',
    icon: Key,
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.15)',
    title: 'Cấu hình AI & Vai Trò Trợ Lý',
    desc: 'Kết nối Google Gemini 3.6, OpenAI GPT-4o, DeepSeek — cấu hình Prompt & phong cách trả lời',
    tag: 'AI',
  },
  {
    href: '/settings/database',
    icon: Database,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.15)',
    title: 'Supabase Cloud Database',
    desc: 'Project: opslebsdmwsnsyfmbynf · Số lượng bản ghi từng bảng, Row Level Security (RLS) & SQL backup',
    tag: 'DB',
  },
  {
    href: '/settings/master-data',
    icon: Sliders,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.15)',
    title: 'Quản lý Danh Mục & Master Data',
    desc: 'Chỉnh sửa danh mục bảo dưỡng, danh mục chi phí, danh sách Đại lý/Garage cho Admin',
    tag: 'Master',
  },
  {
    href: '/settings/display',
    icon: LayoutDashboard,
    color: '#3B82F6',
    bg: 'rgba(59,130,246,0.15)',
    title: 'Tùy chỉnh Dashboard & Giao Diện',
    desc: 'Chế độ Sáng/Tối (Theme), đơn vị đo lường (km/Lít), tiền tệ (VND/USD) & bật/tắt các thẻ thông tin',
    tag: 'UI',
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Cài đặt Hệ thống FMMS
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Quản lý cấu hình quản trị, phân quyền người dùng, hạ tầng Cloud và tùy chỉnh giao diện
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SETTINGS_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="block group">
              <div
                className="p-5 rounded-2xl flex items-start space-x-4 transition-all h-full cursor-pointer hover:scale-[1.01] hover:border-cyan-500/50 shadow-sm"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
              >
                <div className="p-3 rounded-xl shrink-0" style={{ background: card.bg, color: card.color }}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>{card.title}</h3>
                      {card.tag && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: card.bg, color: card.color }}>
                          {card.tag}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{card.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Version Info */}
      <div className="p-4 rounded-2xl text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div style={{ color: 'var(--text-muted)' }}>
            <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>FMMS v2.0.0</span> — Family Mobility Management System
          </div>
          <div className="flex items-center space-x-4" style={{ color: 'var(--text-faint)' }}>
            <span>Next.js 14.2.25</span>
            <span>Supabase Cloud</span>
            <span>Google Gemini 3.6 &amp; OpenAI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
