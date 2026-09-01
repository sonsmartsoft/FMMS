import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { REAL_AUGUST_TRIPS } from '@/lib/data/realTripsData';

const DEFAULT_SYSTEM_PROMPT = `Bạn là Cố Vấn Tài Chính & Vận Hành Phương Tiện Gia Đình (FMMS Senior AI Advisor).

QUY TẮC TRÌNH BÀY VÀ ĐỊNH DẠNG (BẮT BUỘC):
1. TRÌNH BÀY CÓ CẤU TRÚC RÕ RÀNG:
   - Dùng bảng Markdown chuẩn (| Hạng mục | Số liệu | Chi tiết |) khi liệt kê từ 2 số liệu trở lên.
   - In đậm toàn bộ số tiền và mốc ODO (VD: **820.000 ₫**, **2.858,2 km**, **400.000.000 ₫**).
   - Trả lời cụ thể, chính xác từng kỳ vay, từng lần đổ xăng, từng chuyến đi theo dữ liệu thực tế được cung cấp.
   - Chia câu trả lời thành các phần rõ rệt:
     📌 **Tóm tắt nhanh**
     📊 **Chi tiết số liệu thực tế** (bảng biểu chi tiết)
     💡 **Khuyến nghị & Lời khuyên tối ưu tài chính / vận hành**
2. PHONG CÁCH & NGÔN NGỮ:
   - Tiếng Việt chuẩn mực, thông minh, ân cần, xưng "Tôi" và gọi người dùng là "Bạn".
   - Luôn dựa trên số liệu thực tế được cung cấp trong hệ thống, không tự bịa số liệu. Nếu có câu hỏi về kỳ vay, bảo dưỡng, chi phí, hãy tra cứu trực tiếp trong dữ liệu hệ thống bên dưới để giải đáp chi tiết nhất.`;

