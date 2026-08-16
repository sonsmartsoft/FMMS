'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { INITIAL_ASSETS } from '@/lib/data/mockData';
import { Car, Bike, Zap, Plus, Search, Filter, ChevronRight } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  ALL: 'Tất cả', CAR: 'Ô Tô', MOTORCYCLE: 'Mô Tô', BICYCLE: 'Xe Đạp', E_BIKE: 'Xe Điện',
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  CAR: Car, MOTORCYCLE: Bike, BICYCLE: Bike, E_BIKE: Zap,
};
const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  CAR:        { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
  MOTORCYCLE: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
  BICYCLE:    { bg: 'rgba(52,211,153,0.15)', color: '#34D399' },
  E_BIKE:     { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
};

export default function AssetsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = INITIAL_ASSETS.filter((a) => {
    const matchType = filter === 'ALL' || a.asset_type === filter;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.license_plate || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Phương Tiện Gia Đình</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Quản lý {INITIAL_ASSETS.length} phương tiện · Virtual Odometer đồng bộ
          </p>
        </div>
        <button
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phương tiện</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm kiếm tên, biển số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="theme-input pl-9"
          />
        </div>
        <div className="flex items-center space-x-1">
          {Object.keys(TYPE_LABELS).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              style={filter === t
                ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              {['Phương tiện', 'Loại', 'Biển số / VIN', 'Odometer', 'Tình trạng', 'Giá mua', 'Bảo dưỡng tiếp theo', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset, i) => {
              const bc = BADGE_COLORS[asset.asset_type] || { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
              const AssetIcon = TYPE_ICONS[asset.asset_type] || Car;
              return (
                <tr
                  key={asset.id}
                  className="transition"
                  style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                        {asset.image_url
                          ? <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                          : <AssetIcon className="w-5 h-5 m-auto mt-2.5" style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                        <p style={{ color: 'var(--text-muted)' }}>{asset.brand} • {asset.year}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: bc.bg, color: bc.color }}>
                      {TYPE_LABELS[asset.asset_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {asset.license_plate || asset.vin?.slice(0, 10) || '—'}
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    {asset.current_odometer_km.toLocaleString('vi-VN')} km
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>
                      ● {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {(asset.purchase_price / 1_000_000).toFixed(0)}M ₫
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--status-amber)' }}>
                    {asset.next_maintenance_due || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/assets/${asset.id}`} className="flex items-center space-x-1 text-[11px] font-bold transition hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
                      <span>Chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">Không tìm thấy phương tiện</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng phương tiện', value: INITIAL_ASSETS.length, color: 'var(--accent-cyan)' },
          { label: 'Đang hoạt động', value: INITIAL_ASSETS.filter(a => a.status === 'ACTIVE').length, color: 'var(--status-green)' },
          { label: 'Tổng km cả đội', value: `${INITIAL_ASSETS.reduce((s,a)=>s+a.current_odometer_km,0).toLocaleString('vi-VN')} km`, color: 'var(--text-primary)' },
          { label: 'Tổng giá trị', value: `${(INITIAL_ASSETS.reduce((s,a)=>s+a.current_value,0)/1_000_000).toFixed(0)}M ₫`, color: 'var(--status-amber)' },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
