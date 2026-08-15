'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Asset, CardDisplaySettings } from '@/types/mobility';
import { Car, Bike, Zap, Gauge, Fuel, Wrench, ShieldAlert, DollarSign, ArrowRight } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  settings: CardDisplaySettings;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset, settings }) => {
  const getAssetBadge = () => {
    switch (asset.asset_type) {
      case 'CAR':
        return { label: 'Ô TÔ', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Car };
      case 'MOTORCYCLE':
        return { label: 'MÔ TÔ', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Bike };
      case 'BICYCLE':
        return { label: 'XE ĐẠP', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: Bike };
      case 'E_BIKE':
        return { label: 'XE ĐIỆN', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Zap };
      default:
        return { label: 'KHÁC', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: Car };
    }
  };

  const badge = getAssetBadge();
  const BadgeIcon = badge.icon;

  const formatCurrency = (val: number) => {
    if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)}B ₫`;
    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}M ₫`;
    return `${val.toLocaleString()} ₫`;
  };

  return (
    <Link href={`/assets/${asset.id}`} className="block group">
      <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full relative">
        {/* Asset Thumbnail Image Anchor */}
        {settings.showPhoto && (
          <div className="relative w-full h-44 bg-slate-900 overflow-hidden">
            {asset.image_url ? (
              <img
                src={asset.image_url}
                alt={asset.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
                <BadgeIcon className="w-12 h-12 stroke-[1.5]" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-black/30" />

            {/* Type Badge */}
            {settings.showType && (
              <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider border flex items-center space-x-1.5 backdrop-blur-md ${badge.color}`}>
                <BadgeIcon className="w-3 h-3" />
                <span>{badge.label}</span>
              </div>
            )}

            {/* Status Dot */}
            <div className="absolute top-3 right-3 flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">Active</span>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div>
            {/* Asset Title */}
            {settings.showName && (
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {asset.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">{asset.brand} {asset.model} • {asset.year}</p>
                </div>
                {settings.showLicensePlate && asset.license_plate && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200">
                    {asset.license_plate}
                  </span>
                )}
              </div>
            )}

            {/* Purchase Price */}
            {settings.showPrice && asset.purchase_price > 0 && (
              <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-cyan-300 font-semibold">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Giá mua: {formatCurrency(asset.purchase_price)}</span>
              </div>
            )}
          </div>

          {/* Dynamic Metrics Matrix based on Asset Capabilities */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
            {/* Odometer / Distance */}
            {settings.showOdometer && asset.capabilities.has_mileage && (
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>{asset.asset_type === 'BICYCLE' ? 'Ride Dist' : 'Mileage'}</span>
                </div>
                <p className="font-bold text-slate-100 mt-0.5">
                  {asset.current_odometer_km.toLocaleString()} km
                </p>
              </div>
            )}

            {/* Fuel or Battery Level */}
            {settings.showFuelLevel && asset.capabilities.has_fuel && asset.fuel_level_percent !== undefined && (
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
                  <Fuel className="w-3 h-3 text-amber-400" />
                  <span>Mức xăng</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-bold text-amber-400">{asset.fuel_level_percent}%</span>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${asset.fuel_level_percent}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* E-Bike Battery Level */}
            {settings.showFuelLevel && asset.capabilities.has_battery && asset.fuel_level_percent !== undefined && (
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="flex items-center space-x-1 text-slate-400 text-[10px] font-medium">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>Mức pin</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-bold text-emerald-400">{asset.fuel_level_percent}%</span>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${asset.fuel_level_percent}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Consumption */}
            {settings.showConsumption && asset.capabilities.has_fuel && asset.avg_consumption_l100km && (
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="text-slate-400 text-[10px] font-medium">Tiêu thụ TB</div>
                <p className="font-bold text-slate-200 mt-0.5">{asset.avg_consumption_l100km} L/100km</p>
              </div>
            )}

            {/* Bicycle Rides count */}
            {asset.asset_type === 'BICYCLE' && asset.total_rides !== undefined && (
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                <div className="text-slate-400 text-[10px] font-medium">Số chuyến đi</div>
                <p className="font-bold text-emerald-400 mt-0.5">{asset.total_rides} chuyến</p>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-cyan-400 transition-colors">
            <span>Chi tiết quản lý</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};
