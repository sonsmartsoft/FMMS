-- ============================================================
-- SYNC FIX v2  (paste whole file into Supabase SQL Editor, Run)
--
-- Root cause of HTTP 401 / 42501 on sync_queue rows:
--   The app upserts with "Prefer: resolution=merge-duplicates"
--   => Postgres runs INSERT ... ON CONFLICT DO UPDATE.
--   That UPDATE path needs an RLS *UPDATE* policy + UPDATE grant,
--   but the tables only had INSERT policies -> every re-sync of an
--   existing row failed with "violates row-level security policy".
--
-- Also adds fmms_report_odometer(): the Android app pushes the
-- ECU odometer (PID 01A6) to `assets` through this SECURITY DEFINER
-- RPC because anon cannot write `assets` directly (by design).
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Wipe old ad-hoc policies on the 3 sync tables (fresh start)
-- ------------------------------------------------------------
DO $$
DECLARE t text; r record;
BEGIN
  FOREACH t IN ARRAY ARRAY['telemetry_samples','trips','gps_track_points'] LOOP
    FOR r IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2) Helper: does this device belong to this asset?
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fmms_device_ok(p_device uuid, p_asset uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.devices d
    WHERE d.id = p_device AND d.vehicle_id = p_asset
  );
$$;

GRANT EXECUTE ON FUNCTION public.fmms_device_ok(uuid, uuid) TO anon;

-- ------------------------------------------------------------
-- 3) telemetry_samples: INSERT + UPDATE (for merge-duplicates)
--    (schema cloud dùng ASSET_ID, không phải vehicle_id)
-- ------------------------------------------------------------
CREATE POLICY "telemetry_insert" ON public.telemetry_samples
  FOR INSERT TO anon
  WITH CHECK (public.fmms_device_ok(device_id, asset_id));

CREATE POLICY "telemetry_update" ON public.telemetry_samples
  FOR UPDATE TO anon
  USING (public.fmms_device_ok(device_id, asset_id))
  WITH CHECK (public.fmms_device_ok(device_id, asset_id));

GRANT SELECT, INSERT, UPDATE ON public.telemetry_samples TO anon;

-- ------------------------------------------------------------
-- 4) trips: INSERT + UPDATE
-- ------------------------------------------------------------
CREATE POLICY "trips_insert" ON public.trips
  FOR INSERT TO anon
  WITH CHECK (public.fmms_device_ok(device_id, asset_id));

CREATE POLICY "trips_update" ON public.trips
  FOR UPDATE TO anon
  USING (public.fmms_device_ok(device_id, asset_id))
  WITH CHECK (public.fmms_device_ok(device_id, asset_id));

GRANT SELECT, INSERT, UPDATE ON public.trips TO anon;

-- ------------------------------------------------------------
-- 5) gps_track_points: INSERT + UPDATE
--    (device only needs to be assigned to SOME vehicle)
-- ------------------------------------------------------------
CREATE POLICY "gps_insert" ON public.gps_track_points
  FOR INSERT TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.devices d
            WHERE d.id = device_id AND d.vehicle_id IS NOT NULL)
  );

CREATE POLICY "gps_update" ON public.gps_track_points
  FOR UPDATE TO anon
  USING (
    EXISTS (SELECT 1 FROM public.devices d
            WHERE d.id = device_id AND d.vehicle_id IS NOT NULL)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.devices d
            WHERE d.id = device_id AND d.vehicle_id IS NOT NULL)
  );

GRANT SELECT, INSERT, UPDATE ON public.gps_track_points TO anon;

-- ------------------------------------------------------------
-- 6) Odometer push from app -> assets (SECURITY DEFINER RPC).
--    greatest() keeps the odometer monotonic so stale queued
--    entries can never roll it backwards.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fmms_report_odometer(
  p_asset   uuid,
  p_odo     numeric,
  p_virtual numeric DEFAULT NULL,
  p_source  text   DEFAULT 'OBD'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.assets a SET
    current_odometer_km = GREATEST(COALESCE(a.current_odometer_km, 0), p_odo),
    virtual_odometer_km = COALESCE(p_virtual, a.virtual_odometer_km),
    odometer_source     = COALESCE(NULLIF(p_source, ''), a.odometer_source),
    updated_at          = now()
  WHERE a.id = p_asset;
END $$;

GRANT EXECUTE ON FUNCTION public.fmms_report_odometer(uuid, numeric, numeric, text) TO anon;

-- ------------------------------------------------------------
-- 7) Verify (run these separately if you want to see results):
--    SELECT policyname, tablename, cmd FROM pg_policies
--      WHERE schemaname='public'
--        AND tablename IN ('telemetry_samples','trips','gps_track_points');
--    SELECT routine_name FROM information_schema.routines
--      WHERE routine_schema='public' AND routine_name LIKE 'fmms%';
-- ------------------------------------------------------------
