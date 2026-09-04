-- ========================================================
-- FAMILY MOBILITY MANAGEMENT SYSTEM (FMMS)
-- Migration 0002: User Members & Roles Persistent Table
-- ========================================================

CREATE TABLE IF NOT EXISTS public.user_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    assigned_asset_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and create full access policy for sync
ALTER TABLE public.user_members ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_members' AND policyname = 'Allow full access to user_members'
    ) THEN
        CREATE POLICY "Allow full access to user_members"
        ON public.user_members
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- Insert initial default users if not already present
INSERT INTO public.user_members (id, name, email, phone, role, status, assigned_asset_ids, created_at)
VALUES 
    ('usr-1', 'Nguyễn Trung Sơn', 'son.nt@utivina.com', '0901234567', 'ADMIN', 'ACTIVE', '[]'::jsonb, '2026-01-01T00:00:00.000Z'),
    ('usr-2', 'Nguyễn Trung Sơn (Gmail)', 'sondtk5@gmail.com', '0988888888', 'ADMIN', 'ACTIVE', '[]'::jsonb, '2026-01-15T00:00:00.000Z'),
    ('usr-smartsoft', 'Nguyễn Trung Sơn (SmartSoft)', 'son.smartsoft@gmail.com', '0901234567', 'ADMIN', 'ACTIVE', '[]'::jsonb, '2026-01-16T00:00:00.000Z'),
    ('usr-3', 'Trần Văn A (Thành viên)', 'thanhvien@utivina.com', '0912345678', 'MEMBER', 'ACTIVE', '[]'::jsonb, '2026-02-10T00:00:00.000Z')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role,
    updated_at = NOW();
