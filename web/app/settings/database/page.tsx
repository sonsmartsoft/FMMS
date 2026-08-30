'use client';

import React, { useState, useEffect } from 'react';
import { Database, ExternalLink, RefreshCw, ShieldCheck, HardDrive, CheckCircle2, AlertCircle, Layers, Server } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
  { name: 'trips', label: 'Nhật ký chuyến đi (Trips)' },
  { name: 'devices', label: 'Thiết bị OBD/Android (Devices)' },
  { name: 'profiles', label: 'Tài khoản người dùng (Profiles)' },
];

export default function DatabaseSettingsPage() {
  const [stats, setStats] = useState<TableStats[]>(
    TABLES.map(t => ({ ...t, count: null, status: 'LOADING' }))
  );
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');

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
    setLoading(false);
    setLastRefreshed(new Date().toLocaleTimeString('vi-VN'));
  };

  useEffect(() => {
    loadStats();
  }, []);

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
            Quản lý cấu trúc bảng, Row Level Security (RLS) &amp; Trạng thái kết nối Cloud Database
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition hover:opacity-80 disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới số liệu</span>
          </button>

          <a
            href="https://supabase.com/dashboard/project/opslebsdmwsnsyfmbynf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 shadow-md"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở Supabase Dashboard ↗</span>
          </a>
        </div>
      </div>

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
          <code className="mx-1 px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-cyan-400 font-mono text-[11px]">supabase/RESTORE_SELECT_POLICIES_PASTE_TO_SQL_EDITOR.sql</code>.
        </p>
      </div>
    </div>
  );
}
