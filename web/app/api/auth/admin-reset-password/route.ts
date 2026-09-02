import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, newPassword, adminPin } = body;

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email và mật khẩu mới không được để trống' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    // 🔒 Verify Admin PIN 0075
    if (adminPin !== '0075') {
      return NextResponse.json({ error: 'Mã PIN Admin không chính xác (0075)' }, { status: 403 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // If SUPABASE_SERVICE_ROLE_KEY is provided, directly update user in Supabase Auth!
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find user by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return NextResponse.json({ error: `Lỗi truy vấn danh sách user: ${listError.message}` }, { status: 500 });
      }

      const target = users?.find(u => u.email?.toLowerCase() === cleanEmail);

      if (target) {
        // Direct password reset
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
          password: newPassword,
          email_confirm: true,
        });
        if (updateError) {
          return NextResponse.json({ error: `Lỗi cập nhật mật khẩu: ${updateError.message}` }, { status: 500 });
        }
      } else {
        // Create user with this password
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password: newPassword,
          email_confirm: true,
        });
        if (createError) {
          return NextResponse.json({ error: `Lỗi tạo tài khoản mới: ${createError.message}` }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'DIRECT_SET',
        message: `✅ Đã đặt trực tiếp mật khẩu mới cho ${cleanEmail} trong hệ thống Supabase!`,
      });
    }

    // Fallback if SERVICE_ROLE_KEY is not yet defined: send recovery email via Client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${request.nextUrl.origin}/login`,
    });

    if (resetError) {
      return NextResponse.json({
        success: true,
        mode: 'FALLBACK_CLIPBOARD',
        message: `Mật khẩu tạm "${newPassword}" đã được sao chép vào Clipboard (Gửi trực tiếp cho thành viên).`,
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'RECOVERY_LINK_SENT',
      message: `Đã gửi link khôi phục mật khẩu tới ${cleanEmail}.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Đã xảy ra lỗi máy chủ' }, { status: 500 });
  }
}
