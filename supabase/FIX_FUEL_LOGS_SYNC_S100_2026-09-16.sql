-- ==============================================================================
-- FMMS: FIX TRIGGER CHAIN KHIẾN ĐỒNG BỘ ĐỔ XĂNG BỊ CHẶN (HTTP 401 / code 42501)
-- Ngày: 2026-09-16. Bản rev135 của app Android (đầu xe 192.168.1.22)
-- Copy toàn bộ đoạn này và Paste vào Supabase SQL Editor rồi bấm RUN (Chạy).
-- ==============================================================================
--
-- Triệu chứng: app ghi lệnh đổ xăng vào fuel_logs local, sync thử 4 lần đều lỗi
--     new row violates row-level security policy for table "monthly_summaries"
-- Chuỗi gây lỗi (chạy với quyền anon của app):
--   INSERT fuel_logs
--     -> trigger trigger_sync_fuel_log_to_expense (ghi vào expenses)
--        -> trigger trigger_update_monthly_summary (ghi vào monthly_summaries)
--           -> RLS monthly_summaries CHẶN anon  => 42501 => rollback cả chuỗi
--
-- Fix: chuyển cả 2 hàm trigger sang SECURITY DEFINER + search_path cố định để
-- chúng chạy với quyền của owner (postgres), bỏ qua RLS các bảng đích.
-- ==============================================================================

-- 1. FUEL_LOGS -> EXPENSES: chạy như owner, ghi expenses thay cho anon
CREATE OR REPLACE FUNCTION public.sync_fuel_log_to_expense()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- 2. EXPENSES -> MONTHLY_SUMMARIES: chạy như owner, ghi monthly_summaries thay cho anon
CREATE OR REPLACE FUNCTION public.update_monthly_summary_on_expense()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    exp_year INT;
    exp_month INT;
BEGIN
    exp_year := EXTRACT(YEAR FROM NEW.date);
    exp_month := EXTRACT(MONTH FROM NEW.date);

    INSERT INTO public.monthly_summaries (asset_id, year, month, total_expense, fuel_cost, maintenance_cost)
    VALUES (
        NEW.asset_id, exp_year, exp_month, NEW.amount,
        CASE WHEN NEW.category = 'FUEL' THEN NEW.amount ELSE 0 END,
        CASE WHEN NEW.category IN ('MAINTENANCE', 'PARTS', 'LABOR') THEN NEW.amount ELSE 0 END
    )
    ON CONFLICT (asset_id, year, month) DO UPDATE SET
        total_expense = monthly_summaries.total_expense + EXCLUDED.total_expense,
        fuel_cost = monthly_summaries.fuel_cost + EXCLUDED.fuel_cost,
        maintenance_cost = monthly_summaries.maintenance_cost + EXCLUDED.maintenance_cost,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_monthly_summary ON public.expenses;
CREATE TRIGGER trigger_update_monthly_summary
AFTER INSERT OR UPDATE OF amount, category, date ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_monthly_summary_on_expense();

-- 3. RELOAD SCHEMA CACHE CHO POSTGREST (để app gửi RETRY sync ngay không bị cache cũ)
NOTIFY pgrst, 'reload schema';

-- ==============================================================================
-- Sau khi chạy xong: BẬT app Android (hoặc mở lại app) trên đầu xe 192.168.1.22 —
-- bản ghi đổ xăng 2026-09-15 20:47 (19.585L, 500k VND, odo 3225.8) đang PENDING
-- trong sync_queue sẽ được tự gửi lại (app tự retry khi mở và mỗi 15 phút).
-- ==============================================================================