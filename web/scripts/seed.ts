import { createClient } from '@supabase/supabase-js';
import { INITIAL_ASSETS, MOCK_EXPENSES, MOCK_LOAN, MOCK_FUEL_LOGS, MOCK_MAINTENANCE_RECORDS, MOCK_PARTS } from '../lib/data/mockData';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('🚀 Seeding Supabase Database with Official Real Family Fleet Data...');

  // 1. Assets
  console.log('📦 Seeding Assets...');
  for (const asset of INITIAL_ASSETS) {
    const { error: aErr } = await supabase.from('assets').upsert({
      id: asset.id,
      name: asset.name,
      asset_type: asset.asset_type,
      category: asset.category ?? null,
      brand: asset.brand,
      model: asset.model,
      year: asset.year,
      trim: asset.trim ?? null,
      color: asset.color ?? null,
      license_plate: asset.license_plate ?? null,
      vin: asset.vin ?? null,
      engine: asset.engine ?? null,
      fuel_type: asset.fuel_type ?? null,
      tank_capacity_liters: asset.tank_capacity_liters ?? null,
      battery_capacity_kwh: asset.battery_capacity_kwh ?? null,
      purchase_date: asset.purchase_date ?? null,
      purchase_price: asset.purchase_price,
      current_value: asset.current_value,
      initial_odometer_km: asset.initial_odometer_km,
      current_odometer_km: asset.current_odometer_km,
      virtual_odometer_km: asset.virtual_odometer_km ?? asset.current_odometer_km,
      odometer_source: asset.odometer_source ?? 'VIRTUAL',
      status: asset.status,
      image_url: asset.image_url ?? null,
      description: asset.description ?? null,
      sales_rep_name: asset.sales_rep_name ?? null,
      sales_rep_phone: asset.sales_rep_phone ?? null,
      brand_hotline: asset.brand_hotline ?? null,
    }, { onConflict: 'id' });

    if (aErr) console.warn(`Warning inserting asset ${asset.name}:`, aErr.message);

    // Capabilities
    if (asset.capabilities) {
      await supabase.from('asset_capabilities').upsert({
        asset_id: asset.id,
        ...asset.capabilities
      }, { onConflict: 'asset_id' });
    }
  }

  // 2. Loans
  console.log('🏦 Seeding Loans...');
  const { error: lErr } = await supabase.from('loans').upsert({
    id: MOCK_LOAN.id,
    asset_id: MOCK_LOAN.asset_id,
    lender: MOCK_LOAN.lender,
    principal: MOCK_LOAN.principal,
    down_payment: MOCK_LOAN.down_payment,
    interest_rate_percent: MOCK_LOAN.interest_rate_percent,
    preferred_rate_percent: MOCK_LOAN.preferred_rate_percent,
    preferred_months: MOCK_LOAN.preferred_months,
    floating_rate_percent: MOCK_LOAN.floating_rate_percent,
    loan_ratio_percent: MOCK_LOAN.loan_ratio_percent,
    term_months: MOCK_LOAN.term_months,
    start_date: MOCK_LOAN.start_date,
    monthly_payment: MOCK_LOAN.monthly_payment,
    payment_day: MOCK_LOAN.payment_day,
    current_balance: MOCK_LOAN.current_balance,
    bank_contact_name: MOCK_LOAN.bank_contact_name,
    bank_contact_phone: MOCK_LOAN.bank_contact_phone,
    bank_hotline: MOCK_LOAN.bank_hotline,
    status: MOCK_LOAN.status,
    notes: MOCK_LOAN.notes,
  }, { onConflict: 'id' });
  if (lErr) console.warn('Warning inserting loan:', lErr.message);

  // 3. Expenses
  console.log(`💵 Seeding Expenses (${MOCK_EXPENSES.length} records)...`);
  for (const exp of MOCK_EXPENSES) {
    const { error: eErr } = await supabase.from('expenses').upsert({
      id: exp.id,
      asset_id: exp.asset_id,
      date: exp.date,
      category: exp.category,
      amount: exp.amount,
      currency: exp.currency || 'VND',
      vendor: exp.vendor ?? null,
      odometer_km: exp.odometer_km ?? null,
      description: exp.description,
    }, { onConflict: 'id' });
    if (eErr) console.warn(`Warning inserting expense ${exp.id}:`, eErr.message);
  }

  // 4. Fuel Logs
  console.log(`⛽ Seeding Fuel Logs (${MOCK_FUEL_LOGS.length} records)...`);
  for (const f of MOCK_FUEL_LOGS) {
    const { error: fErr } = await supabase.from('fuel_logs').upsert({
      id: f.id,
      asset_id: '22222222-2222-2222-2222-222222222222',
      timestamp: `${f.date}T08:00:00Z`,
      odometer_km: f.odometer_km,
      fuel_liters: f.liters,
      price_per_liter: f.price_per_liter,
      total_cost: f.total_cost,
      currency: 'VND',
      station: f.station ?? null,
      tank_full: true,
      notes: f.notes ?? null,
    }, { onConflict: 'id' });
    if (fErr) console.warn(`Warning inserting fuel log ${f.id}:`, fErr.message);
  }

  // 5. Maintenance Records
  console.log(`🛠️ Seeding Maintenance Records (${MOCK_MAINTENANCE_RECORDS.length} records)...`);
  for (const m of MOCK_MAINTENANCE_RECORDS) {
    const { error: mErr } = await supabase.from('maintenance_records').upsert({
      id: m.id,
      asset_id: m.asset_id,
      maintenance_type: m.maintenance_type,
      date: m.date,
      odometer_km: m.odometer_km,
      cost: m.cost,
      vendor: m.vendor ?? null,
      notes: m.notes ?? null,
      next_due_km: m.next_due_km ?? null,
      next_due_date: m.next_due_date ?? null,
    }, { onConflict: 'id' });
    if (mErr) console.warn(`Warning inserting maintenance ${m.id}:`, mErr.message);
  }

  // 6. Parts
  console.log(`🔧 Seeding Parts & Upgrades (${MOCK_PARTS.length} records)...`);
  for (const p of MOCK_PARTS) {
    const { error: pErr } = await supabase.from('parts').upsert({
      id: p.id,
      asset_id: '22222222-2222-2222-2222-222222222222',
      part_name: p.name,
      brand: p.brand ?? null,
      supplier: p.category ?? null,
      installation_date: p.install_date,
      cost: p.cost,
      installed_odometer_km: p.odometer_km,
      notes: p.notes ?? null,
      status: 'INSTALLED',
    }, { onConflict: 'id' });
    if (pErr) console.warn(`Warning inserting part ${p.id}:`, pErr.message);
  }

  console.log('✅ Supabase Seeding Complete!');
}

seed().catch(console.error);
