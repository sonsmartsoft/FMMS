'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Car, Bike, Fuel, Wrench, DollarSign,
  FileText, BarChart3, Settings, Activity, Sparkles, Award, MapPin, Radio, ChevronRight
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

function computeDeviceStatus(lastSeenIso?: string | null): { status: 'ONLINE' | 'STANDBY' | 'OFFLINE'; statusText: string; lastSeenText: string } {
  if (!lastSeenIso) {
    return { status: 'OFFLINE', statusText: 'Ngoại tuyến', lastSeenText: 'Chưa có kết nối' };
  }
  const diffMs = Date.now() - new Date(lastSeenIso).getTime();
  const diffSec = Math.floor(diffMs / 1000);

  let lastSeenText = '';
  if (diffSec < 60) lastSeenText = `${diffSec}s trước`;
  else if (diffSec < 3600) lastSeenText = `${Math.floor(diffSec / 60)}ph trước`;
  else if (diffSec < 86400) lastSeenText = `${Math.floor(diffSec / 3600)}g trước`;
  else lastSeenText = new Date(lastSeenIso).toLocaleDateString('vi-VN');

  if (diffMs < OFFLINE_THRESHOLD_MS) {
    return { status: 'ONLINE', statusText: 'OBD Active', lastSeenText };
  } else if (diffMs < STANDBY_THRESHOLD_MS) {
    return { status: 'STANDBY', statusText: `Tắt máy (${lastSeenText})`, lastSeenText };
  } else {
    return { status: 'OFFLINE', statusText: `Ngoại tuyến (${lastSeenText})`, lastSeenText };
  }
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleDeviceStatus[]>([]);
  const [activeVehicleIdx, setActiveVehicleIdx] = useState(0);

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
            statusText: isCar ? 'Chờ kết nối OBD' : 'Chưa gắn Tracker GPS',
          };
        }
        const st = computeDeviceStatus(assignedDevice.last_seen);
        return {
          asset: a,
          device: assignedDevice,
          status: st.status,
          statusText: st.statusText,
          lastSeenText: st.lastSeenText,
        };
      });

      // 🏆 SẮP XẾP ƯU TIÊN: Thiết bị ONLINE lên đầu tiên, sau đó đến STANDBY -> OFFLINE -> NO_DEVICE
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

  return (
    <aside
      className="w-60 hidden lg:flex flex-col glass-panel"
      style={{
        borderRight: '1px solid var(--border-default)',
        minHeight: 'calc(100vh - 61px)',
        padding: '1rem',
        justifyContent: 'space-between',
      }}
    >
      <div className="space-y-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3
              className="px-3 text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: 'var(--text-faint)' }}
            >
              {section.title}
            </h3>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
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
                      className="w-4 h-4 shrink-0"
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

      {/* Dynamic Real-Time Vehicle / OBD Status Footer */}
      <div
        className="p-3 rounded-2xl mt-4 transition-all"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
      >
        {currentVehicle ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Link
                href={`/assets/${currentVehicle.asset.id}`}
                className="flex items-center gap-2 hover:opacity-80 transition min-w-0"
                title={`Xem chi tiết ${currentVehicle.asset.name}`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}
                >
                  {currentVehicle.asset.asset_type === 'BICYCLE' ? (
                    <Bike className="w-3.5 h-3.5" />
                  ) : (
                    <Car className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {currentVehicle.asset.name}
                  </p>
                  <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {currentVehicle.device?.device_name || (currentVehicle.asset.asset_type === 'CAR' ? 'Thiết bị OBD' : 'Tracker GPS')}
                  </p>
                </div>
              </Link>

              {vehicleStatuses.length > 1 && (
                <button
                  onClick={() => setActiveVehicleIdx(prev => (prev + 1) % vehicleStatuses.length)}
                  className="p-1 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-black/5 dark:hover:bg-white/5 transition text-[10px] flex items-center shrink-0"
                  title="Chuyển sang xe tiếp theo"
                >
                  <span className="font-mono mr-0.5">{(activeVehicleIdx % vehicleStatuses.length) + 1}/{vehicleStatuses.length}</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Connection Status Badge */}
            <Link
              href="/settings/devices"
              className="flex items-center justify-center space-x-1.5 py-1 px-2 rounded-lg text-[10px] font-semibold transition hover:opacity-90 w-full"
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
              title="Nhấn để mở Cài đặt thiết bị Tracker"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full inline-block ${
                  currentVehicle.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : currentVehicle.status === 'STANDBY' ? 'bg-amber-400' : 'bg-slate-400'
                }`}
              />
              <span className="truncate">{currentVehicle.statusText}</span>
            </Link>
          </div>
        ) : (
          <Link href="/settings/devices" className="block text-center hover:opacity-80">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5"
              style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}
            >
              <Radio className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>Thiết bị Tracker</p>
            <p className="text-[10px] mt-0.5 text-slate-400">Quản lý kết nối OBD</p>
          </Link>
        )}
      </div>
    </aside>
  );
};
