'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, Bot, Globe, Key, Zap, CheckCircle2, XCircle,
  Eye, EyeOff, ChevronRight, AlertTriangle, Info, Settings2,
  Cpu, Server, ShieldCheck, Check
} from 'lucide-react';
import {
  MODERN_AI_PROVIDERS,
  getClientAIConfig,
  saveClientAIConfig,
  ProviderConfig
} from '@/lib/services/aiConfig';

interface ProviderState {
  baseUrl: string;
  apiKey: string;
  model: string;
  customModel: string;
  showKey: boolean;
  testStatus: 'idle' | 'testing' | 'ok' | 'fail';
  testMessage: string;
}

const defaultState = (p: ProviderConfig): ProviderState => ({
  baseUrl: p.defaultBaseUrl,
  apiKey: '',
  model: p.defaultModel,
  customModel: '',
  showKey: false,
  testStatus: 'idle',
  testMessage: '',
});

export default function AISettingsPage() {
  const [configs, setConfigs] = useState<Record<string, ProviderState>>(() =>
    Object.fromEntries(MODERN_AI_PROVIDERS.map((p) => [p.id, defaultState(p)]))
  );
  const [defaultProvider, setDefaultProvider] = useState('gemini');
  const [saved, setSaved] = useState(false);
  const [activeProvider, setActiveProvider] = useState('gemini');

  // Load from localStorage on mount
  useEffect(() => {
    const savedConfig = getClientAIConfig();
    if (savedConfig.defaultProvider) {
      setDefaultProvider(savedConfig.defaultProvider);
      setActiveProvider(savedConfig.defaultProvider);
    }
    if (savedConfig.providers) {
      setConfigs((prev) => {
        const next = { ...prev };
        for (const [id, s] of Object.entries(savedConfig.providers)) {
          if (next[id]) {
            next[id] = {
              ...next[id],
              baseUrl: s.baseUrl !== undefined ? s.baseUrl : next[id].baseUrl,
              apiKey: s.apiKey || next[id].apiKey,
              model: s.model || next[id].model,
            };
          }
        }
        return next;
      });
    }
  }, []);

  const update = (id: string, field: keyof ProviderState, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const testConnection = async (providerId: string) => {
    const cfg = configs[providerId];
    const providerMeta = MODERN_AI_PROVIDERS.find((p) => p.id === providerId)!;

    if (!cfg.apiKey && providerId !== 'chatgpt2api') {
      update(providerId, 'testStatus', 'fail');
      update(providerId, 'testMessage', 'Vui lòng nhập API Key');
      return;
    }

    if (providerMeta.type === 'custom' && !cfg.baseUrl) {
      update(providerId, 'testStatus', 'fail');
      update(providerId, 'testMessage', 'Vui lòng nhập Base URL cho Gateway');
      return;
    }

    update(providerId, 'testStatus', 'testing');
    update(providerId, 'testMessage', 'Đang kiểm tra kết nối...');

    try {
      const activeModel = cfg.customModel.trim() || cfg.model || providerMeta.defaultModel;
      const res = await fetch(`/api/ai/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          apiKey: cfg.apiKey,
          baseUrl: cfg.baseUrl || providerMeta.defaultBaseUrl,
          model: activeModel,
        }),
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
    const providersToSave: Record<string, any> = {};
    for (const [id, state] of Object.entries(configs)) {
      providersToSave[id] = {
        baseUrl: state.baseUrl,
        apiKey: state.apiKey,
        model: state.customModel.trim() || state.model,
      };
    }

    const payload = {
      defaultProvider,
      providers: providersToSave,
    };

    saveClientAIConfig(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const currentProvider = MODERN_AI_PROVIDERS.find((p) => p.id === activeProvider)!;
  const currentCfg = configs[activeProvider];

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
          <Settings2 className="w-6 h-6" style={{ color: 'var(--accent-cyan)' }} />
          <span>Cấu hình AI &amp; Các Mô Hình Hiện Hành (2025-2026)</span>
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Kết nối các mô hình AI mới nhất của Google Gemini, OpenAI GPT, DeepSeek, Claude để phân tích dữ liệu phương tiện FMMS
        </p>
      </div>

      {/* Security & Info Banner */}
      <div className="p-4 rounded-2xl flex items-start space-x-3" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
        <ShieldCheck className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--accent-cyan)' }} />
        <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p className="font-bold" style={{ color: 'var(--accent-cyan)' }}>Lưu trữ &amp; Bảo mật API Key</p>
          <p>
            Bạn có thể nhập API Key trực tiếp tại đây để lưu an toàn trên trình duyệt cá nhân của bạn, hoặc cấu hình biến môi trường trên Vercel (<code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">GEMINI_API_KEY</code>, <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">OPENAI_API_KEY</code>, <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">DEEPSEEK_API_KEY</code>).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provider Selector List */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            NHÀ CUNG CẤP AI
          </p>
          {MODERN_AI_PROVIDERS.map((p) => {
            const cfg = configs[p.id];
            const isActive = activeProvider === p.id;
            const hasConfig = !!cfg?.apiKey || p.id === 'chatgpt2api';

            return (
              <button
                key={p.id}
                onClick={() => setActiveProvider(p.id)}
                className="w-full p-3 rounded-2xl text-left transition-all cursor-pointer"
                style={{
                  background: isActive ? 'var(--accent-cyan-bg)' : 'var(--bg-secondary)',
                  border: `1px solid ${isActive ? 'var(--accent-cyan)' : 'var(--border-default)'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {defaultProvider === p.id && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide" style={{ background: `${p.color}25`, color: p.color }}>
                        MẶC ĐỊNH
                      </span>
                    )}
                    {hasConfig && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Config Panel */}
        <div className="md:col-span-2 p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
          {/* Provider header */}
          <div className="flex items-start justify-between pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h3 className="text-sm font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: currentProvider.color }} />
                <span>{currentProvider.label}</span>
              </h3>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{currentProvider.description}</p>
            </div>
            {currentProvider.docsUrl && (
              <a
                href={currentProvider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2.5 py-1 rounded-xl transition hover:opacity-80 font-semibold"
                style={{ background: 'var(--bg-primary)', color: 'var(--accent-cyan)', border: '1px solid var(--border-default)' }}
              >
                Lấy API Key ↗
              </a>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-3.5">
            {/* Base URL (Optional for standard providers, mandatory for gateway) */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Globe className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />
                Base URL {currentProvider.type === 'custom' && <span className="text-amber-400 font-normal">(Cloudflare Tunnel / IP:Port)</span>}
              </label>
              <input
                type="url"
                value={currentCfg.baseUrl}
                onChange={(e) => update(activeProvider, 'baseUrl', e.target.value)}
                placeholder={currentProvider.defaultBaseUrl || 'https://your-tunnel.trycloudflare.com'}
                className="theme-input text-xs"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Key className="w-3.5 h-3.5 inline mr-1 text-amber-400" />
                API Key / Auth Key {activeProvider === 'gemini' && <span className="text-emerald-400 font-normal">(Miễn phí từ Google)</span>}
              </label>
              <div className="relative">
                <input
                  type={currentCfg.showKey ? 'text' : 'password'}
                  value={currentCfg.apiKey}
                  onChange={(e) => update(activeProvider, 'apiKey', e.target.value)}
                  placeholder={activeProvider === 'gemini' ? 'AIzaSy...' : activeProvider === 'deepseek' ? 'sk-...' : 'Nhập API Key...'}
                  className="theme-input text-xs pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => update(activeProvider, 'showKey', !currentCfg.showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {currentCfg.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                <Zap className="w-3.5 h-3.5 inline mr-1 text-yellow-400" />
                Chọn Mô Hình Hiện Hành (Model)
              </label>
              <select
                value={currentCfg.model || currentProvider.defaultModel}
                onChange={(e) => update(activeProvider, 'model', e.target.value)}
                className="theme-select text-xs font-mono font-medium"
              >
                {currentProvider.modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Custom Model override (if user wants a specific fine-tune or newer model) */}
            <div>
              <label className="text-[11px] font-medium block" style={{ color: 'var(--text-muted)' }}>
                Hoặc nhập tên model tùy chỉnh khác:
              </label>
              <input
                type="text"
                value={currentCfg.customModel}
                onChange={(e) => update(activeProvider, 'customModel', e.target.value)}
                placeholder={`Mặc định: ${currentCfg.model || currentProvider.defaultModel}`}
                className="theme-input text-xs font-mono py-1.5 mt-1"
              />
            </div>
          </div>

          {/* Test Connection Button & Status */}
          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={() => testConnection(activeProvider)}
              disabled={currentCfg.testStatus === 'testing'}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
            >
              {currentCfg.testStatus === 'testing' ? (
                <><Cpu className="w-3.5 h-3.5 animate-spin" /><span>Đang kiểm tra...</span></>
              ) : (
                <><Zap className="w-3.5 h-3.5" /><span>Kiểm tra kết nối (Test)</span></>
              )}
            </button>

            {currentCfg.testStatus === 'ok' && (
              <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{currentCfg.testMessage}</span>
              </span>
            )}
            {currentCfg.testStatus === 'fail' && (
              <span className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 animate-fadeIn">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{currentCfg.testMessage}</span>
              </span>
            )}
          </div>

          {/* Set as Default Provider */}
          <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={defaultProvider === activeProvider}
                onChange={(e) => e.target.checked && setDefaultProvider(activeProvider)}
                className="rounded accent-cyan-500"
              />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Đặt <strong>{currentProvider.name}</strong> làm AI Provider mặc định
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition hover:opacity-90 shadow-md cursor-pointer"
          style={{ background: saved ? 'var(--status-green)' : 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
        >
          {saved ? (
            <><Check className="w-4 h-4" /><span>Đã lưu cấu hình thành công!</span></>
          ) : (
            <><Sparkles className="w-4 h-4" /><span>Lưu Cấu Hình AI</span></>
          )}
        </button>
      </div>
    </div>
  );
}
