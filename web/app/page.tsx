'use client';

import React, { useState } from 'react';
import { INITIAL_ASSETS, DEFAULT_CARD_SETTINGS } from '@/lib/data/mockData';
import { AssetCard } from '@/components/dashboard/AssetCard';
import { CardDisplaySettings, AssetType } from '@/types/mobility';
import { 
  Plus, 
  Filter, 
  Sliders, 
  Car, 
  Bike, 
  Zap, 
  Gauge, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  Fuel, 
  BarChart2,
  Sparkles
} from 'lucide-react';

interface HomePageProps {
  cardSettings?: CardDisplaySettings;
}

export default function HomePage({ cardSettings = DEFAULT_CARD_SETTINGS }: HomePageProps) {
  const [filterType, setFilterType] = useState<AssetType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = INITIAL_ASSETS.filter((asset) => {
    const matchesType = filterType === 'ALL' || asset.asset_type === filterType;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          asset.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalDistanceThisMonth = 3842;
  const totalFuelCostThisMonth = 1674750;
  const totalExpenses = 4324750;
  const totalLoanBalance = 210000000;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-400 mb-1">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>HE THONG QUAN LY TAI SAN DI CHUYEN GIA DINH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            FAMILY MOBILITY DASHBOARD
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Nơi tập trung theo dõi 4 phương tiện gia đình, quãng đường Virtual Odometer, mức nhiên liệu/pin, lịch bảo dưỡng và phân tích tổng chi phí sở hữu (TCO).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition">
            <Plus className="w-4 h-4" />
            <span>Thêm phương tiện</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng phương tiện</p>
            <p className="text-xl font-extrabold text-white mt-1">{INITIAL_ASSETS.length} tài sản</p>
            <p className="text-[10px] text-emerald-400 font-medium mt-0.5">● Tất cả đang hoạt động tốt</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quãng đường tháng này</p>
            <p className="text-xl font-extrabold text-white mt-1">{totalDistanceThisMonth.toLocaleString()} km</p>
            <p className="text-[10px] text-cyan-400 font-medium mt-0.5">+14% so với tháng trước</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tốn nhiên liệu / Pin</p>
            <p className="text-xl font-extrabold text-amber-400 mt-1">{totalFuelCostThisMonth.toLocaleString()} ₫</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">TB 6.9L/100km (Mazda2)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Fuel className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Dư nợ khoản vay</p>
            <p className="text-xl font-extrabold text-rose-400 mt-1">210M ₫</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">BIDV • 7.8M ₫/tháng</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Category Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/10">
        {/* Category Tabs */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả (4)', icon: Car },
            { id: 'CAR', label: 'Ô tô (1)', icon: Car },
            { id: 'BICYCLE', label: 'Xe đạp (1)', icon: Bike },
            { id: 'E_BIKE', label: 'Xe điện (1)', icon: Zap },
            { id: 'MOTORCYCLE', label: 'Mô tô (1)', icon: Bike },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm phương tiện..."
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-60"
          />
        </div>
      </div>

      {/* Visual Asset Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Danh sách phương tiện gia đình</span>
            <span className="text-xs text-cyan-400 font-normal">({filteredAssets.length} phương tiện)</span>
          </h2>
          <span className="text-xs text-slate-400">Click vào card để vào trang chi tiết</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <AssetCard key={asset.id} asset={asset} settings={cardSettings} />
          ))}
        </div>
      </div>
    </div>
  );
}
