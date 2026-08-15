'use client';

import React from 'react';
import Link from 'next/link';
import { Car, ShieldCheck, Cpu, Sliders, Bell, Sparkles } from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
  onToggleAiChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, onToggleAiChat }) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold gradient-text tracking-wide block">FAMILY MOBILITY</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase block -mt-1">Management System</span>
          </div>
        </Link>
      </div>

      {/* Center Search & Quick Actions */}
      <div className="hidden md:flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-800 rounded-full px-4 py-1.5 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Supabase DB: <strong className="text-emerald-400">Connected</strong></span>
        </div>

        <Link 
          href="/settings/health" 
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-xs font-medium text-slate-200 transition"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>System Health</span>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleAiChat}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-600/30 border border-purple-500/30 hover:border-cyan-400/50 text-xs font-semibold text-white transition shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-cyan-300 animate-spin-slow" />
          <span className="hidden sm:inline">AI Assistant</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 hover:text-white transition"
          title="Tùy chỉnh hiển thị Dashboard"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
          FM
        </div>
      </div>
    </header>
  );
};
