'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User, CheckCircle2, Settings, Trash2, Maximize2, Minus, ChevronDown, ArrowUpRight, MessageSquareText } from 'lucide-react';
import Link from 'next/link';
import { MODERN_AI_PROVIDERS, getActiveAISettings } from '@/lib/services/aiConfig';
import { useAIChat } from '@/lib/hooks/useAIChat';
import { MarkdownMessage } from './MarkdownMessage';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssetId?: string;
}

const QUICK_PROMPTS = [
  '⚡ Chi phí vận hành tháng này?',
  '🔧 Xe nào sắp đến hạn bảo dưỡng?',
  '⛽ Mức tiêu thụ nhiên liệu Mazda 2?',
  '💰 Tình hình dư nợ khoản vay ngân hàng?',
];

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose, currentAssetId }) => {
  const [input, setInput] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeProvider, setActiveProvider] = useState('gemini');
  const { messages, loading, sendMessage, clearHistory } = useAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveAISettings();
      setActiveProvider(active.provider);
      setIsMinimized(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  if (!isOpen) return null;

  const handleSend = (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;
    setInput('');
    sendMessage(textToSend, currentAssetId, activeProvider);
  };

  const handleClear = () => {
    if (window.confirm('Bạn có chắc muốn xóa lịch sử cuộc trò chuyện này không?')) {
      clearHistory();
    }
  };

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out flex flex-col overflow-hidden shadow-2xl ${
        isMinimized
          ? 'bottom-6 right-6 w-80 h-14 rounded-2xl'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[430px] h-[600px] max-h-[88vh] rounded-3xl'
      }`}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 35px -5px rgba(14, 165, 233, 0.25)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* ── Live Chat Header ── */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(59,130,246,0.08))',
          borderBottom: isMinimized ? 'none' : '1px solid var(--border-default)',
        }}
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75" />
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-xs font-black tracking-wide" style={{ color: 'var(--text-primary)' }}>
                FMMS Live Co-Pilot
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 font-bold uppercase tracking-wider border border-cyan-500/30">
                Online
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <span>Engine:</span>
              <select
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="theme-select py-0 px-1 text-[10px] font-bold rounded cursor-pointer border-none bg-transparent hover:underline"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {MODERN_AI_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleClear}
            className="p-1.5 rounded-xl transition hover:bg-white/10 text-slate-400 hover:text-rose-400"
            title="Xóa lịch sử trò chuyện"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <Link
            href="/ai-center"
            onClick={onClose}
            className="p-1.5 rounded-xl transition hover:bg-white/10 text-slate-400 hover:text-cyan-400"
            title="Mở toàn màn hình tại AI Center"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/settings/ai"
            onClick={onClose}
            className="p-1.5 rounded-xl transition hover:bg-white/10 text-slate-400 hover:text-indigo-400"
            title="Cài đặt API AI"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            className="p-1.5 rounded-xl transition hover:bg-white/10 text-slate-400 hover:text-amber-400"
            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? <ChevronDown className="w-3.5 h-3.5 rotate-180" /> : <Minus className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Chat Body (Visible when not minimized) ── */}
      {!isMinimized && (
        <>
          {/* Quick Prompts Bar */}
          {messages.length <= 1 && (
            <div className="px-4 py-2 flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-default)' }}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all duration-200 hover:scale-105 active:scale-95 flex items-center space-x-1 shrink-0"
                  style={{
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{prompt}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
                </button>
              ))}
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.length === 0 && (
              <div className="text-center py-10 px-4 space-y-3">
                <div className="w-12 h-12 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
                  <MessageSquareText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Xin chào! Tôi có thể giúp gì cho bạn?</h4>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Hỏi tôi về mức tiêu thụ nhiên liệu, lịch bảo dưỡng, TCO hoặc tổng kết tài chính của cả đội xe.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start space-x-2.5 animate-fadeIn ${
                  m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className="w-7 h-7 rounded-2xl flex items-center justify-center text-xs shrink-0 shadow-sm"
                  style={
                    m.sender === 'user'
                      ? { background: 'linear-gradient(135deg, #0284C7, #2563EB)', color: 'white' }
                      : { background: 'linear-gradient(135deg, #0EA5E9, #8B5CF6)', color: 'white' }
                  }
                >
                  {m.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className="space-y-1 max-w-[85%]">
                  <div
                    className="p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm"
                    style={
                      m.sender === 'user'
                        ? {
                            background: 'linear-gradient(135deg, #0284C7, #0284C7)',
                            color: '#FFFFFF',
                            borderRadius: '1.25rem 0.25rem 1.25rem 1.25rem',
                          }
                        : {
                            background: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '0.25rem 1.25rem 1.25rem 1.25rem',
                          }
                    }
                  >
                    <MarkdownMessage content={m.text} isUser={m.sender === 'user'} />
                  </div>

                  {m.providerUsed && (
                    <p className="text-[9px] font-mono text-right pt-0.5 opacity-60">⚡ {m.providerUsed}</p>
                  )}

                  {m.toolCall && (
                    <div
                      className="p-2 rounded-xl flex items-center space-x-2 text-[10px]"
                      style={{
                        background: 'var(--accent-cyan-bg)',
                        border: '1px solid var(--accent-cyan-border)',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>
                        Tool: <strong>{m.toolCall.name}</strong> — {m.toolCall.result || 'Đã truy vấn dữ liệu'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div
                className="flex items-center space-x-2.5 text-xs p-3 rounded-2xl max-w-[85%]"
                style={{
                  color: 'var(--accent-cyan)',
                  background: 'var(--accent-cyan-bg)',
                  border: '1px solid var(--accent-cyan-border)',
                  borderRadius: '0.25rem 1.25rem 1.25rem 1.25rem',
                }}
              >
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                <div className="flex items-center space-x-1">
                  <span>AI đang tra cứu dữ liệu xe</span>
                  <span className="flex space-x-1 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Sleek Input Bar ── */}
          <div
            className="p-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}
          >
            <div
              className="flex items-center space-x-2 p-1.5 rounded-2xl transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Nhập câu hỏi về chi phí, bảo dưỡng, ODO..."
                className="flex-1 px-2.5 py-1.5 bg-transparent text-xs outline-none font-medium"
                style={{ color: 'var(--text-primary)' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl text-white transition disabled:opacity-30 hover:scale-105 active:scale-95 cursor-pointer shadow-md shadow-cyan-500/20"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #2563EB)' }}
                title="Gửi tin nhắn (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-center mt-1.5 opacity-50" style={{ color: 'var(--text-muted)' }}>
              Nhấn Enter để gửi • Hỗ trợ truy vấn thông minh toàn bộ dữ liệu xe
            </p>
          </div>
        </>
      )}
    </div>
  );
};
