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
            'category', e.category,
            'label', CASE
                WHEN upper(e.category) IN ('FUEL','NHLIELU','NHIÊN LIỆU') THEN 'Nhiên liệu'
                WHEN upper(e.category) IN ('MAINTENANCE','BUDUONG','BẢO DƯỠNG') THEN 'Bảo dưỡng'
                WHEN upper(e.category) IN ('PARTS','PHTNG','PHỤ TÙNG') THEN 'Phụ tùng'
                WHEN upper(e.category) IN ('LABOR','CNGTH') THEN 'Công thợ'
                WHEN upper(e.category) = 'INSURANCE' THEN 'Bảo hiểm'
                WHEN upper(e.category) IN ('REGISTRATION','LPH TRC B') THEN 'Lệ phí/Đăng ký'
                WHEN upper(e.category) = 'INSPECTION' THEN 'Đăng kiểm'
                WHEN upper(e.category) = 'TOLL' THEN 'Phí đường'
                WHEN upper(e.category) = 'PARKING' THEN 'Gửi xe'
                WHEN upper(e.category) IN ('UPGRADE','NNG CP') THEN 'Nâng cấp'
                WHEN upper(e.category) IN ('WASH','CAR_WASH','RA XE') THEN 'Rửa xe'
                WHEN upper(e.category) = 'INITIAL' THEN 'Chi phí ban đầu'
                WHEN upper(e.category) = 'RUNNING' THEN 'Chi phí vận hành'
                WHEN upper(e.category) IN ('LOAN','VAY') THEN 'Vay/Tài chính'
                WHEN upper(e.category) = 'LOAN_INTEREST' THEN 'Lãi vay'
                WHEN upper(e.category) = 'LOAN_PAYMENT' THEN 'Trả gốc vay'
                WHEN upper(e.category) IN ('EQUIPMENT','THITB','THIẾT BỊ') THEN 'Trang thiết bị'
                WHEN upper(e.category) IN ('OIL','DNNHT','DẦU NHỚT') THEN 'Dầu nhớt'
                WHEN upper(e.category) IN ('TYRES','TIRES','LOP','LỐP') THEN 'Lốp xe'
                ELSE 'Khác'
            END,
            'amount', SUM(e.amount),
            'currency', MAX(e.currency)
        ) AS j
        FROM public.expenses e
        WHERE e.asset_id = p_asset_id
          AND e.date >= p_from::date
          AND e.date <= p_to::date
          AND e.amount > 0
        GROUP BY e.category
        ORDER BY SUM(e.amount) DESC
    ) x;

    RETURN v_result;
END;
$$;

-- Grant EXECUTE to anon so the app (publishable key) can call it.
GRANT EXECUTE ON FUNCTION public.fmms_get_expense_breakdown(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated, service_role;
