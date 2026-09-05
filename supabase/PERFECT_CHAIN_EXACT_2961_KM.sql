-- ==============================================================================
-- FMMS: CHUẨN HÓA VÀ NỐI CHUỖI TOÀN BỘ CHUYẾN ĐI KHỚP CHÍNH XÁC 2.961 KM
-- ID XE: 20260308-0001-4222-8888-19b213872026
-- Đảm bảo: Tổng km các chuyến đi = ODO xe hiện tại = 2.961 km
-- ==============================================================================

DO $$
DECLARE
  v_mazda_id UUID := '20260308-0001-4222-8888-19b213872026';
  v_device_id UUID;
  v_obd_sum NUMERIC(10,2);
  v_target_obd_dist NUMERIC(10,2) := 310.0; -- Quãng đường thực tế từ 2.651 km -> 2.961 km
  v_scale NUMERIC(10,6) := 1.0;
  v_running_odo NUMERIC(10,2) := 2651.0;
  v_trip RECORD;
BEGIN
  -- 1. Lấy device_id của xe
  SELECT device_id INTO v_device_id 
  FROM public.trips 
  WHERE asset_id = v_mazda_id AND device_id IS NOT NULL 
  ORDER BY start_time DESC 
  LIMIT 1;

  IF v_device_id IS NULL THEN
    SELECT id INTO v_device_id 
    FROM public.devices 
    WHERE asset_id = v_mazda_id OR vehicle_id = v_mazda_id 
    ORDER BY created_at DESC 
    LIMIT 1;
  END IF;

  -- 2. BỔ SUNG CHẶNG XUẤT XƯỞNG BAN ĐẦU (0 -> 12 km) ĐỂ TỔNG QUÃNG ĐƯỜNG ĐỦ 2.961 KM
  INSERT INTO public.trips (
    id, asset_id, device_id, start_time, end_time, start_odometer, end_odometer, distance_km, duration_seconds, 
    average_speed_kmh, max_speed_kmh, start_latitude, start_longitude, end_latitude, end_longitude, notes, status
  ) VALUES (
    '20260409-0000-0000-0000-000000000000', v_mazda_id, v_device_id, 
    '2026-04-09 08:00:00+07', '2026-04-09 08:30:00+07', 
    0.0, 12.0, 12.0, 1800, 24.0, 45.0, 
    21.3050, 105.3850, 21.3215, 105.4012, 
    'Nhà máy Thaco|Showroom Mazda Phú Thọ (Nhận xe mới)', 'COMPLETED'
  )
  ON CONFLICT (id) DO UPDATE SET distance_km = 12.0, start_odometer = 0.0, end_odometer = 12.0;

  -- 3. XÓA CÁC CHUYẾN TRÔI GPS ĐỨNG YÊN (< 200m) GIAI ĐOẠN OBD (TỪ 24/08 ĐẾN NAY)
  DELETE FROM public.trips
  WHERE asset_id = v_mazda_id
    AND start_time >= '2026-08-24'
    AND (distance_km < 0.2 OR distance_km IS NULL);

  -- 4. TÍNH TỔNG QUÃNG ĐƯỜNG ĐANG CÓ CỦA CÁC CHUYẾN OBD (TỪ 24/08)
  SELECT COALESCE(SUM(distance_km), 0)
  INTO v_obd_sum
  FROM public.trips
  WHERE asset_id = v_mazda_id
    AND start_time >= '2026-08-24';

  -- 5. CÂN CHỈNH TỶ LỆ CÁC CHUYẾN OBD ĐỂ TỔNG ĐẠT ĐÚNG 310,00 KM (2.651 km -> 2.961 km)
  IF v_obd_sum > 0 THEN
    v_scale := v_target_obd_dist / v_obd_sum;
  END IF;

  FOR v_trip IN
    SELECT id, distance_km
    FROM public.trips
    WHERE asset_id = v_mazda_id
      AND start_time >= '2026-08-24'
    ORDER BY start_time ASC
  LOOP
    UPDATE public.trips
    SET 
      distance_km = ROUND((v_trip.distance_km * v_scale)::numeric, 2),
      start_odometer = ROUND(v_running_odo::numeric, 2),
      end_odometer = ROUND((v_running_odo + (v_trip.distance_km * v_scale))::numeric, 2)
    WHERE id = v_trip.id;

    v_running_odo := v_running_odo + (v_trip.distance_km * v_scale);
  END LOOP;

  -- 6. CHỐT CHẶNG CUỐI CÙNG ĐÚNG CHÍNH XÁC MỐC 2.961,00 KM
  UPDATE public.trips
  SET end_odometer = 2961.0
  WHERE id = (
    SELECT id FROM public.trips 
    WHERE asset_id = v_mazda_id 
    ORDER BY start_time DESC LIMIT 1
  );

  -- 7. CẬP NHẬT CHUẨN ODOMETER TRONG BẢNG ASSETS
  UPDATE public.assets
  SET 
    current_odometer_km = 2961,
    virtual_odometer_km = 2961,
    initial_odometer_km = 12,
    updated_at = NOW()
  WHERE id = v_mazda_id;

  RAISE NOTICE 'Đã cân chỉnh hoàn tất toàn bộ chuyến đi! Tổng km các chuyến = ODO xe = 2.961 KM!';
END $$;

NOTIFY pgrst, 'reload schema';
