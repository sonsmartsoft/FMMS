import { Asset, CardDisplaySettings, ExpenseRecord, LoanRecord, TripRecord, MaintenanceRecord } from '@/types/mobility';

export const REAL_ASSET_IDS = {
  MAZDA2_2026: '20260308-0001-4222-8888-19b213872026',
  AIRBLADE_2016: '20170801-0002-4111-8888-88c121063016',
  AIRBLADE_2021: '20210405-0003-4333-8888-88f160436021',
  MTB_26_05: '20240310-0004-4444-8888-000000260555',
  MTB_20_05: '20240310-0005-4555-8888-000000200555',
  CARNIVAL_2030: '20300308-0006-4666-8888-00000ca20300',
};

export const INITIAL_ASSETS: Asset[] = [
  {
    id: REAL_ASSET_IDS.MAZDA2_2026,
    name: 'Mazda 2AT 2026',
    asset_type: 'CAR',
    category: 'Sedan/Hatchback',
    brand: 'MAZDA',
    model: 'Mazda 2',
    year: 2026,
    trim: '1.5L AT',
    color: 'Đỏ Soul Red Crystal',
    license_plate: '30A-999.99',
    vin: 'DEMOVIN123456789',
    engine: '1.5L SkyActiv-G',
    fuel_type: 'PETROL',
    tank_capacity_liters: 44.0,
    purchase_date: '2026-03-08',
    purchase_price: 397000000,
    current_value: 380000000,
    current_market_value: 380000000,
    initial_odometer_km: 0,
    current_odometer_km: 2651,
    virtual_odometer_km: 2651,
    odometer_source: 'VIRTUAL',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe ô tô gia đình chính Mazda 2 (30A-999.99). Vay ngân hàng TPBank 295,000,000 ₫.',
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: true, has_obd: true, has_engine: true,
      has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: true, has_insurance: true, has_documents: true,
    },
    fuel_level_percent: 65,
    estimated_range_km: 410,
    avg_consumption_l100km: 6.8,
    next_maintenance_due: '5,000 km (hoặc 15/10/2026)',
    sales_rep_name: 'Cố vấn Dịch vụ',
    sales_rep_phone: '0900000001',
    brand_hotline: '1900 54 54 54',
  },
  {
    id: REAL_ASSET_IDS.AIRBLADE_2016,
    name: 'Honda Air Blade 2016',
    asset_type: 'MOTORCYCLE',
    category: 'Tay ga',
    brand: 'HONDA',
    model: 'Air Blade 2016',
    year: 2016,
    trim: '125cc FI',
    color: 'Đen Nhám',
    license_plate: '29B1-888.88',
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
    capabilities: {
      has_mileage: true, has_gps: false, has_fuel: true, has_obd: false, has_engine: true,
      has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: false, has_insurance: true, has_documents: true,
    },
    next_maintenance_due: 'Thay dầu nhớt mỗi 2,000 km',
  },
  {
    id: REAL_ASSET_IDS.AIRBLADE_2021,
    name: 'Honda Air Blade 2021',
    asset_type: 'MOTORCYCLE',
    category: 'Tay ga',
    brand: 'HONDA',
    model: 'Air Blade 2021',
    year: 2021,
    trim: '125cc Special',
    color: 'Xanh Xám',
    license_plate: '29B2-777.77',
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
    capabilities: {
      has_mileage: true, has_gps: false, has_fuel: true, has_obd: false, has_engine: true,
      has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: false, has_insurance: true, has_documents: true,
    },
    next_maintenance_due: 'Thay nhớt máy & nhớt lốp 2,500km',
  },
  {
    id: REAL_ASSET_IDS.MTB_26_05,
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
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: false, has_obd: false, has_engine: false,
      has_battery: false, has_ride: true, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: false, has_insurance: false, has_documents: true,
    },
    total_rides: 18,
    avg_speed_kmh: 18.5,
  },
  {
    id: REAL_ASSET_IDS.MTB_20_05,
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
    capabilities: {
      has_mileage: true, has_gps: false, has_fuel: false, has_obd: false, has_engine: false,
      has_battery: false, has_ride: true, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: false, has_insurance: false, has_documents: true,
    },
  },
  {
    id: REAL_ASSET_IDS.CARNIVAL_2030,
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
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: true, has_obd: true, has_engine: true,
      has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: true, has_insurance: true, has_documents: true,
    },
  },
];

