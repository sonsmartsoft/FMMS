-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0006: GPS Track Points Table
-- Frozen schema contract v2 — includes device_id/device_name
-- ========================================================

-- --------------------------------------------------------
-- 1. GPS Track Points Table
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gps_track_points (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id     UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    -- vehicle_id: references assets.id (Android uses "vehicle_id" in contract)
    vehicle_id  UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    -- device_id: UUID cố định theo từng lần cài app tracker (không phải MAC)
    device_id   UUID NOT NULL,
    -- device_name: tên user đặt cho tracker, VD "Tracker xe đạp Uti"
    device_name TEXT,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    speed_kmh   REAL,
    heading_deg REAL,     -- compass bearing 0–360 (optional)
    accuracy_m  REAL,     -- GPS accuracy in metres
    altitude_m  REAL,     -- altitude optional
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------------------
-- 2. Indexes (per spec + additional for device lookup)
-- --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_gps_track_trip_time
    ON public.gps_track_points (trip_id, recorded_at DESC)
    WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gps_track_vehicle_time
    ON public.gps_track_points (vehicle_id, recorded_at DESC);

-- Supplemental index for device-based queries (per updated spec)
CREATE INDEX IF NOT EXISTS idx_gps_track_device_time
    ON public.gps_track_points (device_id, recorded_at DESC);

-- --------------------------------------------------------
-- 3. Row Level Security
-- --------------------------------------------------------
ALTER TABLE public.gps_track_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read GPS points" ON public.gps_track_points
    FOR SELECT USING (public.is_asset_owner(vehicle_id));

CREATE POLICY "Owners can insert GPS points" ON public.gps_track_points
    FOR INSERT WITH CHECK (public.is_asset_owner(vehicle_id));

CREATE POLICY "Owners can delete GPS points" ON public.gps_track_points
    FOR DELETE USING (public.is_asset_owner(vehicle_id));

-- --------------------------------------------------------
-- 4. Helper view: latest position per vehicle AND device
-- --------------------------------------------------------
CREATE OR REPLACE VIEW public.vehicle_latest_positions AS
SELECT DISTINCT ON (vehicle_id)
    vehicle_id,
    device_id,
    device_name,
    lat,
    lng,
    speed_kmh,
    heading_deg,
    recorded_at,
    trip_id
FROM public.gps_track_points
ORDER BY vehicle_id, recorded_at DESC;

CREATE OR REPLACE VIEW public.device_latest_positions AS
SELECT DISTINCT ON (device_id)
    device_id,
    device_name,
    vehicle_id,
    lat,
    lng,
    speed_kmh,
    heading_deg,
    recorded_at,
    trip_id
FROM public.gps_track_points
ORDER BY device_id, recorded_at DESC;
