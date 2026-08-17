import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

// System prompt for FMMS AI context
const SYSTEM_PROMPT = `Bạn là FMMS AI Assistant — trợ lý thông minh cho hệ thống quản lý phương tiện gia đình (Family Mobility Management System).

Nhiệm vụ của bạn:
- Phân tích dữ liệu phương tiện, nhiên liệu, bảo dưỡng và tài chính
- Trả lời bằng tiếng Việt, chính xác, ngắn gọn
- Khi có dữ liệu thực tế, hãy dùng nó. Khi không có, nói rõ "Chưa có dữ liệu"
- Không bịa số liệu cụ thể nếu không có trong context

Bạn có thể giúp: theo dõi chi phí, lịch bảo dưỡng, phân tích L/100km, dự báo chi phí, so sánh xe, lên kế hoạch bảo dưỡng.`;

async function buildContext(supabase: any): Promise<string> {
  try {
    const [assetsRes, fuelRes, maintRes, expenseRes] = await Promise.all([
      supabase.from('assets').select('name, brand, model, year, current_odometer_km, status, fuel_type').limit(10),
      supabase.from('fuel_logs').select('asset_id, timestamp, fuel_liters, total_cost, odometer_km').order('timestamp', { ascending: false }).limit(20),
      supabase.from('maintenance_records').select('asset_id, maintenance_type, date, cost, next_due_km').order('date', { ascending: false }).limit(10),
      supabase.from('expenses').select('asset_id, date, category, amount').order('date', { ascending: false }).limit(20),
    ]);

    let context = 'DỮ LIỆU HIỆN TẠI TRONG HỆ THỐNG:\n\n';

    if (assetsRes.data?.length) {
      context += `PHƯƠNG TIỆN (${assetsRes.data.length} xe):\n`;
      assetsRes.data.forEach((a: any) => {
        context += `- ${a.name} (${a.brand} ${a.model} ${a.year}): ODO ${a.current_odometer_km?.toLocaleString() || 'N/A'} km, ${a.fuel_type || 'N/A'}, ${a.status}\n`;
      });
      context += '\n';
    } else {
      context += 'PHƯƠNG TIỆN: Chưa có dữ liệu\n\n';
    }

    if (fuelRes.data?.length) {
      const totalFuelCost = fuelRes.data.reduce((s: number, f: any) => s + (f.total_cost || 0), 0);
      const totalLiters = fuelRes.data.reduce((s: number, f: any) => s + (f.fuel_liters || 0), 0);
      context += `NHIÊN LIỆU (${fuelRes.data.length} lần đổ gần nhất): Tổng ${totalLiters.toFixed(1)}L, chi phí ${totalFuelCost.toLocaleString('vi-VN')}₫\n\n`;
    }

    if (maintRes.data?.length) {
      context += `BẢO DƯỠNG (${maintRes.data.length} bản ghi gần nhất):\n`;
      maintRes.data.slice(0, 3).forEach((m: any) => {
        context += `- ${m.maintenance_type} (${m.date}): ${m.cost?.toLocaleString('vi-VN')}₫\n`;
      });
      context += '\n';
    }

    if (expenseRes.data?.length) {
      const total = expenseRes.data.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      context += `CHI PHÍ GẦN ĐÂY: Tổng ${total.toLocaleString('vi-VN')}₫ (${expenseRes.data.length} giao dịch)\n`;
    }

    return context;
  } catch {
    return 'Không thể tải dữ liệu từ DB để phân tích.';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require a logged-in session
    const supabase = await createServerSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, provider = 'chatgpt2api', assetId } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt là bắt buộc' }, { status: 400 });
    }

    // Build Supabase context using the authenticated SSR client (applies RLS)
    let contextText = '';
    try {
      contextText = await buildContext(supabase);
    } catch {
      contextText = '';
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + (contextText ? `\n\n${contextText}` : '') },
      { role: 'user', content: prompt },
    ];

    // Try ChatGPT2API / OpenAI-compatible gateway
    const c2aBaseUrl = process.env.C2A_BASE_URL;
    const c2aApiKey = process.env.C2A_API_KEY;
    const c2aDefaultModel = process.env.C2A_DEFAULT_MODEL || 'chatgpt/auto';

    if (c2aBaseUrl && c2aApiKey) {
      try {
        const res = await fetch(`${c2aBaseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${c2aApiKey}`,
          },
          body: JSON.stringify({
            model: c2aDefaultModel,
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content || 'AI không trả lời được.';
          return NextResponse.json({
            reply,
            providerUsed: `ChatGPT2API (${c2aDefaultModel})`,
            hasRealData: !!contextText,
            timestamp: new Date().toISOString(),
          });
        }

        const errText = await res.text();
        console.error('[AI Chat] ChatGPT2API error:', res.status, errText);
      } catch (err) {
        console.error('[AI Chat] ChatGPT2API fetch failed:', err);
      }
    }

    // Fallback: Try GEMINI_API_KEY via Google AI
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiMessages = messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : m.role === 'system' ? 'user' : 'user',
          parts: [{ text: m.role === 'system' ? `[System]: ${m.content}` : m.content }],
        }));

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: geminiMessages }),
            signal: AbortSignal.timeout(20000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini không phản hồi.';
          return NextResponse.json({
            reply,
            providerUsed: 'Gemini Flash 1.5',
            hasRealData: !!contextText,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('[AI Chat] Gemini fallback failed:', err);
      }
    }

    // Final fallback: Informative demo response
    return NextResponse.json({
      reply: `⚠️ **AI Gateway chưa được cấu hình.**\n\nĐể kích hoạt AI thật, vào **Cài đặt → Cấu hình AI** và nhập:\n- **ChatGPT2API**: Base URL + API Key + Model\n- Hoặc **Gemini API Key**\n\n${contextText ? `📊 *Dữ liệu đã sẵn sàng từ Supabase để phân tích khi AI được kết nối.*` : ''}`,
      providerUsed: 'Fallback (no provider configured)',
      hasRealData: !!contextText,
      needsConfig: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
