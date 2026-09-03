-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0005: Clean Real Family Mobility Assets (NO DEMO DATA)
-- ========================================================

DO $$
DECLARE
    target_user_id UUID;
    v_mazda_id UUID    := '20260308-0001-4222-8888-19b213872026';
    v_bike16_id UUID   := '20170801-0002-4111-8888-88c121063016';
    v_bike21_id UUID   := '20210405-0003-4333-8888-88f160436021';
    v_mtb26_id UUID    := '20240310-0004-4444-8888-000000260555';
    v_mtb20_id UUID    := '20240310-0005-4555-8888-000000200555';
    v_carnival_id UUID := '20300308-0006-4666-8888-00000ca20300';
    v_loan_id UUID     := '20260407-0001-4000-8888-000000000001';
BEGIN
    -- 1. Lấy user admin đầu tiên làm owner
    SELECT id INTO target_user_id FROM auth.users LIMIT 1;

    -- 2. Xóa sạch mọi xe demo mẫu cũ
    DELETE FROM public.assets WHERE id IN (
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444',
        '55555555-5555-5555-5555-555555555555',
        '66666666-6666-6666-6666-666666666666'
    ) OR name ILIKE '%Specialized%' OR name ILIKE '%Feliz S%' OR name ILIKE '%S1000RR%' OR name ILIKE '%Base 2026%';

    -- 3. Nạp 6 xe thực tế chuẩn
    INSERT INTO public.assets (
        id, owner_id, name, asset_type, category, brand, model, year, trim, color, 
        license_plate, vin, engine, fuel_type, tank_capacity_liters, purchase_date, 
        purchase_price, current_value, initial_odometer_km, current_odometer_km, 
        virtual_odometer_km, odometer_source, status, image_url, description
    ) VALUES
    (v_mazda_id, target_user_id, 'Mazda 2AT 2026', 'CAR', 'Sedan/Hatchback', 'MAZDA', 'Mazda 2', 2026, '1.5L AT', 'Trắng Ngọc Trai', '19B-213.87', 'JM1DJ1010102026', '1.5L SkyActiv-G', 'PETROL', 44.0, '2026-03-08', 397000000, 380000000, 0, 2651, 2651, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1590362891991-f776e747a588?q=80&w=1000&auto=format&fit=crop', 'Xe ô tô gia đình chính Mazda 2 (19B-213.87). Vay ngân hàng TPBank 295,000,000 ₫.'),
    (v_bike16_id, target_user_id, 'Honda Air Blade 2016', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2016', 2016, '125cc FI', 'Đen Nhám', '88C1-210.63', NULL, NULL, 'PETROL', 4.4, '2017-08-01', 35000000, 18000000, 0, 45000, 45000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2016 gia đình đi lại hằng ngày'),
    (v_bike21_id, target_user_id, 'Honda Air Blade 2021', 'MOTORCYCLE', 'Tay ga', 'HONDA', 'Air Blade 2021', 2021, '125cc Special', 'Xanh Xám', '88L1-604.36', NULL, NULL, 'PETROL', 4.4, '2021-04-05', 45000000, 32000000, 0, 18000, 18000, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop', 'Xe máy Air Blade 2021 mua từ tháng 4/2021'),
    (v_mtb26_id, target_user_id, 'Xe đạp Thống Nhất MTB 26-05', 'BICYCLE', 'Mountain Bike', 'THONGNHAT', 'MTB 26-05', 2024, NULL, 'Xanh Thể Thao', 'MTB 26-555', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 3000000, 2200000, 0, 235, 235, 'GPS', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp thể thao Thống Nhất MTB 26-05'),
    (v_mtb20_id, target_user_id, 'Xe đạp Thống Nhất MTB 20-05', 'BICYCLE', 'Kids/Youth Bike', 'THONGNHAT', 'MTB 20-05', 2024, NULL, 'Đỏ', 'MTB 20-999', NULL, NULL, 'HUMAN_POWER', NULL, '2024-03-10', 2500000, 1800000, 0, 235, 235, 'VIRTUAL', 'ACTIVE', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop', 'Xe đạp trẻ em Thống Nhất MTB 20-05'),
    (v_carnival_id, target_user_id, 'Kia Carnival (Dự kiến)', 'CAR', 'MPV 7 chỗ', 'KIA', 'Canival', 2030, NULL, 'Đen', 'CANIVAL', NULL, NULL, 'PETROL', NULL, '2030-03-08', 2000000000, 2000000000, 0, 0, 0, 'VIRTUAL', 'INACTIVE', NULL, 'Mục tiêu ô tô 7 chỗ gia đình tương lai')
    ON CONFLICT (id) DO NOTHING;

END $$;
