-- ============================================================
-- FMMS DEVICE REGISTRATION FIX — Paste vào Supabase SQL Editor
--
-- Root cause: app không đăng ký được device lên bảng `devices`,
-- nên mọi insert gps_track_points / trips theo policy device-based
-- đều fail (RLS kiểm tra device tồn tại).
--
-- Blocker: FK `devices_vehicle_id_fkey` → public.assets.
-- Anon key không có auth.uid() → RLS `assets_owner` ẩn hết assets
-- → FK check thất bại 42501/23503 dù vehicle_id hợp lệ.
-- (Giống hệt 3 FK đã drop trước: gps_track_points_vehicle_id_fkey,
--  gps_track_points_trip_id_fkey, trips_asset_id_fkey.)
-- ============================================================

-- 1. Drop FK chặn device đăng ký
ALTER TABLE public.devices DROP CONSTRAINT IF EXISTS devices_vehicle_id_fkey;

-- 2. Đảm bảo policy device được phép upsert (đã có, giữ an toàn)
DROP POLICY IF EXISTS "Allow device registration and upsert" ON public.devices;
CREATE POLICY "Allow device registration and upsert" ON public.devices
    FOR ALL USING (true) WITH CHECK (true);

-- 3. Đảm bảo GRANT (đã có, giữ an toàn)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.devices TO anon, authenticated;
GRANT INSERT, SELECT ON public.gps_track_points TO anon, authenticated;
GRANT INSERT, SELECT, UPDATE ON public.trips TO anon, authenticated;

-- 4. Xác nhận
SELECT conname, conrelid::regclass AS tbl
FROM pg_constraint
WHERE conname IN (
    'devices_vehicle_id_fkey',
    'gps_track_points_vehicle_id_fkey',
    'gps_track_points_trip_id_fkey',
    'trips_asset_id_fkey'
);

SELECT policyname, tablename FROM pg_policies
WHERE tablename IN ('devices', 'gps_track_points', 'trips')
ORDER BY tablename, policyname;

-- ============================================================
-- 5. RPC dọn trip sai (8.9km) — fleet_recent_trips + delete_trip_by_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.fleet_recent_trips()
RETURNS TABLE (
    id UUID,
    asset_id UUID,
    device_id UUID,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    distance_km NUMERIC,
    point_count BIGINT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.asset_id, t.device_id, t.start_time, t.end_time,
           t.distance_km,
           (SELECT COUNT(*) FROM public.gps_track_points p WHERE p.trip_id = t.id) AS point_count
    FROM public.trips t
    ORDER BY t.start_time DESC
    LIMIT 20;
END $$;

CREATE OR REPLACE FUNCTION public.delete_trip_by_id(p_trip_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    DELETE FROM public.gps_track_points WHERE trip_id = p_trip_id;
    DELETE FROM public.trips WHERE id = p_trip_id;
END $$;

GRANT EXECUTE ON FUNCTION public.fleet_recent_trips() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_trip_by_id(UUID) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
