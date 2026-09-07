const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  console.log('=== 1. ASSETS ===');
  const { data: assets, error: aErr } = await supabase.from('assets').select('*');
  if (aErr) console.error('Asset err:', aErr);
  else console.log(JSON.stringify(assets, null, 2));

  console.log('\n=== 2. LATEST 10 TRIPS ===');
  const { data: trips, error: tErr } = await supabase
    .from('trips')
    .select('id, start_time, end_time, distance_km, start_odometer, end_odometer, notes')
    .order('start_time', { ascending: false })
    .limit(15);
  if (tErr) console.error('Trips err:', tErr);
  else console.log(JSON.stringify(trips, null, 2));

  console.log('\n=== 3. TELEMETRY / GPS / OBD RECENT LOGS ===');
  const tables = ['telemetry_logs', 'telemetry', 'gps_track_points', 'vehicle_context', 'diagnostic_trouble_codes'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').order('created_at', { ascending: false }).limit(5);
      if (!error && data && data.length > 0) {
        console.log(`Table ${t} (latest ${data.length}):`, data);
      } else if (error) {
        console.log(`Table ${t} error: ${error.message}`);
      } else {
        console.log(`Table ${t} empty`);
      }
    } catch (e) {
      console.log(`Table ${t} ex:`, e.message);
    }
  }
}

inspect();
