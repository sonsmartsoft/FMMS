'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Radio, Wifi, WifiOff, MapPin, Car, Clock, Gauge,
  RefreshCw, Signal, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { getAssets } from '@/lib/services/assetService';
import { getDeviceLatestPositions, subscribeToLivePositions, DeviceLatestPosition } from '@/lib/services/gpsService';
import { Asset } from '@/types/mobility';

const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isOnline(pos: DeviceLatestPosition): boolean {
  return Date.now() - new Date(pos.recorded_at).getTime() < OFFLINE_THRESHOLD_MS;
}

function getLastSeenText(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}ph trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

export default function DeviceManagementPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [devices, setDevices] = useState<DeviceLatestPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const a = await getAssets();
      setAssets(a);
      const d = await getDeviceLatestPositions(a.map(x => x.id));
      setDevices(d);
      setLastUpdate(new Date());
    } catch {
      // silent — empty state
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live subscription
  useEffect(() => {
    if (!isLive || assets.length === 0) return;
    const unsub = subscribeToLivePositions(
      assets.map(a => a.id),
      (point) => {
        setDevices(prev => {
          const existing = prev.find(d => d.device_id === point.device_id);
          if (existing) {
            return prev.map(d => d.device_id === point.device_id
              ? { ...d, lat: point.lat, lng: point.lng, speed_kmh: point.speed_kmh, heading_deg: point.heading_deg, recorded_at: point.recorded_at, trip_id: point.trip_id }
              : d
            );
          }
          return [...prev, {
            device_id: point.device_id,
            device_name: point.device_name,
            vehicle_id: point.vehicle_id,
            lat: point.lat,
            lng: point.lng,
            speed_kmh: point.speed_kmh,
            heading_deg: point.heading_deg,
            recorded_at: point.recorded_at,
            trip_id: point.trip_id,
          }];
        });
        setLastUpdate(new Date());
      }
    );
    return unsub;
  }, [isLive, assets]);

  const assetMap = new Map(assets.map(a => [a.id, a]));
  const onlineDevices = devices.filter(isOnline);
  const offlineDevices = devices.filter(d => !isOnline(d));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            <Radio className="w-6 h-6 text-purple-400" />
            Quản lý Thiết bị Tracker
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            OBD · GPS-only · Live status · Gán phương tiện
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl transition hover:opacity-80"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsLive(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
            style={{ background: isLive ? 'rgba(239,68,68,0.85)' : 'linear-gradient(135deg,#8B5CF6,#6366F1)' }}
          >
            {isLive ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {isLive ? 'Dừng Live' : 'Bật Live'}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: 'Tổng thiết bị', value: devices.length, color: 'var(--text-primary)', icon: Radio },
          { label: 'Online', value: onlineDevices.length, color: 'var(--status-green)', icon: CheckCircle2 },
          { label: 'Offline', value: offlineDevices.length, color: 'var(--status-red)', icon: AlertCircle },
          { label: 'Đang chạy', value: devices.filter(d => d.trip_id).length, color: 'var(--accent-cyan)', icon: Signal },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="p-3 rounded-2xl flex items-center gap-3"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${s.color}20`, color: s.color }}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-extrabold text-sm" style={{ color: s.color }}>{s.value}</p>
                <p style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {lastUpdate && (
        <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
          Cập nhật lần cuối: {lastUpdate.toLocaleString('vi-VN')}
        </p>
      )}

      {/* Device list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Radio className="w-12 h-12 mx-auto opacity-20" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Chưa có thiết bị nào gửi GPS</p>
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Kết nối Android app với Supabase và chạy 1 chuyến để thấy tracker ở đây.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {devices.map((d, idx) => {
            const asset = assetMap.get(d.vehicle_id);
            const online = isOnline(d);
            const isActive = !!d.trip_id;
            return (
              <div key={d.device_id} className="p-4 rounded-2xl space-y-3"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `1px solid ${online ? 'var(--accent-cyan-border)' : 'var(--border-default)'}`,
                }}>
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold"
                      style={{ background: online ? 'linear-gradient(135deg,#8B5CF6,#6366F1)' : 'var(--bg-hover)' }}>
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {d.device_name ?? `Device ${d.device_id.slice(0, 8)}`}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>
                        {d.device_id.slice(0, 18)}…
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${online ? '' : ''}`}
                    style={{
                      background: online ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                      color: online ? 'var(--status-green)' : 'var(--text-muted)',
                    }}>
                    {online ? '● Online' : '○ Offline'}
                  </span>
                </div>

                {/* Vehicle link */}
                <div className="flex items-center gap-2 text-xs p-2 rounded-xl"
                  style={{ background: 'var(--bg-hover)' }}>
                  <Car className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {asset ? `${asset.name} · ${asset.license_plate || asset.brand}` : 'Chưa gán xe'}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Tốc độ</p>
                    <p className="font-bold" style={{ color: 'var(--accent-cyan)' }}>
                      {d.speed_kmh != null ? `${d.speed_kmh.toFixed(0)} km/h` : '—'}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Trạng thái</p>
                    <p className="font-bold" style={{ color: isActive ? 'var(--status-green)' : 'var(--text-muted)' }}>
                      {isActive ? '🚀 Đang chạy' : '⊙ Dừng'}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl col-span-2" style={{ background: 'var(--bg-hover)' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Vị trí</p>
                    <p className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {d.lat.toFixed(6)}, {d.lng.toFixed(6)}
                    </p>
                  </div>
                </div>

                {/* Last seen */}
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
                  <Clock className="w-3 h-3" />
                  <span>Lần cuối: {getLastSeenText(d.recorded_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
