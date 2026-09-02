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

    // METHOD 1: Try Direct PostgreSQL RPC Function (Instant & Bypasses All SMTP Rate Limits)
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    try {
      const { data: rpcData, error: rpcError } = await supabaseClient.rpc('admin_reset_user_password', {
        p_email: cleanEmail,
        p_new_password: newPassword,
        p_admin_pin: adminPin,
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          return NextResponse.json({
            success: true,
            mode: 'DIRECT_SET_RPC',
            message: rpcData.message || `Đã đặt trực tiếp mật khẩu mới cho ${cleanEmail}!`,
          });
        } else if (rpcData.error) {
          return NextResponse.json({ error: rpcData.error }, { status: 400 });
        }
      }
    } catch (rpcErr) {
      console.warn('RPC admin_reset_user_password error:', rpcErr);
    }

    // METHOD 2: If SUPABASE_SERVICE_ROLE_KEY is provided, use Admin API
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users) {
        const target = users.find(u => u.email?.toLowerCase() === cleanEmail);
        if (target) {
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
            password: newPassword,
            email_confirm: true,
          });
          if (!updateError) {
            return NextResponse.json({
              success: true,
              mode: 'DIRECT_SET_ADMIN',
              message: `Đã cập nhật trực tiếp mật khẩu mới cho ${cleanEmail}!`,
            });
          }
        } else {
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: newPassword,
            email_confirm: true,
          });
          if (!createError) {
            return NextResponse.json({
              success: true,
              mode: 'DIRECT_SET_ADMIN',
              message: `Đã khởi tạo tài khoản và đặt mật khẩu mới cho ${cleanEmail}!`,
            });
          }
        }
      }
    }

    // METHOD 3: Fallback try sending recovery email
    const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${request.nextUrl.origin}/login`,
    });

    if (resetError) {
      return NextResponse.json({
        error: `Supabase giới hạn gửi email (${resetError.message}). Hãy chạy file SQL RPC trong Supabase SQL Editor để bật đổi mật khẩu tức thì.`,
      }, { status: 400 });
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
