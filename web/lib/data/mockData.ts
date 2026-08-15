import { Asset, CardDisplaySettings, ExpenseRecord, LoanRecord, TripRecord, MaintenanceRecord } from '@/types/mobility';

export const INITIAL_ASSETS: Asset[] = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Mazda2 Base 2026',
    asset_type: 'CAR',
    category: 'Hatchback',
    brand: 'Mazda',
    model: 'Mazda2',
    year: 2026,
    trim: 'Base 1.5L AT',
    color: 'Xám Kim Loại',
    license_plate: '30A-888.88',
    vin: 'JM1DJ1010102026',
    engine: '1.5L SkyActiv-G',
    fuel_type: 'PETROL',
    tank_capacity_liters: 44.0,
    purchase_date: '2026-01-10',
    purchase_price: 520000000,
    current_value: 490000000,
    initial_odometer_km: 0,
    current_odometer_km: 12846,
    virtual_odometer_km: 12846,
    odometer_source: 'VIRTUAL',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe ô tô gia đình chính. Trang bị màn hình ZESTECH 9 inch + Konnwei KW906 OBD-II',
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: true, has_obd: true, has_engine: true,
      has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: true, has_insurance: true, has_documents: true,
    },
    fuel_level_percent: 54,
    estimated_range_km: 365,
    avg_consumption_l100km: 6.9,
    next_maintenance_due: '15,000 km (hoặc 15/10/2026)',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Road Bike Specialized',
    asset_type: 'BICYCLE',
    category: 'Road Bike',
    brand: 'Specialized',
    model: 'Tarmac SL7',
    year: 2025,
    trim: 'Expert Disc',
    color: 'Đen Nhám',
    fuel_type: 'HUMAN_POWER',
    purchase_date: '2025-06-15',
    purchase_price: 85000000,
    current_value: 78000000,
    initial_odometer_km: 0,
    current_odometer_km: 2842,
    virtual_odometer_km: 2842,
    odometer_source: 'GPS',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe đạp đường trường thể thao rèn luyện sức khỏe',
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: false, has_obd: false, has_engine: false,
      has_battery: false, has_ride: true, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: false, has_insurance: false, has_documents: true,
    },
    total_rides: 42,
    avg_speed_kmh: 29.6,
    next_maintenance_due: 'Kiểm tra dầu xích (sau 100km)',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'VinFast Feliz S E-Scooter',
    asset_type: 'E_BIKE',
    category: 'E-Scooter',
    brand: 'VinFast',
    model: 'Feliz S',
    year: 2026,
    trim: 'LFP Battery',
    color: 'Trắng',
    license_plate: '29-MD1-999.99',
    fuel_type: 'ELECTRIC',
    battery_capacity_kwh: 3.5,
    purchase_date: '2026-03-20',
    purchase_price: 29900000,
    current_value: 27000000,
    initial_odometer_km: 0,
    current_odometer_km: 1420,
    virtual_odometer_km: 1420,
    odometer_source: 'GPS',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop',
    description: 'Xe máy điện đi lại hằng ngày đưa đón con học',
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: false, has_obd: false, has_engine: false,
      has_battery: true, has_ride: true, has_maintenance: true, has_parts: true,
      has_upgrades: false, has_finance: false, has_insurance: true, has_documents: true,
    },
    fuel_level_percent: 82,
    estimated_range_km: 145,
    next_maintenance_due: '3,000 km',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    name: 'BMW S1000RR Motor',
    asset_type: 'MOTORCYCLE',
    category: 'Superbike',
    brand: 'BMW',
    model: 'S1000RR',
    year: 2024,
    trim: 'M Package',
    color: 'Xanh Đỏ M',
    license_plate: '30A-666.66',
    vin: 'WB10E210998877',
    engine: '999cc ShiftCam Inline-4',
    fuel_type: 'PETROL',
    tank_capacity_liters: 16.5,
    purchase_date: '2024-11-05',
    purchase_price: 980000000,
    current_value: 920000000,
    initial_odometer_km: 0,
    current_odometer_km: 4500,
    virtual_odometer_km: 4500,
    odometer_source: 'OBD',
    status: 'ACTIVE',
    image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop',
    description: 'Mô tô phân khối lớn đi phượt dã ngoại xa',
    capabilities: {
      has_mileage: true, has_gps: true, has_fuel: true, has_obd: true, has_engine: true,
      has_battery: false, has_ride: false, has_maintenance: true, has_parts: true,
      has_upgrades: true, has_finance: true, has_insurance: true, has_documents: true,
    },
    fuel_level_percent: 68,
    estimated_range_km: 210,
    avg_consumption_l100km: 6.2,
    next_maintenance_due: '5,000 km',
  },
];

