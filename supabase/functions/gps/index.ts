// ============================================================
// Supabase Edge Function: POST /gps
// Nhận batch GPS points từ Android, kiểm tra quyền, insert bulk
// Deploy: supabase functions deploy gps
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GpsPoint {
  lat: number;
  lng: number;
  speed_kmh?: number;
  heading_deg?: number;
  accuracy_m?: number;
  altitude_m?: number;
  trip_id?: string | null;
  recorded_at?: string; // ISO 8601
  // Device fields (per updated spec)
  device_id?: string;   // UUID — fixed per app install
  device_name?: string; // User-assigned tracker name
}

interface BatchPayload {
  vehicle_id: string;
  // device_id may be at batch level or per-point
  device_id?: string;
  device_name?: string;
  points: GpsPoint[];
}

serve(async (req: Request) => {
  // Preflight
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
    // Extract JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user JWT (respects RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Parse body
    const body: BatchPayload = await req.json();

    if (!body.vehicle_id || !Array.isArray(body.points) || body.points.length === 0) {
      return new Response(JSON.stringify({ error: 'vehicle_id and non-empty points array are required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Validate vehicle ownership (RLS will also enforce, but explicit check gives better error)
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, owner_id')
      .eq('id', body.vehicle_id)
      .single();

    if (assetError || !asset) {
      return new Response(JSON.stringify({ error: 'Vehicle not found or access denied' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (asset.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'You do not own this vehicle' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Cap batch size to avoid abuse
    const MAX_BATCH = 500;
    const points = body.points.slice(0, MAX_BATCH);

    // Build insert rows
    const rows = points.map((p: GpsPoint) => ({
      vehicle_id:  body.vehicle_id,
      trip_id:     p.trip_id ?? null,
      // device_id: prefer per-point, fallback to batch-level, fallback to vehicle_id cast
      device_id:   p.device_id ?? body.device_id ?? body.vehicle_id,
      device_name: p.device_name ?? body.device_name ?? null,
      lat:         p.lat,
      lng:         p.lng,
      speed_kmh:   p.speed_kmh ?? null,
      heading_deg: p.heading_deg ?? null,
      accuracy_m:  p.accuracy_m ?? null,
      altitude_m:  p.altitude_m ?? null,
      recorded_at: p.recorded_at ?? new Date().toISOString(),
    }));

    // Bulk insert — RLS policy will double-check ownership
    const { data: inserted, error: insertError } = await supabase
      .from('gps_track_points')
      .insert(rows)
      .select('id');

    if (insertError) {
      console.error('GPS insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inserted: inserted?.length ?? rows.length,
        vehicle_id: body.vehicle_id,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('GPS Edge Function error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
