'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Cpu, Sliders, Sparkles, Moon, Sun, LogOut, User, ShieldCheck, X } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { createClient } from '@/lib/supabase/client';

interface NavbarProps {
  onOpenSettings?: () => void;
  onToggleAiChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, onToggleAiChat }) => {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('demo@fmms.com');
  const [userName, setUserName] = useState<string>('Nguyễn Trung Sơn');
  const [orgName, setOrgName] = useState<string>('CONG TY TNHH UTI VINA');
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const savedName = localStorage.getItem('fmms_user_name');
        const savedOrg = localStorage.getItem('fmms_org_name');
        if (savedName) setUserName(savedName);
        if (savedOrg) setOrgName(savedOrg);

        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          setUserEmail(user.email);
          if (user.user_metadata?.full_name && !savedName) setUserName(user.user_metadata.full_name);
          setUserRole(user.user_metadata?.role || (user.email.includes('admin') || user.email === 'demo@fmms.com' ? 'ADMIN' : 'MEMBER'));
        }
      } catch {}
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    document.cookie = 'fmms_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
    router.refresh();
  };

  return (
    <header
      className="sticky top-0 z-40 w-full glass-panel px-6 py-3 flex items-center justify-between"
      style={{ borderBottom: '1px solid var(--border-default)' }}
    >
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold gradient-text tracking-wide block">FAMILY MOBILITY</span>
            <span className="text-[10px] font-medium tracking-widest uppercase block -mt-1" style={{ color: 'var(--text-muted)' }}>
              Management System
            </span>
          </div>
        </Link>
      </div>

      {/* Center Status */}
      <div className="hidden md:flex items-center space-x-3">
        <div
          className="flex items-center space-x-2 rounded-full px-4 py-1.5 text-xs"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Supabase: <strong style={{ color: 'var(--status-green)' }}>Connected</strong></span>
        </div>
        <Link
          href="/settings/health"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
          <span>System Health</span>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2">
        {/* AI Button */}
        <button
          onClick={onToggleAiChat}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition shadow-sm"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(56,189,248,0.3))',
            border: '1px solid rgba(139,92,246,0.35)',
          }}
        >
          <Sparkles className="w-4 h-4 animate-spin-slow" style={{ color: 'var(--accent-cyan)' }} />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl transition-all duration-300"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
          title={theme === 'dark' ? 'Chuyển Light Mode' : 'Chuyển Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-500" />
          )}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl transition"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
          title="Tùy chỉnh Dashboard"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {/* Microsoft 365 Style User Profile Trigger */}
        <div className="relative pl-2 border-l" style={{ borderColor: 'var(--border-default)' }}>
          <button
            onClick={() => setShowProfileMenu(p => !p)}
            className="flex items-center space-x-2.5 p-1 rounded-full transition hover:opacity-90"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 via-orange-300 to-amber-400 p-0.5 shadow-sm flex items-center justify-center overflow-hidden">
              <img
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${userEmail}`}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover bg-amber-100"
              />
            </div>
            <div className="hidden sm:flex flex-col text-left pr-2">
              <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {userName}
              </span>
              <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                {userRole === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
              </span>
            </div>
          </button>

          {/* Popover Dropdown inspired by Microsoft 365 Profile */}
          {showProfileMenu && (
            <div
              className="absolute right-0 mt-3 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scaleIn"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* Top Banner Header */}
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="text-[11px] font-bold tracking-wider uppercase truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>
                  {orgName}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs font-bold hover:underline transition"
                  style={{ color: 'var(--status-red)' }}
                >
                  Sign out
                </button>
              </div>

              {/* User Identity Card */}
              <div className="p-5 flex items-start space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-200 to-amber-400 p-1 shrink-0 shadow-md">
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${userEmail}`}
                    alt="Avatar"
                    className="w-full h-full rounded-full bg-amber-50 object-cover"
                  />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="font-extrabold text-base leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                    {userName}
                  </h4>
                  <p className="text-xs truncate font-medium" style={{ color: 'var(--text-muted)' }}>
                    {userEmail}
                  </p>

                  <div className="pt-2 space-y-1">
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowEditModal(true); }}
                      className="text-xs font-bold text-cyan-400 hover:underline block text-left"
                    >
                      View account (Xem tài khoản)
                    </button>
                    <button
                      onClick={() => { setShowProfileMenu(false); setShowEditModal(true); }}
                      className="text-xs font-bold text-blue-400 hover:underline block text-left"
                    >
                      My FMMS Profile &amp; Settings
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Switch Account Action */}
              <div className="p-3 border-t" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition hover:opacity-90"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                >
                  <User className="w-4 h-4" />
                  <span>Sign in with a different account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setShowEditModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-md" style={{ border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Chỉnh sửa thông tin tài khoản người dùng</h3>
              <button onClick={() => setShowEditModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Họ và tên hiển thị</label>
                <input type="text" className="theme-input" value={userName} onChange={e => setUserName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tên Công ty / Hộ gia đình</label>
                <input type="text" className="theme-input" value={orgName} onChange={e => setOrgName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Email đăng nhập</label>
                <input type="text" className="theme-input opacity-70 cursor-not-allowed" value={userEmail} disabled />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Vai trò phân quyền</label>
                <input type="text" className="theme-input opacity-70 cursor-not-allowed" value={userRole === 'ADMIN' ? 'ADMIN (Quản trị viên)' : 'MEMBER (Thành viên)'} disabled />
              </div>
              <div className="flex space-x-2 pt-3">
                <button
                  onClick={() => {
                    localStorage.setItem('fmms_user_name', userName);
                    localStorage.setItem('fmms_org_name', orgName);
                    setShowEditModal(false);
                    alert('Đã cập nhật thông tin tài khoản thành công!');
                  }}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                >
                  Lưu thay đổi
                </button>
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
