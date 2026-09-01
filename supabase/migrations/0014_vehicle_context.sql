-- ============================================================
-- fmms_get_vehicle_context
-- Secure database-backed context for the AI Advisor (and future uses).
--
-- SECURITY DEFINER: bypasses RLS (owner privileges) but first verifies
-- the caller's device is actually bound to the target asset via the
-- existing fmms_verify_device_access function. If not authorized, it
-- returns { authorized: false } and NO row data -- so an anon/publishable
-- key alone cannot leak another vehicle's data.
--
-- Returns a JSONB document (authorized: true) with real data from the
-- production DB: asset info, recent trips, fuel logs, maintenance records,
-- expense totals and monthly trip aggregates.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fmms_get_vehicle_context(
    p_device_id UUID,
    p_asset_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_authorized BOOLEAN;
    v_asset_name TEXT;
    v_brand TEXT;
    v_model TEXT;
    v_odo NUMERIC(10,2);
    v_fuel_type TEXT;
    v_tank NUMERIC(6,2);
    v_asset jsonb;
    v_trips jsonb;
    v_fuel jsonb;
    v_maint jsonb;
    v_exp jsonb;
    v_monthly jsonb;
BEGIN
    IF p_asset_id IS NULL OR p_device_id IS NULL THEN
        RETURN jsonb_build_object('authorized', false, 'error', 'missing_ids');
    END IF;

    v_authorized := public.fmms_verify_device_access(p_device_id, p_asset_id);
    IF v_authorized IS DISTINCT FROM TRUE THEN
        RETURN jsonb_build_object('authorized', false);
    END IF;

    -- Asset summary
    SELECT name, brand, model, current_odometer_km, fuel_type, tank_capacity_liters
      INTO v_asset_name, v_brand, v_model, v_odo, v_fuel_type, v_tank
      FROM public.assets
     WHERE id = p_asset_id;

    v_asset := jsonb_build_object(
        'name', COALESCE(v_asset_name, ''),
        'brand', COALESCE(v_brand, ''),
        'model', COALESCE(v_model, ''),
        'current_odometer_km', v_odo,
        'fuel_type', v_fuel_type,
        'tank_capacity_liters', v_tank
    );

    -- Recent trips (nested query: order+limit rows, then aggregate)
    v_trips := COALESCE((
        SELECT jsonb_agg(sub.j ORDER BY sub.j->>'start_time' DESC)
        FROM (
            SELECT jsonb_build_object(
                'id', t.id,
                'start_time', t.start_time,
                'end_time', t.end_time,
                'distance_km', t.distance_km,
                'fuel_used_liters', t.fuel_used_liters,
                'average_consumption_l100km', t.average_consumption_l100km,
                'average_speed_kmh', t.average_speed_kmh,
                'max_speed_kmh', t.max_speed_kmh,
                'start_odometer', t.start_odometer,
                'end_odometer', t.end_odometer
            ) AS j
            FROM public.trips t
            WHERE t.asset_id = p_asset_id AND t.status = 'COMPLETED'
            ORDER BY t.start_time DESC
            LIMIT p_limit
        ) sub
    ), '[]'::jsonb);

    -- Recent fuel logs
    v_fuel := COALESCE((
        SELECT jsonb_agg(sub.j ORDER BY sub.j->>'timestamp' DESC)
        FROM (
            SELECT jsonb_build_object(
                'id', f.id,
                'timestamp', f.timestamp,
                'odometer_km', f.odometer_km,
                'fuel_liters', f.fuel_liters,
                'price_per_liter', f.price_per_liter,
                'total_cost', f.total_cost,
                'currency', f.currency
            ) AS j
            FROM public.fuel_logs f
            WHERE f.asset_id = p_asset_id
            ORDER BY f.timestamp DESC
            LIMIT p_limit
        ) sub
    ), '[]'::jsonb);

    -- Recent maintenance
    v_maint := COALESCE((
        SELECT jsonb_agg(sub.j ORDER BY sub.j->>'date' DESC)
        FROM (
            SELECT jsonb_build_object(
                'id', m.id,
                'date', m.date,
                'maintenance_type', m.maintenance_type,
                'odometer_km', m.odometer_km,
                'cost', m.cost,
                'currency', m.currency,
                'vendor', m.vendor,
                'next_due_km', m.next_due_km,
                'next_due_date', m.next_due_date,
                'notes', m.notes
            ) AS j
            FROM public.maintenance_records m
            WHERE m.asset_id = p_asset_id
            ORDER BY m.date DESC
            LIMIT p_limit
        ) sub
    ), '[]'::jsonb);

    -- Expense summary
    v_exp := jsonb_build_object(
        'total_fuel', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.asset_id = p_asset_id AND e.category = 'FUEL'), 0),
        'total_maintenance', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.asset_id = p_asset_id AND e.category = 'MAINTENANCE'), 0),
        'total_overall', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.asset_id = p_asset_id), 0),
        'currency', 'VND'
    );

    -- Monthly trip totals (last 12 months)
    v_monthly := COALESCE((
        SELECT jsonb_agg(sub.j ORDER BY sub.j->>'month' DESC)
        FROM (
            SELECT jsonb_build_object(
                'month', to_char(g.month_ts, 'YYYY-MM'),
                'distance_km', g.distance_km,
                'fuel_liters', g.fuel_liters,
                'trips', g.trips
            ) AS j
            FROM (
                SELECT date_trunc('month', t.start_time) AS month_ts,
                       SUM(t.distance_km) AS distance_km,
                       SUM(COALESCE(t.fuel_used_liters, 0)) AS fuel_liters,
                       COUNT(*) AS trips
                FROM public.trips t
                WHERE t.asset_id = p_asset_id AND t.status = 'COMPLETED'
                  AND t.start_time >= NOW() - INTERVAL '12 months'
                GROUP BY date_trunc('month', t.start_time)
            ) g
            ORDER BY g.month_ts DESC
            LIMIT 12
        ) sub
    ), '[]'::jsonb);

    RETURN jsonb_build_object(
        'authorized', true,
        'asset', v_asset,
        'recent_trips', v_trips,
        'recent_fuel_logs', v_fuel,
        'maintenance', v_maint,
        'expense_summary', v_exp,
        'monthly_trip_totals', v_monthly
    );
END;
$$;

-- Grant EXECUTE to anon so the edge function (anon key) can call it.
-- SECURITY DEFINER ensures only the internal device-bind check gates data.
GRANT EXECUTE ON FUNCTION public.fmms_get_vehicle_context(UUID, UUID, INT) TO anon, authenticated, service_role;
