# 🎨 REUSABLE UI/UX & ARCHITECTURE PATTERNS BLUEPRINT
> **Tài liệu đặc tả kiến trúc UI/UX, AI Provider Hub, Master Data & Component Design System chuẩn mực.**
> *File này đóng vai trò là sách mẫu thiết kế (Design Blueprint) để Antigravity AI và Developer có thể học, tái tạo và nhân bản chính xác cấu trúc này cho các dự án và hệ thống tiếp theo.*

---

## 📑 MỤC LỤC
1. [Hệ Thống Thẻ KPI Gradient & Hiệu Ứng Hover Glow](#1-hệ-thống-thẻ-kpi-gradient--hiệu-ứng-hover-glow)
2. [Hệ Thống Cửa Sổ Popup Đa Năng (DraggableModal)](#2-hệ-thống-cửa-sổ-popup-đa-năng-draggablemodal)
3. [Trung Tâm Cấu Hình AI Đa Nhà Cung Cấp (Multi-LLM Provider Setup)](#3-trung-tâm-cấu-hình-ai-đa-nhà-cung-cấp-multi-llm-provider-setup)
4. [Hệ Thống Live Chat & AI Assistant Thông Minh](#4-hệ-thống-live-chat--ai-assistant-thông-minh)
5. [Kiến Trúc Quản Lý Dữ Liệu Danh Mục Dùng Chung (Master Data Hub)](#5-kiến-trúc-quản-lý-dữ-liệu-danh-mục-dùng-chung-master-data-hub)
6. [Biểu Đồ Ma Trận Phân Bố 12 Tháng / Đa Năm (Matrix Heatmap)](#6-biểu-đồ-ma-trận-phân-bố-12-tháng--đa-năm-matrix-heatmap)
7. [Bảng Màu Semantic & Biến Theme Chuẩn (Design Tokens)](#7-bảng-màu-semantic--biến-theme-chuẩn-design-tokens)

---

## 1. HỆ THỐNG THẺ KPI GRADIENT & HIỆU ỨNG HOVER GLOW

### 🎯 Triết lý thiết kế (Design Philosophy)
- Không dùng thẻ phẳng (flat card) nhàm chán hoặc bóng mờ xám đơn điệu.
- Mỗi thẻ chỉ số đại diện cho 1 miền dữ liệu nghiệp vụ riêng biệt, mang một **Mã màu nhận diện (Semantic Brand Color)**.
- **Glassmorphism hiện đại:** Nền bán trong suốt `rgba(R, G, B, 0.12)` kết hợp viền mờ `rgba(R, G, B, 0.3)`.
- **Micro-interaction đỉnh cao:** Khi di chuột vào (hover), thẻ phóng to nhẹ (`scale-[1.02]`), viền sáng lên và đổ bóng hào quang (Color Glow Shadow) cùng màu với thẻ.

### 📐 Code mẫu chuẩn (TypeScript / React / Tailwind)

```tsx
interface KpiCardConfig {
  id: string;
  title: string;
  subtitle: string;
  value: string | number;
  color: string;      // Hex: e.g. '#3B82F6'
  bg: string;         // rgba: e.g. 'rgba(59, 130, 246, 0.12)'
  border: string;     // rgba: e.g. 'rgba(59, 130, 246, 0.3)'
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  detailText: string;
}

export function KpiCard({ card, onClick }: { card: KpiCardConfig; onClick?: () => void }) {
  const Icon = card.icon;
  return (
    <div
      onClick={onClick}
      className="group relative p-4 sm:p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: card.bg,
        borderColor: card.border,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 10px 30px -5px ${card.color}35`;
        e.currentTarget.style.borderColor = card.color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = card.border;
      }}
    >
      {/* Background Ambient Light Beam */}
      <div 
        className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40 group-hover:opacity-80 transition duration-500"
        style={{ background: card.color }}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">
          {card.title}
        </span>
        <div 
          className="p-2 rounded-xl transition duration-300 group-hover:rotate-6 group-hover:scale-110"
          style={{ background: `${card.color}20`, color: card.color }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-2">
        <div 
          className="text-xl sm:text-2xl font-black font-mono tracking-tight"
          style={{ color: card.color }}
        >
          {card.value}
        </div>
        <p className="text-[11px] font-medium text-muted mt-0.5 truncate">
          {card.subtitle}
        </p>
      </div>

      <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px] text-muted font-mono">
        <span className="truncate">{card.detailText}</span>
        <span className="group-hover:translate-x-1 transition text-cyan-400 font-bold ml-1">→</span>
      </div>
    </div>
  );
}
```

---

## 2. HỆ THỐNG CỬA SỔ POPUP ĐA NĂNG (DraggableModal)

### 🎯 Vấn đề & Giải pháp
- Modal mặc định (cố định giữa màn hình) thường che mất dữ liệu tham chiếu ở phía dưới.
- `DraggableModal` cho phép người dùng:
  1. **Kéo di chuyển (Drag)** cửa sổ đi bất kỳ đâu trên màn hình.
  2. **Thu nhỏ (Minimize)** xuống thanh Dock dưới cùng khi cần tra cứu tài liệu bên dưới.
  3. **Phóng to toàn màn hình (Maximize)** để xem bảng dữ liệu lớn.
  4. **Chống "dính chuột" tuyệt đối:** Sử dụng Pointer Events lắng nghe trên `window` để không bị mất trỏ chuột khi kéo nhanh qua viền.

### 📐 Cấu trúc triển khai chuẩn (`components/ui/DraggableModal.tsx`)

```tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export default function DraggableModal({
  isOpen,
  children,
  className = '',
  onClose,
  title,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  title?: string;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMoved, setIsMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaxSize = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Global Pointer Listener chống dính chuột
  useEffect(() => {
    if (!isDragging) return;
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.current.x,
          y: Math.max(10, e.clientY - dragStart.current.y),
        });
      }
    };
    const handlePointerUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        ref={modalRef}
        className={`relative flex flex-col rounded-2xl shadow-2xl border transition-all animate-scale-up ${className}`}
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-default)',
          transform: isMoved && !isMaximized ? `translate(${position.x}px, ${position.y}px)` : undefined,
          width: isMaximized ? '100vw' : undefined,
          height: isMaximized ? '100vh' : isMinimized ? '46px' : undefined,
        }}
      >
        {/* Header (Drag Handle) */}
        <div
          onPointerDown={(e) => {
            if (isMaximized || isMinimized) return;
            const rect = modalRef.current?.getBoundingClientRect();
            if (rect) {
              dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
              setIsMoved(true);
              setIsDragging(true);
            }
          }}
          className="flex items-center justify-between px-4 py-3 border-b select-none cursor-move"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}
        >
          <h3 className="text-xs font-bold uppercase tracking-wide truncate pr-2" style={{ color: 'var(--text-primary)' }}>
            {title || 'Chi tiết'}
          </h3>

          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setIsMinimized(!isMinimized)} 
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted transition"
              title={isMinimized ? 'Mở lại' : 'Thu nhỏ'}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setIsMaximized(!isMaximized)} 
              className="p-1.5 rounded-lg hover:bg-white/10 text-muted transition"
              title={isMaximized ? 'Thu nhỏ lại' : 'Phóng to'}
            >
              {isMaximized ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-muted hover:text-rose-500 transition"
              title="Đóng (ESC)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 no-drag" style={{ background: 'var(--bg-primary)' }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 3. TRUNG TÂM CẤU HÌNH AI ĐA NHÀ CUNG CẤP (MULTI-LLM PROVIDER SETUP)

### 🎯 Mô hình kiến trúc Hub AI
Hệ thống không bị phụ thuộc (vendor lock-in) vào duy nhất 1 hãng AI, mà hỗ trợ chuyển đổi linh hoạt giữa:
1. **Google Gemini:** Miễn phí, tốc độ cao (Gemini 2.5 Flash / 1.5 Pro).
2. **OpenAI:** GPT-4o, GPT-4o-mini, o3-mini.
3. **DeepSeek:** V3 (Chat thông minh) & R1 (Suy luận sâu toán học).
4. **Anthropic Claude:** Claude 3.7 Sonnet, Claude 3.5 Haiku.
5. **Groq:** Tốc độ phản hồi tức thì (Llama 3.3 70B @ 500 tokens/s).
6. **Local LLM (Ollama):** Chạy offline trên máy chủ riêng biệt.

### 📐 Schema Provider Data Model (`lib/services/aiConfig.ts`)

```typescript
export interface ProviderConfig {
  id: string;
  name: string;
  label: string;
  description: string;
  defaultBaseUrl: string;
  defaultModel: string;
  modelOptions: string[];
  docsUrl: string;
  color: string;
  type: 'openai' | 'gemini' | 'claude' | 'custom';
}

export interface UserAiSettings {
  activeProvider: string;
  apiKeys: Record<string, string>; // provider_id -> apiKey
  customBaseUrls: Record<string, string>;
  selectedModels: Record<string, string>;
  temperature: number;
  systemPromptPreset: 'concise' | 'expert' | 'financial' | 'diagnostic';
}
```

---

## 4. HỆ THỐNG LIVE CHAT & AI ASSISTANT THÔNG MINH

### 🎯 Điểm đặc biệt của Live Chat
1. **Bơm ngữ cảnh tự động (Dynamic Context Injection):** Khi người dùng mở chat ở bất kỳ màn hình nào (ví dụ đang ở xe Mazda 2), Chatbot tự động đọc: ODO hiện tại, số lỗi OBD active, chi phí đã tiêu, nhắc bảo dưỡng tiếp theo và truyền vào System Prompt ngầm.
2. **Action Dispatcher (Gọi lệnh trực tiếp từ Chat):** AI có thể đề xuất nút bấm tương tác: `[Tạo phiếu bảo dưỡng]`, `[Tra cứu mã lỗi]`, `[Chuyển đến tab Chi phí]`.
3. **Markdown & Code Highlighting:** Render bảng biểu, công thức toán KaTeX và code block mượt mà.

```typescript
export async function generateSystemContext(assetId: string) {
  const asset = await getAsset(assetId);
  const dtcLogs = await diagnosticService.getDtcLogs(assetId, true);
  const expenses = await getExpenses(assetId);

  return `
Bạn là Trợ lý AI Chuyên gia Quản lý Đội xe & Kỹ thuật Ô tô của hệ thống FMMS.
Thông tin xe người dùng đang xem:
- Tên xe: ${asset.name} (${asset.license_plate})
- ODO hiện tại: ${asset.current_odometer_km} km
- Trạng thái lỗi OBD: ${dtcLogs.length > 0 ? `Có ${dtcLogs.length} lỗi active (${dtcLogs.map(d => d.dtc_code).join(', ')})` : 'Xe hoàn toàn khỏe mạnh, 0 lỗi'}
- Tổng chi phí đã ghi nhận: ${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()} VNĐ.
Hãy trả lời ngắn gọn, chuẩn chuyên môn kỹ thuật, xưng hô thân thiện và đưa ra giải pháp rõ ràng.
`;
}
```

---

## 5. KIẾN TRÚC QUẢN LÝ DỮ LIỆU DANH MỤC DÙNG CHUNG (MASTER DATA HUB)

### 🎯 Nguyên tắc quản lý Master Data
- Dữ liệu danh mục (Chi phí, Phụ tùng, Garage, Lỗi OBD, Nhãn xe) được tập trung tại 1 Hub duy nhất.
- **Phân cấp 2 tầng (Category & Subcategory):** Quản lý quan hệ cha-con linh hoạt.
- **Bảo vệ toàn vẹn dữ liệu (Integrity Protection):** Khi một danh mục đang có các bản ghi chi phí hoặc phụ tùng sử dụng $	o$ Không cho phép xóa cứng, mà hỗ trợ **Chuyển gộp (Merge)** hoặc **Đổi tên inline**.
- **Color Badge Mapping:** Mỗi danh mục được gắn mã màu riêng để đồng bộ hiển thị lên biểu đồ tròn (Pie/Donut Charts).

---

## 6. BIỂU ĐỒ MA TRẬN PHÂN BỐ 12 THÁNG / ĐA NĂM (MATRIX HEATMAP)

### 🎯 Điểm nổi bật
- Thay vì biểu đồ cột truyền thống chiếm nhiều diện tích, **Ma trận phân bố (Categorical Matrix Heatmap)** hiển thị toàn bộ phân nhóm dữ liệu (VD: Lỗi P, C, B, U) trên trục 12 tháng chỉ trong 1 khung nhìn gọn gàng.
- **Chế độ Tất cả các năm (All Years):** Tự động gom và cộng dồn (SUM) số liệu của toàn bộ lịch sử xe để tìm ra quy luật theo mùa.
- **Chế độ Từng năm:** Bấm chuyển nhanh 2026, 2025...
- **Tương tác Drill-Down:** Click vào bất kỳ ô nào có số $	o$ Mở ngay `DraggableModal` hiển thị toàn bộ danh sách chi tiết các bản ghi tương ứng.

---

## 7. BẢNG MÀU SEMANTIC & BIẾN THEME CHUẨN (DESIGN TOKENS)

```css
:root {
  /* Nền và bề mặt */
  --bg-primary: #0f172a;        /* Nền chính sâu */
  --bg-secondary: #1e293b;      /* Nền card / modal */
  --bg-hover: rgba(255, 255, 255, 0.05);
  
  /* Viền và đường kẻ */
  --border-default: rgba(255, 255, 255, 0.1);
  --border-subtle: rgba(255, 255, 255, 0.05);

  /* Màu chủ đạo (Accent Colors) */
  --accent-cyan: #06b6d4;
  --accent-blue: #3b82f6;
  --accent-purple: #a855f7;
  --accent-amber: #f59e0b;
  --accent-emerald: #10b981;
  --accent-rose: #f43f5e;

  /* Màu trạng thái nghiệp vụ */
  --status-green: #10b981;
  --status-amber: #f59e0b;
  --status-rose: #f43f5e;
}
```

---
*Tài liệu này được xuất bản và lưu trữ vĩnh viễn trong kho mã nguồn FMMS (`docs/REUSABLE_SYSTEM_DESIGN_PATTERNS.md`) để phục vụ sao chép và phát triển mở rộng cho mọi dự án tương lai.*
