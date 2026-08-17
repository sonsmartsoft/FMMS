'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin, Radio, Play, Car, RefreshCw, Clock,
  ChevronRight, Navigation, Wifi, WifiOff, Shield,
} from 'lucide-react';
import { getAssets } from '@/lib/services/assetService';
import {
  getLatestPositions,
  getTripTrack,
  getTripsWithGps,
  subscribeToLivePositions,
  VehicleLatestPosition,
  GpsTrackPoint,
  TripTrack,
} from '@/lib/services/gpsService';
import { Asset } from '@/types/mobility';
import { createClient } from '@/lib/supabase/client';

// ── SSR-safe dynamic imports for Leaflet ────────────────────────────
const LiveMap = dynamic(() => import('@/components/map/LiveMap'), {
  ssr: false,
  loading: () => <MapPlaceholder label="Đang tải bản đồ live..." />,
});

const TripReplayMap = dynamic(() => import('@/components/map/TripReplayMap'), {
  ssr: false,
  loading: () => <MapPlaceholder label="Đang tải bản đồ replay..." />,
});

const FleetAdminMap = dynamic(() => import('@/components/map/FleetAdminMap'), {
  ssr: false,
  loading: () => <MapPlaceholder label="Đang tải bản đồ fleet..." />,
});

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl gap-3"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
        style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
        <MapPin className="w-6 h-6" />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────
type TabId = 'live' | 'replay' | 'admin';

