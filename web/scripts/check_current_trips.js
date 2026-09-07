const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

const MAZDA_ID = '20260308-0001-4222-8888-19b213872026';

async function main() {
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, start_time, distance_km, start_odometer, end_odometer, notes')
    .eq('asset_id', MAZDA_ID)
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Total trips in Supabase for Mazda 2: ${trips.length}`);
  let totalDist = 0;
  trips.forEach((t, i) => {
    totalDist += Number(t.distance_km) || 0;
    if (i < 5 || i > trips.length - 5) {
      console.log(`[${i+1}] ${t.start_time}: dist=${t.distance_km}km, odo=${t.start_odometer}->${t.end_odometer} (${t.notes})`);
    }
  });
  console.log(`\n>>> TOTAL DISTANCE IN SUPABASE: ${totalDist.toFixed(2)} km <<<`);

  const { data: asset } = await supabase.from('assets').select('*').eq('id', MAZDA_ID).single();
  console.log('Asset in DB:', {
    current_odometer_km: asset.current_odometer_km,
    virtual_odometer_km: asset.virtual_odometer_km,
    initial_odometer_km: asset.initial_odometer_km
  });

  process.exit(0);
}

main();
