const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function testInsert() {
  const testId = '00000000-0000-0000-0000-000000000999';
  console.log('Testing insert into fuel_logs with anon key...');
  const { data, error } = await supabase.from('fuel_logs').upsert({
    id: testId,
    asset_id: '20260308-0001-4222-8888-19b213872026',
    timestamp: new Date().toISOString(),
    odometer_km: 3030,
    fuel_liters: 30,
    price_per_liter: 22000,
    total_cost: 660000,
    currency: 'VND',
    tank_full: true,
    fuel_level_before_pct: 20,
    fuel_liters_before: 8.8,
    fuel_level_after_pct: 100,
    fuel_liters_after: 44,
    calculated_consumption_l100km: 6.2,
    prev_odometer_km: 2600,
    fuel_consumed_liters: 28
  });

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert SUCCESS:', data);
    // Delete test row
    await supabase.from('fuel_logs').delete().eq('id', testId);
    console.log('Cleaned up test row.');
  }
  process.exit(0);
}

testInsert();
