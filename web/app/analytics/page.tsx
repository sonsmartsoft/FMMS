'use client';

import React, { useEffect, useState } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getExpenses } from '@/lib/services/expenseService';
import { getFuelLogs } from '@/lib/services/fuelService';
import { getMaintenanceRecords } from '@/lib/services/maintenanceService';
import { getTrips } from '@/lib/services/tripService';
import { BarChart3, TrendingDown, TrendingUp, Car, DollarSign, Gauge } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');

export default function AnalyticsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [maintRecords, setMaintRecords] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  const isSameAsset = (recAssetId: string, targetAssetId: string) => {
    if (recAssetId === targetAssetId) return true;
    const targetAsset = assets.find(a => a.id === targetAssetId);
    if (targetAsset?.license_plate === '19B-213.87' && (recAssetId === 'CAR01' || recAssetId === '22222222-2222-2222-2222-222222222222' || recAssetId === '20260308-0001-4222-8888-19b213872026')) return true;
    if (targetAsset?.license_plate === '88C1-210.63' && (recAssetId === 'BIKE01' || recAssetId === '20170801-0002-4111-8888-88c121063016')) return true;
    if (targetAsset?.license_plate === '88L1-604.36' && (recAssetId === 'BIKE02' || recAssetId === '20210405-0003-4333-8888-88l160436021')) return true;
    if (targetAsset?.license_plate === 'MTB 26-555' && (recAssetId === 'BIKE03' || recAssetId === '20240310-0004-4444-8888-00000mtb2605')) return true;
    if (targetAsset?.license_plate === 'MTB 20-999' && (recAssetId === 'BIKE04' || recAssetId === '20240310-0005-4555-8888-00000mtb2005')) return true;
    return false;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, f, m, e, t] = await Promise.all([
          getAssets(), getFuelLogs(), getMaintenanceRecords(), getExpenses(), getTrips(),
        ]);
        if (cancelled) return;
        setAssets(a); setFuelLogs(f); setMaintRecords(m); setExpenses(e); setTrips(t);
      } catch {
        /* rỗng */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredFuelLogs = selectedAssetId ? fuelLogs.filter(f => isSameAsset(f.asset_id, selectedAssetId)) : fuelLogs;
  const filteredMaintRecords = selectedAssetId ? maintRecords.filter(m => isSameAsset(m.asset_id, selectedAssetId)) : maintRecords;
  const filteredExpenses = selectedAssetId ? expenses.filter(e => isSameAsset(e.asset_id, selectedAssetId)) : expenses;
  const filteredTrips = selectedAssetId ? trips.filter(t => isSameAsset(t.asset_id, selectedAssetId)) : trips;
  const filteredAssets = selectedAssetId ? assets.filter(a => a.id === selectedAssetId) : assets;

  const totalFuelCost = filteredFuelLogs.reduce((s, f) => s + f.total_cost, 0);
  const totalMaintCost = filteredMaintRecords.reduce((s, m) => s + m.cost, 0);
  const totalInsurance = filteredExpenses.filter(e => e.category === 'INSURANCE').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const totalKm = filteredAssets.reduce((s, a) => s + (a.current_odometer_km || 0), 0);
  const totalTripKm = filteredTrips.reduce((s, t) => s + (t.distance_km || 0), 0);
  const totalFleetValue = filteredAssets.reduce((s, a) => s + (a.current_value || 0), 0);
  const totalPurchase = filteredAssets.reduce((s, a) => s + (a.purchase_price || 0), 0);
  const totalDepreciation = Math.max(0, totalPurchase - totalFleetValue);
  const avgSpeed = filteredTrips.length > 0 ? filteredTrips.reduce((s, t) => s + (t.average_speed_kmh || 0), 0) / filteredTrips.length : 0;

  const CAT_DATA = [
    { label: 'Nhiên liệu', total: totalFuelCost, color: '#F59E0B', pct: totalExpenses > 0 ? (totalFuelCost / totalExpenses * 100) : 0 },
    { label: 'Bảo dưỡng', total: totalMaintCost, color: '#38BDF8', pct: totalExpenses > 0 ? (totalMaintCost / totalExpenses * 100) : 0 },
    { label: 'Bảo hiểm', total: totalInsurance, color: '#A78BFA', pct: totalExpenses > 0 ? (totalInsurance / totalExpenses * 100) : 0 },
    { label: 'Khác', total: Math.max(0, totalExpenses - totalFuelCost - totalMaintCost - totalInsurance), color: '#94A3B8', pct: 0 },
  ];
  CAT_DATA[3].pct = totalExpenses > 0 ? (CAT_DATA[3].total / totalExpenses * 100) : 0;

  const PER_ASSET = filteredAssets.map(a => ({
    name: a.name.split(' ')[0] + ' ' + (a.license_plate || a.model),
    km: a.current_odometer_km,
    value: a.current_value,
    depreciation: (a.purchase_price || 0) - (a.current_value || 0),
    depPct: a.purchase_price > 0 ? (((a.purchase_price - a.current_value) / a.purchase_price) * 100).toFixed(1) : '0',
  }));

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return filteredExpenses.filter(e => (e.date || '').startsWith(`2026-${m}`)).reduce((s, e) => s + e.amount, 0);
  });
  const monthlyMax = Math.max(...monthlyTotals, 1);
  const currentMonthIdx = new Date().getMonth();

  const selectedVehicleObj = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Báo Cáo &amp; Phân Tích</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {selectedAssetId ? (
            <span>Phương tiện: <strong className="text-cyan-400">{selectedVehicleObj?.name}</strong> · TCO &amp; Hiệu suất vận hành xe</span>
          ) : (
            <span>TCO — Total Cost of Ownership · Hiệu suất vận hành toàn bộ đội {assets.length} phương tiện</span>
          )}
        </p>
      </div>

      {/* ─── Vehicle Filter Bar ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Lọc báo cáo theo phương tiện ({assets.length} xe)
          </p>
          {selectedAssetId && (
            <button 
              onClick={() => setSelectedAssetId(null)} 
              className="text-[11px] font-bold underline transition hover:opacity-80 flex items-center space-x-1 cursor-pointer"
              style={{ color: 'var(--accent-cyan)' }}
            >
              <span>Xem tất cả phương tiện</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Option: Tất cả */}
          <div
            onClick={() => setSelectedAssetId(null)}
            className={`p-3 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-between ${
              selectedAssetId === null ? 'shadow-md ring-2 ring-cyan-500 scale-[1.02]' : 'hover:border-cyan-500/50'
            }`}
            style={{
              background: selectedAssetId === null ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-secondary)',
              borderColor: selectedAssetId === null ? 'var(--accent-cyan)' : 'var(--border-default)',
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ background: 'var(--accent-cyan)', color: '#fff' }}>
                ALL
              </div>
              <div className="overflow-hidden">
                <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>Tất cả xe</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{assets.length} xe</p>
              </div>
            </div>
            <p className="text-right text-[11px] font-extrabold mt-2" style={{ color: 'var(--status-red)' }}>
              {fmt(expenses.reduce((s, e) => s + e.amount, 0))} ₫
            </p>
          </div>

          {/* Vehicle Cards */}
          {assets.map(a => {
            const isSelected = selectedAssetId === a.id;
            const assetExps = expenses.filter(e => isSameAsset(e.asset_id, a.id));
            const assetCost = assetExps.reduce((s, e) => s + e.amount, 0);

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAssetId(isSelected ? null : a.id)}
                className={`p-3 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-between ${
                  isSelected ? 'shadow-md ring-2 ring-cyan-500 scale-[1.02]' : 'hover:border-cyan-500/50 opacity-90 hover:opacity-100'
                }`}
                style={{
                  background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-secondary)',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-default)',
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}>
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs" style={{ color: 'var(--accent-cyan)' }}>
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.model}</p>
                  </div>
                </div>

                <p className="text-right text-[11px] font-extrabold mt-2" style={{ color: 'var(--status-red)' }}>
                  {fmt(assetCost)} ₫
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Tổng chi phí vận hành', value: `${(totalExpenses / 1_000_000).toFixed(1)}M ₫`, sub: 'Toàn bộ danh mục', color: 'var(--status-red)', Icon: DollarSign },
          { label: 'Tổng km đội xe', value: `${fmt(totalKm)} km`, sub: `${assets.length} phương tiện`, color: 'var(--accent-cyan)', Icon: Gauge },
          { label: 'Tổng khấu hao', value: `${(totalDepreciation / 1_000_000).toFixed(0)}M ₫`, sub: `${((totalDepreciation / totalPurchase) * 100).toFixed(1)}% giá trị ban đầu`, color: 'var(--status-amber)', Icon: TrendingDown },
          { label: 'Giá trị đội xe hiện tại', value: `${(totalFleetValue / 1_000_000).toFixed(0)}M ₫`, sub: 'Ước tính thị trường', color: 'var(--status-green)', Icon: TrendingUp },
        ].map((k, i) => (
          <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center space-x-2 mb-2">
              <k.Icon className="w-4 h-4" style={{ color: k.color }} />
              <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
            </div>
            <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Cost breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category bars */}
        <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phân bổ chi phí theo danh mục</h3>
          {CAT_DATA.map((c, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span style={{ color: 'var(--text-muted)' }}>{c.pct.toFixed(1)}%</span>
                  <span className="font-bold" style={{ color: c.color }}>{(c.total / 1_000_000).toFixed(1)}M ₫</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, background: c.color }} />
              </div>
            </div>
          ))}
          <div className="pt-3 flex justify-between text-xs" style={{ borderTop: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <span>Tổng cộng</span>
            <span className="font-bold" style={{ color: 'var(--status-red)' }}>{(totalExpenses / 1_000_000).toFixed(1)}M ₫</span>
          </div>
        </div>

        {/* Per vehicle */}
        <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Khấu hao theo từng xe</h3>
          {PER_ASSET.map((a, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="truncate max-w-[60%]" style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                <span className="font-bold" style={{ color: 'var(--status-amber)' }}>-{a.depPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                <div className="h-full rounded-full" style={{ width: `${a.depPct}%`, background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }} />
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                Khấu hao: {fmt(a.depreciation)} ₫ · Hiện tại: {(a.value / 1_000_000).toFixed(0)}M ₫
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Chi phí theo tháng (2026)</h3>
        <div className="flex items-end space-x-2 h-32">
          {monthlyTotals.map((v, i) => {
            const h = v > 0 ? Math.max(8, (v / monthlyMax) * 100) : 4;
            const isCurrentMonth = i === currentMonthIdx;
            return (
              <div key={i} className="flex-1 flex flex-col items-center space-y-1">
                <div className="w-full rounded-t-lg transition-all" style={{
                  height: `${h}%`,
                  background: v === 0 ? 'var(--bg-hover)' : isCurrentMonth
                    ? 'linear-gradient(to top, var(--accent-cyan), #3B82F6)'
                    : 'linear-gradient(to top, rgba(56,189,248,0.4), rgba(59,130,246,0.4))',
                  minHeight: 4,
                }} />
                <span className="text-[9px]" style={{ color: isCurrentMonth ? 'var(--accent-cyan)' : 'var(--text-faint)' }}>T{i + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--text-faint)' }}>* Đơn vị: nghìn đồng (K₫)</p>
      </div>

      {/* Trip stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng chuyến đi', value: trips.length, color: 'var(--accent-cyan)' },
          { label: 'Tổng km di chuyển', value: `${fmt(Math.round(totalTripKm))} km`, color: 'var(--text-primary)' },
          { label: 'TB tốc độ', value: trips.length > 0 ? `${avgSpeed.toFixed(1)} km/h` : '—', color: 'var(--status-green)' },
          { label: 'TB tiêu thụ', value: '—', color: 'var(--status-amber)' },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
