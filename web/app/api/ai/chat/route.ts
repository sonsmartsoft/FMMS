import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const DEFAULT_SYSTEM_PROMPT = `Bạn là Cố Vấn Tài Chính & Vận Hành Phương Tiện Gia Đình (FMMS Senior Advisor).

QUY TẮC TRÌNH BÀY VÀ ĐỊNH DẠNG (BẮT BUỘC):
1. TRÌNH BÀY CÓ CẤU TRÚC RÕ RÀNG:
   - Dùng bảng Markdown chuẩn (| Hạng mục | Chi phí | Ghi chú |) khi liệt kê từ 2 số liệu trở lên.
   - In đậm toàn bộ số tiền và mốc ODO (VD: **820.000 ₫**, **12.500 km**).
   - Chia câu trả lời thành các phần rõ rệt:
     📌 **Tóm tắt nhanh**
     📊 **Chi tiết số liệu** (bảng biểu)
     💡 **Khuyến nghị & Lời khuyên tối ưu**
2. PHONG CÁCH & NGÔN NGỮ:
   - Tiếng Việt chuẩn mực, thông minh, gãy gọn, xưng "Tôi" và gọi người dùng là "Bạn".
   - Luôn dựa trên số liệu thực tế được cung cấp trong hệ thống, không tự bịa số liệu.`;

async function buildContext(supabase: any, assetId?: string): Promise<string> {
  try {
    let assetQuery = supabase.from('assets').select('id, name, brand, model, year, license_plate, current_odometer_km, status, fuel_type, purchase_price, current_value, next_maintenance_due');
    let fuelQuery = supabase.from('fuel_logs').select('asset_id, timestamp, fuel_liters, total_cost, odometer_km, fuel_type, price_per_liter').order('timestamp', { ascending: false }).limit(25);
    let maintQuery = supabase.from('maintenance_records').select('asset_id, maintenance_type, date, cost, odometer_km, next_due_km, description').order('date', { ascending: false }).limit(15);
    let expenseQuery = supabase.from('expenses').select('asset_id, date, category, amount, description').order('date', { ascending: false }).limit(30);
    let loanQuery = supabase.from('loans').select('id, asset_id, lender, principal, current_balance, interest_rate_percent, term_months, start_date');

    if (assetId) {
      assetQuery = assetQuery.eq('id', assetId);
      fuelQuery = fuelQuery.eq('asset_id', assetId);
      maintQuery = maintQuery.eq('asset_id', assetId);
      expenseQuery = expenseQuery.eq('asset_id', assetId);
      loanQuery = loanQuery.eq('asset_id', assetId);
    }

    const [assetsRes, fuelRes, maintRes, expenseRes, loanRes] = await Promise.all([
      assetQuery.limit(10),
      fuelQuery,
      maintQuery,
      expenseQuery,
      loanQuery.limit(5),
    ]);

    let context = '📊 DỮ LIỆU HIỆN TẠI TRONG HỆ THỐNG FMMS:\n\n';

    if (assetsRes.data?.length) {
      context += `🚘 PHƯƠNG TIỆN (${assetsRes.data.length} xe):\n`;
      assetsRes.data.forEach((a: any) => {
        const odo = a.current_odometer_km ? `${a.current_odometer_km.toLocaleString('vi-VN')} km` : 'Chưa có ODO';
        context += `- ${a.name} (Biển: ${a.license_plate || '—'}, Đời: ${a.year || '—'}, ODO: ${odo}, Nhiên liệu: ${a.fuel_type || 'Xăng'}, Giá mua: ${a.purchase_price ? `${(a.purchase_price / 1_000_000).toFixed(0)}M` : '—'}, Bảo dưỡng tiếp theo: ${a.next_maintenance_due || 'OK'})\n`;
      });
      context += '\n';
    }

    if (fuelRes.data?.length) {
      const totalFuelCost = fuelRes.data.reduce((s: number, f: any) => s + (f.total_cost || 0), 0);
      const totalLiters = fuelRes.data.reduce((s: number, f: any) => s + (f.fuel_liters || 0), 0);
      context += `⛽ NHIÊN LIỆU (${fuelRes.data.length} lần gần nhất): Tổng ${totalLiters.toFixed(1)}L, Tổng tiền: ${totalFuelCost.toLocaleString('vi-VN')}₫\n`;
      fuelRes.data.slice(0, 5).forEach((f: any) => {
        context += `  + ${f.timestamp?.slice(0, 10)}: ${f.fuel_liters}L, ${f.total_cost?.toLocaleString('vi-VN')}₫ (ODO: ${f.odometer_km?.toLocaleString('vi-VN') || '—'})\n`;
      });
      context += '\n';
    }

    if (maintRes.data?.length) {
      const totalMaint = maintRes.data.reduce((s: number, m: any) => s + (m.cost || 0), 0);
      context += `🔧 BẢO DƯỠNG (${maintRes.data.length} lần gần nhất - Tổng ${totalMaint.toLocaleString('vi-VN')}₫):\n`;
      maintRes.data.slice(0, 5).forEach((m: any) => {
        context += `  + ${m.date}: ${m.maintenance_type} (${m.cost?.toLocaleString('vi-VN')}₫) - ODO: ${m.odometer_km || '—'}, Dự kiến tiếp theo: ${m.next_due_km || '—'}\n`;
      });
      context += '\n';
    }

    if (expenseRes.data?.length) {
      const totalExp = expenseRes.data.reduce((s: number, e: any) => s + (e.amount || 0), 0);
      context += `💳 CHI PHÍ PHÁT SINH (${expenseRes.data.length} giao dịch - Tổng ${totalExp.toLocaleString('vi-VN')}₫):\n`;
      expenseRes.data.slice(0, 5).forEach((e: any) => {
        context += `  + ${e.date}: ${e.category} - ${e.description || ''} (${e.amount?.toLocaleString('vi-VN')}₫)\n`;
      });
      context += '\n';
    }

    if (loanRes.data?.length) {
      context += `🏦 KHOẢN VAY MUA XE (${loanRes.data.length} hợp đồng):\n`;
      loanRes.data.forEach((l: any) => {
        context += `  + Ngân hàng: ${l.lender}, Gốc: ${l.principal?.toLocaleString('vi-VN')}₫, Dư nợ còn: ${l.current_balance?.toLocaleString('vi-VN')}₫, Lãi suất: ${l.interest_rate_percent}%/năm\n`;
      });
      context += '\n';
    }

    return context;
  } catch (err) {
    console.error('[AI Chat] Error building context:', err);
    return 'Không thể tải dữ liệu tự động từ Supabase.';
  }
}

