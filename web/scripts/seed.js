const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://opslebsdmwsnsyfmbynf.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_AateqAZXqTwmEsSwqweiPA_iGelY6O3';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UUID_MAP = {
  CAR01: '22222222-2222-2222-2222-222222222222',
  BIKE01: '11111111-1111-1111-1111-111111111111',
  BIKE02: '33333333-3333-3333-3333-333333333333',
  BIKE03: '44444444-4444-4444-4444-444444444444',
  BIKE04: '55555555-5555-5555-5555-555555555555',
  CAR02: '66666666-6666-6666-6666-666666666666',
};

function genUuid() {
  return crypto.randomUUID();
}

// Assets matching DB schema
const INITIAL_ASSETS = [
  {
    id: UUID_MAP.CAR01,
    name: 'Mazda 2AT 2026',
    asset_type: 'CAR',
    category: 'Sedan/Hatchback',
    brand: 'MAZDA',
    model: 'Mazda 2',
    year: 2026,
    trim: '1.5L AT',
    color: 'Đỏ Soul Red Crystal',
    license_plate: '19B-213.87',
    vin: 'JM1DJ1010102026',
    engine: '1.5L SkyActiv-G',
    fuel_type: 'PETROL',
    tank_capacity_liters: 44.0,
    purchase_date: '2026-03-08',
    purchase_price: 397000000,
    current_value: 380000000,
    initial_odometer_km: 0,
    current_odometer_km: 2651,
    virtual_odometer_km: 2651,
    odometer_source: 'VIRTUAL',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe ô tô gia đình chính Mazda 2 (19B-213.87). Vay ngân hàng TPBank 295,000,000 ₫.',
  },
  {
    id: UUID_MAP.BIKE01,
    name: 'Honda Air Blade 2016',
    asset_type: 'MOTORCYCLE',
    category: 'Tay ga',
    brand: 'HONDA',
    model: 'Air Blade 2016',
    year: 2016,
    trim: '125cc FI',
    color: 'Đen Nhám',
    license_plate: '88C1-210.63',
    fuel_type: 'PETROL',
    tank_capacity_liters: 4.4,
    purchase_date: '2017-08-01',
    purchase_price: 35000000,
    current_value: 18000000,
    initial_odometer_km: 0,
    current_odometer_km: 45000,
    virtual_odometer_km: 45000,
    odometer_source: 'VIRTUAL',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe máy Air Blade 2016 gia đình đi lại hằng ngày',
  },
  {
    id: UUID_MAP.BIKE02,
    name: 'Honda Air Blade 2021',
    asset_type: 'MOTORCYCLE',
    category: 'Tay ga',
    brand: 'HONDA',
    model: 'Air Blade 2021',
    year: 2021,
    trim: '125cc Special',
    color: 'Xanh Xám',
    license_plate: '88L1-604.36',
    fuel_type: 'PETROL',
    tank_capacity_liters: 4.4,
    purchase_date: '2021-04-05',
    purchase_price: 45000000,
    current_value: 32000000,
    initial_odometer_km: 0,
    current_odometer_km: 18000,
    virtual_odometer_km: 18000,
    odometer_source: 'VIRTUAL',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe máy Air Blade 2021 mua từ tháng 4/2021',
  },
  {
    id: UUID_MAP.BIKE03,
    name: 'Xe đạp Thống Nhất MTB 26-05',
    asset_type: 'BICYCLE',
    category: 'Mountain Bike',
    brand: 'THONGNHAT',
    model: 'MTB 26-05',
    year: 2024,
    color: 'Xanh Thể Thao',
    license_plate: 'MTB 26-555',
    fuel_type: 'HUMAN_POWER',
    purchase_date: '2024-03-10',
    purchase_price: 3000000,
    current_value: 2200000,
    initial_odometer_km: 0,
    current_odometer_km: 235,
    virtual_odometer_km: 235,
    odometer_source: 'GPS',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe đạp thể thao Thống Nhất MTB 26-05 lắp thêm ghế em bé, đèn hậu, túi treo',
  },
  {
    id: UUID_MAP.BIKE04,
    name: 'Xe đạp Thống Nhất MTB 20-05',
    asset_type: 'BICYCLE',
    category: 'Kids/Youth Bike',
    brand: 'THONGNHAT',
    model: 'MTB 20-05',
    year: 2024,
    color: 'Đỏ',
    license_plate: 'MTB 20-999',
    fuel_type: 'HUMAN_POWER',
    purchase_date: '2024-03-10',
    purchase_price: 2500000,
    current_value: 1800000,
    initial_odometer_km: 0,
    current_odometer_km: 235,
    virtual_odometer_km: 235,
    odometer_source: 'VIRTUAL',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe đạp trẻ em Thống Nhất MTB 20-05',
  },
  {
    id: UUID_MAP.CAR02,
    name: 'Kia Carnival (Dự kiến)',
    asset_type: 'CAR',
    category: 'MPV 7 chỗ',
    brand: 'KIA',
    model: 'Canival',
    year: 2030,
    color: 'Đen',
    license_plate: 'CANIVAL',
    fuel_type: 'PETROL',
    purchase_date: '2030-03-08',
    purchase_price: 2000000000,
    current_value: 2000000000,
    initial_odometer_km: 0,
    current_odometer_km: 0,
    virtual_odometer_km: 0,
    odometer_source: 'VIRTUAL',
    status: 'INACTIVE',
    description: 'Mục tiêu ô tô 7 chỗ gia đình tương lai',
  },
];