interface TripMeta {
  id: string;
  asset_id: string;
  started_at: string;
  ended_at: string | null;
  point_count: number;
}

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtTime = (iso: string) => new Date(iso).toLocaleString('vi-VN');
const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}g ${m}ph` : `${m} phút`;
};

// ── Main Page ────────────────────────────────────────────────────────
export default function MapPage() {
  const [tab, setTab] = useState<TabId>('live');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<VehicleLatestPosition[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | undefined>();
  const [loadingLive, setLoadingLive] = useState(true);

  // Replay states
  const [trips, setTrips] = useState<TripMeta[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [tripTrack, setTripTrack] = useState<TripTrack | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(false);

  // Admin map live state (same as live but shows all)
  const [adminPositions, setAdminPositions] = useState<VehicleLatestPosition[]>([]);

  const unsubRef = useRef<(() => void) | null>(null);
  const supabase = createClient();

  // ── Load assets and positions ────────────────────────────────────
  const loadPositions = useCallback(async (assetList: Asset[]) => {
    if (assetList.length === 0) return;
    const ids = assetList.map(a => a.id);
    try {
      const pos = await getLatestPositions(ids);
      setPositions(pos);
      setAdminPositions(pos);
      setLastUpdate(new Date());
    } catch {
      // Show empty state gracefully
    }
    setLoadingLive(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const a = await getAssets();
        setAssets(a);
        if (a.length > 0) setSelectedAssetId(a[0].id);
        await loadPositions(a);
      } catch {
        setLoadingLive(false);
      }
    })();
  }, [loadPositions]);

  // ── Live realtime subscription ────────────────────────────────────
  const startLive = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    const ids = assets.map(a => a.id);
    unsubRef.current = subscribeToLivePositions(ids, (point) => {
      setPositions(prev => {
        const updated = prev.filter(p => p.vehicle_id !== point.vehicle_id);
        return [...updated, {
          vehicle_id: point.vehicle_id,
          device_id: point.device_id,
          device_name: point.device_name,
          lat: point.lat,
          lng: point.lng,
          speed_kmh: point.speed_kmh,
          heading_deg: point.heading_deg,
          recorded_at: point.recorded_at,
          trip_id: point.trip_id,
        }];
      });
      setAdminPositions(prev => {
        const updated = prev.filter(p => p.vehicle_id !== point.vehicle_id);
        return [...updated, {
          vehicle_id: point.vehicle_id,
          device_id: point.device_id,
          device_name: point.device_name,
          lat: point.lat,
          lng: point.lng,
          speed_kmh: point.speed_kmh,
          heading_deg: point.heading_deg,
          recorded_at: point.recorded_at,
          trip_id: point.trip_id,
        }];
      });
      setLastUpdate(new Date());
    });
    setIsLive(true);
  }, [assets]);

  const stopLive = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    setIsLive(false);
  }, []);

  useEffect(() => () => { if (unsubRef.current) unsubRef.current(); }, []);

  // ── Load trips for replay ─────────────────────────────────────────
  useEffect(() => {
    if (tab !== 'replay') return;
    (async () => {
      try {
        const t = await getTripsWithGps(selectedAssetId ?? undefined);
        setTrips(t as TripMeta[]);
      } catch {}
    })();
  }, [tab, selectedAssetId]);

  const loadTripReplay = async (tripId: string) => {
    setSelectedTripId(tripId);
    setLoadingTrip(true);
    try {
      const track = await getTripTrack(tripId);
      setTripTrack(track);
    } catch {
      setTripTrack(null);
    }
    setLoadingTrip(false);
  };

  // ── Derived data ──────────────────────────────────────────────────
  const selectedAsset = assets.find(a => a.id === selectedAssetId);
  const selectedPos = positions.find(p => p.vehicle_id === selectedAssetId);
  const activeVehicles = positions.filter(p => p.trip_id != null).length;

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'live',   label: 'Live Map',      icon: Radio },
    { id: 'replay', label: 'Replay Trip',   icon: Play },
    { id: 'admin',  label: 'Fleet Admin',   icon: Shield },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            <MapPin className="w-6 h-6 text-cyan-400" />
            Bản Đồ GPS
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Vị trí realtime · Replay hành trình · Giám sát toàn bộ fleet
          </p>
        </div>

        {/* Live toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPositions(assets)}
            className="p-2 rounded-xl transition hover:opacity-80"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}
            title="Làm mới vị trí"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={isLive ? stopLive : startLive}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
            style={{ background: isLive ? 'rgba(239,68,68,0.85)' : 'linear-gradient(135deg,#0EA5E9,#3B82F6)' }}
          >
            {isLive ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {isLive ? 'Dừng Live' : 'Bật Live'}
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { label: 'Tổng phương tiện', value: assets.length, color: 'var(--accent-cyan)', icon: Car },
          { label: 'Đang di chuyển', value: activeVehicles, color: 'var(--status-green)', icon: Navigation },
          { label: 'Có GPS data', value: positions.length, color: 'var(--status-amber)', icon: MapPin },
          { label: 'Realtime', value: isLive ? 'LIVE' : 'OFF', color: isLive ? 'var(--status-green)' : 'var(--text-muted)', icon: Radio },
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

      {/* ── Tab Bar ── */}
      <div className="flex gap-2">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition"
              style={tab === t.id
                ? { background: 'var(--accent-cyan)', color: 'white' }
                : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
        {lastUpdate && (
          <span className="ml-auto text-[10px] self-center" style={{ color: 'var(--text-faint)' }}>
            Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
          </span>
        )}
      </div>

      {/* ════════════════════════════════════════
          TAB: LIVE MAP
      ════════════════════════════════════════ */}
      {tab === 'live' && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1" style={{ minHeight: 520 }}>
          {/* Sidebar */}
          <div className="lg:w-64 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Chọn phương tiện</p>
            <div className="space-y-1.5">
              {assets.map((a, idx) => {
                const pos = positions.find(p => p.vehicle_id === a.id);
                const isSelected = selectedAssetId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAssetId(a.id)}
                    className="w-full text-left p-3 rounded-xl transition text-xs"
                    style={{
                      background: isSelected ? 'var(--accent-cyan-bg)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-cyan-border)' : 'var(--border-default)'}`,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-[11px]"
                        style={{ background: `hsl(${idx * 60}, 70%, 50%)` }}>
                        {a.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{a.name}</p>
                        <p style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.brand}</p>
                      </div>
                      {pos ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-500/50 shrink-0" />
                      )}
                    </div>
                    {pos && (
                      <div className="mt-2 pt-2 grid grid-cols-2 gap-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tốc độ:</span>
                        <span className="font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                          {pos.speed_kmh?.toFixed(0) ?? 0} km/h
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>Trạng thái:</span>
                        <span className="font-semibold" style={{ color: pos.trip_id ? 'var(--status-green)' : 'var(--text-muted)' }}>
                          {pos.trip_id ? 'Di chuyển' : 'Dừng'}
                        </span>
                      </div>
                    )}
                    {!pos && (
                      <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>Chưa có dữ liệu GPS</p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* No GPS hint */}
            {positions.length === 0 && !loadingLive && (
              <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#FBBF24' }}>
                <p className="font-bold mb-1">⚠️ Chưa có GPS data</p>
                <p style={{ color: 'var(--text-muted)' }}>Kết nối Android với ELM327 và bật trip để bắt đầu gửi GPS.</p>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: 480, border: '1px solid var(--border-default)' }}>
            <LiveMap
              positions={positions}
              assets={assets}
              selectedAssetId={selectedAssetId}
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: REPLAY TRIP
      ════════════════════════════════════════ */}
      {tab === 'replay' && (
        <div className="flex flex-col lg:flex-row gap-4 flex-1" style={{ minHeight: 520 }}>
          {/* Trip List */}
          <div className="lg:w-72 space-y-3">
            {/* Asset selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Chọn phương tiện</label>
              <select
                className="theme-select"
                value={selectedAssetId ?? ''}
                onChange={e => { setSelectedAssetId(e.target.value || null); setSelectedTripId(null); setTripTrack(null); }}
              >
                <option value="">-- Tất cả xe --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.license_plate || a.brand})</option>)}
              </select>
            </div>

            <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
              Hành trình có GPS ({trips.length})
            </p>

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {trips.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  Chưa có hành trình nào có dữ liệu GPS
                </p>
              )}
              {trips.map(trip => {
                const asset = assets.find(a => a.id === trip.asset_id);
                const isSelected = selectedTripId === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => loadTripReplay(trip.id)}
                    className="w-full text-left p-3 rounded-xl transition text-xs"
                    style={{
                      background: isSelected ? 'var(--accent-cyan-bg)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-cyan-border)' : 'var(--border-default)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                          {asset?.name ?? trip.asset_id.slice(0, 8)}
                        </p>
                        <p style={{ color: 'var(--text-muted)' }}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {fmtTime(trip.started_at)}
                        </p>
                        <p style={{ color: 'var(--text-faint)' }}>
                          {trip.point_count} điểm GPS
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Replay Map */}
          <div className="flex-1 flex flex-col" style={{ minHeight: 480 }}>
            {loadingTrip && <MapPlaceholder label="Đang tải dữ liệu GPS hành trình..." />}
            {!loadingTrip && tripTrack && (
              <>
                {/* Trip stats bar */}
                <div className="grid grid-cols-4 gap-2 mb-3 text-xs text-center">
                  {[
                    { label: 'Khoảng cách', value: `${tripTrack.totalDistanceKm.toFixed(2)} km`, color: 'var(--accent-cyan)' },
                    { label: 'Thời gian', value: fmtDuration(tripTrack.durationSeconds), color: 'var(--status-amber)' },
                    { label: 'TB tốc độ', value: `${tripTrack.avgSpeedKmh.toFixed(0)} km/h`, color: 'var(--status-green)' },
                    { label: 'Tốc độ max', value: `${tripTrack.maxSpeedKmh.toFixed(0)} km/h`, color: 'var(--status-red)' },
                  ].map((s, i) => (
                    <div key={i} className="p-2.5 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                      <p className="font-extrabold text-sm" style={{ color: s.color }}>{s.value}</p>
                      <p style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex-1 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
                  <TripReplayMap
                    points={tripTrack.points}
                    assetName={assets.find(a => a.id === (tripTrack.points[0]?.vehicle_id))?.name}
                    totalDistanceKm={tripTrack.totalDistanceKm}
                  />
                </div>
              </>
            )}
            {!loadingTrip && !tripTrack && (
              <MapPlaceholder label="Chọn một hành trình từ danh sách để xem replay" />
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: FLEET ADMIN MAP
      ════════════════════════════════════════ */}
      {tab === 'admin' && (
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ minHeight: 520, border: '1px solid var(--border-default)' }}>
          <FleetAdminMap
            positions={adminPositions}
            assets={assets}
            lastUpdate={lastUpdate}
          />
        </div>
      )}
    </div>
  );
}
