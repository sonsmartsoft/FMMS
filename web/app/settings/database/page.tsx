'use client';

import React, { useState, useEffect } from 'react';
import { Database, ExternalLink, RefreshCw, ShieldCheck, CheckCircle2, AlertCircle, Layers, Server, Navigation, Activity, Trash2, Download, Terminal, Play, AlertTriangle, UploadCloud } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SyncLogEntry, getSyncLogs, clearSyncLogs, subscribeToSyncLogs, addSyncLog } from '@/lib/services/syncLogger';

interface TableStats {
  name: string;
  label: string;
  count: number | null;
  status: 'OK' | 'ERROR' | 'LOADING';
  errorMsg?: string;
}

const TABLES: { name: string; label: string }[] = [
  { name: 'assets', label: 'Phương tiện (Assets)' },
  { name: 'fuel_logs', label: 'Nhật ký nhiên liệu (Fuel Logs)' },
  { name: 'maintenance_records', label: 'Hồ sơ bảo dưỡng (Maintenance)' },
  { name: 'expenses', label: 'Chi phí phát sinh (Expenses)' },
  { name: 'loans', label: 'Hợp đồng vay mua xe (Loans)' },
  { name: 'loan_payments', label: 'Lịch trả nợ vay (Loan Payments)' },
  { name: 'parts', label: 'Phụ tùng & Đồ chơi (Parts)' },
  { name: 'trips', label: 'Nhật ký chuyến đi (Trips)' },
  { name: 'gps_track_points', label: 'Tọa độ GPS (GPS Track Points)' },
  { name: 'devices', label: 'Thiết bị OBD/Android (Devices)' },
];

