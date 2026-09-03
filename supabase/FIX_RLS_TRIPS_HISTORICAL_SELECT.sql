-- ==============================================================================
-- FMMS: LẤY DEVICE_ID CỦA CÁC CHUYẾN ĐI THÁNG 8/9 GÁN CHO TOÀN BỘ CHUYẾN ĐI CŨ
-- ĐỒNG THỜI CẬP NHẬT RLS CHO PHÉP APP ANDROID (ANON) ĐỌC ĐỦ 78 TRIPS
-- ==============================================================================

-- BƯỚC 1: LẤY CHÍNH XÁC DEVICE_ID THẬT TỪ CÁC CHUYẾN ĐI THÁNG 8/9 & GÁN CHO TOÀN BỘ TRIPS CŨ
DO $$
DECLARE
  v_mazda_id UUID := '20260308-0001-4222-8888-19b213872026';
  v_target_device_id UUID;
  v_updated_count INT;
BEGIN
  -- Tìm device_id thực tế đang được sử dụng ở các trip tháng 8 & 9
  SELECT device_id INTO v_target_device_id
  FROM public.trips
  WHERE asset_id = v_mazda_id AND device_id IS NOT NULL
  ORDER BY start_time DESC
  LIMIT 1;

  -- Dự phòng: nếu trips chưa có, lấy từ bảng devices đã đăng ký cho Mazda 2
  IF v_target_device_id IS NULL THEN
    SELECT id INTO v_target_device_id
    FROM public.devices
    WHERE asset_id = v_mazda_id OR vehicle_id = v_mazda_id
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;

  IF v_target_device_id IS NOT NULL THEN
    UPDATE public.trips
    SET device_id = v_target_device_id
    WHERE asset_id = v_mazda_id AND device_id IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '>>> THÀNH CÔNG: Đã lấy device_id (%) từ các chuyến đi mới và gán cho % chuyến đi lịch sử!', v_target_device_id, v_updated_count;
  ELSE
    RAISE NOTICE '>>> CẢNH BÁO: Chưa tìm thấy device_id nào trong DB!';
  END IF;
END $$;

-- BƯỚC 2: CẤP QUYỀN VÀ MỞ RỘNG RLS CHO BẢNG TRIPS (ANON ĐỌC TRỌN VẸN 78 CHUYẾN)
GRANT SELECT, INSERT, UPDATE ON public.trips TO anon, authenticated;

DROP POLICY IF EXISTS "Devices can read trips" ON public.trips;
DROP POLICY IF EXISTS "trips_select" ON public.trips;
DROP POLICY IF EXISTS "Allow all authenticated family trips" ON public.trips;
DROP POLICY IF EXISTS "Allow select trips by owner or family asset" ON public.trips;

CREATE POLICY "Allow select trips by owner or family asset" ON public.trips
    FOR SELECT
    USING (
        public.is_asset_owner(asset_id)
        OR EXISTS (
            SELECT 1 FROM public.assets a
            WHERE a.id = trips.asset_id
        )
        OR (
            device_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.devices d
                WHERE d.id = trips.device_id
            )
        )
    );

NOTIFY pgrst, 'reload schema';
