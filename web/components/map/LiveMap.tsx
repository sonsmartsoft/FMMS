'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleLatestPosition, GpsTrackPoint } from '@/lib/services/gpsService';
import { Asset } from '@/types/mobility';

// ── Fix Leaflet default icon broken in webpack/next ────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom car icon ─────────────────────────────────────────────────
function createCarIcon(color: string, isActive: boolean) {
  const size = isActive ? 44 : 36;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="20" fill="${color}" stroke="white" stroke-width="3" opacity="${isActive ? 1 : 0.7}"/>
      ${isActive ? `<circle cx="22" cy="22" r="20" fill="none" stroke="${color}" stroke-width="2" opacity="0.4">
        <animate attributeName="r" from="20" to="30" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite"/>
      </circle>` : ''}
      <text x="22" y="27" text-anchor="middle" font-size="16" fill="white">🚗</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// ── Auto-pan helper ─────────────────────────────────────────────────
function PanToLatest({ positions }: { positions: VehicleLatestPosition[] }) {
  const map = useMap();
  const didFit = useRef(false);
  useEffect(() => {
    if (positions.length === 0) return;
    if (!didFit.current) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      didFit.current = true;
    }
  }, [positions, map]);
  return null;
}

// ── Props ───────────────────────────────────────────────────────────
interface LiveMapProps {
  positions: VehicleLatestPosition[];
  assets: Asset[];
  activeTrack?: GpsTrackPoint[];   // Points of currently active trip
  selectedAssetId?: string | null;
}

const VEHICLE_COLORS = ['#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E', '#14B8A6'];

export default function LiveMap({ positions, assets, activeTrack = [], selectedAssetId }: LiveMapProps) {
  const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);

  const center: [number, number] =
    positions.length > 0
      ? [positions[0].lat, positions[0].lng]
      : [21.0285, 105.8542]; // Hanoi fallback

  const trackLatLngs = useMemo(
    () => activeTrack.map(p => [p.lat, p.lng] as [number, number]),
    [activeTrack]
  );

  return (
    <MapContainer
      center={center}
      zoom={13}
      className="w-full h-full"
      style={{ borderRadius: '1rem', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <PanToLatest positions={positions} />

      {/* Active trip track polyline */}
      {trackLatLngs.length > 1 && (
        <Polyline
          positions={trackLatLngs}
          pathOptions={{ color: '#0EA5E9', weight: 4, opacity: 0.85, dashArray: undefined }}
        />
      )}

      {/* Vehicle markers */}
      {positions.map((pos, idx) => {
        const asset = assetMap.get(pos.vehicle_id);
        const color = VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
        const isSelected = selectedAssetId === pos.vehicle_id;
        const isActive = pos.trip_id != null;
        const icon = createCarIcon(isSelected ? '#0EA5E9' : color, isActive);
        const speedText = pos.speed_kmh != null ? `${pos.speed_kmh.toFixed(0)} km/h` : 'Đứng yên';
        const timeText = new Date(pos.recorded_at).toLocaleTimeString('vi-VN');

        return (
          <Marker key={pos.vehicle_id} position={[pos.lat, pos.lng]} icon={icon}>
            <Popup minWidth={210}>
              <div style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  🚗 {asset?.name ?? pos.vehicle_id}
                </p>
                {pos.device_name && (
                  <p style={{ color: '#7C3AED', fontWeight: 600, marginBottom: 2 }}>
                    📡 {pos.device_name}
                  </p>
                )}
                <p style={{ color: '#64748b', marginBottom: 2 }}>
                  {asset?.license_plate ?? ''} · {asset?.brand ?? ''}
                </p>
                <p style={{ color: '#0EA5E9', fontWeight: 600, marginBottom: 2 }}>
                  ⚡ {speedText}
                </p>
                <p style={{ color: '#94a3b8', fontSize: 11 }}>
                  📍 {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                </p>
                <p style={{ color: '#94a3b8', fontSize: 11 }}>
                  🕐 {timeText}
                </p>
                {isActive && (
                  <p style={{ color: '#10B981', fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                    ● Đang có hành trình
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );

      })}

      {/* Empty state */}
      {positions.length === 0 && (
        <Marker position={center} icon={createCarIcon('#64748b', false)}>
          <Popup>Chưa có dữ liệu GPS. Kết nối Android để bắt đầu.</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
