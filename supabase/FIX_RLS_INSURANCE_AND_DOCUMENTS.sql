-- ==============================================================================
-- FMMS: FIX RLS POLICY CHO BẢNG BẢO HIỂM (INSURANCE_POLICIES) VÀ GIẤY TỜ XE
-- KHẮC PHỤC LỖI: new row violates row-level security policy for table "insurance_policies"
-- CHO PHÉP CẢ ANON VÀ AUTHENTICATED TỰ DO LƯU TRỮ VÀ QUẢN LÝ BẢO HIỂM GIA ĐÌNH
-- ==============================================================================

-- 1. Bổ sung các cột mở rộng (nếu chưa có)
ALTER TABLE IF EXISTS public.insurance_policies 
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_phone TEXT,
  ADD COLUMN IF NOT EXISTS provider_hotline TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE IF EXISTS public.assets 
  ADD COLUMN IF NOT EXISTS next_maintenance_due DATE,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Cấp quyền cơ bản (GRANT) cho anon, authenticated và service_role
GRANT ALL ON public.insurance_policies TO anon, authenticated, service_role;
GRANT ALL ON public.registrations TO anon, authenticated, service_role;
GRANT ALL ON public.asset_documents TO anon, authenticated, service_role;
GRANT ALL ON public.assets TO anon, authenticated, service_role;

-- 3. Xóa các policy RLS cũ đang chặn ghi dữ liệu
DROP POLICY IF EXISTS "insurance_via_asset" ON public.insurance_policies;
DROP POLICY IF EXISTS "Owners can manage insurance" ON public.insurance_policies;
DROP POLICY IF EXISTS "Allow all authenticated family insurance" ON public.insurance_policies;
DROP POLICY IF EXISTS "Allow full access to insurance_policies" ON public.insurance_policies;

DROP POLICY IF EXISTS "registrations_via_asset" ON public.registrations;
DROP POLICY IF EXISTS "Owners can manage registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow all authenticated family registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow full access to registrations" ON public.registrations;

DROP POLICY IF EXISTS "documents_via_asset" ON public.asset_documents;
DROP POLICY IF EXISTS "Owners can manage documents" ON public.asset_documents;
DROP POLICY IF EXISTS "Allow all authenticated family documents" ON public.asset_documents;
DROP POLICY IF EXISTS "Allow full access to asset_documents" ON public.asset_documents;

-- 4. Tạo Policy toàn quyền cho Gia đình (anon + authenticated)
CREATE POLICY "Allow full access to insurance_policies" ON public.insurance_policies
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow full access to registrations" ON public.registrations
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow full access to asset_documents" ON public.asset_documents
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Reload cache PostgREST API
NOTIFY pgrst, 'reload schema';
