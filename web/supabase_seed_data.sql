-- ============================================================================
-- FMMS SUPABASE DATABASE OFFICIAL SEED SCRIPT
-- Copy and run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Disable RLS temporarily so insertion is allowed
ALTER TABLE IF EXISTS public.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fuel_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.parts DISABLE ROW LEVEL SECURITY;

-- 2. Drop outdated constraints that block expanded FMMS categories & nullable owner
ALTER TABLE IF EXISTS public.assets ALTER COLUMN owner_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the first user from auth.users if available
  SELECT id INTO target_user_id FROM auth.users LIMIT 1;
  
  -- Insert Assets
  INSERT INTO public.assets (
    id, owner_id, name, asset_type, category, brand, model, year, trim, color, license_plate, vin, engine, fuel_type, tank_capacity_liters, purchase_date, purchase_price, current_value, initial_odometer_km, current_odometer_km, virtual_odometer_km, odometer_source, status, image_url, description
  ) VALUES
  ('22222222-2222-2222-2222-222222222222', target_user_id, 'Mazda 2AT 2026', 'CAR', 'Sedan/Hatchback', 'MAZDA', 'Mazda 2', 2026, '1.5L AT', 'Đỏ Soul Red Crystal', '19B-213.87', 'JM1DJ1010102026', '1.5L SkyActiv-G', 'PETROL', 44.0, '2026-03-08', 397000000, 380000000, 0, 2651, 2651, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop', 'Xe ô tô gia đình chính Mazda 2 (19B-213.87). Vay ngân hàng TPBank 295,000,000 ₫.'),
  ('11111111-1111-1111-1111-111111111111', target_user_id, 'Honda Air Blade 2016', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2016', 2016, '125cc FI', 'Đen Nhám', '88C1-210.63', NULL, NULL, 'PETROL', 4.4, '2017-08-01', 35000000, 18000000, 0, 45000, 45000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2016 gia đình đi lại hằng ngày'),
  ('33333333-3333-3333-3333-333333333333', target_user_id, 'Honda Air Blade 2021', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2021', 2021, '125cc Special', 'Xanh Xám', '88L1-604.36', NULL, NULL, 'PETROL', 4.4, '2021-04-05', 45000000, 32000000, 0, 18000, 18000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2021 mua từ tháng 4/2021'),
  ('44444444-4444-4444-4444-444444444444', target_user_id, 'Xe đạp Thống Nhất MTB 26-05', 'BICYCLE', 'Mountain Bike', 'THONGNHAT', 'MTB 26-05', 2024, NULL, 'Xanh Thể Thao', 'MTB 26-555', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 3000000, 2200000, 0, 235, 235, 'GPS', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp thể thao Thống Nhất MTB 26-05'),
  ('55555555-5555-5555-5555-555555555555', target_user_id, 'Xe đạp Thống Nhất MTB 20-05', 'BICYCLE', 'Kids/Youth Bike', 'THONGNHAT', 'MTB 20-05', 2024, NULL, 'Đỏ', 'MTB 20-999', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 2500000, 1800000, 0, 235, 235, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp trẻ em Thống Nhất MTB 20-05'),
  ('66666666-6666-6666-6666-666666666666', target_user_id, 'Kia Carnival (Dự kiến)', 'CAR', 'MPV 7 chỗ', 'KIA', 'Canival', 2030, NULL, 'Đen', 'CANIVAL', NULL, NULL, 'PETROL', NULL, '2030-03-08', 2000000000, 2000000000, 0, 0, 0, 'VIRTUAL', 'INACTIVE', NULL, 'Mục tiêu ô tô 7 chỗ gia đình tương lai')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, purchase_price = EXCLUDED.purchase_price, owner_id = EXCLUDED.owner_id;

  -- Insert Loans
  INSERT INTO public.loans (
    asset_id, lender, principal, down_payment, interest_rate_percent, term_months, start_date, monthly_payment, payment_day, current_balance, status, notes
  ) VALUES
  ('22222222-2222-2222-2222-222222222222', 'TPBank', 295000000, 102000000, 8.0, 60, '2026-04-07', 7378216, 28, 270918368, 'ACTIVE', '8% năm đầu -> 11.5% các năm sau');

  -- Insert Expenses
  INSERT INTO public.expenses (asset_id, date, category, amount, currency, vendor, odometer_km, description) VALUES
  ('22222222-2222-2222-2222-222222222222', '2026-03-08', 'INITIAL', 10000000, 'VND', 'Showroom Mazda', NULL, 'Đặt cọc lần 1'),
  ('22222222-2222-2222-2222-222222222222', '2026-03-19', 'INITIAL', 30000000, 'VND', 'Showroom Mazda', NULL, 'Chuyển tiền lần 2'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-01', 'INITIAL', 62000000, 'VND', 'Showroom Mazda', NULL, 'Chuyển tiền lần 3 (Tiền mặt xe)'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-05', 'REGISTRATION', 40300000, 'VND', 'Chi cục Thuế', NULL, 'Lệ phí trước bạ'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-05', 'REGISTRATION', 3270700, 'VND', 'Trạm Đăng Kiểm', NULL, 'Đăng kiểm, đường bộ, dân sự TNDS'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-07', 'REGISTRATION', 1400000, 'VND', 'Dịch vụ ĐK', NULL, 'Phí dịch vụ đăng ký biển số'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-06', 'INSURANCE', 4300000, 'VND', 'Bảo hiểm', NULL, 'Phí bảo hiểm thân vỏ'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-06', 'INITIAL', 3440000, 'VND', 'TPBank', NULL, 'Phí dịch vụ ngân hàng'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-06', 'INITIAL', 3000000, 'VND', 'Bảo hiểm khoản vay', NULL, 'Phí bảo hiểm khoản vay TPBank'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-09', 'UPGRADE', 17000000, 'VND', 'Zestech Auto', 593, 'Lắp màn hình ZX ADAS Limited'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-09', 'UPGRADE', 1800000, 'VND', 'Garage Gập Gương', 20, 'Gập gương điện'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-12', 'UPGRADE', 2000000, 'VND', NULL, 24, 'Phím media vô năng'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-12', 'UPGRADE', 1500000, 'VND', 'Zestech', 24, 'Cảm biến áp suất lốp Zestech (TPMS)'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-12', 'UPGRADE', 93000, 'VND', NULL, 24, 'Bao chìa khoá'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-14', 'UPGRADE', 70000, 'VND', NULL, 108, 'Biển tên số điện thoại'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-19', 'UPGRADE', 100000, 'VND', NULL, 230, 'Sạc trên xe'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-19', 'UPGRADE', 52000, 'VND', NULL, 230, 'Thùng rác ô tô'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-19', 'UPGRADE', 864000, 'VND', NULL, 230, 'Thảm lót sàn'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-19', 'UPGRADE', 2200000, 'VND', NULL, 235, 'Máy rửa xe gia đình'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-21', 'UPGRADE', 389000, 'VND', 'Toyota', 235, 'Bơm lốp Toyota'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-26', 'UPGRADE', 250000, 'VND', NULL, 2163, 'Khử mùi trong xe vị cafe'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-09', 'FUEL', 1000000, 'VND', NULL, 12, 'Đổ xăng lần đầu 37,7L'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-17', 'TOLL', 120000, 'VND', 'Epass', 218, 'Phí đăng ký thẻ Epass'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-18', 'TOLL', 6600, 'VND', 'Epass', NULL, 'Trừ phí DV quản lý TK và TB xe qua trạm 04/2026'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-01', 'FUEL', 500000, 'VND', NULL, 412, 'Đổ xăng Ron95-III'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-30', 'PARKING', 3250000, 'VND', NULL, 409, 'Đổ bê tông sân đỗ xe'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-02', 'TOLL', 13200, 'VND', 'Epass', 479, 'Phí trạm 05/2026'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-09', 'FUEL', 800000, 'VND', NULL, 593, 'Đổ xăng Ron95-IV'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-27', 'FUEL', 780000, 'VND', NULL, 824, 'Đổ xăng Ron95-III'),
  ('22222222-2222-2222-2222-222222222222', '2026-06-18', 'FUEL', 600000, 'VND', NULL, 1174, 'Đổ xăng E10 Ron95-V'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-01', 'FUEL', 600105, 'VND', NULL, 1531, 'Đổ xăng E10 Ron95-V'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-11', 'FUEL', 600000, 'VND', NULL, 1799, 'Đổ xăng E10 Ron95-V'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-23', 'FUEL', 800000, 'VND', NULL, 2109, 'Đổ xăng E10 Ron95-V'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-26', 'OTHER', 50000, 'VND', 'Anh Chung Lương', 2163, 'Rửa xe nhà anh Chung Lương'),
  ('22222222-2222-2222-2222-222222222222', '2026-08-12', 'FUEL', 600000, 'VND', NULL, 2436, 'Đổ xăng E10 Ron95-V'),
  ('22222222-2222-2222-2222-222222222222', '2026-08-23', 'FUEL', 820073, 'VND', NULL, 2646, 'Đổ xăng Ron95-V'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-28', 'OTHER', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 1 (04/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-04-28', 'OTHER', 1357808, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 1 (04/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-27', 'OTHER', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 2 (05/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-05-27', 'OTHER', 1773464, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 2 (05/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-06-26', 'OTHER', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 3 (06/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-06-26', 'OTHER', 1922572, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 3 (06/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-26', 'OTHER', 6020408, 'VND', 'TPBank', NULL, 'Thanh toán gốc kỳ 4 (07/2026)'),
  ('22222222-2222-2222-2222-222222222222', '2026-07-26', 'OTHER', 1881666, 'VND', 'TPBank', NULL, 'Thanh toán lãi kỳ 4 (07/2026)'),
  ('11111111-1111-1111-1111-111111111111', '2017-08-01', 'INITIAL', 35000000, 'VND', NULL, NULL, 'Mua xe Air Blade 2016'),
  ('33333333-3333-3333-3333-333333333333', '2021-04-05', 'INITIAL', 45000000, 'VND', NULL, NULL, 'Mua xe Air Blade 2021'),
  ('44444444-4444-4444-4444-444444444444', '2024-03-10', 'INITIAL', 3000000, 'VND', NULL, NULL, 'Mua xe MTB 26-05'),
  ('55555555-5555-5555-5555-555555555555', '2024-03-10', 'INITIAL', 2500000, 'VND', NULL, NULL, 'Mua xe MTB 20-05'),
  ('44444444-4444-4444-4444-444444444444', '2025-02-21', 'UPGRADE', 35000, 'VND', NULL, NULL, 'Gác chân xe đạp'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 390000, 'VND', NULL, NULL, 'Ghế ngồi trước cho bé'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 64900, 'VND', NULL, NULL, 'Đèn trước xe đạp'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 36000, 'VND', NULL, NULL, 'Mũ thể thao'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 67500, 'VND', NULL, NULL, 'Đèn hậu xe đạp'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 24650, 'VND', NULL, NULL, 'Giá bình nước'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 56000, 'VND', NULL, NULL, 'Khóa dây'),
  ('44444444-4444-4444-4444-444444444444', '2025-04-21', 'UPGRADE', 72000, 'VND', NULL, NULL, 'Túi treo sườn'),
  ('55555555-5555-5555-5555-555555555555', '2025-06-21', 'MAINTENANCE', 100000, 'VND', NULL, NULL, 'Sửa phanh xe'),
  ('55555555-5555-5555-5555-555555555555', '2025-06-22', 'UPGRADE', 100000, 'VND', NULL, NULL, 'Đệm ghế sau'),
  ('55555555-5555-5555-5555-555555555555', '2023-02-23', 'MAINTENANCE', 100000, 'VND', NULL, NULL, 'Thay tay phanh');

END $$;

-- 3. Re-enable RLS back
ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loans ENABLE ROW LEVEL SECURITY;
