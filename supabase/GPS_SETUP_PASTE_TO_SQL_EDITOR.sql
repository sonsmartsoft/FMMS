-- ============================================================
-- FMMS GPS TRACK POINTS & FLEET SYNC v3 — Paste vào Supabase SQL Editor
-- (Bao gồm gps_track_points + device_id + RPC get_fleet_vehicles)
-- ============================================================

-- --------------------------------------------------------
-- 1. Bảng gps_track_points (frozen contract v2)
-- --------------------------------------------------------
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gps_track_trip_time
    ON public.gps_track_points (trip_id, recorded_at DESC)
    WHERE trip_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gps_track_vehicle_time
    ON public.gps_track_points (vehicle_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_gps_track_device_time
    ON public.gps_track_points (device_id, recorded_at DESC);

-- RLS for gps_track_points
ALTER TABLE public.gps_track_points ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can read GPS points') THEN
        CREATE POLICY "Owners can read GPS points" ON public.gps_track_points
            FOR SELECT USING (public.is_asset_owner(vehicle_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can insert GPS points') THEN
        CREATE POLICY "Owners can insert GPS points" ON public.gps_track_points
            FOR INSERT WITH CHECK (public.is_asset_owner(vehicle_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can delete GPS points') THEN
        CREATE POLICY "Owners can delete GPS points" ON public.gps_track_points
            FOR DELETE USING (public.is_asset_owner(vehicle_id));
    END IF;
END $$;

-- Views
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

-- --------------------------------------------------------
-- 2. Cấu hình bảng `devices` & RLS
-- --------------------------------------------------------
ALTER TABLE public.devices
    ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

UPDATE public.devices
SET vehicle_id = asset_id
WHERE vehicle_id IS NULL AND asset_id IS NOT NULL;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow device registration and upsert') THEN
        CREATE POLICY "Allow device registration and upsert" ON public.devices
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- --------------------------------------------------------
-- 3. RPC Function `get_fleet_vehicles` (Phục vụ Android pull xe từ web)
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_fleet_vehicles(p_device_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    fleet_id UUID,
    name TEXT,
    license_plate TEXT,
    make TEXT,
    model TEXT,
    year INT,
    "trim" TEXT,
    engine TEXT,
    fuel_type TEXT,
    tank_capacity_liters NUMERIC,
    odometer_km NUMERIC,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_fleet_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT f.id INTO v_fleet_id
        FROM public.fleets f
        WHERE f.owner_user_id = v_user_id
        LIMIT 1;
    END IF;

    IF v_fleet_id IS NULL AND p_device_id IS NOT NULL THEN
        SELECT a.fleet_id INTO v_fleet_id
        FROM public.devices d
        JOIN public.assets a ON a.id = COALESCE(d.vehicle_id, d.asset_id)
        WHERE d.id = p_device_id
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.fleet_id,
        a.name,
        a.license_plate,
        a.brand AS make,
        a.model,
        a.year,
        a.trim,
        a.engine,
        a.fuel_type,
        a.tank_capacity_liters,
        a.current_odometer_km AS odometer_km,
        a.status,
        a.created_at,
        a.updated_at
    FROM public.assets a
    WHERE (v_fleet_id IS NULL OR a.fleet_id = v_fleet_id OR a.owner_id = v_user_id)
      AND a.status = 'ACTIVE'
    ORDER BY a.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_fleet_vehicles(UUID) TO anon, authenticated, service_role;
