'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Cpu, Sliders, Sparkles, Moon, Sun, LogOut, User, X, Save, Menu } from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserMember } from '@/lib/services/userService';
import DraggableModal from '@/components/ui/DraggableModal';

interface NavbarProps {
  onOpenSettings?: () => void;
  onToggleAiChat?: () => void;
  isMobileNavOpen?: boolean;
  onToggleMobileNav?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onToggleAiChat,
  isMobileNavOpen = false,
  onToggleMobileNav,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, isEn, t } = useLanguage();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('demo@fmms.com');
  const [userName, setUserName] = useState<string>('Nguyễn Trung Sơn');
  const [orgName, setOrgName] = useState<string>('CONG TY TNHH UTI VINA');
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // Edit form state (separate from live state so user can cancel)
  const [editName, setEditName] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const syncUserData = async () => {
      try {
        const savedName = localStorage.getItem('fmms_user_name');
        const savedOrg = localStorage.getItem('fmms_org_name');
        const savedRole = localStorage.getItem('fmms_user_role');
        if (savedName) setUserName(savedName);
        if (savedOrg) setOrgName(savedOrg);
        if (savedRole === 'ADMIN' || savedRole === 'MEMBER') setUserRole(savedRole);

        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          setUserEmail(user.email);
          if (user.user_metadata?.org_name) {
            setOrgName(user.user_metadata.org_name);
            localStorage.setItem('fmms_org_name', user.user_metadata.org_name);
          }
          if (user.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
            localStorage.setItem('fmms_user_name', user.user_metadata.full_name);
          }
        }

        const currentMember = await getCurrentUserMember();
        if (currentMember) {
          setUserEmail(currentMember.email);
          const resolvedName = user?.user_metadata?.full_name || currentMember.name || savedName || currentMember.email;
          setUserName(resolvedName);
          setUserRole(currentMember.role);
          localStorage.setItem('fmms_user_role', currentMember.role);
          localStorage.setItem('fmms_user_name', resolvedName);
          return;
        }

        if (user && user.email && !savedRole) {
          setUserRole(user.user_metadata?.role || (user.email.includes('admin') || user.email === 'demo@fmms.com' || user.email === 'son.nt@utivina.com' || user.email === 'son.smartsoft@gmail.com' ? 'ADMIN' : 'MEMBER'));
        }
      } catch {}
    };

    syncUserData();
    window.addEventListener('fmms_user_updated', syncUserData);
    return () => window.removeEventListener('fmms_user_updated', syncUserData);
  }, []);

  const openEdit = () => {
    setEditName(userName);
    setEditOrg(orgName);
    setShowProfileMenu(false);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    const trimmedName = editName.trim();
    const trimmedOrg = editOrg.trim();
    if (!trimmedName) return;

    setIsSavingUser(true);
    setUserName(trimmedName);
    localStorage.setItem('fmms_user_name', trimmedName);
    if (trimmedOrg) {
      setOrgName(trimmedOrg);
      localStorage.setItem('fmms_org_name', trimmedOrg);
    }

    try {
      // 1. Persist to Supabase Auth metadata (persists permanently across all sessions & deploys)
      await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          ...(trimmedOrg ? { org_name: trimmedOrg } : {}),
        },
      });

      // 2. Persist to public.user_members table in Supabase
      if (userEmail) {
        const email = userEmail.trim().toLowerCase();
        const { data: existing } = await supabase
          .from('user_members')
          .select('id')
          .ilike('email', email)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_members')
            .update({
              name: trimmedName,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('user_members')
            .insert({
              id: `usr-${Date.now()}`,
              name: trimmedName,
              email: email,
              role: userRole,
              status: 'ACTIVE',
              assigned_asset_ids: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      }

      // 3. Update local user list cache
      try {
        const rawUsers = localStorage.getItem('fmms_users_list');
        if (rawUsers) {
          const parsed = JSON.parse(rawUsers);
          const updated = parsed.map((u: any) =>
            u.email?.toLowerCase() === userEmail?.toLowerCase()
              ? { ...u, name: trimmedName, updated_at: new Date().toISOString() }
              : u
          );
          localStorage.setItem('fmms_users_list', JSON.stringify(updated));
        }
      } catch {}

      window.dispatchEvent(new Event('fmms_user_updated'));
      window.dispatchEvent(new Event('fmms_users_updated'));
    } catch (err) {
      console.warn('Error persisting profile to Supabase:', err);
    } finally {
      setIsSavingUser(false);
      setShowEditModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    document.cookie = 'fmms_demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full glass-panel px-2.5 sm:px-4 md:px-6 xl:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-3"
        style={{ borderBottom: '1px solid var(--border-default)', minHeight: 'var(--header-height, 60px)' }}
      >
        {/* Left: Hamburger (mobile/tablet) + Logo */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 shrink">
          {/* Mobile Navigation Drawer Toggle — visible only below 1024px */}
          <button
            onClick={onToggleMobileNav}
            className="lg:hidden p-2 rounded-xl transition flex items-center justify-center min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] shrink-0 active:scale-95"
            style={{
              background: isMobileNavOpen ? 'var(--accent-cyan-bg)' : 'var(--bg-hover)',
              border: `1px solid ${isMobileNavOpen ? 'var(--accent-cyan-border)' : 'var(--border-default)'}`,
              color: isMobileNavOpen ? 'var(--accent-cyan)' : 'var(--text-primary)',
            }}
            aria-label={isMobileNavOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
            title={isMobileNavOpen ? 'Đóng menu' : 'Menu điều hướng'}
          >
            {isMobileNavOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-1.5 sm:space-x-2.5 group min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform shrink-0 relative overflow-hidden">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-base md:text-lg font-extrabold gradient-text tracking-tight sm:tracking-wide block leading-tight truncate">
                FAMILY FINANCE &amp; MOBILITY
              </span>
              <span className="text-[7.5px] sm:text-[9px] md:text-[10px] font-medium tracking-wider sm:tracking-widest uppercase block -mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                Management System
              </span>
            </div>
          </Link>
        </div>

        {/* Center Status */}
        <div className="hidden md:flex items-center space-x-3 shrink-0">
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
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {/* AI Button */}
          <button
            onClick={onToggleAiChat}
            className="flex items-center space-x-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold text-white transition shadow-sm active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(56,189,248,0.3))',
              border: '1px solid rgba(139,92,246,0.35)',
            }}
            title={isEn ? 'AI Assistant' : 'Trợ lý AI'}
            aria-label="AI Assistant"
          >
            <Sparkles className="w-4 h-4 animate-spin-slow shrink-0" style={{ color: 'var(--accent-cyan)' }} />
            <span className="hidden md:inline">AI Assistant</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 sm:p-2.5 rounded-xl transition-all duration-300 active:scale-95 flex items-center justify-center"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
            title={theme === 'dark' ? (isEn ? 'Switch to Light Mode' : 'Chuyển Light Mode') : (isEn ? 'Switch to Dark Mode' : 'Chuyển Dark Mode')}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 sm:p-2.5 rounded-xl transition active:scale-95 flex items-center justify-center"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
            title={isEn ? 'Dashboard Settings' : 'Tùy chỉnh Dashboard'}
            aria-label="Dashboard Settings"
          >
            <Sliders className="w-4 h-4 shrink-0" />
          </button>

          {/* User Profile Trigger */}
          <div className="relative pl-1 sm:pl-2 border-l" style={{ borderColor: 'var(--border-default)' }}>
            <button
              onClick={() => setShowProfileMenu(p => !p)}
              className="flex items-center space-x-1.5 sm:space-x-2.5 p-0.5 sm:p-1 rounded-full transition hover:opacity-90 active:scale-95"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)' }}
              aria-label="User Profile Menu"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-200 via-orange-300 to-amber-400 p-0.5 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${userEmail}`}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover bg-amber-100"
                />
              </div>
              <div className="hidden lg:flex flex-col text-left pr-2">
                <span className="text-xs font-bold leading-tight truncate max-w-[120px]" style={{ color: 'var(--text-primary)' }}>
                  {userName}
                </span>
                <span className="text-[9px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {userRole === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                </span>
              </div>
            </button>

            {/* Popover Dropdown */}
            {showProfileMenu && (
              <>
                {/* Click-outside overlay */}
                <div className="fixed inset-0 z-[9998]" onClick={() => setShowProfileMenu(false)} />

                <div
                  className="absolute right-0 mt-2 sm:mt-3 w-[calc(100vw-24px)] max-w-[320px] rounded-2xl shadow-2xl z-[9999] overflow-hidden animate-scaleIn"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-default)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    top: '100%',
                  }}
                >
                  {/* Top Banner */}
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
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: userRole === 'ADMIN' ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.2)', color: userRole === 'ADMIN' ? '#60a5fa' : '#94a3b8' }}>
                        {userRole === 'ADMIN' ? (isEn ? 'Administrator (Admin)' : 'Quản trị viên (Admin)') : (isEn ? 'Family Member' : 'Thành viên (Member)')}
                      </span>

                      <div className="pt-2 space-y-1">
                        <button
                          onClick={openEdit}
                          className="text-xs font-bold text-cyan-400 hover:underline block text-left"
                        >
                          ✏️ {isEn ? 'Edit Profile Information' : 'Chỉnh sửa thông tin tài khoản'}
                        </button>
                        <Link href="/settings/users" onClick={() => setShowProfileMenu(false)} className="text-xs font-bold text-blue-400 hover:underline block text-left">
                          👥 {isEn ? 'Manage Members & Roles' : 'Quản lý thành viên & phân quyền'}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Bottom */}
                  <div className="p-3 border-t" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition hover:opacity-90"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{isEn ? 'Sign Out of System' : 'Đăng xuất khỏi hệ thống'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════
          Account Edit Modal — rendered OUTSIDE header
          so it is not constrained by z-40 stacking ctx
          ══════════════════════════════════════════════ */}
      {showEditModal && (
        <DraggableModal isOpen={true} onClose={() => () => {}}>
<div
            className="cursor-grab active:cursor-grabbing relative glass-panel rounded-2xl w-[90vw] sm:w-[600px] max-w-md my-auto shadow-2xl overflow-hidden"
            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{isEn ? 'Edit Profile Information' : 'Chỉnh sửa thông tin tài khoản'}</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Update display name and household/org name' : 'Cập nhật tên hiển thị và tên tổ chức'}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 rounded-lg transition hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Full Display Name *' : 'Họ và tên hiển thị *'}</label>
                <input
                  type="text"
                  className="theme-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder={isEn ? 'Enter your full name...' : 'Nhập họ và tên...'}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Company / Household Name' : 'Tên Công ty / Hộ gia đình'}</label>
                <input
                  type="text"
                  className="theme-input"
                  value={editOrg}
                  onChange={e => setEditOrg(e.target.value)}
                  placeholder={isEn ? 'e.g. UTI VINA LLC or Nguyen Family' : 'VD: Công ty TNHH ABC hoặc Gia đình Nguyễn'}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Login Email' : 'Email đăng nhập'}</label>
                <input type="text" className="theme-input opacity-60 cursor-not-allowed" value={userEmail} disabled />
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{isEn ? 'Email cannot be changed directly. Contact Admin to update.' : 'Email không thể thay đổi trực tiếp. Liên hệ Admin để cập nhật.'}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Role Permission' : 'Vai trò phân quyền'}</label>
                <input type="text" className="theme-input opacity-60 cursor-not-allowed" value={userRole === 'ADMIN' ? (isEn ? 'ADMIN — Administrator (Full Access)' : 'ADMIN — Quản trị viên (Toàn quyền)') : (isEn ? 'MEMBER — Family Member' : 'MEMBER — Thành viên')} disabled />
              </div>
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={saveEdit}
                  disabled={isSavingUser}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingUser ? (isEn ? 'Saving to Cloud...' : 'Đang lưu lên hệ thống...') : (isEn ? 'Save Changes' : 'Lưu thay đổi')}</span>
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
              </div>
            </div>
          
</div>
</DraggableModal>

      )}
    </>
  );
};
