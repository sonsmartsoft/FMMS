'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GpsTrackPoint } from '@/lib/services/gpsService';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Moving marker icon ──────────────────────────────────────────────
function createReplayIcon(speed: number) {
  const color = speed > 80 ? '#F43F5E' : speed > 40 ? '#F59E0B' : '#10B981';
  return L.divIcon({
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function createStartIcon() {
  return L.divIcon({
    html: `<div style="background:#10B981;color:white;font-size:11px;font-weight:700;padding:3px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">START</div>`,
    className: '',
    iconAnchor: [20, 10],
  });
}

function createEndIcon() {
  return L.divIcon({
    html: `<div style="background:#F43F5E;color:white;font-size:11px;font-weight:700;padding:3px 6px;border-radius:6px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">END</div>`,
    className: '',
    iconAnchor: [16, 10],
  });
}

// ── Fit bounds to track ─────────────────────────────────────────────
function FitToTrack({ points }: { points: GpsTrackPoint[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (points.length === 0 || fitted.current) return;
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    fitted.current = true;
  }, [points, map]);
  return null;
}

// ── Props ───────────────────────────────────────────────────────────
interface TripReplayMapProps {
  points: GpsTrackPoint[];
  assetName?: string;
  totalDistanceKm?: number;
}

const SPEEDS = [1, 2, 5, 10, 20];

export default function TripReplayMap({ points, assetName, totalDistanceKm }: TripReplayMapProps) {
  const [cursor, setCursor] = useState(0);          // index in points[]
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);       // index in SPEEDS[]
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const playbackSpeed = SPEEDS[speedIdx];

  const clearTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setPlaying(false);
    setCursor(0);
  }, [clearTimer]);

  // Advance cursor at ~10 fps * playbackSpeed steps per second
  useEffect(() => {
    if (!playing) { clearTimer(); return; }
    if (cursor >= points.length - 1) { setPlaying(false); return; }
    intervalRef.current = setInterval(() => {
      setCursor(prev => {
        const next = prev + playbackSpeed;
        if (next >= points.length - 1) { setPlaying(false); return points.length - 1; }
        return next;
      });
    }, 100); // 10 fps
    return clearTimer;
  }, [playing, playbackSpeed, points.length, clearTimer, cursor]);

  const currentPoint = points[cursor];
  const travelledLatLngs = useMemo(
    () => points.slice(0, cursor + 1).map(p => [p.lat, p.lng] as [number, number]),
    [points, cursor]
  );
  const remainingLatLngs = useMemo(
    () => points.slice(cursor).map(p => [p.lat, p.lng] as [number, number]),
    [points, cursor]
  );

  const fmt = (n: number) => n.toLocaleString('vi-VN');
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN');
  const progress = points.length > 1 ? (cursor / (points.length - 1)) * 100 : 0;

  const center: [number, number] =
    points.length > 0 ? [points[0].lat, points[0].lng] : [21.0285, 105.8542];

  if (points.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center rounded-2xl" style={{ background: 'var(--bg-secondary)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Không có dữ liệu GPS cho hành trình này.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Map */}
      <div className="flex-1 relative rounded-2xl overflow-hidden" style={{ minHeight: 340 }}>
        <MapContainer center={center} zoom={13} className="w-full h-full" style={{ zIndex: 0 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToTrack points={points} />

          {/* Travelled segment — coloured */}
          {travelledLatLngs.length > 1 && (
            <Polyline positions={travelledLatLngs} pathOptions={{ color: '#0EA5E9', weight: 4, opacity: 0.9 }} />
          )}
          {/* Remaining segment — faded */}
          {remainingLatLngs.length > 1 && (
            <Polyline positions={remainingLatLngs} pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '6 4' }} />
          )}

          {/* Start marker */}
          <Marker position={[points[0].lat, points[0].lng]} icon={createStartIcon()}>
            <Popup>{fmtTime(points[0].recorded_at)} · Bắt đầu</Popup>
          </Marker>

          {/* End marker */}
          {points.length > 1 && (
            <Marker position={[points[points.length - 1].lat, points[points.length - 1].lng]} icon={createEndIcon()}>
              <Popup>{fmtTime(points[points.length - 1].recorded_at)} · Kết thúc</Popup>
            </Marker>
          )}

          {/* Moving car */}
          {currentPoint && (
            <Marker position={[currentPoint.lat, currentPoint.lng]} icon={createReplayIcon(currentPoint.speed_kmh ?? 0)}>
              <Popup>
                {fmtTime(currentPoint.recorded_at)}<br />
                {currentPoint.speed_kmh?.toFixed(0) ?? 0} km/h
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Overlay: current stats */}
        {currentPoint && (
          <div className="absolute top-3 right-3 z-[400] rounded-xl p-3 text-xs space-y-1"
            style={{ background: 'rgba(0,0,0,0.75)', color: 'white', backdropFilter: 'blur(8px)', minWidth: 140 }}>
            <p className="font-bold text-sm" style={{ color: '#38BDF8' }}>{assetName ?? 'Xe'}</p>
            <p>🕐 {fmtTime(currentPoint.recorded_at)}</p>
            <p>⚡ {currentPoint.speed_kmh?.toFixed(0) ?? 0} km/h</p>
            {totalDistanceKm != null && (
              <p>📍 {totalDistanceKm.toFixed(2)} km tổng</p>
            )}
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        {/* Progress bar */}
        <div className="relative">
          <input
            type="range"
            min={0}
            max={points.length - 1}
            value={cursor}
            onChange={e => { setPlaying(false); setCursor(Number(e.target.value)); }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: '#0EA5E9', background: `linear-gradient(to right, #0EA5E9 ${progress}%, var(--bg-hover) ${progress}%)` }}
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            <span>{fmtTime(points[0].recorded_at)}</span>
            <span className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{cursor + 1}/{points.length} điểm</span>
            <span>{fmtTime(points[points.length - 1].recorded_at)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={reset}
              className="p-2 rounded-xl transition hover:opacity-80"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
              title="Bắt đầu lại"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPlaying(p => !p)}
              className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-2 transition hover:opacity-90"
              style={{ background: playing ? '#F59E0B' : 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{playing ? 'Tạm dừng' : 'Phát lại'}</span>
            </button>
          </div>

          {/* Speed selector */}
          <div className="flex items-center space-x-1 text-xs">
            <FastForward className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            {SPEEDS.map((s, i) => (
              <button
                key={s}
                onClick={() => setSpeedIdx(i)}
                className="px-2 py-1 rounded-lg font-bold transition"
                style={{
                  background: speedIdx === i ? 'var(--accent-cyan)' : 'var(--bg-hover)',
                  color: speedIdx === i ? 'white' : 'var(--text-muted)',
                  border: `1px solid ${speedIdx === i ? 'var(--accent-cyan)' : 'var(--border-default)'}`,
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
