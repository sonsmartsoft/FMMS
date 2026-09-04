'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { X, Send, Sparkles, Bot, User, CheckCircle2, Settings, Trash2, Maximize2, RotateCcw, ArrowUpRight, MessageSquareText, Layers, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { MODERN_AI_PROVIDERS, getActiveAISettings } from '@/lib/services/aiConfig';
import { useAIChat } from '@/lib/hooks/useAIChat';
import { MarkdownMessage } from './MarkdownMessage';

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssetId?: string;
}

// Dynamic prompt catalog organized by context
const PROMPT_CATALOG: Record<string, string[]> = {
  general: [
    '⚡ Tóm tắt chi phí đội xe tháng này',
    '🔧 Xe nào cần kiểm tra bảo dưỡng?',
    '⛽ Mức tiêu thụ nhiên liệu Mazda 2?',
    '💰 Dư nợ vay ngân hàng hiện tại?',
    '📊 Đánh giá hiệu quả sử dụng xe',
    '🛡️ Kiểm tra hạn đăng kiểm và bảo hiểm',
  ],
  finance: [
    '💰 Tổng tiền lãi vay ngân hàng đã trả?',
    '📊 Chi phí vận hành tháng này gồm những gì?',
    '💳 Lịch đóng gốc/lãi kỳ tiếp theo?',
    '📈 Dự toán chi phí phát sinh 3 tháng tới?',
    '📉 So sánh chi phí thực tế với ngân sách?',
  ],
  fuel: [
    '⛽ Mức tiêu thụ trung bình của Mazda 2?',
    '📊 Tổng chi phí xăng dầu tháng này?',
    '🚗 Xe nào tiết kiệm nhiên liệu nhất?',
    '📉 Lần đổ xăng gần nhất ở đâu, bao nhiêu lít?',
  ],
  maintenance: [
    '🔧 Xe nào sắp đến hạn bảo dưỡng định kỳ?',
    '🛠️ Chi phí bảo dưỡng gần nhất là bao nhiêu?',
    '📋 Hạng mục bảo dưỡng mốc 10.000km xe Mazda?',
    '🛡️ Kiểm tra hạn bảo hành các phụ tùng độ',
  ],
  vehicle: [
    '📊 Tổng chi phí sở hữu TCO của xe này?',
    '🔧 Lịch bảo dưỡng tiếp theo và mốc km?',
    '⛽ Tiêu thụ nhiên liệu thực tế / 100km?',
    '💳 Tình hình dư nợ khoản vay của xe?',
    '📝 Các phụ tùng nâng cấp đã lắp đặt?',
  ],
};

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose, currentAssetId }) => {
  const pathname = usePathname();
  const [input, setInput] = useState('');
  const [activeProvider, setActiveProvider] = useState('gemini');
  const [selectedCategory, setSelectedCategory] = useState<'AUTO' | 'ALL' | 'FINANCE' | 'FUEL' | 'MAINTENANCE'>('AUTO');
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const { messages, loading, sendMessage, clearHistory } = useAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveAISettings();
      setActiveProvider(active.provider);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Context-aware dynamic prompts
  const dynamicPrompts = useMemo(() => {
    let pool: string[] = [];

    if (selectedCategory === 'FINANCE') {
      pool = PROMPT_CATALOG.finance;
    } else if (selectedCategory === 'FUEL') {
      pool = PROMPT_CATALOG.fuel;
    } else if (selectedCategory === 'MAINTENANCE') {
      pool = PROMPT_CATALOG.maintenance;
    } else if (selectedCategory === 'ALL') {
      pool = [
        ...PROMPT_CATALOG.general,
        ...PROMPT_CATALOG.finance,
        ...PROMPT_CATALOG.fuel,
        ...PROMPT_CATALOG.maintenance,
      ];
    } else {
      // AUTO detection from URL route
      if (pathname.includes('/finance')) {
        pool = [...PROMPT_CATALOG.finance, ...PROMPT_CATALOG.general];
      } else if (pathname.includes('/fuel')) {
        pool = [...PROMPT_CATALOG.fuel, ...PROMPT_CATALOG.general];
      } else if (pathname.includes('/maintenance')) {
        pool = [...PROMPT_CATALOG.maintenance, ...PROMPT_CATALOG.general];
      } else if (pathname.includes('/assets/')) {
        pool = [...PROMPT_CATALOG.vehicle, ...PROMPT_CATALOG.maintenance];
      } else {
        pool = PROMPT_CATALOG.general;
      }
    }

    // Rotate/shuffle 4 items based on shuffleIndex
    const start = (shuffleIndex * 4) % pool.length;
    const selected = [];
    for (let i = 0; i < Math.min(4, pool.length); i++) {
      selected.push(pool[(start + i) % pool.length]);
    }
    return selected;
  }, [selectedCategory, pathname, shuffleIndex]);

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
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[430px] h-[600px] max-h-[88vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out animate-slideUp"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 35px -5px rgba(14, 165, 233, 0.25)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* ── Live Chat Header ── */}
      <div
        className="px-4 py-3 flex items-center justify-between select-none shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(59,130,246,0.08))',
          borderBottom: '1px solid var(--border-default)',
        }}
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
                FMMS AI Assistant
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
        <div className="flex items-center space-x-1">
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
            onClick={onClose}
            className="p-1.5 rounded-xl transition hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 cursor-pointer"
            title="Thu về nút tròn AI"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Dynamic Quick Prompts Bar ── */}
      <div className="px-3 py-2 space-y-1.5 shrink-0" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-default)' }}>
        <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center space-x-1 font-bold">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Gợi ý câu hỏi nhanh:</span>
          </div>
          <button
            onClick={() => setShuffleIndex((prev) => prev + 1)}
            className="flex items-center space-x-1 text-cyan-400 hover:underline cursor-pointer"
            title="Đổi bộ câu hỏi khác"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Đổi gợi ý</span>
          </button>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {dynamicPrompts.map((prompt, idx) => (
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
              <ArrowUpRight className="w-2.5 h-2.5 opacity-60 text-cyan-400" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages Scroll Area ── */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.length === 0 && (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="w-12 h-12 rounded-3xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 shadow-inner">
              <MessageSquareText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Xin chào! Tôi là FMMS AI Assistant</h4>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Bấm vào các gợi ý nhanh phía trên hoặc gõ câu hỏi để tôi tra cứu số liệu xăng, bảo dưỡng, TCO hay chi phí của xe.
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
    </div>
  );
};
