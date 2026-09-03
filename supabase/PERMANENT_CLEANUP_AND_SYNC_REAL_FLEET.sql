-- ============================================================================
-- FMMS: BẢN PRODUCTION CHUẨN - XÓA SẠCH DEMO & NẠP VĨNH VIỄN DÀN XE THỰC TẾ
-- (Đảm bảo 100% cột CSDL tồn tại, Mazda 2 Trắng Ngọc Trai, Trả trước = 0đ, Hotline, Cán bộ NH)
-- ============================================================================

-- 1. Bổ sung tất cả các cột cần thiết cho CSDL Production (Nếu chưa có)
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS sales_rep_name TEXT;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS sales_rep_phone TEXT;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS brand_hotline TEXT;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS engine TEXT;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS battery_capacity_kwh NUMERIC;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS virtual_odometer_km NUMERIC;
ALTER TABLE IF EXISTS public.assets ADD COLUMN IF NOT EXISTS odometer_source TEXT;
ALTER TABLE IF EXISTS public.assets ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS down_payment NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS bank_contact_name TEXT;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS bank_contact_phone TEXT;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS bank_hotline TEXT;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS preferred_rate_percent NUMERIC;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS preferred_months INTEGER;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS floating_rate_percent NUMERIC;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS loan_ratio_percent NUMERIC;
ALTER TABLE IF EXISTS public.loans ADD COLUMN IF NOT EXISTS payment_day INTEGER DEFAULT 15;

ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS sub_category TEXT;
ALTER TABLE IF EXISTS public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE IF EXISTS public.maintenance_records ADD COLUMN IF NOT EXISTS next_due_km NUMERIC;
ALTER TABLE IF EXISTS public.maintenance_records ADD COLUMN IF NOT EXISTS next_due_date DATE;

