-- ==============================================================================
-- FMMS: TRUY VẾT NGUYÊN NHÂN ODO 2.977 KM SO VỚI THỰC TẾ 2.940 KM (LỆCH 37 KM)
-- ==============================================================================

-- 1. XEM MỐC ODO BAN ĐẦU VÀ ODO HIỆN TẠI TRONG BẢNG ASSETS
SELECT 
  id, name, purchase_date, 
  initial_odometer_km, current_odometer_km, virtual_odometer_km
FROM public.assets
WHERE id = '20260308-0001-4222-8888-19b213872026';

-- 2. TỔNG HỢP QUÃNG ĐƯỜNG CÁC CHUYẾN ĐI (TRIPS)
SELECT 
  COUNT(*) AS total_trips,
  SUM(distance_km) AS total_trip_distance_km,
  MIN(start_odometer) AS min_start_odo,
  MAX(end_odometer) AS max_end_odo
FROM public.trips
WHERE asset_id = '20260308-0001-4222-8888-19b213872026';

-- 3. DANH SÁCH TẤT CẢ CÁC CHUYẾN ĐI (XEM CHUYẾN NÀO BỊ TRÔI GPS HOẶC TEST ẢO)
SELECT 
  id, 
  start_time, 
  end_time, 
  distance_km, 
  start_odometer, 
  end_odometer, 
  start_location, 
  end_location,
  notes
FROM public.trips
WHERE asset_id = '20260308-0001-4222-8888-19b213872026'
ORDER BY start_time ASC;

-- 4. XEM CÁC LẦN ĐỔ XĂNG CÓ GHI NHẬN ODO
SELECT id, timestamp, odometer_km, fuel_liters, total_cost, station
FROM public.fuel_logs
WHERE asset_id = '20260308-0001-4222-8888-19b213872026'
ORDER BY timestamp ASC;
