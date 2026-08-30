-- ============================================================================
-- FMMS SUPABASE MASTER SEED SCRIPT (PRODUCTION DATA)
-- Copy and run this entire script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Tạm thời tắt RLS để chèn dữ liệu
ALTER TABLE IF EXISTS public.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parts DISABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.assets ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Bổ sung các cột thông tin liên hệ nếu chưa có
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS sales_rep_name TEXT;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS sales_rep_phone TEXT;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS brand_hotline TEXT;

ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS bank_contact_name TEXT;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS bank_contact_phone TEXT;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS bank_hotline TEXT;

DO $$
DECLARE
  v_mazda_id UUID;
  v_bike16_id UUID;
  v_bike21_id UUID;
  v_mtb26_id UUID;
  v_mtb20_id UUID;
  v_carnival_id UUID;
  v_loan_id UUID;
  target_user_id UUID;
BEGIN
  -- Lấy user đã đăng ký đầu tiên trong auth.users
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;

  -- --------------------------------------------------------------------------
  -- A. KHỞI TẠO CÁC UUID CỐ ĐỊNH CHO TỪNG XE THỰC TẾ
  -- --------------------------------------------------------------------------
  v_mazda_id    := '20260308-0001-4222-8888-19b213872026';
  v_bike16_id   := '20170801-0002-4111-8888-88c121063016';
  v_bike21_id   := '20210405-0003-4333-8888-88f160436021';
  v_mtb26_id    := '20240310-0004-4444-8888-000000260555';
  v_mtb20_id    := '20240310-0005-4555-8888-000000200555';
  v_carnival_id := '20300308-0006-4666-8888-00000ca20300';
  v_loan_id     := '20260407-0001-4000-8888-000000000001';

  -- --------------------------------------------------------------------------
  -- B. DỌN DẸP DỮ LIỆU CŨ TRÁNH TRÙNG LẶP
  -- --------------------------------------------------------------------------
  DELETE FROM public.loan_payments;
  DELETE FROM public.loans;
  DELETE FROM public.expenses;
  DELETE FROM public.fuel_logs;
  DELETE FROM public.maintenance_records;
  DELETE FROM public.parts;
  DELETE FROM public.assets;

  -- --------------------------------------------------------------------------
  -- C. CHÈN DANH SÁCH XE THỰC TẾ
  -- --------------------------------------------------------------------------
  INSERT INTO public.assets (
    id, owner_id, name, asset_type, category, brand, model, year, trim, color, license_plate, vin, engine, fuel_type, tank_capacity_liters, purchase_date, purchase_price, current_value, initial_odometer_km, current_odometer_km, virtual_odometer_km, odometer_source, status, image_url, description
  ) VALUES
  (v_mazda_id, target_user_id, 'Mazda 2AT 2026', 'CAR', 'Sedan/Hatchback', 'MAZDA', 'Mazda 2', 2026, '1.5L AT', 'Đỏ Soul Red Crystal', '19B-213.87', 'JM1DJ1010102026', '1.5L SkyActiv-G', 'PETROL', 44.0, '2026-03-08', 397000000, 380000000, 0, 2651, 2651, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop', 'Xe ô tô gia đình chính Mazda 2 (19B-213.87). Vay ngân hàng TPBank 295,000,000 ₫.'),
  (v_bike16_id, target_user_id, 'Honda Air Blade 2016', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2016', 2016, '125cc FI', 'Đen Nhám', '88C1-210.63', NULL, NULL, 'PETROL', 4.4, '2017-08-01', 35000000, 18000000, 0, 45000, 45000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2016 gia đình đi lại hằng ngày'),
  (v_bike21_id, target_user_id, 'Honda Air Blade 2021', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2021', 2021, '125cc Special', 'Xanh Xám', '88L1-604.36', NULL, NULL, 'PETROL', 4.4, '2021-04-05', 45000000, 32000000, 0, 18000, 18000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2021 mua từ tháng 4/2021'),
  (v_mtb26_id, target_user_id, 'Xe đạp Thống Nhất MTB 26-05', 'BICYCLE', 'Mountain Bike', 'THONGNHAT', 'MTB 26-05', 2024, NULL, 'Xanh Thể Thao', 'MTB 26-555', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 3000000, 2200000, 0, 235, 235, 'GPS', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp thể thao Thống Nhất MTB 26-05'),
  (v_mtb20_id, target_user_id, 'Xe đạp Thống Nhất MTB 20-05', 'BICYCLE', 'Kids/Youth Bike', 'THONGNHAT', 'MTB 20-05', 2024, NULL, 'Đỏ', 'MTB 20-999', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 2500000, 1800000, 0, 235, 235, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp trẻ em Thống Nhất MTB 20-05'),
  (v_carnival_id, target_user_id, 'Kia Carnival (Dự kiến)', 'CAR', 'MPV 7 chỗ', 'KIA', 'Canival', 2030, NULL, 'Đen', 'CANIVAL', NULL, NULL, 'PETROL', NULL, '2030-03-08', 2000000000, 2000000000, 0, 0, 0, 'VIRTUAL', 'INACTIVE', NULL, 'Mục tiêu ô tô 7 chỗ gia đình tương lai');

  -- --------------------------------------------------------------------------
  -- D. CHÈN KHOẢN VAY TPBANK CHO MAZDA 2
  -- --------------------------------------------------------------------------
  INSERT INTO public.loans (
    id, asset_id, lender, principal, down_payment, interest_rate_percent, term_months, start_date, monthly_payment, payment_day, current_balance, status, notes
  ) VALUES
  (v_loan_id, v_mazda_id, 'TPBank', 295000000, 102000000, 8.0, 60, '2026-04-07', 7378216, 28, 270918368, 'ACTIVE', '8% năm đầu -> 11.5% các năm sau');

  -- Lịch sử các kỳ thanh toán khoản vay TPBank
  INSERT INTO public.loan_payments (loan_id, payment_number, due_date, principal_paid, interest_paid, total_payment, paid_date, status, remaining_balance) VALUES
  (v_loan_id, 1, '2026-04-28', 6020408, 1357808, 7378216, '2026-04-28', 'PAID', 288979592),
  (v_loan_id, 2, '2026-05-27', 6020408, 1773464, 7793872, '2026-05-27', 'PAID', 282959184),
  (v_loan_id, 3, '2026-06-26', 6020408, 1922572, 7942980, '2026-06-26', 'PAID', 276938776),
  (v_loan_id, 4, '2026-07-26', 6020408, 1881666, 7902074, '2026-07-26', 'PAID', 270918368);

  -- --------------------------------------------------------------------------
  -- E. CHÈN 11 HẠNG MỤC PHỤ TÙNG & ĐỒ ĐỘ NÂNG CẤP (PARTS)
  -- --------------------------------------------------------------------------
  INSERT INTO public.parts (asset_id, part_name, brand, supplier, installation_date, cost, installed_odometer_km, notes, status) VALUES
  (v_mazda_id, 'Màn hình ZX ADAS Limited', 'Zestech Auto', 'Màn hình & ADAS', '2026-05-09', 17000000, 593, 'Màn hình thông minh tích hợp camera ADAS', 'INSTALLED'),
  (v_mazda_id, 'Gập gương điện', 'Gập Gương Auto', 'Ngoại thất', '2026-04-09', 1800000, 20, 'Tự động gập gương khi khóa cửa', 'INSTALLED'),
  (v_mazda_id, 'Phím media vô năng', 'OEM Mazda', 'Nội thất', '2026-04-12', 2000000, 24, 'Phím điều khiển âm thanh trên vô năng', 'INSTALLED'),
  (v_mazda_id, 'Cảm biến áp suất lốp Zestech (TPMS)', 'Zestech', 'An toàn & Lốp', '2026-04-12', 1500000, 24, 'TPMS hiển thị áp suất lốp trực tiếp', 'INSTALLED'),
  (v_mazda_id, 'Bao chìa khoá da', 'OEM', 'Nội thất', '2026-04-12', 93000, 24, 'Bao chìa khoá da sang trọng', 'INSTALLED'),
  (v_mazda_id, 'Biển tên số điện thoại taplo', 'OEM', 'Nội thất', '2026-04-14', 70000, 108, 'Biển tên số điện thoại để taplo', 'INSTALLED'),
  (v_mazda_id, 'Củ sạc nhanh trên xe', 'Baseus', 'Điện tử', '2026-04-19', 100000, 230, 'Củ sạc nhanh cắm tẩu 12V', 'INSTALLED'),
  (v_mazda_id, 'Thùng rác mini ô tô', 'OEM', 'Nội thất', '2026-04-19', 52000, 230, 'Thùng rác mini gắn cửa xe', 'INSTALLED'),
  (v_mazda_id, 'Bộ thảm lót sàn da 5D', '5D Auto', 'Nội thất', '2026-04-19', 864000, 230, 'Bộ thảm lót sàn da 5D may chuẩn form', 'INSTALLED'),
  (v_mazda_id, 'Máy rửa xe cao áp gia đình', 'Bosch', 'Thiết bị chăm sóc xe', '2026-04-19', 2200000, 235, 'Máy rửa xe cao áp gia đình', 'INSTALLED'),
  (v_mazda_id, 'Bơm lốp Toyota điện tử', 'Toyota', 'Thiết bị lốp', '2026-04-21', 389000, 235, 'Bơm lốp điện tử cắm tẩu 12V', 'INSTALLED'),
  (v_mtb26_id, 'Gác chân xe đạp', 'Thống Nhất', 'Phụ kiện', '2025-02-21', 35000, 0, 'Gác chân sau', 'INSTALLED'),
  (v_mtb26_id, 'Ghế ngồi trước cho bé', 'Thống Nhất', 'Phụ kiện', '2025-04-21', 390000, 0, 'Ghế em bé an toàn', 'INSTALLED'),
  (v_mtb26_id, 'Đèn trước xe đạp', 'OEM', 'Điện tử', '2025-04-21', 64900, 0, 'Đèn LED siêu sáng', 'INSTALLED'),
  (v_mtb26_id, 'Mũ thể thao', 'OEM', 'Phụ kiện', '2025-04-21', 36000, 0, 'Mũ bảo hiểm xe đạp', 'INSTALLED'),
  (v_mtb26_id, 'Đèn hậu xe đạp', 'OEM', 'Điện tử', '2025-04-21', 67500, 0, 'Đèn LED cảnh báo sau', 'INSTALLED'),
  (v_mtb26_id, 'Giá bình nước', 'OEM', 'Phụ kiện', '2025-04-21', 24650, 0, 'Gọng kẹp bình nước', 'INSTALLED');

  -- --------------------------------------------------------------------------
  -- F. CHÈN 10 NHẬT KÝ ĐỔ XĂNG THỰC TẾ (FUEL LOGS)
  -- --------------------------------------------------------------------------
  INSERT INTO public.fuel_logs (asset_id, timestamp, odometer_km, fuel_liters, price_per_liter, total_cost, station, tank_full, notes) VALUES
  (v_mazda_id, '2026-04-09 08:00:00+07', 12, 37.70, 26525, 1000000, 'Cây xăng Thaco', true, 'Đổ xăng lần đầu 37,7L'),
  (v_mazda_id, '2026-05-01 08:00:00+07', 412, 21.05, 23750, 500000, 'CHX Ron95-III', true, NULL),
  (v_mazda_id, '2026-05-09 08:00:00+07', 593, 31.68, 25252, 800000, 'CHX Ron95-IV', true, NULL),
  (v_mazda_id, '2026-05-27 08:00:00+07', 824, 30.54, 25540, 780000, 'CHX Ron95-III', true, NULL),
  (v_mazda_id, '2026-06-18 08:00:00+07', 1174, 27.60, 21739, 600000, 'E10 Ron95-V', true, NULL),
  (v_mazda_id, '2026-07-01 08:00:00+07', 1531, 26.97, 22250, 600105, 'E10 Ron95-V', true, NULL),
  (v_mazda_id, '2026-07-11 08:00:00+07', 1799, 28.30, 21201, 600000, 'E10 Ron95-V', true, NULL),
  (v_mazda_id, '2026-07-23 08:00:00+07', 2109, 35.04, 22831, 800000, 'E10 Ron95-V', true, NULL),
  (v_mazda_id, '2026-08-12 08:00:00+07', 2436, 25.29, 23724, 600000, 'E10 Ron95-V', true, NULL),
  (v_mazda_id, '2026-08-23 08:00:00+07', 2646, 34.10, 24049, 820073, 'Ron95-V', true, NULL);

  -- --------------------------------------------------------------------------
  -- G. CHÈN BẢN GHI BẢO DƯỠNG THỰC TẾ (MAINTENANCE)
  -- --------------------------------------------------------------------------
  INSERT INTO public.maintenance_records (asset_id, maintenance_type, date, odometer_km, cost, vendor, notes, next_due_km, next_due_date) VALUES
  (v_mazda_id, 'Bảo dưỡng định kỳ lần đầu mức 1000Km', '2026-07-16', 1920, 1172016, 'Mazda Thaco', 'Thay nhớt động cơ + lọc nhớt + kiểm tra 20 hạng mục Thaco', 5000, '2026-10-15'),
  (v_mtb20_id, 'Sửa phanh xe đạp MTB 20', '2025-06-21', 235, 100000, 'Tiệm sửa xe', NULL, NULL, NULL),
  (v_mtb20_id, 'Thay tay phanh xe đạp', '2023-02-23', 235, 100000, 'Tiệm sửa xe', NULL, NULL, NULL);

  -- --------------------------------------------------------------------------
  -- H. CHÈN ĐẦY ĐỦ TOÀN BỘ 60 CHI PHÍ THỰC TẾ (EXPENSES)
  -- --------------------------------------------------------------------------
  INSERT INTO public.expenses (asset_id, date, category, amount, currency, vendor, odometer_km, description) VALUES
  -- Chi phí mua xe & lăn bánh ban đầu Mazda 2
  (v_mazda_id, '2026-03-08', 'Initial', 10000000, 'VND', 'Showroom Mazda', NULL, 'Đặt cọc lần 1'),
  (v_mazda_id, '2026-03-19', 'Initial', 30000000, 'VND', 'Showroom Mazda', NULL, 'Chuyển tiền lần 2'),
  (v_mazda_id, '2026-04-01', 'Initial', 62000000, 'VND', 'Showroom Mazda', NULL, 'Chuyển tiền lần 3 (Tiền mặt xe)'),
  (v_mazda_id, '2026-04-05', 'Initial', 40300000, 'VND', 'Chi cục Thuế', NULL, 'Lệ phí trước bạ'),
  (v_mazda_id, '2026-04-05', 'Initial', 3270700, 'VND', 'Trạm Đăng Kiểm', NULL, 'Đăng kiểm, đường bộ, dân sự TNDS'),
  (v_mazda_id, '2026-04-07', 'Initial', 1400000, 'VND', 'Dịch vụ ĐK', NULL, 'Phí dịch vụ đăng ký biển số'),
  (v_mazda_id, '2026-04-06', 'Initial', 4300000, 'VND', 'Bảo hiểm', NULL, 'Phí bảo hiểm thân vỏ'),
  (v_mazda_id, '2026-04-06', 'Initial', 3440000, 'VND', 'TPBank', NULL, 'Phí dịch vụ ngân hàng'),
  (v_mazda_id, '2026-04-06', 'Initial', 3000000, 'VND', 'Bảo hiểm khoản vay', NULL, 'Phí bảo hiểm khoản vay TPBank'),
  -- Chi phí nâng cấp đồ chơi Mazda 2
  (v_mazda_id, '2026-05-09', 'Upgrade', 17000000, 'VND', 'Zestech Auto', 593, 'Lắp màn hình ZX ADAS Limited'),
  (v_mazda_id, '2026-04-09', 'Upgrade', 1800000, 'VND', 'Garage Gập Gương', 20, 'Gập gương điện'),
  (v_mazda_id, '2026-04-12', 'Upgrade', 2000000, 'VND', NULL, 24, 'Phím media vô năng'),
  (v_mazda_id, '2026-04-12', 'Upgrade', 1500000, 'VND', 'Zestech', 24, 'Cảm biến áp suất lốp Zestech (TPMS)'),
  (v_mazda_id, '2026-04-12', 'Upgrade', 93000, 'VND', NULL, 24, 'Bao chìa khoá'),
  (v_mazda_id, '2026-04-14', 'Upgrade', 70000, 'VND', NULL, 108, 'Biển tên số điện thoại'),
  (v_mazda_id, '2026-04-19', 'Upgrade', 100000, 'VND', NULL, 230, 'Sạc trên xe'),
  (v_mazda_id, '2026-04-19', 'Upgrade', 52000, 'VND', NULL, 230, 'Thùng rác ô tô'),
  (v_mazda_id, '2026-04-19', 'Upgrade', 864000, 'VND', NULL, 230, 'Thảm lót sàn'),
  (v_mazda_id, '2026-04-19', 'Running', 2200000, 'VND', NULL, 235, 'Máy rửa xe gia đình'),
  (v_mazda_id, '2026-04-21', 'Upgrade', 389000, 'VND', 'Toyota', 235, 'Bơm lốp Toyota'),
  (v_mazda_id, '2026-07-26', 'Running', 250000, 'VND', NULL, 2163, 'Khử mùi trong xe vị cafe'),
  -- Chi phí vận hành, xăng, cầu đường Mazda 2
  (v_mazda_id, '2026-04-09', 'Running', 1000000, 'VND', NULL, 12, 'Đổ xăng lần đầu 37,7L'),
  (v_mazda_id, '2026-04-17', 'Running', 120000, 'VND', 'Epass', 218, 'Phí đăng ký thẻ Epass'),
  (v_mazda_id, '2026-04-18', 'Running', 6600, 'VND', 'Epass', NULL, 'Trừ phí DV quản lý TK và TB xe qua trạm 04/2026'),
  (v_mazda_id, '2026-05-01', 'Running', 500000, 'VND', NULL, 412, 'Đổ xăng Ron95-III'),
  (v_mazda_id, '2026-04-30', 'Running', 3250000, 'VND', NULL, 409, 'Đổ bê tông sân đỗ xe'),
  (v_mazda_id, '2026-05-02', 'Running', 13200, 'VND', 'Epass', 479, 'Phí trạm 05/2026'),
  (v_mazda_id, '2026-05-09', 'Running', 800000, 'VND', NULL, 593, 'Đổ xăng Ron95-IV'),
  (v_mazda_id, '2026-05-27', 'Running', 780000, 'VND', NULL, 824, 'Đổ xăng Ron95-III'),
  (v_mazda_id, '2026-06-18', 'Running', 600000, 'VND', NULL, 1174, 'Đổ xăng E10 Ron95-V'),
  (v_mazda_id, '2026-07-01', 'Running', 600105, 'VND', NULL, 1531, 'Đổ xăng E10 Ron95-V'),
  (v_mazda_id, '2026-07-11', 'Running', 600000, 'VND', NULL, 1799, 'Đổ xăng E10 Ron95-V'),
  (v_mazda_id, '2026-07-23', 'Running', 800000, 'VND', NULL, 2109, 'Đổ xăng E10 Ron95-V'),
  (v_mazda_id, '2026-07-26', 'Running', 50000, 'VND', 'Anh Chung Lương', 2163, 'Rửa xe nhà anh Chung Lương'),
  (v_mazda_id, '2026-08-12', 'Running', 600000, 'VND', NULL, 2436, 'Đổ xăng E10 Ron95-V'),
  (v_mazda_id, '2026-08-23', 'Running', 820073, 'VND', NULL, 2646, 'Đổ xăng Ron95-V'),
  -- Trả nợ gốc & lãi vay TPBank
  (v_mazda_id, '2026-04-28', 'Loan', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 1 (04/2026)'),
  (v_mazda_id, '2026-04-28', 'Loan', 1357808, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 1 (04/2026)'),
  (v_mazda_id, '2026-05-27', 'Loan', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 2 (05/2026)'),
  (v_mazda_id, '2026-05-27', 'Loan', 1773464, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 2 (05/2026)'),
  (v_mazda_id, '2026-06-26', 'Loan', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 3 (06/2026)'),
  (v_mazda_id, '2026-06-26', 'Loan', 1922572, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 3 (06/2026)'),
  (v_mazda_id, '2026-07-26', 'Loan', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 4 (07/2026)'),
  (v_mazda_id, '2026-07-26', 'Loan', 1881666, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 4 (07/2026)'),
  -- Chi phí xe máy & xe đạp
  (v_bike16_id, '2017-08-01', 'Initial', 35000000, 'VND', NULL, NULL, 'Mua xe Air Blade 2016'),
  (v_bike21_id, '2021-04-05', 'Initial', 45000000, 'VND', NULL, NULL, 'Mua xe Air Blade 2021'),
  (v_mtb26_id, '2024-03-10', 'Initial', 3000000, 'VND', NULL, NULL, 'Mua xe MTB 26-05'),
  (v_mtb20_id, '2024-03-10', 'Initial', 2500000, 'VND', NULL, NULL, 'Mua xe MTB 20-05'),
  (v_mtb26_id, '2025-02-21', 'Upgrade', 35000, 'VND', NULL, NULL, 'Gác chân xe đạp'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 390000, 'VND', NULL, NULL, 'Ghế ngồi trước cho bé'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 64900, 'VND', NULL, NULL, 'Đèn trước xe đạp'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 36000, 'VND', NULL, NULL, 'Mũ thể thao'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 67500, 'VND', NULL, NULL, 'Đèn hậu xe đạp'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 24650, 'VND', NULL, NULL, 'Giá bình nước'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 56000, 'VND', NULL, NULL, 'Khóa dây'),
  (v_mtb26_id, '2025-04-21', 'Upgrade', 72000, 'VND', NULL, NULL, 'Túi treo sườn'),
  (v_mtb20_id, '2025-06-21', 'Maintenance', 100000, 'VND', NULL, NULL, 'Sửa phanh xe'),
  (v_mtb20_id, '2025-06-22', 'Upgrade', 100000, 'VND', NULL, NULL, 'Đệm ghế sau'),
  (v_mtb20_id, '2023-02-23', 'Maintenance', 100000, 'VND', NULL, NULL, 'Thay tay phanh');

END $$;

-- 3. Kích hoạt lại RLS bảo mật
ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parts ENABLE ROW LEVEL SECURITY;