export const DEFAULT_CARD_SETTINGS: CardDisplaySettings = {
  showPhoto: true, showName: true, showType: true, showPrice: true,
  showLicensePlate: true, showOdometer: true, showFuelLevel: true,
  showConsumption: true, showRange: true, showLoan: true,
  showNextMaintenance: true, cardStyle: 'grid',
};

// ── Real Fuel Logs (CAR01) ──────────────────────────────────
export interface FuelLog {
  id: string;
  date: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer_km: number;
  station: string;
  notes?: string;
  consumption_l100km?: number;
}

export const MOCK_FUEL_LOGS: FuelLog[] = [
  { id: 'f1', date: '2026-04-09', liters: 37.7, price_per_liter: 26525, total_cost: 1000000, odometer_km: 12, station: 'Cây xăng Thaco', notes: 'Đổ xăng lần đầu 37,7L', consumption_l100km: 6.8 },
  { id: 'f2', date: '2026-05-01', liters: 21.05, price_per_liter: 23750, total_cost: 500000, odometer_km: 412, station: 'CHX Ron95-III', consumption_l100km: 6.7 },
  { id: 'f3', date: '2026-05-09', liters: 31.68, price_per_liter: 25252, total_cost: 800000, odometer_km: 593, station: 'CHX Ron95-IV', consumption_l100km: 6.9 },
  { id: 'f4', date: '2026-05-27', liters: 30.54, price_per_liter: 25540, total_cost: 780000, odometer_km: 824, station: 'CHX Ron95-III', consumption_l100km: 6.8 },
  { id: 'f5', date: '2026-06-18', liters: 27.60, price_per_liter: 21739, total_cost: 600000, odometer_km: 1174, station: 'E10 Ron95-V', consumption_l100km: 6.7 },
  { id: 'f6', date: '2026-07-01', liters: 26.97, price_per_liter: 22250, total_cost: 600105, odometer_km: 1531, station: 'E10 Ron95-V', consumption_l100km: 6.9 },
  { id: 'f7', date: '2026-07-11', liters: 28.30, price_per_liter: 21201, total_cost: 600000, odometer_km: 1799, station: 'E10 Ron95-V', consumption_l100km: 6.8 },
  { id: 'f8', date: '2026-07-23', liters: 35.04, price_per_liter: 22831, total_cost: 800000, odometer_km: 2109, station: 'E10 Ron95-V', consumption_l100km: 6.6 },
  { id: 'f9', date: '2026-08-12', liters: 25.29, price_per_liter: 23724, total_cost: 600000, odometer_km: 2436, station: 'E10 Ron95-V', consumption_l100km: 6.8 },
  { id: 'f10', date: '2026-08-23', liters: 34.10, price_per_liter: 24049, total_cost: 820073, odometer_km: 2646, station: 'Ron95-V', consumption_l100km: 6.7 },
];

// ── Real Maintenance Records (CAR01, BIKE04) ───────────────
export const MOCK_MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: 'm1', asset_id: REAL_ASSET_IDS.MAZDA2_2026, maintenance_type: 'Bảo dưỡng định kỳ lần đầu mức 1000Km', date: '2026-07-16', odometer_km: 1920, cost: 1172016, vendor: 'Mazda Thaco', notes: 'Thay nhớt động cơ + lọc nhớt + kiểm tra 20 hạng mục Thaco', next_due_km: 5000, next_due_date: '2026-10-15', status: 'OK' },
  { id: 'm2', asset_id: REAL_ASSET_IDS.MTB_20_05, maintenance_type: 'Sửa phanh xe đạp MTB 20', date: '2025-06-21', odometer_km: 235, cost: 100000, vendor: 'Tiệm sửa xe', status: 'OK' },
  { id: 'm3', asset_id: REAL_ASSET_IDS.MTB_20_05, maintenance_type: 'Thay tay phanh xe đạp', date: '2023-02-23', odometer_km: 235, cost: 100000, vendor: 'Tiệm sửa xe', status: 'OK' },
];

