'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Car, Cpu, Sliders, Sparkles, Moon, Sun, LogOut, User, ShieldCheck } from 'lucide-react';
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
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
          setUserEmail(user.email);
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

        {/* User Info & Logout Badge */}
        <div className="flex items-center space-x-2 pl-2 border-l" style={{ borderColor: 'var(--border-default)' }}>
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold truncate max-w-[130px]" style={{ color: 'var(--text-primary)' }}>
              {userEmail.split('@')[0]}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded w-fit ml-auto"
              style={{
                background: userRole === 'ADMIN' ? 'rgba(59,130,246,0.15)' : 'var(--bg-hover)',
                color: userRole === 'ADMIN' ? '#60A5FA' : 'var(--text-muted)',
                border: `1px solid ${userRole === 'ADMIN' ? 'rgba(59,130,246,0.3)' : 'var(--border-default)'}`,
              }}>
              {userRole}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition border border-rose-500/20 flex items-center space-x-1"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold hidden md:inline">Thoát</span>
          </button>
        </div>
      </div>
    </header>
  );
};
