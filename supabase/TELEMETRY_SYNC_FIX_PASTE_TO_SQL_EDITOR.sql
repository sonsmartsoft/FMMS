-- ============================================================
-- FMMS TELEMETRY SYNC FIX — Paste vào Supabase SQL Editor
-- Cho phép app (anon key) đẩy OBD telemetry_samples theo device
-- đã đăng ký, giống cơ chế trips. Chạy 1 lần.
-- ============================================================

-- Cột device_id đã có sẵn trong schema gốc; bảo đảm tồn tại:
ALTER TABLE public.telemetry_samples
    ADD COLUMN IF NOT EXISTS device_id UUID;

CREATE INDEX IF NOT EXISTS idx_telemetry_device_time
    ON public.telemetry_samples (device_id, timestamp DESC);

-- RLS: cho phép INSERT/UPDATE theo device đã đăng ký (không cần login web)
DROP POLICY IF EXISTS "telemetry_via_asset" ON public.telemetry_samples;
DROP POLICY IF EXISTS "Devices can insert telemetry" ON public.telemetry_samples;

CREATE POLICY "Devices can insert telemetry" ON public.telemetry_samples
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = telemetry_samples.device_id
              AND d.asset_id = telemetry_samples.asset_id
        )
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = telemetry_samples.device_id
              AND d.vehicle_id = telemetry_samples.asset_id
        )
    );

GRANT INSERT, SELECT, UPDATE ON public.telemetry_samples TO anon, authenticated, service_role;
