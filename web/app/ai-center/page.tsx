'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Car, DollarSign, Wrench, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';
import { getActiveAISettings } from '@/lib/services/aiConfig';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  providerUsed?: string;
}

const QUICK_PROMPTS = [
  { label: 'Phân tích chi phí xe trong tháng này', icon: DollarSign },
  { label: 'Xe nào sắp đến hạn bảo dưỡng?', icon: Wrench },
  { label: 'So sánh mức tiêu thụ xăng và chi phí nhiên liệu', icon: Car },
  { label: 'Dự báo chi phí vận hành tháng tới', icon: BarChart3 },
];

const INITIAL_MESSAGE = `Tôi là **FMMS AI Assistant** — trợ lý thông minh cho hệ thống quản lý phương tiện gia đình của bạn.

Tôi có thể giúp bạn:
- 📊 Phân tích chi phí và tổng tiền đã chi cho từng xe
- 🔧 Nhắc nhở và kiểm tra hạn bảo dưỡng xe
- ⛽ Tính toán tiêu thụ nhiên liệu (L/100km)
- 💰 Quản lý dư nợ khoản vay mua xe
- 🗺️ Tổng hợp lộ trình di chuyển

Hãy hỏi tôi bất cứ câu hỏi nào về các phương tiện của bạn!`;

export default function AiCenterPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = text || input.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    try {
      const active = getActiveAISettings();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: q,
          provider: active.provider,
          model: active.model,
          apiKey: active.apiKey,
          baseUrl: active.baseUrl,
        }),
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply || 'AI không trả về kết quả.',
          providerUsed: data.providerUsed,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Không thể kết nối với server AI. Vui lòng kiểm tra lại kết nối mạng hoặc Cài đặt AI.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold my-1" style={{ color: 'var(--text-primary)' }}>{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        return (
          <li key={i} className="ml-4 list-disc" style={{ color: 'var(--text-secondary)' }}>
            {line.slice(2).split(/\*\*(.*?)\*\*/).map((part, j) =>
              j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part
            )}
          </li>
        );
      }
      if (line.startsWith('### ')) {
        return <h4 key={i} className="font-extrabold text-xs mt-3 mb-1" style={{ color: 'var(--accent-cyan)' }}>{line.replace(/^###\s/, '')}</h4>;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        return <h3 key={i} className="font-bold text-sm mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{line.replace(/^#+\s/, '')}</h3>;
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      return (
        <p key={i} style={{ color: 'var(--text-secondary)' }}>
          {line.split(/\*\*(.*?)\*\*/).map((part, j) =>
            j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text-primary)' }}>{part}</strong> : part
          )}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] animate-fadeIn">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center space-x-3" style={{ color: 'var(--text-primary)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <span>AI Center</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Trợ lý AI thông minh phân tích dữ liệu phương tiện thực tế · Google Gemini &amp; OpenAI
          </p>
        </div>
        <Link
          href="/settings/ai"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Cấu hình AI</span>
        </Link>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl mb-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={msg.role === 'assistant'
                ? { background: 'linear-gradient(135deg, rgba(14,165,233,0.25), rgba(139,92,246,0.25))', border: '1px solid rgba(14,165,233,0.3)', color: 'var(--accent-cyan)' }
                : { background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[82%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              style={msg.role === 'user'
                ? { background: 'var(--accent-cyan)', color: 'white' }
                : { background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              {msg.role === 'assistant' ? renderContent(msg.content) : <p className="text-white font-medium">{msg.content}</p>}
              {msg.providerUsed && (
                <p className="text-[9px] font-mono text-right pt-1 opacity-60">⚡ {msg.providerUsed}</p>
              )}
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
                <span>AI đang phân tích số liệu thực tế...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 mb-3">
        {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => send(label)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition hover:opacity-80 cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent-cyan)' }} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Hỏi về chi phí, định mức xăng/pin, lịch bảo dưỡng các xe..."
          className="theme-input flex-1"
          style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition hover:opacity-80 disabled:opacity-40 shadow-md cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)', color: 'white' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
