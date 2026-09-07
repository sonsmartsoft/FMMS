const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMore() {
  console.log('=== GPS TRACK POINTS LATEST ===');
  const { data: gps, error: gErr } = await supabase.from('gps_track_points').select('*').order('timestamp', { ascending: false }).limit(5);
  if (gErr) {
    const { data: gps2, error: gErr2 } = await supabase.from('gps_track_points').select('*').limit(5);
    console.log('gps2:', gps2, 'err:', gErr2);
  } else {
    console.log('gps latest:', gps);
  }

  console.log('\n=== DEVICES ===');
  const { data: devices } = await supabase.from('devices').select('*');
  console.log('devices:', devices);

  console.log('\n=== ALL TRIPS FROM 2026-08-24 ===');
  const { data: obdTrips } = await supabase
    .from('trips')
    .select('id, start_time, end_time, distance_km, start_odometer, end_odometer')
    .gte('start_time', '2026-08-24')
    .order('start_time', { ascending: true });
  
  console.log(`Found ${obdTrips ? obdTrips.length : 0} OBD trips`);
  let sumDist = 0;
  if (obdTrips) {
    obdTrips.forEach(t => sumDist += (t.distance_km || 0));
    console.log(`Total OBD distance: ${sumDist.toFixed(2)} km`);
    console.log(`Last trip end_odometer: ${obdTrips[obdTrips.length - 1]?.end_odometer}`);
  }
}

checkMore();
