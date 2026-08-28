-- ============================================================
-- FMMS TRIPS SYNC FIX — Paste vào Supabase SQL Editor
-- 1) Thêm các cột app gửi nhưng bảng `trips` web còn thiếu.
-- 2) Mở RLS: cho phép device đã đăng ký insert trip (anon key).
-- ============================================================

ALTER TABLE public.trips
    ADD COLUMN IF NOT EXISTS device_id UUID,
    ADD COLUMN IF NOT EXISTS fuel_start_percent NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS fuel_end_percent NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS start_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS start_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS end_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS end_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_trips_device_time
    ON public.trips (device_id, start_time DESC);

-- RLS: cho phép insert theo device (không cần đăng nhập web)
DROP POLICY IF EXISTS "Owners can manage trips" ON public.trips;
DROP POLICY IF EXISTS "Devices can insert trips" ON public.trips;

CREATE POLICY "Devices can insert trips" ON public.trips
    FOR INSERT
    WITH CHECK (
        public.is_asset_owner(asset_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = trips.device_id
              AND d.asset_id = trips.asset_id
        )
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = trips.device_id
              AND d.vehicle_id = trips.asset_id
        )
    );

GRANT INSERT, SELECT, UPDATE ON public.trips TO anon, authenticated, service_role;