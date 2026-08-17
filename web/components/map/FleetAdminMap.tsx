'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VehicleLatestPosition } from '@/lib/services/gpsService';
import { Asset } from '@/types/mobility';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const COLORS = ['#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#F43F5E', '#14B8A6', '#EC4899'];

function createAdminIcon(color: string, speed: number | null, isActive: boolean) {
  const pulse = isActive
    ? `<circle cx="22" cy="22" r="20" fill="none" stroke="${color}" stroke-width="2" opacity="0.5">
        <animate attributeName="r" from="20" to="32" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" from="0.5" to="0" dur="1.8s" repeatCount="indefinite"/>
       </circle>`
    : '';
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
      ${pulse}
      <circle cx="22" cy="22" r="18" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="22" y="27" text-anchor="middle" font-size="14" fill="white">🚗</text>
    </svg>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

function FitFleet({ positions }: { positions: VehicleLatestPosition[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length === 0 || fitted.current) return;
    const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
    fitted.current = true;
  }, [positions, map]);
  return null;
}

interface FleetAdminMapProps {
  positions: VehicleLatestPosition[];
  assets: Asset[];
  lastUpdate?: Date;
}

export default function FleetAdminMap({ positions, assets, lastUpdate }: FleetAdminMapProps) {
  const assetMap = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets]);

  const center: [number, number] =
    positions.length > 0
      ? [positions[0].lat, positions[0].lng]
      : [21.0285, 105.8542];

  const activeCount = positions.filter(p => p.trip_id != null).length;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={12}
        className="w-full h-full"
        style={{ borderRadius: '1rem', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitFleet positions={positions} />

        {positions.map((pos, idx) => {
          const asset = assetMap.get(pos.vehicle_id);
          const color = COLORS[idx % COLORS.length];
          const isActive = pos.trip_id != null;
          const icon = createAdminIcon(color, pos.speed_kmh, isActive);
          return (
            <Marker key={pos.vehicle_id} position={[pos.lat, pos.lng]} icon={icon}>
              <Popup minWidth={200}>
                <div style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: color }}>
                    {asset?.name ?? pos.vehicle_id}
                  </p>
                  <p style={{ color: '#475569', marginBottom: 2 }}>
                    🪪 {asset?.license_plate ?? 'Chưa có biển'}
                  </p>
                  <p style={{ color: '#0EA5E9', fontWeight: 600, marginBottom: 2 }}>
                    ⚡ {pos.speed_kmh != null ? `${pos.speed_kmh.toFixed(0)} km/h` : 'Đứng yên'}
                  </p>
                  <p style={{ color: '#64748b', fontSize: 11 }}>
                    📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: 11 }}>
                    🕐 {new Date(pos.recorded_at).toLocaleTimeString('vi-VN')}
                  </p>
                  <p style={{ color: isActive ? '#10B981' : '#94a3b8', fontWeight: 600, fontSize: 11, marginTop: 4 }}>
                    {isActive ? '● Đang di chuyển' : '◎ Dừng'}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Fleet status overlay */}
      <div
        className="absolute top-3 left-3 z-[400] rounded-xl p-3 text-xs space-y-1.5"
        style={{ background: 'rgba(0,0,0,0.8)', color: 'white', backdropFilter: 'blur(10px)', minWidth: 160 }}
      >
        <p className="font-bold text-sm" style={{ color: '#38BDF8' }}>🗺️ Fleet Admin Map</p>
        <p>🚗 Tổng xe: <strong>{positions.length}</strong></p>
        <p style={{ color: '#34D399' }}>● Đang chạy: <strong>{activeCount}</strong></p>
        <p style={{ color: '#94a3b8' }}>◎ Dừng: <strong>{positions.length - activeCount}</strong></p>
        {lastUpdate && (
          <p style={{ color: '#64748b', fontSize: 10 }}>
            Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
}