// ── Real Expenses (Sheet Expenses - 60 records) ────────────
export const MOCK_EXPENSES: ExpenseRecord[] = [
  // CAR01 - Initial Costs
  { id: 'EX2026030801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-03-08', category: 'Initial', subcategory: 'Purchase', amount: 10000000, currency: 'VND', vendor: 'Showroom Mazda', description: 'Đặt cọc lần 1' },
  { id: 'EX2026031901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-03-19', category: 'Initial', subcategory: 'Purchase', amount: 30000000, currency: 'VND', vendor: 'Showroom Mazda', description: 'Chuyển tiền lần 2' },
  { id: 'EX2026040101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-01', category: 'Initial', subcategory: 'Purchase', amount: 62000000, currency: 'VND', vendor: 'Showroom Mazda', description: 'Chuyển tiền lần 3 (Tiền mặt xe)' },
  { id: 'EX2026040501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-05', category: 'Initial', subcategory: 'Registration', amount: 40300000, currency: 'VND', vendor: 'Chi cục Thuế', description: 'Lệ phí trước bạ' },
  { id: 'EX2026040502', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-05', category: 'Initial', subcategory: 'Registration', amount: 3270700, currency: 'VND', vendor: 'Trạm Đăng Kiểm', description: 'Đăng kiểm, đường bộ, dân sự TNDS' },
  { id: 'EX2026040701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-07', category: 'Initial', subcategory: 'Registration', amount: 1400000, currency: 'VND', vendor: 'Dịch vụ ĐK', description: 'Phí dịch vụ đăng ký biển số' },
  { id: 'EX2026040601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-06', category: 'Initial', subcategory: 'Insurance', amount: 4300000, currency: 'VND', vendor: 'Bảo hiểm', description: 'Phí bảo hiểm thân vỏ' },
  { id: 'EX2026040602', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-06', category: 'Initial', subcategory: 'Loan Fee', amount: 3440000, currency: 'VND', vendor: 'TPBank', description: 'Phí dịch vụ ngân hàng' },
  { id: 'EX2026040603', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-06', category: 'Initial', subcategory: 'Loan Insurance', amount: 3000000, currency: 'VND', vendor: 'Bảo hiểm khoản vay', description: 'Phí bảo hiểm khoản vay TPBank' },

  // CAR01 - Upgrades
  { id: 'EX2026040901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-09', category: 'Upgrade', subcategory: 'Screen', amount: 17000000, currency: 'VND', vendor: 'Zestech Auto', odometer_km: 593, description: 'Lắp màn hình ZX ADAS Limited' },
  { id: 'EX2026040902', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-09', category: 'Upgrade', subcategory: 'Mirror Folding', amount: 1800000, currency: 'VND', vendor: 'Garage Gập Gương', odometer_km: 20, description: 'Gập gương điện' },
  { id: 'EX2026041201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-12', category: 'Upgrade', subcategory: 'Control button', amount: 2000000, currency: 'VND', odometer_km: 24, description: 'Phím media vô năng' },
  { id: 'EX2026041202', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-12', category: 'Upgrade', subcategory: 'TPMS', amount: 1500000, currency: 'VND', vendor: 'Zestech', odometer_km: 24, description: 'Cảm biến áp suất lốp Zestech (TPMS)' },
  { id: 'EX2026041203', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-12', category: 'Upgrade', subcategory: 'Accessorie', amount: 93000, currency: 'VND', odometer_km: 24, description: 'Bao chìa khoá' },
  { id: 'EX2026041401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-14', category: 'Upgrade', subcategory: 'Accessorie', amount: 70000, currency: 'VND', odometer_km: 108, description: 'Biển tên số điện thoại' },
  { id: 'EX2026041901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-19', category: 'Upgrade', subcategory: 'Accessorie', amount: 100000, currency: 'VND', odometer_km: 230, description: 'Sạc trên xe' },
  { id: 'EX2026041902', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-19', category: 'Upgrade', subcategory: 'Accessorie', amount: 52000, currency: 'VND', odometer_km: 230, description: 'Thùng rác ô tô' },
  { id: 'EX2026041903', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-19', category: 'Upgrade', subcategory: 'Accessorie', amount: 864000, currency: 'VND', odometer_km: 230, description: 'Thảm lót sàn' },
  { id: 'EX2026041904', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-19', category: 'Running', subcategory: 'Car Wash', amount: 2200000, currency: 'VND', odometer_km: 235, description: 'Máy rửa xe gia đình' },
  { id: 'EX2026042101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-21', category: 'Upgrade', subcategory: 'Accessorie', amount: 389000, currency: 'VND', vendor: 'Toyota', odometer_km: 235, description: 'Bơm lốp Toyota' },
  { id: 'EX2026072604', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-26', category: 'Running', subcategory: 'Accessorie', amount: 250000, currency: 'VND', odometer_km: 2163, description: 'Khử mùi trong xe vị cafe' },

  // CAR01 - Running & Fuel
  { id: 'EX2026040903', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-09', category: 'Running', subcategory: 'Fuel', amount: 1000000, currency: 'VND', odometer_km: 12, description: 'Đổ xăng lần đầu 37,7L' },
  { id: 'EX2026041701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-17', category: 'Running', subcategory: 'Epass Fee', amount: 120000, currency: 'VND', vendor: 'Epass', odometer_km: 218, description: 'Phí đăng ký thẻ Epass' },
  { id: 'EX2026041801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-18', category: 'Running', subcategory: 'Epass Fee', amount: 6600, currency: 'VND', vendor: 'Epass', description: 'Trừ phí DV quản lý TK và TB xe qua trạm 04/2026' },
  { id: 'EX2026050101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-01', category: 'Running', subcategory: 'Fuel', amount: 500000, currency: 'VND', odometer_km: 412, description: 'Đổ xăng Ron95-III' },
  { id: 'EX2026043001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-30', category: 'Running', subcategory: 'Parking', amount: 3250000, currency: 'VND', odometer_km: 409, description: 'Đổ bê tông sân đỗ xe' },
  { id: 'EX2026050201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-02', category: 'Running', subcategory: 'Running Fine', amount: 13200, currency: 'VND', vendor: 'Epass', odometer_km: 479, description: 'Phí trạm 05/2026' },
  { id: 'EX2026050901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-09', category: 'Running', subcategory: 'Fuel', amount: 800000, currency: 'VND', odometer_km: 593, description: 'Đổ xăng Ron95-IV' },
  { id: 'EX2026052701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-27', category: 'Running', subcategory: 'Fuel', amount: 780000, currency: 'VND', odometer_km: 824, description: 'Đổ xăng Ron95-III' },
  { id: 'EX2026061801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-18', category: 'Running', subcategory: 'Fuel', amount: 600000, currency: 'VND', odometer_km: 1174, description: 'Đổ xăng E10 Ron95-V' },
  { id: 'EX2026070101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-01', category: 'Running', subcategory: 'Fuel', amount: 600105, currency: 'VND', odometer_km: 1531, description: 'Đổ xăng E10 Ron95-V' },
  { id: 'EX2026071101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-11', category: 'Running', subcategory: 'Fuel', amount: 600000, currency: 'VND', odometer_km: 1799, description: 'Đổ xăng E10 Ron95-V' },
  { id: 'EX2026072301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-23', category: 'Running', subcategory: 'Fuel', amount: 800000, currency: 'VND', odometer_km: 2109, description: 'Đổ xăng E10 Ron95-V' },
  { id: 'EX2026072603', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-26', category: 'Running', subcategory: 'Car Wash', amount: 50000, currency: 'VND', vendor: 'Trung tâm rửa xe', odometer_km: 2163, description: 'Rửa xe định kỳ' },
  { id: 'EX2026081201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-12', category: 'Running', subcategory: 'Fuel', amount: 600000, currency: 'VND', odometer_km: 2436, description: 'Đổ xăng E10 Ron95-V' },
  { id: 'EX2026082301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-23', category: 'Running', subcategory: 'Fuel', amount: 820073, currency: 'VND', odometer_km: 2646, description: 'Đổ xăng Ron95-V' },

  // CAR01 - Loan Payments
  { id: 'EX2026042801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-28', category: 'Loan', subcategory: 'Monthly Payment', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 1 (04/2026)' },
  { id: 'EX2026042802', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-28', category: 'Loan', subcategory: 'Interest', amount: 1357808, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 1 (04/2026)' },
  { id: 'EX2026052702', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-27', category: 'Loan', subcategory: 'Monthly Payment', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 2 (05/2026)' },
  { id: 'EX2026052703', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-27', category: 'Loan', subcategory: 'Interest', amount: 1773464, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 2 (05/2026)' },
  { id: 'EX2026062601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-26', category: 'Loan', subcategory: 'Monthly Payment', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 3 (06/2026)' },
  { id: 'EX2026062602', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-26', category: 'Loan', subcategory: 'Interest', amount: 1922572, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 3 (06/2026)' },
  { id: 'EX2026072601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-26', category: 'Loan', subcategory: 'Monthly Payment', amount: 6020408, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán gốc kỳ 4 (07/2026)' },
  { id: 'EX2026072602', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-26', category: 'Loan', subcategory: 'Interest', amount: 1881666, currency: 'VND', vendor: 'TPBank', description: 'Thanh toán lãi kỳ 4 (07/2026)' },

  // BIKE01, BIKE02, BIKE03, BIKE04
  { id: 'EX2017080101', asset_id: REAL_ASSET_IDS.AIRBLADE_2016, date: '2017-08-01', category: 'INITIAL', amount: 35000000, currency: 'VND', description: 'Mua xe Air Blade 2016' },
  { id: 'EX2021040501', asset_id: REAL_ASSET_IDS.AIRBLADE_2021, date: '2021-04-05', category: 'INITIAL', amount: 45000000, currency: 'VND', description: 'Mua xe Air Blade 2021' },
  { id: 'EX2024031001', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2024-03-10', category: 'INITIAL', amount: 3000000, currency: 'VND', description: 'Mua xe MTB 26-05' },
  { id: 'EX2024031002', asset_id: REAL_ASSET_IDS.MTB_20_05, date: '2024-03-10', category: 'INITIAL', amount: 2500000, currency: 'VND', description: 'Mua xe MTB 20-05' },
  { id: 'EX2025210201', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-02-21', category: 'UPGRADE', amount: 35000, currency: 'VND', description: 'Gác chân xe đạp' },
  { id: 'EX2025042101', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 390000, currency: 'VND', description: 'Ghế ngồi trước cho bé' },
  { id: 'EX2025042102', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 64900, currency: 'VND', description: 'Đèn trước xe đạp' },
  { id: 'EX2025042103', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 36000, currency: 'VND', description: 'Mũ thể thao' },
  { id: 'EX2025042104', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 67500, currency: 'VND', description: 'Đèn hậu xe đạp' },
  { id: 'EX2025042105', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 24650, currency: 'VND', description: 'Giá bình nước' },
  { id: 'EX2025042106', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 56000, currency: 'VND', description: 'Khóa dây' },
  { id: 'EX2025042107', asset_id: REAL_ASSET_IDS.MTB_26_05, date: '2025-04-21', category: 'UPGRADE', amount: 72000, currency: 'VND', description: 'Túi treo sườn' },
  { id: 'EX2025062101', asset_id: REAL_ASSET_IDS.MTB_20_05, date: '2025-06-21', category: 'MAINTENANCE', amount: 100000, currency: 'VND', description: 'Sửa phanh xe' },
  { id: 'EX2025062102', asset_id: REAL_ASSET_IDS.MTB_20_05, date: '2025-06-22', category: 'UPGRADE', amount: 100000, currency: 'VND', description: 'Đệm ghế sau' },
  { id: 'EX2026022301', asset_id: REAL_ASSET_IDS.MTB_20_05, date: '2023-02-23', category: 'MAINTENANCE', amount: 100000, currency: 'VND', description: 'Thay tay phanh' },
];

// ── Real Trips (CAR01 & BIKE03 Odometer Logs) ─────────────
export const MOCK_TRIPS: TripRecord[] = [
  { id: 't1', asset_id: REAL_ASSET_IDS.MAZDA2_2026, start_time: '2026-08-23T08:00:00', end_time: '2026-08-23T11:30:00', distance_km: 49.0, duration_seconds: 12600, fuel_used_liters: 3.3, average_consumption_l100km: 6.7, average_speed_kmh: 42.5, max_speed_kmh: 88, start_location: 'Điểm khởi hành A', end_location: 'Điểm đến B' },
  { id: 't2', asset_id: REAL_ASSET_IDS.MAZDA2_2026, start_time: '2026-08-20T07:15:00', end_time: '2026-08-20T08:45:00', distance_km: 96.0, duration_seconds: 5400, fuel_used_liters: 6.5, average_consumption_l100km: 6.8, average_speed_kmh: 64.0, max_speed_kmh: 100, start_location: 'Điểm A', end_location: 'Điểm B' },
  { id: 't3', asset_id: REAL_ASSET_IDS.MAZDA2_2026, start_time: '2026-08-15T09:00:00', end_time: '2026-08-15T10:15:00', distance_km: 36.0, duration_seconds: 4500, fuel_used_liters: 2.4, average_consumption_l100km: 6.7, average_speed_kmh: 28.8, max_speed_kmh: 60, start_location: 'Nội thành', end_location: 'Ngoại thành' },
  { id: 't4', asset_id: REAL_ASSET_IDS.MAZDA2_2026, start_time: '2026-07-15T08:00:00', end_time: '2026-07-15T09:30:00', distance_km: 40.0, duration_seconds: 5400, fuel_used_liters: 2.7, average_consumption_l100km: 6.75, average_speed_kmh: 26.6, max_speed_kmh: 55, start_location: 'Khu dân cư', end_location: 'Trung tâm dịch vụ' },
];

// ── Real TPBank Loan (LOAN01) ──────────────────────────────
export const MOCK_LOAN: LoanRecord = {
  id: 'l1',
  asset_id: REAL_ASSET_IDS.MAZDA2_2026,
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
  bank_contact_name: 'Chuyên viên Tín dụng',
  bank_contact_phone: '0900000002',
  bank_hotline: '1900 58 58 84',
  status: 'ACTIVE',
  notes: '8% năm đầu -> 11.5% các năm sau',
};

// ── Real Parts & Upgrades (CAR01) ──────────────────────────
export interface PartRecord {
  id: string;
  asset_id?: string;
  name: string;
  brand: string;
  category: string;
  install_date: string;
  cost: number;
  odometer_km: number;
  warranty_months?: number;
  notes?: string;
}

export const MOCK_PARTS: PartRecord[] = [
  // CAR01 (Mazda 2AT 2026) - 11 Upgrades & Accessories
  { id: 'p1', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Màn hình ZX ADAS Limited', brand: 'Zestech Auto', category: 'Màn hình & ADAS', install_date: '2026-05-09', cost: 17000000, odometer_km: 593, warranty_months: 24, notes: 'Màn hình thông minh tích hợp camera ADAS' },
  { id: 'p2', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Gập gương điện', brand: 'Gập Gương Auto', category: 'Ngoại thất', install_date: '2026-04-09', cost: 1800000, odometer_km: 20, warranty_months: 12, notes: 'Tự động gập gương khi khóa cửa' },
  { id: 'p3', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Phím media vô năng', brand: 'OEM Mazda', category: 'Nội thất', install_date: '2026-04-12', cost: 2000000, odometer_km: 24, warranty_months: 12, notes: 'Phím điều khiển âm thanh trên vô năng' },
  { id: 'p4', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Cảm biến áp suất lốp Zestech (TPMS)', brand: 'Zestech', category: 'An toàn & Lốp', install_date: '2026-04-12', cost: 1500000, odometer_km: 24, warranty_months: 24, notes: 'TPMS hiển thị áp suất lốp trực tiếp' },
  { id: 'p5', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Bao chìa khoá da', brand: 'OEM', category: 'Nội thất', install_date: '2026-04-12', cost: 93000, odometer_km: 24, warranty_months: 0, notes: 'Bao chìa khoá da sang trọng' },
  { id: 'p6', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Biển tên số điện thoại taplo', brand: 'OEM', category: 'Nội thất', install_date: '2026-04-14', cost: 70000, odometer_km: 108, warranty_months: 0, notes: 'Biển tên số điện thoại để taplo' },
  { id: 'p7', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Củ sạc nhanh trên xe', brand: 'Baseus', category: 'Điện tử', install_date: '2026-04-19', cost: 100000, odometer_km: 230, warranty_months: 6, notes: 'Củ sạc nhanh cắm tẩu 12V' },
  { id: 'p8', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Thùng rác mini ô tô', brand: 'OEM', category: 'Nội thất', install_date: '2026-04-19', cost: 52000, odometer_km: 230, warranty_months: 0, notes: 'Thùng rác mini gắn cửa xe' },
  { id: 'p9', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Bộ thảm lót sàn da 5D', brand: '5D Auto', category: 'Nội thất', install_date: '2026-04-19', cost: 864000, odometer_km: 230, warranty_months: 12, notes: 'Bộ thảm lót sàn da 5D may chuẩn form' },
  { id: 'p10', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Máy rửa xe cao áp gia đình', brand: 'Bosch', category: 'Thiết bị chăm sóc xe', install_date: '2026-04-19', cost: 2200000, odometer_km: 235, warranty_months: 6, notes: 'Máy rửa xe cao áp gia đình' },
  { id: 'p11', asset_id: REAL_ASSET_IDS.MAZDA2_2026, name: 'Bơm lốp Toyota điện tử', brand: 'Toyota', category: 'Thiết bị lốp', install_date: '2026-04-21', cost: 389000, odometer_km: 235, warranty_months: 12, notes: 'Bơm lốp điện tử cắm tẩu 12V' },
  // BIKE03 (Thống Nhất MTB 26-05)
  { id: 'p12', asset_id: REAL_ASSET_IDS.MTB_26_05, name: 'Gác chân xe đạp', brand: 'Thống Nhất', category: 'Phụ kiện', install_date: '2025-02-21', cost: 35000, odometer_km: 0, warranty_months: 0, notes: 'Gác chân sau' },
  { id: 'p13', asset_id: REAL_ASSET_IDS.MTB_26_05, name: 'Ghế ngồi trước cho bé', brand: 'Thống Nhất', category: 'Phụ kiện', install_date: '2025-04-21', cost: 390000, odometer_km: 0, warranty_months: 0, notes: 'Ghế em bé an toàn' },
  { id: 'p14', asset_id: REAL_ASSET_IDS.MTB_26_05, name: 'Đèn trước xe đạp', brand: 'OEM', category: 'Điện tử', install_date: '2025-04-21', cost: 64900, odometer_km: 0, warranty_months: 6, notes: 'Đèn LED siêu sáng' },
  { id: 'p15', asset_id: REAL_ASSET_IDS.MTB_26_05, name: 'Mũ thể thao', brand: 'OEM', category: 'Phụ kiện', install_date: '2025-04-21', cost: 36000, odometer_km: 0, warranty_months: 0, notes: 'Mũ bảo hiểm xe đạp' },
  { id: 'p16', asset_id: REAL_ASSET_IDS.MTB_26_05, name: 'Đèn hậu xe đạp', brand: 'OEM', category: 'Điện tử', install_date: '2025-04-21', cost: 67500, odometer_km: 0, warranty_months: 6, notes: 'Đèn LED cảnh báo sau' },
  { id: 'p17', asset_id: REAL_ASSET_IDS.MTB_26_05, name: 'Giá bình nước', brand: 'OEM', category: 'Phụ kiện', install_date: '2025-04-21', cost: 24650, odometer_km: 0, warranty_months: 0, notes: 'Gọng kẹp bình nước' },
];

export interface OdometerLogRecord {
  id: string;
  asset_id: string;
  date: string;
  odometer_km: number;
  note?: string;
}

export const MOCK_ODOMETER_LOGS: OdometerLogRecord[] = [
  { id: 'ODO2026040901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-09', odometer_km: 12, note: 'Nhận xe bàn giao' },
  { id: 'ODO2026041101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-11', odometer_km: 24, note: 'Lắp phụ kiện' },
  { id: 'ODO2026041201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-12', odometer_km: 108, note: 'Chuyến đi ngoại thành' },
  { id: 'ODO2026041401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-14', odometer_km: 195, note: 'Di chuyển cá nhân' },
  { id: 'ODO2026041701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-17', odometer_km: 218, note: 'Di chuyển hàng ngày' },
  { id: 'ODO2026041901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-19', odometer_km: 235, note: 'Chuyến đi công việc' },
  { id: 'ODO2026042301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-23', odometer_km: 251, note: '' },
  { id: 'ODO2026042501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-25', odometer_km: 281, note: '' },
  { id: 'ODO2026042601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-26', odometer_km: 386, note: '' },
  { id: 'ODO2026043001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-04-30', odometer_km: 409, note: '' },
  { id: 'ODO2026050101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-01', odometer_km: 437, note: '' },
  { id: 'ODO2026050201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-02', odometer_km: 479, note: 'Chuyến đi chơi lễ' },
  { id: 'ODO2026050301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-03', odometer_km: 525, note: '' },
  { id: 'ODO2026050401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-04', odometer_km: 568, note: '' },
  { id: 'ODO2026050701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-07', odometer_km: 583, note: '' },
  { id: 'ODO2026050901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-09', odometer_km: 601, note: '' },
  { id: 'ODO2026051001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-10', odometer_km: 653, note: 'Va quẹt nhẹ gương' },
  { id: 'ODO2026051101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-11', odometer_km: 683, note: '' },
  { id: 'ODO2026051201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-12', odometer_km: 686, note: '' },
  { id: 'ODO2026051301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-13', odometer_km: 720, note: '' },
  { id: 'ODO2026051801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-18', odometer_km: 730, note: '' },
  { id: 'ODO2026051901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-19', odometer_km: 732, note: '' },
  { id: 'ODO2026052001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-20', odometer_km: 771, note: '' },
  { id: 'ODO2026052201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-22', odometer_km: 784, note: '' },
  { id: 'ODO2026052401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-24', odometer_km: 804, note: '' },
  { id: 'ODO2026052701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-27', odometer_km: 824, note: '' },
  { id: 'ODO2026052801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-28', odometer_km: 853, note: '' },
  { id: 'ODO2026052901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-05-29', odometer_km: 913, note: '' },
  { id: 'ODO2026060301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-03', odometer_km: 989, note: '' },
  { id: 'ODO2026060401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-04', odometer_km: 1014, note: '' },
  { id: 'ODO2026060601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-06', odometer_km: 1035, note: '' },
  { id: 'ODO2026060701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-07', odometer_km: 1044, note: '' },
  { id: 'ODO2026061301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-13', odometer_km: 1109, note: '' },
  { id: 'ODO2026061401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-14', odometer_km: 1167, note: '' },
  { id: 'ODO2026061801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-18', odometer_km: 1176, note: 'Khảo sát lộ trình' },
  { id: 'ODO2026062101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-21', odometer_km: 1270, note: '' },
  { id: 'ODO2026062201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-22', odometer_km: 1286, note: '' },
  { id: 'ODO2026062401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-24', odometer_km: 1312, note: '' },
  { id: 'ODO2026062501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-25', odometer_km: 1332, note: '' },
  { id: 'ODO2026063001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-06-30', odometer_km: 1500, note: '' },
  { id: 'ODO2026070101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-01', odometer_km: 1531, note: '' },
  { id: 'ODO2026070201', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-02', odometer_km: 1614, note: '' },
  { id: 'ODO2026070301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-03', odometer_km: 1671, note: '' },
  { id: 'ODO2026070401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-04', odometer_km: 1686, note: '' },
  { id: 'ODO2026070501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-05', odometer_km: 1722, note: '' },
  { id: 'ODO2026070701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-07', odometer_km: 1752, note: '' },
  { id: 'ODO2026070801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-08', odometer_km: 1765, note: '' },
  { id: 'ODO2026071001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-10', odometer_km: 1796, note: '' },
  { id: 'ODO2026071401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-14', odometer_km: 1880, note: '' },
  { id: 'ODO2026071501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-15', odometer_km: 1920, note: 'Bảo dưỡng lần đầu Thaco' },
  { id: 'ODO2026071601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-16', odometer_km: 1944, note: '' },
  { id: 'ODO2026071701', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-17', odometer_km: 1975, note: '' },
  { id: 'ODO2026071801', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-18', odometer_km: 1997, note: '' },
  { id: 'ODO2026072301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-23', odometer_km: 2109, note: '' },
  { id: 'ODO2026072401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-24', odometer_km: 2132, note: '' },
  { id: 'ODO2026072501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-25', odometer_km: 2151, note: '' },
  { id: 'ODO2026072601', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-26', odometer_km: 2163, note: '' },
  { id: 'ODO2026073101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-07-31', odometer_km: 2265, note: '' },
  { id: 'ODO2026080101', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-01', odometer_km: 2292, note: '' },
  { id: 'ODO2026080401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-04', odometer_km: 2351, note: '' },
  { id: 'ODO2026080901', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-09', odometer_km: 2436, note: '' },
  { id: 'ODO2026081401', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-14', odometer_km: 2470, note: '' },
  { id: 'ODO2026081501', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-15', odometer_km: 2506, note: '' },
  { id: 'ODO2026082001', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-20', odometer_km: 2602, note: '' },
  { id: 'ODO2026082301', asset_id: REAL_ASSET_IDS.MAZDA2_2026, date: '2026-08-23', odometer_km: 2651, note: '' },
];
