'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Key, Database, Cloud, Bell, Shield, Sliders, ExternalLink, User, Check, Plus, Trash2, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SETTINGS_CARDS = [
  {
    href: '/settings/users',
    icon: Users,
    color: 'var(--status-purple)',
    bg: 'rgba(139,92,246,0.15)',
    title: 'Quản lý Người dùng & Phân quyền',
    desc: 'Danh sách thành viên gia đình, phân quyền Admin/Member, chỉ định xe & reset mật khẩu',
    tag: 'Mới',
  },
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
    icon: Sliders,
    color: 'var(--text-secondary)',
    bg: 'var(--bg-hover)',
    title: 'Tùy chỉnh Dashboard',
    desc: 'Cấu hình layout, hiển thị thẻ, đơn vị tiền tệ & ngôn ngữ',
    tag: 'UI',
  },
];

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState<string>('demo@fmms.com');
  const [userName, setUserName] = useState<string>('Nguyễn Trung Sơn');
  const [orgName, setOrgName] = useState<string>('CONG TY TNHH UTI VINA');
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [members, setMembers] = useState<{ email: string; name: string; role: 'ADMIN' | 'MEMBER' }[]>([
    { email: 'son.nt@utivina.com', name: 'Nguyễn Trung Sơn', role: 'ADMIN' },
    { email: 'thanhvien@utivina.com', name: 'Trần Văn A (Thành viên)', role: 'MEMBER' },
  ]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('fmms_user_name');
    const savedOrg = localStorage.getItem('fmms_org_name');
    if (savedName) setUserName(savedName);
    if (savedOrg) setOrgName(savedOrg);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email) {
        setUserEmail(user.email);
        setUserRole(user.user_metadata?.role || 'ADMIN');
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem('fmms_user_name', userName);
    localStorage.setItem('fmms_org_name', orgName);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleAddMember = () => {
    if (!newMemberEmail) return;
    setMembers(prev => [...prev, { email: newMemberEmail, name: newMemberName || newMemberEmail.split('@')[0], role: 'MEMBER' }]);
    setNewMemberEmail('');
    setNewMemberName('');
  };

  const handleRemoveMember = (email: string) => {
    setMembers(prev => prev.filter(m => m.email !== email));
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Cài đặt Hệ thống FMMS
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Quản lý tài khoản cá nhân, phân quyền thành viên và cấu hình Web Administration
        </p>
      </div>

      {savedToast && (
        <div className="p-4 rounded-xl flex items-center space-x-2 text-xs font-bold animate-fadeIn" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <Check className="w-4 h-4 shrink-0" />
          <span>Đã lưu thông tin tài khoản và cấu hình hệ thống thành công!</span>
        </div>
      )}

      {/* User Profile Card Section inspired by MS365 */}
      <div className="glass-panel p-6 rounded-2xl space-y-6" style={{ border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-3 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Hồ sơ Người dùng &amp; Đơn vị Quản lý</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Thông tin hiển thị cá nhân và quyền truy cập</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Họ và tên người dùng *</label>
            <input type="text" className="theme-input" value={userName} onChange={e => setUserName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tên Hộ gia đình / Công ty *</label>
            <input type="text" className="theme-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email đăng nhập</label>
            <input type="text" className="theme-input opacity-70 cursor-not-allowed" value={userEmail} disabled />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Vai trò người dùng</label>
            <input type="text" className="theme-input opacity-70 cursor-not-allowed" value={userRole === 'ADMIN' ? 'ADMIN (Quản trị viên)' : 'MEMBER (Thành viên)'} disabled />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveProfile}
            className="px-6 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
          >
            Lưu thay đổi hồ sơ
          </button>
        </div>
      </div>

      {/* Family Member Role Management (§202) */}
      <div className="glass-panel p-6 rounded-2xl space-y-6" style={{ border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-3 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Phân quyền Thành viên Gia đình (§202)</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin có quyền thêm, phân xe và quản lý thành viên. Thành viên chỉ xem xe được chỉ định.</p>
          </div>
        </div>

        <div className="space-y-3">
          {members.map(m => (
            <div key={m.email} className="p-3.5 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {m.role === 'ADMIN' ? 'Admin' : 'Thành viên (Chỉ xem)'}
                </span>
                {m.email !== userEmail && (
                  <button onClick={() => handleRemoveMember(m.email)} className="text-rose-400 hover:text-rose-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Member Input */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <input
            type="text"
            className="theme-input"
            placeholder="Họ tên thành viên mới..."
            value={newMemberName}
            onChange={e => setNewMemberName(e.target.value)}
          />
          <input
            type="email"
            className="theme-input"
            placeholder="Email thành viên..."
            value={newMemberEmail}
            onChange={e => setNewMemberEmail(e.target.value)}
          />
          <button
            onClick={handleAddMember}
            className="flex items-center justify-center space-x-2 py-2.5 rounded-xl text-white font-bold text-xs transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thành viên mới</span>
          </button>
        </div>
      </div>

      {/* System Settings Cards */}
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
