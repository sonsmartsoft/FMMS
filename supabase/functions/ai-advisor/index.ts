// ============================================================
// Supabase Edge Function: POST /ai-advisor
// Build "AI Advisor" for the STATS/ANALYSIS tab in the Android app.
//
// The function pulls REAL data from the production database via the
// SECURITY DEFINER RPC fmms_get_vehicle_context (which verifies the
// calling device is bound to the asset). It supplements with any data
// the app sends, then asks Gemini (in Vietnamese) and returns a
// VehicleAiResponse structure (summary, maintenance_prediction,
// fuel_efficiency_tip, cost_alert).
//
// Returns 403 if the device is not authorized for the asset.
// Deploy: supabase functions deploy ai-advisor
// Required secret: GEMINI_API_KEY
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface TripSummary {
  start_time?: number;
  end_time?: number | null;
  distance_km?: number;
  fuel_used_liters?: number | null;
  average_consumption_l100km?: number | null;
  average_speed_kmh?: number | null;
  max_speed_kmh?: number | null;
  start_odometer?: number | null;
  end_odometer?: number | null;
}

interface FuelSummary {
  date?: number;
  odometer_km?: number | null;
  fuel_liters?: number;
  price_per_liter?: number | null;
  total_cost?: number | null;
  currency?: string;
}

interface AppStats {
  total_distance_km?: number;
  total_fuel_liters?: number;
  trip_count?: number;
  current_odometer_km?: number;
  total_fuel_cost_vnd?: number;
  avg_consumption_l100km?: number | null;
  fuel_log_count?: number;
}

interface AdvisorRequest {
  asset_id?: string;
  device_id?: string;
  current_odo?: number;
  stats?: AppStats;
  recent_trips?: TripSummary[];
  fuel_logs?: FuelSummary[];
  user_prompt?: string | null;
}

// SYSTEM_PROMPT luôn yêu cầu trả lời BẰNG TIẾNG VIỆT.
const SYSTEM_PROMPT = `Bạn là Cố vấn cấp cao về quản lý xe và nhiên liệu (FMMS Senior Advisor).

YÊU CẦU TRẢ LỜI: Một đối tượng JSON hợp lệ và chỉ duy nhất đó (không có văn bản nào ngoài JSON), có đúng 4 trường:
{
  "summary": "tóm tắt định tính trong 3-4 dòng, BẰNG TIẾNG VIỆT tự nhiên, dựa trên dữ liệu thực (quãng đường, nhiên liệu, xu hướng)",
  "maintenance_prediction": "dự đoán bảo dưỡng/vật tư sắp cần dựa trên quãng đường đã đi và mốc ODO hiện tại",
  "fuel_efficiency_tip": "mẹo cụ thể để giảm tiêu hao nhiên liệu",
  "cost_alert": "cảnh báo chi phí dựa trên giá nhiên liệu / chi phí mỗi km"
}

QUY TẮC:
- NGÔN NGỮ: LUÔN trả lời tiếng Việt chuẩn, nhất quán, chuyên nghiệp.
- SỐ LIỆU CHÍNH XÁC: Luôn ưu tiên dùng mốc ODO hiện tại và Tổng quãng đường từ mục "THỐNG KÊ VẬN HÀNH THỰC TẾ" (hoặc ODO từ các chuyến đi thực tế gần nhất). Tuyệt đối không bịa số km.
- Nếu không đủ dữ liệu cho một trường, đặt null.
- Không thêm markdown, tiêu đề, hoặc văn bản ngoài đối tượng JSON.`;

function fmtNum(n: number | null | undefined): string {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('vi-VN');
}

// Chuẩn hóa 1 chuyến từ DB (chuỗi thời gian) hoặc từ app (epoch ms).
function tripToLine(t: Record<string, unknown>): string {
  const dist = typeof t.distance_km === 'number' ? t.distance_km : Number(t.distance_km ?? 0);
  const fuel = typeof t.fuel_used_liters === 'number' ? t.fuel_used_liters : Number(t.fuel_used_liters ?? 0);
  const cons = typeof t.average_consumption_l100km === 'number' ? t.average_consumption_l100km : (t.average_consumption_l100km != null ? Number(t.average_consumption_l100km) : null);
  const avg = typeof t.average_speed_kmh === 'number' ? t.average_speed_kmh : (t.average_speed_kmh != null ? Number(t.average_speed_kmh) : null);
  const max = typeof t.max_speed_kmh === 'number' ? t.max_speed_kmh : (t.max_speed_kmh != null ? Number(t.max_speed_kmh) : null);
  const odo = typeof t.end_odometer === 'number' ? t.end_odometer : (t.end_odometer != null ? Number(t.end_odometer) : null);
  const day = t.start_time ? String(t.start_time).slice(0, 10) : '—';
  return `  + ${day}: ${fmtNum(dist)} km, ${fmtNum(fuel)} L (${fmtNum(cons ?? 0)} L/100km), TB ${fmtNum(avg ?? 0)} km/h, max ${fmtNum(max ?? 0)} km/h${odo != null ? `, ODO ${fmtNum(odo)}` : ''}`;
}

