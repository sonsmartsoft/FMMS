'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  RefreshCw, 
  Search, 
  Wrench, 
  Check, 
  Sparkles, 
  Info,
  Activity,
  Gauge,
  Plus
} from 'lucide-react';
import { 
  diagnosticService, 
  VehicleDtcLog, 
  VehicleDiagnosticScan, 
  ObdDtcDictionaryEntry 
} from '@/lib/services/diagnosticService';

interface VehicleDiagnosticsTabProps {
  assetId: string;
  assetName: string;
  currentOdo?: number;
  onNavigateToMaintenance?: (prefillNote?: string) => void;
  onAskAi?: (prompt: string) => void;
}

export default function VehicleDiagnosticsTab({
  assetId,
  assetName,
  currentOdo,
  onNavigateToMaintenance,
  onAskAi,
}: VehicleDiagnosticsTabProps) {
  const [loading, setLoading] = useState(true);
  const [dtcLogs, setDtcLogs] = useState<VehicleDtcLog[]>([]);
  const [scans, setScans] = useState<VehicleDiagnosticScan[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'resolved'>('all');
  
  // Dictionary lookup state
  const [searchCode, setSearchCode] = useState('');
  const [lookupResult, setLookupResult] = useState<ObdDtcDictionaryEntry | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, scansRes] = await Promise.all([
        diagnosticService.getDtcLogs(assetId),
        diagnosticService.getDiagnosticScans(assetId),
      ]);
      setDtcLogs(logsRes.data);
      setScans(scansRes.data);
    } catch (err) {
      console.error('Error loading diagnostic data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assetId) {
      loadData();
    }
  }, [assetId]);

  const activeDtcLogs = useMemo(() => dtcLogs.filter(d => d.is_active), [dtcLogs]);
  const resolvedDtcLogs = useMemo(() => dtcLogs.filter(d => !d.is_active), [dtcLogs]);
  const latestScan = scans.length > 0 ? scans[0] : null;

  const filteredLogs = useMemo(() => {
    if (filterMode === 'active') return activeDtcLogs;
    if (filterMode === 'resolved') return resolvedDtcLogs;
    return dtcLogs;
  }, [filterMode, activeDtcLogs, resolvedDtcLogs, dtcLogs]);

  const handleResolveDtc = async (id: string) => {
    if (!confirm('Xác nhận đánh dấu mã lỗi này đã được sửa chữa hoặc đã xóa khỏi xe?')) return;
    try {
      await diagnosticService.resolveDtc(id);
      setDtcLogs(prev => prev.map(item => item.id === id ? { ...item, is_active: false, status: 'CLEARED', cleared_at: new Date().toISOString() } : item));
    } catch (err: any) {
      alert(`Lỗi: ${err?.message || 'Không thể cập nhật'}`);
    }
  };

  const handleLookup = async (codeToLookup?: string) => {
    const code = codeToLookup || searchCode;
    if (!code.trim()) return;
    setLookupLoading(true);
    try {
      const { data } = await diagnosticService.lookupDtcCode(code);
      setLookupResult(data);
      setShowLookupModal(true);
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setLookupLoading(false);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

  return (
    <div className="space-y-4">
      {/* ── Header Title & Actions ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Chẩn đoán &amp; Mã lỗi OBD
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Theo dõi tình trạng sức khỏe xe, mã lỗi chẩn đoán (DTC) và thông số Freeze Frame từ ECU
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowLookupModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-default)',
            }}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tra cứu mã lỗi</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition hover:opacity-90"
            style={{
              background: 'var(--accent-cyan)',
              color: '#fff',
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── 3 Quick KPI Cards (Chuẩn layout FMMS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Tình trạng mã lỗi (DTC)</p>
          <div className="flex items-center space-x-1.5 mt-1">
            {activeDtcLogs.length > 0 ? (
              <div className="flex items-center space-x-1.5 text-rose-500 font-bold text-base">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>{activeDtcLogs.length} mã lỗi active</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-emerald-500 dark:text-emerald-400 font-bold text-base">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span>0 lỗi (Hoàn hảo)</span>
              </div>
            )}
          </div>
          <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>
            {resolvedDtcLogs.length > 0 ? `Đã xử lý ${resolvedDtcLogs.length} lỗi trong lịch sử` : 'Chưa có lỗi nào phát hiện'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Đèn Check Engine (MIL)</p>
          <div className="flex items-center space-x-1.5 mt-1">
            {latestScan?.mil_status ? (
              <div className="flex items-center space-x-1.5 text-rose-500 font-bold text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span>MIL ON (Đang sáng)</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 text-emerald-500 dark:text-emerald-400 font-bold text-base">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                </div>
                <span>MIL OFF (Bình thường)</span>
              </div>
            )}
          </div>
          <span className="text-[10px] block mt-1" style={{ color: 'var(--text-muted)' }}>
            {latestScan ? `Kiểm tra tự động khi nổ máy` : 'Chờ kết nối OBD'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Phiên quét chẩn đoán gần nhất</p>
          <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {latestScan ? new Date(latestScan.scanned_at).toLocaleDateString('vi-VN') : 'Chưa có'}
          </p>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {latestScan?.odometer_km ? `Tại ODO ${latestScan.odometer_km.toLocaleString()} km` : `Tổng ${scans.length} phiên quét đã lưu`}
          </span>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
          <span className="font-bold text-[10px] uppercase" style={{ color: 'var(--accent-cyan)' }}>Lọc danh sách:</span>
          {[
            { id: 'all', label: `Tất cả (${dtcLogs.length})` },
            { id: 'active', label: `Đang hoạt động (${activeDtcLogs.length})` },
            { id: 'resolved', label: `Đã khắc phục (${resolvedDtcLogs.length})` },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setFilterMode(p.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${filterMode === p.id ? 'bg-cyan-500 text-white' : 'hover:bg-white/10'}`}
              style={filterMode !== p.id ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Standard Data Table (Chuẩn bảng FMMS) ── */}
      <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
              {['Mã lỗi', 'Mô tả chi tiết', 'Phân hệ', 'Mức độ', 'Freeze Frame (ECU)', 'Ngày phát hiện', 'Trạng thái', 'Thao tác'].map(h => (
                <th key={h} className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
                  {activeDtcLogs.length === 0 
                    ? '🎉 Không có mã lỗi nào đang hoạt động trên xe.' 
                    : 'Không tìm thấy mã lỗi phù hợp bộ lọc.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((item, i) => {
                const ff = item.freeze_frame || {};
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-cyan-500/5 transition"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)',
                    }}
                  >
                    {/* Mã lỗi */}
                    <td className="px-3.5 py-2.5 font-mono font-bold" style={{ color: item.is_active ? 'var(--status-rose)' : 'var(--text-primary)' }}>
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {item.dtc_code}
                      </span>
                    </td>

                    {/* Mô tả */}
                    <td className="px-3.5 py-2.5 font-medium max-w-xs" style={{ color: 'var(--text-primary)' }}>
                      <p className="font-semibold">{item.description_vi || item.dtc_code}</p>
                      {item.description_en && (
                        <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {item.description_en}
                        </p>
                      )}
                    </td>

                    {/* Phân hệ */}
                    <td className="px-3.5 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[11px] font-semibold">
                        {item.system_category === 'POWERTRAIN' && '⚙️ Động cơ (P)'}
                        {item.system_category === 'CHASSIS' && '🛞 Khung gầm (C)'}
                        {item.system_category === 'BODY' && '🚗 Thân vỏ (B)'}
                        {item.system_category === 'NETWORK' && '🌐 Mạng CAN (U)'}
                        {!['POWERTRAIN', 'CHASSIS', 'BODY', 'NETWORK'].includes(item.system_category) && item.system_category}
                      </span>
                    </td>

                    {/* Mức độ */}
                    <td className="px-3.5 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-500' :
                        item.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {item.severity === 'CRITICAL' ? 'Nghiêm trọng' : item.severity === 'MEDIUM' ? 'Cần kiểm tra' : 'Nhẹ'}
                      </span>
                    </td>

                    {/* Freeze Frame */}
                    <td className="px-3.5 py-2.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {Object.keys(ff).length > 0 ? (
                        <div className="space-y-0.5">
                          {ff.rpm != null && <div>RPM: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{ff.rpm}</span></div>}
                          {ff.speed_kmh != null && <div>Tốc độ: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{ff.speed_kmh} km/h</span></div>}
                          {ff.coolant_temp_c != null && <div>Nước: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{ff.coolant_temp_c}°C</span></div>}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>

                    {/* Ngày phát hiện */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {fmtDate(item.first_detected_at)}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {item.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          Đã xóa ({item.cleared_at ? fmtDate(item.cleared_at) : ''})
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        {onAskAi && (
                          <button
                            onClick={() => onAskAi(`Xe ${assetName} của tôi báo mã lỗi OBD ${item.dtc_code} (${item.description_vi}). Vui lòng giải thích nguyên nhân và hướng xử lý.`)}
                            title="Hỏi AI Gemini"
                            className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/20 transition"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onNavigateToMaintenance && item.is_active && (
                          <button
                            onClick={() => onNavigateToMaintenance(`Kiểm tra và sửa chữa mã lỗi OBD: ${item.dtc_code} - ${item.description_vi || ''}`)}
                            title="Tạo phiếu sửa chữa"
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 transition"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {item.is_active && (
                          <button
                            onClick={() => handleResolveDtc(item.id)}
                            title="Đánh dấu đã khắc phục / Xóa lỗi"
                            className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Inline Tra cứu Mã Lỗi (Không dùng popup backdrop) ── */}
      {showLookupModal && (
        <div 
          className="p-4 rounded-2xl border space-y-3 transition-all"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wide flex items-center space-x-1.5" style={{ color: 'var(--text-primary)' }}>
              <Search className="w-3.5 h-3.5 text-cyan-500" />
              <span>Tra cứu Từ điển Mã lỗi OBD</span>
            </h4>
            <button 
              onClick={() => setShowLookupModal(false)} 
              className="text-xs px-2 py-0.5 rounded hover:bg-white/10 font-bold"
              style={{ color: 'var(--text-muted)' }}
            >
              ✕ Đóng
            </button>
          </div>

          <div className="flex items-center space-x-2 max-w-md">
            <input
              type="text"
              value={searchCode}
              onChange={e => setSearchCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLookup()}
              placeholder="Nhập mã lỗi (VD: P0300, P0171, C0035...)"
              className="theme-input text-xs flex-1 py-1.5 px-3"
            />
            <button
              onClick={() => handleLookup()}
              disabled={lookupLoading}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-cyan-500 hover:bg-cyan-400 transition shadow"
            >
              {lookupLoading ? 'Đang tra...' : 'Tra cứu'}
            </button>
          </div>

          {lookupResult ? (
            <div className="p-3.5 rounded-xl space-y-2 text-xs" style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-mono font-bold text-sm text-cyan-500">{lookupResult.code}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500">{lookupResult.severity}</span>
              </div>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{lookupResult.title_vi}</p>
              <p style={{ color: 'var(--text-secondary)' }}>{lookupResult.description_vi}</p>
              {lookupResult.symptoms_vi && (
                <p className="text-amber-500"><strong>Triệu chứng:</strong> {lookupResult.symptoms_vi}</p>
              )}
              {lookupResult.possible_causes_vi && lookupResult.possible_causes_vi.length > 0 && (
                <div>
                  <strong style={{ color: 'var(--text-primary)' }}>Nguyên nhân phổ biến:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {lookupResult.possible_causes_vi.map((c, idx) => <li key={idx}>{c}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : searchCode && !lookupLoading ? (
            <div className="p-3 rounded-xl text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              Chưa có dữ liệu từ điển cho mã <strong>{searchCode}</strong>.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
