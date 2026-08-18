-- ============================================================
-- FMMS GPS/TRIPS SELECT FIX — Paste vào Supabase SQL Editor
-- Vấn đề: INSERT ... RETURNING (và PostgREST return=representation)
-- bị chặn vì policy SELECT chỉ cho owner, còn anon/device bị chặn.
-- Fix: cho phép device (đã đăng ký trong bảng `devices`) SELECT
-- gps_track_points và trips.
-- ============================================================

-- gps_track_points: cho phép đọc theo device đã đăng ký
DROP POLICY IF EXISTS "Devices can read GPS points" ON public.gps_track_points;
CREATE POLICY "Devices can read GPS points" ON public.gps_track_points
    FOR SELECT
    USING (
        public.is_asset_owner(vehicle_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = gps_track_points.device_id
              AND d.vehicle_id IS NOT NULL
        )
    );

-- trips: cho phép đọc theo device đã đăng ký
DROP POLICY IF EXISTS "Devices can read trips" ON public.trips;
CREATE POLICY "Devices can read trips" ON public.trips
    FOR SELECT
    USING (
        public.is_asset_owner(asset_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = trips.device_id
              AND (d.asset_id = trips.asset_id OR d.vehicle_id = trips.asset_id)
        )
    );

NOTIFY pgrst, 'reload schema';