function fuelToLine(f: Record<string, unknown>): string {
  const liters = typeof f.fuel_liters === 'number' ? f.fuel_liters : Number(f.fuel_liters ?? 0);
  const cost = typeof f.total_cost === 'number' ? f.total_cost : Number(f.total_cost ?? 0);
  const price = typeof f.price_per_liter === 'number' ? f.price_per_liter : (f.price_per_liter != null ? Number(f.price_per_liter) : null);
  const odo = typeof f.odometer_km === 'number' ? f.odometer_km : (f.odometer_km != null ? Number(f.odometer_km) : null);
  const day = (f.timestamp && String(f.timestamp).slice(0, 10) !== '') ? String(f.timestamp).slice(0, 10) : (f.date ? String(f.date).slice(0, 10) : '—');
  return `  + ${day}: ${fmtNum(liters)} L, ${fmtNum(cost)} ₫ (${fmtNum(price ?? 0)} ₫/L${odo != null ? `, ODO ${fmtNum(odo)}` : ''})`;
}

// Xây context từ DB và dữ liệu app (ưu tiên thống kê thực tế chuẩn).
function buildContext(req: AdvisorRequest, db: Record<string, unknown> | null): string {
  const appTrips = req.recent_trips ?? [];
  const appFuel = req.fuel_logs ?? [];
  const dbTrips = Array.isArray(db?.recent_trips) ? (db.recent_trips as Record<string, unknown>[]) : [];
  const dbFuel = Array.isArray(db?.recent_fuel_logs) ? (db.recent_fuel_logs as Record<string, unknown>[]) : [];
  const asset = db?.asset ? (db.asset as Record<string, unknown>) : null;

  // Tính ODO thực tế chính xác nhất:
  // Ưu tiên: 1. Stats gửi từ app -> 2. Max ODO từ trips/fuel -> 3. DB asset ODO -> 4. current_odo fallback
  const tripsMaxOdo = dbTrips.reduce((max, t) => Math.max(max, Number(t.end_odometer ?? 0)), 0);
  const fuelMaxOdo = dbFuel.reduce((max, f) => Math.max(max, Number(f.odometer_km ?? 0)), 0);
  const bestCalculatedOdo = Math.max(tripsMaxOdo, fuelMaxOdo);

  let effectiveOdo = req.stats?.current_odometer_km;
  if (!effectiveOdo || effectiveOdo <= 0) {
    effectiveOdo = bestCalculatedOdo > 0 ? bestCalculatedOdo : (Number(asset?.current_odometer_km ?? 0) || req.current_odo || 0);
  }

  let ctx = `DỮ LIỆU XE (asset_id: ${req.asset_id ?? '—'}):\n`;

  // 1. Thông tin định danh xe
  if (asset) {
    ctx += `- Xe: ${asset.name ?? ''} (${asset.brand ?? ''} ${asset.model ?? ''})\n`;
  }
  ctx += `- Mốc ODO hiện tại của xe: ${fmtNum(effectiveOdo)} km\n\n`;

  // 2. Thống kê vận hành thực tế (Từ app hoặc tổng hợp)
  if (req.stats) {
    ctx += `THỐNG KÊ VẬN HÀNH THỰC TẾ (DỮ LIỆU CHÍNH XÁC TỪ THIẾT BỊ):\n`;
    if (req.stats.total_distance_km != null && req.stats.total_distance_km > 0) {
      ctx += `  + Tổng quãng đường xe đã chạy: ${fmtNum(req.stats.total_distance_km)} km\n`;
    }
    if (req.stats.trip_count != null && req.stats.trip_count > 0) {
      ctx += `  + Tổng số chuyến đi: ${fmtNum(req.stats.trip_count)} chuyến\n`;
    }
    if (req.stats.total_fuel_liters != null && req.stats.total_fuel_liters > 0) {
      ctx += `  + Tổng xăng tiêu thụ: ${fmtNum(req.stats.total_fuel_liters)} L\n`;
    }
    if (req.stats.total_fuel_cost_vnd != null && req.stats.total_fuel_cost_vnd > 0) {
      ctx += `  + Tổng tiền xăng: ${fmtNum(req.stats.total_fuel_cost_vnd)} ₫\n`;
    }
    if (req.stats.avg_consumption_l100km != null && Number(req.stats.avg_consumption_l100km) > 0) {
      ctx += `  + Tiêu thụ trung bình: ${fmtNum(req.stats.avg_consumption_l100km)} L/100km\n`;
    }
    ctx += '\n';
  }

  // 2. Chuyến đi từ DB (nếu có)
  const dbTrips = Array.isArray(db?.recent_trips) ? (db.recent_trips as Record<string, unknown>[]) : [];
  if (dbTrips.length) {
    const dist = dbTrips.reduce((s: number, x: Record<string, unknown>) => s + Number(x.distance_km ?? 0), 0);
    const fuel = dbTrips.reduce((s: number, x: Record<string, unknown>) => s + Number(x.fuel_used_liters ?? 0), 0);
    ctx += `CHUYẾN ĐI DB (${dbTrips.length} — tổng ${fmtNum(dist)} km, ${fmtNum(fuel)} L):\n`;
    dbTrips.slice(0, 10).forEach((x) => { ctx += tripToLine(x) + '\n'; });
    ctx += '\n';
  }

  // 3. Đổ xăng từ DB (nếu có)
  const dbFuel = Array.isArray(db?.recent_fuel_logs) ? (db.recent_fuel_logs as Record<string, unknown>[]) : [];
  if (dbFuel.length) {
    const totLiter = dbFuel.reduce((s: number, x: Record<string, unknown>) => s + Number(x.fuel_liters ?? 0), 0);
    const totCost = dbFuel.reduce((s: number, x: Record<string, unknown>) => s + Number(x.total_cost ?? 0), 0);
    ctx += `ĐỔ XĂNG DB (${dbFuel.length} — tổng ${fmtNum(totLiter)} L, ${fmtNum(totCost)} ₫):\n`;
    dbFuel.slice(0, 5).forEach((x) => { ctx += fuelToLine(x) + '\n'; });
    ctx += '\n';
  }

  // 4. Bảo dưỡng từ DB (nếu có)
  const dbMaint = Array.isArray(db?.maintenance) ? (db.maintenance as Record<string, unknown>[]) : [];
  if (dbMaint.length) {
    ctx += 'BẢO DƯỠNG GẦN ĐÂY (DB):\n';
    dbMaint.slice(0, 5).forEach((m: Record<string, unknown>) => {
      const d = String(m.date ?? '').slice(0, 10) || '—';
      ctx += `  + ${d}: ${m.maintenance_type ?? ''} (ODO ${fmtNum(m.odometer_km != null ? Number(m.odometer_km) : 0) || '—'} km), ${fmtNum(m.cost != null ? Number(m.cost) : 0)} ${m.currency ?? '₫'}${m.next_due_km != null ? `, mốc kế: ${fmtNum(Number(m.next_due_km))} km` : ''}\n`;
    });
    ctx += '\n';
  }

  // 5. Chi phí từ DB (nếu có)
  const exp = db?.expense_summary ? (db.expense_summary as Record<string, unknown>) : null;
  if (exp) {
    ctx += 'CHI PHÍ (DB):\n';
    ctx += `  + Tổng nhiên liệu: ${fmtNum(exp.total_fuel != null ? Number(exp.total_fuel) : 0)} ${exp.currency ?? '₫'}\n`;
    ctx += `  + Tổng bảo dưỡng: ${fmtNum(exp.total_maintenance != null ? Number(exp.total_maintenance) : 0)} ${exp.currency ?? '₫'}\n`;
    ctx += `  + Tổng chi phí: ${fmtNum(exp.total_overall != null ? Number(exp.total_overall) : 0)} ${exp.currency ?? '₫'}\n`;
    ctx += '\n';
  }

  // 6. Bổ sung dữ liệu gần đây từ app nếu DB chưa có (fallback)
  if (!dbTrips.length && appTrips.length) {
    const dist = appTrips.reduce((s: number, x: TripSummary) => s + (x.distance_km || 0), 0);
    const fuel = appTrips.reduce((s: number, x: TripSummary) => s + (x.fuel_used_liters || 0), 0);
    ctx += `CHUYẾN ĐI RECENT (app — ${appTrips.length}, tổng ${fmtNum(dist)} km, ${fmtNum(fuel)} L):\n`;
    appTrips.slice(0, 10).forEach((x: TripSummary) => {
      const cons = x.average_consumption_l100km ?? (x.fuel_used_liters && x.distance_km ? x.fuel_used_liters / x.distance_km * 100 : null);
      ctx += `  + ${new Date(x.start_time ?? 0).toISOString().slice(0, 10)}: ${fmtNum(x.distance_km)} km, ${fmtNum(x.fuel_used_liters)} L (${fmtNum(cons ?? 0)} L/100km), vit. medie ${fmtNum(x.average_speed_kmh)} km/h, max ${fmtNum(x.max_speed_kmh)} km/h\n`;
    });
    ctx += '\n';
  }
  if (!dbFuel.length && appFuel.length) {
    const totLiter = appFuel.reduce((s: number, x: FuelSummary) => s + (x.fuel_liters || 0), 0);
    const totCost = appFuel.reduce((s: number, x: FuelSummary) => s + (x.total_cost || 0), 0);
    ctx += `ĐỔ XĂNG RECENT (app — ${appFuel.length}, tổng ${fmtNum(totLiter)} L, ${fmtNum(totCost)} ₫):\n`;
    appFuel.slice(0, 5).forEach((x: FuelSummary) => {
      ctx += `  + ${new Date(x.date ?? 0).toISOString().slice(0, 10)}: ${fmtNum(x.fuel_liters)} L, ${fmtNum(x.total_cost)} ₫ (${fmtNum(x.price_per_liter)} ₫/L, ODO ${fmtNum(x.odometer_km)})\n`;
    });
    ctx += '\n';
  }

  if (req.user_prompt) {
    ctx += `CÂU HỎI THÊM TỪ NGƯỜI DÙNG: ${req.user_prompt}\n\n`;
  }

  return ctx;
}

