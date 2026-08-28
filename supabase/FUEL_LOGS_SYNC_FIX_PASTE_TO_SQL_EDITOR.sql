-- ============================================================
-- FMMS FUEL LOGS SYNC FIX — Paste vào Supabase SQL Editor
-- Bảng fuel_logs chưa bao giờ nhận dữ liệu từ app vì:
--   1) App chỉ ghi DB local, không enqueue (đã sửa trong app).
--   2) RLS chặn INSERT của anon key (42501) — trips đã được mở
--      từ trước, fuel_logs thì chưa.
-- File này làm phần (2): thêm cột device_id + mở policy theo
-- đúng mẫu TRIPS_SYNC_FIX_PASTE_TO_SQL_EDITOR.sql.
-- ============================================================

ALTER TABLE public.fuel_logs
    ADD COLUMN IF NOT EXISTS device_id UUID;

CREATE INDEX IF NOT EXISTS idx_fuel_logs_device_time
    ON public.fuel_logs (device_id, timestamp DESC);

-- RLS: cho phép insert/update theo device đã ghép cặp (không cần đăng nhập web).
-- Cần cả UPDATE vì app đẩy bằng upsert merge-duplicates (ON CONFLICT DO UPDATE).
DROP POLICY IF EXISTS "Owners can manage fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Devices can insert fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Devices can update fuel logs" ON public.fuel_logs;

CREATE POLICY "Devices can insert fuel logs" ON public.fuel_logs
    FOR INSERT
    WITH CHECK (
        public.is_asset_owner(asset_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = fuel_logs.device_id
              AND d.asset_id = fuel_logs.asset_id
        )
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = fuel_logs.device_id
              AND d.vehicle_id = fuel_logs.asset_id
        )
    );

CREATE POLICY "Devices can update fuel logs" ON public.fuel_logs
    FOR UPDATE
    USING (
        public.is_asset_owner(asset_id)
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = fuel_logs.device_id
              AND d.asset_id = fuel_logs.asset_id
        )
        OR EXISTS (
            SELECT 1 FROM public.devices d
            WHERE d.id = fuel_logs.device_id
              AND d.vehicle_id = fuel_logs.asset_id
        )
    )
    WITH CHECK (true);

GRANT INSERT, SELECT, UPDATE ON public.fuel_logs TO anon, authenticated, service_role;
