'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, User, Mic, Cpu, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  toolCall?: {
    name: string;
    status: 'EXECUTED' | 'CONFIRMED';
    result?: string;
  };
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

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
    };

    setMessages((prev) => [...prev, userMsg]);
    const promptText = input;
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          provider,
          assetId: currentAssetId,
        }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.reply || 'Đã phân tích dữ liệu phương tiện của bạn.',
        toolCall: data.toolCall,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Tháng 8/2026, Mazda2 Base đã chạy 644 km với tổng chi phí nhiên liệu 808,500 ₫ (mức tiêu thụ 6.9L/100km). Bảo dưỡng tiếp theo tại mốc 15,000 km.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md glass-panel border-l border-slate-700 shadow-2xl flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 text-white shadow-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">FMMS AI Assistant</h3>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Provider:</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="bg-slate-800 text-cyan-300 font-bold border border-slate-700 rounded px-1 py-0.5 text-[10px] focus:outline-none"
              >
                <option value="Gemini">Google Gemini</option>
                <option value="OpenAI">OpenAI GPT-4o</option>
                <option value="Claude">Anthropic Claude</option>
                <option value="LocalLLM">Local LLM</option>
              </select>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                m.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gradient-to-tr from-cyan-500 to-purple-600 text-white'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div className="space-y-1 max-w-[80%]">
              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none'
                }`}
              >
                {m.text}
              </div>

              {m.toolCall && (
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-200 flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Tool: <strong>{m.toolCall.name}</strong> - {m.toolCall.result || 'Đã truy vấn DB'}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-cyan-400 p-2 bg-slate-900/40 rounded-xl">
            <Sparkles className="w-4 h-4 animate-spin" />
            <span>AI đang truy vấn context & phân tích...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center space-x-2">
        <button
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 transition"
          title="Nhập bằng giọng nói (Voice StT)"
        >
          <Mic className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Hỏi AI (vd: Mazda2 tháng này tốn bao nhiêu tiền xăng?)..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold disabled:opacity-50 hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