export const DEFAULT_CARD_SETTINGS: CardDisplaySettings = {
  showPhoto: true, showName: true, showType: true, showPrice: true,
  showLicensePlate: true, showOdometer: true, showFuelLevel: true,
  showConsumption: true, showRange: true, showLoan: true,
  showNextMaintenance: true, cardStyle: 'grid',
};

// ── Fuel Logs ──────────────────────────────────────────────
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
  { id: 'f1', date: '2026-08-14', liters: 35.0, price_per_liter: 23100, total_cost: 808500, odometer_km: 12820, station: 'PV OIL CH 12 - Cầu Giấy', consumption_l100km: 7.1 },
  { id: 'f2', date: '2026-07-28', liters: 30.5, price_per_liter: 22900, total_cost: 698450, odometer_km: 12420, station: 'Petrolimex Đống Đa', consumption_l100km: 6.8 },
  { id: 'f3', date: '2026-07-10', liters: 33.0, price_per_liter: 23000, total_cost: 759000, odometer_km: 11940, station: 'PV OIL Hà Đông', consumption_l100km: 6.9 },
  { id: 'f4', date: '2026-06-25', liters: 28.5, price_per_liter: 22800, total_cost: 649800, odometer_km: 11460, station: 'Petrolimex Thanh Xuân', consumption_l100km: 7.0 },
  { id: 'f5', date: '2026-06-05', liters: 40.5, price_per_liter: 22500, total_cost: 911250, odometer_km: 11040, station: 'Shell Hoàng Quốc Việt', consumption_l100km: 6.7, notes: 'Đổ đầy trước chuyến Hà Nội - Hải Phòng' },
];

// ── Maintenance Records ────────────────────────────────────
export const MOCK_MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  { id: 'm1', asset_id: '22222222-2222-2222-2222-222222222222', maintenance_type: 'Thay dầu máy định kỳ 10,000 km', date: '2026-08-01', odometer_km: 10000, cost: 1250000, vendor: 'Mazda Hà Đông', notes: 'Dầu Mazda Original 5W-30, lọc dầu, lọc khí', next_due_km: 15000, next_due_date: '2026-10-15', status: 'OK' },
  { id: 'm2', asset_id: '22222222-2222-2222-2222-222222222222', maintenance_type: 'Kiểm tra phanh & lốp', date: '2026-05-15', odometer_km: 7500, cost: 350000, vendor: 'Mazda Cầu Giấy', next_due_km: 15000, status: 'OK' },
  { id: 'm3', asset_id: '22222222-2222-2222-2222-222222222222', maintenance_type: 'Thay lọc gió điều hòa', date: '2026-04-01', odometer_km: 6000, cost: 280000, vendor: 'Mazda Hà Đông', status: 'OK' },
  { id: 'm4', asset_id: '22222222-2222-2222-2222-222222222222', maintenance_type: 'Cân chỉnh góc đặt bánh (Wheel Alignment)', date: '2026-01-20', odometer_km: 200, cost: 400000, vendor: 'Mazda Hà Đông', status: 'OK', notes: 'Sau khi nhận xe mới' },
];

// ── Expenses ───────────────────────────────────────────────
export const MOCK_EXPENSES: ExpenseRecord[] = [
  { id: 'e1', asset_id: '22222222-2222-2222-2222-222222222222', date: '2026-08-14', category: 'FUEL', amount: 808500, currency: 'VND', vendor: 'PV OIL CH 12', odometer_km: 12820, description: 'Đổ xăng đầy 35L @ 23,100₫/L' },
  { id: 'e2', asset_id: '22222222-2222-2222-2222-222222222222', date: '2026-08-01', category: 'MAINTENANCE', amount: 1250000, currency: 'VND', vendor: 'Mazda Hà Đông', description: 'Bảo dưỡng định kỳ 10,000 km' },
  { id: 'e3', asset_id: '22222222-2222-2222-2222-222222222222', date: '2026-07-20', category: 'PARKING', amount: 120000, currency: 'VND', description: 'Phí đỗ xe tháng 7 - Tòa nhà Cầu Giấy' },
  { id: 'e4', asset_id: '22222222-2222-2222-2222-222222222222', date: '2026-07-28', category: 'FUEL', amount: 698450, currency: 'VND', vendor: 'Petrolimex Đống Đa', description: 'Đổ xăng 30.5L @ 22,900₫/L' },
  { id: 'e5', asset_id: '22222222-2222-2222-2222-222222222222', date: '2026-07-01', category: 'INSURANCE', amount: 6500000, currency: 'VND', vendor: 'Bảo Việt', description: 'Bảo hiểm vật chất xe ô tô năm 2026' },
  { id: 'e6', asset_id: '22222222-2222-2222-2222-222222222222', date: '2026-01-10', category: 'REGISTRATION', amount: 1200000, currency: 'VND', vendor: 'Cục Đăng kiểm', description: 'Đăng ký biển số + đăng kiểm xe mới' },
];

