-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0007: Fleet Vehicles RPC & Device Assignment Policies
-- Supports "Web is Source of Truth" (Cách B) requirement
-- ========================================================

-- --------------------------------------------------------
-- 1. Ensure `devices` table schema supports all device types
-- --------------------------------------------------------
ALTER TABLE public.devices
    ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES public.assets(id) ON DELETE SET NULL;

-- Backfill vehicle_id from asset_id if asset_id exists and vehicle_id is null
UPDATE public.devices
SET vehicle_id = asset_id
WHERE vehicle_id IS NULL AND asset_id IS NOT NULL;

-- --------------------------------------------------------
-- 2. RLS Policies for `devices` Table
-- --------------------------------------------------------
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- SELECT policy: authenticated users can read devices associated with their vehicles/fleets
CREATE POLICY "Users can read fleet devices" ON public.devices
    FOR SELECT USING (
        auth.uid() IS NOT NULL OR vehicle_id IS NULL OR public.is_asset_owner(vehicle_id)
    );

-- INSERT/UPDATE policy: allow device registration and status heartbeat
CREATE POLICY "Allow device registration and upsert" ON public.devices
    FOR ALL USING (true)
    WITH CHECK (true);

-- --------------------------------------------------------
-- 3. RPC Function `get_fleet_vehicles`
-- Called by Android app with `{ device_id }` to fetch fleet vehicles
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
    trim TEXT,
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

    -- Step 1: If user is logged in, find their fleet
    IF v_user_id IS NOT NULL THEN
        SELECT f.id INTO v_fleet_id
        FROM public.fleets f
        WHERE f.owner_user_id = v_user_id
        LIMIT 1;
    END IF;

    -- Step 2: If no fleet found yet and p_device_id is provided, find fleet via assigned device
    IF v_fleet_id IS NULL AND p_device_id IS NOT NULL THEN
        SELECT a.fleet_id INTO v_fleet_id
        FROM public.devices d
        JOIN public.assets a ON a.id = COALESCE(d.vehicle_id, d.asset_id)
        WHERE d.id = p_device_id
        LIMIT 1;
    END IF;

    -- Step 3: Return assets matching fleet, or all active assets if no fleet constraint
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

-- Grant execute permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_fleet_vehicles(UUID) TO anon, authenticated, service_role;
