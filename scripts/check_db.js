const { createClient } = require('./web/node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://opslebsdmwsnsyfmbynf.supabase.co';
const supabaseKey = 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- CHECKING FUEL LOGS ---');
  const { data: fuelLogs, error: fuelError } = await supabase
    .from('fuel_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(15);

  if (fuelError) {
    console.error('Fuel error:', fuelError);
  } else {
    console.log(`Found ${fuelLogs?.length || 0} fuel logs:`);
    fuelLogs?.forEach(f => {
      console.log(`- [${f.id}] Date: ${f.timestamp}, ODO: ${f.odometer_km} km, Liters: ${f.fuel_liters || f.liters} L, Cost: ${f.total_cost || f.cost} ₫, Station: ${f.station}`);
    });
  }

  console.log('\n--- CHECKING TRIPS (September 2026) ---');
  const { data: trips, error: tripsError } = await supabase
    .from('trips')
    .select('id, start_time, end_time, distance_km, duration_seconds, start_odometer, end_odometer, status')
    .order('start_time', { ascending: false })
    .limit(15);

  if (tripsError) {
    console.error('Trips error:', tripsError);
  } else {
    console.log(`Found ${trips?.length || 0} trips:`);
    trips?.forEach(t => {
      console.log(`- [${t.id}] Start: ${t.start_time}, End: ${t.end_time}, Dist: ${t.distance_km} km, Dur: ${t.duration_seconds}s, ODO: ${t.start_odometer} -> ${t.end_odometer}, Status: ${t.status}`);
    });
  }
}

check();