const MOCK_LOAN = {
  asset_id: UUID_MAP.CAR01,
  lender: 'TPBank',
  principal: 295000000,
  down_payment: 102000000,
  interest_rate_percent: 8.0,
  preferred_rate_percent: 8.0,
  preferred_months: 12,
  floating_rate_percent: 11.5,
  loan_ratio_percent: 74,
  term_months: 60,
  start_date: '2026-04-07',
  monthly_payment: 7378216,
  current_balance: 270918368,
  payment_day: 28,
  status: 'ACTIVE',
  notes: '8% năm đầu -> 11.5% các năm sau',
};

const MOCK_EXPENSES_RAW = [
  { asset_id: UUID_MAP.CAR01, date: '2026-03-08', category: 'INITIAL', amount: 10000000, currency: 'VND', vendor: 'Showroom Mazda', description: 'Đặt cọc lần 1' },
  { asset_id: UUID_MAP.CAR01, date: '2026-03-19', category: 'INITIAL', amount: 30000000, currency: 'VND', vendor: 'Showroom Mazda', description: 'Chuyển tiền lần 2' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-01', category: 'INITIAL', amount: 62000000, currency: 'VND', vendor: 'Showroom Mazda', description: 'Chuyển tiền lần 3 (Tiền mặt xe)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-05', category: 'REGISTRATION', amount: 40300000, currency: 'VND', vendor: 'Chi cục Thuế', description: 'Lệ phí trước bạ' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-05', category: 'REGISTRATION', amount: 3270700, currency: 'VND', vendor: 'Trạm Đăng Kiểm', description: 'Đăng kiểm, đường bộ, dân sự TNDS' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-07', category: 'REGISTRATION', amount: 1400000, currency: 'VND', vendor: 'Dịch vụ ĐK', description: 'Phí dịch vụ đăng ký biển số' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-06', category: 'INSURANCE', amount: 4300000, currency: 'VND', vendor: 'Bảo hiểm', description: 'Phí bảo hiểm thân vỏ' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-06', category: 'INITIAL', amount: 3440000, currency: 'VND', vendor: 'TPBank', description: 'Phí dịch vụ ngân hàng' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-06', category: 'INITIAL', amount: 3000000, currency: 'VND', vendor: 'Bảo hiểm khoản vay', description: 'Phí bảo hiểm khoản vay TPBank' },

  { asset_id: UUID_MAP.CAR01, date: '2026-05-09', category: 'UPGRADE', amount: 17000000, currency: 'VND', vendor: 'Zestech Auto', odometer_km: 593, description: 'Lắp màn hình ZX ADAS Limited' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-09', category: 'UPGRADE', amount: 1800000, currency: 'VND', vendor: 'Garage Gập Gương', odometer_km: 20, description: 'Gập gương điện' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-12', category: 'UPGRADE', amount: 2000000, currency: 'VND', odometer_km: 24, description: 'Phím media vô năng' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-12', category: 'UPGRADE', amount: 1500000, currency: 'VND', vendor: 'Zestech', odometer_km: 24, description: 'Cảm biến áp suất lốp Zestech (TPMS)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-12', category: 'UPGRADE', amount: 93000, currency: 'VND', odometer_km: 24, description: 'Bao chìa khoá' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-14', category: 'UPGRADE', amount: 70000, currency: 'VND', odometer_km: 108, description: 'Biển tên số điện thoại' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-19', category: 'UPGRADE', amount: 100000, currency: 'VND', odometer_km: 230, description: 'Sạc trên xe' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-19', category: 'UPGRADE', amount: 52000, currency: 'VND', odometer_km: 230, description: 'Thùng rác ô tô' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-19', category: 'UPGRADE', amount: 864000, currency: 'VND', odometer_km: 230, description: 'Thảm lót sàn' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-19', category: 'UPGRADE', amount: 2200000, currency: 'VND', odometer_km: 235, description: 'Máy rửa xe gia đình' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-21', category: 'UPGRADE', amount: 389000, currency: 'VND', vendor: 'Toyota', odometer_km: 235, description: 'Bơm lốp Toyota' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-26', category: 'UPGRADE', amount: 250000, currency: 'VND', odometer_km: 2163, description: 'Khử mùi trong xe vị cafe' },

  { asset_id: UUID_MAP.CAR01, date: '2026-04-09', category: 'FUEL', amount: 1000000, currency: 'VND', odometer_km: 12, description: 'Đổ xăng lần đầu 37,7L' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-17', category: 'TOLL', amount: 120000, currency: 'VND', vendor: 'Epass', odometer_km: 218, description: 'Phí đăng ký thẻ Epass' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-18', category: 'TOLL', amount: 6600, currency: 'VND', vendor: 'Epass', description: 'Trừ phí DV quản lý TK và TB xe qua trạm 04/2026' },
  { asset_id: UUID_MAP.CAR01, date: '2026-05-01', category: 'FUEL', amount: 500000, currency: 'VND', odometer_km: 412, description: 'Đổ xăng Ron95-III' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-30', category: 'PARKING', amount: 3250000, currency: 'VND', odometer_km: 409, description: 'Đổ bê tông sân đỗ xe' },
  { asset_id: UUID_MAP.CAR01, date: '2026-05-02', category: 'TOLL', amount: 13200, currency: 'VND', vendor: 'Epass', odometer_km: 479, description: 'Phí trạm 05/2026' },
  { asset_id: UUID_MAP.CAR01, date: '2026-05-09', category: 'FUEL', amount: 800000, currency: 'VND', odometer_km: 593, description: 'Đổ xăng Ron95-IV' },
  { asset_id: UUID_MAP.CAR01, date: '2026-05-27', category: 'FUEL', amount: 780000, currency: 'VND', odometer_km: 824, description: 'Đổ xăng Ron95-III' },
  { asset_id: UUID_MAP.CAR01, date: '2026-06-18', category: 'FUEL', amount: 600000, currency: 'VND', odometer_km: 1174, description: 'Đổ xăng E10 Ron95-V' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-01', category: 'FUEL', amount: 600105, currency: 'VND', odometer_km: 1531, description: 'Đổ xăng E10 Ron95-V' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-11', category: 'FUEL', amount: 600000, currency: 'VND', odometer_km: 1799, description: 'Đổ xăng E10 Ron95-V' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-23', category: 'FUEL', amount: 800000, currency: 'VND', odometer_km: 2109, description: 'Đổ xăng E10 Ron95-V' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-26', category: 'OTHER', amount: 50000, currency: 'VND', vendor: 'Anh Chung Lương', odometer_km: 2163, description: 'Rửa xe nhà anh Chung Lương' },
  { asset_id: UUID_MAP.CAR01, date: '2026-08-12', category: 'FUEL', amount: 600000, currency: 'VND', odometer_km: 2436, description: 'Đổ xăng E10 Ron95-V' },
  { asset_id: UUID_MAP.CAR01, date: '2026-08-23', category: 'FUEL', amount: 820073, currency: 'VND', odometer_km: 2646, description: 'Đổ xăng Ron95-V' },

  { asset_id: UUID_MAP.CAR01, date: '2026-04-28', category: 'OTHER', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 1 (04/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-04-28', category: 'OTHER', amount: 1357808, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 1 (04/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-05-27', category: 'OTHER', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 2 (05/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-05-27', category: 'OTHER', amount: 1773464, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 2 (05/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-06-26', category: 'OTHER', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 3 (06/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-06-26', category: 'OTHER', amount: 1922572, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 3 (06/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-26', category: 'OTHER', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 4 (07/2026)' },
  { asset_id: UUID_MAP.CAR01, date: '2026-07-26', category: 'OTHER', amount: 1881666, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 4 (07/2026)' },

  { asset_id: UUID_MAP.BIKE01, date: '2017-08-01', category: 'INITIAL', amount: 35000000, currency: 'VND', description: 'Mua xe Air Blade 2016' },
  { asset_id: UUID_MAP.BIKE02, date: '2021-04-05', category: 'INITIAL', amount: 45000000, currency: 'VND', description: 'Mua xe Air Blade 2021' },
  { asset_id: UUID_MAP.BIKE03, date: '2024-03-10', category: 'INITIAL', amount: 3000000, currency: 'VND', description: 'Mua xe MTB 26-05' },
  { asset_id: UUID_MAP.BIKE04, date: '2024-03-10', category: 'INITIAL', amount: 2500000, currency: 'VND', description: 'Mua xe MTB 20-05' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-02-21', category: 'UPGRADE', amount: 35000, currency: 'VND', description: 'Gác chân xe đạp' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 390000, currency: 'VND', description: 'Ghế ngồi trước cho bé' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 64900, currency: 'VND', description: 'Đèn trước xe đạp' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 36000, currency: 'VND', description: 'Mũ thể thao' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 67500, currency: 'VND', description: 'Đèn hậu xe đạp' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 24650, currency: 'VND', description: 'Giá bình nước' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 56000, currency: 'VND', description: 'Khóa dây' },
  { asset_id: UUID_MAP.BIKE03, date: '2025-04-21', category: 'UPGRADE', amount: 72000, currency: 'VND', description: 'Túi treo sườn' },
  { asset_id: UUID_MAP.BIKE04, date: '2025-06-21', category: 'MAINTENANCE', amount: 100000, currency: 'VND', description: 'Sửa phanh xe' },
  { asset_id: UUID_MAP.BIKE04, date: '2025-06-22', category: 'UPGRADE', amount: 100000, currency: 'VND', description: 'Đệm ghế sau' },
  { asset_id: UUID_MAP.BIKE04, date: '2023-02-23', category: 'MAINTENANCE', amount: 100000, currency: 'VND', description: 'Thay tay phanh' },
];

async function seed() {
  console.log('🚀 Executing direct Supabase Database Population...');
  
  // 1. Assets
  console.log('📦 Seeding Assets...');
  for (const asset of INITIAL_ASSETS) {
    const { error } = await supabase.from('assets').upsert(asset, { onConflict: 'id' });
    if (error) console.log(`Asset ${asset.name}:`, error.message);
    else console.log(`  ✓ Inserted Asset: ${asset.name}`);
  }

  // 2. Loans
  console.log('🏦 Seeding Loan...');
  const { error: lErr } = await supabase.from('loans').insert([MOCK_LOAN]);
  if (lErr) console.log('Loan status:', lErr.message);
  else console.log('  ✓ Inserted Loan: TPBank 295M');

  // 3. Expenses
  console.log(`💵 Seeding Expenses (${MOCK_EXPENSES_RAW.length} records)...`);
  const { error: eErr } = await supabase.from('expenses').insert(MOCK_EXPENSES_RAW.map(e => ({ id: genUuid(), ...e })));
  if (eErr) console.log('Expenses status:', eErr.message);
  else console.log(`  ✓ Inserted ${MOCK_EXPENSES_RAW.length} expense records into DB!`);

  console.log('🎉 SUPABASE DATABASE POPULATED SUCCESSFULLY!');
}

seed().catch(err => console.error('Seed Error:', err));
