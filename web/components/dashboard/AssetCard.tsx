'use client';

import React from 'react';
import Link from 'next/link';
import { Asset, CardDisplaySettings } from '@/types/mobility';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Car, Bike, Zap, Gauge, Fuel, DollarSign, ArrowRight, Battery } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  settings: CardDisplaySettings;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, settings }) => {
  const { isEn } = useLanguage();

  const ASSET_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    CAR:        { label: isEn ? 'CAR' : 'Ô TÔ',       bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
    MOTORCYCLE: { label: isEn ? 'MOTO' : 'MÔ TÔ',     bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
    BICYCLE:    { label: isEn ? 'BIKE' : 'XE ĐẠP',    bg: 'rgba(52,211,153,0.15)', color: '#34D399' },
    E_BIKE:     { label: isEn ? 'E-BIKE' : 'XE ĐIỆN', bg: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
  };

  const badge = ASSET_BADGE[asset.asset_type] || { label: isEn ? 'OTHER' : 'KHÁC', bg: 'rgba(100,116,139,0.15)', color: '#94A3B8' };

  const fmt = (v: number) => {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B ₫`;
    if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(0)}M ₫`;
    return `${v.toLocaleString(isEn ? 'en-US' : 'vi-VN')} ₫`;
  };

  const AssetIcon = asset.asset_type === 'BICYCLE' ? Bike : asset.asset_type === 'E_BIKE' ? Zap : Car;

  return (
    <Link href={`/assets/${asset.id}`} className="block group">
      <div
        className="glass-card rounded-2xl overflow-hidden flex flex-col h-full relative"
        style={{ border: '1px solid var(--border-default)', background: 'var(--bg-card)' }}
      >
        {/* Thumbnail */}
        {settings.showPhoto && (
          <div className="relative w-full h-44 overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
            {asset.image_url ? (
              <img
                src={asset.image_url}
                alt={asset.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-faint)' }}>
                <AssetIcon className="w-12 h-12 stroke-[1.5]" />
              </div>
            )}
            {/* Gradient overlay — subtle, works in both modes */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

            {/* Type Badge */}
            {settings.showType && (
              <div
                className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider border flex items-center space-x-1.5 backdrop-blur-md"
                style={{ background: badge.bg, color: badge.color, borderColor: badge.color + '55' }}
              >
                <AssetIcon className="w-3 h-3" />
                <span>{badge.label}</span>
              </div>
            )}

            {/* Status */}
            <div className="absolute top-3 right-3 flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.15)', color: '#34D399' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isEn ? 'Active' : 'Hoạt động'}</span>
            </div>

            {/* License plate overlay */}
            {settings.showLicensePlate && asset.license_plate && (
              <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded font-mono text-[11px] font-bold"
                style={{ background: 'rgba(0,0,0,0.7)', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.2)' }}>
                {asset.license_plate}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            {settings.showName && (
              <div>
                <h3
                  className="text-sm font-bold transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {asset.name}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {asset.brand} {asset.model} • {asset.year}
                </p>
              </div>
            )}

            {settings.showPrice && asset.purchase_price > 0 && (
              <div className="mt-2 flex items-center space-x-1.5 text-xs font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                <DollarSign className="w-3.5 h-3.5" />
                <span>{isEn ? 'Price' : 'Giá mua'}: {fmt(asset.purchase_price)}</span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          <div
            className="grid grid-cols-2 gap-2 pt-3 text-xs"
            style={{ borderTop: '1px solid var(--border-default)' }}
          >
            {settings.showOdometer && asset.capabilities.has_mileage && (
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center space-x-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  <Gauge className="w-3 h-3" style={{ color: 'var(--accent-cyan)' }} />
                  <span>{asset.asset_type === 'BICYCLE' ? (isEn ? 'Distance' : 'Quãng đường') : (isEn ? 'Mileage' : 'Quãng đường')}</span>
                </div>
                <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {asset.current_odometer_km.toLocaleString(isEn ? 'en-US' : 'vi-VN')} km
                </p>
              </div>
            )}

            {settings.showFuelLevel && asset.capabilities.has_fuel && asset.fuel_level_percent !== undefined && (
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center space-x-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  <Fuel className="w-3 h-3" style={{ color: 'var(--status-amber)' }} />
                  <span>{isEn ? 'Fuel Level' : 'Mức xăng'}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-baseline space-x-1">
                    <span className="font-bold" style={{ color: 'var(--status-amber)' }}>{asset.fuel_level_percent}%</span>
                    {asset.remaining_fuel_liters != null && (
                      <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>({asset.remaining_fuel_liters.toFixed(1)}L)</span>
                    )}
                  </div>
                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${asset.fuel_level_percent}%`, background: 'var(--status-amber)' }} />
                  </div>
                </div>
              </div>
            )}

            {settings.showFuelLevel && asset.capabilities.has_battery && asset.fuel_level_percent !== undefined && (
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center space-x-1 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                  <Battery className="w-3 h-3" style={{ color: 'var(--status-green)' }} />
                  <span>{isEn ? 'Battery' : 'Mức pin'}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-bold" style={{ color: 'var(--status-green)' }}>{asset.fuel_level_percent}%</span>
                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                    <div className="h-full rounded-full" style={{ width: `${asset.fuel_level_percent}%`, background: 'var(--status-green)' }} />
                  </div>
                </div>
              </div>
            )}

            {settings.showConsumption && asset.capabilities.has_fuel && asset.avg_consumption_l100km && (
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Avg Economy' : 'Tiêu thụ TB'}</div>
                <p className="font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>{asset.avg_consumption_l100km} L/100km</p>
              </div>
            )}

            {asset.asset_type === 'BICYCLE' && asset.total_rides !== undefined && (
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{isEn ? 'Total Rides' : 'Số chuyến'}</div>
                <p className="font-bold mt-0.5" style={{ color: 'var(--status-green)' }}>{asset.total_rides} {isEn ? 'rides' : 'chuyến'}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="pt-2 flex items-center justify-between text-xs font-semibold transition-colors"
            style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}
          >
            <span>{isEn ? 'View Vehicle Details' : 'Xem chi tiết quản lý'}</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" style={{ color: 'var(--accent-cyan)' }} />
          </div>
        </div>
      </div>
    </Link>
  );
};
