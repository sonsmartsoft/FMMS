'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { CardDisplaySettings, AssetType, Asset, TripRecord, ExpenseRecord, DEFAULT_CARD_SETTINGS } from '@/types/mobility';
import { AssetCard } from '@/components/dashboard/AssetCard';


import { getAssets, createAsset } from '@/lib/services/assetService';
import { getTrips } from '@/lib/services/tripService';
import { getFuelLogs } from '@/lib/services/fuelService';
import { getExpenses } from '@/lib/services/expenseService';
import { getLoans } from '@/lib/services/loanService';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Plus, Car, Bike, Zap, Gauge, DollarSign, Fuel, Sparkles, Search, X, Download, Sliders } from 'lucide-react';
import DraggableModal from '@/components/ui/DraggableModal';

interface HomePageProps {
  cardSettings?: CardDisplaySettings;
}

const ASSET_TYPES = ['CAR', 'MOTORCYCLE', 'MOTORBIKE', 'BICYCLE', 'E_BIKE', 'SCOOTER', 'OTHER'];
const FUEL_TYPES = ['PETROL', 'DIESEL', 'ELECTRIC', 'HYBRID', 'HUMAN_POWER'];

export default function HomePage({ cardSettings = DEFAULT_CARD_SETTINGS }: HomePageProps) {
  const { language, isEn, t } = useLanguage();
  const [filterType, setFilterType] = useState<AssetType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openAddModal, setOpenAddModal] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ASSET_TYPE_LABELS: Record<string, string> = {
    CAR: isEn ? 'Car / Sedan' : 'Ô tô',
    MOTORCYCLE: isEn ? 'Motorcycle' : 'Mô tô phân khối lớn',
    MOTORBIKE: isEn ? 'Motorbike' : 'Xe máy',
    BICYCLE: isEn ? 'Bicycle' : 'Xe đạp',
    E_BIKE: isEn ? 'E-Bike / Scooter' : 'Xe điện / E-scooter',
    SCOOTER: isEn ? 'Scooter' : 'Scooter',
    OTHER: isEn ? 'Other' : 'Khác',
  };

  const FUEL_LABELS: Record<string, string> = {
    PETROL: isEn ? 'Petrol' : 'Xăng',
    DIESEL: isEn ? 'Diesel' : 'Dầu Diesel',
    ELECTRIC: isEn ? 'Electric' : 'Điện',
    HYBRID: isEn ? 'Hybrid' : 'Hybrid',
    HUMAN_POWER: isEn ? 'Human Power' : 'Sức người',
  };
  const [addForm, setAddForm] = useState({
    name: '', asset_type: 'CAR', brand: '', model: '', year: new Date().getFullYear().toString(),
    color: '', license_plate: '', fuel_type: 'PETROL', purchase_price: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [openCardConfigModal, setOpenCardConfigModal] = useState(false);
  const [cardConfig, setCardConfig] = useState<CardDisplaySettings>(cardSettings || DEFAULT_CARD_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fmms_card_settings');
      if (saved) setCardConfig(JSON.parse(saved));
    } catch {}

    const handleSettingsUpdated = () => {
      try {
        const saved = localStorage.getItem('fmms_card_settings');
        if (saved) setCardConfig(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener('fmms_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('fmms_settings_updated', handleSettingsUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, t, f, e, l, tele] = await Promise.all([
          getAssets(),
          getTrips(),
          getFuelLogs(),
          getExpenses(),
          getLoans(),
          (async () => {
            try {
              const sb = createClient();
              const { data } = await sb
                .from('telemetry_samples')
                .select('asset_id, fuel_level_percent, timestamp')
                .not('fuel_level_percent', 'is', null)
                .order('timestamp', { ascending: false })
                .limit(50);
              return data || [];
            } catch {
              return [];
            }
          })(),
        ]);
        const enrichedAssets = a.map(asset => {
          const assetLogs = (f || []).filter((l: any) => l.asset_id === asset.id || l.vehicle_id === asset.id);
          const assetTrips = (t || []).filter((tr: any) => tr.asset_id === asset.id);
          const latestTele = (tele || []).find((s: any) => s.asset_id === asset.id && s.fuel_level_percent != null);
          
          let fuelPct = asset.fuel_level_percent;
          let consumption = asset.avg_consumption_l100km;
          let rangeKm = asset.estimated_range_km;
          const ridesCount = assetTrips.length;
          const tank = asset.tank_capacity_liters || 45;

          // 1. Ưu tiên dữ liệu cảm biến phao xăng thực tế từ OBD gửi về gần nhất
          if (latestTele && latestTele.fuel_level_percent != null && Number(latestTele.fuel_level_percent) > 0) {
            fuelPct = Math.round(Number(latestTele.fuel_level_percent));
          } else if (assetLogs.length > 0) {
            // Sắp xếp nhật ký đổ xăng mới nhất
            const sortedLogs = [...assetLogs].sort((x: any, y: any) =>
              new Date(y.timestamp || y.date || 0).getTime() - new Date(x.timestamp || x.date || 0).getTime()
            );
            const latest: any = sortedLogs[0];

            // Xác định mức tiêu thụ thực tế
            if (!consumption) {
              const logsWithConsumption = sortedLogs.filter((l: any) => l.consumption_l100km || l.calculated_consumption_l100km);
              if (logsWithConsumption.length > 0) {
                consumption = Number(logsWithConsumption[0].consumption_l100km || logsWithConsumption[0].calculated_consumption_l100km);
              } else {
                consumption = 6.8;
              }
            }

            if (latest.fuel_level_after_pct != null) {
              fuelPct = Number(latest.fuel_level_after_pct);
            } else if (latest.odometer_km && asset.current_odometer_km) {
              // Tính mức xăng động theo quãng đường đã chạy từ lần đổ gần nhất
              const deltaKm = Math.max(0, Number(asset.current_odometer_km) - Number(latest.odometer_km));
              const fuelConsumedLiters = deltaKm * ((consumption || 6.8) / 100);
              const remainingLiters = Math.max(0, tank - fuelConsumedLiters);
              fuelPct = Math.max(5, Math.min(100, Math.round((remainingLiters / tank) * 100)));
            } else if (fuelPct === undefined && (asset.capabilities.has_fuel || asset.asset_type === 'CAR')) {
              fuelPct = 70;
            }
          }

          if (fuelPct !== undefined && !rangeKm) {
            rangeKm = Math.round((fuelPct / 100) * tank * (100 / (consumption || 6.8)));
          }

          const remainingLiters = fuelPct != null ? Math.round((fuelPct / 100) * tank * 10) / 10 : undefined;

          return {
            ...asset,
            fuel_level_percent: fuelPct,
            remaining_fuel_liters: remainingLiters,
            avg_consumption_l100km: consumption,
            estimated_range_km: rangeKm,
            total_rides: asset.asset_type === 'BICYCLE' ? ridesCount : asset.total_rides,
          };
        });

        if (cancelled) return;
        setAssets(enrichedAssets);
        setTrips(t);
        setFuelLogs(f);
        setExpenses(e);
        setLoans(l);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? 'Không tải được dữ liệu từ Supabase');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddAsset = async () => {
    if (!addForm.name || !addForm.brand || !addForm.model) {
      alert('Vui lòng nhập tên, hãng và mẫu xe');
      return;
    }
    setSaving(true);
    try {
      const asset = await createAsset({
        name: addForm.name,
        asset_type: addForm.asset_type as AssetType,
        brand: addForm.brand,
        model: addForm.model,
        year: parseInt(addForm.year) || new Date().getFullYear(),
        color: addForm.color || undefined,
        license_plate: addForm.license_plate || undefined,
        purchase_price: parseFloat(addForm.purchase_price) || 0,
        fuel_type: addForm.fuel_type || undefined,
        description: addForm.description || undefined,
      });
      setAssets(prev => [asset, ...prev]);
      setOpenAddModal(false);
      setAddForm({ name: '', asset_type: 'CAR', brand: '', model: '', year: new Date().getFullYear().toString(), color: '', license_plate: '', fuel_type: 'PETROL', purchase_price: '', description: '' });
    } catch (err: any) {
      alert(`Lỗi khi thêm phương tiện: ${err?.message ?? 'Vui lòng thử lại'}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesType = filterType === 'ALL' || asset.asset_type === filterType;
    const matchesSearch =
      asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalDistanceThisMonth = Math.round(
    trips
      .filter(t => (t.start_time || '').startsWith(currentMonth))
      .reduce((s, t) => s + Number(t.distance_km || 0), 0),
  );
  const totalDistanceAllTime = Math.round(
    trips.reduce((s, t) => s + Number(t.distance_km || 0), 0),
  );

  const totalFuelCostThisMonth = Math.round(
    fuelLogs
      .filter((f: any) => (f.date || f.timestamp || '').slice(0, 7) === currentMonth)
      .reduce((s: number, f: any) => s + (Number(f.total_cost) || (Number(f.fuel_liters ?? f.liters ?? 0) * Number(f.price_per_liter ?? 0))), 0),
  );
  const totalFuelCostAllTime = Math.round(
    fuelLogs.reduce(
      (s: number, f: any) => s + (Number(f.total_cost) || (Number(f.fuel_liters ?? f.liters ?? 0) * Number(f.price_per_liter ?? 0))),
      0,
    ),
  );
  const totalFuelLitersAllTime = fuelLogs.reduce(
    (s: number, f: any) => s + Number(f.fuel_liters ?? f.liters ?? 0),
    0,
  );

  const totalLoanBalance = loans.reduce((s, l) => s + Number(l.current_balance || 0), 0);
  const totalLoanMonthly = loans.reduce((s, l) => s + Number(l.monthly_payment || 0), 0);

  const KPI = [
    {
      label: isEn ? 'Total Fleet Vehicles' : 'Tổng phương tiện',
      href: '/assets',
      value: isEn ? `${assets.length} vehicles` : `${assets.length} tài sản`,
      sub: loading ? (isEn ? 'Loading...' : 'Đang tải...') : assets.some(a => a.status === 'MAINTENANCE') ? (isEn ? '● Vehicle in maintenance' : '● Có xe đang bảo dưỡng') : (isEn ? '● All operating normally' : '● Tất cả đang hoạt động tốt'),
      subColor: 'var(--status-green)',
      icon: Car,
      iconBg: 'var(--accent-cyan-bg)',
      iconColor: 'var(--accent-cyan)',
      iconBorder: 'var(--accent-cyan-border)',
      valueColor: 'var(--text-primary)',
    },
    {
      label: isEn ? 'Mileage & Distance' : 'Quãng đường di chuyển',
      href: '/analytics',
      value: totalDistanceThisMonth > 0
        ? `${totalDistanceThisMonth.toLocaleString(isEn ? 'en-US' : 'vi-VN')} km`
        : totalDistanceAllTime > 0
          ? `${totalDistanceAllTime.toLocaleString(isEn ? 'en-US' : 'vi-VN')} km`
          : '0 km',
      sub: totalDistanceThisMonth > 0
        ? (isEn ? `This month · Total: ${totalDistanceAllTime.toLocaleString()} km (${trips.length} trips)` : `Tháng ${now.getMonth() + 1} · Tổng: ${totalDistanceAllTime.toLocaleString('vi-VN')} km (${trips.length} chuyến)`)
        : trips.length > 0
          ? (isEn ? `Total cumulative · ${trips.length} trips logged` : `Tổng tích lũy · ${trips.length} chuyến ghi nhận`)
          : (isEn ? 'No trips logged' : 'Chưa có chuyến đi'),
      subColor: 'var(--accent-cyan)',
      icon: Gauge,
      iconBg: 'rgba(59,130,246,0.12)',
      iconColor: '#60A5FA',
      iconBorder: 'rgba(59,130,246,0.3)',
      valueColor: 'var(--text-primary)',
    },
    {
      label: isEn ? 'Total Fuel & Energy' : 'Tổng nhiên liệu & Pin',
      href: '/fuel',
      value: totalFuelCostAllTime > 0
        ? `${totalFuelCostAllTime.toLocaleString(isEn ? 'en-US' : 'vi-VN')} ₫`
        : '0 ₫',
      sub: totalFuelCostThisMonth > 0
        ? (isEn ? `This month: ${totalFuelCostThisMonth.toLocaleString()} ₫ (${fuelLogs.length} logs)` : `Tháng ${now.getMonth() + 1}: ${totalFuelCostThisMonth.toLocaleString('vi-VN')} ₫ · ${fuelLogs.length} lần`)
        : (isEn ? `Total ${fuelLogs.length} logs · ${totalFuelLitersAllTime.toFixed(1)}L` : `Tổng ${fuelLogs.length} lần ghi nhận · ${totalFuelLitersAllTime.toFixed(1)}L`),
      subColor: 'var(--text-muted)',
      icon: Fuel,
      iconBg: 'rgba(245,158,11,0.12)',
      iconColor: 'var(--status-amber)',
      iconBorder: 'rgba(245,158,11,0.3)',
      valueColor: 'var(--status-amber)',
    },
    {
      label: isEn ? 'Loan Balance' : 'Dư nợ khoản vay',
      href: '/finance',
      value: totalLoanBalance > 0 ? `${(totalLoanBalance / 1_000_000).toFixed(0)}M ₫` : '0 ₫',
      sub: loans.length > 0 ? (isEn ? `${loans.length} loans · ${(totalLoanMonthly / 1_000_000).toFixed(1)}M ₫/mo` : `${loans.length} khoản · ${(totalLoanMonthly / 1_000_000).toFixed(1)}M ₫/tháng`) : (isEn ? 'No active loans' : 'Không có khoản vay'),
      subColor: 'var(--text-muted)',
      icon: DollarSign,
      iconBg: 'rgba(244,63,94,0.12)',
      iconColor: 'var(--status-rose)',
      iconBorder: 'rgba(244,63,94,0.3)',
      valueColor: 'var(--status-rose)',
    },
  ];

  const typeCounts = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.asset_type] = (acc[a.asset_type] || 0) + 1;
    return acc;
  }, {});
  const FILTERS = [
    { id: 'ALL', label: isEn ? `All (${assets.length})` : `Tất cả (${assets.length})`, icon: Car },
    ...(['CAR', 'BICYCLE', 'E_BIKE', 'MOTORCYCLE', 'MOTORBIKE', 'SCOOTER'] as AssetType[])
      .filter(t => typeCounts[t])
      .map(t => ({ id: t, label: `${ASSET_TYPE_LABELS[t].split(' ')[0]}${ASSET_TYPE_LABELS[t].includes('/') ? '' : ' ' + ASSET_TYPE_LABELS[t].split(' ').slice(1).join(' ')} (${typeCounts[t]})`, icon: t === 'CAR' ? Car : t === 'BICYCLE' ? Bike : t === 'E_BIKE' ? Zap : Bike })),
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
            <span>{isEn ? 'FAMILY MOBILITY MANAGEMENT SYSTEM' : 'HỆ THỐNG QUẢN LÝ TÀI SẢN DI CHUYỂN GIA ĐÌNH'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            FAMILY MOBILITY DASHBOARD
          </h1>
          <p className="text-xs mt-1 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
            {isEn
              ? `Monitoring ${assets.length} family vehicles · Virtual Odometer · Fuel/EV Charging · Maintenance Alerts · TCO Analytics`
              : `Theo dõi ${assets.length} phương tiện gia đình · Virtual Odometer · Nhiên liệu/Pin · Lịch bảo dưỡng · Phân tích TCO`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <button onClick={() => setOpenCardConfigModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition hover:opacity-90"
            style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
            <Sliders className="w-4 h-4" />
            <span>{isEn ? 'Card Settings' : 'Cấu hình thẻ'}</span>
          </button>
          <button onClick={() => setOpenAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Vehicle' : 'Thêm phương tiện'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k, i) => (
          <Link href={k.href} key={i} className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform"
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
          </Link>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEn ? 'Search vehicles by name, brand...' : 'Tìm kiếm phương tiện...'}
            className="theme-input !pl-9 w-full sm:w-60"
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
            <AssetCard key={asset.id} asset={asset} settings={cardConfig} />
          ))}
        </div>

        {filteredAssets.length === 0 && (
          <div className="py-20 text-center" style={{ color: 'var(--text-muted)' }}>
            {loading ? (
              <>
                <div className="mx-auto mb-3 w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent-cyan)' }} />
                <p className="font-semibold">Đang tải dữ liệu từ Supabase...</p>
              </>
            ) : error ? (
              <>
                <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold" style={{ color: 'var(--status-red)' }}>Không tải được dữ liệu</p>
                <p className="text-xs mt-1">{error}</p>
                <p className="text-xs mt-1">Kiểm tra /settings/health — có thể bạn chưa chạy file SETUP SQL hoặc chưa đăng nhập.</p>
              </>
            ) : (
              <>
                <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Chưa có phương tiện nào — nhấn "Thêm phương tiện" để bắt đầu</p>
              </>
            )}
          </div>
        )}
      </div>
      {/* ─── Add Asset Modal ─── */}
      {openAddModal && (
        <DraggableModal isOpen={true} onClose={() => () => {}}>
<div className="cursor-grab active:cursor-grabbing relative glass-panel rounded-2xl w-[90vw] sm:w-[600px] max-w-lg my-auto max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Thêm phương tiện mới</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Điền thông tin cơ bản của phương tiện</p>
              </div>
              <button onClick={() => setOpenAddModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Asset Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Loại phương tiện *</label>
                <div className="grid grid-cols-3 gap-2">
                  {ASSET_TYPES.map(t => (
                    <button key={t} onClick={() => setAddForm(p => ({ ...p, asset_type: t }))}
                      className="py-2 px-3 rounded-xl text-xs font-semibold transition"
                      style={addForm.asset_type === t
                        ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
                        : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                      {ASSET_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tên hiển thị *', key: 'name', placeholder: 'VD: Mazda2 gia đình', colSpan: 2 },
                  { label: 'Hãng xe *', key: 'brand', placeholder: 'VD: Toyota, Honda...' },
                  { label: 'Mẫu xe *', key: 'model', placeholder: 'VD: Vios, Civic...' },
                  { label: 'Năm sản xuất', key: 'year', placeholder: '2024', type: 'number' },
                  { label: 'Màu xe', key: 'color', placeholder: 'VD: Trắng Ngọc Trai' },
                  { label: 'Biển số xe', key: 'license_plate', placeholder: 'VD: 30A-888.88' },
                  { label: 'Giá mua (₫)', key: 'purchase_price', placeholder: '500000000', type: 'number' },
                ].map(({ label, key, placeholder, colSpan, type }) => (
                  <div key={key} className={`space-y-1 ${colSpan === 2 ? 'col-span-2' : ''}`}>
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</label>
                    <input type={type || 'text'} className="theme-input" placeholder={placeholder}
                      value={(addForm as any)[key]}
                      onChange={e => setAddForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>

              {/* Fuel Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Loại nhiên liệu / Năng lượng</label>
                <div className="flex flex-wrap gap-2">
                  {FUEL_TYPES.map(f => (
                    <button key={f} onClick={() => setAddForm(p => ({ ...p, fuel_type: f }))}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold transition"
                      style={addForm.fuel_type === f
                        ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
                        : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                      {FUEL_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ghi chú</label>
                <textarea className="theme-input" rows={2} placeholder="Mô tả thêm về phương tiện..."
                  value={addForm.description}
                  onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <div className="flex space-x-2 pt-2">
                <button onClick={handleAddAsset} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  {saving ? 'Đang lưu...' : 'Thêm phương tiện'}
                </button>
                <button onClick={() => setOpenAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          
</div>
</DraggableModal>

      )}
      {/* ─── Card Configuration Modal (Spec v5.2 §224) ─── */}
      {openCardConfigModal && (
        <DraggableModal isOpen={true} onClose={() => () => {}}>
<div className="cursor-grab active:cursor-grabbing relative glass-panel rounded-2xl w-[90vw] sm:w-[600px] max-w-md my-auto max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Cấu hình hiển thị thẻ phương tiện</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Tùy chọn hiển thị các trường dữ liệu trên Card</p>
              </div>
              <button onClick={() => setOpenCardConfigModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {[
                { key: 'showPhoto', label: 'Hình ảnh phương tiện' },
                { key: 'showType', label: 'Nhãn loại phương tiện (Ô tô, Mô tô, Xe đạp...)' },
                { key: 'showName', label: 'Tên phương tiện & Hãng/Mẫu' },
                { key: 'showPrice', label: 'Giá mua ban đầu' },
                { key: 'showLicensePlate', label: 'Biển số xe' },
                { key: 'showOdometer', label: 'Quãng đường / Odometer (km)' },
                { key: 'showFuelLevel', label: 'Mức nhiên liệu / Pin (%)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <input type="checkbox" checked={!!(cardConfig as any)[key]}
                    onChange={e => setCardConfig(p => ({ ...p, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-cyan-500" />
                </label>
              ))}
              <div className="pt-2">
                <button onClick={() => setOpenCardConfigModal(false)}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 transition"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Đóng &amp; Áp dụng
                </button>
              </div>
            </div>
          
</div>
</DraggableModal>

      )}
    </div>
  );
}