// ── Trips ──────────────────────────────────────────────────
export const MOCK_TRIPS: TripRecord[] = [
  { id: 't1', asset_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-15T07:15:00', end_time: '2026-08-15T09:00:00', distance_km: 118.5, duration_seconds: 6300, fuel_used_liters: 8.2, average_consumption_l100km: 6.92, average_speed_kmh: 68.2, max_speed_kmh: 112, start_location: 'Cầu Giấy, Hà Nội', end_location: 'Hải Phòng' },
  { id: 't2', asset_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-14T07:45:00', end_time: '2026-08-14T08:17:00', distance_km: 12.4, duration_seconds: 1920, fuel_used_liters: 0.95, average_consumption_l100km: 7.66, average_speed_kmh: 24.5, max_speed_kmh: 58, start_location: 'Cầu Giấy', end_location: 'Hoàn Kiếm' },
  { id: 't3', asset_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-12T17:30:00', end_time: '2026-08-12T18:05:00', distance_km: 9.8, duration_seconds: 2100, fuel_used_liters: 0.82, average_consumption_l100km: 8.37, average_speed_kmh: 18.9, max_speed_kmh: 45, start_location: 'Hoàn Kiếm', end_location: 'Cầu Giấy' },
  { id: 't4', asset_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-10T08:00:00', end_time: '2026-08-10T09:30:00', distance_km: 68.0, duration_seconds: 5400, fuel_used_liters: 4.8, average_consumption_l100km: 7.06, average_speed_kmh: 45.3, max_speed_kmh: 95, start_location: 'Hà Nội', end_location: 'Hà Nam' },
  { id: 't5', asset_id: '22222222-2222-2222-2222-222222222222', start_time: '2026-08-05T06:30:00', end_time: '2026-08-05T07:00:00', distance_km: 14.2, duration_seconds: 1800, fuel_used_liters: 1.1, average_consumption_l100km: 7.75, average_speed_kmh: 28.4, max_speed_kmh: 65, start_location: 'Thanh Xuân', end_location: 'Đông Anh' },
];

// ── Loan ───────────────────────────────────────────────────
export const MOCK_LOAN: LoanRecord = {
  id: 'l1',
  asset_id: '22222222-2222-2222-2222-222222222222',
  lender: 'BIDV Chi Nhánh Cầu Giấy',
  principal: 250000000,
  down_payment: 270000000,
  interest_rate_percent: 7.5,
  term_months: 60,
  monthly_payment: 7800000,
  current_balance: 210000000,
  payment_day: 15,
  status: 'ACTIVE',
};

// ── Parts ─────────────────────────────────────────────────
export interface PartRecord {
  id: string;
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
  { id: 'p1', name: 'Màn hình ZESTECH 9" Android', brand: 'ZESTECH', category: 'Điện tử & Giải trí', install_date: '2026-01-15', cost: 8500000, odometer_km: 150, warranty_months: 12, notes: 'Android 10, WiFi, GPS, OBD-II tích hợp' },
  { id: 'p2', name: 'Camera hành trình Vietmap S73', brand: 'Vietmap', category: 'Camera', install_date: '2026-01-15', cost: 2900000, odometer_km: 150, warranty_months: 12, notes: 'Tích hợp cảnh báo tốc độ, camera trước sau' },
  { id: 'p3', name: 'Phủ sơn PPF bộ phần đầu xe', brand: 'STEK', category: 'Bảo vệ sơn', install_date: '2026-02-01', cost: 4200000, odometer_km: 300, warranty_months: 60, notes: 'PPF tàng hình, tự phục hồi' },
];
