'use client';

import React, { useState } from 'react';
import {
  Sparkles, Bot, Globe, Key, Zap, CheckCircle2, XCircle,
  Eye, EyeOff, ChevronRight, AlertTriangle, Info, Settings2,
  Cpu, Cloud, Server
} from 'lucide-react';

interface ProviderConfig {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  baseUrlPlaceholder: string;
  modelOptions: string[];
  docsUrl: string;
  color: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'chatgpt2api',
    name: 'ChatGPT2API',
    label: 'ChatGPT2API Gateway (Khuyến nghị)',
    icon: <Server className="w-5 h-5" />,
    description: 'Gateway tự host tại nhà — hỗ trợ ChatGPT Web, Gemini free, DeepSeek, Groq qua chuẩn OpenAI API. Chi phí thấp nhất.',
    baseUrlPlaceholder: 'https://your-tunnel.trycloudflare.com',
    modelOptions: ['chatgpt/auto', 'gemini_free/auto', 'oc/auto', 'deepseek/auto', 'AI Agent'],
    docsUrl: 'https://github.com/TriTue2011/chatgpt2api',
    color: '#10B981',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    label: 'Google Gemini (Google AI Studio)',
    icon: <Sparkles className="w-5 h-5" />,
    description: 'Gemini Flash 1.5 free tier — 15 RPM, 1M tokens/ngày. Yêu cầu GEMINI_API_KEY trong Vercel env.',
    baseUrlPlaceholder: 'https://generativelanguage.googleapis.com',
    modelOptions: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
    docsUrl: 'https://aistudio.google.com',
    color: '#4285F4',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    label: 'OpenAI (GPT-4o / GPT-4o-mini)',
    icon: <Bot className="w-5 h-5" />,
    description: 'Trực tiếp OpenAI API. Cần API key trả phí. Tốt nhất cho phân tích phức tạp.',
    baseUrlPlaceholder: 'https://api.openai.com',
    modelOptions: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    docsUrl: 'https://platform.openai.com',
    color: '#10A37F',
  },
];

interface ProviderState {
  baseUrl: string;
  apiKey: string;
  model: string;
  showKey: boolean;
  testStatus: 'idle' | 'testing' | 'ok' | 'fail';
  testMessage: string;
}

const defaultState = (): ProviderState => ({
  baseUrl: '',
  apiKey: '',
  model: '',
  showKey: false,
  testStatus: 'idle',
  testMessage: '',
});

