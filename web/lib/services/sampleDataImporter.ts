import { getAssets, createAsset, getUserContext } from '@/lib/services/assetService';
import { createFuelLog } from '@/lib/services/fuelService';
import { createMaintenanceRecord } from '@/lib/services/maintenanceService';
import { createExpense } from '@/lib/services/expenseService';
import { createTrip } from '@/lib/services/tripService';
import { createPart } from '@/lib/services/partService';
import { createInsurancePolicy } from '@/lib/services/insuranceService';
import { createRegistration } from '@/lib/services/registrationService';
import { createLoan } from '@/lib/services/loanService';

const MOCK_IDS = {
  mazda: '22222222-2222-2222-2222-222222222222',
  bicycle: '33333333-3333-3333-3333-333333333333',
  ebike: '44444444-4444-4444-4444-444444444444',
  moto: '55555555-5555-5555-5555-555555555555',
};

export interface ImportResult {
  alreadyImported?: boolean;
  assets: number;
  fuelLogs: number;
  maintenance: number;
  expenses: number;
  trips: number;
  parts: number;
  insurance: number;
  registrations: number;
  loans: number;
  errors: string[];
}

const ASSET_DEFS: Array<{
  mockId: string;
  data: Parameters<typeof createAsset>[0];
}> = [
  {
    mockId: MOCK_IDS.mazda,
    data: {
      name: 'Mazda2 Base 2026', asset_type: 'CAR', category: 'Hatchback',
      brand: 'Mazda', model: 'Mazda2', year: 2026, trim: 'Base 1.5L AT',
      color: 'Xám Kim Loại', license_plate: '30A-888.88', vin: 'JM1DJ1010102026',
      engine: '1.5L SkyActiv-G', fuel_type: 'PETROL', tank_capacity_liters: 44,
      purchase_date: '2026-01-10', purchase_price: 520000000, current_value: 490000000,
      current_odometer_km: 12846, virtual_odometer_km: 12846, odometer_source: 'VIRTUAL',
      image_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=1000&auto=format&fit=crop',
      description: 'Xe ô tô gia đình chính. Trang bị màn hình ZESTECH 9 inch + Konnwei KW906 OBD-II',
      capabilities: { has_mileage: true, has_gps: true, has_fuel: true, has_obd: true, has_engine: true, has_battery: false, has_ride: false, has_maintenance: true, has_parts: true, has_upgrades: true, has_finance: true, has_insurance: true, has_documents: true },
    },
  },
  {
    mockId: MOCK_IDS.bicycle,
    data: {
      name: 'Road Bike Specialized', asset_type: 'BICYCLE', category: 'Road Bike',
      brand: 'Specialized', model: 'Tarmac SL7', year: 2025, trim: 'Expert Disc',
      color: 'Đen Nhám', fuel_type: 'HUMAN_POWER',
      purchase_date: '2025-06-15', purchase_price: 85000000, current_value: 78000000,
      current_odometer_km: 2842, virtual_odometer_km: 2842, odometer_source: 'GPS',
      image_url: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?q=80&w=1000&auto=format&fit=crop',
      description: 'Xe đạp đường trường thể thao rèn luyện sức khỏe',
      capabilities: { has_mileage: true, has_gps: true, has_fuel: false, has_obd: false, has_engine: false, has_battery: false, has_ride: true, has_maintenance: true, has_parts: true, has_upgrades: true, has_finance: false, has_insurance: false, has_documents: true },
    },
  },
  {
    mockId: MOCK_IDS.ebike,
    data: {
      name: 'VinFast Feliz S E-Scooter', asset_type: 'E_BIKE', category: 'E-Scooter',
      brand: 'VinFast', model: 'Feliz S', year: 2026, trim: 'LFP Battery',
      color: 'Trắng', license_plate: '29-MD1-999.99', fuel_type: 'ELECTRIC',
      battery_capacity_kwh: 3.5,
      purchase_date: '2026-03-20', purchase_price: 29900000, current_value: 27000000,
      current_odometer_km: 1420, virtual_odometer_km: 1420, odometer_source: 'GPS',
      image_url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=1000&auto=format&fit=crop',
      description: 'Xe máy điện đi lại hằng ngày đưa đón con học',
      capabilities: { has_mileage: true, has_gps: true, has_fuel: false, has_obd: false, has_engine: false, has_battery: true, has_ride: true, has_maintenance: true, has_parts: true, has_upgrades: false, has_finance: false, has_insurance: true, has_documents: true },
    },
  },
  {
    mockId: MOCK_IDS.moto,
    data: {
      name: 'BMW S1000RR Motor', asset_type: 'MOTORCYCLE', category: 'Superbike',
      brand: 'BMW', model: 'S1000RR', year: 2024, trim: 'M Package',
      color: 'Xanh Đỏ M', license_plate: '30A-666.66', vin: 'WB10E210998877',
      engine: '999cc ShiftCam Inline-4', fuel_type: 'PETROL', tank_capacity_liters: 16.5,
      purchase_date: '2024-11-05', purchase_price: 980000000, current_value: 920000000,
      current_odometer_km: 4500, virtual_odometer_km: 4500, odometer_source: 'OBD',
      image_url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=1000&auto=format&fit=crop',
      description: 'Mô tô phân khối lớn đi phượt dã ngoại xa',
      capabilities: { has_mileage: true, has_gps: true, has_fuel: true, has_obd: true, has_engine: true, has_battery: false, has_ride: false, has_maintenance: true, has_parts: true, has_upgrades: true, has_finance: true, has_insurance: true, has_documents: true },
    },
  },
];

