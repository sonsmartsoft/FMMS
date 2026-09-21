# 🚗 FAMILY MOBILITY & FINANCIAL MANAGEMENT SYSTEM (FMMS)
### Nền tảng Hợp nhất Quản lý Phương tiện, Tài chính Gia đình, Telemetry & Trợ lý AI Đa kênh
> **Phiên bản:** v2.6 Unified Architecture | **Ngăn xếp:** Next.js 14 (App Router) • Kotlin Android (ZESTECH 9") • Supabase (PostgreSQL RLS)

---

## 📖 GIỚI THIỆU TỔNG QUAN (OVERVIEW)

**FMMS** là hệ thống quản trị gia đình toàn diện, kết nối liền mạch giữa **Đội xe di chuyển** và **Sổ thu chi tài chính thông minh**. Hệ thống giúp gia đình kiểm soát triệt để mọi dòng tiền vào - ra, định mức ngân sách theo chuẩn thế giới, đồng thời theo dõi sát sao tình trạng vận hành, bảo dưỡng và chi phí sở hữu thực tế của toàn bộ phương tiện.

```text
                        FAMILY MOBILITY & FINANCE SYSTEM (FMMS)
                                          │
             ┌────────────────────────────┼────────────────────────────┐
             │                            │                            │
       WEB APPLICATION             ANDROID IN-CAR APP           SUPABASE CLOUD DB
   (Next.js 14 + Tailwind)         (Kotlin Compose ZESTECH)     (PostgreSQL + RLS)
   • Quản trị Tài chính 6 Hũ       • ZESTECH 9" In-Car UI       • Bảng dữ liệu tập trung
   • Sổ thu chi đa tài khoản       • Kết nối OBD-II KW906       • Phân quyền RLS an toàn
   • Đồng bộ chi phí xe 2 chiều    • Virtual ODO Engine         • Cache dữ liệu 2 tầng
   • Báo cáo tài chính & TCO       • Hàng đợi đồng bộ Offline   • Realtime Event Bus
```

---

## 🌟 CÁC PHÂN HỆ TRỌNG TÂM (CORE MODULES)

### 1. 🚗 Quản Trị Phương Tiện & Đi Lại (Mobility & Fleet)
- **Hồ sơ phương tiện chi tiết:** Quản lý ô tô chính **Mazda 2AT 2026** (1.5L Luxury / AT, BKS `19B-213.87`), xe máy Honda Air Blade, xe đạp thể thao MTB.
- **Đồng hồ ODO kép (Dual Odometer):** Kết hợp giữa cảm biến OBD-II phần cứng (KONNWEI KW906) và động cơ tính toán ODO ảo (Virtual Odometer Engine).
- **Nhật ký Nhiên liệu (`/fuel`):** Theo dõi lịch sử đổ xăng RON 95, đơn giá, số lít, mức tiêu hao nhiên liệu trung bình ($L/100km$) và chi phí trên mỗi km lăn bánh.
- **Bảo dưỡng & Phụ tùng (`/maintenance`):** Nhắc lịch bảo dưỡng định kỳ (mỗi 5,000 km hoặc 6 tháng) tại Mazda Thaco hoặc Gara, theo dõi nhật ký thay dầu nhớt, lọc gió, đảo lốp, phụ tùng thay thế.
- **Chi phí lăn bánh & TCO (`/finance`):** Tổng chi phí sở hữu trọn đời (Total Cost of Ownership - TCO), chi phí khấu hao, chi phí vận hành cố định và biến đổi.
- **Giấy tờ & Đăng kiểm (`/documents`):** Lưu trữ Cà vẹt (Đăng ký xe), Sổ đăng kiểm, Bảo hiểm TNDS & Thân vỏ, đếm ngược hạn đăng kiểm tự động.
- **Khoản vay mua xe ngân hàng:** Quản lý chi tiết gói vay trả góp mua xe **TPBank** (295,000,000 ₫ trong 60 tháng, trả gốc + lãi ngày 28 hàng tháng).

---

### 2. 💰 Quản Trị Tài Chính Gia Đình Toàn Diện (Family Finance)
- **Hệ thống Đa Ví & Tài khoản độc lập (`/family-finance/wallets`):**
  - 💵 *Tiền mặt gia đình*
  - 🏦 *Techcombank Chi tiêu*
  - 🏦 *Vietcombank Lương & Dự phòng*
  - 💳 *Thẻ tín dụng Techcombank Visa Signature* (Hạn mức 100M, chốt sao kê ngày 20, hạn trả ngày 5)
  - 📱 *Ví điện tử MoMo*
  - 🐷 *Sổ tiết kiệm ngân hàng*
- **Sổ Thu Chi Giao Dịch (`/family-finance/transactions`):**
  - Ghi chép Thu nhập (Lương, Thưởng, Kinh doanh, Cổ tức), Chi tiêu sinh hoạt và Chuyển tiền nội bộ giữa các ví.
  - Phân loại danh mục đa tầng Mẹ - Con chuẩn (`Ăn uống & Đi chợ`, `Nhà cửa & Sinh hoạt`, `Phương tiện & Xe cộ`, `Con cái & Giáo dục`, `Sức khỏe & Y tế`, `Hưởng thụ & Du lịch`, `Trả góp & Nợ ngân hàng`).
- **Mô Hình Ngân Sách 6 Chiếc Hũ (6 Jars - T. Harv Eker) (`/family-finance/budgets`):**
  - **Tự động chia từ thu nhập:** Mặc định hệ thống tự động trích tỷ lệ từ dòng tiền vào hàng tháng:
    1. 🟢 **Hũ Thiết Yếu (NEC - 55%)**: Ăn uống, sinh hoạt, tiền điện nước, **toàn bộ chi phí vận hành xe Mazda 2**.
    2. 🔵 **Hũ Tiết Kiệm Dài Hạn (LTSS - 10%)**: Quỹ khẩn cấp 3-6 tháng, bảo hiểm nhân thọ, mua sắm lớn tương lai.
    3. 🟣 **Hũ Giáo Dục & Học Tập (EDU - 10%)**: Học phí con cái, sách vở, khóa học phát triển kỹ năng bố mẹ.
    4. 🟡 **Hũ Hưởng Thụ & Du Lịch (PLAY - 10%)**: Du lịch cuối tuần, ăn nhà hàng cao cấp, spa, đồ chơi xe.
    5. 🟣 **Hũ Tự Do Tài Chính (FFA - 10%)**: Đầu tư cổ phiếu, trái phiếu, tích lũy tạo thu nhập thụ động.
    6. 🔴 **Hũ Cho Đi & Biếu Tặng (GIVE - 5%)**: Biếu ông bà nội ngoại, từ thiện, quà sinh nhật & hiếu hỉ.
  - **Cấu hình tùy biến linh hoạt (`⚙️ Cấu hình tỷ lệ 6 Hũ`):** Cho phép gia đình tùy chỉnh lại % từng hũ theo mục tiêu riêng với bộ kiểm tra thời gian thực (bắt buộc tổng = 100%), có nút khôi phục chuẩn và tùy chỉnh mức thu nhập cơ sở ước tính (mặc định 50,000,000 ₫).
- **Quy tắc ngân sách 50/30/20:** Phân chia theo Nhu cầu thiết yếu (50%), Mong muốn (30%) và Tiết kiệm/Đầu tư (20%).
- **Báo cáo Phân Tích Chuyên Nghiệp (`/family-finance/reports`):**
  - Biểu đồ tròn Donut phân tích chi tiêu theo nhóm danh mục.
  - Biểu đồ cột phân tích Dòng tiền ròng (Net Cash Flow = Thu - Chi) theo tháng/quý/năm.
  - Tỷ lệ tiết kiệm và đánh giá sức khỏe tài chính gia đình.

---

### 3. 🔄 Cơ Chế Đồng Bộ Tự Động 2 Chiều (Bidirectional Sync)
Hệ thống giải quyết triệt để sự phân mảnh giữa chi phí xe và sổ tài chính gia đình:

| Thao tác | Điểm phát sinh | Cơ chế đồng bộ tự động |
|---|---|---|
| **Đổ xăng RON 95** | Mục Xe (`/fuel`) | Tự động ghi vào Sổ tài chính ➜ Danh mục `cat-mob-fuel` ➜ Trừ tiền **Hũ Thiết Yếu (NEC)**. |
| **Bảo dưỡng xe** | Mục Xe (`/maintenance`) | Tự động ghi vào Sổ tài chính ➜ Danh mục `cat-mob-maint` ➜ Trừ tiền **Hũ Thiết Yếu (NEC)**. |
| **Cầu đường / Gửi xe** | Mục Xe (`/finance`) | Tự động ghi vào Sổ tài chính ➜ Danh mục `cat-mob-toll` / `cat-mob-parking` ➜ Thuộc **Hũ Thiết Yếu**. |
| **Phụ tùng / Rửa xe** | Mục Xe (`/finance`) | Tự động ghi vào Sổ tài chính ➜ Danh mục `cat-mob-parts` / `cat-mob-wash` ➜ Thuộc **Hũ Hưởng Thụ (PLAY)**. |
| **Ghi chi tiêu có chọn xe** | Sổ Tài Chính (`/family-finance`) | Tự động đồng bộ sang bảng chi phí xe `expenses`, cập nhật TCO và nhật ký bảo dưỡng/xăng nếu có. |
| **Xóa / Hủy giao dịch** | Bất kỳ phân hệ nào | Tự động **xóa đồng bộ ở cả 2 bên**, số dư ví và hạn mức hũ được hoàn trả chính xác. |

---

### 4. 📖 Cẩm Nang Hướng Dẫn Tích Hợp Sẵn Trong Ứng Dụng (`/about`)
Ứng dụng có sẵn trang **Cẩm nang & Hướng dẫn sử dụng** (`/about`) được liên kết trên Navbar và Sidebar với 5 chuyên đề:
1. *Tổng quan hệ thống & Kiến trúc kỹ thuật.*
2. *Hướng dẫn vận hành đội xe & ODO.*
3. *Cẩm nang tài chính gia đình & Cơ chế 6 Chiếc Hũ.*
4. *Sơ đồ luồng đồng bộ 2 chiều dữ liệu.*
5. *Giải đáp câu hỏi thường gặp (FAQ) & Mẹo quản lý.*

---

## 📂 CẤU TRÚC THƯ MỤC NGUỒN (MONOREPO)

```text
FMMS/
├── web/                                 # Web Application (Next.js 14 App Router)
│   ├── app/
│   │   ├── layout.tsx                   # Layout chung, Theme Provider, ClientShell
│   │   ├── page.tsx                     # Mobility Dashboard chính
│   │   ├── about/                       # Trang Cẩm nang & Hướng dẫn sử dụng
│   │   ├── family-finance/              # Phân hệ Tài chính gia đình
│   │   │   ├── page.tsx                 # Dashboard Tài chính tổng quan & 6 Hũ
│   │   │   ├── transactions/            # Sổ thu chi chi tiết & bộ lọc
│   │   │   ├── budgets/                 # Kế hoạch ngân sách & Cấu hình 6 Hũ
│   │   │   ├── wallets/                 # Quản lý ví, thẻ tín dụng & tài khoản
│   │   │   ├── loans/                   # Quản lý khoản vay mua xe & trả góp
│   │   │   └── reports/                 # Báo cáo tài chính & Biểu đồ phân tích
│   │   ├── assets/                      # Hồ sơ xe ô tô & các phương tiện
│   │   ├── fuel/                        # Nhật ký nhiên liệu & pin
│   │   ├── maintenance/                 # Nhật ký bảo dưỡng & phụ tùng
│   │   ├── finance/                     # Chi phí xe & TCO lăn bánh
│   │   ├── documents/                   # Giấy tờ, bảo hiểm & đăng kiểm
│   │   └── settings/                    # Cài đặt hệ thống, danh mục & thiết bị
│   ├── components/
│   │   ├── layout/                      # Navbar, Sidebar, ClientShell
│   │   ├── finance/                     # QuickTransactionModal, ErrorBoundary
│   │   └── ui/                          # DraggableModal, KpiGradientCard
│   ├── lib/
│   │   ├── services/                    # familyFinanceService, expenseService, assetService...
│   │   ├── utils/                       # jarsConfig, formatters, storage
│   │   └── supabase/                    # Supabase Client & Server initialization
│   └── types/                           # TypeScript interfaces (finance, mobility)
├── android/                             # Android Native App cho màn hình ZESTECH 9"
│   └── app/src/main/java/...            # Kotlin Jetpack Compose, OBD-II KW906, Room DB
└── supabase/
    └── migrations/                      # Toàn bộ SQL Schemas, Functions, Triggers & RLS
```

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY ỨNG DỤNG (GETTING STARTED)

### 1. Yêu cầu môi trường:
- **Node.js:** v18.17+ hoặc v20+
- **NPM** hoặc **Yarn / PNPM**
- Tài khoản **Supabase** (PostgreSQL Cloud)

### 2. Cấu hình biến môi trường:
Tạo file `web/.env.local` với nội dung:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-for-server
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Cài đặt và khởi chạy Web App:
```bash
# Di chuyển vào thư mục web
cd web

# Cài đặt các gói phụ thuộc
npm install

# Khởi chạy môi trường phát triển (Development)
npm run dev
```
Mở trình duyệt truy cập: **`http://localhost:3000`**

### 4. Kiểm tra biên dịch & Build Production:
```bash
cd web
npm run build
npm run start
```

---

## 📱 BUILD ANDROID APP CHO MÀN HÌNH ZESTECH 9"
1. Mở thư mục `android/` bằng **Android Studio Ladybug (hoặc mới hơn)**.
2. Chọn JDK phiên bản 17.
3. Chạy lệnh build APK:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
4. File APK đầu ra tại `android/app/build/outputs/apk/debug/app-debug.apk`. Copy vào USB và cắm cài đặt trực tiếp lên màn hình ZESTECH 9 inch của xe Mazda 2.

---

## 🛡️ BẢO MẬT & PHÂN QUYỀN (SECURITY)
- Mọi truy vấn cơ sở dữ liệu đều tuân thủ chính sách **Row Level Security (RLS)** trên Supabase.
- Hệ thống hỗ trợ phân quyền người dùng: **Quản trị viên (ADMIN)** và **Thành viên gia đình (MEMBER)**.
- Dữ liệu tài chính và nhật ký xe được mã hóa bảo mật đường truyền (HTTPS / TLS 1.3) và bảo vệ an toàn trên đám mây.

---
*© 2026 Family Mobility Management System (FMMS). Phát triển cho gia đình hiện đại.*