async function callGemini(model: string, apiKey: string, promptText: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  const contents = [
    { role: 'user', parts: [{ text: promptText }] },
  ];

  const cleanModel = model.replace(/^models\//, '');

  const tryEndpoint = async (apiVersion: string, modelName: string) => {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: AbortSignal.timeout(30000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { ok: true, text: reply };
      }
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      return { ok: false, error: errMsg };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'Network error' };
    }
  };

  // 1. Try requested model on v1beta then v1
  let res = await tryEndpoint('v1beta', cleanModel);
  if (res.ok) return res;

  res = await tryEndpoint('v1', cleanModel);
  if (res.ok) return res;

  // 2. Cascade through list of all popular models (newest first)
  const candidateModels = [
    'gemini-3.6-flash',
    'gemini-3.0-pro',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  for (const cand of candidateModels) {
    if (cand === cleanModel) continue;
    res = await tryEndpoint('v1beta', cand);
    if (res.ok) return res;
    res = await tryEndpoint('v1', cand);
    if (res.ok) return res;
  }

  // 3. Auto-discover available models directly from the API Key
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const available = (listData.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name?.replace(/^models\//, ''));
      for (const avModel of available) {
        res = await tryEndpoint('v1beta', avModel);
        if (res.ok) return res;
      }
    }
  } catch {}

  return res;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await req.json().catch(() => ({}));
    const {
      prompt,
      provider = 'gemini',
      model,
      systemPrompt: userCustomPrompt,
      apiKey: clientApiKey,
      baseUrl: clientBaseUrl,
      assetId,
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt là bắt buộc' }, { status: 400 });
    }

    // Build context
    let contextText = '';
    try {
      contextText = await buildContext(supabase, assetId);
    } catch {
      contextText = '';
    }

    const activeSystemPrompt = userCustomPrompt || DEFAULT_SYSTEM_PROMPT;
    const fullPrompt = `[HỆ THỐNG VAI TRÒ & QUY TẮC PHÂN TÍCH]:\n${activeSystemPrompt}\n\n[DỮ LIỆU THỰC TẾ TRONG HỆ THỐNG]:\n${contextText}\n\n[CÂU HỎI CỦA NGƯỜI DÙNG]:\n${prompt}`;

    // ─────────────────────────────────────────────────────────────
    // 1. GOOGLE GEMINI
    // ─────────────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const activeKey = clientApiKey || process.env.GEMINI_API_KEY;
      let activeModel = model || 'gemini-3.6-flash';

      if (!activeKey) {
        return NextResponse.json({
          reply: '⚠️ **Chưa cấu hình Gemini API Key.**\n\nVui lòng vào **Cài đặt → Cấu hình AI** để nhập API Key từ [Google AI Studio](https://aistudio.google.com/apikey) (Hoàn toàn miễn phí).',
          providerUsed: 'Gemini (Chưa có Key)',
          needsConfig: true,
        });
      }

      try {
        let result = await callGemini(activeModel, activeKey, fullPrompt);

        // Fallback cascade if requested model is deprecated / unavailable
        if (!result.ok && (result.error?.includes('not found') || result.error?.includes('404') || result.error?.includes('deprecated'))) {
          const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'].filter(m => m !== activeModel);
          for (const fbModel of fallbackModels) {
            const fbResult = await callGemini(fbModel, activeKey, fullPrompt);
            if (fbResult.ok) {
              result = fbResult;
              activeModel = fbModel;
              break;
            }
          }
        }

        if (result.ok && result.text) {
          return NextResponse.json({
            reply: result.text,
            providerUsed: `Google Gemini (${activeModel})`,
            hasRealData: !!contextText,
            timestamp: new Date().toISOString(),
          });
        }

        return NextResponse.json({
          reply: `⚠️ **Lỗi từ Google Gemini (${activeModel}):** ${result.error}\n\nVui lòng kiểm tra lại API Key trong Cài đặt AI.`,
          providerUsed: `Gemini (${activeModel})`,
          error: result.error,
        });
      } catch (err: any) {
        return NextResponse.json({
          reply: `⚠️ **Lỗi kết nối tới Gemini:** ${err?.message || 'Timeout'}`,
          providerUsed: `Gemini (${activeModel})`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 2. ANTHROPIC CLAUDE
    // ─────────────────────────────────────────────────────────────
    if (provider === 'claude') {
      const activeKey = clientApiKey || process.env.ANTHROPIC_API_KEY;
      const activeModel = model || 'claude-3-7-sonnet-20250219';

      if (!activeKey) {
        return NextResponse.json({
          reply: '⚠️ **Chưa cấu hình Anthropic Claude API Key.**\nVui lòng vào **Cài đặt → Cấu hình AI Providers** để nhập API Key.',
          providerUsed: 'Claude (Chưa có Key)',
          needsConfig: true,
        });
      }

      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': activeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: activeModel,
            max_tokens: 2048,
            system: activeSystemPrompt + (contextText ? `\n\n${contextText}` : ''),
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(35000),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.content?.[0]?.text || 'Claude không phản hồi.';
          return NextResponse.json({
            reply,
            providerUsed: `Anthropic Claude (${activeModel})`,
            hasRealData: !!contextText,
            timestamp: new Date().toISOString(),
          });
        }

        const errData = await res.json().catch(() => ({}));
        return NextResponse.json({
          reply: `⚠️ **Lỗi từ Claude (${activeModel}):** ${errData?.error?.message || res.statusText}`,
          providerUsed: `Claude (${activeModel})`,
        });
      } catch (err: any) {
        return NextResponse.json({
          reply: `⚠️ **Lỗi kết nối Claude:** ${err?.message}`,
          providerUsed: `Claude (${activeModel})`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. OPENAI / DEEPSEEK / CHATGPT2API / CUSTOM GATEWAY (OpenAI format)
    // ─────────────────────────────────────────────────────────────
    let defaultBase = 'https://api.openai.com';
    let defaultKey = process.env.OPENAI_API_KEY;
    let defaultMdl = 'gpt-4o-mini';

    if (provider === 'deepseek') {
      defaultBase = 'https://api.deepseek.com';
      defaultKey = process.env.DEEPSEEK_API_KEY;
      defaultMdl = 'deepseek-chat';
    } else if (provider === 'chatgpt2api') {
      defaultBase = process.env.C2A_BASE_URL || '';
      defaultKey = process.env.C2A_API_KEY;
      defaultMdl = process.env.C2A_DEFAULT_MODEL || 'chatgpt/auto';
    }

    const activeBaseUrl = (clientBaseUrl || defaultBase).replace(/\/+$/, '');
    const activeKey = clientApiKey || defaultKey;
    const activeModel = model || defaultMdl;

    if (!activeBaseUrl || (!activeKey && provider !== 'chatgpt2api')) {
      return NextResponse.json({
        reply: `⚠️ **Chưa cấu hình API cho ${provider.toUpperCase()}.**\n\nVui lòng vào mục **Cài đặt → Cấu hình AI Providers** để nhập Base URL và API Key.`,
        providerUsed: provider,
        needsConfig: true,
      });
    }

    try {
      const messages = [
        { role: 'system', content: activeSystemPrompt + (contextText ? `\n\n${contextText}` : '') },
        { role: 'user', content: prompt },
      ];

      const res = await fetch(`${activeBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeKey ? { 'Authorization': `Bearer ${activeKey}` } : {}),
        },
        body: JSON.stringify({
          model: activeModel,
          messages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || 'AI không trả lời được.';
        return NextResponse.json({
          reply,
          providerUsed: `${provider.toUpperCase()} (${activeModel})`,
          hasRealData: !!contextText,
          timestamp: new Date().toISOString(),
        });
      }

      const errText = await res.text();
      let parsedErr: any = null;
      try { parsedErr = JSON.parse(errText); } catch {}
      const msg = parsedErr?.error?.message || errText || res.statusText;

      return NextResponse.json({
        reply: `⚠️ **Lỗi từ ${provider.toUpperCase()} (${activeModel}):**\n${msg}`,
        providerUsed: `${provider.toUpperCase()} (${activeModel})`,
        error: msg,
      });
    } catch (err: any) {
      return NextResponse.json({
        reply: `⚠️ **Lỗi kết nối tới ${activeBaseUrl}:** ${err?.message || 'Timeout'}`,
        providerUsed: provider,
      });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
