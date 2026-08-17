-- ============================================================
-- FMMS GPS TRACK POINTS v2 — Paste vào Supabase SQL Editor
-- (Thêm device_id + device_name theo spec bổ sung)
-- ============================================================

-- 1. Bảng gps_track_points (frozen contract v2)
CREATE TABLE IF NOT EXISTS public.gps_track_points (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    vehicle_id  UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    device_id   UUID NOT NULL,
    device_name TEXT,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    speed_kmh   REAL,
    heading_deg REAL,
    accuracy_m  REAL,
    altitude_m  REAL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_gps_track_trip_time
    ON public.gps_track_points (trip_id, recorded_at DESC)
    WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gps_track_vehicle_time
    ON public.gps_track_points (vehicle_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_gps_track_device_time
    ON public.gps_track_points (device_id, recorded_at DESC);

-- 3. Enable RLS
ALTER TABLE public.gps_track_points ENABLE ROW LEVEL SECURITY;

-- 4. Policies (dùng hàm is_asset_owner từ migration 0003)
CREATE POLICY "Owners can read GPS points" ON public.gps_track_points
    FOR SELECT USING (public.is_asset_owner(vehicle_id));

CREATE POLICY "Owners can insert GPS points" ON public.gps_track_points
    FOR INSERT WITH CHECK (public.is_asset_owner(vehicle_id));

CREATE POLICY "Owners can delete GPS points" ON public.gps_track_points
    FOR DELETE USING (public.is_asset_owner(vehicle_id));

-- 5. Views
CREATE OR REPLACE VIEW public.vehicle_latest_positions AS
SELECT DISTINCT ON (vehicle_id)
    vehicle_id, device_id, device_name,
    lat, lng, speed_kmh, heading_deg, recorded_at, trip_id
FROM public.gps_track_points
ORDER BY vehicle_id, recorded_at DESC;

CREATE OR REPLACE VIEW public.device_latest_positions AS
SELECT DISTINCT ON (device_id)
    device_id, device_name, vehicle_id,
    lat, lng, speed_kmh, heading_deg, recorded_at, trip_id
FROM public.gps_track_points
ORDER BY device_id, recorded_at DESC;

-- 6. Bật Realtime cho bảng này
-- Vào Dashboard → Database → Replication → enable gps_track_points
-- Hoặc chạy:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.gps_track_points;
