'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Car, DollarSign, Wrench, BarChart3, Settings, Trash2, RotateCcw, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useAIChat } from '@/lib/hooks/useAIChat';
import { MarkdownMessage } from '@/components/ai/MarkdownMessage';

const QUICK_PROMPTS = [
  { label: 'Phân tích chi phí xe trong tháng này', icon: DollarSign },
  { label: 'Xe nào sắp đến hạn bảo dưỡng?', icon: Wrench },
  { label: 'So sánh mức tiêu thụ xăng và chi phí nhiên liệu', icon: Car },
  { label: 'Dự báo chi phí vận hành tháng tới', icon: BarChart3 },
];

export default function AiCenterPage() {
  const { messages, loading, sendMessage, clearHistory } = useAIChat();
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleCopy = (text: string, id: string) => {
    const clean = text.replace(/```(?:fmms_action|json:action|action)[\s\S]*?```/gi, '').trim();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(clean);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = (text?: string) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput('');
    sendMessage(q);
  };

  const handleClear = () => {
    if (window.confirm('Bạn có chắc muốn xóa lịch sử cuộc trò chuyện này để bắt đầu đoạn chat mới?')) {
      clearHistory();
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 animate-fadeIn">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center space-x-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span>AI Center</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold uppercase tracking-wider">
              Đồng bộ Popup &amp; Cloud
            </span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Trung tâm phân tích thông minh cho toàn bộ đội xe gia đình · Dữ liệu đồng bộ 2 chiều với Popup Assistant
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClear}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:bg-white/10 text-slate-400 hover:text-rose-400 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}
            title="Xóa lịch sử để bắt đầu đoạn chat mới"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đoạn chat mới</span>
          </button>

          <Link
            href="/settings/ai"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80 shadow-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cấu hình Model &amp; Prompt</span>
          </Link>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4 rounded-2xl mb-3 overscroll-contain" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={msg.sender === 'ai'
                ? { background: 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(139,92,246,0.25))', border: '1px solid rgba(14,165,233,0.3)', color: 'var(--accent-cyan)' }
                : { background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}>
              {msg.sender === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              style={msg.sender === 'user'
                ? { background: 'var(--accent-cyan)', color: 'white' }
                : { background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <MarkdownMessage content={msg.text} isUser={msg.sender === 'user'} />
              <div className={`flex items-center gap-2 pt-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-between'}`}>
                <button
                  type="button"
                  onClick={() => handleCopy(msg.text, msg.id)}
                  className={`flex items-center gap-1 text-[10px] transition-colors py-0.5 px-1.5 rounded-lg ${
                    msg.sender === 'user' ? 'text-white/70 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  title="Sao chép tin nhắn"
                >
                  {copiedId === msg.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-500 font-medium">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 opacity-70" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>

                {msg.providerUsed && (
                  <p className="text-[9px] font-mono opacity-50">⚡ {msg.providerUsed}</p>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3 animate-pulse">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(139,92,246,0.25))', color: 'var(--accent-cyan)' }}>
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <div className="flex items-center space-x-2 text-xs" style={{ color: 'var(--accent-cyan)' }}>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>AI đang tổng hợp và phân tích dữ liệu phương tiện...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => handleSend(label)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <Icon className="w-3.5 h-3.5 text-cyan-400" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center space-x-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Hỏi về chi phí, định mức xăng/pin, lịch bảo dưỡng các xe..."
          className="theme-input flex-1"
          style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition hover:opacity-80 disabled:opacity-40 shadow-md cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', color: 'white' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
