'use client';

import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, ComposedChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { getAssets } from '@/lib/services/assetService';
import { getExpenses } from '@/lib/services/expenseService';
import { getFuelLogs } from '@/lib/services/fuelService';
import { getMaintenanceRecords } from '@/lib/services/maintenanceService';
import { getTrips } from '@/lib/services/tripService';
import { BarChart3, TrendingDown, TrendingUp, Car, DollarSign, Gauge, Fuel, Wrench, Activity, ArrowUpRight } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtM = (n: number) => `${(n / 1_000_000).toFixed(1)}M`;

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-3 rounded-xl text-xs shadow-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', minWidth: 140 }}>
      {label && <p className="font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-bold font-mono" style={{ color: p.color }}>
            {typeof p.value === 'number'
              ? (p.name?.includes('km') || p.name?.includes('Km') || p.name?.includes('Quãng') ? `${fmt(Math.round(p.value))} km` : fmtM(p.value) + ' \u20ab')
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, sub, color = 'var(--accent-cyan)' }: { icon: any; title: string; sub?: string; color?: string }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '20', border: `1px solid ${color}40` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div>
      <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {sub && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  </div>
);

const CHART_COLORS = ['#F59E0B', '#38BDF8', '#A78BFA', '#34D399', '#F87171', '#FB923C'];
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export default function AnalyticsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [maintRecords, setMaintRecords] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        const [a, f, m, e, t] = await Promise.all([getAssets(), getFuelLogs(), getMaintenanceRecords(), getExpenses(), getTrips()]);
        if (cancelled) return;
        setAssets(a); setFuelLogs(f); setMaintRecords(m); setExpenses(e); setTrips(t);
      } catch { /* ignore */ } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
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

  const pieData = [
    { name: 'Nhi\u00ean li\u1ec7u', value: totalFuelCost, color: '#F59E0B' },
    { name: 'B\u1ea3o d\u01b0\u1ee1ng', value: totalMaintCost, color: '#38BDF8' },
    { name: 'B\u1ea3o hi\u1ec3m', value: totalInsurance, color: '#A78BFA' },
    { name: 'Kh\u00e1c', value: Math.max(0, totalExpenses - totalFuelCost - totalMaintCost - totalInsurance), color: '#64748B' },
  ].filter(d => d.value > 0);

  const allYears = Array.from(new Set([
    ...filteredExpenses.map(e => (e.date || '').slice(0, 4)),
    ...filteredFuelLogs.map(f => (f.date || '').slice(0, 4)),
    ...filteredMaintRecords.map(m => (m.date || '').slice(0, 4)),
  ])).filter(Boolean).sort();
  const chartYear = allYears[allYears.length - 1] || String(new Date().getFullYear());

  const monthlyData = MONTHS.map((label, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    const prefix = `${chartYear}-${m}`;
    const fuel = filteredFuelLogs.filter(f => (f.date || '').startsWith(prefix)).reduce((s, f) => s + f.total_cost, 0);
    const maint = filteredMaintRecords.filter(r => (r.date || '').startsWith(prefix)).reduce((s, r) => s + r.cost, 0);
    const ins = filteredExpenses.filter(e => e.category === 'INSURANCE' && (e.date || '').startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
    const other = filteredExpenses.filter(e => e.category !== 'INSURANCE' && (e.date || '').startsWith(prefix)).reduce((s, e) => s + e.amount, 0);
    const km = filteredTrips.filter(t => (t.start_time || '').startsWith(prefix)).reduce((s, t) => s + (t.distance_km || 0), 0);
    return { label, fuel, maint, ins, other, km, total: fuel + maint + ins + other };
  });

  const assetBarData = filteredAssets.map(a => ({
    name: `${a.name.split(' ')[0]} ${(a.license_plate || a.model || '').slice(0, 12)}`.slice(0, 18),
    'Gi\u00e1 tr\u1ecb hi\u1ec7n t\u1ea1i': a.current_value || 0,
    'Kh\u1ea5u hao': Math.max(0, (a.purchase_price || 0) - (a.current_value || 0)),
    km: a.current_odometer_km || 0,
  }));

  const radarData = assets.length > 0 ? [
    { subject: 'Km \u0111i \u0111\u01b0\u1ee3c', ...Object.fromEntries(filteredAssets.map(a => [a.name.split(' ')[0], Math.min(100, (a.current_odometer_km / 200000) * 100)])) },
    { subject: 'Chi ph\u00ed', ...Object.fromEntries(filteredAssets.map(a => {
      const cost = expenses.filter(e => isSameAsset(e.asset_id, a.id)).reduce((s, e) => s + e.amount, 0);
      return [a.name.split(' ')[0], Math.min(100, (cost / 50_000_000) * 100)];
    })) },
    { subject: 'Gi\u00e1 tr\u1ecb c\u00f2n l\u1ea1i', ...Object.fromEntries(filteredAssets.map(a => [a.name.split(' ')[0], a.purchase_price > 0 ? ((a.current_value / a.purchase_price) * 100) : 0])) },
    { subject: 'Tu\u1ed5i xe', ...Object.fromEntries(filteredAssets.map(a => [a.name.split(' ')[0], Math.min(100, ((new Date().getFullYear() - (a.year || 2020)) / 15) * 100)])) },
    { subject: 'S\u1ed1 chuy\u1ebfn \u0111i', ...Object.fromEntries(filteredAssets.map(a => {
      const tc = trips.filter(t => isSameAsset(t.asset_id, a.id)).length;
      return [a.name.split(' ')[0], Math.min(100, (tc / 50) * 100)];
    })) },
  ] : [];

  const selectedVehicleObj = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-8 animate-fadeIn pb-16">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>B\u00e1o C\u00e1o &amp; Ph\u00e2n T\u00edch</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedAssetId
              ? <span>Ph\u01b0\u01a1ng ti\u1ec7n: <strong className="text-cyan-400">{selectedVehicleObj?.name}</strong> &middot; TCO &amp; Hi\u1ec7u su\u1ea5t v\u1eadn h\u00e0nh</span>
              : <span>TCO \u2014 Total Cost of Ownership &middot; \u0110\u1ed9i {assets.length} ph\u01b0\u01a1ng ti\u1ec7n &middot; D\u1eef li\u1ec7u th\u1ef1c t\u1ebf</span>
            }
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(14,165,233,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(14,165,233,0.25)' }}>
          <BarChart3 className="w-3.5 h-3.5" />
          <span>N\u0103m ph\u00e2n t\u00edch: {chartYear}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>L\u1ecdc b\u00e1o c\u00e1o theo ph\u01b0\u01a1ng ti\u1ec7n</p>
          {selectedAssetId && <button onClick={() => setSelectedAssetId(null)} className="text-[11px] font-bold underline" style={{ color: 'var(--accent-cyan)' }}>Xem t\u1ea5t c\u1ea3</button>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div onClick={() => setSelectedAssetId(null)} className={`p-3 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${selectedAssetId === null ? 'ring-2 ring-cyan-500 shadow-md scale-[1.02]' : 'hover:border-cyan-500/50'}`}
            style={{ background: selectedAssetId === null ? 'rgba(14,165,233,0.12)' : 'var(--bg-secondary)', borderColor: selectedAssetId === null ? 'var(--accent-cyan)' : 'var(--border-default)' }}>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ background: 'var(--accent-cyan)', color: '#fff' }}>ALL</div>
              <div><p className="font-extrabold text-xs" style={{ color: 'var(--text-primary)' }}>T\u1ea5t c\u1ea3 xe</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{assets.length} xe</p></div>
            </div>
            <p className="text-right text-[11px] font-extrabold mt-2" style={{ color: 'var(--status-red)' }}>{fmtM(expenses.reduce((s, e) => s + e.amount, 0))} \u20ab</p>
          </div>
          {assets.map((a, ai) => {
            const isSelected = selectedAssetId === a.id;
            const cost = expenses.filter(e => isSameAsset(e.asset_id, a.id)).reduce((s, e) => s + e.amount, 0);
            return (
              <div key={a.id} onClick={() => setSelectedAssetId(isSelected ? null : a.id)}
                className={`p-3 rounded-2xl cursor-pointer border transition-all flex flex-col justify-between ${isSelected ? 'ring-2 ring-cyan-500 shadow-md scale-[1.02]' : 'hover:border-cyan-500/50 opacity-90 hover:opacity-100'}`}
                style={{ background: isSelected ? 'rgba(14,165,233,0.12)' : 'var(--bg-secondary)', borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-default)' }}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: 'var(--border-default)', background: CHART_COLORS[ai % CHART_COLORS.length] + '22' }}>
                    {a.image_url ? <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs" style={{ color: CHART_COLORS[ai % CHART_COLORS.length] }}>{a.name.slice(0, 2).toUpperCase()}</div>}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.model}</p>
                  </div>
                </div>
                <p className="text-right text-[11px] font-extrabold mt-2" style={{ color: 'var(--status-red)' }}>{fmtM(cost)} \u20ab</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'T\u1ed5ng chi ph\u00ed v\u1eadn h\u00e0nh', value: `${fmtM(totalExpenses)} \u20ab`, sub: `${filteredExpenses.length} giao d\u1ecbch`, color: '#F87171', Icon: DollarSign },
          { label: 'T\u1ed5ng km \u0111\u1ed9i xe', value: `${fmt(totalKm)} km`, sub: `${filteredAssets.length} ph\u01b0\u01a1ng ti\u1ec7n`, color: '#38BDF8', Icon: Gauge },
          { label: 'T\u1ed5ng kh\u1ea5u hao', value: `${fmtM(totalDepreciation)} \u20ab`, sub: totalPurchase > 0 ? `${((totalDepreciation / totalPurchase) * 100).toFixed(1)}% gi\u00e1 tr\u1ecb ban \u0111\u1ea7u` : '\u2014', color: '#F59E0B', Icon: TrendingDown },
          { label: 'Gi\u00e1 tr\u1ecb \u0111\u1ed9i xe hi\u1ec7n t\u1ea1i', value: `${fmtM(totalFleetValue)} \u20ab`, sub: '\u01af\u1edbc t\u00ednh th\u1ecb tr\u01b0\u1eddng', color: '#34D399', Icon: TrendingUp },
        ].map((k, i) => (
          <div key={i} className="p-5 rounded-2xl relative overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: k.color }} />
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: k.color + '20', border: `1px solid ${k.color}40` }}>
                <k.Icon className="w-4 h-4" style={{ color: k.color }} />
              </div>
            </div>
            <p className="text-xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <SectionHeader icon={Activity} title={`Xu h\u01b0\u1edbng chi ph\u00ed & qu\u00e3ng \u0111\u01b0\u1eddng theo th\u00e1ng \u2014 N\u0103m ${chartYear}`} sub="Bi\u1ec3u \u0111\u1ed3 k\u1ebft h\u1ee3p: C\u1ed9t (Km) + V\u00f9ng x\u1ebfp ch\u1ed3ng (Chi ph\u00ed)" color="#38BDF8" />
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tickFormatter={v => v > 0 ? fmtM(v) : '0'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => v > 0 ? `${fmt(Math.round(v))}km` : '0'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
              <ReTooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Area yAxisId="left" type="monotone" dataKey="fuel" stackId="cost" name="Nhi\u00ean li\u1ec7u" fill="#F59E0B40" stroke="#F59E0B" strokeWidth={1.5} />
              <Area yAxisId="left" type="monotone" dataKey="maint" stackId="cost" name="B\u1ea3o d\u01b0\u1ee1ng" fill="#38BDF840" stroke="#38BDF8" strokeWidth={1.5} />
              <Area yAxisId="left" type="monotone" dataKey="ins" stackId="cost" name="B\u1ea3o hi\u1ec3m" fill="#A78BFA40" stroke="#A78BFA" strokeWidth={1.5} />
              <Area yAxisId="left" type="monotone" dataKey="other" stackId="cost" name="Chi ph\u00ed kh\u00e1c" fill="#64748B40" stroke="#64748B" strokeWidth={1.5} />
              <Bar yAxisId="right" dataKey="km" name="Km di chuy\u1ec3n" fill="#34D39930" stroke="#34D399" strokeWidth={1.5} radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <SectionHeader icon={DollarSign} title="Ph\u00e2n b\u1ed5 chi ph\u00ed theo danh m\u1ee5c" sub="T\u1ef7 tr\u1ecdng chi ti\u00eau to\u00e0n b\u1ed9 danh m\u1ee5c" color="#F59E0B" />
          {pieData.length > 0 ? (
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                    {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <ReTooltip formatter={(v: number, name) => [`${fmtM(v)} \u20ab`, name]} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                  <Legend formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u chi ph\u00ed</div>
          )}
          <div className="mt-3 space-y-1.5">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--text-muted)' }}>{totalExpenses > 0 ? ((d.value / totalExpenses) * 100).toFixed(1) : 0}%</span>
                  <span className="font-bold font-mono" style={{ color: d.color }}>{fmtM(d.value)} \u20ab</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <SectionHeader icon={TrendingDown} title="Gi\u00e1 tr\u1ecb c\u00f2n l\u1ea1i & Kh\u1ea5u hao theo xe" sub="So s\u00e1nh t\u1eebng ph\u01b0\u01a1ng ti\u1ec7n trong \u0111\u1ed9i" color="#F59E0B" />
          {assetBarData.length > 0 ? (
            <div style={{ height: 290 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetBarData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmtM(v)} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} width={75} />
                  <ReTooltip formatter={(v: number, name) => [`${fmtM(v)} \u20ab`, name]} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Gi\u00e1 tr\u1ecb hi\u1ec7n t\u1ea1i" fill="#34D399" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Kh\u1ea5u hao" fill="#F59E0B80" stroke="#F59E0B" strokeWidth={1} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <SectionHeader icon={Fuel} title="Chi ph\u00ed nhi\u00ean li\u1ec7u theo th\u00e1ng" sub={`Bi\u1ec3u \u0111\u1ed3 c\u1ed9t \u2014 N\u0103m ${chartYear}`} color="#F59E0B" />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v > 0 ? fmtM(v) : '0'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <ReTooltip formatter={(v: number) => [`${fmtM(v)} \u20ab`, 'Chi ph\u00ed nhi\u00ean li\u1ec7u']} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                <Bar dataKey="fuel" name="Nhi\u00ean li\u1ec7u" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((_, index) => <Cell key={index} fill={index === new Date().getMonth() ? '#F59E0B' : '#F59E0B55'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <SectionHeader icon={Gauge} title="Qu\u00e3ng \u0111\u01b0\u1eddng di chuy\u1ec3n theo th\u00e1ng" sub={`T\u1eeb d\u1eef li\u1ec7u nh\u1eadt k\u00fd chuy\u1ebfn \u0111i \u2014 N\u0103m ${chartYear}`} color="#34D399" />
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="kmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34D399" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#34D399" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v > 0 ? `${fmt(Math.round(v))}` : '0'} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                <ReTooltip formatter={(v: number) => [`${fmt(Math.round(v))} km`, 'Qu\u00e3ng \u0111\u01b0\u1eddng']} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                <Area type="monotone" dataKey="km" name="Km di chuy\u1ec3n" stroke="#34D399" strokeWidth={2} fill="url(#kmGrad)" dot={{ fill: '#34D399', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {!selectedAssetId && assets.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <SectionHeader icon={Activity} title="So s\u00e1nh \u0111a chi\u1ec1u gi\u1eefa c\u00e1c xe" sub="Radar chart \u2014 5 ch\u1ec9 s\u1ed1 \u0111\u01b0\u1ee3c chu\u1ea9n h\u00f3a 0\u2013100" color="#A78BFA" />
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  {assets.slice(0, 5).map((a, i) => (
                    <Radar key={a.id} name={a.name} dataKey={a.name.split(' ')[0]} stroke={CHART_COLORS[i]} fill={CHART_COLORS[i]} fillOpacity={0.15} strokeWidth={1.5} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReTooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <SectionHeader icon={Wrench} title="Chi ph\u00ed b\u1ea3o d\u01b0\u1ee1ng & nhi\u00ean li\u1ec7u theo xe" sub="T\u1ed5ng chi ph\u00ed ph\u00e2n theo t\u1eebng ph\u01b0\u01a1ng ti\u1ec7n" color="#38BDF8" />
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assets.map((a, ai) => ({
                  name: a.name.split(' ')[0],
                  'B\u1ea3o d\u01b0\u1ee1ng': maintRecords.filter(m => isSameAsset(m.asset_id, a.id)).reduce((s, m) => s + m.cost, 0),
                  'Nhi\u00ean li\u1ec7u': fuelLogs.filter(f => isSameAsset(f.asset_id, a.id)).reduce((s, f) => s + f.total_cost, 0),
                }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fmtM(v)} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <ReTooltip formatter={(v: number, name) => [`${fmtM(v)} \u20ab`, name]} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="B\u1ea3o d\u01b0\u1ee1ng" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Nhi\u00ean li\u1ec7u" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <SectionHeader icon={Car} title="Th\u1ed1ng k\u00ea chuy\u1ebfn \u0111i" sub="Ph\u00e2n t\u00edch h\u00e0nh tr\u00ecnh d\u1ef1a tr\u00ean d\u1eef li\u1ec7u ghi nh\u1eadn th\u1ef1c t\u1ebf" color="#34D399" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'T\u1ed5ng chuy\u1ebfn \u0111i', value: filteredTrips.length, unit: 'chuy\u1ebfn', color: '#38BDF8' },
            { label: 'T\u1ed5ng qu\u00e3ng \u0111\u01b0\u1eddng', value: fmt(Math.round(totalTripKm)), unit: 'km', color: '#34D399' },
            { label: 'T\u1ed1c \u0111\u1ed9 TB', value: avgSpeed > 0 ? avgSpeed.toFixed(1) : '\u2014', unit: 'km/h', color: '#A78BFA' },
            { label: 'Chi ph\u00ed / km', value: totalTripKm > 0 ? fmt(Math.round(totalExpenses / totalTripKm)) : '\u2014', unit: '\u20ab/km', color: '#F59E0B' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-2xl text-center" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-[9px]" style={{ color: 'var(--text-faint)' }}>{s.unit}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