-- 2. Tạm thời tắt RLS trong lúc nạp dữ liệu
ALTER TABLE IF EXISTS public.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parts DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_mazda_id UUID    := '20260308-0001-4222-8888-19b213872026';
  v_bike16_id UUID   := '20170801-0002-4111-8888-88c121063016';
  v_bike21_id UUID   := '20210405-0003-4333-8888-88f160436021';
  v_mtb26_id UUID    := '20240310-0004-4444-8888-000000260555';
  v_mtb20_id UUID    := '20240310-0005-4555-8888-000000200555';
  v_carnival_id UUID := '20300308-0006-4666-8888-00000ca20300';
  v_loan_id UUID     := '20260407-0001-4000-8888-000000000001';
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;

  -- A. XÓA BỎ HOÀN TOÀN CÁC DỮ LIỆU CŨ & DEMO
  DELETE FROM public.loan_payments;
  DELETE FROM public.loans;
  DELETE FROM public.expenses;
  DELETE FROM public.fuel_logs;
  DELETE FROM public.maintenance_records;
  DELETE FROM public.parts;
  DELETE FROM public.asset_capabilities;
  DELETE FROM public.assets;

  -- B. NẠP 6 PHƯƠNG TIỆN THỰC TẾ CHUẨN GIA ĐÌNH
  INSERT INTO public.assets (
    id, owner_id, name, asset_type, category, brand, model, year, trim, color, license_plate, vin, engine, fuel_type, tank_capacity_liters, purchase_date, purchase_price, current_value, initial_odometer_km, current_odometer_km, virtual_odometer_km, odometer_source, status, image_url, description, sales_rep_name, sales_rep_phone, brand_hotline
  ) VALUES
  (v_mazda_id, target_user_id, 'Mazda 2AT 2026', 'CAR', 'Sedan/Hatchback', 'MAZDA', 'Mazda 2', 2026, '1.5L AT', 'Trắng Ngọc Trai', '19B-213.87', 'JM1DJ1010102026', '1.5L SkyActiv-G', 'PETROL', 44.0, '2026-03-08', 397000000, 380000000, 0, 2651, 2651, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=1000&auto=format&fit=crop', 'Xe ô tô gia đình chính Mazda 2 (19B-213.87). Vay ngân hàng TPBank 295,000,000 ₫.', 'Showroom Mazda Phú Thọ', '0901234567', '1900 54 55 91'),
  (v_bike16_id, target_user_id, 'Honda Air Blade 2016', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2016', 2016, '125cc FI', 'Đen Nhám', '88C1-210.63', NULL, NULL, 'PETROL', 4.4, '2017-08-01', 35000000, 18000000, 0, 45000, 45000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2016 gia đình đi lại hằng ngày', NULL, NULL, '1800 8001'),
  (v_bike21_id, target_user_id, 'Honda Air Blade 2021', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2021', 2021, '125cc Special', 'Xanh Xám', '88L1-604.36', NULL, NULL, 'PETROL', 4.4, '2021-04-05', 45000000, 32000000, 0, 18000, 18000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2021 mua từ tháng 4/2021', NULL, NULL, '1800 8001'),
  (v_mtb26_id, target_user_id, 'Xe đạp Thống Nhất MTB 26-05', 'BICYCLE', 'Mountain Bike', 'THONGNHAT', 'MTB 26-05', 2024, NULL, 'Xanh Thể Thao', 'MTB 26-555', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 3000000, 2200000, 0, 235, 235, 'GPS', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp thể thao Thống Nhất MTB 26-05', NULL, NULL, NULL),
  (v_mtb20_id, target_user_id, 'Xe đạp Thống Nhất MTB 20-05', 'BICYCLE', 'Kids/Youth Bike', 'THONGNHAT', 'MTB 20-05', 2024, NULL, 'Đỏ', 'MTB 20-999', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 2500000, 1800000, 0, 235, 235, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp trẻ em Thống Nhất MTB 20-05', NULL, NULL, NULL),
  (v_carnival_id, target_user_id, 'Kia Carnival (Dự kiến)', 'CAR', 'MPV 7 chỗ', 'KIA', 'Canival', 2030, NULL, 'Đen', 'CANIVAL', NULL, NULL, 'PETROL', NULL, '2030-03-08', 2000000000, 2000000000, 0, 0, 0, 'VIRTUAL', 'INACTIVE', NULL, 'Mục tiêu ô tô 7 chỗ gia đình tương lai', NULL, NULL, '1900 54 55 91');

  -- C. KHOẢN VAY TPBANK MAZDA 2 (TRẢ TRƯỚC = 0 VNĐ, ĐẦY ĐỦ HOTLINE & CÁN BỘ TÍN DỤNG)
  INSERT INTO public.loans (
    id, asset_id, lender, principal, down_payment, interest_rate_percent, preferred_rate_percent, preferred_months, floating_rate_percent, loan_ratio_percent, term_months, start_date, monthly_payment, payment_day, current_balance, status, notes, bank_contact_name, bank_contact_phone, bank_hotline
  ) VALUES
  (v_loan_id, v_mazda_id, 'TPBank', 295000000, 0, 8.0, 8.0, 12, 11.5, 74.3, 60, '2026-04-07', 7378216, 28, 270918368, 'ACTIVE', '8% năm đầu -> 11.5% các năm sau', 'Cán bộ tín dụng TPBank', '0988888888', '1900 58 58 85');

  INSERT INTO public.loan_payments (loan_id, payment_number, due_date, principal_paid, interest_paid, total_payment, paid_date, status, remaining_balance) VALUES
  (v_loan_id, 1, '2026-04-28', 6020408, 1357808, 7378216, '2026-04-28', 'PAID', 288979592),
  (v_loan_id, 2, '2026-05-27', 6020408, 1773464, 7793872, '2026-05-27', 'PAID', 282959184),
  (v_loan_id, 3, '2026-06-26', 6020408, 1922572, 7942980, '2026-06-26', 'PAID', 276938776),
  (v_loan_id, 4, '2026-07-26', 6020408, 1881666, 7902074, '2026-07-26', 'PAID', 270918368);

  -- D. 11 MỤC PHỤ TÙNG & ĐỒ CHƠI XE
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
  (v_mazda_id, 'Bơm lốp Toyota điện tử', 'Toyota', 'Thiết bị lốp', '2026-04-21', 389000, 235, 'Bơm lốp điện tử cắm tẩu 12V', 'INSTALLED');

  -- E. 10 LƯỢT ĐỔ XĂNG THỰC TẾ
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

  -- F. BẢN GHI BẢO DƯỠNG THỰC TẾ
  INSERT INTO public.maintenance_records (asset_id, maintenance_type, date, odometer_km, cost, vendor, notes, next_due_km, next_due_date) VALUES
  (v_mazda_id, 'Bảo dưỡng định kỳ lần đầu mức 1000Km', '2026-07-16', 1920, 1172016, 'Mazda Thaco', 'Thay nhớt động cơ + lọc nhớt + kiểm tra 20 hạng mục Thaco', 5000, '2026-10-15');

  -- G. CHI PHÍ THỰC TẾ
  INSERT INTO public.expenses (asset_id, date, category, amount, currency, vendor, odometer_km, description) VALUES
  (v_mazda_id, '2026-04-09', 'Mua xe ban đầu', 397000000, 'VND', 'Mazda Phú Thọ', 0, 'Giá mua xe niêm yết (Đã thanh toán trước 102tr, vay 295tr)'),
  (v_mazda_id, '2026-04-09', 'Lệ phí trước bạ', 39700000, 'VND', 'Chi cục Thuế', 0, 'Lệ phí trước bạ xe ô tô (10%)'),
  (v_mazda_id, '2026-04-09', 'Bảo hiểm thân vỏ', 6000000, 'VND', 'Bảo Việt', 0, 'Bảo hiểm vật chất xe 1 năm'),
  (v_mazda_id, '2026-04-09', 'Bảo hiểm TNDS', 480700, 'VND', 'Bảo Việt', 0, 'Bảo hiểm TNDS bắt buộc 1 năm'),
  (v_mazda_id, '2026-04-09', 'Biển số & Đăng ký', 2000000, 'VND', 'Phòng CSGT', 0, 'Phí cấp biển số xe ô tô 19B-213.87'),
  (v_mazda_id, '2026-04-09', 'Phí đăng kiểm', 340000, 'VND', 'Trung tâm đăng kiểm', 0, 'Phí kiểm định an toàn kỹ thuật'),
  (v_mazda_id, '2026-04-09', 'Phí đường bộ (1 năm)', 1560000, 'VND', 'Cục Đường Bộ', 0, 'Phí bảo trì đường bộ 12 tháng');

END $$;

-- 3. Bật lại RLS và cấp quyền cho tất cả thành viên xác thực
ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated family users" ON public.assets;
CREATE POLICY "Allow all authenticated family users" ON public.assets FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated family expenses" ON public.expenses;
CREATE POLICY "Allow all authenticated family expenses" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated family loans" ON public.loans;
CREATE POLICY "Allow all authenticated family loans" ON public.loans FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated family loan payments" ON public.loan_payments;
CREATE POLICY "Allow all authenticated family loan payments" ON public.loan_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated family fuel logs" ON public.fuel_logs;
CREATE POLICY "Allow all authenticated family fuel logs" ON public.fuel_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated family maintenance" ON public.maintenance_records;
CREATE POLICY "Allow all authenticated family maintenance" ON public.maintenance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all authenticated family parts" ON public.parts;
CREATE POLICY "Allow all authenticated family parts" ON public.parts FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
