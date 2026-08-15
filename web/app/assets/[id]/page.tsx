'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  INITIAL_ASSETS, MOCK_FUEL_LOGS, MOCK_MAINTENANCE_RECORDS,
  MOCK_EXPENSES, MOCK_TRIPS, MOCK_LOAN, MOCK_PARTS,
  FuelLog, PartRecord,
} from '@/lib/data/mockData';
import { ExpenseRecord, MaintenanceRecord, TripRecord, LoanRecord } from '@/types/mobility';
import {
  ArrowLeft, Gauge, Fuel, Wrench, DollarSign, FileText, BarChart3,
  Cpu, CheckCircle2, Plus, MapPin, Activity, Layers, Car, X,
  Zap, Clock, TrendingDown, Shield, CreditCard,
} from 'lucide-react';

/* ── Helpers ─────────────────────────────────────────────────── */
const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');
const durFmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

/* ── Shared Modal Wrapper ─────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid var(--border-default)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)' }}>
          <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  );
}

/* ── Form Field ───────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  );
}

/* ── Category badge for expenses ─────────────────────────────── */
const CAT_COLORS: Record<string, string> = {
  FUEL: '#F59E0B', MAINTENANCE: '#38BDF8', INSURANCE: '#A78BFA',
  REGISTRATION: '#34D399', PARKING: '#94A3B8', TOLL: '#CBD5E1',
  PARTS: '#FB923C', LABOR: '#60A5FA', INSPECTION: '#4ADE80', OTHER: '#6B7280',
};
const CAT_LABELS: Record<string, string> = {
  FUEL: 'Nhiên liệu', MAINTENANCE: 'Bảo dưỡng', INSURANCE: 'Bảo hiểm',
  REGISTRATION: 'Đăng ký/KT', PARKING: 'Đỗ xe', TOLL: 'Cầu đường',
  PARTS: 'Phụ tùng', LABOR: 'Nhân công', INSPECTION: 'Đăng kiểm', OTHER: 'Khác',
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const asset = INITIAL_ASSETS.find((a) => a.id === params?.id) || INITIAL_ASSETS[0];

  /* ── Local state for each data list ── */
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(MOCK_FUEL_LOGS);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(MOCK_MAINTENANCE_RECORDS);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(MOCK_EXPENSES);
  const [trips, setTrips] = useState<TripRecord[]>(MOCK_TRIPS);
  const [parts, setParts] = useState<PartRecord[]>(MOCK_PARTS);
  const [loan] = useState<LoanRecord>(MOCK_LOAN);

  /* ── Modal open states ── */
  const [openModal, setOpenModal] = useState<string | null>(null);

  /* ── Form states ── */
  const [fuelForm, setFuelForm] = useState({ date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '' });
  const [maintForm, setMaintForm] = useState({ date: '', maintenance_type: 'Thay dầu máy', odometer_km: '', cost: '', vendor: '', notes: '', next_due_km: '', next_due_date: '' });
  const [expForm, setExpForm] = useState({ date: '', category: 'FUEL', amount: '', vendor: '', odometer_km: '', description: '' });
  const [tripForm, setTripForm] = useState({ start_time: '', end_time: '', distance_km: '', start_location: '', end_location: '', fuel_used_liters: '', average_speed_kmh: '' });
  const [partForm, setPartForm] = useState({ name: '', brand: '', category: 'Điện tử', install_date: '', cost: '', odometer_km: '', warranty_months: '', notes: '' });

  /* ── Tabs ── */
  const tabs = [
    { id: 'overview', label: 'Tổng quan', show: true, icon: Activity },
    { id: 'operation', label: 'Vận hành & OBD', show: asset.capabilities.has_obd || asset.capabilities.has_mileage, icon: Cpu },
    { id: 'trips', label: asset.asset_type === 'BICYCLE' ? 'Chuyến đạp' : 'Chuyến đi', show: asset.capabilities.has_ride || asset.capabilities.has_gps, icon: MapPin },
    { id: 'fuel', label: asset.capabilities.has_battery ? 'Pin' : 'Nhiên liệu', show: asset.capabilities.has_fuel || asset.capabilities.has_battery, icon: Fuel },
    { id: 'maintenance', label: 'Bảo dưỡng', show: asset.capabilities.has_maintenance, icon: Wrench },
    { id: 'parts', label: 'Phụ tùng & Nâng cấp', show: asset.capabilities.has_parts, icon: Layers },
    { id: 'expenses', label: 'Chi phí', show: true, icon: DollarSign },
    { id: 'finance', label: 'Khoản vay', show: asset.capabilities.has_finance, icon: CreditCard },
    { id: 'insurance', label: 'Bảo hiểm & Giấy tờ', show: asset.capabilities.has_documents, icon: Shield },
    { id: 'analytics', label: 'Phân tích TCO', show: true, icon: BarChart3 },
  ].filter((t) => t.show);

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  /* ══════════════════════════════════════════════
     SAVE HANDLERS
     ══════════════════════════════════════════════ */
  const saveFuel = () => {
    const l = parseFloat(fuelForm.liters) || 0;
    const p = parseFloat(fuelForm.price_per_liter) || 0;
    setFuelLogs([{ id: `f${Date.now()}`, date: fuelForm.date, liters: l, price_per_liter: p, total_cost: l * p, odometer_km: parseFloat(fuelForm.odometer_km) || 0, station: fuelForm.station, notes: fuelForm.notes }, ...fuelLogs]);
    setOpenModal(null);
    setFuelForm({ date: '', liters: '', price_per_liter: '', odometer_km: '', station: '', notes: '' });
  };

  const saveMaint = () => {
    setMaintenance([{ id: `m${Date.now()}`, asset_id: asset.id, maintenance_type: maintForm.maintenance_type, date: maintForm.date, odometer_km: parseFloat(maintForm.odometer_km) || 0, cost: parseFloat(maintForm.cost) || 0, vendor: maintForm.vendor, notes: maintForm.notes, next_due_km: parseFloat(maintForm.next_due_km) || undefined, next_due_date: maintForm.next_due_date || undefined, status: 'OK' }, ...maintenance]);
    setOpenModal(null);
  };

  const saveExpense = () => {
    setExpenses([{ id: `e${Date.now()}`, asset_id: asset.id, date: expForm.date, category: expForm.category as ExpenseRecord['category'], amount: parseFloat(expForm.amount) || 0, vendor: expForm.vendor, odometer_km: parseFloat(expForm.odometer_km) || undefined, description: expForm.description, currency: 'VND' }, ...expenses]);
    setOpenModal(null);
    setExpForm({ date: '', category: 'FUEL', amount: '', vendor: '', odometer_km: '', description: '' });
  };

  const saveTrip = () => {
    setTrips([{ id: `t${Date.now()}`, asset_id: asset.id, start_time: tripForm.start_time, end_time: tripForm.end_time, distance_km: parseFloat(tripForm.distance_km) || 0, duration_seconds: 0, fuel_used_liters: parseFloat(tripForm.fuel_used_liters) || undefined, average_speed_kmh: parseFloat(tripForm.average_speed_kmh) || 0, max_speed_kmh: 0, start_location: tripForm.start_location, end_location: tripForm.end_location }, ...trips]);
    setOpenModal(null);
  };

  const savePart = () => {
    setParts([{ id: `p${Date.now()}`, name: partForm.name, brand: partForm.brand, category: partForm.category, install_date: partForm.install_date, cost: parseFloat(partForm.cost) || 0, odometer_km: parseFloat(partForm.odometer_km) || 0, warranty_months: parseFloat(partForm.warranty_months) || undefined, notes: partForm.notes }, ...parts]);
    setOpenModal(null);
  };

  /* ══════════════════════════════════════════════
     ANALYTICS CALCULATIONS
     ══════════════════════════════════════════════ */
  const totalFuelCost = fuelLogs.reduce((s, f) => s + f.total_cost, 0);
  const totalMaintCost = maintenance.reduce((s, m) => s + m.cost, 0);
  const totalInsurance = expenses.filter(e => e.category === 'INSURANCE').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalKm = asset.current_odometer_km;
  const totalTCO = asset.purchase_price + totalExpenses;
  const costPerKm = totalKm > 0 ? totalTCO / totalKm : 0;
  const depreciation = asset.purchase_price - asset.current_value;
  const paidPrincipal = loan.principal - loan.current_balance;
  const loanProgress = (paidPrincipal / loan.principal) * 100;

  /* ══════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-5 animate-fadeIn pb-12">

      {/* Back */}
      <button onClick={() => router.push('/')} className="flex items-center space-x-2 text-xs font-semibold transition hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Dashboard gia đình</span>
      </button>

      {/* ── Header ── */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden border shrink-0" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
            {asset.image_url
              ? <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
              : <Car className="w-8 h-8 m-auto" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }}>{asset.asset_type}</span>
              {asset.license_plate && <span className="px-2 py-0.5 rounded font-mono text-xs" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>{asset.license_plate}</span>}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>● ACTIVE</span>
            </div>
            <h1 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{asset.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{asset.brand} {asset.model} ({asset.year}) • {asset.color}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div>
            <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>Virtual Odometer</p>
            <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--accent-cyan)' }}>{fmt(asset.current_odometer_km)} km</p>
            <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>Source: {asset.odometer_source}</span>
          </div>
          {(asset.fuel_level_percent !== undefined) && (
            <div className="border-l pl-4" style={{ borderColor: 'var(--border-default)' }}>
              <p className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>{asset.capabilities.has_battery ? 'Pin' : 'Nhiên liệu'}</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--status-amber)' }}>{asset.fuel_level_percent}%</p>
              <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>~{asset.estimated_range_km} km</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={isActive
                ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="glass-panel p-6 rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>

        {/* ═══ OVERVIEW ═══ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Thông số tổng quan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {[
                { label: 'Giá mua ban đầu', value: `${fmt(asset.purchase_price)} ₫`, sub: `Ngày mua: ${fmtDate(asset.purchase_date || '')}`, color: 'var(--text-primary)' },
                { label: 'Giá trị ước tính hiện tại', value: `${fmt(asset.current_value)} ₫`, sub: `Khấu hao: ${(((asset.purchase_price - asset.current_value) / asset.purchase_price) * 100).toFixed(1)}%`, color: 'var(--status-green)' },
                { label: 'Bảo dưỡng tiếp theo', value: asset.next_maintenance_due || 'OK', sub: 'Trạng thái: Bình thường', color: 'var(--status-amber)' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <p className="text-base font-bold mt-1" style={{ color: item.color }}>{item.value}</p>
                  <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>{item.sub}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              {[
                { label: 'Động cơ', value: asset.engine || '—' },
                { label: 'Nhiên liệu', value: asset.fuel_type || '—' },
                { label: 'Dung tích bình', value: asset.tank_capacity_liters ? `${asset.tank_capacity_liters}L` : (asset.battery_capacity_kwh ? `${asset.battery_capacity_kwh} kWh` : '—') },
                { label: 'TB L/100km', value: asset.avg_consumption_l100km ? `${asset.avg_consumption_l100km} L/100km` : '—' },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                </div>
              ))}
            </div>

            {asset.description && (
              <div className="p-4 rounded-xl text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{asset.description}</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ OPERATION ═══ */}
        {activeTab === 'operation' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Live OBD — ZESTECH 9"</h3>
              <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>KW906 Connected</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { label: 'Tốc độ', value: '62', unit: 'km/h', color: 'var(--accent-cyan)' },
                { label: 'Vòng tua RPM', value: '2,150', unit: 'rpm', color: 'var(--status-purple)' },
                { label: 'Nhiệt độ nước', value: '91', unit: '°C', color: 'var(--status-green)' },
                { label: 'Điện áp bình', value: '14.1', unit: 'V', color: 'var(--status-amber)' },
              ].map((g, i) => (
                <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <span className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>{g.label}</span>
                  <p className="text-2xl font-black mt-2" style={{ color: g.color }}>{g.value}</p>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{g.unit}</span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <h4 className="text-xs font-bold uppercase" style={{ color: 'var(--accent-cyan)' }}>Virtual Odometer Strategy Ledger</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { label: 'Verified Dashboard ODO', value: 'N/A (Hạn chế PID)', color: 'var(--text-muted)' },
                  { label: 'GPS Trip Accumulated', value: '12,846.2 km', color: 'var(--accent-cyan)' },
                  { label: 'App Virtual ODO', value: '12,846 km ✓ High Confidence', color: 'var(--status-green)' },
                ].map((r, i) => (
                  <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}:</span>
                    <p className="font-bold mt-0.5" style={{ color: r.color }}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TRIPS ═══ */}
        {activeTab === 'trips' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Nhật ký chuyến đi</h3>
              <button onClick={() => setOpenModal('trip')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Ghi nhận chuyến đi</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-center mb-2">
              {[
                { label: 'Tổng chuyến', value: trips.length },
                { label: 'Tổng km tháng này', value: `${fmt(trips.reduce((s,t)=>s+t.distance_km,0).toFixed(0) as any)} km` },
                { label: 'TB tiêu thụ', value: `${asset.avg_consumption_l100km || '—'} L/100` },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="font-extrabold text-base" style={{ color: 'var(--accent-cyan)' }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {trips.map((trip) => (
                <div key={trip.id} className="p-3.5 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {trip.start_location} → {trip.end_location}
                    </p>
                    <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {fmtDate(trip.start_time)} • {durFmt(trip.duration_seconds)} • TB {trip.average_speed_kmh} km/h
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: 'var(--accent-cyan)' }}>{trip.distance_km} km</p>
                    {trip.fuel_used_liters && <p style={{ color: 'var(--status-amber)' }}>{trip.fuel_used_liters}L xăng</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FUEL ═══ */}
        {activeTab === 'fuel' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                {asset.capabilities.has_battery ? 'Lịch sử sạc pin' : 'Nhật ký đổ nhiên liệu'}
              </h3>
              <button onClick={() => setOpenModal('fuel')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Ghi nhận đổ xăng</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs text-center">
              {[
                { label: 'Tổng chi phí xăng', value: `${fmt(totalFuelCost)} ₫`, color: 'var(--status-amber)' },
                { label: 'TB L/100km', value: `${asset.avg_consumption_l100km || '—'} L`, color: 'var(--accent-cyan)' },
                { label: 'Số lần đổ', value: fuelLogs.length, color: 'var(--text-primary)' },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="font-extrabold text-sm" style={{ color: s.color }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                    {['Ngày', 'Số lít', 'Giá/L', 'Tổng tiền', 'Odometer', 'Cây xăng', 'L/100km'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fuelLogs.map((f, i) => (
                    <tr key={f.id} className="transition" style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                      <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{fmtDate(f.date)}</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--accent-cyan)' }}>{f.liters}L</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmt(f.price_per_liter)}₫</td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: 'var(--status-amber)' }}>{fmt(f.total_cost)}₫</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{fmt(f.odometer_km)} km</td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{f.station}</td>
                      <td className="px-3 py-2.5" style={{ color: f.consumption_l100km && f.consumption_l100km > 7.5 ? 'var(--status-red)' : 'var(--status-green)' }}>
                        {f.consumption_l100km ? `${f.consumption_l100km}L` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ MAINTENANCE ═══ */}
        {activeTab === 'maintenance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Lịch sử bảo dưỡng</h3>
              <button onClick={() => setOpenModal('maintenance')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm bảo dưỡng</span>
              </button>
            </div>

            <div className="space-y-2">
              {maintenance.map((m) => (
                <div key={m.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={m.status === 'OK' ? { background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' } :
                            m.status === 'DUE_SOON' ? { background: 'rgba(251,191,36,0.15)', color: 'var(--status-amber)' } :
                              { background: 'rgba(248,113,113,0.15)', color: 'var(--status-red)' }}>
                          {m.status === 'OK' ? '✓ OK' : m.status === 'DUE_SOON' ? '⚠ Sắp đến' : '❌ Quá hạn'}
                        </span>
                      </div>
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{m.maintenance_type}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {fmtDate(m.date)} • {fmt(m.odometer_km)} km • {m.vendor}
                      </p>
                      {m.notes && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-faint)' }}>{m.notes}</p>}
                      {m.next_due_km && <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-cyan)' }}>Kỳ tiếp: {fmt(m.next_due_km)} km {m.next_due_date ? `(${fmtDate(m.next_due_date)})` : ''}</p>}
                    </div>
                    <span className="font-bold text-sm shrink-0" style={{ color: 'var(--status-red)' }}>{fmt(m.cost)} ₫</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ PARTS ═══ */}
        {activeTab === 'parts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phụ tùng & Nâng cấp</h3>
              <button onClick={() => setOpenModal('part')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm phụ tùng</span>
              </button>
            </div>
            <div className="space-y-2">
              {parts.map((p) => (
                <div key={p.id} className="p-4 rounded-xl flex justify-between items-start" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div>
                    <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {p.brand} • {p.category} • Lắp: {fmtDate(p.install_date)} • {fmt(p.odometer_km)} km
                    </p>
                    {p.warranty_months && <p className="text-[10px] mt-0.5" style={{ color: 'var(--status-green)' }}>Bảo hành: {p.warranty_months} tháng</p>}
                    {p.notes && <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-faint)' }}>{p.notes}</p>}
                  </div>
                  <span className="font-bold text-sm shrink-0" style={{ color: 'var(--status-amber)' }}>{fmt(p.cost)} ₫</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ EXPENSES ═══ */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Chi phí phát sinh</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Tổng: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalExpenses)} ₫</strong></p>
              </div>
              <button onClick={() => setOpenModal('expense')} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold transition hover:opacity-90">
                <Plus className="w-3.5 h-3.5" /><span>Thêm chi phí</span>
              </button>
            </div>

            <div className="space-y-2">
              {expenses.map((e) => (
                <div key={e.id} className="p-3.5 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center space-x-3">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLORS[e.category] || '#6B7280' }} />
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{e.description}</p>
                      <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {fmtDate(e.date)} {e.vendor ? `• ${e.vendor}` : ''} •
                        <span className="ml-1 px-1.5 py-0.5 rounded" style={{ background: `${CAT_COLORS[e.category]}22`, color: CAT_COLORS[e.category] || '#6B7280', fontSize: 10 }}>
                          {CAT_LABELS[e.category] || e.category}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="font-bold shrink-0" style={{ color: 'var(--status-red)' }}>{fmt(e.amount)} ₫</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ FINANCE ═══ */}
        {activeTab === 'finance' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Theo dõi khoản vay mua xe</h3>

            <div className="p-4 rounded-xl space-y-3 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              {[
                { label: 'Ngân hàng', value: loan.lender },
                { label: 'Số tiền gốc', value: `${fmt(loan.principal)} ₫` },
                { label: 'Trả trước', value: `${fmt(loan.down_payment)} ₫` },
                { label: 'Lãi suất', value: `${loan.interest_rate_percent}%/năm` },
                { label: 'Kỳ hạn', value: `${loan.term_months} tháng` },
                { label: 'Ngày thanh toán', value: `Ngày ${loan.payment_day} hàng tháng` },
                { label: 'Trả hàng tháng', value: `${fmt(loan.monthly_payment)} ₫`, bold: true, color: 'var(--accent-cyan)' },
                { label: 'Dư nợ hiện tại', value: `${fmt(loan.current_balance)} ₫`, bold: true, color: 'var(--status-red)' },
              ].map((r, i) => (
                <div key={i} className="flex justify-between items-center" style={{ borderBottom: i < 7 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                  <span className={r.bold ? 'font-bold text-sm' : 'font-medium'} style={{ color: r.color || 'var(--text-primary)' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <span>Đã trả: {fmt(paidPrincipal)} ₫ ({loanProgress.toFixed(1)}%)</span>
                <span>Còn lại: {fmt(loan.current_balance)} ₫</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${loanProgress}%`, background: 'linear-gradient(90deg, var(--accent-cyan), #3B82F6)' }} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ INSURANCE ═══ */}
        {activeTab === 'insurance' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Bảo hiểm & Giấy tờ xe</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                { title: 'Bảo hiểm vật chất', badge: 'CÒN HẠN', badgeColor: 'var(--status-green)', items: [['Công ty', 'Bảo Việt Insurance'], ['Số hợp đồng', 'BV-2026-12345'], ['Hạn hiệu lực', '10/01/2027'], ['Phí hằng năm', '6,500,000 ₫'], ['Mức bồi thường', '490,000,000 ₫']] },
                { title: 'Bảo hiểm TNDS bắt buộc', badge: 'CÒN HẠN', badgeColor: 'var(--status-green)', items: [['Công ty', 'PTI'], ['Hạn hiệu lực', '10/01/2027'], ['Phí', '486,000 ₫/năm']] },
              ].map((ins, idx) => (
                <div key={idx} className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{ins.title}</p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${ins.badgeColor}22`, color: ins.badgeColor }}>{ins.badge}</span>
                  </div>
                  {ins.items.map(([k, v], i) => (
                    <div key={i} className="flex justify-between">
                      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl space-y-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <p className="font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Đăng kiểm & Đăng ký</p>
              {[['Biển số xe', '30A-888.88'], ['Đăng kiểm lần tiếp', '10/01/2028 (Xe mới - 2 năm)'], ['Đăng ký xe', 'Cục Đăng kiểm Hà Nội']].map(([k, v], i) => (
                <div key={i} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Phân tích TCO — Total Cost of Ownership</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
              {[
                { label: 'Tổng chi phí vận hành', value: `${(totalExpenses / 1000000).toFixed(1)}M ₫`, color: 'var(--status-red)' },
                { label: 'Chi phí / km', value: `${costPerKm.toFixed(0)} ₫/km`, color: 'var(--accent-cyan)' },
                { label: 'Khấu hao', value: `${(depreciation / 1000000).toFixed(1)}M ₫`, color: 'var(--status-amber)' },
                { label: 'TCO toàn bộ', value: `${(totalTCO / 1000000).toFixed(0)}M ₫`, color: 'var(--status-purple)' },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                  <p className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</p>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                    {['Hạng mục chi phí', 'Tổng chi tiêu', '% Tổng', 'TB/tháng'].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Nhiên liệu (Xăng)', total: totalFuelCost, color: 'var(--status-amber)' },
                    { name: 'Bảo dưỡng định kỳ', total: totalMaintCost, color: 'var(--accent-cyan)' },
                    { name: 'Bảo hiểm', total: totalInsurance, color: 'var(--status-purple)' },
                    { name: 'Chi phí khác', total: totalExpenses - totalFuelCost - totalMaintCost - totalInsurance, color: 'var(--text-muted)' },
                  ].map((row, i) => {
                    const pct = totalExpenses > 0 ? ((row.total / totalExpenses) * 100).toFixed(1) : '0';
                    const months = 7; // approx months since purchase
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                        <td className="px-3 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: row.color }} />
                          {row.name}
                        </td>
                        <td className="px-3 py-2.5 font-bold" style={{ color: row.color }}>{fmt(row.total)} ₫</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-muted)' }}>{pct}%</td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmt(Math.round(row.total / months))} ₫</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════ */}

      {/* Fuel Modal */}
      {openModal === 'fuel' && (
        <Modal title="Ghi nhận đổ nhiên liệu" onClose={() => setOpenModal(null)}>
          <Field label="Ngày đổ xăng"><input type="date" className="theme-input" value={fuelForm.date} onChange={e => setFuelForm(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Số lít (L)"><input type="number" className="theme-input" placeholder="VD: 35.0" value={fuelForm.liters} onChange={e => setFuelForm(p => ({ ...p, liters: e.target.value }))} /></Field>
          <Field label="Đơn giá (₫/L)"><input type="number" className="theme-input" placeholder="VD: 23100" value={fuelForm.price_per_liter} onChange={e => setFuelForm(p => ({ ...p, price_per_liter: e.target.value }))} /></Field>
          {fuelForm.liters && fuelForm.price_per_liter && (
            <div className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
              Tổng: {fmt(parseFloat(fuelForm.liters) * parseFloat(fuelForm.price_per_liter))} ₫
            </div>
          )}
          <Field label="Odometer (km)"><input type="number" className="theme-input" placeholder="VD: 12846" value={fuelForm.odometer_km} onChange={e => setFuelForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Cây xăng"><input type="text" className="theme-input" placeholder="VD: PV OIL Cầu Giấy" value={fuelForm.station} onChange={e => setFuelForm(p => ({ ...p, station: e.target.value }))} /></Field>
          <Field label="Ghi chú (tuỳ chọn)"><input type="text" className="theme-input" value={fuelForm.notes} onChange={e => setFuelForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveFuel} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Maintenance Modal */}
      {openModal === 'maintenance' && (
        <Modal title="Thêm hạng mục bảo dưỡng" onClose={() => setOpenModal(null)}>
          <Field label="Ngày bảo dưỡng"><input type="date" className="theme-input" value={maintForm.date} onChange={e => setMaintForm(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Loại bảo dưỡng">
            <select className="theme-select" value={maintForm.maintenance_type} onChange={e => setMaintForm(p => ({ ...p, maintenance_type: e.target.value }))}>
              {['Thay dầu máy', 'Thay lọc dầu', 'Thay lốp xe', 'Thay phanh', 'Kiểm tra định kỳ', 'Thay ắc-quy', 'Vệ sinh hệ thống làm mát', 'Sửa chữa', 'Khác'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Odometer (km)"><input type="number" className="theme-input" placeholder="VD: 12846" value={maintForm.odometer_km} onChange={e => setMaintForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Chi phí (₫)"><input type="number" className="theme-input" placeholder="VD: 1250000" value={maintForm.cost} onChange={e => setMaintForm(p => ({ ...p, cost: e.target.value }))} /></Field>
          <Field label="Garage / Đại lý"><input type="text" className="theme-input" placeholder="VD: Mazda Hà Đông" value={maintForm.vendor} onChange={e => setMaintForm(p => ({ ...p, vendor: e.target.value }))} /></Field>
          <Field label="Ghi chú"><input type="text" className="theme-input" value={maintForm.notes} onChange={e => setMaintForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <Field label="Kỳ bảo dưỡng tiếp theo (km)"><input type="number" className="theme-input" value={maintForm.next_due_km} onChange={e => setMaintForm(p => ({ ...p, next_due_km: e.target.value }))} /></Field>
          <Field label="Ngày bảo dưỡng tiếp theo"><input type="date" className="theme-input" value={maintForm.next_due_date} onChange={e => setMaintForm(p => ({ ...p, next_due_date: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveMaint} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Expense Modal */}
      {openModal === 'expense' && (
        <Modal title="Thêm chi phí phát sinh" onClose={() => setOpenModal(null)}>
          <Field label="Ngày"><input type="date" className="theme-input" value={expForm.date} onChange={e => setExpForm(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Loại chi phí">
            <select className="theme-select" value={expForm.category} onChange={e => setExpForm(p => ({ ...p, category: e.target.value }))}>
              {Object.entries(CAT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
          <Field label="Số tiền (₫)"><input type="number" className="theme-input" placeholder="VD: 808500" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} /></Field>
          <Field label="Nhà cung cấp / Địa điểm"><input type="text" className="theme-input" value={expForm.vendor} onChange={e => setExpForm(p => ({ ...p, vendor: e.target.value }))} /></Field>
          <Field label="Odometer (tuỳ chọn)"><input type="number" className="theme-input" value={expForm.odometer_km} onChange={e => setExpForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Mô tả"><input type="text" className="theme-input" placeholder="Mô tả ngắn gọn" value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveExpense} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Trip Modal */}
      {openModal === 'trip' && (
        <Modal title="Ghi nhận chuyến đi thủ công" onClose={() => setOpenModal(null)}>
          <Field label="Điểm xuất phát"><input type="text" className="theme-input" value={tripForm.start_location} onChange={e => setTripForm(p => ({ ...p, start_location: e.target.value }))} /></Field>
          <Field label="Điểm đến"><input type="text" className="theme-input" value={tripForm.end_location} onChange={e => setTripForm(p => ({ ...p, end_location: e.target.value }))} /></Field>
          <Field label="Thời gian khởi hành"><input type="datetime-local" className="theme-input" value={tripForm.start_time} onChange={e => setTripForm(p => ({ ...p, start_time: e.target.value }))} /></Field>
          <Field label="Thời gian kết thúc"><input type="datetime-local" className="theme-input" value={tripForm.end_time} onChange={e => setTripForm(p => ({ ...p, end_time: e.target.value }))} /></Field>
          <Field label="Quãng đường (km)"><input type="number" className="theme-input" value={tripForm.distance_km} onChange={e => setTripForm(p => ({ ...p, distance_km: e.target.value }))} /></Field>
          <Field label="Xăng tiêu thụ (L, tuỳ chọn)"><input type="number" className="theme-input" value={tripForm.fuel_used_liters} onChange={e => setTripForm(p => ({ ...p, fuel_used_liters: e.target.value }))} /></Field>
          <Field label="Vận tốc TB (km/h)"><input type="number" className="theme-input" value={tripForm.average_speed_kmh} onChange={e => setTripForm(p => ({ ...p, average_speed_kmh: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={saveTrip} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}

      {/* Part Modal */}
      {openModal === 'part' && (
        <Modal title="Thêm phụ tùng / Nâng cấp" onClose={() => setOpenModal(null)}>
          <Field label="Tên phụ tùng / Nâng cấp"><input type="text" className="theme-input" value={partForm.name} onChange={e => setPartForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Thương hiệu"><input type="text" className="theme-input" value={partForm.brand} onChange={e => setPartForm(p => ({ ...p, brand: e.target.value }))} /></Field>
          <Field label="Loại">
            <select className="theme-select" value={partForm.category} onChange={e => setPartForm(p => ({ ...p, category: e.target.value }))}>
              {['Điện tử', 'Camera', 'Lốp xe', 'Phanh', 'Động cơ', 'Ngoại thất', 'Nội thất', 'Bảo vệ sơn', 'Âm thanh', 'Khác'].map(o => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Ngày lắp đặt"><input type="date" className="theme-input" value={partForm.install_date} onChange={e => setPartForm(p => ({ ...p, install_date: e.target.value }))} /></Field>
          <Field label="Chi phí (₫)"><input type="number" className="theme-input" value={partForm.cost} onChange={e => setPartForm(p => ({ ...p, cost: e.target.value }))} /></Field>
          <Field label="Odometer lúc lắp (km)"><input type="number" className="theme-input" value={partForm.odometer_km} onChange={e => setPartForm(p => ({ ...p, odometer_km: e.target.value }))} /></Field>
          <Field label="Bảo hành (tháng)"><input type="number" className="theme-input" value={partForm.warranty_months} onChange={e => setPartForm(p => ({ ...p, warranty_months: e.target.value }))} /></Field>
          <Field label="Ghi chú"><input type="text" className="theme-input" value={partForm.notes} onChange={e => setPartForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <div className="flex space-x-2 pt-2">
            <button onClick={savePart} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:opacity-90 transition">Lưu</button>
            <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
