const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const MAZDA_ID = '20260308-0001-4222-8888-19b213872026';

async function diagnoseTrips() {
  console.log('=== 1. FETCH ALL TRIPS FOR MAZDA ===');
  const { data: trips, error: tErr } = await supabase
    .from('trips')
    .select('id, asset_id, start_time, end_time, distance_km, start_odometer, end_odometer, notes')
    .eq('asset_id', MAZDA_ID)
    .order('start_time', { ascending: true });

  if (tErr) {
    console.error('Trips error:', tErr);
    process.exit(1);
  }

  console.log(`Total trips in Supabase for Mazda: ${trips.length}`);
  let sumDist = 0;
  trips.forEach(t => sumDist += (Number(t.distance_km) || 0));
  console.log(`Sum of distance_km: ${sumDist.toFixed(2)} km`);

  if (trips.length > 0) {
    console.log(`First trip: ${trips[0].start_time} - ODO: ${trips[0].start_odometer} -> ${trips[0].end_odometer} (${trips[0].distance_km} km) [${trips[0].notes}]`);
    console.log(`Last trip: ${trips[trips.length - 1].start_time} - ODO: ${trips[trips.length - 1].start_odometer} -> ${trips[trips.length - 1].end_odometer} (${trips[trips.length - 1].distance_km} km) [${trips[trips.length - 1].notes}]`);
  }

  console.log('\n=== 2. CHECK ALL TRIPS WITHOUT ASSET FILTER ===');
  const { data: allTrips, error: aErr } = await supabase
    .from('trips')
    .select('id, asset_id, start_time, distance_km')
    .order('start_time', { ascending: true });

  if (allTrips) {
    console.log(`Total all trips in table: ${allTrips.length}`);
    const byAsset = {};
    allTrips.forEach(t => {
      byAsset[t.asset_id] = (byAsset[t.asset_id] || 0) + (Number(t.distance_km) || 0);
    });
    console.log('Distances by asset_id:', byAsset);
  }

  process.exit(0);
}

diagnoseTrips();
