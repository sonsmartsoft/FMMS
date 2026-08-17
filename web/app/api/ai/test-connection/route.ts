import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

function testModelEndpoint(endpoint: string, headers: Record<string, string>, body?: string): Promise<Response> {
  return fetch(endpoint, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    ...(body ? { body } : {}),
    signal: AbortSignal.timeout(10000),
  });
}

export async function POST(req: NextRequest) {
  try {
    // Require a logged-in session
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ ok: false, message: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { provider, endpoint, headers: customHeaders, providerId, apiKey } = await req.json();

    // Mode 1: settings/health sends `provider` — test the real configured provider from server env
    if (provider && !endpoint) {
      if (provider === 'gemini') {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return NextResponse.json({ ok: false, provider, message: 'GEMINI_API_KEY chưa được cấu hình trong .env' });
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ ok: true, provider, model: data?.models?.[0]?.name || 'gemini', message: `Kết nối Gemini thành công! (${data?.models?.length || 0} models)` });
        }
        return NextResponse.json({ ok: false, provider, message: `HTTP ${res.status} — ${res.statusText}` });
      }

      if (provider === 'chatgpt2api') {
        const baseUrl = process.env.C2A_BASE_URL;
        const key = process.env.C2A_API_KEY;
        if (!baseUrl || !key) return NextResponse.json({ ok: false, provider, message: 'C2A_BASE_URL / C2A_API_KEY chưa được cấu hình trong .env' });
        const res = await fetch(`${baseUrl}/v1/models`, {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({ ok: true, provider, model: (data?.data?.[0]?.id) || 'chatgpt2api', message: `Kết nối ChatGPT2API thành công! (${data?.data?.length || 0} models)` });
        }
        return NextResponse.json({ ok: false, provider, message: `HTTP ${res.status} — ${res.statusText}` });
      }

      return NextResponse.json({ ok: false, provider, message: `Provider không hỗ trợ: ${provider}` }, { status: 400 });
    }

    // Mode 2: settings/ai sends `endpoint` (+ optional providerId/apiKey) — direct test
    if (endpoint) {
      if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
        return NextResponse.json({ ok: false, message: 'Endpoint phải bắt đầu bằng http(s)://' }, { status: 400 });
      }
      const headers = { ...(customHeaders || {}) };
      if (apiKey && !headers.Authorization && providerId !== 'gemini') {
        headers.Authorization = `Bearer ${apiKey}`;
      }
      const res = await testModelEndpoint(endpoint, headers);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const modelCount = data?.data?.length || data?.models?.length || data?.object ? '✓' : '✓';
        return NextResponse.json({ ok: true, provider: providerId, message: `Kết nối thành công! ${modelCount} models available`, status: res.status });
      }
      return NextResponse.json({ ok: false, provider: providerId, message: `HTTP ${res.status} — ${res.statusText}` });
    }

    return NextResponse.json({ ok: false, message: 'Thiếu provider hoặc endpoint' }, { status: 400 });
  } catch (err: any) {
    const msg = err?.name === 'TimeoutError' ? 'Timeout — server không phản hồi trong 10s' : err?.message || 'Lỗi kết nối';
    return NextResponse.json({ ok: false, message: msg });
  }
}