async function callGemini(model: string, apiKey: string, prompt: string, maxTokens: number): Promise<{ ok: boolean; text?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: maxTokens,
          },
        }),
        signal: controller.signal,
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { ok: true, text };
    }

    const errData = await res.json().catch(() => ({}));
    return { ok: false, error: errData?.error?.message || `HTTP ${res.status}: ${res.statusText}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  let s = (raw ?? '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: authHeader ? { Authorization: authHeader } : {} } },
    );

    const body: AdvisorRequest = await req.json();
    const assetId = body.asset_id;
    if (!assetId) {
      return new Response(JSON.stringify({ error: 'asset_id is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 1. Verify device-bound access + pull real DB context.
    let dbContext: Record<string, unknown> | null = null;
    const { data: ctxData, error: ctxError } = await supabase.rpc('fmms_get_vehicle_context', {
      p_device_id: body.device_id ?? null,
      p_asset_id: assetId,
      p_limit: 10,
    });

    if (ctxError) {
      // RPC chưa tồn tại (migration chưa chạy) -> fallback: verify bằng RPC cũ.
      console.error('get_vehicle_context error:', ctxError.message);
      const { data: allowed, error: vErr } = await supabase.rpc('fmms_verify_device_access', {
        p_device_id: body.device_id ?? null,
        p_asset_id: assetId,
      });
      if (vErr || allowed !== true) {
        return new Response(JSON.stringify({ error: 'Vehicle not found or access denied' }), {
          status: 403,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    } else if (ctxData && (ctxData as Record<string, unknown>).authorized === true) {
      dbContext = ctxData as Record<string, unknown>;
    } else {
      return new Response(JSON.stringify({ error: 'Vehicle not found or access denied' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured: GEMINI_API_KEY is missing on the server.' }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `[HỆ THỐNG & NGỮ CẢNH]:\n${SYSTEM_PROMPT}\n\n[DỮ LIỆU HIỆN TẠI]:\n${buildContext(body, dbContext)}`;
    // Ưu tiên model nhanh, KHÔNG thinking (2.0-flash, 1.5-flash) để giảm độ trễ.
    // gemini-2.5-flash để CHẬM NHẤT làm fallback vì có chế độ "suy nghĩ" (reasoning) sinh
    // rất nhiều token phụ -> làm tăng độ trễ rõ rệt. Nó chỉ cần ngân sách token lớn riêng.
    const models: Array<[string, number]> = [
      ['gemini-2.0-flash', 2048],
      ['gemini-1.5-flash', 2048],
      ['gemini-2.5-flash', 8192],
    ];
    let result = { ok: false, error: 'No model available' as string | undefined };

    for (const [model, maxTokens] of models) {
      const r = await callGemini(model, apiKey, prompt, maxTokens);
      if (r.ok && r.text) {
        result = { ok: true, text: r.text };
        break;
      }
      // Giữ lỗi của model cuối để dễ chẩn đoán khi tất cả fallback đều thất bại.
      result = r;
    }

    if (!result.ok || !result.text) {
      return new Response(JSON.stringify({ error: result.error || 'AI request failed' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseJsonObject(result.text);
    if (!parsed) {
      console.error('parse failure. result=', JSON.stringify(result));
      return new Response(JSON.stringify({ error: 'AI returned unparsable response' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.trim() && v !== 'null' ? v.trim() : null;

    const resp = {
      summary: str(parsed.summary) || 'Đã tạo phân tích nhưng chưa đủ dữ liệu.',
      maintenance_prediction: str(parsed.maintenance_prediction),
      fuel_efficiency_tip: str(parsed.fuel_efficiency_tip),
      cost_alert: str(parsed.cost_alert),
    };

    return new Response(JSON.stringify({ ok: true, ...resp }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-advisor error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
