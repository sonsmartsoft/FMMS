'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { INITIAL_ASSETS } from '@/lib/data/mockData';
import { 
  Car, 
  Bike, 
  Zap, 
  ArrowLeft, 
  Gauge, 
  Fuel, 
  Wrench, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Cpu, 
  ShieldAlert, 
  CheckCircle2, 
  Calendar, 
  Plus, 
  Clock, 
  MapPin, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assetId = params?.id as string;

  const asset = INITIAL_ASSETS.find((a) => a.id === assetId) || INITIAL_ASSETS[0];

  // Dynamic Tabs based on capabilities
  const tabs = [
    { id: 'overview', label: 'Tổng quan', show: true, icon: Activity },
    { id: 'operation', label: 'Vận hành & OBD', show: asset.capabilities.has_obd || asset.capabilities.has_mileage, icon: Cpu },
    { id: 'trips', label: asset.asset_type === 'BICYCLE' ? 'Chuyến đạp (Rides)' : 'Lịch sử chuyến đi', show: asset.capabilities.has_ride || asset.capabilities.has_gps, icon: MapPin },
    { id: 'fuel', label: asset.capabilities.has_battery ? 'Quản lý Pin' : 'Nhiên liệu (Xăng)', show: asset.capabilities.has_fuel || asset.capabilities.has_battery, icon: Fuel },
    { id: 'maintenance', label: 'Bảo dưỡng', show: asset.capabilities.has_maintenance, icon: Wrench },
    { id: 'parts', label: 'Phụ tùng & Linh kiện', show: asset.capabilities.has_parts, icon: Layers },
    { id: 'upgrades', label: 'Nâng cấp / Phụ kiện', show: asset.capabilities.has_upgrades, icon: Plus },
    { id: 'expenses', label: 'Chi phí phát sinh', show: true, icon: DollarSign },
    { id: 'finance', label: 'Khoản vay ngân hàng', show: asset.capabilities.has_finance, icon: DollarSign },
    { id: 'insurance', label: 'Bảo hiểm & Giấy tờ', show: asset.capabilities.has_documents, icon: FileText },
    { id: 'analytics', label: 'Phân tích TCO & Chi phí/km', show: true, icon: BarChart3 },
  ].filter((t) => t.show);

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Dashboard gia đình</span>
      </button>

      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
            {asset.image_url ? (
              <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
            ) : (
              <Car className="w-10 h-10 text-slate-500 m-auto" />
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold uppercase">
                {asset.asset_type}
              </span>
              {asset.license_plate && (
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200">
                  {asset.license_plate}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">{asset.name}</h1>
            <p className="text-xs text-slate-400 font-medium">{asset.brand} {asset.model} ({asset.year}) • {asset.color}</p>
          </div>
        </div>

        {/* Quick KPI Badge */}
        <div className="flex items-center space-x-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Virtual Odometer</p>
            <p className="text-lg font-bold text-cyan-400 mt-0.5">{asset.current_odometer_km.toLocaleString()} km</p>
            <span className="text-[9px] text-slate-500">Source: {asset.odometer_source}</span>
          </div>

          {asset.capabilities.has_fuel && (
            <div className="border-l border-slate-800 pl-4">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Mức nhiên liệu</p>
              <p className="text-lg font-bold text-amber-400 mt-0.5">{asset.fuel_level_percent}%</p>
              <span className="text-[9px] text-slate-400">Tầm bay ~{asset.estimated_range_km} km</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 overflow-x-auto pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Content */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tổng quan thông số & Vận hành</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Giá mua ban đầu</span>
                <p className="text-lg font-bold text-white mt-1">{asset.purchase_price.toLocaleString()} ₫</p>
                <span className="text-[10px] text-slate-500">Ngày mua: {asset.purchase_date || 'N/A'}</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Giá trị ước tính hiện tại</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{asset.current_value.toLocaleString()} ₫</p>
                <span className="text-[10px] text-slate-500">Khấu hao: {(((asset.purchase_price - asset.current_value) / asset.purchase_price) * 100).toFixed(1)}%</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Bảo dưỡng tiếp theo</span>
                <p className="text-sm font-bold text-amber-400 mt-1">{asset.next_maintenance_due || 'OK'}</p>
                <span className="text-[10px] text-slate-500">Trạng thái: Hoạt động bình thường</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
              <h4 className="font-bold text-slate-200 mb-2">Mô tả phương tiện:</h4>
              <p className="text-slate-400 leading-relaxed">{asset.description}</p>
            </div>
          </div>
        )}

        {activeTab === 'operation' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Màn hình Vận hành & Dữ liệu Live OBD (ZESTECH 9")</h3>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>OBD KONNWEI KW906 Connected</span>
              </span>
            </div>

            {/* Live OBD Gauges mockup */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Tốc độ (Speed)</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">62 <span className="text-xs font-normal">km/h</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Vòng tua (RPM)</span>
                <p className="text-2xl font-black text-purple-400 mt-1">2,150 <span className="text-xs font-normal">rpm</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Nhiệt độ nước (Coolant)</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">91 <span className="text-xs font-normal">°C</span></p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Điện áp Bình (Voltage)</span>
                <p className="text-2xl font-black text-amber-400 mt-1">14.1 <span className="text-xs font-normal">V</span></p>
              </div>
            </div>

            {/* Virtual Odometer Strategy Ledger */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-cyan-300 uppercase">Thuật toán Odometer Strategy Ledger (Mazda2 Base 2026)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Verified Dashboard ODO:</span>
                  <p className="font-bold text-slate-200 mt-0.5">N/A (Hạn chế PID)</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">GPS Trip Distance Accumulated:</span>
                  <p className="font-bold text-cyan-400 mt-0.5">12,846.2 km</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">App Estimated Virtual ODO:</span>
                  <p className="font-bold text-emerald-400 mt-0.5">12,846 km (High Confidence)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trips' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Nhật ký Chuyến đi gần đây</h3>
            <div className="space-y-2 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-100">Chuyến đi Hà Nội ➔ Hải Phòng (Cao Tốc 5B)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">15/08/2026 • Thời gian: 1h 45m • Vận tốc TB: 68.2 km/h</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-cyan-400">118.5 km</p>
                  <p className="text-[10px] text-amber-400">8.2 L xăng tiêu thụ</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-100">Chuyến đi nội thành Cầu Giấy ➔ Hoàn Kiếm</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">14/08/2026 • Thời gian: 32m • Vận tốc TB: 24.5 km/h</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-cyan-400">12.4 km</p>
                  <p className="text-[10px] text-amber-400">0.95 L xăng tiêu thụ</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Danh sách chi phí ghi nhận</h3>
              <button className="px-3 py-1.5 rounded-xl bg-cyan-500 text-white font-bold text-xs">
                + Thêm chi phí
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                <div>
                  <p className="font-bold text-slate-200">Đổ xăng đầy bình (35.0L @ 23,100₫)</p>
                  <p className="text-[10px] text-slate-400">14/08/2026 • PV OIL CH 12</p>
                </div>
                <span className="font-bold text-amber-400">808,500 ₫</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                <div>
                  <p className="font-bold text-slate-200">Bảo dưỡng định kỳ 10,000 km</p>
                  <p className="text-[10px] text-slate-400">01/08/2026 • Mazda Hà Đông</p>
                </div>
                <span className="font-bold text-rose-400">1,250,000 ₫</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Theo dõi Khoản vay Mua xe</h3>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Ngân hàng cho vay:</span>
                <span className="font-bold text-white">BIDV Chi Nhánh Cầu Giấy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số tiền gốc ban đầu:</span>
                <span className="font-bold text-slate-200">250,000,000 ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dư nợ hiện tại:</span>
                <span className="font-bold text-rose-400">210,000,000 ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trả hàng tháng:</span>
                <span className="font-bold text-cyan-400">7,800,000 ₫ (Ngày 15 hàng tháng)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
