-- ==============================================================================
-- FMMS: ĐỒNG BỘ CHUẨN XÁC ODOMETER 2.940 KM CHO XE MAZDA 2
-- ==============================================================================

-- 1. CẬP NHẬT ODO XE MAZDA 2 VỀ CHÍNH XÁC 2.940 KM
UPDATE public.assets
SET 
  current_odometer_km = 2940,
  virtual_odometer_km = 2940,
  updated_at = NOW()
WHERE id = '20260308-0001-4222-8888-19b213872026'
   OR name ILIKE '%Mazda%2%';

-- 2. CẬP NHẬT CÁC CHUYẾN ĐI NẾU BỊ TÍNH LỆCH ODO > 2940 KM
UPDATE public.trips
SET end_odometer = 2940
WHERE asset_id = '20260308-0001-4222-8888-19b213872026'
  AND end_odometer > 2940;

-- 3. XEM KẾT QUẢ ĐÃ ĐỒNG BỘ THÀNH CÔNG:
SELECT id, name, current_odometer_km, virtual_odometer_km, updated_at
FROM public.assets 
WHERE id = '20260308-0001-4222-8888-19b213872026' OR name ILIKE '%Mazda%2%';
