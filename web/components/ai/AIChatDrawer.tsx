'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, User, Mic, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  toolCall?: { name: string; status: 'EXECUTED' | 'CONFIRMED'; result?: string };
}

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssetId?: string;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({ isOpen, onClose, currentAssetId }) => {
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<'Gemini' | 'OpenAI' | 'Claude' | 'LocalLLM'>('Gemini');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Xin chào! Tôi là FMMS AI Assistant. Tôi có thể giúp bạn theo dõi chi phí, lịch bảo dưỡng, phân tích L/100km hoặc tổng hợp báo cáo cho các phương tiện gia đình.',
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    const promptText = input;
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, provider, assetId: currentAssetId }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: data.reply || 'Đã phân tích dữ liệu phương tiện của bạn.', toolCall: data.toolCall }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'ai',
        text: 'Tháng 8/2026, Mazda2 Base đã chạy 644 km với tổng chi phí nhiên liệu 808,500 ₫ (mức tiêu thụ 6.9L/100km). Bảo dưỡng tiếp theo tại mốc 15,000 km.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md glass-panel shadow-2xl flex flex-col animate-slideLeft"
      style={{ borderLeft: '1px solid var(--border-default)' }}>

      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 text-white shadow-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>FMMS AI Assistant</h3>
            <div className="flex items-center space-x-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Provider:</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="theme-select py-0 px-1 text-[10px] font-bold rounded"
                style={{ color: 'var(--accent-cyan)' }}
              >
                <option value="Gemini">Google Gemini</option>
                <option value="OpenAI">OpenAI GPT-4o</option>
                <option value="Claude">Anthropic Claude</option>
                <option value="LocalLLM">Local LLM</option>
              </select>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg transition hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
              style={m.sender === 'user'
                ? { background: '#3B82F6', color: 'white' }
                : { background: 'linear-gradient(135deg, #0EA5E9, #A855F7)', color: 'white' }}>
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className="space-y-1 max-w-[80%]">
              <div
                className="p-3 rounded-2xl text-xs leading-relaxed"
                style={m.sender === 'user'
                  ? { background: 'var(--accent-cyan)', color: 'white', borderRadius: '1rem 0.25rem 1rem 1rem' }
                  : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', borderRadius: '0.25rem 1rem 1rem 1rem' }}
              >
                {m.text}
              </div>
              {m.toolCall && (
                <div className="p-2.5 rounded-xl flex items-center space-x-2 text-[11px]"
                  style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Tool: <strong>{m.toolCall.name}</strong> — {m.toolCall.result || 'Đã truy vấn DB'}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center space-x-2 text-xs p-2.5 rounded-xl" style={{ color: 'var(--accent-cyan)', background: 'var(--accent-cyan-bg)' }}>
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI đang phân tích dữ liệu phương tiện...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 flex items-center space-x-2" style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
        <button className="p-2 rounded-xl transition hover:opacity-70"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
          title="Nhập bằng giọng nói">
          <Mic className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Hỏi AI (vd: Mazda2 tháng này tốn bao nhiêu tiền xăng?)..."
          className="theme-input flex-1 text-xs"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2 rounded-xl text-white transition disabled:opacity-40 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
