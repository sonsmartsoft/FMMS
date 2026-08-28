'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, Database, Sparkles, RefreshCw, Shield, Cloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type CheckStatus = 'PENDING' | 'OK' | 'ERROR' | 'WARN';

interface CheckResult {
  status: CheckStatus;
  detail?: string;
  latency?: number;
}

const Badge = ({ s }: { s: CheckStatus }) => {
  const cfg: Record<CheckStatus, { bg: string; color: string; border: string; label: string }> = {
    PENDING: { bg: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'var(--border-default)', label: 'Testing…' },
    OK:      { bg: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: 'rgba(52,211,153,0.35)', label: 'OK' },
    ERROR:   { bg: 'rgba(248,113,113,0.15)', color: 'var(--status-red)', border: 'rgba(248,113,113,0.35)', label: 'LỖI' },
    WARN:    { bg: 'rgba(245,158,11,0.15)', color: 'var(--status-amber)', border: 'rgba(245,158,11,0.35)', label: 'WARN' },
  };
  const c = cfg[s];
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {s === 'PENDING'
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />}
      <span>{c.label}</span>
    </span>
  );
};

export default function SystemHealthPage() {
  const [db, setDb] = useState<CheckResult>({ status: 'PENDING' });
  const [auth, setAuth] = useState<CheckResult>({ status: 'PENDING' });
  const [aiGw, setAiGw] = useState<CheckResult>({ status: 'PENDING' });
  const [lastCheck, setLastCheck] = useState('');
  const [checking, setChecking] = useState(false);

  const runChecks = useCallback(async () => {
    setChecking(true);
    setDb({ status: 'PENDING' });
    setAuth({ status: 'PENDING' });
    setAiGw({ status: 'PENDING' });

    // ── 1. Supabase DB
    const t0 = Date.now();
    try {
      const sb = createClient();
      const { error } = await sb.from('assets').select('count', { count: 'exact', head: true });
      if (error) {
        setDb({ status: 'ERROR', detail: error.message, latency: Date.now() - t0 });
      } else {
        setDb({ status: 'OK', detail: 'assets table reachable', latency: Date.now() - t0 });
      }
    } catch (e: any) {
      setDb({ status: 'ERROR', detail: e?.message ?? 'network error', latency: Date.now() - t0 });
    }

    // ── 2. Auth session
    const t1 = Date.now();
    try {
      const sb = createClient();
      const { data, error } = await sb.auth.getSession();
      if (error) {
        setAuth({ status: 'ERROR', detail: error.message, latency: Date.now() - t1 });
      } else if (data.session) {
        setAuth({ status: 'OK', detail: `User: ${data.session.user.email}`, latency: Date.now() - t1 });
      } else {
        setAuth({ status: 'WARN', detail: 'Không có session (chưa đăng nhập)', latency: Date.now() - t1 });
      }
    } catch (e: any) {
      setAuth({ status: 'ERROR', detail: e?.message ?? 'network error', latency: Date.now() - t1 });
    }

    // ── 3. AI Gateway
    const t2 = Date.now();
    try {
      const res = await fetch('/api/ai/test-connection', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'gemini' }) });
      const json = await res.json();
      if (res.ok && json.ok) {
        setAiGw({ status: 'OK', detail: `Provider: ${json.provider ?? 'gemini'} — ${json.model ?? ''}`, latency: Date.now() - t2 });
      } else {
        setAiGw({ status: 'WARN', detail: json.error ?? 'Response không OK', latency: Date.now() - t2 });
      }
    } catch (e: any) {
      setAiGw({ status: 'ERROR', detail: e?.message ?? 'Không liên lạc được AI endpoint', latency: Date.now() - t2 });
    }

    setLastCheck(new Date().toLocaleTimeString('vi-VN'));
    setChecking(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const overallOk = [db, auth, aiGw].every(c => c.status === 'OK');
  const hasError = [db, auth, aiGw].some(c => c.status === 'ERROR');
  const overallStatus: CheckStatus = checking ? 'PENDING' : hasError ? 'ERROR' : overallOk ? 'OK' : 'WARN';

  const InfoRow = ({ label, value, mono = false, color = 'var(--text-secondary)' }: { label: string; value: string; mono?: boolean; color?: string }) => (
    <div className="flex justify-between items-center text-xs">
      <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
      <span className={mono ? 'font-mono text-[10px]' : 'font-bold'} style={{ color }}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <Activity className="w-6 h-6" style={{ color: 'var(--accent-cyan)' }} />
            <span>FMMS System Health Center</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Kiểm tra thật thời gian thực — Supabase DB, Auth Session, AI Gateway
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge s={overallStatus} />
          <button onClick={runChecks} disabled={checking}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Kiểm tra lại</span>
          </button>
        </div>
      </div>

      {/* Overall banner */}
      {!checking && (
        <div className="p-4 rounded-xl flex items-center space-x-3"
          style={{
            background: overallOk ? 'rgba(52,211,153,0.08)' : hasError ? 'rgba(248,113,113,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${overallOk ? 'rgba(52,211,153,0.25)' : hasError ? 'rgba(248,113,113,0.25)' : 'rgba(245,158,11,0.25)'}`,
          }}>
          {overallOk
            ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--status-green)' }} />
            : <XCircle className="w-5 h-5 shrink-0" style={{ color: hasError ? 'var(--status-red)' : 'var(--status-amber)' }} />}
          <p className="text-xs font-semibold" style={{ color: overallOk ? 'var(--status-green)' : hasError ? 'var(--status-red)' : 'var(--status-amber)' }}>
            {overallOk
              ? '✅ Tất cả hệ thống hoạt động bình thường'
              : hasError
                ? '❌ Có lỗi — Kiểm tra Supabase SQL Schema & Env Vars trên Vercel'
                : '⚠️ Một số dịch vụ chưa cấu hình đầy đủ'}
          </p>
        </div>
      )}

      {/* Check Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DB */}
        <div className="glass-panel p-5 rounded-2xl space-y-3" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl" style={{ background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)' }}>
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Supabase DB</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>PostgreSQL · opslebsdmwsnsyfmbynf</p>
              </div>
            </div>
            <Badge s={db.status} />
          </div>
          <div className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
            <InfoRow label="Độ trễ" value={db.latency != null ? `${db.latency} ms` : '—'} color={db.latency && db.latency < 300 ? 'var(--status-green)' : 'var(--status-amber)'} />
            <InfoRow label="Chi tiết" value={db.detail ?? 'Testing...'} color={db.status === 'OK' ? 'var(--text-secondary)' : 'var(--status-red)'} />
          </div>
          {db.status === 'ERROR' && (
            <div className="text-[10px] p-2 rounded-lg" style={{ background: 'rgba(248,113,113,0.08)', color: 'var(--text-muted)' }}>
              → Hãy chạy file <code className="font-mono">supabase/SETUP_PASTE_TO_SQL_EDITOR.sql</code> trên Supabase SQL Editor
            </div>
          )}
        </div>

        {/* Auth */}
        <div className="glass-panel p-5 rounded-2xl space-y-3" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--status-green)' }}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Supabase Auth</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>JWT Session · RLS</p>
              </div>
            </div>
            <Badge s={auth.status} />
          </div>
          <div className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
            <InfoRow label="Độ trễ" value={auth.latency != null ? `${auth.latency} ms` : '—'} color="var(--status-green)" />
            <InfoRow label="Session" value={auth.detail ?? 'Checking...'} color={auth.status === 'OK' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          </div>
        </div>

        {/* AI Gateway */}
        <div className="glass-panel p-5 rounded-2xl space-y-3" style={{ border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.15)', color: '#A78BFA' }}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>AI Gateway</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ChatGPT2API → Gemini fallback</p>
              </div>
            </div>
            <Badge s={aiGw.status} />
          </div>
          <div className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
            <InfoRow label="Độ trễ" value={aiGw.latency != null ? `${aiGw.latency} ms` : '—'} color="var(--status-green)" />
            <InfoRow label="Provider" value={aiGw.detail ?? 'Testing...'} color={aiGw.status === 'OK' ? 'var(--text-secondary)' : 'var(--status-amber)'} />
          </div>
          {aiGw.status !== 'OK' && (
            <div className="text-[10px] p-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--text-muted)' }}>
              → Cấu hình <code className="font-mono">C2A_BASE_URL</code> & <code className="font-mono">GEMINI_API_KEY</code> trong Vercel Env Vars
            </div>
          )}
        </div>
      </div>

      {/* Integration Status */}
      <div className="glass-panel p-5 rounded-2xl space-y-3" style={{ border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-2 mb-1">
          <Cloud className="w-4 h-4" style={{ color: 'var(--status-amber)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Tích hợp & Dịch vụ</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Vercel Deployment', ok: true, detail: 'fmms.vercel.app' },
            { label: 'GitHub CI/CD', ok: true, detail: 'main branch' },
            { label: 'Cloudflare Tunnel', ok: false, detail: 'Cần cấu hình C2A_BASE_URL' },
            { label: 'Google Sheets Sync', ok: false, detail: 'Chưa triển khai' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ color: s.ok ? 'var(--status-green)' : 'var(--text-faint)' }}>{s.ok ? '●' : '○'}</span>
              </div>
              <p style={{ color: 'var(--text-faint)', fontSize: 10 }}>{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 rounded-xl text-xs flex justify-between flex-wrap gap-2"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
        <span>FMMS v2.0.0 · Next.js 14.2.25 · Supabase · Vercel</span>
        {lastCheck && <span>Lần kiểm tra: {lastCheck}</span>}
      </div>
    </div>
  );
}
