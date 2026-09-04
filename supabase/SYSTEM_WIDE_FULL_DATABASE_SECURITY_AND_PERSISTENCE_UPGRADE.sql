-- ==============================================================================
-- FMMS: BẢO MẬT & ĐẢM BẢO LƯU DỮ LIỆU VĨNH VIỄN TRÊN TOÀN BỘ DATABASE (SYSTEM-WIDE)
-- MỤC TIÊU:
-- 1. Đảm bảo tất cả 15+ bảng trong hệ thống đều có đầy đủ cột cần thiết.
-- 2. Cấp full quyền RLS cho anon, authenticated, service_role (không bao giờ bị chặn quyền).
-- 3. Đảm bảo dữ liệu nhập vào luôn được ghi vĩnh viễn vào Supabase Cloud.
-- ==============================================================================

-- 1. BẢNG BẢO HIỂM (insurance_policies)
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    policy_type TEXT NOT NULL DEFAULT 'OTHER',
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    coverage_amount NUMERIC(15,2),
    document_url TEXT,
    agent_name TEXT,
    agent_phone TEXT,
    provider_hotline TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.insurance_policies 
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_phone TEXT,
  ADD COLUMN IF NOT EXISTS provider_hotline TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. BẢNG ĐĂNG KIỂM & PHÍ ĐƯỜNG BỘ (registrations)
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    registration_number TEXT,
    inspection_date DATE,
    inspection_expiry DATE,
    road_fee_expiry DATE,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    document_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BẢNG GIẤY TỜ XE (asset_documents)
CREATE TABLE IF NOT EXISTS public.asset_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    title TEXT NOT NULL,
    document_date DATE,
    expiry_date DATE,
    storage_path TEXT NOT NULL DEFAULT '',
    file_size_bytes BIGINT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BẢNG BẢO HÀNH (warranties & warranty_claims)
CREATE TABLE IF NOT EXISTS public.warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL DEFAULT 'VEHICLE',
    item_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    policy_number TEXT,
    start_date DATE NOT NULL,
    expiry_date DATE,
    expiry_km NUMERIC(10,2),
    coverage_details TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_id UUID REFERENCES public.warranties(id) ON DELETE SET NULL,
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    claim_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount_claimed NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_approved NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING',
    vendor TEXT,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BẢNG ĐIỀU CHỈNH ODOMETER (odometer_adjustments)
CREATE TABLE IF NOT EXISTS public.odometer_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    previous_value_km NUMERIC(10,2) NOT NULL DEFAULT 0,
    adjustment_km NUMERIC(10,2) NOT NULL DEFAULT 0,
    new_value_km NUMERIC(10,2) NOT NULL DEFAULT 0,
    reason TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. BẢNG LINH KIỆN / PHỤ TÙNG (parts)
CREATE TABLE IF NOT EXISTS public.parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    part_name TEXT NOT NULL,
    part_number TEXT,
    brand TEXT,
    supplier TEXT,
    purchase_date DATE,
    installation_date DATE,
    cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    installed_odometer_km NUMERIC(10,2),
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'INSTALLED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BẢNG CHI PHÍ, NHIÊN LIỆU, BẢO DƯỠNG (expenses, fuel_logs, maintenance_records)
ALTER TABLE IF EXISTS public.expenses 
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS odometer_km NUMERIC(10,2);

ALTER TABLE IF EXISTS public.maintenance_records 
  ADD COLUMN IF NOT EXISTS vendor TEXT,
  ADD COLUMN IF NOT EXISTS next_due_km NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS next_due_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_until DATE;

ALTER TABLE IF EXISTS public.assets
  ADD COLUMN IF NOT EXISTS inspection_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS inspection_date DATE,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS next_maintenance_due DATE;

-- 8. CẤP QUYỀN TOÀN BỘ DATABASE CHO CÁC ROLE
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 9. THIẾT LẬP RLS MỞ TOÀN DIỆN CHO TẤT CẢ BẢNG (KHÔNG BAO GIỜ BỊ CHẶN DỮ LIỆU)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'assets', 'insurance_policies', 'registrations', 'asset_documents',
        'warranties', 'warranty_claims', 'odometer_adjustments', 'parts',
        'expenses', 'fuel_logs', 'maintenance_records', 'loans', 'loan_payments',
        'trips', 'devices', 'telemetry_samples', 'gps_track_points'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            EXECUTE format('DROP POLICY IF EXISTS "fmms_full_access_%s" ON public.%I;', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow full access to %s" ON public.%I;', t, t);
            EXECUTE format('CREATE POLICY "fmms_full_access_%s" ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);', t, t);
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
