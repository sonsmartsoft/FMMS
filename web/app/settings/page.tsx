'use client';

import React from 'react';
import Link from 'next/link';
import { Sliders, Cpu, Key, Database, Bell, Shield, Cloud, Activity } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Cài đặt Hệ thống FMMS</h1>
        <p className="text-xs text-slate-400 mt-1">Quản lý cấu hình Web Administration, AI Providers và kết nối Cloud</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <Link href="/settings/health" className="glass-card p-5 rounded-2xl flex items-center space-x-4 border border-slate-700/60 hover:border-cyan-500/50">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">System Health Center</h3>
            <p className="text-slate-400 mt-0.5">Kiểm tra kết nối Supabase DB, RLS, Storage & AI Gateway</p>
          </div>
        </Link>

        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4 border border-slate-700/60">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Cấu hình AI Providers</h3>
            <p className="text-slate-400 mt-0.5">Quản lý API Key (Gemini, OpenAI, Claude, Local LLM)</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4 border border-slate-700/60">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Supabase Database</h3>
            <p className="text-slate-400 mt-0.5">Project Ref: opslebsdmwsnsyfmbynf</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center space-x-4 border border-slate-700/60">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Google Sheets Export</h3>
            <p className="text-slate-400 mt-0.5">Cấu hình tự động đồng bộ báo cáo sang Google Sheets</p>
          </div>
        </div>
      </div>
    </div>
  );
}
