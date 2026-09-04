-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0003: Master Data & System Taxonomies Persistent Table
-- ========================================================

CREATE TABLE IF NOT EXISTS public.master_data (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create full access policy for sync
ALTER TABLE public.master_data ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'master_data' AND policyname = 'Allow full access to master_data'
    ) THEN
        CREATE POLICY "Allow full access to master_data"
        ON public.master_data
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Seed initial master data if not exists
INSERT INTO public.master_data (key, data, updated_at)
VALUES 
    ('fmms_master_maint', '[
        "Thay dầu máy", "Thay lọc dầu / Lọc nhớt", "Thay lọc gió động cơ", "Thay lọc gió điều hòa",
        "Thay bugi đánh lửa", "Thay lốp xe", "Kiểm tra & Thay má phanh", "Thay ắc-quy", "Nước làm mát", "Thay dầu hộp số", "Sửa chữa & Khác"
    ]'::jsonb, NOW()),
    ('fmms_master_exp', '[
        "Mua xe & Lăn bánh ban đầu", "Nhiên liệu", "Bảo dưỡng & Sửa chữa", "Phí cầu đường (BOT)", "Gửi xe & Bãi đỗ",
        "Rửa xe & Chăm sóc", "Bảo hiểm vật chất", "Bảo hiểm TNDS", "Nâng cấp & Phụ kiện", "Phạt vi phạm", "Khác"
    ]'::jsonb, NOW()),
    ('fmms_master_vendors', '[
        "Mazda Hà Đông", "Honda Tây Hồ", "Zestech Việt Nam", "Bảo hiểm Quân Đội (MIC)", "Bảo Việt Insurance", "PV OIL", "Petrolimex", "Garage Chuyên Nghiệp"
    ]'::jsonb, NOW()),
    ('fmms_master_banks', '[
        "Techcombank (TCB)", "VPBank", "VIB (Ngân hàng Quốc Tế)", "TPBank (Tiên Phong)",
        "Shinhan Bank Việt Nam", "Vietcombank (VCB)", "BIDV", "VietinBank",
        "MB Bank (Quân Đội)", "Sacombank", "ACB (Á Châu)", "HDBank", "MSB (Hàng Hải)", "Woori Bank / Standard Chartered / HSBC"
    ]'::jsonb, NOW())
ON CONFLICT (key) DO NOTHING;
