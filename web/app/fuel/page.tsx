'use client';

import React, { useEffect, useState, useMemo } from 'react';

import {
  ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend,
} from 'recharts';
import Link from 'next/link';
import { getAssets } from '@/lib/services/assetService';
import { getFuelLogs, createFuelLog, updateFuelLog, deleteFuelLog } from '@/lib/services/fuelService';
import { Asset } from '@/types/mobility';
import { Fuel, Zap, TrendingDown, Plus, X, Pencil, Trash2, Check, BarChart3 } from 'lucide-react';
import DraggableModal from '@/components/ui/DraggableModal';


const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return d; }
};

const emptyForm = () => ({
  asset_id: '', date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '',
});

export default function FuelPage() {
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetFilter, setAssetFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const reload = async () => {
    try {
      const [a, f] = await Promise.all([getAssets(), getFuelLogs()]);
      setAssets(a);
      // getFuelLogs returns { data, error } or array depending on service impl
      const logsArr = Array.isArray(f) ? f : (f as any)?.data ?? [];
      setLogs(logsArr);
      if (a.length > 0 && !form.asset_id) setForm(p => ({ ...p, asset_id: a[0].id }));
    } catch {
      /* show empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const fuelAssets = assets.filter(a => a.capabilities?.has_fuel || a.capabilities?.has_battery);

  const [sortCol, setSortCol] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredLogs = assetFilter === 'ALL' ? logs : logs.filter(l => l.asset_id === assetFilter || l.vehicle_id === assetFilter);

  const displayedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (sortCol === 'date') {
        valA = a.date ?? a.timestamp ?? '';
        valB = b.date ?? b.timestamp ?? '';
      } else if (sortCol === 'asset') {
        valA = assets.find(x => x.id === (a.asset_id ?? a.vehicle_id))?.name ?? '';
        valB = assets.find(x => x.id === (b.asset_id ?? b.vehicle_id))?.name ?? '';
      } else if (sortCol === 'liters') {
        valA = parseFloat(a.fuel_liters ?? a.liters ?? 0);
        valB = parseFloat(b.fuel_liters ?? b.liters ?? 0);
      } else if (sortCol === 'price_per_liter') {
        valA = parseFloat(a.price_per_liter ?? 0);
        valB = parseFloat(b.price_per_liter ?? 0);
      } else if (sortCol === 'total_cost') {
        valA = a.total_cost ?? (parseFloat(a.fuel_liters ?? a.liters ?? 0) * parseFloat(a.price_per_liter ?? 0));
        valB = b.total_cost ?? (parseFloat(b.fuel_liters ?? b.liters ?? 0) * parseFloat(b.price_per_liter ?? 0));
      } else if (sortCol === 'odometer_km') {
        valA = Number(a.odometer_km) || 0;
        valB = Number(b.odometer_km) || 0;
      } else if (sortCol === 'station') {
        valA = a.station ?? '';
        valB = b.station ?? '';
      } else if (sortCol === 'consumption') {
        valA = Number(a.consumption_l100km) || 0;
        valB = Number(b.consumption_l100km) || 0;
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [filteredLogs, assets, sortCol, sortDir]);

  const monthlyFuelData = useMemo(() => {
    interface MonthlyFuelAgg {
      month: string;
      liters: number;
      cost: number;
      count: number;
      prices: number[];
    }
    const map = new Map<string, MonthlyFuelAgg>();
    
    filteredLogs.forEach(l => {
      const d = l.date || l.timestamp || '';
      if (!d) return;
      const mKey = d.slice(0, 7); // YYYY-MM
      const liters = parseFloat(l.fuel_liters ?? l.liters ?? 0) || 0;
      const price = parseFloat(l.price_per_liter ?? 0) || 0;
      const cost = l.total_cost != null ? Number(l.total_cost) : (liters * price);

      const prev: MonthlyFuelAgg = map.get(mKey) || { month: mKey, liters: 0, cost: 0, count: 0, prices: [] };
      prev.liters += liters;
      prev.cost += cost;
      prev.count += 1;
      if (price > 0) prev.prices.push(price);
      map.set(mKey, prev);
    });


    const sortedKeys = Array.from(map.keys()).sort();
    return sortedKeys.map(k => {
      const item = map.get(k)!;
      const avgPrice = item.liters > 0 
        ? Math.round(item.cost / item.liters) 
        : (item.prices.length > 0 ? Math.round(item.prices.reduce((a, b) => a + b, 0) / item.prices.length) : 0);
      const [y, m] = k.split('-');
      return {
        key: k,
        label: `T${parseInt(m)}/${y.slice(2)}`,
        liters: Math.round(item.liters * 10) / 10,
        cost: item.cost,
        avgPrice: avgPrice,
        count: item.count,
      };
    });
  }, [filteredLogs]);

  const totalFuel = filteredLogs.reduce((s, f) => s + (f.total_cost || (parseFloat(f.fuel_liters ?? f.liters) * parseFloat(f.price_per_liter))), 0);
  const totalLiters = filteredLogs.reduce((s, f) => s + parseFloat(f.fuel_liters ?? f.liters ?? 0), 0);


  const sorted = [...filteredLogs].sort((x, y) => new Date(x.date ?? x.timestamp).getTime() - new Date(y.date ?? y.timestamp).getTime());
  let accKm = 0, accL = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].odometer_km - sorted[i - 1].odometer_km;
    if (d > 1) { accKm += d; accL += parseFloat(sorted[i].fuel_liters ?? sorted[i].liters ?? 0); }
  }
  const avgConsumption = accKm > 50 ? (accL / accKm * 100).toFixed(1) : null;

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm(), asset_id: fuelAssets[0]?.id ?? assets[0]?.id ?? '' });
    setOpenModal(true);
  };

  const openEdit = (log: any) => {
    setEditingId(log.id);
    setForm({
      asset_id: log.asset_id ?? log.vehicle_id ?? '',
      date: (log.date ?? log.timestamp ?? '').substring(0, 10),
      liters: String(log.fuel_liters ?? log.liters ?? ''),
      price_per_liter: String(log.price_per_liter ?? ''),
      odometer_km: String(log.odometer_km ?? ''),
      station: log.station ?? '',
      notes: log.notes ?? '',
    });
    setOpenModal(true);
  };

  const save = async () => {
    const l = parseFloat(form.liters) || 0;
    const p = parseFloat(form.price_per_liter) || 0;
    const payload = {
      asset_id: form.asset_id || assets[0]?.id,
      timestamp: new Date(form.date || Date.now()).toISOString(),
      odometer_km: parseFloat(form.odometer_km) || 0,
      fuel_liters: l,
      price_per_liter: p,
      station: form.station || undefined,
      notes: form.notes || undefined,
      tank_full: true,
    };

    try {
      if (editingId) {
        await updateFuelLog(editingId, payload);
        showToast('Đã cập nhật bản ghi nhiên liệu thành công!');
      } else {
        await createFuelLog(payload);
        showToast('Đã thêm bản ghi nhiên liệu mới thành công!');
      }
      await reload();
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
      return;
    }

    setOpenModal(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleDelete = async (log: any) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa bản ghi ngày ${fmtDate(log.date ?? log.timestamp)} (${log.fuel_liters ?? log.liters}L)?`)) return;
    try {
      await deleteFuelLog(log.id);
      showToast('Đã xóa bản ghi nhiên liệu thành công!');
      await reload();
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Nhiên Liệu &amp; Pin</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Theo dõi &amp; chỉnh sửa lịch sử đổ xăng &amp; sạc pin toàn bộ phương tiện</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          <Plus className="w-4 h-4" /><span>Ghi nhận đổ xăng</span>
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="p-4 rounded-xl flex items-center space-x-2 text-xs font-bold animate-fadeIn" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
          <Check className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng chi phí NL', value: `${fmt(totalFuel)} ₫`, color: 'var(--status-amber)' },
          { label: 'Tổng lít đổ', value: `${totalLiters.toFixed(1)} L`, color: 'var(--accent-cyan)' },
          { label: 'TB Tiêu thụ', value: avgConsumption ? `${avgConsumption} L/100km` : '—', color: 'var(--status-green)' },
          { label: 'Số lần đổ', value: filteredLogs.length, color: 'var(--text-primary)' },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Asset Filter Bar */}
      <div className="flex items-center space-x-2 text-xs flex-wrap gap-2">
        <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Phương tiện:</span>
        {[{ id: 'ALL', name: 'Tất cả' }, ...assets].map(a => (
          <button
            key={a.id}
            onClick={() => setAssetFilter(a.id)}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${assetFilter === a.id ? 'bg-cyan-500 text-white' : ''}`}
            style={assetFilter !== a.id ? { color: 'var(--text-secondary)', border: '1px solid var(--border-default)', background: 'var(--bg-hover)' } : {}}
          >
            {a.name}
          </button>
        ))}
      </div>

      {/* Rich Vehicle Info Cards */}
      {fuelAssets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fuelAssets.map(asset => {
            const vLogs = logs.filter(l => (l.asset_id ?? l.vehicle_id) === asset.id);
            const vTotalCost = vLogs.reduce((s, f) => s + (f.total_cost || (parseFloat(f.fuel_liters ?? f.liters) * parseFloat(f.price_per_liter))), 0);
            const vTotalLiters = vLogs.reduce((s, f) => s + parseFloat(f.fuel_liters ?? f.liters ?? 0), 0);
            const vLastOdo = vLogs.length > 0 ? Math.max(...vLogs.map(f => f.odometer_km || 0)) : (asset.current_odometer_km || 0);
            const isElectric = asset.fuel_type === 'ELECTRIC' || asset.capabilities?.has_battery;

            return (
              <div
                key={asset.id}
                className="glass-panel p-5 rounded-2xl space-y-3 transition hover:shadow-lg hover:border-cyan-500/50"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                      {asset.image_url ? (
                        <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        asset.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{asset.license_plate || `${asset.brand} ${asset.model}`}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${isElectric ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                    {isElectric ? '⚡ ĐIỆN' : '⛽ XĂNG'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Tổng chi phí NL:</span>
                    <p className="font-bold text-xs" style={{ color: 'var(--status-amber)' }}>{fmt(vTotalCost)} ₫</p>
                  </div>
                  <div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{isElectric ? 'Tổng kWh sạc:' : 'Tổng lít đổ:'}</span>
                    <p className="font-bold text-xs" style={{ color: 'var(--accent-cyan)' }}>{vTotalLiters.toFixed(1)} {isElectric ? 'kWh' : 'L'}</p>
                  </div>
                  <div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Số lần đổ / sạc:</span>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{vLogs.length} lần</p>
                  </div>
                  <div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Odometer hiện tại:</span>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(vLastOdo)} km</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-xs gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <button
                    onClick={() => setAssetFilter(asset.id)}
                    className="flex-1 py-1.5 rounded-lg text-center font-bold text-[11px] hover:bg-slate-500/10 transition"
                    style={{ color: 'var(--accent-cyan)', border: '1px solid var(--border-default)' }}
                  >
                    Lọc nhật ký xe này
                  </button>
                  <Link
                    href={`/assets/${asset.id}`}
                    className="flex-1 py-1.5 rounded-lg text-center font-bold text-[11px] text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                  >
                    Xem chi tiết xe ➔
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 📊 BIỂU ĐỒ THEO DÕI NHIÊN LIỆU THEO THÁNG */}
      {monthlyFuelData.length > 0 && (
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                <Fuel className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  Biểu Đồ Nhiên Liệu &amp; Đơn Giá Trung Bình Theo Tháng
                </h3>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Cột: Tổng Lít (hoặc kWh) • Cột: Tổng Tiền (₫) • Đường: Đơn Giá TB (₫/L hoặc ₫/kWh)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Tổng chi kỳ này: </span>
              <strong className="text-xs text-amber-400 font-mono">{fmt(totalFuel)} ₫</strong>
            </div>
          </div>

          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyFuelData} margin={{ top: 10, right: 20, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
                <YAxis
                  yAxisId="cost"
                  tickFormatter={v => v > 0 ? `${(v / 1_000_000).toFixed(1)}M` : '0'}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  tickLine={false}
                  width={45}
                />
                <YAxis
                  yAxisId="liters"
                  orientation="right"
                  tickFormatter={v => v > 0 ? `${Math.round(v)}L` : '0'}
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                  tickLine={false}
                  width={45}
                />
                <ReTooltip
                  formatter={(v: number, name: string) => {
                    if (name === 'Tổng tiền') return [`${fmt(v)} ₫`, name];
                    if (name === 'Số lượng (L/kWh)') return [`${v} L`, name];
                    if (name === 'Đơn giá TB') return [`${fmt(v)} ₫/L`, name];
                    return [v, name];
                  }}
                  contentStyle={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, fontSize: 11, color: '#F8FAFC' }}
                />
                <Legend formatter={v => <span style={{ color: '#E2E8F0', fontSize: 11, fontWeight: 600 }}>{v}</span>} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar yAxisId="cost" dataKey="cost" name="Tổng tiền" fill="rgba(245,158,11,0.45)" stroke="#F59E0B" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="liters" dataKey="liters" name="Số lượng (L/kWh)" fill="rgba(56,189,248,0.35)" stroke="#38BDF8" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
                <Line yAxisId="cost" type="monotone" dataKey="avgPrice" name="Đơn giá TB" stroke="#34D399" strokeWidth={2.5} dot={{ fill: '#34D399', r: 3.5 }} />
              </ComposedChart>

            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Fuel Log Table with Edit & Delete */}
      <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              {[
                { key: 'date', label: 'Ngày' },
                { key: 'asset', label: 'Phương tiện' },
                { key: 'liters', label: 'Số lít' },
                { key: 'price_per_liter', label: 'Đơn giá' },
                { key: 'total_cost', label: 'Tổng tiền' },
                { key: 'odometer_km', label: 'Odometer' },
                { key: 'station', label: 'Cây xăng' },
                { key: 'consumption', label: 'L/100km' },
              ].map(col => {
                const isSorted = sortCol === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => {
                      if (sortCol === col.key) {
                        setSortDir(p => p === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortCol(col.key);
                        setSortDir(col.key === 'date' || col.key === 'total_cost' ? 'desc' : 'asc');
                      }
                    }}
                    className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide cursor-pointer select-none hover:text-cyan-400 transition"
                    style={{ color: isSorted ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.label}</span>
                      <span className="text-[9px]">{isSorted ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </div>
                  </th>
                );
              })}
              <th className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu...</td>
              </tr>
            ) : displayedLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  Chưa có bản ghi nhiên liệu nào. Bấm <strong>Ghi nhận đổ xăng</strong> để thêm mới.
                </td>
              </tr>
            ) : displayedLogs.map((f, i) => {
              const assetName = assets.find(a => a.id === (f.asset_id ?? f.vehicle_id))?.name ?? '—';
              const liters = parseFloat(f.fuel_liters ?? f.liters ?? 0);
              const price = parseFloat(f.price_per_liter ?? 0);
              const total = f.total_cost ?? (liters * price);
              return (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(f.date ?? f.timestamp)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--accent-cyan)' }}>{assetName}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)' }}>{liters.toFixed(2)}L</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmt(price)}₫</td>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--status-amber)' }}>{fmt(total)}₫</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{fmt(f.odometer_km)} km</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{f.station || '—'}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: f.consumption_l100km && f.consumption_l100km > 7.5 ? 'var(--status-red)' : 'var(--status-green)' }}>
                    {f.consumption_l100km ? `${f.consumption_l100km}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEdit(f)}
                        className="p-1.5 rounded-lg transition hover:bg-cyan-500/10"
                        style={{ color: 'var(--accent-cyan)' }}
                        title="Chỉnh sửa bản ghi"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(f)}
                        className="p-1.5 rounded-lg transition hover:bg-rose-500/10 text-rose-400"
                        title="Xóa bản ghi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Fuel Modal */}
      {openModal && (
        <DraggableModal isOpen={true} onClose={() => () => {}}>
<div
              className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-2xl flex flex-col shadow-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: 'min(85vh, 600px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-5 shrink-0 border-b z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>{editingId ? '✏️ Chỉnh Sửa Bản Ghi Nhiên Liệu' : '⛽ Ghi Nhận Đổ Nhiên Liệu / Sạc Pin Mới'}</span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {editingId ? 'Cập nhật thông tin đợt đổ xăng' : 'Nhập thông tin đợt đổ xăng / sạc pin để tính mức tiêu thụ l/100km'}
                  </p>
                </div>
                <button onClick={() => setOpenModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">1. Thông tin Đợt Đổ Xăng</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                      <select className="theme-select font-semibold" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.license_plate || a.brand})</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày đổ xăng *</label>
                      <input type="date" className="theme-input font-medium" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">2. Số Lượng &amp; Chi Phí Nhiên Liệu</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Số lít *</label>
                      <input type="number" step="0.1" className="theme-input font-mono font-bold text-cyan-400" placeholder="35.0" value={form.liters} onChange={e => setForm(p => ({ ...p, liters: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Đơn giá (₫/Lít) *</label>
                      <input type="number" className="theme-input font-mono font-bold" placeholder="23100" value={form.price_per_liter} onChange={e => setForm(p => ({ ...p, price_per_liter: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Odometer lúc đổ (km)</label>
                      <input type="number" className="theme-input font-mono font-bold" placeholder="12846" value={form.odometer_km} onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))} />
                    </div>
                  </div>

                  {form.liters && form.price_per_liter && (
                    <div className="px-4 py-3 rounded-xl text-xs font-extrabold flex items-center justify-between" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Tổng thanh toán tiền xăng:</span>
                      <span className="text-sm font-mono text-cyan-400 font-extrabold">{fmt(parseFloat(form.liters) * parseFloat(form.price_per_liter))} ₫</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Cây xăng / Trạm sạc</label>
                      <input type="text" className="theme-input" placeholder="VD: PV OIL Cầu Giấy, Petrolimex Hà Đông..." value={form.station} onChange={e => setForm(p => ({ ...p, station: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Ghi chú thêm</label>
                      <input type="text" className="theme-input" placeholder="Ghi chú đợt đổ xăng..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <button
                  onClick={save}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                >
                  {editingId ? 'Cập nhật bản ghi' : 'Lưu bản ghi'}
                </button>
                <button
                  onClick={() => setOpenModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  Hủy
                </button>
              </div>
            
</div>
</DraggableModal>

      )}
    </div>
  );
}
