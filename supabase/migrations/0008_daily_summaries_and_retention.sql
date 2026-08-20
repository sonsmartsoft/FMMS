-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0008 (revised): Daily Summaries + Data Retention
--
-- LƯU Ý: bảng public.daily_summaries ĐÃ TỒN TẠI từ 0001/SETUP
-- với cột date/trip_count (id PK, UNIQUE(asset_id, date)).
-- Nên 0008 chỉ ALTER thêm cột, KHÔNG tạo lại bảng.
-- Mục đích:
--   1) Giữ lịch sử dạng gọn trước khi xoá raw GPS/trips cũ.
--   2) pg_cron tự xoá: gps_track_points giữ 30 ngày, trips giữ 90 ngày.
-- ========================================================

-- --------------------------------------------------------
-- 1. Bổ sung cột cho bảng daily_summaries hiện có
-- --------------------------------------------------------
ALTER TABLE public.daily_summaries
    ADD COLUMN IF NOT EXISTS device_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_speed_kmh    NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS track_points     INTEGER DEFAULT 0;

-- Index theo ngày để lọc nhanh
CREATE INDEX IF NOT EXISTS idx_daily_summaries_date
    ON public.daily_summaries (date DESC);

-- --------------------------------------------------------
-- 2. RLS & GRANT
--    (Policy "Owners can view daily summaries" từ 0003 đã cho
--     owner đọc; thêm GRANT cho authenticated + service_role)
-- --------------------------------------------------------
GRANT SELECT ON public.daily_summaries TO authenticated, service_role;

-- --------------------------------------------------------
-- 3. pg_cron
-- --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3a. 00:30 UTC hàng ngày — gộp trips hôm qua vào daily_summaries
--     (chạy TRƯỚC job purge 00:35 để không mất dữ liệu lịch sử)
SELECT cron.schedule(
    'daily-trip-summary',
    '30 0 * * *',
    $cron$
    INSERT INTO public.daily_summaries (
        asset_id, date, distance_km, duration_seconds,
        average_speed_kmh, max_speed_kmh, trip_count, updated_at
    )
    SELECT
        t.asset_id,
        (COALESCE(t.end_time, t.start_time) AT TIME ZONE 'UTC')::date AS date,
        COALESCE(SUM(t.distance_km), 0) AS distance_km,
        COALESCE(SUM(t.duration_seconds), 0) AS duration_seconds,
        AVG(t.average_speed_kmh) AS average_speed_kmh,
        MAX(t.max_speed_kmh)   AS max_speed_kmh,
        COUNT(*)               AS trip_count,
        NOW() AS updated_at
    FROM public.trips t
    WHERE t.status <> 'RECORDING'
      AND COALESCE(t.end_time, t.start_time) >= (CURRENT_DATE - 1)
      AND COALESCE(t.end_time, t.start_time) <  CURRENT_DATE
    GROUP BY 1, 2
    ON CONFLICT (asset_id, date) DO UPDATE SET
        distance_km       = EXCLUDED.distance_km,
        duration_seconds  = EXCLUDED.duration_seconds,
        average_speed_kmh = EXCLUDED.average_speed_kmh,
        max_speed_kmh     = EXCLUDED.max_speed_kmh,
        trip_count        = EXCLUDED.trip_count,
        updated_at        = NOW();
    $cron$
);

-- 3b. 00:35 UTC hàng ngày — cập nhật số track point + xoá dữ liệu cũ
SELECT cron.schedule(
    'gps-daily-count-purge',
    '35 0 * * *',
    $cron$
    -- a) Ghi nhận số GPS point hôm qua (kể cả ngày không có trip)
    INSERT INTO public.daily_summaries (asset_id, date, track_points, updated_at)
    SELECT
        p.vehicle_id AS asset_id,
        (p.recorded_at AT TIME ZONE 'UTC')::date AS date,
        COUNT(*)::INTEGER AS track_points,
        NOW() AS updated_at
    FROM public.gps_track_points p
    WHERE p.recorded_at >= (CURRENT_DATE - 1)
      AND p.recorded_at <  CURRENT_DATE
    GROUP BY 1, 2
    ON CONFLICT (asset_id, date) DO UPDATE SET
        track_points = EXCLUDED.track_points,
        updated_at   = NOW();

    -- b) Xoá raw GPS cũ hơn 30 ngày
    DELETE FROM public.gps_track_points
    WHERE recorded_at < NOW() - INTERVAL '30 days';

    -- c) Xoá trips đã hoàn tất cũ hơn 90 ngày
    DELETE FROM public.trips
    WHERE status = 'COMPLETED'
      AND COALESCE(end_time, start_time) < NOW() - INTERVAL '90 days';
    $cron$
);

NOTIFY pgrst, 'reload schema';