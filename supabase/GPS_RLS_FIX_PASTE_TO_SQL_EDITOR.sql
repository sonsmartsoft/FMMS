-- ============================================================
-- FMMS GPS RLS FIX — Paste vào Supabase SQL Editor
-- Cho phép device (đã đăng ký qua policy open trên `devices`)
-- insert vào gps_track_points bằng anon key (Service Worker / app).
-- Anon key không có auth.uid() nên `is_asset_owner` trả false.
-- ============================================================

-- Ghi đè policy insert cũ bằng policy kiểm tra device hợp lệ
DROP POLICY IF EXISTS "Owners can insert GPS points" ON public.gps_track_points;
DROP POLICY IF EXISTS "Devices can insert GPS points" ON public.gps_track_points;

CREATE POLICY "Devices can insert GPS points" ON public.gps_track_points
    FOR INSERT
    WITH CHECK (
        public.is_asset_owner(vehicle_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = gps_track_points.device_id
              AND d.vehicle_id IS NOT NULL
        )
    );

-- Đảm bảo device được phép upsert (đã có trong setup, giữ an toàn)
DROP POLICY IF EXISTS "Allow device registration and upsert" ON public.devices;
CREATE POLICY "Allow device registration and upsert" ON public.devices
    FOR ALL USING (true) WITH CHECK (true);

GRANT INSERT ON public.gps_track_points TO anon, authenticated, service_role;
GRANT SELECT ON public.gps_track_points TO anon, authenticated, service_role;
GRANT REFERENCES ON public.gps_track_points TO anon, authenticated, service_role;
GRANT INSERT ON public.sync_queue TO anon, authenticated, service_role;
GRANT INSERT ON public.devices TO anon, authenticated, service_role;