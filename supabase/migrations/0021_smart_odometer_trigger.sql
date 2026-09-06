-- ==============================================================================
-- FMMS: NÂNG CẤP TRIGGER TỰ ĐỘNG CẬP NHẬT ODOMETER CHO TẤT CẢ XE (MAZDA & XE KHÁC)
-- Đảm bảo: Khi app CarLogger đẩy chuyến đi mới về, ODO xe tự động nhảy theo realtime
-- Không bao giờ bị cộng trùng hoặc lệch số ODO
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.auto_sync_asset_odometer_from_trips()
RETURNS TRIGGER AS $$
DECLARE
    v_latest_odo NUMERIC(10,2);
BEGIN
    -- Chỉ xử lý khi chuyến đi hoàn thành
    IF (NEW.status = 'COMPLETED') THEN
        -- Tìm mốc ODO lớn nhất từ các chuyến đi của xe này
        SELECT MAX(end_odometer) INTO v_latest_odo
        FROM public.trips
        WHERE asset_id = NEW.asset_id;

        IF v_latest_odo IS NOT NULL AND v_latest_odo > 0 THEN
            UPDATE public.assets
            SET 
                current_odometer_km = v_latest_odo,
                virtual_odometer_km = v_latest_odo,
                updated_at = NOW()
            WHERE id = NEW.asset_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn trigger vào bảng trips
DROP TRIGGER IF EXISTS trigger_update_asset_odometer ON public.trips;
DROP TRIGGER IF EXISTS trigger_auto_sync_asset_odometer ON public.trips;

CREATE TRIGGER trigger_auto_sync_asset_odometer
AFTER INSERT OR UPDATE OF end_odometer, status, distance_km ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.auto_sync_asset_odometer_from_trips();

NOTIFY pgrst, 'reload schema';
