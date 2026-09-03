-- ==============================================================================
-- FMMS: BỔ SUNG CỘT CHO BẢNG BẢO HIỂM (INSURANCE_POLICIES) VÀ PHƯƠNG TIỆN (ASSETS)
-- KHẮC PHỤC LỖI: Could not find the 'agent_name' column of 'insurance_policies'
-- AN TOÀN TUYỆT ĐỐI: KHÔNG MẤT DỮ LIỆU CŨ, DÙNG IF NOT EXISTS
-- ==============================================================================

-- 1. Bổ sung các cột thông tin liên hệ cho bảng insurance_policies
ALTER TABLE IF EXISTS public.insurance_policies 
  ADD COLUMN IF NOT EXISTS agent_name TEXT,
  ADD COLUMN IF NOT EXISTS agent_phone TEXT,
  ADD COLUMN IF NOT EXISTS provider_hotline TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Bổ sung các cột đăng kiểm & bảo dưỡng cho bảng assets
ALTER TABLE IF EXISTS public.assets 
  ADD COLUMN IF NOT EXISTS next_maintenance_due DATE,
  ADD COLUMN IF NOT EXISTS registration_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Đảm bảo phân quyền truy cập đầy đủ
GRANT ALL ON public.insurance_policies TO anon, authenticated, service_role;
GRANT ALL ON public.assets TO anon, authenticated, service_role;

-- 4. Tải lại bộ nhớ đệm PostgREST API
NOTIFY pgrst, 'reload schema';