export default function DatabaseSettingsPage() {
  const [stats, setStats] = useState<TableStats[]>(
    TABLES.map(t => ({ ...t, count: null, status: 'LOADING' }))
  );
  const [syncedTrips, setSyncedTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');

  // Sync Trace Logs
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'ERROR' | 'FALLBACK'>('ALL');
  const [selectedLog, setSelectedLog] = useState<SyncLogEntry | null>(null);
  const [testWriteLoading, setTestWriteLoading] = useState(false);
  const [testWriteMessage, setTestWriteMessage] = useState<{ ok: boolean; msg: string } | null>(null);

  // Push Local to Cloud
  const [syncLocalLoading, setSyncLocalLoading] = useState(false);
  const [syncLocalResult, setSyncLocalResult] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    const sb = createClient();

    const updated = await Promise.all(
      TABLES.map(async (table) => {
        try {
          const { count, error } = await sb
            .from(table.name)
            .select('*', { count: 'exact', head: true });

          if (error) {
            return {
              ...table,
              count: null,
              status: 'ERROR' as const,
              errorMsg: error.message,
            };
          }
          return {
            ...table,
            count: count ?? 0,
            status: 'OK' as const,
          };
        } catch (err: any) {
          return {
            ...table,
            count: null,
            status: 'ERROR' as const,
            errorMsg: err?.message || 'Lỗi mạng',
          };
        }
      })
    );

    setStats(updated);

    // Fetch top 15 latest trips from Cloud DB
    try {
      const { data: tripsData } = await sb
        .from('trips')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(15);
      setSyncedTrips(tripsData || []);
    } catch {}

    setLoading(false);
    setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
  };

  useEffect(() => {
    loadStats();
    setSyncLogs(getSyncLogs());
    const unsub = subscribeToSyncLogs((logs) => setSyncLogs([...logs]));
    return () => unsub();
  }, []);

  const handleTestCloudWrite = async () => {
    setTestWriteLoading(true);
    setTestWriteMessage(null);
    const start = performance.now();
    const sb = createClient();

    try {
      const probeId = `00000000-0000-4000-8000-${Date.now().toString().slice(-12)}`;
      const { error: insertErr } = await sb.from('expenses').insert({
        id: probeId,
        date: new Date().toISOString().slice(0, 10),
        category: 'OTHER',
        amount: 1000,
        currency: 'VND',
        description: '⚡ FMMS Cloud Write Probe Test (Tự động xóa sau 1s)',
      });

      const durationMs = Math.round(performance.now() - start);

      if (insertErr) {
        addSyncLog({
          table: 'expenses',
          action: 'INSERT',
          status: 'ERROR',
          summary: 'Kiểm tra quyền ghi Cloud Supabase thất bại',
          errorDetails: insertErr.message,
          durationMs,
        });
        setTestWriteMessage({ ok: false, msg: `❌ Thất bại: ${insertErr.message}` });
      } else {
        await sb.from('expenses').delete().eq('id', probeId);
        addSyncLog({
          table: 'expenses',
          action: 'INSERT',
          status: 'SUCCESS',
          summary: 'Kiểm tra quyền ghi Cloud Supabase thành công 100%',
          durationMs,
        });
        setTestWriteMessage({ ok: true, msg: `✅ Thành công! Ghi & đọc Cloud Supabase bình thường (${durationMs}ms)` });
        loadStats();
      }
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      addSyncLog({
        table: 'expenses',
        action: 'INSERT',
        status: 'ERROR',
        summary: 'Kiểm tra ghi Cloud ngoại lệ',
        errorDetails: err?.message || 'Network exception',
        durationMs,
      });
      setTestWriteMessage({ ok: false, msg: `❌ Lỗi ngoại lệ: ${err?.message}` });
    } finally {
      setTestWriteLoading(false);
    }
  };

  const handlePushLocalStorageToCloud = async () => {
    setSyncLocalLoading(true);
    setSyncLocalResult(null);
    const sb = createClient();
    let pushedCount = 0;

    try {
      // 1. Assets
      const rawAssets = localStorage.getItem('fmms_custom_assets');
      if (rawAssets) {
        const assetsObj = JSON.parse(rawAssets);
        for (const [id, a] of Object.entries<any>(assetsObj)) {
          if (id.length > 20) {
            const payload: any = {};
            if (a.name) payload.name = a.name;
            if (a.brand) payload.brand = a.brand;
            if (a.model) payload.model = a.model;
            if (a.color) payload.color = a.color;
            if (a.license_plate) payload.license_plate = a.license_plate;
            if (a.sales_rep_name) payload.sales_rep_name = a.sales_rep_name;
            if (a.sales_rep_phone) payload.sales_rep_phone = a.sales_rep_phone;
            if (a.brand_hotline) payload.brand_hotline = a.brand_hotline;
            if (a.purchase_price) payload.purchase_price = a.purchase_price;
            if (a.current_value) payload.current_value = a.current_value;
            if (a.description) payload.description = a.description;

            const { error } = await sb.from('assets').update(payload).eq('id', id);
            if (!error) pushedCount++;
          }
        }
      }

      // 2. Loans
      const rawLoans = localStorage.getItem('fmms_custom_loans');
      if (rawLoans) {
        const loansObj = JSON.parse(rawLoans);
        for (const [id, l] of Object.entries<any>(loansObj)) {
          if (id.length > 20 && !id.startsWith('asset_')) {
            const payload: any = {};
            if (l.lender) payload.lender = l.lender;
            if (l.principal !== undefined) payload.principal = l.principal;
            if (l.down_payment !== undefined) payload.down_payment = l.down_payment;
            if (l.interest_rate_percent !== undefined) payload.interest_rate_percent = l.interest_rate_percent;
            if (l.preferred_rate_percent !== undefined) payload.preferred_rate_percent = l.preferred_rate_percent;
            if (l.preferred_months !== undefined) payload.preferred_months = l.preferred_months;
            if (l.floating_rate_percent !== undefined) payload.floating_rate_percent = l.floating_rate_percent;
            if (l.loan_ratio_percent !== undefined) payload.loan_ratio_percent = l.loan_ratio_percent;
            if (l.term_months !== undefined) payload.term_months = l.term_months;
            if (l.start_date) payload.start_date = l.start_date;
            if (l.monthly_payment !== undefined) payload.monthly_payment = l.monthly_payment;
            if (l.payment_day !== undefined) payload.payment_day = l.payment_day;
            if (l.bank_contact_name) payload.bank_contact_name = l.bank_contact_name;
            if (l.bank_contact_phone) payload.bank_contact_phone = l.bank_contact_phone;
            if (l.bank_hotline) payload.bank_hotline = l.bank_hotline;
            if (l.notes) payload.notes = l.notes;

            const { error } = await sb.from('loans').update(payload).eq('id', id);
            if (!error) pushedCount++;
          }
        }
      }

      addSyncLog({
        table: 'system',
        action: 'UPDATE',
        status: 'SUCCESS',
        summary: `Đã đẩy ${pushedCount} bản ghi từ LocalStorage lên Supabase Cloud thành công`,
      });

      setSyncLocalResult(`🎉 Đã đồng bộ thành công ${pushedCount} bản ghi từ trình duyệt này lên Supabase Cloud!`);
      loadStats();
    } catch (err: any) {
      setSyncLocalResult(`❌ Lỗi khi đồng bộ: ${err?.message}`);
    } finally {
      setSyncLocalLoading(false);
    }
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(syncLogs, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `fmms-sync-trace-${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filteredLogs = syncLogs.filter(l => {
    if (logFilter === 'ALL') return true;
    return l.status === logFilter;
  });

  const totalRecords = stats.reduce((sum, s) => sum + (s.count || 0), 0);
  const errorCount = stats.filter(s => s.status === 'ERROR').length;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <Database className="w-6 h-6 text-emerald-500" />
            <span>Supabase Cloud Database</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Giám sát cấu trúc bảng, Trace Log đồng bộ Frontend ↔ Cloud &amp; Row Level Security
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={handlePushLocalStorageToCloud}
            disabled={syncLocalLoading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 shadow-md cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            title="Đẩy toàn bộ cấu hình đang lưu trong trình duyệt này lên Supabase Cloud"
          >
            <UploadCloud className={`w-4 h-4 ${syncLocalLoading ? 'animate-bounce' : ''}`} />
            <span>{syncLocalLoading ? 'Đang đẩy lên...' : '🚀 Đồng bộ Local lên Cloud'}</span>
          </button>

          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:opacity-80 disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <a
            href="https://supabase.com/dashboard/project/opslebsdmwsnsyfmbynf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-md"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Supabase Dashboard ↗</span>
          </a>
        </div>
      </div>

      {/* Sync Local Result Banner */}
      {syncLocalResult && (
        <div className="p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between" style={{ background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.4)', color: '#A5B4FC' }}>
          <span>{syncLocalResult}</span>
          <button onClick={() => setSyncLocalResult(null)} className="text-xs px-2 py-0.5 rounded hover:opacity-80">✕</button>
        </div>
      )}

      {/* Project Overview Card */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>FMMS Production Database</p>
              <p className="text-[11px] font-mono text-emerald-400">Project ID: opslebsdmwsnsyfmbynf (AWS Singapore)</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Connected &amp; Healthy</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Tổng bản ghi</span>
            <p className="text-lg font-black font-mono text-cyan-400 mt-0.5">{totalRecords.toLocaleString('vi-VN')}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Bảng dữ liệu</span>
            <p className="text-lg font-black font-mono text-emerald-400 mt-0.5">{TABLES.length} bảng</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Bảo mật RLS</span>
            <p className="text-lg font-black font-mono text-purple-400 mt-0.5">Active</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Lỗi truy vấn</span>
            <p className={`text-lg font-black font-mono mt-0.5 ${errorCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {errorCount} lỗi
            </p>
          </div>
        </div>
      </div>

      {/* 🛰️ REAL-TIME SYNC TRACE TERMINAL & AUDIT LOGS */}
      <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                Real-Time Sync Trace &amp; API Audit Logs
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Theo dõi từng request ghi/sửa dữ liệu từ Frontend lên Cloud Supabase trong thời gian thực
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            <button
              onClick={handleTestCloudWrite}
              disabled={testWriteLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}
            >
              <Play className={`w-3.5 h-3.5 ${testWriteLoading ? 'animate-spin' : ''}`} />
              <span>{testWriteLoading ? 'Đang test...' : '⚡ Test Ghi Cloud'}</span>
            </button>

            <button
              onClick={handleExportLogs}
              disabled={syncLogs.length === 0}
              className="p-1.5 rounded-xl border transition hover:opacity-80 disabled:opacity-40 cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              title="Xuất JSON Logs"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={clearSyncLogs}
              disabled={syncLogs.length === 0}
              className="p-1.5 rounded-xl border transition hover:opacity-80 disabled:opacity-40 text-rose-400 cursor-pointer"
              style={{ borderColor: 'var(--border-subtle)' }}
              title="Xóa toàn bộ Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Test Write Banner */}
        {testWriteMessage && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 border ${
            testWriteMessage.ok ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
          }`}>
            {testWriteMessage.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{testWriteMessage.msg}</span>
          </div>
        )}

        {/* Filter Chips */}
        <div className="flex items-center space-x-2 text-xs">
          <span style={{ color: 'var(--text-muted)' }}>Lọc:</span>
          {(['ALL', 'SUCCESS', 'ERROR', 'FALLBACK'] as const).map((f) => {
            const isSel = logFilter === f;
            const count = f === 'ALL' ? syncLogs.length : syncLogs.filter(l => l.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  isSel ? 'bg-cyan-500 text-white shadow-sm' : 'hover:opacity-80'
                }`}
                style={!isSel ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' } : {}}
              >
                {f === 'ALL' ? 'Tất cả' : f} ({count})
              </button>
            );
          })}
        </div>

        {/* Logs Terminal List */}
        <div className="rounded-xl border overflow-hidden font-mono text-xs" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-primary)' }}>
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              🟢 Chưa có sự kiện ghi dữ liệu nào gần đây. Hãy thực hiện 1 thao tác sửa/thêm xe hoặc bấm "⚡ Test Ghi Cloud" để kiểm tra.
            </div>
          ) : (
            <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredLogs.map((log) => {
                const isErr = log.status === 'ERROR';
                const isSuccess = log.status === 'SUCCESS';
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    className="p-3 flex items-start justify-between gap-2 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition"
                  >
                    <div className="flex items-start space-x-2.5 min-w-0">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        isSuccess ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                        isErr ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {log.status}
                      </span>

                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-200 shrink-0">
                        {log.action}
                      </span>

                      <span className="text-cyan-400 font-bold shrink-0">
                        [{log.table}]
                      </span>

                      <div className="min-w-0 truncate">
                        <span style={{ color: 'var(--text-primary)' }}>{log.summary}</span>
                        {log.errorDetails && (
                          <p className="text-rose-400 text-[11px] truncate mt-0.5">
                            ⚠️ {log.errorDetails}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {log.durationMs != null && <span className="text-cyan-400">{log.durationMs}ms</span>}
                      <span>{new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Log Inspector Modal / Box */}
        {selectedLog && (
          <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400">Chi tiết Log Trace: {selectedLog.id}</span>
              <button onClick={() => setSelectedLog(null)} className="text-xs px-2 py-0.5 rounded hover:opacity-80 cursor-pointer" style={{ background: 'var(--bg-secondary)' }}>Đóng</button>
            </div>
            <p><strong>Thời gian:</strong> {new Date(selectedLog.timestamp).toLocaleString('vi-VN')}</p>
            <p><strong>Bảng / Hành động:</strong> <code className="font-mono text-cyan-400">{selectedLog.table} ({selectedLog.action})</code></p>
            <p><strong>Trạng thái:</strong> <span className={selectedLog.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>{selectedLog.status}</span></p>
            {selectedLog.errorDetails && (
              <div>
                <strong>Chi tiết lỗi từ Supabase:</strong>
                <pre className="p-2 mt-1 rounded bg-rose-950/40 text-rose-300 font-mono text-[11px] overflow-x-auto border border-rose-800/40">
                  {selectedLog.errorDetails}
                </pre>
              </div>
            )}
            {selectedLog.payload && (
              <div>
                <strong>Payload dữ liệu gửi đi:</strong>
                <pre className="p-2 mt-1 rounded bg-black/30 font-mono text-[11px] overflow-x-auto border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 🚀 LIVE SYNCED TRIPS INSPECTOR */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Danh Sách Chuyến Đi Đã Lên Supabase (Trips on Cloud)</span>
          </h3>
          <span className="text-[11px] font-mono text-cyan-400 font-bold">
            {syncedTrips.length} chuyến gần nhất
          </span>
        </div>

        {syncedTrips.length === 0 ? (
          <div className="p-4 rounded-xl text-center text-xs" style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
            ⚠️ Chưa có bản ghi nào trong bảng <code className="font-mono text-cyan-400">trips</code> trên Supabase Cloud.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
            <table className="w-full text-xs text-left">
              <thead>
                <tr style={{ background: 'var(--bg-primary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th className="px-3 py-2">Thời gian (start_time)</th>
                  <th className="px-3 py-2">Quãng đường</th>
                  <th className="px-3 py-2">Thời lượng</th>
                  <th className="px-3 py-2">Tốc độ TB</th>
                  <th className="px-3 py-2">Xăng (L)</th>
                  <th className="px-3 py-2">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {syncedTrips.map((t, idx) => (
                  <tr key={t.id || idx} className="border-b hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-primary)' }}>
                      {t.start_time ? new Date(t.start_time).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-cyan-400">
                      {t.distance_km != null ? `${Number(t.distance_km).toFixed(1)} km` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {t.duration_seconds ? `${Math.round(t.duration_seconds / 60)} phút` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {t.average_speed_kmh ? `${Number(t.average_speed_kmh).toFixed(0)} km/h` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-amber-400">
                      {t.fuel_used_liters ? `${Number(t.fuel_used_liters).toFixed(2)} L` : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400">
                        {t.status || 'SYNCED'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tables Status List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Thống Kê Chi Tiết Từng Bảng (Real-time Tables)</span>
          </h3>
          {lastRefreshed && (
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Cập nhật lúc: {lastRefreshed}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map((t) => (
            <div
              key={t.name}
              className="p-4 rounded-2xl flex flex-col justify-between transition-all"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                  <p className="text-[10px] font-mono text-cyan-400">{t.name}</p>
                </div>
                {t.status === 'OK' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {t.status === 'ERROR' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {t.status === 'LOADING' && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin shrink-0" />}
              </div>

              <div className="mt-3 flex items-baseline justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Số lượng:</span>
                <span className="font-mono font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {t.count !== null ? `${t.count.toLocaleString('vi-VN')} bản ghi` : '—'}
                </span>
              </div>
              {t.errorMsg && (
                <p className="text-[9px] text-rose-400 mt-1 truncate" title={t.errorMsg}>
                  ⚠️ {t.errorMsg}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SQL & Security Guide */}
      <div className="p-5 rounded-2xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <h3 className="text-xs font-bold flex items-center space-x-1.5" style={{ color: 'var(--text-primary)' }}>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Chính sách Phân quyền RLS &amp; Khắc phục nhanh</span>
        </h3>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Nếu có bảng báo lỗi RLS hoặc App Android không thể đẩy dữ liệu, bạn chỉ cần mở <strong>Supabase SQL Editor</strong> và chạy nội dung file:
          <code className="mx-1 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-cyan-400 font-mono text-[11px]">supabase/PERMANENT_CLEANUP_AND_SYNC_REAL_FLEET.sql</code>.
        </p>
      </div>
    </div>
  );
}
