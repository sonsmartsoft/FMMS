-- ========================================================
-- DIRECT ADMIN RESET PASSWORD RPC FUNCTION (NO EMAIL REQUIRED)
-- Run this in Supabase SQL Editor to enable instant password reset using Master Admin PIN (0075)
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
    p_email text,
    p_new_password text,
    p_admin_pin text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- 🔒 Verify Master Admin PIN
    IF p_admin_pin != '0075' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mã PIN Quản trị viên không chính xác (0075)');
    END IF;

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mật khẩu phải có ít nhất 6 ký tự');
    END IF;

    -- Find user in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email));

    IF v_user_id IS NULL THEN
        -- Create user if not exists
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
            confirmation_token
        ) VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            lower(trim(p_email)),
            crypt(p_new_password, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('full_name', p_email),
            now(),
            now(),
            'authenticated',
            'authenticated',
            ''
        );

        -- Also create public profile
        INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
        VALUES (v_user_id, lower(trim(p_email)), lower(trim(p_email)), now(), now())
        ON CONFLICT (id) DO NOTHING;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Đã khởi tạo tài khoản mới và đặt mật khẩu thành công!'
        );
    ELSE
        -- Update existing user password
        UPDATE auth.users
        SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
            updated_at = now(),
            email_confirmed_at = COALESCE(email_confirmed_at, now())
        WHERE id = v_user_id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'Đã cập nhật mật khẩu mới thành công!'
        );
    END IF;
END;
$$;

-- Grant execution to public / anon / authenticated / service_role
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(text, text, text) TO anon, authenticated, service_role;
