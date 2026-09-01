'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isEmailAllowed } from '@/lib/services/authWhitelistService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // 🔒 Security Check: Whitelist Enforcement
    if (!isEmailAllowed(email)) {
      setError(`🚫 Email "${email}" không nằm trong danh sách thành viên gia đình được cấp quyền truy cập. Vui lòng liên hệ Quản trị viên (Admin).`);
      setLoading(false);
      return;
    }

    try {
      if (isMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim().toLowerCase(),
          options: {
            emailRedirectTo: `${window.location.origin}/api/auth/callback`,
            shouldCreateUser: false, // Prevent creating random new accounts
          },
        });
        if (error) throw error;
        setSuccessMsg(`✅ Đã gửi liên kết đăng nhập tới ${email}. Vui lòng kiểm tra hộp thư đến (hoặc thư rác).`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra trong quá trình đăng nhập. Vui lòng kiểm tra lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Vui lòng nhập địa chỉ Email của bạn để nhận liên kết khôi phục mật khẩu.');
      return;
    }

    if (!isEmailAllowed(email)) {
      setError(`🚫 Email "${email}" không nằm trong danh sách thành viên được cấp quyền.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setSuccessMsg(`✅ Đã gửi email hướng dẫn đặt lại mật khẩu tới ${email}.`);
    } catch (err: any) {
      setError(err.message || 'Không thể gửi email khôi phục. Vui lòng liên hệ Quản trị viên.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--bg-secondary, #1f2937) 0%, var(--bg-primary, #111827) 100%)',
      padding: '1rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2.5rem',
        borderRadius: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        color: 'var(--text-primary, #ffffff)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--btn-primary-bg, #3b82f6)',
            borderRadius: '12px',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            letterSpacing: '0.05em',
            marginBottom: '0.5rem',
            color: 'var(--text-primary, #ffffff)'
          }}>
            FAMILY MOBILITY
          </h1>
          <p style={{ color: 'var(--text-secondary, #9ca3af)', fontSize: '0.875rem' }}>
            Hệ thống Quản lý Di chuyển Gia đình
          </p>
        </div>

        {successMsg && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {successMsg}
          </div>
        )}

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1.5rem',
            borderRadius: '8px',
            background: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--error-border, rgba(239, 68, 68, 0.2))',
            color: 'var(--error-text, #f87171)',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-primary, #e5e7eb)' }}>
              Email thành viên
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                background: 'var(--input-bg, rgba(0,0,0,0.2))',
                color: 'var(--text-primary, #ffffff)',
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              placeholder="nhap@email.com"
            />
          </div>

          {!isMagicLink && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-primary, #e5e7eb)' }}>
                  Mật khẩu
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan, #06b6d4)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  background: 'var(--input-bg, rgba(0,0,0,0.2))',
                  color: 'var(--text-primary, #ffffff)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.875rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--btn-primary-bg, #3b82f6)',
              color: 'var(--btn-primary-text, #ffffff)',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
            }}
          >
            {loading ? 'Đang xử lý...' : (isMagicLink ? 'Gửi liên kết đăng nhập qua Email' : 'Đăng nhập')}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <button
            onClick={() => setIsMagicLink(!isMagicLink)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #9ca3af)',
              cursor: 'pointer',
              textDecoration: 'underline',
              display: 'inline-block'
            }}
          >
            {isMagicLink ? 'Đăng nhập bằng mật khẩu' : 'Đăng nhập bằng Magic Link (Gửi vào Gmail)'}
          </button>
          
          <div style={{ marginTop: '1.25rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
            🔒 <strong>Bảo mật nội bộ gia đình:</strong> Chỉ các email được Quản trị viên cấp phép mới có thể nhận liên kết hoặc đăng nhập.
          </div>
        </div>
      </div>
    </div>
  );
}
