const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const MAZDA_ID = '20260308-0001-4222-8888-19b213872026';

async function syncTo3030() {
  console.log('--- 1. Fetching OBD trips from 2026-08-24 ---');
  const { data: obdTrips, error: fetchErr } = await supabase
    .from('trips')
    .select('*')
    .eq('asset_id', MAZDA_ID)
    .gte('start_time', '2026-08-24T00:00:00')
    .order('start_time', { ascending: true });

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    return;
  }

  console.log(`Found ${obdTrips.length} OBD trips.`);
  
  // Filter out tiny drift trips < 0.2km
  const validTrips = obdTrips.filter(t => (t.distance_km || 0) >= 0.2);
  const driftTrips = obdTrips.filter(t => (t.distance_km || 0) < 0.2);

  for (const dt of driftTrips) {
    await supabase.from('trips').delete().eq('id', dt.id);
  }

  const currentSum = validTrips.reduce((acc, t) => acc + (t.distance_km || 0), 0);
  console.log(`Current valid OBD sum: ${currentSum.toFixed(2)} km`);

  // Target OBD distance = 3030 - 2651 = 379.0 km
  const targetDist = 379.0;
  const scale = currentSum > 0 ? targetDist / currentSum : 1.0;
  console.log(`Scaling factor: ${scale.toFixed(6)} to reach exact 379.0 km (from 2651 to 3030 km)`);

  let runningOdo = 2651.0;
  for (let i = 0; i < validTrips.length; i++) {
    const trip = validTrips[i];
    let newDist = Math.round(trip.distance_km * scale * 100) / 100;
    let startOdo = Math.round(runningOdo * 100) / 100;
    let endOdo = Math.round((runningOdo + newDist) * 100) / 100;

    // For the very last trip, pin it to exactly 3030.0
    if (i === validTrips.length - 1) {
      endOdo = 3030.0;
      newDist = Math.round((3030.0 - startOdo) * 100) / 100;
    }

    const { error: upErr } = await supabase
      .from('trips')
      .update({
        distance_km: newDist,
        start_odometer: startOdo,
        end_odometer: endOdo
      })
      .eq('id', trip.id);

    if (upErr) {
      console.error(`Error updating trip ${trip.id}:`, upErr);
    }

    runningOdo += newDist;
  }

  console.log('--- 2. Updating Mazda 2 Asset ODO to 3030 km ---');
  const { error: assetErr } = await supabase
    .from('assets')
    .update({
      current_odometer_km: 3030,
      virtual_odometer_km: 3030,
      initial_odometer_km: 12,
      updated_at: new Date().toISOString()
    })
    .eq('id', MAZDA_ID);

  if (assetErr) {
    console.error('Asset update error:', assetErr);
  } else {
    console.log('SUCCESS: Asset Odometer updated to 3030 km in Supabase!');
  }
}

syncTo3030();
