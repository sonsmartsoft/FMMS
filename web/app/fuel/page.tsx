'use client';

import React, { useEffect, useState } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getFuelLogs, createFuelLog } from '@/lib/services/fuelService';
import { Asset } from '@/types/mobility';
import { Fuel, Zap, TrendingDown, Plus, X } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

export default function FuelPage() {
  const [openModal, setOpenModal] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({ asset_id: '', date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '' });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, f] = await Promise.all([getAssets(), getFuelLogs()]);
        if (cancelled) return;
        setAssets(a);
        setLogs(f);
        if (a.length > 0) setForm(p => ({ ...p, asset_id: a[0].id }));
      } catch {
        /* sẽ hiện trạng thái rỗng */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fuelAssets = assets.filter(a => a.capabilities.has_fuel || a.capabilities.has_battery);
  const totalFuel = logs.reduce((s, f) => s + f.total_cost, 0);
  const totalLiters = logs.reduce((s, f) => s + f.liters, 0);

  const sorted = [...logs].sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
  let accKm = 0, accL = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].odometer_km - sorted[i - 1].odometer_km;
    if (d > 1) { accKm += d; accL += sorted[i].liters; }
  }
  const avgConsumption = accKm > 50 ? (accL / accKm * 100).toFixed(1) : null;

  const save = async () => {
    const l = parseFloat(form.liters) || 0;
    const p = parseFloat(form.price_per_liter) || 0;
    try {
      const created = await createFuelLog({
        asset_id: form.asset_id || assets[0]?.id,
        timestamp: new Date(form.date || Date.now()).toISOString(),
        odometer_km: parseFloat(form.odometer_km) || 0,
        fuel_liters: l,
        price_per_liter: p,
        station: form.station || undefined,
        notes: form.notes || undefined,
        tank_full: true,
      });
      setLogs([created, ...logs]);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(false);
    setForm({ asset_id: form.asset_id, date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Nhiên Liệu & Pin</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Theo dõi lịch sử đổ xăng & sạc pin toàn bộ phương tiện</p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Ghi nhận đổ xăng</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng chi phí NL', value: `${fmt(totalFuel)} ₫`, color: 'var(--status-amber)', icon: Fuel },
          { label: 'Tổng lít đổ', value: `${totalLiters.toFixed(1)} L`, color: 'var(--accent-cyan)', icon: Fuel },
          { label: 'TB Tiêu thụ', value: avgConsumption ? `${avgConsumption} L/100km` : '—', color: 'var(--status-green)', icon: TrendingDown },
          { label: 'Số lần đổ', value: logs.length, color: 'var(--text-primary)', icon: Zap },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Fuel Status per vehicle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fuelAssets.map(asset => (
          <div key={asset.id} className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{asset.license_plate || asset.model}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
                {asset.capabilities.has_battery ? 'ĐIỆN' : 'XĂNG'}
              </span>
            </div>
            {asset.fuel_level_percent !== undefined && (
              <>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--text-muted)' }}>{asset.capabilities.has_battery ? 'Mức pin' : 'Mức xăng'}</span>
                  <span className="font-bold" style={{ color: 'var(--status-amber)' }}>{asset.fuel_level_percent}% (~{asset.estimated_range_km} km)</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${asset.fuel_level_percent}%`,
                    background: asset.fuel_level_percent > 50 ? 'var(--status-green)' : asset.fuel_level_percent > 20 ? 'var(--status-amber)' : 'var(--status-red)',
                  }} />
                </div>
              </>
            )}
            {asset.avg_consumption_l100km && (
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>TB: {asset.avg_consumption_l100km} L/100km</p>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              {['Ngày', 'Số lít', 'Đơn giá', 'Tổng tiền', 'Odometer', 'Cây xăng', 'L/100km'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((f, i) => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(f.date)}</td>
                <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)' }}>{f.liters}L</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmt(f.price_per_liter)}₫</td>
                <td className="px-4 py-3 font-bold" style={{ color: 'var(--status-amber)' }}>{fmt(f.total_cost)}₫</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{fmt(f.odometer_km)} km</td>
                <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{f.station}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: f.consumption_l100km && f.consumption_l100km > 7.5 ? 'var(--status-red)' : 'var(--status-green)' }}>
                  {f.consumption_l100km ? `${f.consumption_l100km}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-md" style={{ border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ghi nhận đổ nhiên liệu</h3>
              <button onClick={() => setOpenModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện</label>
                <select className="theme-select" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>
                  {fuelAssets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày</label>
                <input type="date" className="theme-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số lít</label>
                  <input type="number" className="theme-input" placeholder="35.0" value={form.liters} onChange={e => setForm(p => ({ ...p, liters: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Giá/L (₫)</label>
                  <input type="number" className="theme-input" placeholder="23100" value={form.price_per_liter} onChange={e => setForm(p => ({ ...p, price_per_liter: e.target.value }))} />
                </div>
              </div>
              {form.liters && form.price_per_liter && (
                <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
                  Tổng: {fmt(parseFloat(form.liters) * parseFloat(form.price_per_liter))} ₫
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Odometer (km)</label>
                <input type="number" className="theme-input" placeholder="12846" value={form.odometer_km} onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Cây xăng</label>
                <input type="text" className="theme-input" placeholder="PV OIL Cầu Giấy" value={form.station} onChange={e => setForm(p => ({ ...p, station: e.target.value }))} />
              </div>
              <div className="flex space-x-2 pt-2">
                <button onClick={save} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 transition" style={{ background: 'var(--accent-cyan)' }}>Lưu</button>
                <button onClick={() => setOpenModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