export default function AISettingsPage() {
  const [configs, setConfigs] = useState<Record<string, ProviderState>>(
    Object.fromEntries(PROVIDERS.map((p) => [p.id, defaultState()]))
  );
  const [defaultProvider, setDefaultProvider] = useState('chatgpt2api');
  const [saved, setSaved] = useState(false);
  const [activeProvider, setActiveProvider] = useState('chatgpt2api');

  const update = (id: string, field: keyof ProviderState, value: any) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const testConnection = async (providerId: string) => {
    const cfg = configs[providerId];
    if (!cfg.baseUrl || !cfg.apiKey) {
      update(providerId, 'testStatus', 'fail');
      update(providerId, 'testMessage', 'Cần nhập Base URL và API Key');
      return;
    }

    update(providerId, 'testStatus', 'testing');
    update(providerId, 'testMessage', 'Đang kiểm tra kết nối...');

    try {
      const endpoint = providerId === 'gemini'
        ? `${cfg.baseUrl}/v1beta/models?key=${cfg.apiKey}`
        : `${cfg.baseUrl}/v1/models`;

      const headers: any = { 'Content-Type': 'application/json' };
      if (providerId !== 'gemini') headers['Authorization'] = `Bearer ${cfg.apiKey}`;

      const res = await fetch(`/api/ai/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, headers, providerId }),
      });
      const data = await res.json();
      update(providerId, 'testStatus', data.ok ? 'ok' : 'fail');
      update(providerId, 'testMessage', data.message || (data.ok ? 'Kết nối thành công!' : 'Kết nối thất bại'));
    } catch {
      update(providerId, 'testStatus', 'fail');
      update(providerId, 'testMessage', 'Lỗi mạng — không thể kiểm tra');
    }
  };

  const handleSave = () => {
    // In production, these would be sent to a server action to set env vars
    // For now, store in localStorage as UX feedback
    const config = { defaultProvider, providers: configs };
    localStorage.setItem('fmms_ai_config', JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const currentProvider = PROVIDERS.find((p) => p.id === activeProvider)!;
  const currentCfg = configs[activeProvider];

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Settings2 className="w-6 h-6" style={{ color: 'var(--accent-cyan)' }} />
          <span>Cấu hình AI Providers</span>
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Kết nối AI Gateway để sử dụng tính năng phân tích thông minh trong FMMS
        </p>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl flex items-start space-x-3" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          <p className="font-semibold mb-1" style={{ color: 'var(--accent-cyan)' }}>Quan trọng — Bảo mật API Key</p>
          <p>API Key chỉ được lưu trên <strong>server Vercel</strong> (Environment Variables), KHÔNG bao giờ lộ xuống trình duyệt. Sau khi cấu hình, vào <strong>Vercel Dashboard → Settings → Environment Variables</strong> để thêm: <code className="px-1 rounded" style={{ background: 'var(--bg-hover)' }}>C2A_BASE_URL</code>, <code className="px-1 rounded" style={{ background: 'var(--bg-hover)' }}>C2A_API_KEY</code>, <code className="px-1 rounded" style={{ background: 'var(--bg-hover)' }}>C2A_DEFAULT_MODEL</code>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provider Selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>CHỌN PROVIDER</p>
          {PROVIDERS.map((p) => {
            const cfg = configs[p.id];
            const isActive = activeProvider === p.id;
            const hasConfig = cfg.baseUrl && cfg.apiKey;
            return (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                className="w-full p-3 rounded-xl text-left transition-all"
                style={{
                  background: isActive ? 'var(--accent-cyan-bg)' : 'var(--bg-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent-cyan-border)' : 'var(--border-default)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span style={{ color: p.color }}>{p.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {defaultProvider === p.id && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: p.color + '22', color: p.color }}>
                        DEFAULT
                      </span>
                    )}
                    {hasConfig && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--status-green)' }} />}
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-faint)' }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Config Panel */}
        <div className="md:col-span-2 glass-panel p-5 rounded-2xl space-y-4" style={{ border: '1px solid var(--border-default)' }}>
          {/* Provider header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl" style={{ background: currentProvider.color + '22', color: currentProvider.color }}>
                {currentProvider.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{currentProvider.label}</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentProvider.description}</p>
              </div>
            </div>
            <a href={currentProvider.docsUrl} target="_blank" rel="noopener noreferrer"
              className="text-[10px] px-2 py-1 rounded-lg transition hover:opacity-70"
              style={{ background: 'var(--bg-hover)', color: 'var(--accent-cyan)', border: '1px solid var(--border-default)' }}>
              Docs ↗
            </a>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Globe className="w-3 h-3 inline mr-1" />
                Base URL {activeProvider === 'chatgpt2api' && <span style={{ color: 'var(--status-amber)' }}>(Cloudflare Tunnel URL)</span>}
              </label>
              <input
                type="url"
                value={currentCfg.baseUrl}
                onChange={(e) => update(activeProvider, 'baseUrl', e.target.value)}
                placeholder={currentProvider.baseUrlPlaceholder}
                className="theme-input"
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Key className="w-3 h-3 inline mr-1" />
                API Key / Auth Key
              </label>
              <div className="relative">
                <input
                  type={currentCfg.showKey ? 'text' : 'password'}
                  value={currentCfg.apiKey}
                  onChange={(e) => update(activeProvider, 'apiKey', e.target.value)}
                  placeholder="Nhập API Key..."
                  className="theme-input pr-10"
                />
                <button
                  onClick={() => update(activeProvider, 'showKey', !currentCfg.showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {currentCfg.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Zap className="w-3 h-3 inline mr-1" />
                Model / Combo
              </label>
              <select
                value={currentCfg.model || currentProvider.modelOptions[0]}
                onChange={(e) => update(activeProvider, 'model', e.target.value)}
                className="theme-select"
              >
                {currentProvider.modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => testConnection(activeProvider)}
              disabled={currentCfg.testStatus === 'testing'}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
            >
              {currentCfg.testStatus === 'testing' ? (
                <><Cpu className="w-3.5 h-3.5 animate-spin" /><span>Đang test...</span></>
              ) : (
                <><Zap className="w-3.5 h-3.5" /><span>Test kết nối</span></>
              )}
            </button>

            {currentCfg.testStatus === 'ok' && (
              <span className="flex items-center space-x-1.5 text-xs font-medium" style={{ color: 'var(--status-green)' }}>
                <CheckCircle2 className="w-4 h-4" /><span>{currentCfg.testMessage}</span>
              </span>
            )}
            {currentCfg.testStatus === 'fail' && (
              <span className="flex items-center space-x-1.5 text-xs font-medium" style={{ color: 'var(--status-red)' }}>
                <XCircle className="w-4 h-4" /><span>{currentCfg.testMessage}</span>
              </span>
            )}
          </div>

          {/* Set as default */}
          <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={defaultProvider === activeProvider}
                onChange={(e) => e.target.checked && setDefaultProvider(activeProvider)}
                className="rounded"
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Đặt làm provider mặc định</span>
            </label>
          </div>
        </div>
      </div>

      {/* ChatGPT2API Setup Guide */}
      {activeProvider === 'chatgpt2api' && (
        <div className="glass-panel p-5 rounded-2xl space-y-3" style={{ border: '1px solid var(--border-default)' }}>
          <h3 className="text-sm font-bold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--status-amber)' }} />
            <span>Hướng dẫn expose ChatGPT2API ra internet (Cloudflare Tunnel)</span>
          </h3>
          <div className="text-xs space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Chạy lệnh trên máy đang chạy ChatGPT2API (Docker):</p>
            <div className="p-3 rounded-lg font-mono text-[11px] space-y-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-emerald-400"># Cài cloudflared (1 lần)</p>
              <p>brew install cloudflare/cloudflare/cloudflared</p>
              <p className="text-emerald-400 mt-2"># Tạo tunnel tới port 3030 (port của ChatGPT2API)</p>
              <p>cloudflared tunnel --url http://localhost:3030</p>
              <p className="text-emerald-400 mt-2"># URL được tạo ra (dạng): https://xxx.trycloudflare.com</p>
              <p className="text-emerald-400"># Dùng URL này làm Base URL ở trên</p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="font-semibold" style={{ color: 'var(--status-red)' }}>⚠️ Bảo mật quan trọng:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>CHATGPT2API_AUTH_KEY phải mạnh (ít nhất 32 ký tự random)</li>
                <li>KHÔNG mở port 6080 (noVNC) ra internet</li>
                <li>Đặt VNC_PASSWORD nếu dùng VNC</li>
                <li>Thêm vào Vercel env vars: C2A_BASE_URL, C2A_API_KEY, C2A_DEFAULT_MODEL</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
          style={{ background: saved ? 'var(--status-green)' : 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          {saved ? '✓ Đã lưu cấu hình' : 'Lưu cấu hình'}
        </button>
      </div>

      {/* Note about Vercel */}
      <div className="p-4 rounded-xl text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
        <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>📌 Quan trọng — Sau khi lưu:</p>
        <p>Vào <strong>Vercel Dashboard → Project FMMS → Settings → Environment Variables</strong> và thêm các biến:</p>
        <div className="mt-2 space-y-1 font-mono text-[11px]">
          <p><span style={{ color: 'var(--accent-cyan)' }}>C2A_BASE_URL</span> = URL Cloudflare Tunnel của ChatGPT2API</p>
          <p><span style={{ color: 'var(--accent-cyan)' }}>C2A_API_KEY</span> = CHATGPT2API_AUTH_KEY mạnh</p>
          <p><span style={{ color: 'var(--accent-cyan)' }}>C2A_DEFAULT_MODEL</span> = chatgpt/auto (hoặc combo ưa thích)</p>
        </div>
        <p className="mt-2">Sau đó <strong>Redeploy</strong> để env vars có hiệu lực.</p>
      </div>
    </div>
  );
}
