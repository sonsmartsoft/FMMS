'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Plus, Search, CheckCircle2, Clock, AlertCircle, Shield, FileText, Check, X, Pencil, Trash2 } from 'lucide-react';
import { getAssets } from '@/lib/services/assetService';
import { getWarranties, getWarrantyClaims, createWarranty, createWarrantyClaim, WarrantyRecord, WarrantyClaimRecord } from '@/lib/services/warrantyService';
import { getParts } from '@/lib/services/partService';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export default function WarrantiesPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'warranties' | 'claims'>('warranties');

  // Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'NEAR' | 'EXPIRED'>('ALL');
  const [assetFilter, setAssetFilter] = useState<string>('ALL');

  // Modals
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [wForm, setWForm] = useState({
    asset_id: '', item_name: '', warranty_type: 'Bảo hành Hãng', provider: '', warranty_number: '', start_date: '', expiry_date: '', notes: '',
  });
  const [cForm, setCForm] = useState({
    asset_id: '', description: '', amount_claimed: '', vendor: '', status: 'PENDING' as any,
  });

  const loadData = async () => {
    try {
      const [a, w, c, p] = await Promise.all([
        getAssets(), getWarranties(), getWarrantyClaims(), getParts(),
      ]);
      setAssets(a);
      if (a.length > 0 && !wForm.asset_id) {
        setWForm(prev => ({ ...prev, asset_id: a[0].id }));
        setCForm(prev => ({ ...prev, asset_id: a[0].id }));
      }

      // Combine direct warranties + vehicle warranties + part warranties
      const items: any[] = w.data ? [...w.data] : Array.isArray(w) ? [...w] : [];
      a.forEach(asset => {
        if (asset.brand) {
          items.push({
            id: `vehicle-war-${asset.id}`,
            asset_id: asset.id,
            item_name: `Bảo hành Hãng xe (${asset.brand} ${asset.model || ''})`,
            warranty_type: 'Hãng sản xuất',
            provider: `${asset.brand} Việt Nam`,
            warranty_number: asset.vin || 'MH-2026',
            start_date: asset.purchase_date || '2026-01-01',
            expiry_date: '2029-01-01',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
          });
        }
      });

      if (Array.isArray(p)) {
        (p as any[]).forEach((part: any) => {
          if (part.warranty_months || part.cost) {
            const startDate = part.install_date || '2026-01-01';
            const exp = new Date(startDate);
            exp.setMonth(exp.getMonth() + (part.warranty_months || 12));
            items.push({
              id: `part-war-${part.id}`,
              asset_id: part.asset_id || part.vehicle_id || assets[0]?.id,
              item_name: `Bảo hành Phụ tùng: ${part.name || part.part_name || 'Phụ tùng mới'}`,
              warranty_type: 'Phụ tùng / Nâng cấp',
              provider: part.brand || part.supplier || 'Đại lý chính hãng',
              warranty_number: `PT-${(part.id || '1').substring(0, 6)}`,
              start_date: startDate,
              expiry_date: exp.toISOString().split('T')[0],
              status: 'ACTIVE',
              created_at: new Date().toISOString(),
            });
          }
        });
      }

      setWarranties(items);
      setClaims(c.data ? c.data : Array.isArray(c) ? c : []);
    } catch {
      setAssets([]); setWarranties([]); setClaims([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getDaysLeft = (expiry?: string) => {
    if (!expiry) return 999;
    return Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 3600 * 24));
  };

  const getWarrantyStatus = (expiry?: string) => {
    const days = getDaysLeft(expiry);
    if (days < 0) return 'EXPIRED';
    if (days <= 60) return 'NEAR';
    return 'ACTIVE';
  };

  const filteredWarranties = warranties.filter(w => {
    const asset = assets.find(a => a.id === w.asset_id);
    const matchSearch = w.item_name.toLowerCase().includes(search.toLowerCase()) || w.provider.toLowerCase().includes(search.toLowerCase()) || asset?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || getWarrantyStatus(w.expiry_date) === statusFilter;
    const matchAsset = assetFilter === 'ALL' || w.asset_id === assetFilter;
    return matchSearch && matchStatus && matchAsset;
  });

  const saveWarranty = async () => {
    try {
      await createWarranty({
        asset_id: wForm.asset_id || assets[0]?.id,
        item_name: wForm.item_name || 'Bảo hành mới',
        item_type: 'VEHICLE',
        provider: wForm.provider || 'Đại lý',
        policy_number: wForm.warranty_number || undefined,
        start_date: wForm.start_date || new Date().toISOString().split('T')[0],
        expiry_date: wForm.expiry_date || undefined,
        coverage_details: wForm.notes || undefined,
        status: 'ACTIVE',
      });
      await loadData();
      setOpenModal(null);
      setWForm({ asset_id: assets[0]?.id || '', item_name: '', warranty_type: 'Bảo hành Hãng', provider: '', warranty_number: '', start_date: '', expiry_date: '', notes: '' });
      alert('Đã thêm bảo hành mới thành công!');
    } catch (e: any) {
      alert(`Lỗi khi lưu: ${e?.message ?? 'Không lưu được'}`);
    }
  };

  const saveClaim = async () => {
    try {
      await createWarrantyClaim({
        asset_id: cForm.asset_id || assets[0]?.id,
        claim_date: new Date().toISOString().split('T')[0],
        description: cForm.description || 'Yêu cầu bồi thường bảo hành',
        amount_claimed: parseFloat(cForm.amount_claimed) || 0,
        amount_approved: 0,
        status: cForm.status || 'PENDING',
        vendor: cForm.vendor || undefined,
      });
      await loadData();
      setOpenModal(null);
      setCForm({ asset_id: assets[0]?.id || '', description: '', amount_claimed: '', vendor: '', status: 'PENDING' });
      alert('Đã thêm yêu cầu Claim thành công!');
    } catch (e: any) {
      alert(`Lỗi khi lưu: ${e?.message ?? 'Không lưu được'}`);
    }
  };

  const activeCount = warranties.filter(w => getWarrantyStatus(w.expiry_date) === 'ACTIVE').length;
  const nearCount = warranties.filter(w => getWarrantyStatus(w.expiry_date) === 'NEAR').length;
  const expiredCount = warranties.filter(w => getWarrantyStatus(w.expiry_date) === 'EXPIRED').length;
  const totalClaimAmount = claims.reduce((s, c) => s + c.amount_claimed, 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center space-x-2.5" style={{ color: 'var(--text-primary)' }}>
            <Award className="w-6 h-6 text-amber-400" />
            <span>Sổ Bảo Hành &amp; Claim Toàn Bộ Phương Tiện (§219)</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Theo dõi thời hạn bảo hành xe, phụ tùng, linh kiện nâng cấp và quản lý các yêu cầu Claim bồi thường
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setOpenModal('claim')}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
          >
            <Plus className="w-4 h-4" /><span>Tạo Yêu Cầu Claim</span>
          </button>
          <button
            onClick={() => setOpenModal('warranty')}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
          >
            <Plus className="w-4 h-4" /><span>Thêm Sổ Bảo Hành</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="glass-card p-4 rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Bảo Hành Đang Áp Dụng</p>
          <p className="text-2xl font-extrabold mt-1" style={{ color: 'var(--status-green)' }}>{activeCount}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>Trong tổng số {warranties.length} hạng mục</p>
        </div>
        <div className="glass-card p-4 rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Sắp Hết Hạn (&lt; 60 Ngày)</p>
          <p className="text-2xl font-extrabold mt-1" style={{ color: 'var(--status-amber)' }}>{nearCount}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>Cần theo dõi để kiểm tra</p>
        </div>
        <div className="glass-card p-4 rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Đã Hết Hạn</p>
          <p className="text-2xl font-extrabold mt-1" style={{ color: 'var(--status-red)' }}>{expiredCount}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>Quá hạn bảo hành hãng/đại lý</p>
        </div>
        <div className="glass-card p-4 rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
          <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tổng Giá Trị Claim Yêu Cầu</p>
          <p className="text-2xl font-extrabold mt-1 text-purple-400">{fmt(totalClaimAmount)} ₫</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{claims.length} lượt yêu cầu bồi thường</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <button
          onClick={() => setActiveTab('warranties')}
          className={`pb-3 px-4 font-bold text-xs transition border-b-2 ${activeTab === 'warranties' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Danh Sách Sổ Bảo Hành ({warranties.length})
        </button>
        <button
          onClick={() => setActiveTab('claims')}
          className={`pb-3 px-4 font-bold text-xs transition border-b-2 ${activeTab === 'claims' ? 'border-purple-400 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Nhật Ký Yêu Cầu Claim ({claims.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3 text-xs" style={{ border: '1px solid var(--border-default)' }}>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="theme-input pl-9"
            placeholder="Tìm kiếm theo hạng mục, nhà cung cấp, xe..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-3">
          <select className="theme-select" value={assetFilter} onChange={e => setAssetFilter(e.target.value)}>
            <option value="ALL">Tất cả phương tiện</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>

          <div className="flex items-center space-x-1">
            {(['ALL', 'ACTIVE', 'NEAR', 'EXPIRED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${statusFilter === s ? 'bg-cyan-500 text-white' : 'hover:bg-slate-500/10'}`}
                style={{
                  color: statusFilter === s ? '#ffffff' : 'var(--text-secondary)',
                  border: statusFilter === s ? 'none' : '1px solid var(--border-default)',
                }}
              >
                {s === 'ALL' ? 'Tất cả' : s === 'ACTIVE' ? 'Còn hạn' : s === 'NEAR' ? 'Sắp hết' : 'Hết hạn'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: WARRANTIES */}
      {activeTab === 'warranties' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarranties.map((w: any) => {
            const asset = assets.find(a => a.id === w.asset_id);
            const status = getWarrantyStatus(w.expiry_date);
            const days = getDaysLeft(w.expiry_date);

            return (
              <div key={w.id} className="glass-card p-5 rounded-2xl space-y-3 flex flex-col justify-between" style={{ border: '1px solid var(--border-default)' }}>
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-cyan)' }}>
                        {asset?.name || 'Phương tiện'}
                      </span>
                      <h4 className="font-extrabold text-sm mt-1" style={{ color: 'var(--text-primary)' }}>{w.item_name}</h4>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                      status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : status === 'NEAR' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {status === 'ACTIVE' ? `Còn ${days} ngày` : status === 'NEAR' ? `Sắp hết (${days}d)` : 'Đã hết hạn'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex justify-between">
                      <span>Loại bảo hành:</span>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{w.warranty_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nhà cung cấp / Đại lý:</span>
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{w.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Số hợp đồng / Thẻ:</span>
                      <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>{w.warranty_number || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ngày bắt đầu:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{fmtDate(w.start_date || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ngày hết hạn:</span>
                      <span className="font-bold" style={{ color: status === 'EXPIRED' ? 'var(--status-red)' : 'var(--text-primary)' }}>{fmtDate(w.expiry_date || '')}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end space-x-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <Link href={`/assets/${w.asset_id}?tab=warranty`} className="text-xs font-bold text-cyan-400 hover:underline">
                    Xem chi tiết xe →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: CLAIMS */}
      {activeTab === 'claims' && (
        <div className="glass-panel rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid var(--border-default)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
                  <th className="px-4 py-3 font-semibold uppercase">Ngày gửi Claim</th>
                  <th className="px-4 py-3 font-semibold uppercase">Phương tiện</th>
                  <th className="px-4 py-3 font-semibold uppercase">Mô tả sự cố / Hạng mục</th>
                  <th className="px-4 py-3 font-semibold uppercase">Số tiền yêu cầu</th>
                  <th className="px-4 py-3 font-semibold uppercase">Đơn vị xử lý</th>
                  <th className="px-4 py-3 font-semibold uppercase">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {claims.map(c => {
                  const asset = assets.find(a => a.id === c.asset_id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-500/5 transition">
                      <td className="px-4 py-3 font-medium">{fmtDate(c.claim_date)}</td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--accent-cyan)' }}>{asset?.name || 'Phương tiện'}</td>
                      <td className="px-4 py-3">{c.description}</td>
                      <td className="px-4 py-3 font-bold text-purple-400">{fmt(c.amount_claimed)} ₫</td>
                      <td className="px-4 py-3">{c.vendor || 'Đại lý'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          c.status === 'APPROVED' || c.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-400' : c.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {c.status === 'PENDING' ? 'Đang chờ xử lý' : c.status === 'APPROVED' ? 'Đã duyệt' : c.status === 'RESOLVED' ? 'Hoàn tất bồi thường' : 'Từ chối'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MODALS WITH Z-[9999] NO CLIPPING
          ═══════════════════════════════════════════ */}

      {/* Add Warranty Modal */}
      {openModal === 'warranty' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(null)}>
          <div className="glass-panel rounded-2xl w-full max-w-md my-auto max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Thêm sổ bảo hành phương tiện mới</h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                <select className="theme-select" value={wForm.asset_id} onChange={e => setWForm(p => ({ ...p, asset_id: e.target.value }))}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tên hạng mục bảo hành *</label>
                <input type="text" className="theme-input" placeholder="VD: Bảo hành động cơ, Thân vỏ, Màn hình Zestech..." value={wForm.item_name} onChange={e => setWForm(p => ({ ...p, item_name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Loại bảo hành</label>
                <select className="theme-select" value={wForm.warranty_type} onChange={e => setWForm(p => ({ ...p, warranty_type: e.target.value }))}>
                  {['Bảo hành Hãng sản xuất', 'Bảo hành Phụ tùng', 'Bảo hành Nâng cấp / Đồ chơi', 'Bảo hành Lắp đặt', 'Khác'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Đơn vị / Đại lý bảo hành *</label>
                <input type="text" className="theme-input" placeholder="VD: Mazda Việt Nam, Zestech Hà Đông..." value={wForm.provider} onChange={e => setWForm(p => ({ ...p, provider: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số thẻ / Số hợp đồng bảo hành</label>
                <input type="text" className="theme-input" placeholder="VD: WAR-2026-987" value={wForm.warranty_number} onChange={e => setWForm(p => ({ ...p, warranty_number: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày bắt đầu</label>
                  <input type="date" className="theme-input" value={wForm.start_date} onChange={e => setWForm(p => ({ ...p, start_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày hết hạn *</label>
                  <input type="date" className="theme-input" value={wForm.expiry_date} onChange={e => setWForm(p => ({ ...p, expiry_date: e.target.value }))} />
                </div>
              </div>

              <div className="flex space-x-2 pt-3">
                <button onClick={saveWarranty} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Lưu Sổ Bảo Hành
                </button>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Claim Modal */}
      {openModal === 'claim' && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(null)}>
          <div className="glass-panel rounded-2xl w-full max-w-md my-auto max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Tạo yêu cầu bảo hành (Warranty Claim - §216)</h3>
              <button onClick={() => setOpenModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                <select className="theme-select" value={cForm.asset_id} onChange={e => setCForm(p => ({ ...p, asset_id: e.target.value }))}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Mô tả sự cố / Lý do Claim *</label>
                <input type="text" className="theme-input" placeholder="VD: Lỗi cảm biến lốp, Hỏng camera lùi..." value={cForm.description} onChange={e => setCForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số tiền bồi thường yêu cầu (₫) *</label>
                <input type="number" className="theme-input" placeholder="VD: 1500000" value={cForm.amount_claimed} onChange={e => setCForm(p => ({ ...p, amount_claimed: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Đại lý / Đơn vị tiếp nhận bồi thường</label>
                <input type="text" className="theme-input" placeholder="VD: Zestech Hà Đông" value={cForm.vendor} onChange={e => setCForm(p => ({ ...p, vendor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Trạng thái ban đầu</label>
                <select className="theme-select" value={cForm.status} onChange={e => setCForm(p => ({ ...p, status: e.target.value as any }))}>
                  <option value="PENDING">PENDING (Đang chờ xử lý)</option>
                  <option value="APPROVED">APPROVED (Đã duyệt bồi thường)</option>
                  <option value="RESOLVED">RESOLVED (Hoàn tất thay thế/sửa chữa)</option>
                </select>
              </div>

              <div className="flex space-x-2 pt-3">
                <button onClick={saveClaim} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                  Gửi Yêu Cầu Claim
                </button>
                <button onClick={() => setOpenModal(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
