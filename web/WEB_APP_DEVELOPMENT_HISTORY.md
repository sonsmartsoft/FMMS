# 📘 LỊCH SỬ PHÁT TRIỂN & QUY CHUẨN KỸ THUẬT FMMS WEB APP
> **Hệ Thống Quản Lý Đội Xe Gia Đình (Family Mobility Management System - FMMS)**  
> **Cập nhật lần cuối:** 01/09/2026

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc Web App](#1-tổng-quan-kiến-trúc-web-app)
2. [Lịch Sử Thay Đổi & Sửa Lỗi UI/UX Toàn Hệ Thống](#2-lịch-sử-thay-đổi--sửa-lỗi-uiux-toàn-hệ-thống)
3. [Quy Chuẩn Thiết Kế Modal / Popup Chuẩn (Bắt Buộc Tuân Thủ)](#3-quy-chuẩn-thiết-kế-modal--popup-chuẩn-bắt-buộc-tuân-thủ)
4. [Quy Chuẩn Form Inputs & Search Bars Toàn Cục](#4-quy-chuẩn-form-inputs--search-bars-toàn-cục)
5. [Hệ Thống Màu Sắc & CSS Variables (Light / Dark Mode)](#5-hệ-thống-màu-sắc--css-variables-light--dark-mode)
6. [Tích Hợp Supabase Backend & Xác Thực (Auth)](#6-tích-hợp-supabase-backend--xác-thực-auth)
7. [Quản Lý Danh Mục Chi Phí 2 Tầng (Taxonomy Master Data)](#7-quản-lý-danh-mục-chi-phí-2-tầng-taxonomy-master-data)
8. [Quy Chuẩn Thiết Kế Bộ Lọc Phương Tiện (Vehicle Filter Bar Rule)](#8-quy-chuẩn-thiết-kế-bộ-lọc-phương-tiện-vehicle-filter-bar-rule)
9. [Lịch Sử Các Đợt Phát Triển & Nâng Cấp](#9-lịch-sử-các-đợt-phát-triển--nâng-cấp)
10. [Các Lưu Ý Quan Trọng Cho Đợt Phát Triển Tiếp Theo](#10-các-lưu-ý-quan-trọng-cho-đợt-phát-triển-tiếp-theo)

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

### 🔄 Đợt 5: Sửa lỗi Schema Cache Khoản Vay & Bổ Sung Thêm Phương Tiện
- **Vấn đề 1:** Khi lưu/sửa khoản vay (`/finance`), Supabase báo lỗi `Could not find the 'floating_rate_percent' column of 'loans' in the schema cache`.
- **Nguyên nhân:** Service `loanService.ts` gửi các trường mở rộng (`floating_rate_percent`, `preferred_rate_percent`, `loan_ratio_percent`) mà trong bảng PostgreSQL `loans` chưa có các cột này.
- **Giải pháp:** Sanitize (lọc sạch) payload trong `createLoan` và `updateLoanFull`, chỉ gửi chính xác các cột thực tế tồn tại trong database bảng `loans`.
- **Vấn đề 2:** Nút "Thêm phương tiện" tại trang danh sách (`/assets`) bấm vào không phản hồi.
- **Giải pháp:** Bổ sung state `openAddModal`, `assetForm`, kết nối trực tiếp với service `createAsset`, và xây dựng đầy đủ Modal 2 lớp chuẩn hóa với đầy đủ thông số kỹ thuật, biển số, giá trị mua, odometer ban đầu.

### 🔄 Đợt 6: Chỉnh Sửa Từng Kỳ Trả Góp & Tái Thiết Kế Toàn Bộ Popup Giấy Tờ / Bảo Hiểm
- **Yêu cầu 1 (Sửa chi tiết từng kỳ vay):** Vì ngân hàng tính lãi theo số ngày làm việc thực tế của từng tháng nên số tiền lãi thực tế có thể khác so với dự kiến.
- **Giải pháp 1:**
  - Bổ sung nút ✏️ Chỉnh sửa kỳ thanh toán tại từng dòng của bảng Lịch trả nợ (cả ở `/finance` và `/assets/[id]`).
  - Cho phép người dùng linh hoạt điều chỉnh: Tiền gốc thực tế, Tiền lãi thực tế, Tổng tiền trả, Hạn thanh toán, Ngày đã trả và Trạng thái.
  - Cập nhật hàm `generateLoanSchedule` tự động ánh xạ dữ liệu kỳ đã chỉnh sửa đè lên lịch dự tính.
- **Yêu cầu 2 (Popup Giấy tờ & Bảo hiểm):** Sửa dứt điểm tình trạng popup bị cắt khuất hoặc không đủ form nhập liệu.
- **Giải pháp 2:**
  - Thiết kế lại Modal Giấy tờ & Bảo hiểm thành layout Grid 2 cột theo 3 Section rõ ràng (1. Phương tiện & Loại giấy tờ, 2. Đơn vị cấp & Thời hạn hiệu lực, 3. Chi phí, Hạn mức bồi thường & Hotline cứu hộ).
  - Sử dụng padding `py-12 px-4` ở lớp căn giữa kết hợp `maxHeight: 'min(88vh, 640px)'`, đảm bảo Header và Footer (Lưu/Hủy) luôn cố định (sticky) và form cuộn mượt mà trên mọi kích thước màn hình.

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

## 8. QUY CHUẨN THIẾT KẾ BỘ LỌC PHƯƠNG TIỆN (VEHICLE FILTER BAR RULE)

> [!IMPORTANT]
> **Quy định bất biến:** Mọi màn hình tổng hợp danh sách, hoạt động, chi phí, tài sản hoặc báo cáo (`/finance`, `/maintenance`, `/fuel`, `/documents`, `/analytics`, `/warranties`...) **BẮT BUỘC PHẢI CÓ THANH LỌC PHƯƠNG TIỆN (VEHICLE FILTER BAR)** đặt ngay dưới Header để hỗ trợ người dùng chuyển đổi linh hoạt giữa việc xem toàn bộ đội xe hoặc từng xe riêng lẻ.

### Cấu trúc chuẩn của Vehicle Filter Bar:
1. **Tiêu đề & Reset:** 
   - `Lọc [chức năng] theo phương tiện ({N} xe)` bên trái.
   - Nút `Xem tất cả phương tiện` (chỉ xuất hiện khi đang chọn 1 xe cụ thể) bên phải.
2. **Grid thẻ chọn xe (Responsive Grid 2 -> 7 cột):**
   - **Thẻ "Tất cả xe" (ALL):** Nằm đầu tiên, hiển thị tổng số mục / tổng chi phí của toàn bộ đội xe.
   - **Thẻ từng xe:** Hiển thị Avatar / Ảnh xe, Tên xe, Biển số xe, Badge trạng thái (Có vay / Hết hạn / Số mục), và Số tiền / Thông số tương ứng.
   - **Active State:** Hiệu ứng `ring-2 ring-cyan-500 scale-[1.02]` với nền sáng nổi bật.
3. **Phản ứng dữ liệu khi chọn xe:**
   - Khi chọn xe: Toàn bộ KPI tóm tắt, danh sách, biểu đồ, và các modal thêm mới tự động gán `asset_id` theo xe đang chọn.
   - Khi chọn "Tất cả xe": Hiển thị tổng quan hợp nhất của cả gia đình.

---

## 9. LỊCH SỬ CÁC ĐỢT PHÁT TRIỂN & NÂNG CẤP

### Đợt 7 (27/08/2026): Chuẩn Hóa Bộ Lọc Phương Tiện Toàn Hệ Thống & Hoàn Thiện Modal
- **Trang Tài Chính & Khoản Vay (`/finance`):**
  - Bổ sung Vehicle Filter Bar: Lọc linh hoạt giữa xem tất cả hoặc từng xe.
  - Tự động lọc bảng phân bổ chi phí, danh sách chi phí và khoản vay theo xe.
  - Khi xe chưa có khoản vay, cung cấp thẻ tạo khoản vay nhanh với 1 cú click.
  - Cho phép sửa chi tiết từng kỳ trả nợ (lãi thực tế ngân hàng tính theo ngày làm việc).
- **Trang Giấy Tờ & Bảo Hiểm (`/documents`):**
  - Bổ sung Vehicle Filter Bar: Lọc giấy tờ theo từng phương tiện hoặc xem toàn bộ.
  - Sửa lỗi Flexbox height collapse trên popup modal thêm giấy tờ (hỗ trợ nhập liệu 2 cột đầy đủ).
- **Trang Báo Cáo & Phân Tích (`/analytics`):**
  - Bổ sung Vehicle Filter Bar: Xem TCO, tỷ lệ khấu hao, và chi phí vận hành cho từng xe hoặc cả đội xe.

---

### Đợt 8 (31/08/2026): Chuẩn Hóa Nhật Ký Lịch Liên Tục & Bảo Vệ ODO Chốt Ngày (Monotonic Odometer Strategy)
- **Nhật Ký Lịch Liên Tục (Continuous Calendar Log):**
  - Tự động lấp đầy trọn vẹn mọi ngày trong tháng (không bị ngắt quãng giữa các ngày xe nghỉ).
  - Ngày xe nghỉ hiển thị rõ ràng nhãn `💤 Nghỉ • Xe nghỉ / Không phát sinh di chuyển` kèm ODO bảo lưu.
- **Khử trùng lặp Double-Counting & Bảo vệ ODO Chốt ngày:**
  - Khử trùng lặp giữa `dailySummaries` và `trips` riêng lẻ để ngày 31/08 hiển thị chuẩn xác **125.99 km** (8 chuyến đi).
  - **Quy tắc Monotonic Odometer:** Chuyến đi thực tế từ thiết bị OBD/GPS là chân lý chốt ODO cuối ngày (`prevOdo += day.tripDistance`). Số ODO nhập tay tại thời điểm phát sinh chi phí/xăng xe chỉ mang tính chất tham khảo, tuyệt đối không được ghi đè hay kéo lùi ODO chốt ngày.
  - Đồng bộ mốc ODO tích lũy của Mazda 2 đạt chuẩn **2.858,2 km** trên cả Bảng nhật ký, Header và Virtual Odometer.

---

### Đợt 9 (01/09/2026): Đột Phá Thiết Kế Đồng Hồ Vận Hành OBD (Radial Gauge Meters) & Sửa Dứt Điểm Lỗi Dính Chuột
- **Thiết kế Đồng hồ Vận hành & OBD (High-Tech Radial Gauge Meters):**
  - **Vòng cung Gauge Meter điện tử (SVG 260°):** Mỗi đồng hồ có vòng cung kim đo trực quan uốn cong với hiệu ứng tiến trình chuyển động mượt mà theo giá trị thời gian thực từ thiết bị OBD xe.
  - **Chữ số siêu to & sắc nét (`text-4xl font-black`):** Số to gấp đôi, đặt ở trung tâm đồng hồ kèm đơn vị đo rõ ràng (`km/h`, `rpm`, `°C`, `V`).
  - **Phân màu theo 4 tone KPI chuyên biệt:**
    - ⚡ **Tốc độ (Speed - Cyan Neon):** Dải đo `0 - 160 km/h`, gradient `#06B6D4` -> `#10B981`, kèm đánh giá trạng thái (*Xe nổ máy tại chỗ / Chạy trong phố / Tốc độ đường trường / Đang chạy cao tốc*).
    - 🔄 **Vòng tua máy (RPM - Amber / Redline):** Dải đo `0 - 6.000 rpm`, gradient `#F59E0B` -> `#F97316` (chuyển đỏ `#EF4444` khi tua máy > 3.500 rpm), kèm nhận diện chế độ (*Garanti chuẩn 800 rpm / Vùng tiết kiệm xăng / Vùng tua cao / Vùng đỏ Redline*).
    - 🌡️ **Nhiệt độ nước (Coolant - Emerald / Cyan / Red):** Dải đo `0 - 120 °C`, gradient `#10B981` -> `#06B6D4` (chuyển đỏ khi quá nhiệt > 100 °C), tự động cảnh báo (*Đang làm nóng máy / Nhiệt độ tối ưu 85-95°C / Quạt gió làm việc / Cảnh báo sôi nước quá nhiệt*).
    - 🔋 **Điện áp bình (Voltage - Purple / Indigo):** Dải đo `10 - 16 V`, gradient `#A855F7` -> `#6366F1`, hiển thị trạng thái ắc quy (*Bình yếu cần sạc / Điện áp bình tốt 12.6V / Máy phát đang nạp sạc tốt 13.2V - 14.8V / Cảnh báo quá áp sạc*).
  - **Hiệu ứng Ambient Glow & Glassmorphism:** Có ánh sáng đèn nền neon mờ ảo (`blur-2xl opacity-15`) theo từng màu KPI, bo góc thể thao `rounded-2xl`, viền bóng mờ và hiệu ứng hover phóng to (`scale-[1.02]`) nổi bật.
- **Sửa triệt để lỗi "Dính chuột" khi Kéo / Resize Popup (DraggableModal):**
  - Chuyển toàn bộ cơ chế bắt sự kiện `pointermove`, `pointerup`, `pointercancel`, `blur` lên cấp độ toàn màn hình (`window`).
  - Tích hợp cơ chế tự ngắt an toàn `if (e.buttons === 0)` và khóa quét chọn chữ (`userSelect: none`) trong suốt quá trình kéo thả/resize.

---

### Đợt 10 (01/09/2026): Tích Hợp Toàn Diện Bộ Não & Trí Nhớ Sâu AI (Deep System Context & Memory)
- **Nạp Toàn Bộ Cơ Sở Dữ Liệu Sống (Real-time Live RAG):**
  - **Tài chính 60 kỳ:** Tự động tính toán và nạp bảng phân bổ chi tiết 60 kỳ vay (Gốc, Lãi, Tổng trả, Dư nợ giảm dần sau từng kỳ, Trạng thái thanh toán).
  - **Dữ liệu Vận hành:** Toàn bộ lịch sử đổ xăng, bảo dưỡng định kỳ, 12 món đồ chơi & phụ tùng nâng cấp, bảo hiểm và hotline cứu hộ 24/7.
  - **19 Chuyến đi thực tế:** Lộ trình, km, thời lượng và mức tiêu hao nhiên liệu.
- **Hỗ Trợ Thế Hệ Gemini Mới Nhất:**
  - Hỗ trợ toàn diện **Gemini 3.6 Flash, 3.0 Pro, 2.5 Flash, 2.0 Flash, 1.5 Pro**.
  - Cơ chế **Auto-Discovery & Multi-Version Fallback** tự động nhận diện và kích hoạt model tối ưu nhất theo tài khoản Google AI Studio.
- **Trí Nhớ Hội Thoại (Conversational Memory):**
  - Tự động ghi nhớ chuỗi các câu hỏi và câu trả lời trước đó trong phiên chat, giúp thảo luận thông minh và liền mạch.

---

### Đợt 11 (01/09/2026): Tăng Cường Bảo Mật Đăng Nhập Email Whitelist & Hoàn Thiện Đổi/Reset Mật Khẩu
- **Chính Sách Giới Hạn Đăng Nhập (Email Whitelist Enforcement):**
  - Khóa toàn bộ các đăng ký tự do và chặn nhận Magic Link/Đăng nhập đối với các email lạ ngoài danh sách thành viên gia đình.
  - Chỉ các email đã được Admin cấp phép trong Whitelist (`authWhitelistService.ts` / `/settings/users`) mới có thể nhận liên kết hoặc đăng nhập.
  - Trang Đăng nhập hiển thị thông báo chặn rõ ràng khi phát hiện email lạ và cung cấp tính năng "Quên mật khẩu" an toàn.
- **Hoàn Thiện Bộ Tính Năng Quản Trị Mật Khẩu:**
  - **Đổi Mật Khẩu Cá Nhân:** Người dùng đang đăng nhập có thể chủ động đổi mật khẩu tài khoản của mình qua `supabase.auth.updateUser`.
  - **Admin Reset Mật Khẩu Trực Tiếp:** Quản trị viên có thể đặt mật khẩu mới tùy ý cho thành viên, tạo mật khẩu ngẫu nhiên an toàn 6 số (`FMMS@XXXXXX`) và sao chép 1-click gửi cho thành viên.
  - **Quản Lý Danh Sách Email Whitelist:** Bổ sung giao diện trực quan cho phép Admin thêm/xóa quyền đăng nhập của từng email gia đình.
  - **Nút "✏️ Sửa Thông Tin Thành Viên":** Cho phép Quản trị viên chỉnh sửa họ tên, số điện thoại, email và vai trò phân quyền.

---

### Đợt 12 (01/09/2026): Khóa Bảo Mật Cấp Cao Toàn Diện Bằng Mã PIN Quản Trị Viên Duy Nhất (`0075`)
- **Tạo Hợp Phần Xác Thực Mã PIN Quản Trị Viên (`AdminSecurityPinModal`):**
  - Cấu hình mã PIN bảo mật Master Admin duy nhất: `0075`.
  - Giao diện Modal Glassmorphism phát sáng cảnh báo đỏ/hồng (`Rose neon glow`), tích hợp biểu tượng khiên bảo vệ `ShieldAlert`.
  - Hỗ trợ ô nhập mã PIN 4 số tự động bắt tiêu điểm (auto-focus), nhập bàn phím số, phím `Enter` và cơ chế chống gõ nhầm/chặn hành vi trái phép.
- **Khóa & Bảo Vệ Toàn Bộ Các Tác Vụ Nhạy Cảm & Phá Hủy Dữ Liệu:**
  - 🚗 **Xóa Phương Tiện / Xe:** Khóa nút xóa xe ở cả màn hình Danh sách xe (`/assets`) và màn hình Chi tiết phương tiện (`/assets/[id]`). Yêu cầu nhập đúng mã PIN `0075` mới thực hiện xóa.
  - 💰 **Xóa Khoản Vay & Chi Phí Tài Chính:** Khóa hành động xóa cấu hình khoản vay, xóa các kỳ trả nợ và xóa chi phí lăn bánh / nâng cấp / vận hành (`/finance` & `VehicleFinanceOverview`).
  - 👤 **Xóa & Thu Hồi Quyền Thành Viên:** Khóa chức năng xóa tài khoản thành viên và thu hồi quyền truy cập Email Whitelist (`/settings/users`).
### Đợt 13 (04/09/2026): Tích Hợp Đầy Đủ OBD Fuel Intelligence, Nâng Cấp DrillDown 1200px, Đếm Ngược Bảo Dưỡng Thông Minh & Biểu Đồ Nhiên Liệu Đa Chiều
- **Tích Hợp OBD Fuel Intelligence Toàn Diện:**
  - Kết nối Supabase Schema `0016_fuel_obd_enhancement.sql` hỗ trợ các trường: `%` phao xăng trước/sau (`fuel_level_before/after_pct`), số lít trước/sau (`fuel_liters_before/after`), mức tiêu hao thực tế (`calculated_consumption_l100km`), số lít đã đốt (`fuel_consumed_liters`).
  - Tự động làm giàu dữ liệu lịch sử (Auto-Enrichment) cho 10 lần đổ xăng của xe Mazda2 Base 2026 (từ 09/04/2026 ODO 12 km đến 23/08/2026 ODO 2,646 km), hiển thị đầy đủ badge $L/100\text{km}$ và $+\Delta\text{km}$.
- **Mở Rộng Modal Tài Chính & Vận Hành (`VehicleFinanceOverview`):**
  - Mở rộng `DrillDownModal` gấp đôi lên chiều rộng $1200\text{px}$ (`w-[95vw] sm:w-[90vw] md:w-[1200px] max-w-[1200px]`).
  - Thẻ *Usage / Odometer* hỗ trợ nhấp chuột để chuyển ngay sang tab `Trips` (Hành trình) của xe (`onNavigateTab('trips')`).
- **Cảnh Báo Thông Minh Hạn Bảo Dưỡng Tiếp Theo (`/assets/[id]`):**
  - Tự động tính toán số ngày chênh lệch giữa ngày bảo dưỡng dự kiến và ngày hiện tại.
  - Hiển thị badge màu thông minh: Đã quá hạn (Đỏ), Hôm nay (Đỏ), Sắp đến $\le 7$ ngày (Cam), Sắp tới $\le 30$ ngày (Vàng), An toàn $> 30$ ngày (Xanh lá).
- **Hiện Đại Hóa Biểu Đồ Nhiên Liệu (`/fuel`):**
  - Hỗ trợ Tab Switcher linh hoạt: `📊 Chi phí & Lít` vs `📈 Xu hướng Giá`.
  - Tách biệt thang đo trục tung (Dual-Axis) ngăn đường giá xăng bị méo tỷ lệ.
  - Sửa lỗi runtime `showToast` khi build Vercel.

### Đợt 15 (17/09/2026): Tối Ưu Kiến Trúc Đa Thiết Bị (Responsive Web App Architecture), Mobile Drawer Navigation & Multi-Tab Switcher
- **Tái Cấu Trúc Layout Toàn Diện & Chuẩn Hóa Breakpoints:**
  - Chuẩn hóa hệ thống Breakpoints trong `tailwind.config.js`: `xs: 480px`, `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1440px`.
  - Bổ sung Design Tokens trong `globals.css`: `--sidebar-width: 260px`, `--header-height: 60px`, `--touch-target-min: 44px`.
  - Khắc phục triệt để lỗi mất thanh điều hướng trên màn hình nhỏ/di động (`< 1024px`) mà không làm thay đổi hay phá vỡ giao diện Desktop.
- **Hệ Thống Điều Hướng Đa Thiết Bị (Navbar + Sidebar Drawer):**
  - **`Navbar.tsx`:** Tích hợp nút Hamburger (☰) chuẩn công thái học cảm ứng ($\ge 44 \times 44\text{px}$), hiển thị riêng trên mobile/tablet (`lg:hidden`). Tự động thu gọn khoảng đệm và logo trên màn hình nhỏ.
  - **`Sidebar.tsx`:** Chuyển đổi thành Dual-Mode Component:
    - *Desktop Mode* ($\ge 1024\text{px}$): Sidebar cố định bên trái mượt mà, đầy đủ các mục điều hướng và widget xe hoạt động thời gian thực.
    - *Mobile Drawer Mode* ($< 1024\text{px}$): Drawer trượt từ mép trái (`animate-slideInLeft`) với lớp phủ làm mờ nền (Backdrop Blur), tự động khóa cuộn trang nền (`overflow: hidden`), tự động đóng khi chọn menu hoặc bấm phím `Escape` / chạm vào vùng overlay.
  - **`ClientShell.tsx`:** Quản trị trạng thái `isMobileNavOpen` tập trung, tự động reset đóng Drawer khi đổi route (`pathname`), co giãn padding nội dung chính thích ứng từ `p-3.5 sm:p-5 lg:p-6`.
- **Tối Ưu Điều Hướng 11 Tabs Trang Chi Tiết Phương Tiện (`/assets/[id]`):**
  - Tích hợp **Quick Tab Dropdown Selector** cho màn hình siêu nhỏ (`sm:hidden`, $< 640\text{px}$) giúp chuyển đổi tab tức thì mà không cần cuộn ngang dài.
  - Tối ưu thanh tab cuộn ngang dạng pill (`min-h-[42px]`, `touch-manipulation`, `active:scale-95`) hiển thị mượt mà trên tablet và mobile lớn.

### Đợt 16 (17/09/2026): Tối Ưu Hiển Thị Tràn Viền (Fluid Full-Width) Trên Màn Hình Máy Tính Lớn (Full HD 1920x1080, 2K, 4K, 24-27 Inch)
- **Loại Bỏ Rào Cản Giới Hạn Cố Định Ở Shell Chính (`ClientShell.tsx`):**
  - Gỡ bỏ hoàn toàn `max-w-7xl` (1280px) và căn giữa `mx-auto` ở thẻ `<main>`.
  - Thiết lập chiều rộng `w-full` tràn viền tối đa (Fluid Full-Width), mở rộng không gian nội dung cho toàn bộ các trang: Dashboard (`/`), Phân tích TCO (`/analytics`), Nhiên liệu (`/fuel`), Bảo dưỡng (`/maintenance`), Đội xe (`/assets`), Chi tiết xe 11 tabs (`/assets/[id]`), Tài chính & Khoản vay (`/finance`), Giấy tờ & Bảo hiểm (`/documents`, `/warranties`).
  - Nâng cấp khoảng đệm chuẩn thích ứng theo kích thước hiển thị: `p-3.5 sm:p-5 lg:p-6 xl:p-8` giúp nội dung trên màn hình 24", 27", 32" không bị dính sát mép mà luôn có khoảng cách thở sang trọng, thoáng đãng.
- **Đồng Bộ Header Navbar (`Navbar.tsx`):**
  - Bổ sung padding thích ứng `xl:px-8` đồng bộ hoàn hảo với lề nội dung chính của `<main>`.
- **Nâng Cấp Lưới Phương Tiện Tự Động Co Giãn (`HomePage.tsx`):**
  - Nâng cấp lưới hiển thị xe: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6`. Trên màn hình siêu rộng (2K, 4K, $\ge 1536\text{px}$), danh sách phương tiện tự động chia thành 4 cột cân đối, tránh hiện tượng thẻ xe bị bè ngang quá mức.
- **Đảm Bảo Tính Nhất Quán Cho Bảng Biểu & Biểu Đồ:**
  - Bảng lịch sử đổ xăng, bảo dưỡng, hành trình mở rộng theo chiều ngang tự nhiên với `w-full overflow-x-auto`.
  - Tất cả biểu đồ Recharts với `ResponsiveContainer width="100%"` tự động mở rộng theo kích thước màn hình hiển thị.

### Đợt 17 (17/09/2026): Hệ Thống Nút Bật/Tắt Nhãn Số Dữ Liệu (Chart Data Labels Quick Toggle) Toàn Diện & Ghi Nhớ Thông Minh Cho Toàn Bộ Biểu Đồ Hệ Thống
- **Xây Dựng Reusable Component `ChartLabelToggle` (`web/components/charts/ChartLabelToggle.tsx`):**
  - Thiết kế nút bấm Pill Button hiện đại với icon `Tag`, đèn LED trạng thái (Cyan Glow khi bật, Muted khi tắt), văn bản "Nhãn số".
  - Tích hợp custom hook `useChartLabelState(storageKey, defaultValue)`: Quản trị state an toàn với Next.js SSR Hydration, tự động đồng bộ và lưu trữ lựa chọn của người dùng vào `localStorage` cho từng biểu đồ riêng biệt.
- **Tích Hợp Toàn Bộ Biểu Đồ Toàn Hệ Thống:**
  1. **Biểu đồ Nhiên liệu & Đơn giá (`/fuel`):**
     - Nút toggle lưu trữ khóa `fmms_fuel_chart_labels`.
     - Tự động bật nhãn chi phí (`X.XM ₫` - Amber) và số lít (`XL` - Cyan) ở chế độ `COMBINED`.
     - Tự động bật nhãn giá xăng (`XX.Xk` - Emerald) ở chế độ `PRICE_TREND`.
     - Tự động căn chỉnh lề trên `margin.top: showChartLabels ? 24 : 15` để số không bị chạm đỉnh biểu đồ.
  2. **Biểu đồ Phân tích Đa Chiều (`/analytics`):**
     - Nâng cấp `SectionHeader` hỗ trợ truyền `action` slot linh hoạt.
     - Tích hợp toggle và nhãn số cho cả 4 biểu đồ phân tích:
       - Biểu đồ Tổng quan Tháng (`ComposedChart` - `fmms_analytics_monthly_labels`): Nhãn số km vận hành.
       - Biểu đồ So sánh Mua xe vs Chi phí Vận hành (`BarChart` - `fmms_analytics_compare_labels`): Nhãn số tiền mua và tổng chi.
       - Biểu đồ Chi phí Nhiên liệu theo Tháng (`BarChart` - `fmms_analytics_fuel_labels`): Nhãn số tiền xăng từng tháng.
       - Biểu đồ Quãng đường Di chuyển (`AreaChart` - `fmms_analytics_distance_labels`): Nhãn số km chi tiết từng tháng.
  3. **Biểu đồ Tài chính & Dòng tiền (`/finance`):**
     - Nút toggle lưu trữ khóa `fmms_finance_chart_labels`.
     - Ứng dụng kỹ thuật `Line` trong suốt làm mỏ neo nhãn số tổng cho biểu đồ vùng xếp chồng (`Stacked AreaChart`), hiển thị tổng chi tiêu hàng tháng (`X.XM ₫`) rõ nét mà không đè chéo các lớp chi phí thành phần.
  4. **Biểu đồ Chi Tiết Phương Tiện (`/assets/[id]`):**
     - Chuẩn hóa nút toggle cho Biểu đồ ODO (`fmms_asset_odo_chart_labels`).
     - Bổ sung toggle cho Biểu đồ Tiêu thụ Nhiên liệu xe (`fmms_asset_fuel_chart_labels`).
     - Bổ sung toggle và nhãn tổng chi phí cho Biểu đồ Chi phí Vận hành xe (`fmms_asset_exp_chart_labels`).

### Đợt 18 (18/09/2026): Tối Ưu Triệt Để Thanh Điều Khiển Năm & Các Thẻ Biểu Đồ Trên Mobile (Anti-Card-Overflow & Responsive Control Bars)
- **Khắc Phục Lỗi Thanh Bar Năm Bị Tràn Thẻ (Card Overflow) Trên Mobile:**
  - **Biểu đồ Xu hướng Chi phí & Quãng đường theo tháng (`/analytics`):**
    - Thay thế text dài cố định `"Tất cả các năm"` bằng text thích ứng: `<span className="hidden xs:inline">Tất cả các năm</span><span className="xs:hidden">Tất cả</span>`, giảm ngay ~50px chiều rộng trên màn hình nhỏ.
    - Gỡ bỏ thuộc tính cưỡng chế không co giãn `shrink-0` ở container cha của thanh bar năm, bổ sung `max-w-full overflow-x-auto scrollbar-none` kết hợp `shrink-0` cho từng nút con, đảm bảo thanh năm có thể cuộn ngang mượt mà khi phát sinh nhiều năm dữ liệu mà không bao giờ bị đè hoặc thò ra ngoài viền thẻ.
    - Cấu trúc lại bố cục hàng điều khiển: `flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto`, đưa thanh năm và nút `ChartLabelToggle` vào hàng lối cân đối trên mobile.
- **Rà Soát & Đồng Bộ Toàn Bộ Các Thẻ Có Lỗi Tương Tự:**
  - **Thanh lọc năm trang Phân tích (`/analytics` - Header):** Bổ sung `max-w-full overflow-x-auto scrollbar-none` và `shrink-0` cho các nút năm.
  - **Biểu đồ ODO Chi tiết xe (`/assets/[id]`):** Tối ưu thanh chọn năm `availableOdoYears` với text thích ứng (`Tất cả` / `Tất cả các năm`, `2026` / `Năm 2026`), cuộn ngang an toàn `max-w-full overflow-x-auto scrollbar-none`.
  - **Biểu đồ Nhiên liệu xe (`/assets/[id]` & `/fuel`):** Thanh chuyển chế độ `Chi phí & Lít` vs `Xu hướng Giá` bổ sung `max-w-full overflow-x-auto scrollbar-none` và `shrink-0`, layout `justify-between sm:justify-end flex-wrap w-full sm:w-auto`.
  - **Ma trận mã lỗi (`DtcDistributionMatrix.tsx`):** Selector thời gian `availableYears` bổ sung `max-w-full overflow-x-auto scrollbar-none` và rút gọn nhãn trên di động.
  - **Bộ lọc loại xe (`/assets`):** Thanh 6 nút phân loại xe (`ALL, CAR, MOTORCYCLE...`) bổ sung `max-w-full overflow-x-auto scrollbar-none pb-1` ngăn tràn mép màn hình mobile.
  - **Bộ lọc bảo hành (`/warranties`):** Bổ sung `flex-wrap gap-2` và cuộn ngang cho thanh trạng thái bảo hành.
  - **Chuẩn hóa Padding thẻ trên mobile:** Toàn bộ card biểu đồ Recharts chuyển từ `p-5` sang `p-3.5 sm:p-5`, tăng 12px không gian hiển thị nội dung trên màn hình điện thoại 360–390px.
  - **Nâng cấp `SectionHeader`:** Hỗ trợ `flex-col xs:flex-row`, `min-w-0` và `truncate` có `title` tooltip giúp tiêu đề không bị chèn ép nút điều khiển ở góc phải.

---

## 10. CÁC LƯU Ý QUAN TRỌNG CHO ĐỢT PHÁT TRIỂN TIẾP THEO

1. **Tuân thủ Vehicle Filter Bar Rule trên mọi màn hình mới**: Đảm bảo trải nghiệm quản lý đa phương tiện đồng nhất.
2. **Tuyệt đối không dùng `glass-panel` trực tiếp trên card modal**: Tránh các lỗi liên quan đến `will-change` hoặc `transform` làm sai lệch tọa độ fixed.
3. **Không kết hợp `flex items-center` và `overflow-y-auto` trên cùng một div**: Luôn dùng mô hình 2 lớp div (`overflow-y-auto` ở lớp ngoài và `flex min-h-full items-center justify-center pt-20` ở lớp trong).
4. **Thêm style inline với CSS Variable cho màu sắc**: Giúp đảm bảo tương thích 100% khi chuyển đổi Light Mode và Dark Mode mà không bị phụ thuộc vào class cố định của Tailwind.
5. **Mọi thay đổi giao diện phải kiểm tra đồng thời trên cả 9 màn hình**: `/dashboard`, `/assets`, `/assets/[id]`, `/fuel`, `/maintenance`, `/finance`, `/documents`, `/warranties`, `/settings/*`.
6. **Tuân thủ Chuẩn Responsive & Touch Targets ($\ge 44\text{px}$)**: Mọi nút bấm, menu item, icon clickable trên mobile phải đạt kích thước tối thiểu $44 \times 44\text{px}$ để đảm bảo trải nghiệm cảm ứng ngón tay.




