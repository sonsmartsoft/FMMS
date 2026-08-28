-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0005: Seed Sample Mobility Assets & Operations Data
-- ========================================================

-- Insert Default Demo Fleet & Assets
DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
    demo_fleet_id UUID := '11111111-1111-1111-1111-111111111111'::uuid;
    mazda2_id UUID := '22222222-2222-2222-2222-222222222222'::uuid;
    roadbike_id UUID := '33333333-3333-3333-3333-333333333333'::uuid;
    ebike_id UUID := '44444444-4444-4444-4444-444444444444'::uuid;
    motorcycle_id UUID := '55555555-5555-5555-5555-555555555555'::uuid;
BEGIN

    -- 1. Assets
    INSERT INTO public.assets (
        id, fleet_id, owner_id, name, asset_type, category, brand, model, year, trim, 
        color, license_plate, vin, fuel_type, tank_capacity_liters, purchase_date, 
        purchase_price, current_value, initial_odometer_km, current_odometer_km, 
        virtual_odometer_km, odometer_source, status, image_url, description
    ) VALUES 
    (
        mazda2_id, demo_fleet_id, demo_user_id, 'Mazda2 Base 2026', 'CAR', 'Hatchback', 'Mazda', 'Mazda2', 2026, 'Base',
        'Xám Kim Loại', '30A-888.88', 'JM1DJ1010102026', 'PETROL', 44.0, '2026-01-10',
        520000000, 490000000, 0, 12846, 12846, 'VIRTUAL', 'ACTIVE',
        'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
        'Xe ô tô gia đình chính. Trang bị màn hình ZESTECH 9 inch + Konnwei KW906 OBD-II'
    ),
    (
        roadbike_id, demo_fleet_id, demo_user_id, 'Road Bike Specialized Tarmac', 'BICYCLE', 'Road', 'Specialized', 'Tarmac SL7', 2025, 'Expert',
        'Đen Nhám', NULL, NULL, 'HUMAN_POWER', NULL, '2025-06-15',
        85000000, 78000000, 0, 2842, 2842, 'GPS', 'ACTIVE',
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop',
        'Xe đạp đường trường thể thao dùng cho tập luyện cuối tuần'
    ),
    (
        ebike_id, demo_fleet_id, demo_user_id, 'VinFast Feliz S E-Scooter', 'E_BIKE', 'Scooter', 'VinFast', 'Feliz S', 2026, 'Standard',
        'Trắng', '29-MD1-999.99', NULL, 'ELECTRIC', NULL, '2026-03-20',
        29900000, 27000000, 0, 1420, 1420, 'GPS', 'ACTIVE',
        'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop',
        'Xe máy điện đi lại hằng ngày trong nội thành'
    ),
    (
        motorcycle_id, demo_fleet_id, demo_user_id, 'BMW S1000RR', 'MOTORCYCLE', 'Superbike', 'BMW', 'S1000RR', 2024, 'M Package',
        'Xanh Đỏ M', '30A-666.66', 'WB10E210998877', 'PETROL', 16.5, '2024-11-05',
        980000000, 920000000, 0, 4500, 4500, 'OBD', 'ACTIVE',
        'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop',
        'Xe mô tô phân khối lớn đi tour tầm xa'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Capabilities
    INSERT INTO public.asset_capabilities (asset_id, has_mileage, has_gps, has_fuel, has_obd, has_engine, has_battery, has_ride, has_finance, has_insurance)
    VALUES 
    (mazda2_id, true, true, true, true, true, false, false, true, true),
    (roadbike_id, true, true, false, false, false, false, true, false, false),
    (ebike_id, true, true, false, false, false, true, true, false, true),
    (motorcycle_id, true, true, true, true, true, false, false, true, true)
    ON CONFLICT (asset_id) DO NOTHING;

    -- 3. Fuel Logs for Mazda2
    INSERT INTO public.fuel_logs (asset_id, odometer_km, fuel_liters, price_per_liter, total_cost, station, notes)
    VALUES
    (mazda2_id, 12200, 38.5, 22500, 866250, 'Petrolimex CH 01', 'Đổ đầy bình trước chuyến đi Hải Phòng'),
    (mazda2_id, 12846, 35.0, 23100, 808500, 'PV OIL CH 12', 'Đổ đầy bình nội thành')
    ON CONFLICT DO NOTHING;

    -- 4. Expenses
    INSERT INTO public.expenses (asset_id, date, category, amount, vendor, description)
    VALUES
    (mazda2_id, '2026-08-01', 'MAINTENANCE', 1250000, 'Mazda Hà Đông', 'Bảo dưỡng cấp 10.000 km + thay nhớt động cơ'),
    (mazda2_id, '2026-08-05', 'TOLL', 120000, 'ETC VETC', 'Nạp tiền tài khoản giao thông qua trạm'),
    (roadbike_id, '2026-07-20', 'PARTS', 1800000, 'ShopXeDap.vn', 'Thay xích Shimano Dura-Ace 12s mới')
    ON CONFLICT DO NOTHING;

    -- 5. Loan for Mazda2
    INSERT INTO public.loans (asset_id, lender, principal, down_payment, interest_rate_percent, term_months, start_date, monthly_payment, current_balance)
    VALUES
    (mazda2_id, 'BIDV Chi Nhánh Cầu Giấy', 250000000, 270000000, 7.5, 36, '2026-01-15', 7800000, 210000000)
    ON CONFLICT DO NOTHING;

END $$;
