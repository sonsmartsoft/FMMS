-- ============================================================
-- fmms_verify_device_access
-- Secure device-bound authorization used by the ai-advisor
-- (and future) Edge Functions.
--
-- SECURITY DEFINER: runs with owner privileges to bypass RLS,
-- but returns ONLY a boolean access decision -- it never exposes
-- any row data to the anon client. This closes the gap where the
-- anon key cannot SELECT from assets (RLS) without leaking the
-- whole fleet (as get_fleet_vehicles does when device_id is absent).
--
-- Returns TRUE only if the given device is bound to the asset
-- (directly via vehicle_id/asset_id) OR the device's fleet matches
-- the asset's fleet AND the asset is ACTIVE.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fmms_verify_device_access(
    p_device_id UUID,
    p_asset_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_device_fleet_id UUID;
    v_asset_fleet_id UUID;
    v_device_asset_id UUID;
    v_asset_active BOOLEAN;
BEGIN
    IF p_device_id IS NULL OR p_asset_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Look up the device's bound asset and fleet
    SELECT
        COALESCE(d.vehicle_id, d.asset_id),
        a.fleet_id
    INTO v_device_asset_id, v_device_fleet_id
    FROM public.devices d
    LEFT JOIN public.assets a
        ON a.id = COALESCE(d.vehicle_id, d.asset_id)
    WHERE d.id = p_device_id;

    -- Look up the target asset's fleet and active state
    SELECT
        a.fleet_id,
        (a.status = 'ACTIVE')
    INTO v_asset_fleet_id, v_asset_active
    FROM public.assets a
    WHERE a.id = p_asset_id;

    IF v_asset_active IS DISTINCT FROM TRUE THEN
        RETURN FALSE;
    END IF;

    -- Access allowed via direct device-to-asset binding
    IF v_device_asset_id = p_asset_id THEN
        RETURN TRUE;
    END IF;

    -- Access allowed via shared fleet
    IF v_device_fleet_id IS NOT NULL
       AND v_device_fleet_id = v_asset_fleet_id THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- Grant EXECUTE to anon so the edge function (running with anon key) can call it.
GRANT EXECUTE ON FUNCTION public.fmms_verify_device_access(UUID, UUID) TO anon, authenticated, service_role;
