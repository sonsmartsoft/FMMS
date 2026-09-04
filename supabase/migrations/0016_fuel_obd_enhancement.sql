-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0016: OBD Fuel Level & Precision Consumption Enhancement
-- ========================================================

ALTER TABLE public.fuel_logs
  ADD COLUMN IF NOT EXISTS fuel_level_before_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_liters_before NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_level_after_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_liters_after NUMERIC,
  ADD COLUMN IF NOT EXISTS calculated_consumption_l100km NUMERIC,
  ADD COLUMN IF NOT EXISTS prev_odometer_km NUMERIC,
  ADD COLUMN IF NOT EXISTS fuel_consumed_liters NUMERIC;

COMMENT ON COLUMN public.fuel_logs.fuel_level_before_pct IS 'Mức xăng trước khi đổ (%) từ OBD PID 012F';
COMMENT ON COLUMN public.fuel_logs.fuel_liters_before IS 'Số lít xăng còn lại trong bình trước khi đổ';
COMMENT ON COLUMN public.fuel_logs.fuel_level_after_pct IS 'Mức xăng sau khi đổ (%)';
COMMENT ON COLUMN public.fuel_logs.fuel_liters_after IS 'Tổng số lít xăng trong bình sau khi đổ';
COMMENT ON COLUMN public.fuel_logs.calculated_consumption_l100km IS 'Mức tiêu hao thực tế (L/100km) tính từ lượng xăng đã dùng giữa 2 lần đổ';
COMMENT ON COLUMN public.fuel_logs.prev_odometer_km IS 'Số ODO của lần đổ xăng liền trước';
COMMENT ON COLUMN public.fuel_logs.fuel_consumed_liters IS 'Lượng xăng thực tế đã tiêu thụ từ lần đổ trước đến lần này (Lít)';
