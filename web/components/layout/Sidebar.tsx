'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Car, Bike, Fuel, Wrench, DollarSign,
  FileText, BarChart3, Settings, Activity, Sparkles, Award, MapPin, Radio, ChevronRight, X
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getAssets } from '@/lib/services/assetService';
import { getDevices, DeviceRecord } from '@/lib/services/deviceService';
import { createClient } from '@/lib/supabase/client';
import { Asset } from '@/types/mobility';

interface VehicleDeviceStatus {
  asset: Asset;
  device?: DeviceRecord;
  status: 'ONLINE' | 'STANDBY' | 'OFFLINE' | 'NO_DEVICE';
  statusText: string;
  lastSeenText?: string;
}

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const STANDBY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function computeDeviceStatus(lastSeenIso?: string | null, isEn = false): { status: 'ONLINE' | 'STANDBY' | 'OFFLINE'; statusText: string; lastSeenText: string } {
  if (!lastSeenIso) {
    return { status: 'OFFLINE', statusText: isEn ? 'Offline' : 'Ngoại tuyến', lastSeenText: isEn ? 'No connection' : 'Chưa có kết nối' };
  }
  const diffMs = Date.now() - new Date(lastSeenIso).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  let lastSeenText = '';
  if (diffSec < 60) lastSeenText = isEn ? `${diffSec}s ago` : `${diffSec}s trước`;
  else if (diffSec < 3600) lastSeenText = isEn ? `${Math.floor(diffSec / 60)}m ago` : `${Math.floor(diffSec / 60)}ph trước`;
  else if (diffSec < 86400) lastSeenText = isEn ? `${Math.floor(diffSec / 3600)}h ago` : `${Math.floor(diffSec / 3600)}g trước`;
  else lastSeenText = new Date(lastSeenIso).toLocaleDateString(isEn ? 'en-US' : 'vi-VN');

  if (diffMs < OFFLINE_THRESHOLD_MS) {
    return { status: 'ONLINE', statusText: isEn ? 'Live Connected' : 'OBD Active', lastSeenText };
  } else if (diffMs < STANDBY_THRESHOLD_MS) {
    return { status: 'STANDBY', statusText: isEn ? `Standby (${lastSeenText})` : `Tắt máy (${lastSeenText})`, lastSeenText };
  } else {
    return { status: 'OFFLINE', statusText: isEn ? `Offline (${lastSeenText})` : `Ngoại tuyến (${lastSeenText})`, lastSeenText };
  }
}

export interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();
  const { language, isEn, t } = useLanguage();

  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleDeviceStatus[]>([]);
  const [activeVehicleIdx, setActiveVehicleIdx] = useState(0);

  // Auto-close mobile drawer when user navigates to a new route
  useEffect(() => {
    if (isMobileOpen && onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname]);

  // Handle ESC key and scroll-lock when mobile drawer is open
  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCloseMobile) {
        onCloseMobile();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileOpen, onCloseMobile]);

  const fetchStatus = async () => {
    try {
      const [assetsList, devicesList] = await Promise.all([
        getAssets(),
        getDevices(),
      ]);

      const mapped: VehicleDeviceStatus[] = assetsList.map(a => {
        const assignedDevice = devicesList.find(d => d.vehicle_id === a.id || d.asset_id === a.id);
        const isCar = a.asset_type === 'CAR';
        if (!assignedDevice) {
          return {
            asset: a,
            status: 'NO_DEVICE',
            statusText: isCar ? (isEn ? 'Waiting for OBD' : 'Chờ kết nối OBD') : (isEn ? 'No GPS Tracker' : 'Chưa gắn Tracker GPS'),
          };
        }
        const st = computeDeviceStatus(assignedDevice.last_seen, isEn);
        return {
          asset: a,
          device: assignedDevice,
          status: st.status,
          statusText: st.statusText,
          lastSeenText: st.lastSeenText,
        };
      });

      // SẮP XẾP ƯU TIÊN: Thiết bị ONLINE lên đầu tiên, sau đó đến STANDBY -> OFFLINE -> NO_DEVICE
      const statusRank: Record<string, number> = {
        ONLINE: 1,
        STANDBY: 2,
        OFFLINE: 3,
        NO_DEVICE: 4,
      };

      mapped.sort((a, b) => {
        const rankA = statusRank[a.status] || 99;
        const rankB = statusRank[b.status] || 99;
        if (rankA !== rankB) return rankA - rankB;

        // Nếu cùng trạng thái, ưu tiên Ô tô -> Xe máy -> Xe đạp
        const typeRank: Record<string, number> = { CAR: 1, MOTORCYCLE: 2, BICYCLE: 3 };
        const tA = typeRank[a.asset.asset_type] || 5;
        const tB = typeRank[b.asset.asset_type] || 5;
        if (tA !== tB) return tA - tB;

        return a.asset.name.localeCompare(b.asset.name, 'vi');
      });

      setVehicleStatuses(mapped);
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s poll fallback

    // Realtime listener for live telemetry / device updates
    const supabase = createClient();
    const sub = supabase
      .channel('sidebar_device_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => {
        fetchStatus();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telemetry_samples' }, () => {
        fetchStatus();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(sub);
    };
  }, []);

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

  const currentVehicle = vehicleStatuses.length > 0
    ? vehicleStatuses[activeVehicleIdx % vehicleStatuses.length]
    : null;

  // Render navigation links (shared between desktop sidebar and mobile drawer)
  const renderNavSections = (isMobile = false) => (
    <div className="space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <h3
            className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2"
            style={{ color: 'var(--text-faint)' }}
          >
            {section.title}
          </h3>
          <nav className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    if (isMobile && onCloseMobile) onCloseMobile();
                  }}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all ${
                    isMobile ? 'text-sm min-h-[44px]' : 'text-xs'
                  }`}
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
                    className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`}
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
  );

  // Render vehicle status footer (shared between desktop sidebar and mobile drawer)
  const renderVehicleStatusFooter = (isMobile = false) => (
    <div
      className="p-3 rounded-2xl transition-all"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
    >
      {currentVehicle ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/assets/${currentVehicle.asset.id}`}
              onClick={() => {
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-2 hover:opacity-80 transition min-w-0"
              title={`Xem chi tiết ${currentVehicle.asset.name}`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}
              >
                {currentVehicle.asset.asset_type === 'BICYCLE' ? (
                  <Bike className="w-4 h-4" />
                ) : (
                  <Car className="w-4 h-4" />
                )}
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {currentVehicle.asset.name}
                </p>
                <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {currentVehicle.device?.device_name || (currentVehicle.asset.asset_type === 'CAR' ? (isEn ? 'OBD2 Device' : 'Thiết bị OBD') : (isEn ? 'GPS Tracker' : 'Tracker GPS'))}
                </p>
              </div>
            </Link>

            {vehicleStatuses.length > 1 && (
              <button
                onClick={() => setActiveVehicleIdx(prev => (prev + 1) % vehicleStatuses.length)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-black/5 dark:hover:bg-white/5 transition text-[10px] flex items-center shrink-0 min-h-[32px]"
                title={isEn ? 'Next vehicle' : 'Chuyển sang xe tiếp theo'}
              >
                <span className="font-mono mr-0.5">{(activeVehicleIdx % vehicleStatuses.length) + 1}/{vehicleStatuses.length}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Connection Status Badge */}
          <Link
            href="/settings/devices"
            onClick={() => {
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className="flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition hover:opacity-90 w-full"
            style={{
              background: currentVehicle.status === 'ONLINE'
                ? 'rgba(16,185,129,0.12)'
                : currentVehicle.status === 'STANDBY'
                  ? 'rgba(245,158,11,0.12)'
                  : 'rgba(100,116,139,0.12)',
              color: currentVehicle.status === 'ONLINE'
                ? 'var(--status-green)'
                : currentVehicle.status === 'STANDBY'
                  ? 'var(--status-amber)'
                  : 'var(--text-muted)',
              border: `1px solid ${
                currentVehicle.status === 'ONLINE'
                  ? 'rgba(16,185,129,0.25)'
                  : currentVehicle.status === 'STANDBY'
                    ? 'rgba(245,158,11,0.25)'
                    : 'rgba(100,116,139,0.2)'
              }`,
            }}
            title={isEn ? 'Click to open Tracker Device settings' : 'Nhấn để mở Cài đặt thiết bị Tracker'}
          >
            <span
              className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                currentVehicle.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : currentVehicle.status === 'STANDBY' ? 'bg-amber-400' : 'bg-slate-400'
              }`}
            />
            <span className="truncate">{currentVehicle.statusText}</span>
          </Link>
        </div>
      ) : (
        <Link
          href="/settings/devices"
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile();
          }}
          className="block text-center hover:opacity-80 py-1"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5"
            style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}
          >
            <Radio className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{isEn ? 'Tracker Devices' : 'Thiết bị Tracker'}</p>
          <p className="text-[10px] mt-0.5 text-slate-400">{isEn ? 'Manage OBD/GPS connections' : 'Quản lý kết nối OBD'}</p>
        </Link>
      )}
    </div>
  );

  return (
    <>
      {/* ── Desktop Persistent Sidebar (≥ 1024px) ── */}
      <aside
        className="w-60 hidden lg:flex flex-col glass-panel shrink-0"
        style={{
          borderRight: '1px solid var(--border-default)',
          minHeight: 'calc(100dvh - var(--header-height, 60px))',
          padding: '1rem',
          justifyContent: 'space-between',
        }}
      >
        {renderNavSections(false)}
        <div className="mt-4">
          {renderVehicleStatusFooter(false)}
        </div>
      </aside>

      {/* ── Mobile Adaptive Drawer (< 1024px) ── */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-fadeIn" role="dialog" aria-modal="true" aria-label="Menu điều hướng di động">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Slide-in Drawer Container */}
          <aside
            className="relative w-[280px] xs:w-[320px] max-w-[85vw] h-full flex flex-col z-10 animate-slideInLeft overflow-hidden"
            style={{
              background: 'var(--bg-primary)',
              borderRight: '1px solid var(--border-default)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Drawer Header */}
            <div
              className="p-4 flex items-center justify-between border-b shrink-0"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)', minHeight: 'var(--header-height, 60px)' }}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-extrabold gradient-text tracking-wide">FMMS MENU</span>
                  <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                    Điều hướng hệ thống
                  </p>
                </div>
              </div>
              <button
                onClick={onCloseMobile}
                className="p-2 rounded-xl transition flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                aria-label="Đóng menu điều hướng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Nav Content */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-6">
              {renderNavSections(true)}
            </div>

            {/* Dynamic Real-time Vehicle / OBD Status Footer */}
            <div
              className="p-3 border-t shrink-0"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
            >
              {renderVehicleStatusFooter(true)}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
