-- Migration 0019: Add inspection & registration dates to assets table
ALTER TABLE IF EXISTS public.assets
  ADD COLUMN IF NOT EXISTS inspection_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS inspection_date DATE,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS next_maintenance_due DATE;

-- Comment on columns
COMMENT ON COLUMN public.assets.inspection_expiry_date IS 'Hạn đăng kiểm tiếp theo của xe';
COMMENT ON COLUMN public.assets.inspection_date IS 'Ngày đăng kiểm gần nhất';
COMMENT ON COLUMN public.assets.registration_date IS 'Ngày đăng ký xe / ngày cấp cà vẹt';
COMMENT ON COLUMN public.assets.next_maintenance_due IS 'Hạn bảo dưỡng tiếp theo (dầu mỡ, định kỳ)';
