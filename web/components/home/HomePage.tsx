'use client';

import React, { useState } from 'react';
import { INITIAL_ASSETS, DEFAULT_CARD_SETTINGS } from '@/lib/data/mockData';
import { AssetCard } from '@/components/dashboard/AssetCard';
import { CardDisplaySettings, AssetType } from '@/types/mobility';
import { Plus, Car, Bike, Zap, Gauge, DollarSign, Fuel, Sparkles, Search } from 'lucide-react';

interface HomePageProps {
  cardSettings?: CardDisplaySettings;
}

export default function HomePage({ cardSettings = DEFAULT_CARD_SETTINGS }: HomePageProps) {
  const [filterType, setFilterType] = useState<AssetType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = INITIAL_ASSETS.filter((asset) => {
    const matchesType = filterType === 'ALL' || asset.asset_type === filterType;
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalFuelCostThisMonth = 1_674_750;
  const totalDistanceThisMonth = 3_842;

  const KPI = [
    {
      label: 'Tổng phương tiện',
      value: `${INITIAL_ASSETS.length} tài sản`,
      sub: '● Tất cả đang hoạt động tốt',
      subColor: 'var(--status-green)',
      icon: Car,
      iconBg: 'var(--accent-cyan-bg)',
      iconColor: 'var(--accent-cyan)',
      iconBorder: 'var(--accent-cyan-border)',
      valueColor: 'var(--text-primary)',
    },
    {
      label: 'Quãng đường tháng này',
      value: `${totalDistanceThisMonth.toLocaleString('vi-VN')} km`,
      sub: '+14% so với tháng trước',
      subColor: 'var(--accent-cyan)',
      icon: Gauge,
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#60A5FA',
      iconBorder: 'rgba(59,130,246,0.3)',
      valueColor: 'var(--text-primary)',
    },
    {
      label: 'Tốn nhiên liệu / Pin',
      value: `${totalFuelCostThisMonth.toLocaleString('vi-VN')} ₫`,
      sub: 'TB 6.9 L/100km (Mazda2)',
      subColor: 'var(--text-muted)',
      icon: Fuel,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: 'var(--status-amber)',
      iconBorder: 'rgba(245,158,11,0.3)',
      valueColor: 'var(--status-amber)',
    },
    {
      label: 'Dư nợ khoản vay',
      value: '210M ₫',
      sub: 'BIDV · 7.8M ₫/tháng',
      subColor: 'var(--text-muted)',
      icon: DollarSign,
      iconBg: 'rgba(244,63,94,0.12)',
      iconColor: 'var(--status-rose)',
      iconBorder: 'rgba(244,63,94,0.3)',
      valueColor: 'var(--status-rose)',
    },
  ];

  const FILTERS = [
    { id: 'ALL', label: `Tất cả (${INITIAL_ASSETS.length})`, icon: Car },
    { id: 'CAR', label: 'Ô tô (1)', icon: Car },
    { id: 'BICYCLE', label: 'Xe đạp (1)', icon: Bike },
    { id: 'E_BIKE', label: 'Xe điện (1)', icon: Zap },
    { id: 'MOTORCYCLE', label: 'Mô tô (1)', icon: Bike },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
        style={{ border: '1px solid var(--border-default)' }}>
        <div className="absolute -right-10 -bottom-10 w-60 h-60 rounded-full pointer-events-none blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.12), transparent)' }} />
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>
            <Sparkles className="w-4 h-4" />
            <span>HỆ THỐNG QUẢN LÝ TÀI SẢN DI CHUYỂN GIA ĐÌNH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            FAMILY MOBILITY DASHBOARD
          </h1>
          <p className="text-xs mt-1 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            Theo dõi {INITIAL_ASSETS.length} phương tiện gia đình · Virtual Odometer · Nhiên liệu/Pin · Lịch bảo dưỡng · Phân tích TCO
          </p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90 self-start"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" />
          <span>Thêm phương tiện</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k, i) => (
          <div key={i} className="glass-card p-4 rounded-2xl flex items-center justify-between"
            style={{ border: '1px solid var(--border-default)' }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
              <p className="text-xl font-extrabold mt-1" style={{ color: k.valueColor }}>{k.value}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: k.subColor }}>{k.sub}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: k.iconBg, color: k.iconColor, border: `1px solid ${k.iconBorder}` }}>
              <k.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Search Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((tab) => {
            const Icon = tab.icon;
            const isActive = filterType === (tab.id as any);
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                style={isActive
                  ? { background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', color: 'white' }
                  : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm phương tiện..."
            className="theme-input pl-9 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Asset Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <span>Danh sách phương tiện gia đình</span>
            <span className="text-xs font-normal" style={{ color: 'var(--accent-cyan)' }}>
              ({filteredAssets.length} phương tiện)
            </span>
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-faint)' }}>Click vào card để vào trang chi tiết</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} settings={cardSettings} />
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Không tìm thấy phương tiện nào</p>
          </div>
        )}
      </div>
    </div>
  );
}
