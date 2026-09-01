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
-- expense totals and monthly trip aggregates. All figures are what AI uses.
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
    v_result JSONB;
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

    v_result := jsonb_build_object(
        'authorized', true,
        'asset', jsonb_build_object(
            'name', COALESCE(v_asset_name, ''),
            'brand', COALESCE(v_brand, ''),
            'model', COALESCE(v_model, ''),
            'current_odometer_km', v_odo,
            'fuel_type', v_fuel_type,
            'tank_capacity_liters', v_tank
        ),
        'recent_trips', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
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
            ) ORDER BY t.start_time DESC)
            FROM public.trips t
            WHERE t.asset_id = p_asset_id AND t.status = 'COMPLETED'
            ORDER BY t.start_time DESC
            LIMIT p_limit
        ), '[]'::jsonb),
        'recent_fuel_logs', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'id', f.id,
                'timestamp', f.timestamp,
                'odometer_km', f.odometer_km,
                'fuel_liters', f.fuel_liters,
                'price_per_liter', f.price_per_liter,
                'total_cost', f.total_cost,
                'currency', f.currency
            ) ORDER BY f.timestamp DESC)
            FROM public.fuel_logs f
            WHERE f.asset_id = p_asset_id
            ORDER BY f.timestamp DESC
            LIMIT p_limit
        ), '[]'::jsonb),
        'maintenance', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
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
            ) ORDER BY m.date DESC)
            FROM public.maintenance_records m
            WHERE m.asset_id = p_asset_id
            ORDER BY m.date DESC
            LIMIT p_limit
        ), '[]'::jsonb),
        'expense_summary', jsonb_build_object(
            'total_fuel', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.asset_id = p_asset_id AND e.category = 'FUEL'), 0),
            'total_maintenance', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.asset_id = p_asset_id AND e.category = 'MAINTENANCE'), 0),
            'total_overall', COALESCE((SELECT SUM(amount) FROM public.expenses e WHERE e.asset_id = p_asset_id), 0),
            'currency', 'VND'
        ),
        'monthly_trip_totals', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'month', to_char(date_trunc('month', t.start_time), 'YYYY-MM'),
                'distance_km', SUM(t.distance_km),
                'fuel_liters', SUM(COALESCE(t.fuel_used_liters, 0)),
                'trips', COUNT(*)
            ) ORDER BY date_trunc('month', t.start_time) DESC)
            FROM public.trips t
            WHERE t.asset_id = p_asset_id AND t.status = 'COMPLETED'
              AND t.start_time >= NOW() - INTERVAL '12 months'
            GROUP BY date_trunc('month', t.start_time)
            ORDER BY date_trunc('month', t.start_time) DESC
            LIMIT 12
        ), '[]'::jsonb)
    );

    RETURN v_result;
END;
$$;

-- Grant EXECUTE to anon so the edge function (anon key) can call it.
-- SECURITY DEFINER ensures only the internal device-bind check gates data.
GRANT EXECUTE ON FUNCTION public.fmms_get_vehicle_context(UUID, UUID, INT) TO anon, authenticated, service_role;
