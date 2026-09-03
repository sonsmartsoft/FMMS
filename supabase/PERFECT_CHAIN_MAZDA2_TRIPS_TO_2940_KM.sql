-- ==============================================================================
-- FMMS: TÁI CẤU TRÚC VÀ CHUỖI HÓA TOÀN BỘ CHUYẾN ĐI XE MAZDA 2 VỀ CHUẨN XÁC 2.940 KM
-- Đảm bảo: ODO Trip 1 = Mốc mua xe (12 km) -> Trip N kết thúc chuẩn xác 2.940 km
-- ==============================================================================

DO $$
DECLARE
  v_asset_id UUID := '20260308-0001-4222-8888-19b213872026';
  v_target_final_odo NUMERIC(10,2) := 2940.0;
  v_initial_odo NUMERIC(10,2) := 12.0; -- Mốc ODO showroom lúc nhận xe
  v_current_running_odo NUMERIC(10,2);
  v_trip RECORD;
  v_trip_count INT;
  v_sum_dist NUMERIC(10,2);
  v_scale_factor NUMERIC(10,6) := 1.0;
BEGIN
  -- 1. XÓA CÁC CHUYẾN ĐI RÁC (TRÔI GPS KHI XE ĐỨNG YÊN HOẶC DƯỚI 200M)
  DELETE FROM public.trips
  WHERE asset_id = v_asset_id
    AND (distance_km < 0.2 OR distance_km IS NULL);

  -- 2. TÍNH TỔNG QUÃNG ĐƯỜNG THỰC TẾ
  SELECT COUNT(*), COALESCE(SUM(distance_km), 0)
  INTO v_trip_count, v_sum_dist
  FROM public.trips
  WHERE asset_id = v_asset_id;

  -- 3. TÍNH HỆ SỐ ĐIỀU CHỈNH CHUẨN XÁC TỪNG CHUYẾN ĐI
  IF v_sum_dist > 0 AND v_trip_count > 0 THEN
    v_scale_factor := (v_target_final_odo - v_initial_odo) / v_sum_dist;
  END IF;

  -- 4. TÁI TẠO VÀ NỐI CHUỖI TOÀN BỘ CHUYẾN ĐI THEO DÒNG THỜI GIAN
  v_current_running_odo := v_initial_odo;

  FOR v_trip IN 
    SELECT id, distance_km 
    FROM public.trips 
    WHERE asset_id = v_asset_id 
    ORDER BY start_time ASC 
  LOOP
    UPDATE public.trips
    SET 
      distance_km = ROUND((v_trip.distance_km * v_scale_factor)::numeric, 2),
      start_odometer = ROUND(v_current_running_odo::numeric, 2),
      end_odometer = ROUND((v_current_running_odo + (v_trip.distance_km * v_scale_factor))::numeric, 2)
    WHERE id = v_trip.id;

    v_current_running_odo := v_current_running_odo + (v_trip.distance_km * v_scale_factor);
  END LOOP;

  -- 5. HIỆU CHỈNH CHUYẾN ĐI CUỐI CÙNG ĐỂ CHẠM ĐÍCH CHÍNH XÁC 2.940,00 KM
  UPDATE public.trips
  SET end_odometer = v_target_final_odo
  WHERE id = (
    SELECT id FROM public.trips 
    WHERE asset_id = v_asset_id 
    ORDER BY start_time DESC LIMIT 1
  );

  -- 6. ĐỒNG BỘ BẢNG ASSETS & VIRTUAL ODOMETER
  UPDATE public.assets
  SET 
    initial_odometer_km = v_initial_odo,
    current_odometer_km = v_target_final_odo,
    virtual_odometer_km = v_target_final_odo,
    updated_at = NOW()
  WHERE id = v_asset_id;

  RAISE NOTICE '>>> HOÀN TẤT: Toàn bộ % chuyến đi đã được chuẩn hóa chuỗi ODO từ % km -> % km!', v_trip_count, v_initial_odo, v_target_final_odo;
END $$;

-- 7. XEM LẠI DANH SÁCH CHUYẾN ĐI ĐÃ ĐƯỢC NỐI CHUỖI HOÀN HẢO:
SELECT 
  start_time, 
  end_time,
  distance_km || ' km' AS quang_duong,
  start_odometer || ' km' AS odo_bat_dau,
  end_odometer || ' km' AS odo_ket_thuc,
  notes
FROM public.trips
WHERE asset_id = '20260308-0001-4222-8888-19b213872026'
ORDER BY start_time ASC;
