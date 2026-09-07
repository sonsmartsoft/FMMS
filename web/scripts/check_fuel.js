const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

async function main() {
  try {
    console.log('--- Checking fuel_logs ---');
    const { data: fuelLogs, error: fErr } = await supabase
      .from('fuel_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (fErr) console.error('fuel_logs err:', fErr);
    else console.log('fuel_logs count:', fuelLogs ? fuelLogs.length : 0, fuelLogs);

    console.log('\n--- Checking expenses ---');
    const { data: exp, error: eErr } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (eErr) console.error('expenses err:', eErr);
    else console.log('expenses count:', exp ? exp.length : 0, exp);
  } catch (err) {
    console.error('Catch err:', err);
  }
  process.exit(0);
}

main();
