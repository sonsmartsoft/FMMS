-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0008: Daily Summaries + Data Retention
--
-- Mục đích:
--   1) Giữ lịch sử dạng gọn (1 dòng/ngày/xe/thiết bị) trước khi
--      xoá raw GPS/trips cũ → web charts vẫn hiển thị được lịch sử
--      dài hạn trên Supabase Free 500MB.
--   2) Tự động xoá dữ liệu cũ bằng pg_cron (free trên Supabase):
--        - gps_track_points  giữ 30 ngày
--        - trips             giữ 90 ngày
--      Raw point ~1MB/ngày hoạt động → ~30-60MB đủ thoải mái.
-- ========================================================

-- --------------------------------------------------------
-- 1. Bảng daily_summaries
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_summaries (
    day               DATE        NOT NULL,
    asset_id          UUID        NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    -- device_id NULL gom về sentinel để PK không đụng NULL
    device_id         UUID        NOT NULL,
    distance_km       NUMERIC(10,2) DEFAULT 0,
    duration_seconds  INTEGER       DEFAULT 0,
    avg_speed_kmh     NUMERIC(5,2),
    max_speed_kmh     NUMERIC(5,2),
    trips_count       INTEGER       DEFAULT 0,
    track_points      INTEGER       DEFAULT 0,
    updated_at        TIMESTAMPTZ   DEFAULT NOW(),
    PRIMARY KEY (day, asset_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_asset_day
    ON public.daily_summaries (asset_id, day DESC);

COMMENT ON TABLE public.daily_summaries IS
    'Lịch sử gọn theo ngày (retention): gps_track_points giữ 30 ngày, trips giữ 90 ngày.';

COMMENT ON COLUMN public.daily_summaries.device_id IS
    '00000000-0000-0000-0000-000000000000 nếu trip không có device_id';

-- Sentinel UUID cho phần tử device_id NULL
-- (dùng COALESCE trực tiếp trong job, không cần biến session)

-- --------------------------------------------------------
-- 2. Row Level Security
-- --------------------------------------------------------
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

-- Đọc: chủ xe, hoặc device đã đăng ký (dòng gom sentinel chỉ chủ xe đọc)
DROP POLICY IF EXISTS "Read daily summaries" ON public.daily_summaries;
CREATE POLICY "Read daily summaries" ON public.daily_summaries
    FOR SELECT
    USING (
        public.is_asset_owner(asset_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = daily_summaries.device_id
            AND daily_summaries.device_id <> '00000000-0000-0000-0000-000000000000'
        )
    );

GRANT SELECT ON public.daily_summaries TO anon, authenticated, service_role;

-- --------------------------------------------------------
-- 3. pg_cron
-- --------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3a. 00:30 UTC hàng ngày — gộp trips hôm qua thành daily_summaries
--     (chạy TRƯỚC job purge 00:35 để không mất dữ liệu lịch sử)
SELECT cron.schedule(
    'daily-trip-summary',
    '30 0 * * *',
    $cron$
    INSERT INTO public.daily_summaries (
        day, asset_id, device_id, distance_km, duration_seconds,
        avg_speed_kmh, max_speed_kmh, trips_count, updated_at
    )
    SELECT
        (t.start_time AT TIME ZONE 'UTC')::date AS day,
        t.asset_id,
        COALESCE(t.device_id, '00000000-0000-0000-0000-000000000000') AS device_id,
        COALESCE(SUM(t.distance_km), 0) AS distance_km,
        COALESCE(SUM(t.duration_seconds), 0) AS duration_seconds,
        AVG(t.average_speed_kmh) AS avg_speed_kmh,
        MAX(t.max_speed_kmh)   AS max_speed_kmh,
        COUNT(*)               AS trips_count,
        NOW() AS updated_at
    FROM public.trips t
    WHERE t.status <> 'RECORDING'
      AND COALESCE(t.end_time, t.start_time) >= (CURRENT_DATE - 1)
      AND COALESCE(t.end_time, t.start_time) <  CURRENT_DATE
    GROUP BY 1, 2, 3
    ON CONFLICT (day, asset_id, device_id) DO UPDATE SET
        distance_km      = EXCLUDED.distance_km,
        duration_seconds = EXCLUDED.duration_seconds,
        avg_speed_kmh    = EXCLUDED.avg_speed_kmh,
        max_speed_kmh    = EXCLUDED.max_speed_kmh,
        trips_count      = EXCLUDED.trips_count,
        updated_at       = NOW();
    $cron$
);

-- 3b. 00:35 UTC hàng ngày — cập nhật số track point hôm qua + xoá dữ liệu cũ
SELECT cron.schedule(
    'gps-daily-count-purge',
    '35 0 * * *',
    $cron$
    -- a) Ghi nhận số GPS point hôm qua (kể cả ngày không có trip)
    INSERT INTO public.daily_summaries (day, asset_id, device_id, track_points, updated_at)
    SELECT
        (p.recorded_at AT TIME ZONE 'UTC')::date AS day,
        p.vehicle_id AS asset_id,
        COALESCE(p.device_id, '00000000-0000-0000-0000-000000000000') AS device_id,
        COUNT(*)::INTEGER AS track_points,
        NOW() AS updated_at
    FROM public.gps_track_points p
    WHERE p.recorded_at >= (CURRENT_DATE - 1)
      AND p.recorded_at <  CURRENT_DATE
    GROUP BY 1, 2, 3
    ON CONFLICT (day, asset_id, device_id) DO UPDATE SET
        track_points = EXCLUDED.track_points,
        updated_at   = NOW();

    -- b) Xoá raw GPS cũ hơn 30 ngày
    DELETE FROM public.gps_track_points
    WHERE recorded_at < NOW() - INTERVAL '30 days';

    -- c) Xoá trips đã hoàn tất cũ hơn 90 ngày (giữ RECORDING mồ côi nếu có)
    DELETE FROM public.trips
    WHERE status = 'COMPLETED'
      AND COALESCE(end_time, start_time) < NOW() - INTERVAL '90 days';
    $cron$
);

NOTIFY pgrst, 'reload schema';