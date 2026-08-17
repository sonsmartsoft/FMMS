'use client';

import React, { useEffect, useState } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getMaintenanceRecords, createMaintenanceRecord } from '@/lib/services/maintenanceService';
import { Asset, MaintenanceRecord } from '@/types/mobility';
import { Wrench, Plus, X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

const MAINT_TYPES = [
  'Thay dầu máy', 'Thay lọc dầu', 'Thay lốp xe', 'Kiểm tra phanh',
  'Kiểm tra định kỳ', 'Thay ắc-quy', 'Vệ sinh hệ thống làm mát',
  'Thay lọc gió', 'Cân chỉnh bánh xe', 'Thay bugi', 'Sửa chữa', 'Khác',
];

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [form, setForm] = useState({
    asset_id: '', date: '', maintenance_type: 'Thay dầu máy',
    odometer_km: '', cost: '', vendor: '', notes: '', next_due_km: '', next_due_date: '',
  });
  const [serviceItems, setServiceItems] = useState<{ name: string; cost: string }[]>([
    { name: 'Thay dầu máy', cost: '650000' },
    { name: 'Thay lọc dầu', cost: '220000' },
  ]);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const totalCost = records.reduce((s, r) => s + r.cost, 0);

  const calculatedItemsCost = serviceItems.reduce((s, item) => s + (parseFloat(item.cost) || 0), 0);

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
      const finalCost = itemsCost > 0 ? itemsCost : (parseFloat(form.cost) || 0);
      const itemsNotes = serviceItems.filter(i => i.name).map(i => `${i.name} (${fmt(parseFloat(i.cost) || 0)}₫)`).join(', ');
      const combinedNotes = itemsNotes ? `${itemsNotes}${form.notes ? ' | ' + form.notes : ''}` : form.notes;

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
      setRecords([created, ...records]);
      setOpenModal(false);
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
  };

  const getAssetName = (id: string) => assets.find(a => a.id === id)?.name || id;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Bảo Dưỡng & Phụ Tùng</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Lịch sử bảo dưỡng toàn bộ phương tiện · Tổng: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalCost)} ₫</strong>
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-white text-xs font-bold transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Thêm bảo dưỡng</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-center">
        {[
          { label: 'Tổng chi phí', value: `${(totalCost / 1_000_000).toFixed(1)}M ₫`, color: 'var(--status-red)' },
          { label: 'Số lần bảo dưỡng', value: records.length, color: 'var(--accent-cyan)' },
          { label: 'Đang OK', value: records.filter(r => r.status === 'OK').length, color: 'var(--status-green)' },
          { label: 'Sắp đến hạn', value: records.filter(r => r.status === 'DUE_SOON').length, color: 'var(--status-amber)' },
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
            {assets.filter(a => a.next_maintenance_due).map(a => (
              <li key={a.id}>→ <strong>{a.name}</strong>: {a.next_maintenance_due}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Records */}
      <div className="space-y-3">
        {records.map((r) => {
          const StatusIcon = r.status === 'OK' ? CheckCircle2 : r.status === 'DUE_SOON' ? Clock : AlertTriangle;
          const statusColor = r.status === 'OK' ? 'var(--status-green)' : r.status === 'DUE_SOON' ? 'var(--status-amber)' : 'var(--status-red)';
          return (
            <div key={r.id} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${statusColor}20`, color: statusColor }}>
                    <StatusIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{r.maintenance_type}</p>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${statusColor}20`, color: statusColor }}>
                        {r.status === 'OK' ? '✓ OK' : r.status === 'DUE_SOON' ? '⚠ Sắp đến' : '❌ Quá hạn'}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {getAssetName(r.asset_id)} · {fmtDate(r.date)} · {fmt(r.odometer_km)} km · {r.vendor || 'Đại lý chính hãng'}
                    </p>
                    {r.notes && <p className="text-[10px] mt-1 p-2 rounded-lg" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>📝 {r.notes}</p>}
                    {r.next_due_km && (
                      <p className="text-[11px] mt-1 font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                        Kỳ tiếp: {fmt(r.next_due_km)} km {r.next_due_date ? `(${fmtDate(r.next_due_date)})` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-bold text-sm shrink-0" style={{ color: 'var(--status-red)' }}>{fmt(r.cost)} ₫</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Multi-Service Maintenance Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.65)' }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ border: '1px solid var(--border-default)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 sticky top-0 z-10 glass-panel" style={{ borderBottom: '1px solid var(--border-default)' }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Thêm đợt bảo dưỡng / Thay phụ tùng</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Quản lý đợt bảo dưỡng gồm nhiều dịch vụ & phụ tùng</p>
              </div>
              <button onClick={() => setOpenModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                  <select className="theme-select" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày thực hiện *</label>
                  <input type="date" className="theme-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Odometer lúc BD (km)</label>
                  <input type="number" className="theme-input" placeholder="12846" value={form.odometer_km} onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))} />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Gói / Loại bảo dưỡng chính</label>
                  <select className="theme-select" value={form.maintenance_type} onChange={e => setForm(p => ({ ...p, maintenance_type: e.target.value }))}>
                    {MAINT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Multi-Service Line Items Section */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]" style={{ color: 'var(--accent-cyan)' }}>
                    Chi tiết các hạng mục / Dịch vụ ({serviceItems.length})
                  </span>
                  <button type="button" onClick={addServiceItem} className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white" style={{ background: 'var(--accent-cyan)' }}>
                    + Thêm dịch vụ
                  </button>
                </div>

                <div className="space-y-2">
                  {serviceItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="theme-input flex-1"
                        placeholder="Tên dịch vụ (VD: Thay dầu máy, Lọc gió...)"
                        value={item.name}
                        onChange={e => updateServiceItem(idx, 'name', e.target.value)}
                      />
                      <input
                        type="number"
                        className="theme-input w-28"
                        placeholder="Giá (₫)"
                        value={item.cost}
                        onChange={e => updateServiceItem(idx, 'cost', e.target.value)}
                      />
                      {serviceItems.length > 1 && (
                        <button type="button" onClick={() => removeServiceItem(idx)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t font-bold text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tổng chi phí các hạng mục:</span>
                  <span style={{ color: 'var(--status-red)' }}>{fmt(calculatedItemsCost)} ₫</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Garage / Đại lý</label>
                  <input type="text" className="theme-input" placeholder="VD: Mazda Hà Đông" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Kỳ tiếp theo (km)</label>
                  <input type="number" className="theme-input" placeholder="17846" value={form.next_due_km} onChange={e => setForm(p => ({ ...p, next_due_km: e.target.value }))} />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button onClick={save} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Lưu đợt bảo dưỡng
                </button>
                <button onClick={() => setOpenModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
