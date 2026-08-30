import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { providerId, apiKey, baseUrl, model, endpoint, headers: customHeaders } = body;

    const key = apiKey || (providerId === 'gemini' ? process.env.GEMINI_API_KEY : providerId === 'chatgpt2api' ? process.env.C2A_API_KEY : process.env.OPENAI_API_KEY);
    const url = baseUrl || (providerId === 'gemini' ? 'https://generativelanguage.googleapis.com' : providerId === 'deepseek' ? 'https://api.deepseek.com' : providerId === 'claude' ? 'https://api.anthropic.com' : providerId === 'chatgpt2api' ? process.env.C2A_BASE_URL : 'https://api.openai.com');

    // 1. Google Gemini Test
    if (providerId === 'gemini' || (endpoint && endpoint.includes('googleapis.com'))) {
      if (!key) {
        return NextResponse.json({ ok: false, message: 'Chưa nhập Gemini API Key' });
      }

      const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(10000) });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const count = data?.models?.length || 0;
        return NextResponse.json({
          ok: true,
          provider: 'gemini',
          message: `Kết nối Google Gemini thành công! (${count} models sẵn sàng: 2.0 Flash, 1.5 Pro, ...)`,
        });
      }

      if (res.status === 400 || res.status === 403 || res.status === 401) {
        return NextResponse.json({ ok: false, message: 'API Key không hợp lệ hoặc bị từ chối bởi Google AI Studio' });
      }
      if (res.status === 429) {
        return NextResponse.json({ ok: false, message: 'API Key đã vượt quá hạn mức truy vấn (Rate limit)' });
      }
      return NextResponse.json({ ok: false, message: `Lỗi kết nối Gemini (HTTP ${res.status}: ${res.statusText})` });
    }

    // 2. Anthropic Claude Test
    if (providerId === 'claude') {
      if (!key) {
        return NextResponse.json({ ok: false, message: 'Chưa nhập Anthropic API Key' });
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        return NextResponse.json({ ok: true, provider: 'claude', message: 'Kết nối Anthropic Claude thành công!' });
      }
      if (res.status === 401) {
        return NextResponse.json({ ok: false, message: 'Anthropic API Key không chính xác' });
      }
      return NextResponse.json({ ok: false, message: `Lỗi kết nối Claude (HTTP ${res.status}: ${res.statusText})` });
    }

    // 3. OpenAI / DeepSeek / ChatGPT2API / Custom OpenAI-compatible Gateway
    if (!url) {
      return NextResponse.json({ ok: false, message: 'Thiếu Base URL' });
    }
    if (!key && providerId !== 'chatgpt2api') {
      return NextResponse.json({ ok: false, message: 'Chưa nhập API Key / Auth Key' });
    }

    const testEndpoint = `${url.replace(/\/+$/, '')}/v1/models`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(customHeaders || {}),
    };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const res = await fetch(testEndpoint, { headers, signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const count = data?.data?.length || data?.models?.length || 0;
      return NextResponse.json({
        ok: true,
        provider: providerId,
        message: `Kết nối thành công! (${count > 0 ? `${count} models` : 'Gateway sẵn sàng'})`,
      });
    }

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ ok: false, message: 'API Key / Token không đúng hoặc không có quyền truy cập' });
    }
    if (res.status === 404) {
      return NextResponse.json({ ok: false, message: `Không tìm thấy endpoint ${testEndpoint}. Vui lòng kiểm tra lại Base URL` });
    }
    return NextResponse.json({ ok: false, message: `HTTP ${res.status} — ${res.statusText}` });

  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('timeout');
    const msg = isTimeout ? 'Timeout — Server hoặc Tunnel không phản hồi trong 10 giây' : (err?.message || 'Lỗi mạng');
    return NextResponse.json({ ok: false, message: msg });
  }
}
