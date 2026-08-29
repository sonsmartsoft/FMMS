'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getMaintenanceRecords, createMaintenanceRecord, updateMaintenanceRecord, deleteMaintenanceRecord } from '@/lib/services/maintenanceService';
import { Asset, MaintenanceRecord } from '@/types/mobility';
import { Wrench, Plus, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import DraggableModal from '@/components/ui/DraggableModal';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

const DEFAULT_MAINT_CATEGORIES = [
  'Thay dầu máy', 'Thay lọc dầu / Lọc nhớt', 'Thay lọc gió động cơ', 'Thay lọc gió điều hòa',
  'Thay bugi đánh lửa', 'Thay lốp xe', 'Kiểm tra & Thay má phanh', 'Thay ắc-quy', 'Vệ sinh hệ thống làm mát',
  'Thay dầu hộp số', 'Bơm lốp & Cân thước lái', 'Vệ sinh buồng đốt / Kim phun', 'Sửa chữa & Khác'
];

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_MAINT_CATEGORIES);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    asset_id: '', date: '', maintenance_type: 'Thay dầu máy',
    odometer_km: '', cost: '', discount: '', vendor: '', notes: '', next_due_km: '', next_due_date: '',
  });
  const [serviceItems, setServiceItems] = useState<{ name: string; cost: string }[]>([
    { name: 'Thay dầu máy', cost: '650000' },
    { name: 'Thay lọc dầu', cost: '220000' },
  ]);

  const parseMaintenanceNotes = (notes?: string, defaultCost?: number, defaultType?: string) => {
    let discount = '';
    let items: { name: string; cost: string }[] = [];
    let userNotes = notes || '';

    if (userNotes) {
      const discountMatch = userNotes.match(/\[Giảm giá:\s*-?([0-9.,]+)\s*₫?\]/i);
      if (discountMatch) {
        const discRaw = discountMatch[1].replace(/[.,]/g, '');
        if (discRaw) discount = discRaw;
        userNotes = userNotes.replace(discountMatch[0], '').trim();
      }

      const itemsPrefixMatch = userNotes.match(/Các hạng mục:\s*([^|]+)/i);
      if (itemsPrefixMatch) {
        const itemsStr = itemsPrefixMatch[1];
        const rawParts = itemsStr.split('+');
        rawParts.forEach(p => {
          const colonIdx = p.lastIndexOf(':');
          if (colonIdx > 0) {
            const name = p.slice(0, colonIdx).trim();
            const costStr = p.slice(colonIdx + 1).replace(/[^0-9]/g, '');
            if (name) items.push({ name, cost: costStr });
          }
        });
        userNotes = userNotes.replace(itemsPrefixMatch[0], '').trim();
      } else {
        const itemMatches = Array.from(userNotes.matchAll(/([^,|]+?)\s*\(([0-9.,]+)\s*₫?\)/g));
        if (itemMatches.length > 0) {
          itemMatches.forEach(m => {
            const name = m[1].trim();
            const costStr = m[2].replace(/[.,]/g, '');
            if (name && !name.includes('Giảm giá')) {
              items.push({ name, cost: costStr });
            }
          });
          userNotes = userNotes.replace(/([^,|]+?)\s*\(([0-9.,]+)\s*₫?\)[,\s]*/g, '').trim();
        }
      }

      userNotes = userNotes.replace(/^[|\s,]+|[|\s,]+$/g, '').trim();
    }

    if (items.length === 0) {
      items = [{ name: defaultType || 'Thay dầu máy', cost: defaultCost ? String(defaultCost) : '' }];
    }

    return { discount, items, cleanNotes: userNotes };
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      asset_id: selectedAssetId || assets[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      maintenance_type: categories[0] || 'Thay dầu máy',
      odometer_km: '',
      cost: '',
      discount: '',
      vendor: '',
      notes: '',
      next_due_km: '',
      next_due_date: '',
    });
    setServiceItems([
      { name: 'Thay dầu máy', cost: '650000' },
      { name: 'Thay lọc dầu', cost: '220000' },
    ]);
    setOpenModal(true);
  };

  const handleOpenEdit = (r: MaintenanceRecord) => {
    setEditingId(r.id);
    const parsed = parseMaintenanceNotes(r.notes, r.cost, r.maintenance_type);
    setServiceItems(parsed.items);
    setForm({
      asset_id: r.asset_id,
      date: r.date ? r.date.slice(0, 10) : '',
      maintenance_type: r.maintenance_type || parsed.items[0]?.name || 'Thay dầu máy',
      odometer_km: r.odometer_km ? String(r.odometer_km) : '',
      cost: String(r.cost || ''),
      discount: parsed.discount,
      vendor: r.vendor || '',
      notes: parsed.cleanNotes,
      next_due_km: r.next_due_km ? String(r.next_due_km) : '',
      next_due_date: r.next_due_date ? r.next_due_date.slice(0, 10) : '',
    });
    setOpenModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa đợt bảo dưỡng này?')) return;
    try {
      await deleteMaintenanceRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Lỗi'}`);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, m] = await Promise.all([getAssets(), getMaintenanceRecords()]);
        if (cancelled) return;
        setAssets(a);
        setRecords(m);
        if (a.length > 0) setForm(p => ({ ...p, asset_id: a[0].id }));
      } catch {
        /* rỗng */
      }
    })();

    const loadMasterCategories = () => {
      const sMaint = localStorage.getItem('fmms_master_maint');
      if (sMaint) {
        try {
          const parsed = JSON.parse(sMaint);
          if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
        } catch {}
      }
    };

    loadMasterCategories();
    window.addEventListener('fmms_master_updated', loadMasterCategories);

    return () => {
      cancelled = true;
      window.removeEventListener('fmms_master_updated', loadMasterCategories);
    };
  }, []);

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

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortCol, setSortCol] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const displayRecords = useMemo(() => {
    let list = selectedAssetId
      ? records.filter(r => isSameAsset(r.asset_id, selectedAssetId))
      : records;
    if (startDate) {
      list = list.filter(r => r.date && r.date.slice(0, 10) >= startDate);
    }
    if (endDate) {
      list = list.filter(r => r.date && r.date.slice(0, 10) <= endDate);
    }
    return [...list].sort((a, b) => {
      let valA: any = a[sortCol as keyof MaintenanceRecord] ?? '';
      let valB: any = b[sortCol as keyof MaintenanceRecord] ?? '';
      if (sortCol === 'asset_id') {
        valA = assets.find(x => x.id === a.asset_id)?.name || '';
        valB = assets.find(x => x.id === b.asset_id)?.name || '';
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [records, selectedAssetId, startDate, endDate, sortCol, sortDir, assets]);

  const totalCost = displayRecords.reduce((s, r) => s + r.cost, 0);
  const calculatedItemsCost = serviceItems.reduce((s, item) => s + (parseFloat(item.cost) || 0), 0);

  const selectedVehicleObj = assets.find(a => a.id === selectedAssetId);

  const addServiceItem = () => {
    setServiceItems(p => [...p, { name: '', cost: '' }]);
  };

  const removeServiceItem = (idx: number) => {
    setServiceItems(p => p.filter((_, i) => i !== idx));
  };

  const updateServiceItem = (idx: number, field: 'name' | 'cost', value: string) => {
    setServiceItems(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const save = async () => {
    try {
      const itemsCost = calculatedItemsCost;
      const subtotal = itemsCost > 0 ? itemsCost : (parseFloat(form.cost) || 0);
      const discount = parseFloat(form.discount) || 0;
      const finalCost = Math.max(0, subtotal - discount);

      const itemsNotes = serviceItems.filter(i => i.name).map(i => `${i.name}: ${parseInt(i.cost || '0').toLocaleString('vi-VN')}₫`).join(' + ');
      const discountNote = discount > 0 ? `[Giảm giá: -${parseInt(String(discount)).toLocaleString('vi-VN')}₫]` : '';
      const combinedNotes = [`Các hạng mục: ${itemsNotes}`, discountNote, form.notes].filter(Boolean).join(' | ');

      if (editingId) {
        const updated = await updateMaintenanceRecord(editingId, {
          asset_id: form.asset_id || assets[0]?.id,
          maintenance_type: form.maintenance_type,
          date: form.date || new Date().toISOString().split('T')[0],
          odometer_km: parseFloat(form.odometer_km) || 0,
          cost: finalCost,
          vendor: form.vendor || undefined,
          notes: combinedNotes || undefined,
          next_due_km: form.next_due_km ? parseFloat(form.next_due_km) : undefined,
          next_due_date: form.next_due_date || undefined,
        });
        setRecords(prev => prev.map(r => r.id === editingId ? updated : r));
      } else {
        const created = await createMaintenanceRecord({
          asset_id: form.asset_id || assets[0]?.id,
          maintenance_type: form.maintenance_type,
          date: form.date || new Date().toISOString().split('T')[0],
          odometer_km: parseFloat(form.odometer_km) || 0,
          cost: finalCost,
          vendor: form.vendor || undefined,
          notes: combinedNotes || undefined,
          next_due_km: form.next_due_km ? parseFloat(form.next_due_km) : undefined,
          next_due_date: form.next_due_date || undefined,
        });
        // Auto-create expense record
        if (finalCost > 0) {
          try {
            const { createExpense } = await import('@/lib/services/expenseService');
            await createExpense({
              asset_id: form.asset_id || assets[0]?.id,
              date: form.date || new Date().toISOString().split('T')[0],
              category: 'Maintenance',
              subcategory: 'Maintenance',
              amount: finalCost,
              currency: 'VND',
              vendor: form.vendor || undefined,
              description: `Bảo dưỡng: ${form.maintenance_type}${discount > 0 ? ` (Giảm -${fmt(discount)}₫)` : ''}`,
            });
          } catch (expErr) {
            console.warn('Auto expense sync warning:', expErr);
          }
        }
        setRecords([created, ...records]);
      }

      setOpenModal(false);
      setEditingId(null);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
  };

  const getAssetName = (id: string) => assets.find(a => a.id === id || isSameAsset(id, a.id))?.name || id;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Bảo Dưỡng & Phụ Tùng</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedVehicleObj ? (
              <span>Bảo dưỡng phương tiện: <strong>{selectedVehicleObj.name}</strong> ({selectedVehicleObj.license_plate}) · Tổng: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalCost)} ₫</strong></span>
            ) : (
              <span>Lịch sử bảo dưỡng toàn bộ phương tiện · Tổng: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalCost)} ₫</strong></span>
            )}
          </p>
        </div>
        <button onClick={handleOpenAdd} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shadow-md"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Thêm bảo dưỡng</span>
        </button>
      </div>

      {/* Vehicle Filter Selector Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Lọc bảo dưỡng theo phương tiện ({assets.length} xe)
          </p>
          {selectedAssetId && (
            <button 
              onClick={() => setSelectedAssetId(null)} 
              className="text-[11px] font-bold underline transition hover:opacity-80 flex items-center space-x-1"
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
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{records.length} đợt</p>
              </div>
            </div>
            <p className="text-right text-[11px] font-extrabold mt-2" style={{ color: 'var(--status-red)' }}>
              {fmt(records.reduce((s, r) => s + r.cost, 0))} ₫
            </p>
          </div>

          {/* Vehicle Cards */}
          {assets.map(a => {
            const isSelected = selectedAssetId === a.id;
            const assetRecs = records.filter(r => isSameAsset(r.asset_id, a.id));
            const assetCost = assetRecs.reduce((s, r) => s + r.cost, 0);

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
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="w-8 h-8 rounded-xl object-cover border border-slate-500/20 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      {a.asset_type === 'CAR' ? '🚘' : a.asset_type === 'MOTORCYCLE' ? '🛵' : '🚲'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                    <p className="text-[9px] font-semibold truncate" style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.brand}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                    {assetRecs.length} đợt
                  </span>
                  <span className="font-extrabold text-[11px]" style={{ color: assetCost > 0 ? 'var(--status-red)' : 'var(--text-muted)' }}>
                    {assetCost > 0 ? `${fmt(assetCost)}₫` : '0₫'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng chi phí', value: `${(totalCost / 1_000_000).toFixed(1)}M ₫`, color: 'var(--status-red)' },
          { label: 'Số lần bảo dưỡng', value: displayRecords.length, color: 'var(--accent-cyan)' },
          { label: 'Đang OK', value: displayRecords.filter(r => r.status === 'OK').length, color: 'var(--status-green)' },
          { label: 'Sắp đến hạn', value: displayRecords.filter(r => r.status === 'DUE_SOON').length, color: 'var(--status-amber)' },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <p className="text-lg font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming reminders */}
      <div className="p-4 rounded-2xl flex items-start space-x-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--status-amber)' }} />
        <div>
          <p className="font-bold text-xs" style={{ color: 'var(--status-amber)' }}>Nhắc nhở bảo dưỡng tiếp theo</p>
          <ul className="mt-1 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {assets
              .filter(a => a.next_maintenance_due && (!selectedAssetId || isSameAsset(a.id, selectedAssetId)))
              .map(a => (
                <li key={a.id}>→ <strong>{a.name}</strong> ({a.license_plate}): {a.next_maintenance_due}</li>
              ))}
          </ul>
        </div>
      </div>

      {/* 📅 Date Range Filter Toolbar */}
      <div className="p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
            <span>📅 Lọc ngày:</span>
          </span>
          <div className="flex items-center space-x-1">
            {[
              { label: 'Tất cả', start: '', end: '' },
              { label: 'Hôm nay', start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
              {
                label: 'Tháng này',
                start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
                end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
              },
              {
                label: 'Tháng trước',
                start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10),
                end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10),
              },
              {
                label: 'Năm nay',
                start: `${new Date().getFullYear()}-01-01`,
                end: `${new Date().getFullYear()}-12-31`,
              },
            ].map(preset => {
              const isActive = startDate === preset.start && endDate === preset.end;
              return (
                <button
                  key={preset.label}
                  onClick={() => { setStartDate(preset.start); setEndDate(preset.end); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                    isActive ? 'bg-cyan-500 text-white shadow-sm' : 'hover:bg-white/10'
                  }`}
                  style={!isActive ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="theme-input text-[11px] py-1 px-2 font-mono"
              style={{ width: '130px' }}
            />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="theme-input text-[11px] py-1 px-2 font-mono"
              style={{ width: '130px' }}
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-[10px] font-bold text-rose-400 hover:underline px-1.5 py-1"
            >
              ✕ Xóa lọc
            </button>
          )}
          {/* Sorting Controls */}
          <div className="flex items-center space-x-1 border-l pl-2" style={{ borderColor: 'var(--border-default)' }}>
            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Sắp xếp:</span>
            <select
              value={sortCol}
              onChange={e => setSortCol(e.target.value)}
              className="theme-select text-[10px] py-1 px-2 font-semibold"
              style={{ width: 'auto' }}
            >
              <option value="date">Ngày thực hiện</option>
              <option value="cost">Chi phí</option>
              <option value="maintenance_type">Hạng mục (A-Z)</option>
              <option value="odometer_km">Số Km (ODO)</option>
            </select>
            <button
              onClick={() => setSortDir(p => p === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1 rounded-lg text-[10px] font-bold border hover:bg-white/10 transition"
              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--accent-cyan)' }}
              title={sortDir === 'asc' ? 'Tăng dần (A→Z)' : 'Giảm dần (Z→A)'}
            >
              {sortDir === 'asc' ? '▲ A→Z' : '▼ Z→A'}
            </button>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {displayRecords.length === 0 ? (
          <div className="py-12 text-center rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
            <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold text-xs">Chưa có lịch sử bảo dưỡng nào cho phương tiện này</p>
          </div>
        ) : (
          displayRecords.map((r) => {
            const StatusIcon = r.status === 'OK' ? CheckCircle2 : r.status === 'DUE_SOON' ? Clock : AlertTriangle;
            const statusColor = r.status === 'OK' ? 'var(--status-green)' : r.status === 'DUE_SOON' ? 'var(--status-amber)' : 'var(--status-red)';
            const parsed = parseMaintenanceNotes(r.notes, r.cost, r.maintenance_type);

            return (
              <div key={r.id} className="p-4 rounded-2xl transition hover:border-cyan-500/40" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${statusColor}20`, color: statusColor }}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{r.maintenance_type}</p>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${statusColor}20`, color: statusColor }}>
                          {r.status === 'OK' ? '✓ OK' : r.status === 'DUE_SOON' ? '⚠ Sắp đến' : '❌ Quá hạn'}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <strong>{getAssetName(r.asset_id)}</strong> · {fmtDate(r.date)} · {fmt(r.odometer_km)} km · {r.vendor || 'Đại lý chính hãng'}
                      </p>

                      {/* Itemized Service Breakdown Badges */}
                      {parsed.items.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2">
                          {parsed.items.map((item, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                              <span>🔧 {item.name}:</span>
                              <strong className="text-cyan-400 font-mono">{item.cost ? `${fmt(parseFloat(item.cost))}₫` : '—'}</strong>
                            </span>
                          ))}
                          {parsed.discount && parseFloat(parsed.discount) > 0 && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold border text-amber-400 border-amber-500/30" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                              🎁 Giảm giá: -{fmt(parseFloat(parsed.discount))}₫
                            </span>
                          )}
                        </div>
                      )}

                      {parsed.cleanNotes && (
                        <p className="text-[10px] mt-1.5 p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
                          📝 {parsed.cleanNotes}
                        </p>
                      )}

                      {r.next_due_km && (
                        <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                          Kỳ tiếp: {fmt(r.next_due_km)} km {r.next_due_date ? `(${fmtDate(r.next_due_date)})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 space-y-2">
                    <span className="font-bold text-sm" style={{ color: 'var(--status-red)' }}>{fmt(r.cost)} ₫</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border transition hover:bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border transition hover:bg-rose-500/20 text-rose-400 border-rose-500/30"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Multi-Service Maintenance Modal */}
      {openModal && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(false)}>
<div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>

            {/* Modal Sticky Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 shrink-0 border-b z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>🛠️ Thêm Đợt Bảo Dưỡng / Thay Phụ Tùng Mới</span>
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Ghi nhận đợt bảo dưỡng gồm nhiều hạng mục dịch vụ &amp; phụ tùng cùng lúc</p>
              </div>
              <button onClick={() => setOpenModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Section 1: General Info */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">1. Thông tin Đợt Bảo Dưỡng</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                    <select className="theme-select font-semibold" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày thực hiện *</label>
                    <input type="date" className="theme-input font-medium" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Odometer lúc BD (km)</label>
                    <input type="number" className="theme-input font-mono font-bold" placeholder="VD: 12846" value={form.odometer_km} onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Gói / Loại bảo dưỡng chính</label>
                    <select className="theme-select font-semibold" value={form.maintenance_type} onChange={e => setForm(p => ({ ...p, maintenance_type: e.target.value }))}>
                      {categories.map((t: string) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Garage / Đại lý thực hiện</label>
                    <input type="text" className="theme-input" placeholder="VD: Thaco Mazda Hà Đông" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Kỳ bảo dưỡng tiếp (km)</label>
                    <input type="number" className="theme-input font-mono" placeholder="VD: 17846" value={form.next_due_km} onChange={e => setForm(p => ({ ...p, next_due_km: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Multi-Service Line Items Section */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-xs text-purple-400">
                    2. Chi tiết các Hạng mục / Dịch vụ &amp; Phụ tùng ({serviceItems.length})
                  </span>
                  <button type="button" onClick={addServiceItem} className="text-xs font-bold px-3 py-1.5 rounded-xl text-white shadow-sm transition hover:opacity-90 flex items-center gap-1" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                    + Thêm dịch vụ
                  </button>
                </div>

                {/* Quick suggestions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Chọn nhanh:</span>
                  {categories.slice(0, 6).map((cat, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setServiceItems(p => [...p, { name: cat, cost: '' }])}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition hover:opacity-90"
                      style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                    >
                      + {cat}
                    </button>
                  ))}
                </div>

                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider px-1 pt-1" style={{ color: 'var(--text-muted)' }}>
                  <div className="col-span-7">Tên Hạng Mục / Dịch Vụ Bảo Dưỡng *</div>
                  <div className="col-span-4">Chi phí thực tế (₫) *</div>
                  <div className="col-span-1 text-center">Xóa</div>
                </div>

                <div className="space-y-2">
                  {serviceItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-7">
                          <select
                            className="theme-select text-xs font-semibold"
                            value={categories.includes(item.name) ? item.name : 'OTHER'}
                            onChange={e => {
                              const selected = e.target.value;
                              if (selected === 'OTHER') {
                                updateServiceItem(idx, 'name', '');
                              } else {
                                updateServiceItem(idx, 'name', selected);
                              }
                            }}
                          >
                            <option value="" disabled>-- Chọn dịch vụ từ Master Data --</option>
                            {categories.map(cat => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                            <option value="OTHER">✍️ Tùy chọn khác (Nhập tay...)</option>
                          </select>

                          {(!categories.includes(item.name) || item.name === '') && (
                            <input
                              type="text"
                              className="theme-input text-xs mt-1.5"
                              placeholder="Nhập tên dịch vụ tùy chỉnh (VD: Thay xích, Cân vành...)"
                              value={item.name}
                              onChange={e => updateServiceItem(idx, 'name', e.target.value)}
                            />
                          )}
                        </div>

                        <div className="col-span-4">
                          <input
                            type="number"
                            className="theme-input font-mono font-bold text-xs text-emerald-400"
                            placeholder="Chi phí ₫"
                            value={item.cost}
                            onChange={e => updateServiceItem(idx, 'cost', e.target.value)}
                          />
                        </div>

                        <div className="col-span-1 flex justify-center">
                          {serviceItems.length > 1 && (
                            <button type="button" onClick={() => removeServiceItem(idx)} className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/15 shrink-0 transition" title="Xóa dòng">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Discount & Final Total */}
                <div className="p-3.5 rounded-xl space-y-2.5 mt-2" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <span>🎁 Giảm giá / Chiết khấu (₫):</span>
                    </label>
                    <input
                      type="number"
                      className="theme-input font-mono font-bold text-xs text-amber-400"
                      style={{ width: '160px' }}
                      placeholder="0"
                      value={form.discount}
                      onChange={e => setForm(p => ({ ...p, discount: e.target.value }))}
                    />
                  </div>

                  <div className="pt-2 border-t space-y-1.5 text-xs" style={{ borderColor: 'var(--border-default)' }}>
                    <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                      <span>Tổng tiền dịch vụ:</span>
                      <span className="font-mono">{fmt(calculatedItemsCost > 0 ? calculatedItemsCost : (parseFloat(form.cost) || 0))} ₫</span>
                    </div>
                    {parseFloat(form.discount) > 0 && (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Chiết khấu giảm giá:</span>
                        <span className="font-mono">-{fmt(parseFloat(form.discount) || 0)} ₫</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t font-extrabold text-sm" style={{ borderColor: 'var(--border-default)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>Thực thanh toán:</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {fmt(Math.max(0, (calculatedItemsCost > 0 ? calculatedItemsCost : (parseFloat(form.cost) || 0)) - (parseFloat(form.discount) || 0)))} ₫
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={save} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                Lưu đợt bảo dưỡng
              </button>
              <button onClick={() => setOpenModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          
</div>
</DraggableModal>

      )}
    </div>
  );
}
