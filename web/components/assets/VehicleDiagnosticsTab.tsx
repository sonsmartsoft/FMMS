'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  RefreshCw, 
  Search, 
  Wrench, 
  Check, 
  Clock, 
  Gauge, 
  Sparkles, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  Activity
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
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'history' | 'scans' | 'dictionary'>('active');
  
  // Dictionary lookup state
  const [searchCode, setSearchCode] = useState('');
  const [lookupResult, setLookupResult] = useState<ObdDtcDictionaryEntry | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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
      if (codeToLookup) {
        setSearchCode(codeToLookup);
        setActiveSubTab('dictionary');
      }
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setLookupLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">🔴 Nghiêm trọng (Dừng xe / Kiểm tra ngay)</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">🟡 Cần kiểm tra sớm</span>;
      case 'LOW':
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">🟢 Cảnh báo nhẹ / Theo dõi</span>;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'POWERTRAIN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">⚙️ Động cơ & Truyền lực (P)</span>;
      case 'CHASSIS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">🛞 Khung gầm & Phanh (C)</span>;
      case 'BODY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">🚗 Thân vỏ & Tiện nghi (B)</span>;
      case 'NETWORK':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">🌐 Giao tiếp Mạng CAN (U)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">OBD</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 1. Top Health Status Banner ── */}
      <div 
        className="p-5 rounded-2xl border relative overflow-hidden backdrop-blur-sm transition-all shadow-lg"
        style={{
          background: activeDtcLogs.length > 0 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.04) 100%)'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)',
          borderColor: activeDtcLogs.length > 0 ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-md"
              style={{
                background: activeDtcLogs.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: activeDtcLogs.length > 0 ? 'var(--status-rose)' : 'var(--status-green)',
                border: activeDtcLogs.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'
              }}
            >
              {activeDtcLogs.length > 0 ? (
                <ShieldAlert className="w-6 h-6 animate-pulse text-rose-500" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {activeDtcLogs.length > 0 
                    ? `CẢNH BÁO: PHÁT HIỆN ${activeDtcLogs.length} MÃ LỖI ĐANG HOẠT ĐỘNG`
                    : 'TÌNH TRẠNG XE HOÀN HẢO — 0 MÃ LỖI (OBD HEALTHY)'}
                </h3>
                {latestScan?.mil_status && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-black animate-pulse uppercase">
                    MIL Check Engine Sáng
                  </span>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {latestScan ? (
                  <>
                    Quét chẩn đoán gần nhất: <span className="text-white font-medium">{new Date(latestScan.scanned_at).toLocaleString('vi-VN')}</span>
                    {latestScan.odometer_km && ` tại ODO ${latestScan.odometer_km.toLocaleString()} km`} ({latestScan.scan_type === 'AUTO_BACKGROUND' ? 'Quét tự động khi nổ máy' : 'Quét thủ công'})
                  </>
                ) : (
                  'Chưa có dữ liệu phiên quét OBD từ xe.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
              style={{
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-default)',
              }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <button
              onClick={() => setActiveSubTab('dictionary')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'var(--accent-cyan-bg)',
                color: 'var(--accent-cyan)',
                border: '1px solid var(--accent-cyan-border)',
              }}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tra cứu mã lỗi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. Navigation Sub-Tabs ── */}
      <div className="flex items-center space-x-2 border-b pb-3" style={{ borderColor: 'var(--border-default)' }}>
        {[
          { id: 'active', label: `Mã lỗi kích hoạt (${activeDtcLogs.length})`, icon: AlertTriangle, activeColor: 'text-rose-400' },
          { id: 'history', label: `Lịch sử đã khắc phục (${resolvedDtcLogs.length})`, icon: Clock, activeColor: 'text-emerald-400' },
          { id: 'scans', label: `Nhật ký phiên quét (${scans.length})`, icon: Activity, activeColor: 'text-cyan-400' },
          { id: 'dictionary', label: 'Từ điển mã lỗi OBD', icon: Search, activeColor: 'text-purple-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive 
                  ? 'bg-white/10 text-white border border-white/20 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? tab.activeColor : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Tab Content ── */}

      {/* ── SUB-TAB 1: Active Fault Codes ── */}
      {activeSubTab === 'active' && (
        <div className="space-y-4">
          {activeDtcLogs.length === 0 ? (
            <div className="text-center py-14 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">Không phát hiện mã lỗi nào đang hoạt động!</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                Hệ thống động cơ, khung gầm và mạng giao tiếp của xe đang ở trạng thái tối ưu.
              </p>
            </div>
          ) : (
            activeDtcLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div 
                  key={log.id} 
                  className="rounded-2xl border p-5 transition-all shadow-md"
                  style={{
                    background: 'var(--surface-card)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-black font-mono tracking-wider text-rose-400 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30">
                        {log.dtc_code}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{log.description_vi || log.description_en || 'Mã lỗi OBD chưa phân loại'}</h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">{log.description_en}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryBadge(log.system_category)}
                      {getSeverityBadge(log.severity)}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 text-xs">
                    <div className="p-3 rounded-xl bg-white/5 space-y-1.5">
                      <p className="text-[11px] font-semibold text-gray-400">📅 Thông tin phát hiện:</p>
                      <p className="text-white">Lần đầu: <span className="font-medium text-gray-300">{new Date(log.first_detected_at).toLocaleString('vi-VN')}</span></p>
                      <p className="text-white">Gần nhất: <span className="font-medium text-gray-300">{new Date(log.last_detected_at).toLocaleString('vi-VN')}</span></p>
                      <p className="text-white">Trạng thái: <span className="font-bold text-amber-400">{log.status} (Xác nhận từ ECU)</span></p>
                    </div>

                    {log.freeze_frame && Object.keys(log.freeze_frame).length > 0 && (
                      <div className="p-3 rounded-xl bg-white/5 space-y-1.5">
                        <p className="text-[11px] font-semibold text-cyan-400 flex items-center space-x-1">
                          <Gauge className="w-3.5 h-3.5" />
                          <span>Thông số Freeze Frame lúc bị lỗi:</span>
                        </p>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
                          {Object.entries(log.freeze_frame).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-gray-300 border-b border-white/5 pb-0.5">
                              <span className="text-gray-400">{k}:</span>
                              <span className="font-bold text-white">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      onClick={() => handleLookup(log.dtc_code)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center space-x-1 underline"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Xem triệu chứng & nguyên nhân chi tiết</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {onAskAi && (
                        <button
                          onClick={() => onAskAi(`Xe ${assetName} của tôi vừa báo mã lỗi OBD ${log.dtc_code} (${log.description_vi}). Vui lòng giải thích nguyên nhân, mức độ nguy hiểm và hướng xử lý chi tiết.`)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Hỏi AI Gemini</span>
                        </button>
                      )}

                      {onNavigateToMaintenance && (
                        <button
                          onClick={() => onNavigateToMaintenance(`Kiểm tra và sửa chữa mã lỗi OBD: ${log.dtc_code} - ${log.description_vi || ''}`)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>Tạo phiếu sửa chữa</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleResolveDtc(log.id)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Đã khắc phục / Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── SUB-TAB 2: Resolved DTC History ── */}
      {activeSubTab === 'history' && (
        <div className="space-y-3">
          {resolvedDtcLogs.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-white/10 bg-white/5 text-gray-400 text-xs">
              Chưa có mã lỗi nào trong lịch sử đã được đánh dấu khắc phục.
            </div>
          ) : (
            resolvedDtcLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                style={{
                  background: 'var(--surface-card)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-mono font-bold text-gray-300 px-2 py-1 rounded bg-white/5 border border-white/10">
                    {log.dtc_code}
                  </span>
                  <div>
                    <h5 className="font-bold text-white">{log.description_vi || log.dtc_code}</h5>
                    <p className="text-[11px] text-gray-400">
                      Phát hiện: {new Date(log.first_detected_at).toLocaleDateString('vi-VN')} • 
                      Đã khắc phục: <span className="text-emerald-400 font-medium">{log.cleared_at ? new Date(log.cleared_at).toLocaleDateString('vi-VN') : 'Đã xóa'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ✅ Đã xử lý (Resolved)
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── SUB-TAB 3: Scans Timeline ── */}
      {activeSubTab === 'scans' && (
        <div className="space-y-3">
          {scans.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-white/10 bg-white/5 text-gray-400 text-xs">
              Chưa có nhật ký phiên quét OBD nào từ xe.
            </div>
          ) : (
            scans.map((s) => (
              <div 
                key={s.id}
                className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                style={{
                  background: 'var(--surface-card)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${s.dtc_count > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {s.dtc_count}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {s.scan_type === 'AUTO_BACKGROUND' ? 'Quét tự động ngầm khi nổ máy' : 'Quét chẩn đoán thủ công'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(s.scanned_at).toLocaleString('vi-VN')}
                      {s.odometer_km && ` • ODO: ${s.odometer_km.toLocaleString()} km`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {s.mil_status ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      MIL Check Engine ON
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      MIL OFF (Bình thường)
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── SUB-TAB 4: DTC Dictionary Lookup ── */}
      {activeSubTab === 'dictionary' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Nhập mã lỗi OBD (VD: P0300, P0171, C0035...)"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              onClick={() => handleLookup()}
              disabled={lookupLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-md"
            >
              {lookupLoading ? 'Đang tra...' : 'Tra cứu'}
            </button>
          </div>

          {lookupResult ? (
            <div 
              className="p-5 rounded-2xl border space-y-3"
              style={{
                background: 'var(--surface-card)',
                borderColor: 'rgba(168, 85, 247, 0.4)',
              }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-xl font-black font-mono text-purple-400 px-3 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    {lookupResult.code}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">{lookupResult.title_vi}</h4>
                    <p className="text-xs text-gray-400 font-mono">{lookupResult.description_en}</p>
                  </div>
                </div>
                {getSeverityBadge(lookupResult.severity)}
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-semibold text-gray-300">📖 Ý nghĩa chi tiết:</p>
                  <p className="text-gray-400 mt-0.5">{lookupResult.description_vi}</p>
                </div>

                {lookupResult.symptoms_vi && (
                  <div>
                    <p className="font-semibold text-amber-400">⚠️ Triệu chứng nhận biết:</p>
                    <p className="text-gray-300 mt-0.5">{lookupResult.symptoms_vi}</p>
                  </div>
                )}

                {lookupResult.possible_causes_vi && lookupResult.possible_causes_vi.length > 0 && (
                  <div>
                    <p className="font-semibold text-cyan-400">🔍 Nguyên nhân tiềm ẩn phổ biến:</p>
                    <ul className="list-disc list-inside text-gray-300 mt-1 space-y-1">
                      {lookupResult.possible_causes_vi.map((cause, idx) => (
                        <li key={idx}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : searchCode && !lookupLoading ? (
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-xs text-gray-400">
              Không tìm thấy mã lỗi <span className="font-bold text-white">{searchCode}</span> trong từ điển chuẩn. Bạn có thể sử dụng nút "Hỏi AI Gemini" để phân tích chi tiết.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
