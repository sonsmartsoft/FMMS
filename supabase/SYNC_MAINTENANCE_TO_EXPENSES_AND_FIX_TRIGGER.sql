-- ========================================================
-- FIX TRIGGER SECURITY & SYNC HISTORICAL MAINTENANCE TO EXPENSES
-- ========================================================

-- 1. Sửa trigger function trên bảng expenses sang SECURITY DEFINER
-- Để khi insert vào expenses không bị lỗi RLS của bảng monthly_summaries (code 42501)
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

-- 2. Đồng bộ các bản ghi bảo dưỡng từ maintenance_records sang bảng expenses nếu chưa có
INSERT INTO public.expenses (
    id,
    asset_id,
    date,
    category,
    subcategory,
    sub_category,
    amount,
    currency,
    vendor,
    odometer_km,
    description,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    m.asset_id,
    m.date,
    'MAINTENANCE',
    m.maintenance_type,
    m.maintenance_type,
    m.cost,
    COALESCE(m.currency, 'VND'),
    m.vendor,
    m.odometer_km,
    CONCAT('Bảo dưỡng: ', m.maintenance_type, COALESCE(' - ' || m.notes, '')),
    NOW(),
    NOW()
FROM public.maintenance_records m
WHERE m.cost > 0
  AND NOT EXISTS (
      SELECT 1 FROM public.expenses e 
      WHERE e.asset_id = m.asset_id 
        AND e.date = m.date 
        AND ABS(e.amount - m.cost) < 100
        AND (e.category = 'MAINTENANCE' OR e.description ILIKE '%bảo dưỡng%')
  );
