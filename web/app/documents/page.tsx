'use client';

import React, { useEffect, useState } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getInsurancePolicies, POLICY_TYPE_LABELS } from '@/lib/services/insuranceService';
import { getRegistrations } from '@/lib/services/registrationService';
import { getDocuments, createDocument, DocumentRow } from '@/lib/services/documentService';
import { FileText, CheckCircle2, AlertCircle, Clock, Plus, X } from 'lucide-react';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

interface DocItem { name: string; issuer: string; valid_until?: string; cost?: number; note?: string; status: 'OK' | 'NEAR' | 'EXPIRED' }
interface DocGroup { asset_id: string; docs: DocItem[] }

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
  const [openModal, setOpenModal] = useState(false);
  const [docForm, setDocForm] = useState({
    asset_id: '', title: '', document_type: 'Đăng ký xe', expiry_date: '', storage_path: '',
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
        regs.filter(r => r.asset_id === asset.id).forEach(r => {
          items.push({ name: 'Đăng ký xe (Giấy chủ quyền)', issuer: 'Cục CSGT', note: r.registration_number ? `Số: ${r.registration_number}` : undefined, status: 'OK' });
          if (r.inspection_expiry) items.push({ name: 'Đăng kiểm (Kiểm tra định kỳ)', issuer: 'Cục Đăng kiểm VN', valid_until: r.inspection_expiry, cost: r.cost || undefined, status: docStatus(r.inspection_expiry) });
          if (r.road_fee_expiry) items.push({ name: 'Vignette / Phí đường bộ', issuer: 'Quỹ bảo trì đường bộ', valid_until: r.road_fee_expiry, status: docStatus(r.road_fee_expiry) });
        });
        insurance.filter(i => i.asset_id === asset.id).forEach(i => {
          items.push({
            name: POLICY_TYPE_LABELS[i.policy_type] || i.policy_type,
            issuer: i.provider,
            valid_until: i.expiry_date,
            cost: i.cost || undefined,
            note: `Số HĐ: ${i.policy_number}`,
            status: docStatus(i.expiry_date),
          });
        });
        (docs as DocumentRow[]).filter(d => d.asset_id === asset.id).forEach(d => {
          items.push({ name: d.title, issuer: d.document_type, valid_until: d.expiry_date, note: `Đã lưu`, status: docStatus(d.expiry_date) });
        });
        return { asset_id: asset.id, docs: items };
      }).filter(g => g.docs.length > 0);
      setGroups(grouped);
    } catch {
      setAssets([]); setGroups([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveDoc = async () => {
    try {
      await createDocument({
        asset_id: docForm.asset_id || assets[0]?.id,
        title: docForm.title || 'Tài liệu mới',
        document_type: docForm.document_type,
        expiry_date: docForm.expiry_date || undefined,
        storage_path: docForm.storage_path || 'documents/file.pdf',
      });
      await loadData();
      setOpenModal(false);
      setDocForm({ asset_id: assets[0]?.id || '', title: '', document_type: 'Đăng ký xe', expiry_date: '', storage_path: '' });
    } catch (e: any) {
      alert(`Lỗi khi lưu tài liệu: ${e?.message ?? 'Không lưu được'}`);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Giấy Tờ &amp; Bảo Hiểm</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {totalDocs} tài liệu · <span style={{ color: 'var(--status-green)' }}>{totalDocs - expiredCount} còn hạn</span>
            {expiredCount > 0 && <span style={{ color: 'var(--status-red)' }}> · {expiredCount} hết hạn ⚠</span>}
          </p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Plus className="w-4 h-4" /><span>Thêm tài liệu mới</span>
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
      {openModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(false)}>
          <div className="glass-panel rounded-2xl w-full max-w-md my-auto max-h-[85vh] overflow-y-auto shadow-2xl" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Thêm giấy tờ / bảo hiểm phương tiện</h3>
              <button onClick={() => setOpenModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                <select className="theme-select" value={docForm.asset_id} onChange={e => setDocForm(p => ({ ...p, asset_id: e.target.value }))}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tên tài liệu / Bảo hiểm *</label>
                <input type="text" className="theme-input" placeholder="VD: Bảo hiểm vật chất MIC, Hóa đơn mua xe..." value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Loại tài liệu</label>
                <select className="theme-select" value={docForm.document_type} onChange={e => setDocForm(p => ({ ...p, document_type: e.target.value }))}>
                  {['Bảo hiểm vật chất', 'Bảo hiểm TNDS bắt buộc', 'Đăng ký xe', 'Đăng kiểm', 'Hóa đơn / Chứng từ', 'Sổ bảo hành', 'Khác'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày hết hạn (tuỳ chọn)</label>
                <input type="date" className="theme-input" value={docForm.expiry_date} onChange={e => setDocForm(p => ({ ...p, expiry_date: e.target.value }))} />
              </div>
              <div className="flex space-x-2 pt-2">
                <button onClick={saveDoc} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
                  Lưu tài liệu
                </button>
                <button onClick={() => setOpenModal(false)} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <div key={i} className="flex items-center justify-between px-5 py-3.5 text-xs" style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="p-1.5 rounded-lg" style={{ background: cfg.bg, color: cfg.color }}>
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
                    <div className="flex items-center space-x-3 shrink-0 ml-3">
                      {doc.cost && (
                        <span style={{ color: 'var(--text-muted)' }}>{doc.cost.toLocaleString('vi-VN')} ₫/năm</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
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
