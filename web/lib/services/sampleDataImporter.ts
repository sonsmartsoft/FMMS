import { getAssets, createAsset, getUserContext } from '@/lib/services/assetService';
import { createFuelLog } from '@/lib/services/fuelService';
import { createMaintenanceRecord } from '@/lib/services/maintenanceService';
import { createExpense } from '@/lib/services/expenseService';
import { createPart } from '@/lib/services/partService';
import { createLoan } from '@/lib/services/loanService';
import { INITIAL_ASSETS, MOCK_EXPENSES, MOCK_FUEL_LOGS, MOCK_MAINTENANCE_RECORDS, MOCK_PARTS, REAL_ASSET_IDS } from '@/lib/data/mockData';

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

export async function importSampleData(): Promise<ImportResult> {
  const result: ImportResult = { assets: 0, fuelLogs: 0, maintenance: 0, expenses: 0, trips: 0, parts: 0, insurance: 0, registrations: 0, loans: 0, errors: [] };

  const { userId } = await getUserContext();
  if (!userId) throw new Error('Bạn cần đăng nhập trước khi import dữ liệu');

  const existing = await getAssets();
  if (existing.length > 0) {
    return { ...result, alreadyImported: true };
  }

  // 1. Assets
  for (const asset of INITIAL_ASSETS) {
    try {
      await createAsset({
        name: asset.name,
        asset_type: asset.asset_type,
        category: asset.category,
        brand: asset.brand,
        model: asset.model,
        year: asset.year,
        trim: asset.trim,
        color: asset.color,
        license_plate: asset.license_plate,
        vin: asset.vin,
        engine: asset.engine,
        fuel_type: asset.fuel_type,
        tank_capacity_liters: asset.tank_capacity_liters,
        purchase_date: asset.purchase_date,
        purchase_price: asset.purchase_price,
        current_value: asset.current_value,
        initial_odometer_km: asset.initial_odometer_km,
        current_odometer_km: asset.current_odometer_km,
        virtual_odometer_km: asset.virtual_odometer_km,
        odometer_source: asset.odometer_source,
        image_url: asset.image_url,
        description: asset.description,
        capabilities: asset.capabilities,
      });
      result.assets++;
    } catch (e: any) {
      result.errors.push(`Tạo xe ${asset.name}: ${e?.message ?? e}`);
    }
  }

  const mazdaId = REAL_ASSET_IDS.MAZDA2_2026;

  // 2. Loans (TPBank cho Mazda 2)
  try {
    await createLoan({
      asset_id: mazdaId,
      lender: 'TPBank',
      principal: 295000000,
      down_payment: 102000000,
      interest_rate_percent: 8.0,
      preferred_rate_percent: 8.0,
      preferred_months: 12,
      floating_rate_percent: 11.5,
      term_months: 60,
      start_date: '2026-04-07',
      monthly_payment: 7378216,
      payment_day: 28,
      current_balance: 270918368,
      status: 'ACTIVE',
      notes: '8% năm đầu -> 11.5% các năm sau',
    });
    result.loans++;
  } catch (err: any) {
    result.errors.push(`Khoản vay: ${err?.message ?? err}`);
  }

  // 3. Parts (11 hạng mục Mazda 2 & Xe đạp)
  for (const p of MOCK_PARTS) {
    try {
      await createPart({
        asset_id: p.asset_id || mazdaId,
        part_name: p.name,
        brand: p.brand,
        supplier: p.category,
        installation_date: p.install_date,
        cost: p.cost,
        installed_odometer_km: p.odometer_km,
        notes: p.notes,
      });
      result.parts++;
    } catch (err: any) {
      result.errors.push(`Phụ tùng ${p.name}: ${err?.message ?? err}`);
    }
  }

  // 4. Fuel logs (Mazda 2)
  for (const f of MOCK_FUEL_LOGS) {
    try {
      await createFuelLog({
        asset_id: mazdaId,
        timestamp: `${f.date}T08:00:00Z`,
        odometer_km: f.odometer_km,
        fuel_liters: f.liters,
        price_per_liter: f.price_per_liter,
        station: f.station,
        tank_full: true,
        notes: f.notes,
      });
      result.fuelLogs++;
    } catch (e: any) {
      result.errors.push(`Fuel log ${f.date}: ${e?.message ?? e}`);
    }
  }

  // 5. Maintenance records
  for (const m of MOCK_MAINTENANCE_RECORDS) {
    try {
      await createMaintenanceRecord({
        asset_id: m.asset_id || mazdaId,
        maintenance_type: m.maintenance_type,
        date: m.date,
        odometer_km: m.odometer_km,
        cost: m.cost,
        vendor: m.vendor,
        notes: m.notes,
        next_due_km: m.next_due_km,
        next_due_date: m.next_due_date,
      });
      result.maintenance++;
    } catch (e: any) {
      result.errors.push(`Bảo dưỡng ${m.maintenance_type}: ${e?.message ?? e}`);
    }
  }

  // 6. Expenses (Toàn bộ 60 chi phí thực tế)
  for (const e of MOCK_EXPENSES) {
    try {
      await createExpense({
        asset_id: e.asset_id || mazdaId,
        date: e.date,
        category: e.category,
        subcategory: e.subcategory,
        amount: e.amount,
        currency: e.currency || 'VND',
        vendor: e.vendor,
        odometer_km: e.odometer_km,
        description: e.description,
      });
      result.expenses++;
    } catch (err: any) {
      result.errors.push(`Chi phí ${e.date} (${e.description}): ${err?.message ?? err}`);
    }
  }

  return result;
}