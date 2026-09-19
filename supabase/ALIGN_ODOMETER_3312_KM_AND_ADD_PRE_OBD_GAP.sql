-- ==============================================================================
-- FMMS: ĐỒNG BỘ MỐC ODOMETER 3.312 KM & BỔ SUNG CHẶNG DATA LỆCH TRƯỚC KHI DÙNG OBD
-- ID XE MAZDA 2AT: 20260308-0001-4222-8888-19b213872026
-- ==============================================================================
-- Bối cảnh:
--   Mốc ODO thực tế trên taplo xe hiện tại là 3.312 km.
--   Tổng km các chuyến đi GPS/OBD hiện có là 2.207 km (lệch 1.105 km).
--   Script này:
--     1) Bổ sung 1 bản ghi chuyến đi bù 1.105 km với ghi chú: "Data lệch trước khi dùng OBD"
--     2) Cập nhật current_odometer_km và virtual_odometer_km của xe thành 3.312 km.
--     3) Làm mới schema cache PostgREST.
-- ==============================================================================

DO $$
DECLARE
  v_mazda_id UUID := '20260308-0001-4222-8888-19b213872026';
  v_device_id UUID;
  v_current_trips_sum NUMERIC(10,2) := 0;
  v_target_odo NUMERIC(10,2) := 3312.0;
  v_initial_odo NUMERIC(10,2) := 12.0;
  v_gap_dist NUMERIC(10,2) := 1105.0;
BEGIN
  -- 1. Lấy device_id hiện có của xe
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

  -- 2. Tính tổng km các chuyến đi hiện có (trừ chuyến bù nếu đã từng tạo)
  SELECT COALESCE(SUM(distance_km), 0) INTO v_current_trips_sum
  FROM public.trips
  WHERE asset_id = v_mazda_id
    AND id <> '20260409-0000-0000-0000-000000003312';

  -- Tính toán khoảng lệch chính xác để tổng bằng đúng 3.312 km
  IF v_current_trips_sum > 0 AND v_current_trips_sum < v_target_odo THEN
    v_gap_dist := ROUND((v_target_odo - v_current_trips_sum)::numeric, 2);
  END IF;

  -- 3. NẠP HOẶC CẬP NHẬT BẢN GHI CHUYẾN ĐI BÙ VỚI GHI CHÚ RÕ RÀNG
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
    average_speed_kmh,
    max_speed_kmh,
    start_latitude,
    start_longitude,
    end_latitude,
    end_longitude,
    start_location,
    end_location,
    notes,
    status
  ) VALUES (
    '20260409-0000-0000-0000-000000003312',
    v_mazda_id,
    v_device_id,
    '2026-04-09 08:00:00+07',
    '2026-04-09 09:00:00+07',
    v_initial_odo,
    v_initial_odo + v_gap_dist,
    v_gap_dist,
    3600,
    35.0,
    55.0,
    21.3050,
    105.3850,
    21.3215,
    105.4012,
    'Hành trình tích lũy lịch sử',
    'Trước khi lắp thiết bị OBD',
    'Data lệch trước khi dùng OBD',
    'COMPLETED'
  )
  ON CONFLICT (id) DO UPDATE SET
    distance_km = v_gap_dist,
    start_odometer = v_initial_odo,
    end_odometer = v_initial_odo + v_gap_dist,
    start_location = 'Hành trình tích lũy lịch sử',
    end_location = 'Trước khi lắp thiết bị OBD',
    notes = 'Data lệch trước khi dùng OBD',
    status = 'COMPLETED';

  -- 4. CẬP NHẬT CHỈ SỐ ODOMETER CỦA XE LÊN CHUẨN XÁC 3.312 KM
  UPDATE public.assets
  SET 
    current_odometer_km = v_target_odo,
    virtual_odometer_km = v_target_odo,
    updated_at = NOW()
  WHERE id = v_mazda_id;

  RAISE NOTICE '>>> ĐÃ BỔ SUNG CHUYẾN BÙ: +% km (Ghi chú: Data lệch trước khi dùng OBD)', v_gap_dist;
  RAISE NOTICE '>>> ĐÃ ĐỒNG BỘ ODOMETER XE VỀ MỐC: % km', v_target_odo;
END $$;

-- 5. LÀM MỚI SCHEMA CACHE SUPABASE
NOTIFY pgrst, 'reload schema';