async function buildContext(supabase: any, assetId?: string): Promise<string> {
  try {
    let assetQuery = supabase.from('assets').select('*');
    let fuelQuery = supabase.from('fuel_logs').select('*').order('date', { ascending: false }).limit(30);
    let maintQuery = supabase.from('maintenance_records').select('*').order('date', { ascending: false }).limit(20);
    let expenseQuery = supabase.from('expenses').select('*').order('date', { ascending: false }).limit(50);
    let loanQuery = supabase.from('loans').select('*');
    let loanPaymentsQuery = supabase.from('loan_payments').select('*').order('payment_number', { ascending: true });
    let partsQuery = supabase.from('parts').select('*').order('installation_date', { ascending: false }).limit(30);
    let insuranceQuery = supabase.from('insurance_policies').select('*').limit(10);
    let tripsQuery = supabase.from('trips').select('*').order('start_time', { ascending: false }).limit(30);

    if (assetId) {
      assetQuery = assetQuery.eq('id', assetId);
      fuelQuery = fuelQuery.eq('asset_id', assetId);
      maintQuery = maintQuery.eq('asset_id', assetId);
      expenseQuery = expenseQuery.eq('asset_id', assetId);
      loanQuery = loanQuery.eq('asset_id', assetId);
      partsQuery = partsQuery.eq('asset_id', assetId);
      insuranceQuery = insuranceQuery.eq('asset_id', assetId);
      tripsQuery = tripsQuery.eq('asset_id', assetId);
    }

    const [assetsRes, fuelRes, maintRes, expenseRes, loanRes, loanPayRes, partsRes, insRes, tripsRes] = await Promise.all([
      assetQuery.limit(10),
      fuelQuery,
      maintQuery,
      expenseQuery,
      loanQuery.limit(5),
      loanPaymentsQuery,
      partsQuery,
      insuranceQuery,
      tripsQuery,
    ]);

    let context = '📊 TOÀN BỘ CƠ SỞ DỮ LIỆU THỰC TẾ TRONG HỆ THỐNG FMMS:\n\n';

    // 1. Vehicles
    if (assetsRes.data?.length) {
      context += `🚘 DANH SÁCH PHƯƠNG TIỆN (${assetsRes.data.length} xe):\n`;
      assetsRes.data.forEach((a: any) => {
        const odo = a.current_odometer_km ? `${Number(a.current_odometer_km).toLocaleString('vi-VN')} km` : 'Chưa có ODO';
        context += `- **${a.name}** | ID: \`${a.id}\` | Biển số: **${a.license_plate || '—'}** | Đời: ${a.year || '—'} | Màu: ${a.color || '—'} | Động cơ: ${a.engine || '—'} | ODO Hiện Tại: **${odo}** | Giá mua: **${Number(a.purchase_price || 0).toLocaleString('vi-VN')} ₫** | Ngày mua: ${a.purchase_date || '—'} | Giá trị hiện tại: **${Number(a.current_value || 0).toLocaleString('vi-VN')} ₫** | Lịch bảo dưỡng tiếp theo: **${a.next_maintenance_due || 'Chưa lên lịch'}**\n`;
      });
      context += '\n';
    }

    // 2. Loans & Full 60-Month Amortization Schedule
    const loans = loanRes.data || [];
    const loanPayments = loanPayRes.data || [];
    if (loans.length > 0) {
      context += `🏦 THÔNG TIN KHOẢN VAY VÀ LỊCH THANH TOÁN 60 KỲ:\n`;
      loans.forEach((l: any) => {
        const principal = Number(l.principal) || 0;
        const downPayment = Number(l.down_payment) || 0;
        const rateYear = Number(l.interest_rate_percent) || 0;
        const termMonths = Number(l.term_months) || 60;
        const monthlyPay = Number(l.monthly_payment) || 0;
        const startDate = l.start_date || '2026-08-01';
        const paymentDay = l.payment_day || 15;

        context += `### Hợp đồng vay: ${l.lender || 'Ngân hàng'}\n`;
        context += `- Gốc vay: **${principal.toLocaleString('vi-VN')} ₫** | Trả trước: **${downPayment.toLocaleString('vi-VN')} ₫** | Lãi suất: **${rateYear}%/năm** | Thời hạn: **${termMonths} tháng** | Ngày bắt đầu: ${startDate} | Ngày đóng tiền hàng tháng: Ngày ${paymentDay} | Số tiền trả định kỳ: **${monthlyPay.toLocaleString('vi-VN')} ₫/tháng**\n\n`;

        // Generate full schedule for AI
        const rateMonth = rateYear / 100 / 12;
        let balance = principal;
        const payMap = new Map<number, any>();
        loanPayments.filter((p: any) => p.loan_id === l.id).forEach((p: any) => payMap.set(p.payment_number, p));

        context += `| Kỳ | Ngày đến hạn | Tiền Gốc (₫) | Tiền Lãi (₫) | Tổng trả (₫) | Dư nợ còn lại (₫) | Trạng thái |\n`;
        context += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

        for (let i = 1; i <= Math.min(termMonths, 60); i++) {
          const custom = payMap.get(i);
          let interest = Math.round(balance * rateMonth);
          let pPaid = Math.round(monthlyPay - interest);
          let total = monthlyPay;
          let dueStr = '';
          let status = 'Chưa thanh toán (PENDING)';

          if (custom) {
            dueStr = custom.due_date ? custom.due_date.slice(0, 10) : '';
            pPaid = Number(custom.principal_paid) || pPaid;
            interest = Number(custom.interest_paid) || interest;
            total = Number(custom.total_payment) || (pPaid + interest);
            status = custom.status === 'PAID' ? `Đã thanh toán (${custom.paid_date || '✓'})` : custom.status;
          }

          if (!dueStr) {
            const due = new Date(startDate);
            due.setMonth(due.getMonth() + i - 1);
            due.setDate(paymentDay);
            dueStr = due.toISOString().split('T')[0];
          }

          balance = Math.max(0, balance - pPaid);

          // Only list all paid + next 12 pending or full
          context += `| Kỳ ${i} | ${dueStr} | ${pPaid.toLocaleString('vi-VN')} | ${interest.toLocaleString('vi-VN')} | **${total.toLocaleString('vi-VN')}** | ${balance.toLocaleString('vi-VN')} | ${status} |\n`;
        }
        context += '\n';
      });
    }

    // 3. Fuel Logs
    const fuelLogs = fuelRes.data || [];
    if (fuelLogs.length > 0) {
      const totalFuelCost = fuelLogs.reduce((s: number, f: any) => s + (Number(f.total_cost) || 0), 0);
      const totalLiters = fuelLogs.reduce((s: number, f: any) => s + (Number(f.liters) || 0), 0);
      context += `⛽ LỊCH SỬ ĐỔ NHIÊN LIỆU (${fuelLogs.length} lần gần nhất | Tổng ${totalLiters.toFixed(1)}L | Tổng chi: **${totalFuelCost.toLocaleString('vi-VN')} ₫**):\n`;
      fuelLogs.slice(0, 15).forEach((f: any) => {
        context += `- Ngày ${f.date}: Đổ **${f.liters} L** xăng | Đơn giá: ${Number(f.price_per_liter || 0).toLocaleString('vi-VN')} ₫/L | Tổng tiền: **${Number(f.total_cost || 0).toLocaleString('vi-VN')} ₫** | ODO lúc đổ: **${Number(f.odometer_km || 0).toLocaleString('vi-VN')} km** | Cây xăng: ${f.station || '—'} ${f.notes ? `(${f.notes})` : ''}\n`;
      });
      context += '\n';
    }

    // 4. Maintenance Records
    const maints = maintRes.data || [];
    if (maints.length > 0) {
      const totalMaint = maints.reduce((s: number, m: any) => s + (Number(m.cost) || 0), 0);
      context += `🔧 LỊCH SỬ BẢO DƯỠNG & SỬA CHỮA (${maints.length} lần | Tổng chi: **${totalMaint.toLocaleString('vi-VN')} ₫**):\n`;
      maints.forEach((m: any) => {
        context += `- Ngày ${m.date}: **${m.maintenance_type}** | Chi phí: **${Number(m.cost || 0).toLocaleString('vi-VN')} ₫** | ODO: **${Number(m.odometer_km || 0).toLocaleString('vi-VN')} km** | Gara/Đơn vị: ${m.vendor || '—'} | Mốc bảo dưỡng tiếp theo: ${m.next_due_km ? `${m.next_due_km} km` : ''} ${m.next_due_date ? `(Ngày: ${m.next_due_date})` : ''} | Chi tiết: ${m.notes || m.description || '—'}\n`;
      });
      context += '\n';
    }

    // 5. Parts & Upgrades
    const parts = partsRes.data || [];
    if (parts.length > 0) {
      const totalParts = parts.reduce((s: number, p: any) => s + (Number(p.cost) || 0), 0);
      context += `🧰 DANH MỤC PHỤ TÙNG & ĐỒ CHƠI NÂNG CẤP XE (${parts.length} món | Tổng giá trị: **${totalParts.toLocaleString('vi-VN')} ₫**):\n`;
      parts.forEach((p: any) => {
        context += `- **${p.part_name}** | Hạng mục: ${p.category || p.supplier || 'Nâng cấp'} | Giá tiền: **${Number(p.cost || 0).toLocaleString('vi-VN')} ₫** | Ngày lắp: ${p.installation_date || '—'} | ODO lúc lắp: ${p.installed_odometer_km ? `${p.installed_odometer_km} km` : '—'} | Thương hiệu: ${p.brand || '—'} | Bảo hành: ${p.warranty_months ? `${p.warranty_months} tháng` : '—'} ${p.notes ? `(${p.notes})` : ''}\n`;
      });
      context += '\n';
    }

    // 6. Expenses
    const expenses = expenseRes.data || [];
    if (expenses.length > 0) {
      const totalExp = expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      context += `💳 SỔ CÁI CHI PHÍ VẬN HÀNH PHÁT SINH (${expenses.length} giao dịch | Tổng: **${totalExp.toLocaleString('vi-VN')} ₫**):\n`;
      expenses.slice(0, 25).forEach((e: any) => {
        context += `- Ngày ${e.date}: [${e.category}${e.subcategory ? ` / ${e.subcategory}` : ''}] **${e.description || e.category}** - Số tiền: **${Number(e.amount || 0).toLocaleString('vi-VN')} ₫** | Đơn vị: ${e.vendor || '—'}\n`;
      });
      context += '\n';
    }

    // 7. Insurance Policies
    const insurances = insRes.data || [];
    if (insurances.length > 0) {
      context += `🛡️ BẢO HIỂM & GIẤY TỜ PHÁP LÝ XE:\n`;
      insurances.forEach((ins: any) => {
        context += `- **${ins.policy_type || 'Bảo hiểm'}** | Nhà bảo hiểm: **${ins.provider || '—'}** | Số HĐ: \`${ins.policy_number || '—'}\` | Hiệu lực: ${ins.start_date || '—'} đến **${ins.expiry_date || '—'}** | Phí bảo hiểm: **${Number(ins.premium_amount || 0).toLocaleString('vi-VN')} ₫** | Mức bồi thường tối đa: ${Number(ins.coverage_amount || 0).toLocaleString('vi-VN')} ₫ | ☎️ Hotline cứu hộ 24/7: **${ins.provider_hotline || '—'}**\n`;
      });
      context += '\n';
    }

    // 8. Trips (Combine Supabase + Real August Trips)
    const dbTrips = tripsRes.data || [];
    const allTrips = dbTrips.length > 0 ? dbTrips : REAL_AUGUST_TRIPS;
    if (allTrips.length > 0) {
      const totalTripKm = allTrips.reduce((s: number, t: any) => s + (Number(t.distance_km) || 0), 0);
      context += `📍 NHẬT KÝ CÁC CHUYẾN ĐI (${allTrips.length} chuyến gần nhất | Tổng quãng đường: **${totalTripKm.toFixed(1)} km**):\n`;
      allTrips.slice(0, 15).forEach((t: any) => {
        const start = t.start_time ? t.start_time.replace('T', ' ').slice(0, 16) : '—';
        context += `- ${start}: **${t.distance_km} km** (${t.start_location || 'Điểm đi'} → ${t.end_location || 'Điểm đến'}) | Tốc độ TB: ${t.avg_speed_kmh || '—'} km/h | Tiêu hao: ${t.fuel_consumed_liters ? `${t.fuel_consumed_liters}L` : '—'}\n`;
      });
      context += '\n';
    }

    return context;
  } catch (err) {
    console.error('[AI Chat] Error building rich context:', err);
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
      history = [],
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

    // Build conversational memory history
    let historyText = '';
    if (Array.isArray(history) && history.length > 0) {
      historyText = `\n[LỊCH SỬ HỘI THOẠI TRƯỚC ĐÓ]:\n` + history.map((h: any) => `${h.role === 'user' ? 'Người dùng' : 'AI Cố vấn'}: ${h.text}`).join('\n\n') + '\n\n';
    }

    const activeSystemPrompt = userCustomPrompt || DEFAULT_SYSTEM_PROMPT;
    const fullPrompt = `[HỆ THỐNG VAI TRÒ & QUY TẮC PHÂN TÍCH]:\n${activeSystemPrompt}\n\n${contextText}\n${historyText}[CÂU HỎI HIỆN TẠI CỦA NGƯỜI DÙNG]:\n${prompt}`;

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
