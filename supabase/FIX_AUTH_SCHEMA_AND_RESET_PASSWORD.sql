-- ========================================================
-- FIX SUPABASE AUTH SCHEMA & DIRECT PASSWORD RESET
-- Paste and Run this in Supabase SQL Editor to fix "Database error querying schema"
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Fix missing identities for existing users in auth.users
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
SELECT
    u.id,
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', lower(u.email)),
    'email',
    lower(u.email),
    now(),
    now(),
    now()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
)
ON CONFLICT DO NOTHING;

-- 2. Ensure all users have email confirmed and proper metadata
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
    role = 'authenticated',
    aud = 'authenticated',
    is_super_admin = COALESCE(is_super_admin, false),
    is_sso_user = COALESCE(is_sso_user, false);

-- 3. Comprehensive admin_reset_user_password Function
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_email text,
    p_new_password text,
    p_admin_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = auth, public, extensions, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_clean_email text;
BEGIN
    -- 🔒 Verify Master Admin PIN
    IF p_admin_pin != '0075' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mã PIN Quản trị viên không chính xác (0075)');
    END IF;

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mật khẩu phải có ít nhất 6 ký tự');
    END IF;

    v_clean_email := lower(trim(p_email));

    -- Find user in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_clean_email LIMIT 1;

    IF v_user_id IS NULL THEN
        -- Create new user
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            is_super_admin,
            is_sso_user
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            v_clean_email,
            extensions.crypt(p_new_password, extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', v_clean_email),
            now(),
            now(),
            'authenticated',
            'authenticated',
            '',
            '',
            '',
            '',
            false,
            false
        );

        -- Insert matching identity record
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
            'email',
            v_clean_email,
            now(),
            now(),
            now()
        ) ON CONFLICT DO NOTHING;

        -- Create public profile
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (v_user_id, v_clean_email, v_clean_email, now(), now())
        ON CONFLICT (id) DO NOTHING;

        RETURN jsonb_build_object('success', true, 'message', 'Đã khởi tạo tài khoản mới và đặt mật khẩu thành công!');
    ELSE
        -- Update password for existing user
        UPDATE auth.users
        SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
            updated_at = now(),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb),
            role = 'authenticated',
            aud = 'authenticated',
            banned_until = NULL,
            confirmation_token = '',
            recovery_token = ''
        WHERE id = v_user_id;

        -- Ensure identity exists
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email),
            'email',
            v_clean_email,
            now(),
            now(),
            now()
        ) ON CONFLICT (provider, provider_id) DO UPDATE
        SET updated_at = now(),
            identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email);

        RETURN jsonb_build_object('success', true, 'message', 'Đã cập nhật mật khẩu mới thành công!');
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(text, text, text) TO anon, authenticated, service_role;
