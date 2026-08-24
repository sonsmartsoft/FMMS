# 📘 LỊCH SỬ PHÁT TRIỂN & QUY CHUẨN KỸ THUẬT FMMS WEB APP
> **Hệ Thống Quản Lý Đội Xe Gia Đình (Family Mobility Management System - FMMS)**  
> **Cập nhật lần cuối:** 24/08/2026

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Web App](#1-tổng-quan-kiến-trúc-web-app)
2. [Lịch Sử Thay Đổi & Sửa Lỗi UI/UX Toàn Hệ Thống](#2-lịch-sử-thay-đổi--sửa-lỗi-uiux-toàn-hệ-thống)
3. [Quy Chuẩn Thiết Kế Modal / Popup Chuẩn (Bắt Buộc Tuân Thủ)](#3-quy-chuẩn-thiết-kế-modal--popup-chuẩn-bắt-buộc-tuân-thủ)
4. [Quy Chuẩn Form Inputs & Search Bars Toàn Cục](#4-quy-chuẩn-form-inputs--search-bars-toàn-cục)
5. [Hệ Thống Màu Sắc & CSS Variables (Light / Dark Mode)](#5-hệ-thống-màu-sắc--css-variables-light--dark-mode)
6. [Tích Hợp Supabase Backend & Xác Thực (Auth)](#6-tích-hợp-supabase-backend--xác-thực-auth)
7. [Quản Lý Danh Mục Chi Phí 2 Tầng (Taxonomy Master Data)](#7-quản-lý-danh-mục-chi-phí-2-tầng-taxonomy-master-data)
8. [Các Lưu Ý Quan Trọng Cho Đợt Phát Triển Tiếp Theo](#8-các-lưu-ý-quan-trọng-cho-đợt-phát-triển-tiếp-theo)

---

## 1. TỔNG QUAN KIẾN TRÚC WEB APP

- **Framework:** Next.js 14+ (App Router), React 18, TypeScript.
- **Styling:** Tailwind CSS + Vanilla CSS Variables (`globals.css`).
- **Icons:** `lucide-react`.
- **Database / Backend:** Supabase PostgreSQL (RLS enabled), Supabase Storage, Supabase Auth với Next.js Middleware SSR (`@supabase/ssr`).
- **Layout:**
  - `Navbar` sticky ở đỉnh (`h-16` / 64px, `z-40`).
  - `Sidebar` cố định bên trái (`w-64`).
  - `Main Content` vùng cuộn tự do bên phải (`flex-1 max-w-7xl mx-auto p-6`).

---

## 2. LỊCH SỬ THAY ĐỔI & SỬA LỖI UI/UX TOÀN HỆ THỐNG

### 🔄 Đợt 1: Nâng cấp Multi-Column và Chuẩn hóa Kích thước Modal
- **Vấn đề trước đây:** Các popup/modal quá dài, hẹp, người dùng phải cuộn chuột tìm kiếm từng trường dữ liệu, giao diện thiếu chuyên nghiệp.
- **Giải pháp:**
  - Thiết kế lại layout modal thành **Multi-Column (Grid 2 cột / 3 cột)**.
  - Phân chia form thành các Section rõ ràng: `1. Thông tin chung`, `2. Chi phí & Thời hạn`, `3. Liên hệ / Ghi chú`.
  - Mở rộng chiều rộng modal sang `max-w-2xl` hoặc `max-w-3xl`.

### 🔄 Đợt 2: Sửa lỗi Popup bị Thu hẹp (Collapsed / Mất Nội Dung)
- **Vấn đề:** Ở màn hình Giấy tờ (`/documents`) và Bảo hiểm (`/warranties`), popup bị co lại thành một thanh tối mỏng, mất toàn bộ phần nhập liệu form.
- **Nguyên nhân cốt lõi:** Việc áp dụng `flex items-center justify-center` kết hợp `overflow-y-auto` trên cùng một div container duy nhất làm Flexbox tính toán sai chiều cao (`height: 0` / collapse) khi trình duyệt kích hoạt thanh cuộn.
- **Giải pháp:** Tách biệt thành mô hình 2 lớp chuẩn Tailwind UI (Lớp ngoài cuộn `overflow-y-auto`, lớp trong căn giữa `flex min-h-full items-center justify-center`).

### 🔄 Đợt 3: Sửa lỗi Popup bị Lệch Lên Quá Cao / Lấp Tiêu Đề (Header Clipping)
- **Vấn đề:** Popup bị đẩy lên quá sát đỉnh màn hình, lấp thanh tiêu đề trang và bị khuất phần header/section 1 của popup trên màn hình nhỏ.
- **Nguyên nhân:** Căn giữa theo toàn bộ viewport (`fixed inset-0`) mà không tính đến chiều cao của Navbar cố định (`64px`), dẫn đến tâm thị giác bị kéo lên cao so với vùng nội dung khả dụng.
- **Giải pháp:** Bổ sung `pt-20` (80px) vào inner container căn giữa, đảm bảo popup luôn xuất hiện ở trung tâm vùng nội dung dưới Navbar và không bao giờ bị cắt đỉnh khi cuộn.

### 🔄 Đợt 4: Sửa lỗi Icon Tìm Kiếm Đè Lên Text Toàn Hệ Thống
- **Vấn đề:** Các ô tìm kiếm (Search bar) có kính lúp đè trực tiếp lên chữ placeholder/input.
- **Nguyên nhân:** Class `.theme-input` trong `globals.css` được định nghĩa ngoài `@layer components`, khiến thuộc tính `padding-left: 0.75rem` ghi đè (override) class `pl-9` / `pl-10` của Tailwind CSS. Đồng thời một số trang dùng `top-2.5` cố định thay vì căn giữa theo chiều dọc.
- **Giải pháp:** 
  1. Đưa toàn bộ `.theme-input`, `.theme-select` vào `@layer components` trong `globals.css`.
  2. Chuẩn hóa vị trí icon tìm kiếm thành: `absolute left-3 top-1/2 -translate-y-1/2 z-10`.

---

## 3. QUY CHUẨN THIẾT KẾ MODAL / POPUP CHUẨN (BẮT BUỘC TUÂN THỦ)

Mọi Modal trong toàn bộ Web App **BẮT BUỘC** tuân thủ cấu trúc 2 lớp div sau:

```tsx
{/* ─── Standard Modal Template ─── */}
{isOpen && (
  /* Lớp 1 (Overlay Backdrop): Cố định toàn màn hình, quản lý cuộn và backdrop */
  <div 
    className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" 
    style={{ background: 'rgba(0,0,0,0.75)' }} 
    onClick={() => setIsOpen(false)}
  >
    {/* Lớp 2 (Centering Container): Căn giữa nội dung, cách top 80px (pt-20) để dưới Navbar */}
    <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">
      
      {/* Khung Card Modal Chính */}
      <div 
        className="rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden" 
        style={{ 
          border: '1px solid var(--border-default)', 
          background: 'var(--bg-secondary)', 
          maxHeight: 'min(85vh, 620px)' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div 
          className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" 
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span>Tiêu Đề Modal</span>
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Mô tả ngắn chức năng</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-xl hover:bg-black/10 transition" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Form Sections */}
        </div>

        {/* Sticky Footer */}
        <div 
          className="p-4 shrink-0 border-t flex space-x-2 z-20" 
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}
        >
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
            Lưu dữ liệu
          </button>
          <button onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-black/5 transition" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 4. QUY CHUẨN FORM INPUTS & SEARCH BARS TOÀN CỤC

### 🔍 Search Bar Chuẩn (Kính lúp không bao giờ đè text)
```tsx
<div className="relative flex-1 max-w-md">
  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--text-muted)' }} />
  <input
    type="text"
    className="theme-input pl-9"
    placeholder="Tìm kiếm..."
    value={search}
    onChange={e => setSearch(e.target.value)}
  />
</div>
```

### 📝 Form Inputs & Selects
- Luôn sử dụng class `.theme-input` hoặc `.theme-select`.
- Các input định lượng tiền tệ/số km dùng thêm font mono: `font-mono font-bold text-cyan-400`.
- Màu nền container input được quản lý tập trung bởi biến `var(--bg-input)`.

---

## 5. HỆ THỐNG MÀU SẮC & CSS VARIABLES (LIGHT / DARK MODE)

| CSS Variable | Light Mode | Dark Mode | Mục Đích Sử Dụng |
|---|---|---|---|
| `--bg-primary` | `#F0F4F8` (Xám nhạt) | `#0B132B` (Xanh đen đậm) | Nền chính của ứng dụng |
| `--bg-secondary` | `#FFFFFF` (Trắng) | `#1C2541` (Slate tối) | Nền thẻ Card / Modal chính |
| `--bg-card` | `rgba(255,255,255,0.85)` | `rgba(28,37,65,0.85)` | Thẻ bán trong suốt |
| `--bg-input` | `#FFFFFF` | `#111C38` | Nền các ô nhập liệu Form |
| `--text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Trắng sáng) | Văn bản chính, tiêu đề |
| `--text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Nhãn Form, phụ đề |
| `--border-default`| `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.12)`| Đường viền ngăn cách |

---

## 6. TÍCH HỢP SUPABASE BACKEND & XÁC THỰC (AUTH)

- **SSR Client:** `@supabase/ssr` cấu hình tại `lib/supabase/server.ts` và `lib/supabase/client.ts`.
- **Middleware Bảo Vệ:** `middleware.ts` tự động redirect người dùng chưa đăng nhập về `/login`.
- **Service Layer:**
  - `assetService.ts`: Quản lý danh sách phương tiện.
  - `fuelService.ts`: Nhật ký đổ xăng, tính l/100km.
  - `maintenanceService.ts`: Gói bảo dưỡng nhiều hạng mục con.
  - `expenseService.ts`: Quản lý chi phí 2 tầng (Category/SubCategory).
  - `loanService.ts`: Theo dõi tiến độ trả góp mua xe.

---

## 7. QUẢN LÝ DANH MỤC CHI PHÍ 2 TẦNG (TAXONOMY MASTER DATA)

Hệ thống phân cấp chi phí quản lý tại `/settings/master-data`:
1. **Category (Danh mục cấp 1):** `Fuel` (Nhiên liệu), `Maintenance` (Bảo dưỡng), `Insurance` (Bảo hiểm), `Registration` (Đăng kiểm/Giấy tờ), `Upgrade` (Đồ chơi/Nâng cấp), `Loan` (Khoản vay), `Other` (Khác).
2. **SubCategory (Danh mục cấp 2):** Chi tiết theo từng hãng/nhà cung cấp và loại hình cụ thể.

---

## 8. CÁC LƯU Ý QUAN TRỌNG CHO ĐỢT PHÁT TRIỂN TIẾP THEO

1. **Tuyệt đối không dùng `glass-panel` trực tiếp trên card modal**: Tránh các lỗi liên quan đến `will-change` hoặc `transform` làm sai lệch tọa độ fixed.
2. **Không kết hợp `flex items-center` và `overflow-y-auto` trên cùng một div**: Luôn dùng mô hình 2 lớp div (`overflow-y-auto` ở lớp ngoài và `flex min-h-full items-center justify-center pt-20` ở lớp trong).
3. **Thêm style inline với CSS Variable cho màu sắc**: Giúp đảm bảo tương thích 100% khi chuyển đổi Light Mode và Dark Mode mà không bị phụ thuộc vào class cố định của Tailwind.
4. **Mọi thay đổi giao diện phải kiểm tra đồng thời trên cả 9 màn hình**: `/dashboard`, `/assets`, `/assets/[id]`, `/fuel`, `/maintenance`, `/finance`, `/documents`, `/warranties`, `/settings/*`.
