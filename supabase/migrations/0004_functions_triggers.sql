-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0004: Functions & Triggers
-- Virtual Odometer Updates & Monthly Summary Aggregation
-- ========================================================

-- Function to handle trip insertion/update and update Asset virtual Odometer
CREATE OR REPLACE FUNCTION public.update_asset_virtual_odometer()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.distance_km > 0 AND NEW.status = 'COMPLETED') THEN
        UPDATE public.assets
        SET 
            virtual_odometer_km = COALESCE(virtual_odometer_km, 0) + NEW.distance_km,
            current_odometer_km = COALESCE(current_odometer_km, 0) + NEW.distance_km,
            updated_at = NOW()
        WHERE id = NEW.asset_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_asset_odometer
AFTER INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.update_asset_virtual_odometer();

-- Function to aggregate daily & monthly summaries when expense/fuel is logged
CREATE OR REPLACE FUNCTION public.update_monthly_summary_on_expense()
RETURNS TRIGGER AS $$
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

CREATE OR REPLACE TRIGGER trigger_update_monthly_summary
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_monthly_summary_on_expense();
