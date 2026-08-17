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
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [maintRecords, setMaintRecords] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

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

  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.total_cost, 0);
  const totalMaintCost = maintRecords.reduce((s, m) => s + m.cost, 0);
  const totalInsurance = expenses.filter(e => e.category === 'INSURANCE').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKm = assets.reduce((s, a) => s + a.current_odometer_km, 0);
  const totalTripKm = trips.reduce((s, t) => s + t.distance_km, 0);
  const totalFleetValue = assets.reduce((s, a) => s + a.current_value, 0);
  const totalPurchase = assets.reduce((s, a) => s + a.purchase_price, 0);
  const totalDepreciation = totalPurchase - totalFleetValue;
  const avgSpeed = trips.length > 0 ? trips.reduce((s, t) => s + t.average_speed_kmh, 0) / trips.length : 0;

  const CAT_DATA = [
    { label: 'Nhiên liệu', total: totalFuelCost, color: '#F59E0B', pct: totalExpenses > 0 ? (totalFuelCost / totalExpenses * 100) : 0 },
    { label: 'Bảo dưỡng', total: totalMaintCost, color: '#38BDF8', pct: totalExpenses > 0 ? (totalMaintCost / totalExpenses * 100) : 0 },
    { label: 'Bảo hiểm', total: totalInsurance, color: '#A78BFA', pct: totalExpenses > 0 ? (totalInsurance / totalExpenses * 100) : 0 },
    { label: 'Khác', total: Math.max(0, totalExpenses - totalFuelCost - totalMaintCost - totalInsurance), color: '#94A3B8', pct: 0 },
  ];
  CAT_DATA[3].pct = totalExpenses > 0 ? (CAT_DATA[3].total / totalExpenses * 100) : 0;

  const PER_ASSET = assets.map(a => ({
    name: a.name.split(' ')[0] + ' ' + (a.license_plate || a.model),
    km: a.current_odometer_km,
    value: a.current_value,
    depreciation: a.purchase_price - a.current_value,
    depPct: a.purchase_price > 0 ? ((a.purchase_price - a.current_value) / a.purchase_price * 100).toFixed(1) : '0',
  }));

  const monthlyTotals = Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return expenses.filter(e => (e.date || '').startsWith(`2026-${m}`)).reduce((s, e) => s + e.amount, 0);
  });
  const monthlyMax = Math.max(...monthlyTotals, 1);
  const currentMonthIdx = new Date().getMonth();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Báo Cáo & Phân Tích</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          TCO — Total Cost of Ownership · Hiệu suất vận hành toàn bộ đội phương tiện
        </p>
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
