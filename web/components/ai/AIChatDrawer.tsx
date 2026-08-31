'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User, CheckCircle2, Settings, Trash2, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { MODERN_AI_PROVIDERS, getActiveAISettings } from '@/lib/services/aiConfig';
import { useAIChat } from '@/lib/hooks/useAIChat';
import { MarkdownMessage } from './MarkdownMessage';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssetId?: string;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose, currentAssetId }) => {
  const [input, setInput] = useState('');
  const [activeProvider, setActiveProvider] = useState('gemini');
  const { messages, loading, sendMessage, clearHistory } = useAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveAISettings();
      setActiveProvider(active.provider);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const text = input;
    setInput('');
    sendMessage(text, currentAssetId, activeProvider);
  };

  const handleClear = () => {
    if (window.confirm('Bạn có chắc muốn xóa lịch sử cuộc trò chuyện này không?')) {
      clearHistory();
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg glass-panel shadow-2xl flex flex-col animate-slideLeft"
      style={{ borderLeft: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>

      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>FMMS AI Assistant</h3>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 font-bold uppercase">
                Synced
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Model:</span>
              <select
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                className="theme-select py-0 px-1.5 text-[10px] font-bold rounded cursor-pointer"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {MODERN_AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg transition hover:bg-white/10 text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link
            href="/ai-center"
            onClick={onClose}
            className="p-1.5 rounded-lg transition hover:bg-white/10 text-slate-400 hover:text-cyan-400"
            title="Mở toàn màn hình tại AI Center"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
          <Link
            href="/settings/ai"
            onClick={onClose}
            className="p-1.5 rounded-lg transition hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
            title="Cài đặt API & Vai trò AI"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button onClick={onClose} className="p-1.5 rounded-lg transition hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
        {messages.map((m) => (
          <div key={m.id} className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
              style={m.sender === 'user'
                ? { background: '#3B82F6', color: 'white' }
                : { background: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)', color: 'white' }}>
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className="space-y-1 max-w-[88%]">
              <div
                className="p-3.5 rounded-2xl text-xs leading-relaxed"
                style={m.sender === 'user'
                  ? { background: 'var(--accent-cyan)', color: 'white', borderRadius: '1.25rem 0.25rem 1.25rem 1.25rem' }
                  : { background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem 1.25rem 1.25rem 1.25rem' }}
              >
                <MarkdownMessage content={m.text} isUser={m.sender === 'user'} />
              </div>
              {m.providerUsed && (
                <p className="text-[9px] font-mono text-right pt-0.5 opacity-60">⚡ {m.providerUsed}</p>
              )}
              {m.toolCall && (
                <div className="p-2 rounded-xl flex items-center space-x-2 text-[10px]"
                  style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Tool: <strong>{m.toolCall.name}</strong> — {m.toolCall.result || 'Đã truy vấn dữ liệu'}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs p-3 rounded-2xl animate-pulse" style={{ color: 'var(--accent-cyan)', background: 'var(--accent-cyan-bg)' }}>
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI đang phân tích và chuẩn bị số liệu chi tiết...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 flex items-center space-x-2" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Hỏi về chi phí, định mức xăng/pin, khoản vay ngân hàng..."
          className="theme-input flex-1 text-xs"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2 rounded-xl text-white transition disabled:opacity-40 hover:opacity-90 cursor-pointer shadow-md"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
