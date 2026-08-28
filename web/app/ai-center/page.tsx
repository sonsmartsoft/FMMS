'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Zap, Car, DollarSign, Wrench, BarChart3 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  { label: 'Phân tích chi phí tháng này', icon: DollarSign },
  { label: 'Xe nào cần bảo dưỡng gấp?', icon: Wrench },
  { label: 'So sánh mức tiêu thụ xăng', icon: Car },
  { label: 'Dự báo chi phí tháng tới', icon: BarChart3 },
];

const DEMO_RESPONSES: Record<string, string> = {
  default: `Tôi là **FMMS AI Assistant** — trợ lý thông minh cho hệ thống quản lý phương tiện gia đình của bạn.

Tôi có thể giúp bạn:
- 📊 Phân tích chi phí TCO theo từng xe
- 🔧 Nhắc nhở lịch bảo dưỡng thông minh
- ⛽ Tối ưu hóa tiêu thụ nhiên liệu
- 💰 Theo dõi khoản vay và tiết kiệm
- 🗺️ Phân tích hành trình di chuyển

Hãy hỏi tôi bất cứ điều gì về đội phương tiện của bạn!`,

  'Phân tích chi phí tháng này': `📊 **Phân tích chi phí tháng 8/2026:**

| Danh mục | Chi phí | % |
|----------|---------|---|
| Nhiên liệu | 1,506,950 ₫ | 54.3% |
| Bảo dưỡng | 1,250,000 ₫ | 45.1% |
| Đỗ xe | 120,000 ₫ | 4.3% |

**Tổng tháng 8:** ~2,876,950 ₫

💡 **Nhận xét:** Chi phí nhiên liệu tháng này tăng so với tháng 7 do chuyến đi Hải Phòng (118.5km). Tiêu thụ trung bình 7.1 L/100km, nằm trong ngưỡng bình thường.`,

  'Xe nào cần bảo dưỡng gấp?': `🔧 **Lịch bảo dưỡng khẩn cấp:**

🔴 **BMW S1000RR** — Ưu tiên CAO
- Bảo hiểm TNDS đã hết hạn từ 11/2025
- Bảo hiểm vật chất hết hạn 11/2025
- Cần gia hạn ngay để đảm bảo pháp lý

🟡 **Mazda2 Base 2026** — Theo dõi
- Bảo dưỡng định kỳ 15,000 km (hiện: 12,846 km)
- Còn ~2,154 km hoặc đến 15/10/2026
- Dự kiến khoảng 1.2 - 1.5 triệu ₫

✅ **Road Bike Specialized** — OK
- Kiểm tra dầu xích sau 100km tiếp theo`,

  'So sánh mức tiêu thụ xăng': `⛽ **So sánh tiêu thụ nhiên liệu:**

**Mazda2 Base 2026 (1.5L SkyActiv-G)**
- Trung bình: 6.9 L/100km
- Tốt nhất: 6.7 L/100km (đường cao tốc)
- Cao nhất: 8.4 L/100km (nội thành giờ cao điểm)

**BMW S1000RR (999cc)**
- Trung bình: 6.2 L/100km
- Cao hơn kỳ vọng do chạy êm

💡 **Gợi ý tiết kiệm:**
- Mazda2: Đổ xăng tại Petrolimex tiết kiệm ~200₫/L so với Shell
- Tránh giờ cao điểm giảm 15-20% tiêu thụ`,

  'Dự báo chi phí tháng tới': `📈 **Dự báo chi phí tháng 9/2026:**

**Dựa trên xu hướng 3 tháng gần đây:**

| Hạng mục | Ước tính |
|----------|----------|
| Nhiên liệu (Mazda2 + BMW) | 1,400,000 ₫ |
| Đỗ xe hàng tháng | 120,000 ₫ |
| Chi phí phát sinh khác | 200,000 ₫ |
| **Tổng ước tính** | **~1,720,000 ₫** |

⚠️ **Lưu ý đặc biệt:**
- Tháng 9: Đến hạn bảo dưỡng 15,000 km của Mazda2 (~1,250,000 ₫)
- Tổng có thể lên đến **~2,970,000 ₫** nếu bảo dưỡng trong tháng`,
};

export default function AiCenterPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: DEMO_RESPONSES.default },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const q = text || input.trim();
    if (!q) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 800));

    const reply = DEMO_RESPONSES[q] || `Tôi đã nhận câu hỏi: **"${q}"**

Đây là phiên bản demo — AI đang được kết nối với Gemini API. Khi đã cấu hình API Key trong *Cài đặt → Cấu hình AI Providers*, tôi sẽ phân tích dữ liệu thực tế từ Supabase của bạn và trả lời chi tiết hơn.

Hiện tại, tôi có thể trả lời các câu hỏi mẫu — hãy nhấn vào các gợi ý bên dưới!`;

    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setLoading(false);
  };

  const renderContent = (text: string) => {
    // Simple markdown-like renderer
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-bold" style={{ color: 'var(--text-primary)' }}>{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('| ') && line.includes(' | ')) {
        return null; // skip table rows for simplicity
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4" style={{ color: 'var(--text-secondary)' }}>{line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
      }
      if (line.startsWith('#')) {
        return <p key={i} className="font-bold text-sm mt-2" style={{ color: 'var(--text-primary)' }}>{line.replace(/^#+\s/, '')}</p>;
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
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold flex items-center space-x-3" style={{ color: 'var(--text-primary)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(56,189,248,0.3))', border: '1px solid rgba(139,92,246,0.4)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <span>AI Center</span>
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Trợ lý AI thông minh phân tích dữ liệu phương tiện · Powered by Gemini
        </p>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl mb-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={msg.role === 'assistant'
                ? { background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(56,189,248,0.3))', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--accent-cyan)' }
                : { background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-1 ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
              style={msg.role === 'user'
                ? { background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)', color: 'var(--accent-cyan)' }
                : { background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              {msg.role === 'assistant' ? renderContent(msg.content) : <p style={{ color: 'var(--accent-cyan)' }}>{msg.content}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(56,189,248,0.3))', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--accent-cyan)' }}>
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl rounded-tl-sm" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
              <div className="flex space-x-1.5">
                {[0, 1, 2].map(j => (
                  <span key={j} className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'var(--accent-cyan)', animationDelay: `${j * 150}ms` }} />
                ))}
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
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition hover:opacity-80"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            <Icon className="w-3 h-3" style={{ color: 'var(--accent-cyan)' }} />
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
          placeholder="Hỏi về chi phí, bảo dưỡng, tiêu thụ nhiên liệu..."
          className="theme-input flex-1"
          style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--accent-cyan)', color: 'white' }}>
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
