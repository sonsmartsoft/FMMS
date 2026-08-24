'use client';

import React, { useEffect, useState } from 'react';
import { getAssets } from '@/lib/services/assetService';
import {
  getInsurancePolicies, createInsurancePolicy, updateInsurancePolicy, deleteInsurancePolicy, POLICY_TYPE_LABELS, InsuranceRow
} from '@/lib/services/insuranceService';
import { getRegistrations } from '@/lib/services/registrationService';
import {
  getDocuments, createDocument, updateDocument, deleteDocument, DocumentRow
} from '@/lib/services/documentService';
import { FileText, CheckCircle2, AlertCircle, Clock, Plus, X, Pencil, Trash2, Shield, Save } from 'lucide-react';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

interface DocItem {
  id: string;
  sourceType: 'INSURANCE' | 'DOCUMENT' | 'REGISTRATION';
  assetId: string;
  name: string;
  issuer: string;
  valid_until?: string;
  cost?: number;
  note?: string;
  policy_number?: string;
  status: 'OK' | 'NEAR' | 'EXPIRED';
}

interface DocGroup {
  asset_id: string;
  docs: DocItem[];
}

const STATUS_CONFIG = {
  OK:        { label: 'Còn hạn', color: 'var(--status-green)', bg: 'rgba(52,211,153,0.12)', Icon: CheckCircle2 },
  NEAR:      { label: 'Sắp hết hạn', color: 'var(--status-amber)', bg: 'rgba(251,191,36,0.12)', Icon: Clock },
  EXPIRED:   { label: 'Hết hạn', color: 'var(--status-red)', bg: 'rgba(248,113,113,0.12)', Icon: AlertCircle },
};

function docStatus(validUntil?: string): 'OK' | 'NEAR' | 'EXPIRED' {
  if (!validUntil) return 'OK';
  const diff = new Date(validUntil).getTime() - Date.now();
  if (diff < 0) return 'EXPIRED';
  if (diff < 60 * 24 * 3600 * 1000) return 'NEAR';
  return 'OK';
}

