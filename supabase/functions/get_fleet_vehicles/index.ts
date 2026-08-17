// ============================================================
// Supabase Edge Function: GET/POST /get_fleet_vehicles
// Nhận device_id từ Android app -> Trả về danh sách xe trong fleet
// Deploy: supabase functions deploy get_fleet_vehicles
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: authHeader ? { Authorization: authHeader } : {} },
      }
    );

    let deviceId: string | null = null;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        deviceId = body.device_id ?? body.deviceId ?? null;
      } catch {}
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      deviceId = url.searchParams.get('device_id') ?? url.searchParams.get('deviceId');
    }

    // Call RPC function
    const { data: vehicles, error } = await supabase.rpc('get_fleet_vehicles', {
      p_device_id: deviceId ?? undefined,
    });

    if (error) {
      console.error('get_fleet_vehicles RPC error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, vehicles: vehicles ?? [] }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('get_fleet_vehicles error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
