// ============================================================
// Supabase Edge Function: POST /ai-advisor
// Build "AI Advisor" for the STATS/ANALYSIS tab in the Android app.
// The app sends recent_trips + fuel_logs from the device; we verify the
// asset exists, call Gemini, and return a VehicleAiResponse structure
// (summary, maintenance_prediction, fuel_efficiency_tip, cost_alert).
//
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

interface AdvisorRequest {
  asset_id?: string;
  device_id?: string;
  current_odo?: number;
  recent_trips?: TripSummary[];
  fuel_logs?: FuelSummary[];
  user_prompt?: string | null;
}

// Prompt template and language for the AI — Romanian, consistent with the app.
const SYSTEM_PROMPT = `Esti Senior Advisor de Gestionare a Masinii si Combustibilului (FMMS Senior Advisor).

RASPUNSUL TAU: UN OBIECT JSON valid si doar acela (fara text in afara JSON-ului), cu exact 4 campuri:
{
  "summary": "titlu rezumatului calitativ in maxim 3-4 randuri, in romana naturala, bazandu-se pe date reale (distanta, combustibil, trend)",
  "maintenance_prediction": "predictie de intretinere/consumabile care se apropie bazat pe distanta parcursa",
  "fuel_efficiency_tip": "sfat concret pentru reducerea consumului de combustibil",
  "cost_alert": "avertizare de cost bazat pe pretul combustibilului/cost per km"
}

REGLI:
- Limba: romana standard, consecventa, profesionala.
- Nu inventa cifre — foloseste doar datele furnizate.
- Daca nu exista suficiente date pentru un camp, seteaza-l null.
- Nu include marcatori de markup (markdown), bannere, sau text in afara obiectului JSON.`;

function fmtNum(n: number | null | undefined): string {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  return n.toLocaleString('ro-RO');
}

function buildContext(req: AdvisorRequest): string {
  const t = req.recent_trips ?? [];
  const f = req.fuel_logs ?? [];
  let ctx = `DATE DE PE VEHICUL (asset_id: ${req.asset_id ?? '—'}):\n`;
  ctx += `- ODO actual: ${fmtNum(req.current_odo)} km\n\n`;

  if (t.length) {
    const dist = t.reduce((s: number, x: TripSummary) => s + (x.distance_km || 0), 0);
    const fuel = t.reduce((s: number, x: TripSummary) => s + (x.fuel_used_liters || 0), 0);
    ctx += `CALATORII RECENTE (${t.length} — total ${fmtNum(dist)} km, ${fmtNum(fuel)} L):\n`;
    t.slice(0, 10).forEach((x: TripSummary) => {
      const cons = x.average_consumption_l100km ??
        (x.fuel_used_liters && x.distance_km ? (x.fuel_used_liters / x.distance_km * 100) : null);
      ctx += `  + ${new Date(x.start_time ?? 0).toISOString().slice(0, 10)}: ${fmtNum(x.distance_km)} km, ${fmtNum(x.fuel_used_liters)} L (${fmtNum(cons)} L/100km), vit. medie ${fmtNum(x.average_speed_kmh)} km/h, max ${fmtNum(x.max_speed_kmh)} km/h\n`;
    });
    ctx += '\n';
  }

  if (f.length) {
    const totLiter = f.reduce((s: number, x: FuelSummary) => s + (x.fuel_liters || 0), 0);
    const totCost = f.reduce((s: number, x: FuelSummary) => s + (x.total_cost || 0), 0);
    ctx += `APROVIZIONARI COMBUSTIBIL (${f.length} — total ${fmtNum(totLiter)} L, ${fmtNum(totCost)} lei):\n`;
    f.slice(0, 5).forEach((x: FuelSummary) => {
      ctx += `  + ${new Date(x.date ?? 0).toISOString().slice(0, 10)}: ${fmtNum(x.fuel_liters)} L, ${fmtNum(x.total_cost)} lei (${fmtNum(x.price_per_liter)} lei/L, ODO ${fmtNum(x.odometer_km)})\n`;
    });
    ctx += '\n';
  }

  if (req.user_prompt) {
    ctx += `INTREBARE ADDITIONALA DE LA UTILIZATOR: ${req.user_prompt}\n\n`;
  }

  return ctx;
}

async function callGemini(model: string, apiKey: string, prompt: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
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
            maxOutputTokens: 8000,
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
  // Strip markdown code fences and surrounding whitespace.
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
    // The app talks to Supabase using the anon/publishable key (no user JWT),
    // same as its other calls (get_fleet_vehicles, fmms_report_odometer).
    // RLS governs whether an anonymous client can read the asset row.
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

    // Verify device-bound access. fmms_verify_device_access is SECURITY DEFINER
    // and returns only a boolean decision (never row data), so the anon client
    // cannot bypass RLS to read fleet data. Requests without a valid device
    // bound to this vehicle are rejected.
    const { data: allowed, error: assetError } = await supabase.rpc('fmms_verify_device_access', {
      p_device_id: body.device_id ?? null,
      p_asset_id: assetId,
    });

    if (assetError || allowed !== true) {
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

    const prompt = `[SYSTEM VAI & CONTEXT ANALIZA]:\n${SYSTEM_PROMPT}\n\n[DATE ACTUALE]:\n${buildContext(body)}`;
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    let result = { ok: false, error: 'No model available' as string | undefined };

    for (const model of models) {
      const r = await callGemini(model, apiKey, prompt);
      console.log(`model=${model} ok=${r.ok} error=${r.error ?? 'none'} textLen=${r.text?.length ?? 0} textHead=${r.text?.slice(0,120) ?? ''}`);
      if (r.ok && r.text) {
        result = { ok: true, text: r.text };
        break;
      }
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
      summary: str(parsed.summary) || 'Analiza a fost generata, dar nu sunt suficiente date.',
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