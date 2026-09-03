-- ============================================================
-- fmms_get_expense_breakdown
-- Secure per-category expense breakdown for a vehicle & time range,
-- used by the Android Stats tab (donut chart) which has no local copy
-- of the `expenses` table (data lives only in the DB).
--
-- SECURITY DEFINER: verifies the calling device is bound to the asset
-- (fmms_verify_device_access) before returning any data, so the anon
-- publishable key alone cannot read another vehicle's expenses.
--
-- Returns a JSONB array: [ { "category","label","amount" }, ... ]
-- grouped by category over [p_from, p_to]. "label" is a Vietnamese
-- human-friendly name for the chart legend.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fmms_get_expense_breakdown(
    p_device_id UUID,
    p_asset_id UUID,
    p_from TIMESTAMPTZ,
    p_to TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_authorized BOOLEAN;
    v_result JSONB;
BEGIN
    IF p_asset_id IS NULL OR p_device_id IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;

    v_authorized := public.fmms_verify_device_access(p_device_id, p_asset_id);
    IF v_authorized IS DISTINCT FROM TRUE THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(jsonb_agg(x.j), '[]'::jsonb)
      INTO v_result
      FROM (
        SELECT jsonb_build_object(
            'category', g.label,
            'label', g.label,
            'amount', SUM(g.amount),
            'currency', MAX(g.currency)
        ) AS j
        FROM (
            SELECT
                e.category AS cat,
                CASE
                    WHEN upper(e.category) IN ('FUEL','NHLIELU','NHIÊN LIỆU','WASH','CAR_WASH','RA XE','PARKING','INSURANCE','BẢO HIỂM THÂN VỎ','BẢO HIỂM TNDS','BẢO HIỂM','LABOR','CNGTH','REGISTRATION','LPH TRC B','LỆ PHÍ TRƯỚC BẠ','BIỂN SỐ & ĐĂNG KÝ','BIỂN SỐ','INSPECTION','PHÍ ĐĂNG KIỂM','ĐĂNG KIỂM','TOLL','PHÍ ĐƯỜNG BỘ (1 NĂM)','PHÍ ĐƯỜNG BỘ','PHÍ ĐƯỜNG','RUNNING') THEN 'Running'
                    WHEN upper(e.category) IN ('PARTS','PHTNG','PHỤ TÙNG','EQUIPMENT','THITB','THIẾT BỊ') THEN 'Upgrade'
                    WHEN upper(e.category) IN ('UPGRADE','NNG CP') THEN 'Upgrade'
                    WHEN upper(e.category) IN ('INITIAL','MUA XE BAN ĐẦU','CHI PHÍ BAN ĐẦU') THEN 'Initial'
                    WHEN upper(e.category) IN ('MAINTENANCE','BUDUONG','BẢO DƯỠNG','CHI PHÍ VẬN HÀNH','OIL','DNNHT','DẦU NHỚT','TYRES','TIRES','LOP','LỐP') THEN 'Maintenance'
                    WHEN upper(e.category) IN ('LOAN','VAY') THEN 'Loan'
                    WHEN upper(e.category) = 'LOAN_INTEREST' THEN 'Loan'
                    WHEN upper(e.category) = 'LOAN_PAYMENT' THEN 'Loan'
                    ELSE 'Khác'
                END AS label,
                e.amount,
                e.currency
            FROM public.expenses e
            WHERE e.asset_id = p_asset_id
              AND e.date >= p_from::date
              AND e.date <= p_to::date
              AND e.amount > 0

            UNION ALL

            -- Xăng từ fuel_logs: gộp vào Running (tương ứng web VehicleFinanceOverview)
            SELECT
                'FUEL' AS cat,
                'Running' AS label,
                COALESCE(f.total_cost, 0) AS amount,
                'VND' AS currency
            FROM public.fuel_logs f
            WHERE f.asset_id = p_asset_id
              AND COALESCE(f.total_cost, 0) > 0
              AND (f.timestamp IS NOT NULL AND f.timestamp::date >= p_from::date AND f.timestamp::date <= p_to::date)

            UNION ALL

            -- Bảo dưỡng từ maintenance_records: nhóm riêng Maintenance
            SELECT
                'MAINTENANCE' AS cat,
                'Maintenance' AS label,
                COALESCE(m.cost, 0) AS amount,
                'VND' AS currency
            FROM public.maintenance_records m
            WHERE m.asset_id = p_asset_id
              AND COALESCE(m.cost, 0) > 0
              AND m.date >= p_from::date
              AND m.date <= p_to::date
        ) g
        GROUP BY g.label
        ORDER BY SUM(g.amount) DESC
    ) x;

    RETURN v_result;
END;
$$;

-- Grant EXECUTE to anon so the app (publishable key) can call it.
GRANT EXECUTE ON FUNCTION public.fmms_get_expense_breakdown(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;
