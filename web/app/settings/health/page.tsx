'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Activity, Database, Sparkles, RefreshCw, Shield, Cloud, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { getActiveAISettings } from '@/lib/services/aiConfig';

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
      const { count, error } = await sb.from('assets').select('*', { count: 'exact', head: true });
      if (error) {
        setDb({ status: 'ERROR', detail: error.message, latency: Date.now() - t0 });
      } else {
        setDb({ status: 'OK', detail: `Connected (${count ?? 0} phương tiện)`, latency: Date.now() - t0 });
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
        setAuth({ status: 'OK', detail: `Đã đăng nhập: ${data.session.user.email}`, latency: Date.now() - t1 });
      } else {
        setAuth({ status: 'WARN', detail: 'Chưa đăng nhập (Session cookie trống)', latency: Date.now() - t1 });
      }
    } catch (e: any) {
      setAuth({ status: 'ERROR', detail: e?.message ?? 'network error', latency: Date.now() - t1 });
    }

    // ── 3. AI Gateway (Reads active configured AI provider)
    const t2 = Date.now();
    try {
      const active = getActiveAISettings();
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: active.provider,
          apiKey: active.apiKey,
          baseUrl: active.baseUrl,
          model: active.model,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setAiGw({ status: 'OK', detail: `${active.provider.toUpperCase()} (${active.model}): Sẵn sàng`, latency: Date.now() - t2 });
      } else {
        setAiGw({ status: 'WARN', detail: json.message || 'Chưa cấu hình API Key', latency: Date.now() - t2 });
      }
    } catch (e: any) {
      setAiGw({ status: 'ERROR', detail: e?.message ?? 'Không thể kiểm tra AI', latency: Date.now() - t2 });
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
            <Activity className="w-6 h-6 text-cyan-400" />
            <span>FMMS System Health Center</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Giám sát thời gian thực kết nối Supabase Cloud DB, Auth Session &amp; AI Provider
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge s={overallStatus} />
          <button onClick={runChecks} disabled={checking}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition hover:opacity-80 disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>Kiểm tra lại</span>
          </button>
        </div>
      </div>

      {/* Overall banner */}
      {!checking && (
        <div className="p-4 rounded-2xl flex items-center space-x-3"
          style={{
            background: overallOk ? 'rgba(52,211,153,0.08)' : hasError ? 'rgba(248,113,113,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${overallOk ? 'rgba(52,211,153,0.25)' : hasError ? 'rgba(248,113,113,0.25)' : 'rgba(245,158,11,0.25)'}`,
          }}>
          {overallOk
            ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            : <XCircle className="w-5 h-5 shrink-0 text-amber-400" />}
          <p className="text-xs font-bold" style={{ color: overallOk ? 'var(--status-green)' : hasError ? 'var(--status-red)' : 'var(--status-amber)' }}>
            {overallOk
              ? '✅ Tất cả các dịch vụ (Database, Auth, AI) hoạt động hoàn hảo'
              : hasError
                ? '❌ Có lỗi phát sinh — Vui lòng kiểm tra chi tiết từng dịch vụ bên dưới'
                : '⚠️ Một số dịch vụ chưa cấu hình (ví dụ: API Key AI trong Cài đặt)'}
          </p>
        </div>
      )}

      {/* Check Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DB */}
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Supabase Database</p>
                <p className="text-[10px] font-mono text-cyan-400">PostgreSQL Cloud</p>
              </div>
            </div>
            <Badge s={db.status} />
          </div>
          <div className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <InfoRow label="Độ trễ" value={db.latency != null ? `${db.latency} ms` : '—'} color={db.latency && db.latency < 300 ? 'var(--status-green)' : 'var(--status-amber)'} />
            <InfoRow label="Trạng thái" value={db.detail ?? 'Testing...'} color={db.status === 'OK' ? 'var(--text-secondary)' : 'var(--status-red)'} />
          </div>
        </div>

        {/* Auth */}
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>Supabase Auth</p>
                <p className="text-[10px] font-mono text-emerald-400">JWT &amp; RLS Session</p>
              </div>
            </div>
            <Badge s={auth.status} />
          </div>
          <div className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <InfoRow label="Độ trễ" value={auth.latency != null ? `${auth.latency} ms` : '—'} color="var(--status-green)" />
            <InfoRow label="Phiên đăng nhập" value={auth.detail ?? 'Checking...'} color={auth.status === 'OK' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          </div>
        </div>

        {/* AI Gateway */}
        <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-extrabold" style={{ color: 'var(--text-primary)' }}>AI Provider</p>
                <p className="text-[10px] font-mono text-purple-400">Gemini / OpenAI / DeepSeek</p>
              </div>
            </div>
            <Badge s={aiGw.status} />
          </div>
          <div className="space-y-1.5 p-3 rounded-xl" style={{ background: 'var(--bg-primary)' }}>
            <InfoRow label="Độ trễ" value={aiGw.latency != null ? `${aiGw.latency} ms` : '—'} color="var(--status-green)" />
            <InfoRow label="Cấu hình" value={aiGw.detail ?? 'Testing...'} color={aiGw.status === 'OK' ? 'var(--text-secondary)' : 'var(--status-amber)'} />
          </div>
        </div>
      </div>

      {/* Cloud Infrastructure Summary */}
      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        <div className="flex items-center space-x-2 mb-1">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>Hạ Tầng Dịch Vụ &amp; Triển Khai Cloud</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Vercel Deployment', ok: true, detail: 'Next.js 14 Production' },
            { label: 'GitHub Sync', ok: true, detail: 'Branch main' },
            { label: 'PostgreSQL DB', ok: true, detail: 'AWS Singapore' },
            { label: 'Android OBD Sync', ok: true, detail: 'Offline-First Queue' },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 10 }}>{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 rounded-xl text-xs flex justify-between flex-wrap gap-2"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
        <span>FMMS v2.0.0 · Next.js 14.2.25 · Supabase · Vercel</span>
        {lastCheck && <span>Lần kiểm tra gần nhất: {lastCheck}</span>}
      </div>
    </div>
  );
}
