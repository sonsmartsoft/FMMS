-- ==============================================================================
-- FMMS: SỬA LỖI TRIGGER BẢNG FUEL_LOGS & ĐỒNG BỘ LẦN ĐỔ XĂNG NGÀY 05/09/2026
-- Copy toàn bộ đoạn này và Paste vào Supabase SQL Editor rồi bấm RUN (Chạy)
-- ==============================================================================

-- 1. XÓA CÁC TRIGGER CŨ BỊ LỖI TRUY CẬP TRƯỜNG "end_odometer" TRÊN BẢNG FUEL_LOGS
DROP TRIGGER IF EXISTS trigger_update_asset_odometer ON public.fuel_logs;
DROP TRIGGER IF EXISTS trigger_auto_sync_asset_odometer ON public.fuel_logs;
DROP TRIGGER IF EXISTS trg_sync_asset_odo_fuel ON public.fuel_logs;

-- 2. TẠO HÀM TRIGGER CHUẨN XÁC RIÊNG CHO FUEL_LOGS (SỬ DỤNG NEW.odometer_km)
CREATE OR REPLACE FUNCTION public.fn_sync_asset_odometer_from_fuel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.odometer_km IS NOT NULL AND NEW.odometer_km > 0 THEN
        UPDATE public.assets 
        SET 
            current_odometer_km = GREATEST(COALESCE(current_odometer_km, 0), NEW.odometer_km),
            virtual_odometer_km = GREATEST(COALESCE(virtual_odometer_km, 0), NEW.odometer_km),
            updated_at = NOW()
        WHERE id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$;

-- 3. GẮN TRIGGER MỚI VÀO BẢNG FUEL_LOGS
CREATE TRIGGER trg_sync_asset_odo_fuel
AFTER INSERT OR UPDATE OF odometer_km ON public.fuel_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_asset_odometer_from_fuel();

-- 4. CHÈN TRỰC TIẾP DỮ LIỆU ĐỔ XĂNG NGÀY 05/09/2026 TỪ ĐẦU XE LÊN SUPABASE
INSERT INTO public.fuel_logs (
    id,
    asset_id,
    device_id,
    timestamp,
    odometer_km,
    fuel_liters,
    price_per_liter,
    total_cost,
    currency,
    station,
    tank_full,
    notes,
    fuel_level_before_pct,
    fuel_liters_before,
    fuel_level_after_pct,
    fuel_liters_after,
    calculated_consumption_l100km,
    prev_odometer_km,
    fuel_consumed_liters,
    created_at,
    updated_at
) VALUES (
    '5d2b071b-0043-432e-b533-8616bbde8fc7',
    '20260308-0001-4222-8888-19b213872026',
    'de840659-22de-47a9-a7c3-92b0763250f3',
    '2026-09-05 12:47:43.775+00',
    2977.9,
    24.42,
    24570,
    599999.4,
    'VND',
    'Cây xăng Ron95-V',
    false,
    'Đổ xăng 600k (24.42L)',
    81.18,
    35.72,
    100.0,
    44.0,
    2.50,
    2646.0,
    8.28,
    '2026-09-05 12:47:43.775+00',
    '2026-09-05 12:47:43.775+00'
) ON CONFLICT (id) DO UPDATE SET
    odometer_km = EXCLUDED.odometer_km,
    fuel_liters = EXCLUDED.fuel_liters,
    price_per_liter = EXCLUDED.price_per_liter,
    total_cost = EXCLUDED.total_cost,
    calculated_consumption_l100km = EXCLUDED.calculated_consumption_l100km,
    updated_at = NOW();

-- 5. ĐỒNG BỘ CHUYẾN ĐI CÒN THIẾU NGÀY 05/09 (17.5 km)
INSERT INTO public.trips (
    id,
    asset_id,
    device_id,
    start_time,
    end_time,
    start_odometer,
    end_odometer,
    distance_km,
    duration_seconds,
    status,
    created_at,
    updated_at
) VALUES (
    'd82ea16c-b1a0-47f8-b83c-fb11adc717a7',
    '20260308-0001-4222-8888-19b213872026',
    'de840659-22de-47a9-a7c3-92b0763250f3',
    '2026-09-05 14:13:57+00',
    '2026-09-05 14:58:08+00',
    2980.3,
    2989.5,
    17.50,
    2651,
    'COMPLETED',
    '2026-09-05 14:13:57+00',
    '2026-09-05 14:58:08+00'
) ON CONFLICT (id) DO NOTHING;

-- 6. CẬP NHẬT LẠI ODOMETER XE LÊN MỐC CAO NHẤT HIỆN TẠI (3.048,5 KM)
UPDATE public.assets
SET 
    current_odometer_km = 3048.5,
    virtual_odometer_km = 3048.5,
    updated_at = NOW()
WHERE id = '20260308-0001-4222-8888-19b213872026';

NOTIFY pgrst, 'reload schema';
