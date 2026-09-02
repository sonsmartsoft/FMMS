-- ========================================================
-- CLEAN & REPAIR SUPABASE AUTH
-- Run this in Supabase SQL Editor
-- ========================================================

-- 1. Dọn dẹp bản ghi bị lỗi do SQL thủ công để Supabase GoTrue tự tạo sạch sẽ
DELETE FROM auth.identities WHERE lower(email) IN ('sondtk5@gmail.com', 'son.smartsoft@gmail.com');
DELETE FROM auth.users WHERE lower(email) IN ('sondtk5@gmail.com', 'son.smartsoft@gmail.com');

-- 2. Trigger tự động xác nhận email tức thì 100% không cần đợi SMTP/Email
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    NEW.email_confirmed_at := now();
    NEW.confirmed_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user();
