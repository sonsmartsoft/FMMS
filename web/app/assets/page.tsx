'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAssets, createAsset, deleteAsset } from '@/lib/services/assetService';
import { getMaintenanceRecords } from '@/lib/services/maintenanceService';
import { Asset, AssetType, MaintenanceRecord } from '@/types/mobility';
import { Car, Bike, Zap, Plus, Search, Filter, ChevronRight, X, Trash2 } from 'lucide-react';
import DraggableModal from '@/components/ui/DraggableModal';
import AdminSecurityPinModal from '@/components/security/AdminSecurityPinModal';

const TYPE_LABELS: Record<string, string> = {
  ALL: 'Tất cả', CAR: 'Ô Tô', MOTORCYCLE: 'Mô Tô', BICYCLE: 'Xe Đạp', E_BIKE: 'Xe Điện',
};
const TYPE_ICONS: Record<string, React.ElementType> = {
  CAR: Car, MOTORCYCLE: Bike, BICYCLE: Bike, E_BIKE: Zap,
};
const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  CAR:        { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA' },
  MOTORCYCLE: { bg: 'rgba(139,92,246,0.15)', color: '#A78BFA' },
  BICYCLE:    { bg: 'rgba(52,211,153,0.15)', color: '#34D399' },
  E_BIKE:     { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24' },
};

export default function AssetsPage() {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [savingAsset, setSavingAsset] = useState(false);
  const [securityModal, setSecurityModal] = useState<{ isOpen: boolean; title?: string; description?: string; actionName?: string; onConfirm?: () => void }>({ isOpen: false });

  const initialFormState = {
    name: '',
    asset_type: 'CAR' as AssetType,
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    vin: '',
    color: '',
    engine: '',
    fuel_type: 'PETROL' as Asset['fuel_type'],
    tank_capacity_liters: '',
    battery_capacity_kwh: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    purchase_price: '',
    current_value: '',
    initial_odometer_km: '0',
    image_url: '',
    description: '',
  };

  const [assetForm, setAssetForm] = useState(initialFormState);

  const handleCreateAsset = async () => {
    if (!assetForm.name.trim()) {
      alert('Vui lòng nhập tên phương tiện');
      return;
    }
    setSavingAsset(true);
    try {
      const created = await createAsset({
        name: assetForm.name.trim(),
        asset_type: assetForm.asset_type,
        brand: assetForm.brand.trim() || 'Chưa rõ',
        model: assetForm.model.trim() || assetForm.name.trim(),
        year: Number(assetForm.year) || new Date().getFullYear(),
        license_plate: assetForm.license_plate.trim() || undefined,
        vin: assetForm.vin.trim() || undefined,
        color: assetForm.color.trim() || undefined,
        engine: assetForm.engine.trim() || undefined,
        fuel_type: assetForm.fuel_type,
        tank_capacity_liters: assetForm.tank_capacity_liters ? Number(assetForm.tank_capacity_liters) : undefined,
        battery_capacity_kwh: assetForm.battery_capacity_kwh ? Number(assetForm.battery_capacity_kwh) : undefined,
        purchase_date: assetForm.purchase_date || undefined,
        purchase_price: assetForm.purchase_price ? Number(assetForm.purchase_price) : 0,
        current_value: assetForm.current_value ? Number(assetForm.current_value) : (assetForm.purchase_price ? Number(assetForm.purchase_price) : 0),
        initial_odometer_km: assetForm.initial_odometer_km ? Number(assetForm.initial_odometer_km) : 0,
        current_odometer_km: assetForm.initial_odometer_km ? Number(assetForm.initial_odometer_km) : 0,
        image_url: assetForm.image_url.trim() || undefined,
        description: assetForm.description.trim() || undefined,
      });
      setAssets(prev => [created, ...prev]);
      setOpenAddModal(false);
      setAssetForm(initialFormState);
      alert('Thêm phương tiện mới thành công!');
    } catch (err: any) {
      alert(`Lỗi khi tạo phương tiện: ${err?.message ?? 'Lỗi không xác định'}`);
    } finally {
      setSavingAsset(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, m] = await Promise.all([
          getAssets(),
          getMaintenanceRecords(),
        ]);
        if (!cancelled) {
          setAssets(a);
          setMaintenanceList(m);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Không tải được dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteAsset = (a: Asset) => {
    setSecurityModal({
      isOpen: true,
      title: `Xác thực XÓA PHƯƠNG TIỆN "${a.name}" (Admin PIN)`,
      description: `CẢNH BÁO NGUY HIỂM: Bạn đang chuẩn bị xóa vĩnh viễn xe "${a.name}" (${a.license_plate || a.brand}) cùng toàn bộ dữ liệu lịch sử vận hành, bảo dưỡng, chi phí, khoản vay. Hành động này KHÔNG THỂ HOÀN TÁC. Vui lòng nhập mã PIN Admin (0075) để xác nhận.`,
      actionName: 'Xóa vĩnh viễn xe',
      onConfirm: async () => {
        try {
          await deleteAsset(a.id);
          setAssets(prev => prev.filter(x => x.id !== a.id));
          alert(`Đã xóa vĩnh viễn phương tiện ${a.name}`);
        } catch (err: any) {
          alert(`Lỗi khi xóa: ${err?.message}`);
        }
      },
    });
  };

  const filtered = assets.filter((a) => {
    const matchType = filter === 'ALL' || a.asset_type === filter;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.license_plate || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Phương Tiện Gia Đình</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Quản lý {assets.length} phương tiện · Virtual Odometer đồng bộ
          </p>
        </div>
        <button
          onClick={() => setOpenAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shadow-md"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phương tiện</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Tìm kiếm tên, biển số..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="theme-input !pl-9"
          />
        </div>
        <div className="flex items-center space-x-1">
          {Object.keys(TYPE_LABELS).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
              style={filter === t
                ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              {['Phương tiện', 'Loại', 'Biển số / VIN', 'Odometer', 'Tình trạng', 'Giá mua', 'Bảo dưỡng tiếp theo', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((asset, i) => {
              const bc = BADGE_COLORS[asset.asset_type] || { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
              const AssetIcon = TYPE_ICONS[asset.asset_type] || Car;
              return (
                <tr
                  key={asset.id}
                  className="transition"
                  style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}
                >
                  <td className="px-4 py-3">
                    <Link href={`/assets/${asset.id}`} className="flex items-center space-x-3 group cursor-pointer">
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                        {asset.image_url
                          ? <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                          : <AssetIcon className="w-5 h-5 m-auto mt-2.5" style={{ color: 'var(--text-muted)' }} />}
                      </div>
                      <div>
                        <p className="font-bold group-hover:text-cyan-400 transition" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                        <p style={{ color: 'var(--text-muted)' }}>{asset.brand} • {asset.year}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: bc.bg, color: bc.color }}>
                      {TYPE_LABELS[asset.asset_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {asset.license_plate || asset.vin?.slice(0, 10) || '—'}
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)' }}>
                    {asset.current_odometer_km.toLocaleString('vi-VN')} km
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' }}>
                      ● {asset.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {(asset.purchase_price / 1_000_000).toFixed(0)}M ₫
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(() => {
                      // Tìm các record bảo dưỡng của xe này
                      const assetMaints = maintenanceList.filter(m => m.asset_id === asset.id);
                      const futureMaints = assetMaints
                        .filter(m => m.next_due_date || m.next_due_km)
                        .sort((a, b) => (a.next_due_date || '').localeCompare(b.next_due_date || ''));

                      const nextMaint = futureMaints[0];
                      const dateStr = nextMaint?.next_due_date || asset.next_maintenance_due;
                      const dueKm = nextMaint?.next_due_km;

                      if (!dateStr && !dueKm) {
                        return <span className="font-normal" style={{ color: 'var(--text-muted)' }}>Chưa lên lịch</span>;
                      }

                      if (dateStr) {
                        const maintDate = new Date(dateStr);
                        const today = new Date();
                        const diffDays = Math.ceil((maintDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        const fmtDateStr = maintDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

                        if (diffDays < 0) {
                          return (
                            <div>
                              <span className="font-bold text-rose-400 block">{fmtDateStr}</span>
                              <span className="text-[10px] text-rose-400 font-medium">⚠️ Quá hạn {Math.abs(diffDays)} ngày</span>
                            </div>
                          );
                        } else if (diffDays <= 7) {
                          return (
                            <div>
                              <span className="font-bold text-amber-400 block">{fmtDateStr}</span>
                              <span className="text-[10px] text-amber-400 font-medium">🟠 Còn {diffDays} ngày</span>
                            </div>
                          );
                        } else if (diffDays <= 30) {
                          return (
                            <div>
                              <span className="font-bold text-amber-400 block">{fmtDateStr}</span>
                              <span className="text-[10px] text-amber-400">🟡 Còn {diffDays} ngày</span>
                            </div>
                          );
                        } else {
                          return (
                            <div>
                              <span className="font-semibold text-emerald-400 block">{fmtDateStr}</span>
                              <span className="text-[10px] text-emerald-400 font-medium">✅ Còn {diffDays} ngày</span>
                            </div>
                          );
                        }
                      }

                      if (dueKm) {
                        return (
                          <div>
                            <span className="font-bold text-cyan-400 block">Kỳ {dueKm.toLocaleString('vi-VN')} km</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Theo mốc ODO</span>
                          </div>
                        );
                      }

                      return <span className="font-normal" style={{ color: 'var(--text-muted)' }}>Chưa lên lịch</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link href={`/assets/${asset.id}`} className="flex items-center space-x-1 text-[11px] font-bold transition hover:opacity-70" style={{ color: 'var(--accent-cyan)' }}>
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteAsset(asset)}
                        className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/15 transition border border-rose-500/20"
                        title="Xóa phương tiện (Yêu cầu mã PIN 0075)"
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

        {filtered.length === 0 && (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            {loading ? (
              <>
                <div className="mx-auto mb-3 w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--accent-cyan)' }} />
                <p className="text-sm font-semibold">Đang tải dữ liệu...</p>
              </>
            ) : error ? (
              <>
                <p className="text-sm font-semibold" style={{ color: 'var(--status-red)' }}>Không tải được dữ liệu</p>
                <p className="text-xs mt-1">{error}</p>
              </>
            ) : (
              <>
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">Không tìm thấy phương tiện</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng phương tiện', value: assets.length, color: 'var(--accent-cyan)' },
          { label: 'Đang hoạt động', value: assets.filter(a => a.status === 'ACTIVE').length, color: 'var(--status-green)' },
          { label: 'Tổng km cả đội', value: `${assets.reduce((s,a)=>s+a.current_odometer_km,0).toLocaleString('vi-VN')} km`, color: 'var(--text-primary)' },
          { label: 'Tổng giá trị', value: `${(assets.reduce((s,a)=>s+a.current_value,0)/1_000_000).toFixed(0)}M ₫`, color: 'var(--status-amber)' },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-base font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Add Asset Modal */}
      {openAddModal && (
        <DraggableModal isOpen={true} onClose={() => () => {}}>
<div
              className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-2xl flex flex-col shadow-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: 'min(85vh, 620px)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>🚗 Thêm Phương Tiện Mới Vào Đội Xe</span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Nhập thông số kỹ thuật, biển số và giá trị ban đầu</p>
                </div>
                <button onClick={() => setOpenAddModal(false)} className="p-1.5 rounded-xl hover:bg-black/10 transition" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                {/* 1. Phân loại & Tên */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">1. Thông tin cơ bản &amp; Phân loại</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Tên phương tiện *</label>
                      <input
                        type="text"
                        className="theme-input font-bold"
                        placeholder="VD: Mazda 2AT 2026, Honda Air Blade 2021, Xe đạp Thống Nhất..."
                        value={assetForm.name}
                        onChange={e => setAssetForm(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Loại phương tiện *</label>
                      <select
                        className="theme-select font-semibold"
                        value={assetForm.asset_type}
                        onChange={e => {
                          const t = e.target.value as AssetType;
                          const f = t === 'E_BIKE' ? 'ELECTRIC' : t === 'BICYCLE' ? 'HUMAN_POWER' : 'PETROL';
                          setAssetForm(p => ({ ...p, asset_type: t, fuel_type: f as any }));
                        }}
                      >
                        <option value="CAR">Ô Tô (Car)</option>
                        <option value="MOTORCYCLE">Mô Tô / Xe Máy (Motorcycle)</option>
                        <option value="E_BIKE">Xe Điện (E-Bike / EV)</option>
                        <option value="BICYCLE">Xe Đạp (Bicycle)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Hãng sản xuất (Brand) *</label>
                      <input
                        type="text"
                        className="theme-input"
                        placeholder="VD: MAZDA, HONDA, THỐNG NHẤT, VINFAST..."
                        value={assetForm.brand}
                        onChange={e => setAssetForm(p => ({ ...p, brand: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Dòng xe / Model</label>
                      <input
                        type="text"
                        className="theme-input"
                        placeholder="VD: Mazda 2, Air Blade 125, MTB 26-05..."
                        value={assetForm.model}
                        onChange={e => setAssetForm(p => ({ ...p, model: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Năm sản xuất</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold"
                        value={assetForm.year}
                        onChange={e => setAssetForm(p => ({ ...p, year: parseInt(e.target.value) || 2026 }))}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Biển số, Định danh & Động cơ */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400">2. Biển số, Định danh &amp; Động cơ</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Biển kiểm soát</label>
                      <input
                        type="text"
                        className="theme-input font-mono font-bold text-cyan-400 uppercase"
                        placeholder="VD: 19B-213.87"
                        value={assetForm.license_plate}
                        onChange={e => setAssetForm(p => ({ ...p, license_plate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Màu sắc</label>
                      <input
                        type="text"
                        className="theme-input"
                        placeholder="VD: Đỏ Soul Red, Đen Nhám, Trắng..."
                        value={assetForm.color}
                        onChange={e => setAssetForm(p => ({ ...p, color: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số khung VIN</label>
                      <input
                        type="text"
                        className="theme-input font-mono"
                        placeholder="VD: JM1DJ1010102026..."
                        value={assetForm.vin}
                        onChange={e => setAssetForm(p => ({ ...p, vin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Động cơ / Cấu hình</label>
                      <input
                        type="text"
                        className="theme-input"
                        placeholder="VD: 1.5L SkyActiv-G, 125cc FI..."
                        value={assetForm.engine}
                        onChange={e => setAssetForm(p => ({ ...p, engine: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Loại nhiên liệu</label>
                      <select
                        className="theme-select font-semibold"
                        value={assetForm.fuel_type}
                        onChange={e => setAssetForm(p => ({ ...p, fuel_type: e.target.value as any }))}
                      >
                        <option value="PETROL">Xăng (Petrol)</option>
                        <option value="DIESEL">Dầu (Diesel)</option>
                        <option value="ELECTRIC">Điện (Electric / EV)</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="HUMAN_POWER">Sức người (Xe đạp)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {assetForm.fuel_type === 'ELECTRIC' ? 'Dung lượng pin (kWh)' : 'Dung tích bình xăng (Lít)'}
                      </label>
                      <input
                        type="number"
                        className="theme-input font-mono"
                        placeholder={assetForm.fuel_type === 'ELECTRIC' ? 'VD: 52' : 'VD: 44.0'}
                        value={assetForm.fuel_type === 'ELECTRIC' ? assetForm.battery_capacity_kwh : assetForm.tank_capacity_liters}
                        onChange={e => {
                          if (assetForm.fuel_type === 'ELECTRIC') {
                            setAssetForm(p => ({ ...p, battery_capacity_kwh: e.target.value }));
                          } else {
                            setAssetForm(p => ({ ...p, tank_capacity_liters: e.target.value }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Giá trị & Odometer */}
                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">3. Ngày mua, Giá trị &amp; Odometer ban đầu</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày mua</label>
                      <input
                        type="date"
                        className="theme-input"
                        value={assetForm.purchase_date}
                        onChange={e => setAssetForm(p => ({ ...p, purchase_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Giá mua ban đầu (₫)</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-emerald-400"
                        placeholder="VD: 397000000"
                        value={assetForm.purchase_price}
                        onChange={e => setAssetForm(p => ({ ...p, purchase_price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Odometer lúc nhận xe (km)</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-cyan-400"
                        placeholder="VD: 0 hoặc 45000"
                        value={assetForm.initial_odometer_km}
                        onChange={e => setAssetForm(p => ({ ...p, initial_odometer_km: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Link ảnh phương tiện (URL)</label>
                      <input
                        type="text"
                        className="theme-input"
                        placeholder="https://images.unsplash.com/..."
                        value={assetForm.image_url}
                        onChange={e => setAssetForm(p => ({ ...p, image_url: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ghi chú / Mô tả</label>
                      <input
                        type="text"
                        className="theme-input"
                        placeholder="VD: Xe phục vụ gia đình đi lại hằng ngày..."
                        value={assetForm.description}
                        onChange={e => setAssetForm(p => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <button
                  onClick={handleCreateAsset}
                  disabled={savingAsset}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                >
                  {savingAsset ? 'Đang tạo...' : 'Lưu phương tiện mới'}
                </button>
                <button
                  onClick={() => setOpenAddModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-black/5 transition"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  Hủy
                </button>
              </div>
            
</div>
</DraggableModal>
      )}

      {/* 🔒 Master Admin Security PIN Confirmation Modal */}
      <AdminSecurityPinModal
        isOpen={securityModal.isOpen}
        title={securityModal.title}
        description={securityModal.description}
        actionName={securityModal.actionName}
        onClose={() => setSecurityModal(p => ({ ...p, isOpen: false }))}
        onSuccess={() => {
          if (securityModal.onConfirm) securityModal.onConfirm();
        }}
      />
    </div>
  );
}
