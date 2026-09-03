-- ==============================================================================
-- FMMS: ĐỒNG BỘ ODOMETER CHUẨN (~2.926 KM) CHO XE MAZDA 2 & NÂNG CẤP RPC AI ADVISOR
-- KHẮC PHỤC: Bảng assets có ODO cũ bị lệch (6.953 km), khiến AI Advisor đọc sai số liệu.
-- TỰ ĐỘNG HÓA: Tạo Trigger cập nhật ODO realtime khi có chuyến đi / đổ xăng mới.
-- ==============================================================================

-- BƯỚC 1: SỬA TRỰC TIẾP ODOMETER CỦA MAZDA 2 VỀ ĐÚNG MỐC THỰC TẾ (~2.926 KM)
DO $$
DECLARE
  v_mazda_id UUID := '20260308-0001-4222-8888-19b213872026';
  v_real_max_odo NUMERIC(10,2);
BEGIN
  -- Tìm ODO lớn nhất từ các chuyến đi và nhật ký đổ xăng thực tế
  SELECT GREATEST(
    COALESCE((SELECT MAX(end_odometer) FROM public.trips WHERE asset_id = v_mazda_id), 0),
    COALESCE((SELECT MAX(odometer_km) FROM public.fuel_logs WHERE asset_id = v_mazda_id), 0),
    2926.0
  ) INTO v_real_max_odo;

  UPDATE public.assets
  SET 
    current_odometer_km = v_real_max_odo,
    virtual_odometer_km = v_real_max_odo,
    updated_at = NOW()
  WHERE id = v_mazda_id;

  RAISE NOTICE '>>> ĐÃ ĐỒNG BỘ ODOMETER XE MAZDA 2 VỀ MỐC CHUẨN: % km', v_real_max_odo;
END $$;

-- BƯỚC 2: CẬP NHẬT RPC fmms_get_vehicle_context (ƯU TIÊN MAX ODO TỪ TRIPS/FUEL THỰC TẾ)
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
    v_real_odo NUMERIC(10,2);
    v_fuel_type TEXT;
    v_tank NUMERIC(6,2);
    v_asset jsonb;
    v_trips jsonb;
    v_fuel jsonb;
    v_maint jsonb;
    v_exp jsonb;
    v_monthly jsonb;
BEGIN
    IF p_asset_id IS NULL THEN
        RETURN jsonb_build_object('authorized', false, 'error', 'missing_asset_id');
    END IF;

    -- Verify access if device_id is provided, or allow if asset exists
    IF p_device_id IS NOT NULL THEN
        v_authorized := public.fmms_verify_device_access(p_device_id, p_asset_id);
    ELSE
        v_authorized := EXISTS (SELECT 1 FROM public.assets WHERE id = p_asset_id);
    END IF;

    IF v_authorized IS DISTINCT FROM TRUE THEN
        RETURN jsonb_build_object('authorized', false);
    END IF;

    -- Asset info
    SELECT name, brand, model, current_odometer_km, fuel_type, tank_capacity_liters
      INTO v_asset_name, v_brand, v_model, v_odo, v_fuel_type, v_tank
      FROM public.assets
     WHERE id = p_asset_id;

    -- Luôn lấy ODO chuẩn nhất từ MAX(end_odometer) của trips / fuel_logs
    SELECT GREATEST(
      COALESCE(v_odo, 0),
      COALESCE((SELECT MAX(end_odometer) FROM public.trips WHERE asset_id = p_asset_id), 0),
      COALESCE((SELECT MAX(odometer_km) FROM public.fuel_logs WHERE asset_id = p_asset_id), 0)
    ) INTO v_real_odo;

    v_asset := jsonb_build_object(
        'name', COALESCE(v_asset_name, ''),
        'brand', COALESCE(v_brand, ''),
        'model', COALESCE(v_model, ''),
        'current_odometer_km', v_real_odo,
        'fuel_type', v_fuel_type,
        'tank_capacity_liters', v_tank
    );

    -- Recent trips
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

    -- Maintenance records
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
                'next_due_date', m.next_due_date,
                'next_due_km', m.next_due_km
            ) AS j
            FROM public.maintenance_records m
            WHERE m.asset_id = p_asset_id
            ORDER BY m.date DESC
            LIMIT 5
        ) sub
    ), '[]'::jsonb);

    -- Expense summary
    v_exp := jsonb_build_object(
        'total_fuel', COALESCE((SELECT SUM(total_cost) FROM public.fuel_logs WHERE asset_id = p_asset_id), 0),
        'total_maintenance', COALESCE((SELECT SUM(cost) FROM public.maintenance_records WHERE asset_id = p_asset_id), 0),
        'total_overall', COALESCE((SELECT SUM(amount) FROM public.expenses WHERE asset_id = p_asset_id), 0)
    );

    RETURN jsonb_build_object(
        'authorized', true,
        'asset', v_asset,
        'recent_trips', v_trips,
        'recent_fuel_logs', v_fuel,
        'maintenance', v_maint,
        'expense_summary', v_exp
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fmms_get_vehicle_context(UUID, UUID, INT) TO anon, authenticated, service_role;

-- BƯỚC 3: TẠO TRIGGER TỰ ĐỘNG CẬP NHẬT ODOMETER CHO ASSETS KHI CÓ TRIP HOẶC FUEL LOG MỚI
CREATE OR REPLACE FUNCTION public.fn_auto_sync_asset_odometer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_TABLE_NAME = 'trips' AND NEW.end_odometer IS NOT NULL AND NEW.end_odometer > 0 THEN
    UPDATE public.assets 
    SET current_odometer_km = GREATEST(COALESCE(current_odometer_km, 0), NEW.end_odometer),
        virtual_odometer_km = GREATEST(COALESCE(virtual_odometer_km, 0), NEW.end_odometer),
        updated_at = NOW()
    WHERE id = NEW.asset_id;
  ELSIF TG_TABLE_NAME = 'fuel_logs' AND NEW.odometer_km IS NOT NULL AND NEW.odometer_km > 0 THEN
    UPDATE public.assets 
    SET current_odometer_km = GREATEST(COALESCE(current_odometer_km, 0), NEW.odometer_km),
        virtual_odometer_km = GREATEST(COALESCE(virtual_odometer_km, 0), NEW.odometer_km),
        updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_asset_odo_trips ON public.trips;
CREATE TRIGGER trg_sync_asset_odo_trips
AFTER INSERT OR UPDATE OF end_odometer ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_sync_asset_odometer();

DROP TRIGGER IF EXISTS trg_sync_asset_odo_fuel ON public.fuel_logs;
CREATE TRIGGER trg_sync_asset_odo_fuel
AFTER INSERT OR UPDATE OF odometer_km ON public.fuel_logs
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_sync_asset_odometer();

NOTIFY pgrst, 'reload schema';