export async function importSampleData(): Promise<ImportResult> {
  const result: ImportResult = { assets: 0, fuelLogs: 0, maintenance: 0, expenses: 0, trips: 0, parts: 0, insurance: 0, registrations: 0, loans: 0, errors: [] };

  const { userId } = await getUserContext();
  if (!userId) throw new Error('Bạn cần đăng nhập trước khi import dữ liệu mẫu');

  const existing = await getAssets();
  if (existing.length > 0) {
    return { ...result, alreadyImported: true };
  }

  // 1. Assets
  const ids: Record<string, string> = {};
  for (const def of ASSET_DEFS) {
    try {
      const created = await createAsset(def.data);
      ids[def.mockId] = created.id;
      result.assets++;
    } catch (e: any) {
      result.errors.push(`Tạo xe ${def.data.name}: ${e?.message ?? e}`);
    }
  }

  const mazda = ids[MOCK_IDS.mazda];
  const ebike = ids[MOCK_IDS.ebike];
  const moto = ids[MOCK_IDS.moto];
  if (!mazda) {
    result.errors.push('Không thể import dữ liệu con vì xe chính (Mazda2) không tạo được');
    return result;
  }

  // 2. Fuel logs (Mazda2)
  const FUEL = [
    { date: '2026-08-14', liters: 35.0, price: 23100, odo: 12820, station: 'PV OIL CH 12 - Cầu Giấy' },
    { date: '2026-07-28', liters: 30.5, price: 22900, odo: 12420, station: 'Petrolimex Đống Đa' },
    { date: '2026-07-10', liters: 33.0, price: 23000, odo: 11940, station: 'PV OIL Hà Đông' },
    { date: '2026-06-25', liters: 28.5, price: 22800, odo: 11460, station: 'Petrolimex Thanh Xuân' },
    { date: '2026-06-05', liters: 40.5, price: 22500, odo: 11040, station: 'Shell Hoàng Quốc Việt', notes: 'Đổ đầy trước chuyến Hà Nội - Hải Phòng' },
  ];
  for (const f of FUEL) {
    try {
      await createFuelLog({ asset_id: mazda, timestamp: `${f.date}T08:00:00Z`, odometer_km: f.odo, fuel_liters: f.liters, price_per_liter: f.price, station: f.station, tank_full: true, notes: (f as any).notes });
      result.fuelLogs++;
    } catch (e: any) { result.errors.push(`Fuel log ${f.date}: ${e?.message ?? e}`); }
  }

  // 3. Maintenance (Mazda2)
  const MAINT = [
    { type: 'Thay dầu máy định kỳ 10,000 km', date: '2026-08-01', odo: 10000, cost: 1250000, vendor: 'Mazda Hà Đông', notes: 'Dầu Mazda Original 5W-30, lọc dầu, lọc khí', next_km: 15000, next_date: '2026-10-15' },
    { type: 'Kiểm tra phanh & lốp', date: '2026-05-15', odo: 7500, cost: 350000, vendor: 'Mazda Cầu Giấy', next_km: 15000 },
    { type: 'Thay lọc gió điều hòa', date: '2026-04-01', odo: 6000, cost: 280000, vendor: 'Mazda Hà Đông' },
    { type: 'Cân chỉnh góc đặt bánh (Wheel Alignment)', date: '2026-01-20', odo: 200, cost: 400000, vendor: 'Mazda Hà Đông', notes: 'Sau khi nhận xe mới' },
  ];
  for (const m of MAINT) {
    try {
      await createMaintenanceRecord({ asset_id: mazda, maintenance_type: m.type, date: m.date, odometer_km: m.odo, cost: m.cost, vendor: m.vendor, notes: (m as any).notes, next_due_km: (m as any).next_km, next_due_date: (m as any).next_date });
      result.maintenance++;
    } catch (e: any) { result.errors.push(`Bảo dưỡng ${m.type}: ${e?.message ?? e}`); }
  }

  // 4. Expenses (Mazda2)
  const EXP = [
    { date: '2026-08-14', cat: 'FUEL', amount: 808500, vendor: 'PV OIL CH 12', odo: 12820, desc: 'Đổ xăng đầy 35L @ 23,100₫/L' },
    { date: '2026-08-01', cat: 'MAINTENANCE', amount: 1250000, vendor: 'Mazda Hà Đông', desc: 'Bảo dưỡng định kỳ 10,000 km' },
    { date: '2026-07-20', cat: 'PARKING', amount: 120000, desc: 'Phí đỗ xe tháng 7 - Tòa nhà Cầu Giấy' },
    { date: '2026-07-28', cat: 'FUEL', amount: 698450, vendor: 'Petrolimex Đống Đa', desc: 'Đổ xăng 30.5L @ 22,900₫/L' },
    { date: '2026-07-01', cat: 'INSURANCE', amount: 6500000, vendor: 'Bảo Việt', desc: 'Bảo hiểm vật chất xe ô tô năm 2026' },
    { date: '2026-01-10', cat: 'REGISTRATION', amount: 1200000, vendor: 'Cục Đăng kiểm', desc: 'Đăng ký biển số + đăng kiểm xe mới' },
  ];
  for (const e of EXP) {
    try {
      await createExpense({ asset_id: mazda, date: e.date, category: e.cat as any, amount: e.amount, vendor: e.vendor, odometer_km: e.odo, description: e.desc });
      result.expenses++;
    } catch (err: any) { result.errors.push(`Chi phí ${e.date}: ${err?.message ?? err}`); }
  }

  // 5. Trips (Mazda2)
  const TRIPS = [
    { s: '2026-08-15T07:15:00', e: '2026-08-15T09:00:00', d: 118.5, dur: 6300, fuel: 8.2, spd: 68.2, max: 112, a: 'Cầu Giấy, Hà Nội', b: 'Hải Phòng' },
    { s: '2026-08-14T07:45:00', e: '2026-08-14T08:17:00', d: 12.4, dur: 1920, fuel: 0.95, spd: 24.5, max: 58, a: 'Cầu Giấy', b: 'Hoàn Kiếm' },
    { s: '2026-08-12T17:30:00', e: '2026-08-12T18:05:00', d: 9.8, dur: 2100, fuel: 0.82, spd: 18.9, max: 45, a: 'Hoàn Kiếm', b: 'Cầu Giấy' },
    { s: '2026-08-10T08:00:00', e: '2026-08-10T09:30:00', d: 68.0, dur: 5400, fuel: 4.8, spd: 45.3, max: 95, a: 'Hà Nội', b: 'Hà Nam' },
    { s: '2026-08-05T06:30:00', e: '2026-08-05T07:00:00', d: 14.2, dur: 1800, fuel: 1.1, spd: 28.4, max: 65, a: 'Thanh Xuân', b: 'Đông Anh' },
  ];
  for (const t of TRIPS) {
    try {
      await createTrip({ asset_id: mazda, start_time: t.s, end_time: t.e, distance_km: t.d, duration_seconds: t.dur, fuel_used_liters: t.fuel, average_speed_kmh: t.spd, max_speed_kmh: t.max, start_location: t.a, end_location: t.b });
      result.trips++;
    } catch (err: any) { result.errors.push(`Chuyến ${t.s}: ${err?.message ?? err}`); }
  }

  // 6. Parts (Mazda2)
  const PARTS = [
    { name: 'Màn hình ZESTECH 9" Android', brand: 'ZESTECH', supplier: 'Điện tử & Giải trí', date: '2026-01-15', cost: 8500000, odo: 150, notes: 'Android 10, WiFi, GPS, OBD-II tích hợp' },
    { name: 'Camera hành trình Vietmap S73', brand: 'Vietmap', supplier: 'Camera', date: '2026-01-15', cost: 2900000, odo: 150, notes: 'Tích hợp cảnh báo tốc độ, camera trước sau' },
    { name: 'Phủ sơn PPF bộ phần đầu xe', brand: 'STEK', supplier: 'Bảo vệ sơn', date: '2026-02-01', cost: 4200000, odo: 300, notes: 'PPF tàng hình, tự phục hồi' },
  ];
  for (const p of PARTS) {
    try {
      await createPart({ asset_id: mazda, part_name: p.name, brand: p.brand, supplier: p.supplier, installation_date: p.date, cost: p.cost, installed_odometer_km: p.odo, notes: p.notes });
      result.parts++;
    } catch (err: any) { result.errors.push(`Phụ tùng ${p.name}: ${err?.message ?? err}`); }
  }

  // 7. Insurance
  const INS = [
    { assetId: mazda, provider: 'PTI', policy_number: 'TNDS-MAZDA2-2026', policy_type: 'MANDATORY' as const, start: '2026-01-10', expiry: '2027-01-10', cost: 486000 },
    { assetId: mazda, provider: 'Bảo Việt Insurance', policy_number: 'BV-CAR-2026-01', policy_type: 'COMPREHENSIVE' as const, start: '2026-01-10', expiry: '2027-01-10', cost: 6500000, coverage: 520000000 },
    { assetId: ebike, provider: 'Bảo Việt', policy_number: 'TNDS-ESCOOTER-2026', policy_type: 'MANDATORY' as const, start: '2026-03-20', expiry: '2027-03-20', cost: 146000 },
    { assetId: moto, provider: 'PVI', policy_number: 'TNDS-S1000RR-2024', policy_type: 'MANDATORY' as const, start: '2024-11-05', expiry: '2025-11-05', cost: 486000 },
    { assetId: moto, provider: 'AXA Insurance', policy_number: 'AXA-S1000RR-2024', policy_type: 'COMPREHENSIVE' as const, start: '2024-11-05', expiry: '2025-11-05', cost: 9800000, coverage: 980000000 },
  ].filter(i => i.assetId);
  for (const i of INS) {
    try {
      await createInsurancePolicy({ asset_id: i.assetId, provider: i.provider, policy_number: i.policy_number, policy_type: i.policy_type, start_date: i.start, expiry_date: i.expiry, cost: i.cost, coverage_amount: (i as any).coverage });
      result.insurance++;
    } catch (err: any) { result.errors.push(`Bảo hiểm ${i.provider}: ${err?.message ?? err}`); }
  }

  // 8. Registration (Mazda2)
  try {
    await createRegistration({
      asset_id: mazda,
      registration_number: '30A-888.88',
      inspection_date: '2026-01-10',
      inspection_expiry: '2028-01-10',
      road_fee_expiry: '2027-01-10',
      cost: 1560000,
    });
    result.registrations++;
  } catch (err: any) { result.errors.push(`Đăng ký: ${err?.message ?? err}`); }

  // 9. Loan (Mazda2)
  try {
    await createLoan({
      asset_id: mazda,
      lender: 'BIDV Chi Nhánh Cầu Giấy',
      principal: 250000000,
      down_payment: 270000000,
      interest_rate_percent: 7.5,
      term_months: 60,
      start_date: '2026-01-15',
      monthly_payment: 7800000,
      payment_day: 15,
      current_balance: 210000000,
      status: 'ACTIVE',
    });
    result.loans++;
  } catch (err: any) { result.errors.push(`Khoản vay: ${err?.message ?? err}`); }

  return result;
}