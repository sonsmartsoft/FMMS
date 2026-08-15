'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Bike, 
  Fuel, 
  Wrench, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings, 
  Activity,
  Sparkles
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Phương tiện (Assets)', href: '/#assets', icon: Car },
    { name: 'Nhiên liệu & Pin', href: '/#fuel', icon: Fuel },
    { name: 'Bảo dưỡng & Phụ tùng', href: '/#maintenance', icon: Wrench },
    { name: 'Chi phí & Khoản vay', href: '/#finance', icon: DollarSign },
    { name: 'Giấy tờ & Bảo hiểm', href: '/#documents', icon: FileText },
    { name: 'Báo cáo & Phân tích', href: '/#analytics', icon: BarChart3 },
    { name: 'AI Center', href: '/#ai-center', icon: Sparkles },
    { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings },
    { name: 'System Health', href: '/settings/health', icon: Activity },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-white/10 hidden lg:flex flex-col justify-between p-4 min-h-[calc(100vh-61px)]">
      <div className="space-y-6">
        <div>
          <h3 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Quản lý Mobility
          </h3>
          <nav className="space-y-1">
            {navItems.slice(0, 7).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <h3 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Hệ thống & AI
          </h3>
          <nav className="space-y-1">
            {navItems.slice(7).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 text-center">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center mx-auto mb-2 text-cyan-400">
          <Car className="w-4 h-4" />
        </div>
        <p className="text-[11px] font-bold text-slate-200">Mazda2 ZESTECH 9"</p>
        <p className="text-[10px] text-slate-400 mt-0.5">OBD Telemetry Active</p>
      </div>
    </aside>
  );
};
