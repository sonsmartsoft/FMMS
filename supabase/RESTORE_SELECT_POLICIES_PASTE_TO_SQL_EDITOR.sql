-- ============================================================
-- RESTORE SELECT POLICIES (paste vào Supabase SQL Editor, Run)
-- Lý do: SYNC_FIX_V2 có đoạn DROP toàn bộ policy rồi chỉ tạo
-- lại INSERT/UPDATE -> mất quyền SELECT của anon trên 3 bảng.
-- App không đọc cloud nhưng giữ parity như cấu hình cũ.
-- Idempotent: chạy lại thoải mái.
-- ============================================================

-- gps_track_points
DROP POLICY IF EXISTS "gps_select" ON public.gps_track_points;
CREATE POLICY "gps_select" ON public.gps_track_points
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d
      WHERE d.id = device_id AND d.vehicle_id IS NOT NULL
    )
  );

-- trips
DROP POLICY IF EXISTS "trips_select" ON public.trips;
CREATE POLICY "trips_select" ON public.trips
  FOR SELECT TO anon
  USING (public.fmms_device_ok(device_id, asset_id));

-- telemetry_samples
DROP POLICY IF EXISTS "telemetry_select" ON public.telemetry_samples;
CREATE POLICY "telemetry_select" ON public.telemetry_samples
  FOR SELECT TO anon
  USING (public.fmms_device_ok(device_id, asset_id));

NOTIFY pgrst, 'reload schema';
