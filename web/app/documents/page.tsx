'use client';

import React from 'react';
import { INITIAL_ASSETS } from '@/lib/data/mockData';
import { FileText, Shield, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

// Mock documents data
const DOCUMENTS = [
  {
    asset_id: '22222222-2222-2222-2222-222222222222',
    docs: [
      { name: 'Đăng ký xe (Giấy chủ quyền)', issuer: 'Cục CSGT', valid_until: '2046-01-10', status: 'OK', note: 'Vĩnh viễn theo chủ' },
      { name: 'Bảo hiểm TNDS bắt buộc', issuer: 'PTI', valid_until: '2027-01-10', status: 'OK', cost: 486000 },
      { name: 'Bảo hiểm vật chất (Bảo Việt)', issuer: 'Bảo Việt Insurance', valid_until: '2027-01-10', status: 'OK', cost: 6500000 },
      { name: 'Đăng kiểm (Kiểm tra định kỳ)', issuer: 'Cục Đăng kiểm VN', valid_until: '2028-01-10', status: 'OK', note: 'Xe mới — 2 năm' },
      { name: 'Vignette / Phí đường bộ', issuer: 'Quỹ bảo trì đường bộ', valid_until: '2027-01-10', status: 'OK', cost: 1560000 },
    ],
  },
  {
    asset_id: '44444444-4444-4444-4444-444444444444',
    docs: [
      { name: 'Đăng ký xe điện', issuer: 'Phòng CSGT', valid_until: '2046-03-20', status: 'OK' },
      { name: 'Bảo hiểm TNDS xe máy điện', issuer: 'Bảo Việt', valid_until: '2027-03-20', status: 'OK', cost: 146000 },
    ],
  },
  {
    asset_id: '55555555-5555-5555-5555-555555555555',
    docs: [
      { name: 'Đăng ký mô tô phân khối lớn', issuer: 'Phòng CSGT', valid_until: '2046-11-05', status: 'OK' },
      { name: 'Bảo hiểm TNDS mô tô', issuer: 'PVI', valid_until: '2025-11-05', status: 'EXPIRED', cost: 486000 },
      { name: 'Bảo hiểm vật chất (BMW)', issuer: 'AXA Insurance', valid_until: '2025-11-05', status: 'EXPIRED', cost: 9800000 },
    ],
  },
];

const STATUS_CONFIG = {
  OK:        { label: 'Còn hạn', color: 'var(--status-green)', bg: 'rgba(52,211,153,0.12)', Icon: CheckCircle2 },
  NEAR:      { label: 'Sắp hết hạn', color: 'var(--status-amber)', bg: 'rgba(251,191,36,0.12)', Icon: Clock },
  EXPIRED:   { label: 'Hết hạn', color: 'var(--status-red)', bg: 'rgba(248,113,113,0.12)', Icon: AlertCircle },
};

export default function DocumentsPage() {
  const expiredCount = DOCUMENTS.flatMap(d => d.docs).filter(d => d.status === 'EXPIRED').length;
  const totalDocs = DOCUMENTS.flatMap(d => d.docs).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Giấy Tờ & Bảo Hiểm</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {totalDocs} tài liệu · <span style={{ color: 'var(--status-green)' }}>{totalDocs - expiredCount} còn hạn</span>
          {expiredCount > 0 && <span style={{ color: 'var(--status-red)' }}> · {expiredCount} hết hạn ⚠</span>}
        </p>
      </div>

      {expiredCount > 0 && (
        <div className="p-4 rounded-2xl flex items-start space-x-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)' }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--status-red)' }} />
          <div>
            <p className="font-bold text-xs" style={{ color: 'var(--status-red)' }}>Cảnh báo: Có tài liệu đã hết hạn!</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              BMW S1000RR: Bảo hiểm TNDS + Bảo hiểm vật chất đã hết hạn. Vui lòng gia hạn ngay.
            </p>
          </div>
        </div>
      )}

      {DOCUMENTS.map(({ asset_id, docs }) => {
        const asset = INITIAL_ASSETS.find(a => a.id === asset_id);
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
                          {doc.issuer} · Hết hạn: {fmtDate(doc.valid_until)}
                          {(doc as any).note && ` · ${(doc as any).note}`}
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