export default function DocumentsPage() {
  const [groups, setGroups] = useState<DocGroup[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DocItem | null>(null);

  // Form states
  const [docForm, setDocForm] = useState({
    asset_id: '',
    title: '',
    document_type: 'Bảo hiểm vật chất',
    provider: 'MIC Quân Đội',
    policy_number: '',
    expiry_date: '',
    cost: '',
  });

  const [editForm, setEditForm] = useState({
    title: '',
    issuer: '',
    policy_number: '',
    expiry_date: '',
    cost: '',
  });

  const loadData = async () => {
    try {
      const [a, insurance, regs, docs] = await Promise.all([
        getAssets(), getInsurancePolicies(), getRegistrations(), getDocuments(),
      ]);
      setAssets(a);
      if (a.length > 0 && !docForm.asset_id) setDocForm(p => ({ ...p, asset_id: a[0].id }));

      const grouped = a.map(asset => {
        const items: DocItem[] = [];

        // Registrations
        regs.filter(r => r.asset_id === asset.id).forEach(r => {
          items.push({
            id: r.id,
            sourceType: 'REGISTRATION',
            assetId: asset.id,
            name: 'Đăng ký xe (Giấy chủ quyền)',
            issuer: 'Cục CSGT',
            note: r.registration_number ? `Số: ${r.registration_number}` : undefined,
            status: 'OK',
          });
          if (r.inspection_expiry) {
            items.push({
              id: r.id,
              sourceType: 'REGISTRATION',
              assetId: asset.id,
              name: 'Đăng kiểm (Kiểm tra định kỳ)',
              issuer: 'Cục Đăng kiểm VN',
              valid_until: r.inspection_expiry,
              cost: r.cost || undefined,
              status: docStatus(r.inspection_expiry),
            });
          }
        });

        // Insurance Policies
        insurance.filter(i => i.asset_id === asset.id).forEach(i => {
          items.push({
            id: i.id,
            sourceType: 'INSURANCE',
            assetId: asset.id,
            name: POLICY_TYPE_LABELS[i.policy_type] || i.policy_type,
            issuer: i.provider,
            valid_until: i.expiry_date,
            cost: i.cost || undefined,
            policy_number: i.policy_number,
            note: `Số HĐ: ${i.policy_number}`,
            status: docStatus(i.expiry_date),
          });
        });

        // Custom Documents
        (docs as DocumentRow[]).filter(d => d.asset_id === asset.id).forEach(d => {
          items.push({
            id: d.id,
            sourceType: 'DOCUMENT',
            assetId: asset.id,
            name: d.title,
            issuer: d.document_type,
            valid_until: d.expiry_date,
            note: `Đã lưu`,
            status: docStatus(d.expiry_date),
          });
        });

        return { asset_id: asset.id, docs: items };
      }).filter(g => g.docs.length > 0);

      setGroups(grouped);
    } catch {
      setAssets([]); setGroups([]);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveDoc = async () => {
    try {
      const isIns = docForm.document_type.includes('Bảo hiểm');
      if (isIns) {
        await createInsurancePolicy({
          asset_id: docForm.asset_id || assets[0]?.id,
          provider: docForm.provider || 'Bảo hiểm Quân Đội (MIC)',
          policy_number: docForm.policy_number || `BH-${Date.now().toString().slice(-6)}`,
          policy_type: docForm.document_type.includes('TNDS') ? 'MANDATORY' : 'COMPREHENSIVE',
          start_date: new Date().toISOString().split('T')[0],
          expiry_date: docForm.expiry_date || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          cost: parseFloat(docForm.cost) || 1200000,
        });
      } else {
        await createDocument({
          asset_id: docForm.asset_id || assets[0]?.id,
          title: docForm.title || 'Tài liệu mới',
          document_type: docForm.document_type,
          expiry_date: docForm.expiry_date || undefined,
          storage_path: 'documents/file.pdf',
        });
      }
      await loadData();
      setOpenAddModal(false);
      setDocForm({ asset_id: assets[0]?.id || '', title: '', document_type: 'Bảo hiểm vật chất', provider: 'MIC', policy_number: '', expiry_date: '', cost: '' });
    } catch (e: any) {
      alert(`Lỗi khi lưu: ${e?.message ?? 'Không lưu được'}`);
    }
  };

  const handleOpenEdit = (item: DocItem) => {
    setEditingItem(item);
    setEditForm({
      title: item.name,
      issuer: item.issuer,
      policy_number: item.policy_number || '',
      expiry_date: item.valid_until || '',
      cost: item.cost ? String(item.cost) : '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      if (editingItem.sourceType === 'INSURANCE') {
        await updateInsurancePolicy(editingItem.id, {
          provider: editForm.issuer,
          policy_number: editForm.policy_number || undefined,
          expiry_date: editForm.expiry_date || undefined,
          cost: editForm.cost ? parseFloat(editForm.cost) : undefined,
        });
      } else if (editingItem.sourceType === 'DOCUMENT') {
        await updateDocument(editingItem.id, {
          title: editForm.title,
          document_type: editForm.issuer,
          expiry_date: editForm.expiry_date || undefined,
        });
      }
      setEditingItem(null);
      await loadData();
    } catch (e: any) {
      alert(`Lỗi khi cập nhật: ${e?.message ?? 'Không cập nhật được'}`);
    }
  };

  const handleDeleteItem = async (item: DocItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa "${item.name}"?`)) return;
    try {
      if (item.sourceType === 'INSURANCE') {
        await deleteInsurancePolicy(item.id);
      } else if (item.sourceType === 'DOCUMENT') {
        await deleteDocument(item.id);
      }
      await loadData();
    } catch (e: any) {
      alert(`Lỗi khi xóa: ${e?.message ?? 'Không xóa được'}`);
    }
  };

  const allDocs = groups.flatMap(d => d.docs);
  const expiredCount = allDocs.filter(d => d.status === 'EXPIRED').length;
  const totalDocs = allDocs.length;
  const expiredSpecific = groups
    .flatMap(g => g.docs.filter(d => d.status === 'EXPIRED').map(d => ({ assetId: g.asset_id, name: d.name })))
    .slice(0, 2);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText className="w-6 h-6 text-cyan-400" />
            Giấy Tờ &amp; Bảo Hiểm
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalDocs} tài liệu · <span style={{ color: 'var(--status-green)' }}>{totalDocs - expiredCount} còn hạn</span>
            {expiredCount > 0 && <span style={{ color: 'var(--status-red)' }}> · {expiredCount} hết hạn ⚠</span>}
          </p>
        </div>
        <button onClick={() => setOpenAddModal(true)} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Thêm giấy tờ / bảo hiểm</span>
        </button>
      </div>

      {expiredCount > 0 && (
        <div className="p-4 rounded-2xl flex items-start space-x-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--status-red)' }} />
          <div>
            <p className="font-bold text-xs" style={{ color: 'var(--status-red)' }}>Cảnh báo: Có tài liệu đã hết hạn!</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {expiredSpecific.map(d => {
                const asset = assets.find(a => a.id === d.assetId);
                return `${asset?.name?.split(' ')[0] || 'Xe'}: ${d.name}`;
              }).join(' · ')}. Vui lòng gia hạn ngay.
            </p>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {openAddModal && (
        <div className="fixed inset-0 z-[9999] grid place-items-center pt-16 p-4 sm:p-6 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenAddModal(false)}>
          <div className="rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: 'min(85vh, 600px)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>📑 Thêm Giấy Tờ / Hợp Đồng Bảo Hiểm Mới</span>
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Quản lý thời hạn đăng kiểm, bảo hiểm vật chất và giấy tờ xe</p>
              </div>
              <button onClick={() => setOpenAddModal(false)} className="p-1.5 rounded-xl hover:bg-black/10 transition" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">1. Thông tin tài liệu &amp; Phương tiện</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                    <select className="theme-select font-semibold" value={docForm.asset_id} onChange={e => setDocForm(p => ({ ...p, asset_id: e.target.value }))}>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Loại tài liệu / Giấy tờ *</label>
                    <select className="theme-select font-semibold" value={docForm.document_type} onChange={e => setDocForm(p => ({ ...p, document_type: e.target.value }))}>
                      {['Bảo hiểm vật chất', 'Bảo hiểm TNDS bắt buộc', 'Đăng ký xe', 'Đăng kiểm', 'Hóa đơn / Chứng từ', 'Sổ bảo hành', 'Khác'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Tên tài liệu / Tên Hợp đồng *</label>
                    <input type="text" className="theme-input" placeholder="VD: Bảo hiểm vật chất MIC, Đăng kiểm định kỳ..." value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400">2. Số hợp đồng, Thời hạn &amp; Chi phí</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Đơn vị cấp / Nhà bảo hiểm</label>
                    <input type="text" className="theme-input" placeholder="VD: Bảo hiểm Quân Đội (MIC), PJICO..." value={docForm.provider} onChange={e => setDocForm(p => ({ ...p, provider: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số hợp đồng / Số giấy tờ</label>
                    <input type="text" className="theme-input" placeholder="VD: BH-2026-8899" value={docForm.policy_number} onChange={e => setDocForm(p => ({ ...p, policy_number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày hết hạn *</label>
                    <input type="date" className="theme-input" value={docForm.expiry_date} onChange={e => setDocForm(p => ({ ...p, expiry_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Phí hàng năm / Chi phí (₫)</label>
                    <input type="number" className="theme-input font-mono font-bold text-cyan-400" placeholder="VD: 1500000" value={docForm.cost} onChange={e => setDocForm(p => ({ ...p, cost: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 shrink-0 border-t flex space-x-2" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={saveDoc} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                Lưu tài liệu mới
              </button>
              <button onClick={() => setOpenAddModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-black/5 transition" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[9999] grid place-items-center pt-16 p-4 sm:p-6 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setEditingItem(null)}>
          <div className="rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: 'min(85vh, 560px)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Pencil className="w-4 h-4 text-cyan-400" />
                Chỉnh sửa Giấy tờ / Hợp đồng Bảo hiểm
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1.5 rounded-xl hover:bg-black/10 transition" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Tên giấy tờ / Bảo hiểm</label>
                    <input type="text" className="theme-input" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Nhà phát hành / Đơn vị cấp</label>
                    <input type="text" className="theme-input" value={editForm.issuer} onChange={e => setEditForm(p => ({ ...p, issuer: e.target.value }))} />
                  </div>
                  {editingItem.sourceType === 'INSURANCE' && (
                    <div>
                      <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Số hợp đồng bảo hiểm</label>
                      <input type="text" className="theme-input" value={editForm.policy_number} onChange={e => setEditForm(p => ({ ...p, policy_number: e.target.value }))} />
                    </div>
                  )}
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Ngày hết hạn</label>
                    <input type="date" className="theme-input" value={editForm.expiry_date} onChange={e => setEditForm(p => ({ ...p, expiry_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block mb-1 font-bold uppercase text-[10px]" style={{ color: 'var(--text-muted)' }}>Chi phí hàng năm (₫)</label>
                    <input type="number" className="theme-input font-mono font-bold text-cyan-400" value={editForm.cost} onChange={e => setEditForm(p => ({ ...p, cost: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 shrink-0 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button
                type="button"
                onClick={() => handleDeleteItem(editingItem)}
                className="px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 font-bold flex items-center gap-1.5 transition text-xs"
              >
                <Trash2 className="w-4 h-4" /> Xóa tài liệu
              </button>
              <div className="flex items-center space-x-2">
                <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black/5" style={{ color: 'var(--text-muted)' }}>Hủy</button>
                <button onClick={handleSaveEdit} className="px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  <Save className="w-4 h-4" /> Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc Groups List */}
      {groups.map(({ asset_id, docs }) => {
        const asset = assets.find(a => a.id === asset_id);
        if (!asset) return null;
        return (
          <div key={asset_id} className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
            {/* Asset Header */}
            <div className="flex items-center space-x-3 px-5 py-4" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              <div className="w-10 h-10 rounded-xl overflow-hidden" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                {asset.image_url && <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{asset.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{asset.license_plate || asset.model} · {asset.year}</p>
              </div>
            </div>

            {/* Doc rows */}
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {docs.map((doc, i) => {
                const cfg = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.OK;
                const Icon = cfg.Icon;
                return (
                  <div key={doc.id || i} className="flex items-center justify-between px-5 py-3.5 text-xs group" style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="p-1.5 rounded-lg shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {doc.issuer}{doc.valid_until ? ` · Hết hạn: ${fmtDate(doc.valid_until)}` : ''}
                          {doc.note && ` · ${doc.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 ml-3">
                      {doc.cost && (
                        <span style={{ color: 'var(--text-muted)' }}>{doc.cost.toLocaleString('vi-VN')} ₫/năm</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {doc.sourceType !== 'REGISTRATION' && (
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 transition"
                            title="Sửa giấy tờ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(doc)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition"
                            title="Xóa giấy tờ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
