-- ==============================================================================
-- FMMS: FIX ĐỒNG BỘ ĐỔ XĂNG TỪ APP ANDROID LÊN WEB (SCHEMA & RLS)
-- Chạy đoạn này trong Supabase SQL Editor để app Android đồng bộ tức thì lên Web
-- ==============================================================================

-- 1. BỔ SUNG CÁC CỘT CÒN THIẾU TRONG BẢNG FUEL_LOGS MÀ APP ANDROID GỬI LÊN
ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS device_id UUID,
  ADD COLUMN IF NOT EXISTS fuel_level_before_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_liters_before NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_level_after_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_liters_after NUMERIC,
  ADD COLUMN IF NOT EXISTS calculated_consumption_l100km NUMERIC,
  ADD COLUMN IF NOT EXISTS prev_odometer_km NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_consumed_liters NUMERIC;

-- 2. TẠO INDEX ĐỂ TRUY VẤN NHANH
CREATE INDEX IF NOT EXISTS idx_fuel_logs_device_time
  ON public.fuel_logs (device_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_fuel_logs_asset_time
  ON public.fuel_logs (asset_id, timestamp DESC);

-- 3. MỞ RLS CHO CẢ APP ANDROID (ANON) VÀ WEB (AUTHENTICATED) ĐỀU GHI / ĐỌC ĐƯỢC
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Allow all authenticated family fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Devices can insert fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Devices can update fuel logs" ON public.fuel_logs;
DROP POLICY IF EXISTS "Allow all fuel logs access" ON public.fuel_logs;

CREATE POLICY "Allow all fuel logs access" ON public.fuel_logs
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.fuel_logs TO anon, authenticated, service_role;

-- 4. TỰ ĐỘNG ĐỒNG BỘ SANG BẢNG EXPENSES ĐỂ HIỂN THỊ TRONG BÁO CÁO CHI PHÍ
CREATE OR REPLACE FUNCTION public.sync_fuel_log_to_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.total_cost > 0) THEN
    INSERT INTO public.expenses (
      id, asset_id, date, category, sub_category, amount, currency, description, odometer_km
    ) VALUES (
      NEW.id,
      NEW.asset_id,
      NEW.timestamp::date,
      'FUEL',
      'Gasoline',
      NEW.total_cost,
      COALESCE(NEW.currency, 'VND'),
      COALESCE(NEW.notes, 'Đổ xăng ' || ROUND(NEW.fuel_liters, 2) || 'L tại ' || COALESCE(NEW.station, 'Cây xăng')),
      NEW.odometer_km
    )
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      odometer_km = EXCLUDED.odometer_km,
      description = EXCLUDED.description,
      date = EXCLUDED.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_fuel_log_to_expense ON public.fuel_logs;
CREATE TRIGGER trigger_sync_fuel_log_to_expense
AFTER INSERT OR UPDATE ON public.fuel_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_fuel_log_to_expense();

-- 5. RELOAD SCHEMA CACHE CHO POSTGREST
NOTIFY pgrst, 'reload schema';
