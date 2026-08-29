import { createClient } from '@/lib/supabase/client';
import { MOCK_FUEL_LOGS } from '@/lib/data/mockData';
import { resolveAssetId, isValidUuid } from './assetService';

export interface FuelLogRow {
  id: string;
  asset_id: string;
  timestamp: string;
  odometer_km: number;
  fuel_liters: number;
  price_per_liter: number;
  total_cost: number;
  currency: string;
  station?: string;
  tank_full: boolean;
  notes?: string;
}

export interface FuelLogInput {
  asset_id: string;
  timestamp: string;
  odometer_km: number;
  fuel_liters: number;
  price_per_liter: number;
  total_cost?: number;
  station?: string;
  tank_full?: boolean;
  notes?: string;
}

export type FuelLog = {
  id: string;
  asset_id: string;
  date: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer_km: number;
  station: string;
  notes?: string;
  consumption_l100km?: number;
};

/** Map DB row -> shape used by the UI tables (mock-compatible) */
export function mapFuelRow(row: any): FuelLog {
  const liters = Number(row.fuel_liters) || 0;
  return {
    id: row.id,
    asset_id: row.asset_id,
    date: (row.timestamp ?? '').slice(0, 10),
    liters,
    price_per_liter: Number(row.price_per_liter) || 0,
    total_cost: Number(row.total_cost) || 0,
    odometer_km: Number(row.odometer_km) || 0,
    station: row.station ?? '',
    notes: row.notes ?? undefined,
    consumption_l100km: row.consumption_l100km != null ? Number(row.consumption_l100km) : undefined,
  };
}

export async function getFuelLogs(assetId?: string): Promise<FuelLog[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbLogs: FuelLog[] = [];
  try {
    const supabase = createClient();
    let query = supabase
      .from('fuel_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbLogs = data.map(mapFuelRow);
    }
  } catch {}

  // Base list from DB or fallback mock
  let allLogs: FuelLog[] = dbLogs.length > 0
    ? dbLogs
    : (MOCK_FUEL_LOGS as any[]).filter(f => !assetId || f.asset_id === realId || f.asset_id === assetId);

  // Apply custom edits from localStorage
  allLogs = allLogs.map(item => customMap[item.id] ? { ...item, ...customMap[item.id] } : item);

  // Add any new locally created items not in DB/mock
  Object.values(customMap).forEach((customItem: any) => {
    if (!allLogs.some(l => l.id === customItem.id)) {
      if (!assetId || customItem.asset_id === realId || customItem.asset_id === assetId) {
        allLogs.unshift(customItem);
      }
    }
  });

  return allLogs;
}

export async function createFuelLog(input: FuelLogInput, skipExpenseSync = false): Promise<FuelLog> {
  const realId = resolveAssetId(input.asset_id);
  const supabase = createClient();
  const timestamp = input.timestamp?.includes('T') ? input.timestamp : `${input.timestamp || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`;
  const cost = input.total_cost || Math.round((input.fuel_liters || 0) * (input.price_per_liter || 0));

  const payload = {
    asset_id: realId,
    timestamp,
    odometer_km: input.odometer_km ?? 0,
    fuel_liters: input.fuel_liters ?? 0,
    price_per_liter: input.price_per_liter ?? 0,
    total_cost: cost,
    currency: 'VND',
    station: input.station ?? null,
    tank_full: input.tank_full ?? true,
    notes: input.notes ?? null,
  };

  const newLogObj: FuelLog = {
    id: `FL_${Date.now()}`,
    asset_id: realId,
    date: timestamp.slice(0, 10),
    liters: payload.fuel_liters,
    price_per_liter: payload.price_per_liter,
    total_cost: payload.total_cost,
    odometer_km: payload.odometer_km,
    station: payload.station ?? '',
    notes: payload.notes ?? undefined,
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[newLogObj.id] = newLogObj;
      localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Mutate in-memory mock data
  (MOCK_FUEL_LOGS as any[]).unshift(newLogObj);

  // 3. Auto-sync to Expense Service if not skipped
  if (!skipExpenseSync && cost > 0) {
    try {
      const { createExpense } = await import('./expenseService');
      await createExpense({
        asset_id: realId,
        date: timestamp.slice(0, 10),
        category: 'Running',
        subcategory: 'Fuel',
        amount: cost,
        currency: 'VND',
        vendor: input.station || undefined,
        odometer_km: input.odometer_km || undefined,
        description: `Đổ ${input.fuel_liters}L xăng${input.station ? ` tại ${input.station}` : ''}${input.notes ? ` (${input.notes})` : ''}`,
      }, true); // skip fuel sync back to prevent infinite loop
    } catch (eErr) {
      console.warn('Auto expense sync warning from createFuelLog:', eErr);
    }
  }

  // 4. Save to Supabase
  try {
    const { data, error } = await supabase.from('fuel_logs').insert([payload]).select().maybeSingle();
    if (!error && data) return mapFuelRow(data);
  } catch (err) {
    console.warn('createFuelLog Supabase fallback:', err);
  }

  return newLogObj;
}

export async function updateFuelLog(id: string, input: Partial<FuelLogInput>): Promise<FuelLog> {
  const existingIdx = (MOCK_FUEL_LOGS as any[]).findIndex((f: any) => f.id === id);
  const liters = input.fuel_liters ?? 0;
  const price = input.price_per_liter ?? 0;
  const cost = input.total_cost || Math.round(liters * price);

  const updatedLogObj: FuelLog = {
    id,
    asset_id: resolveAssetId(input.asset_id),
    date: input.timestamp ? input.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
    liters: liters || (existingIdx >= 0 ? (MOCK_FUEL_LOGS as any[])[existingIdx].liters : 37.7),
    price_per_liter: price || (existingIdx >= 0 ? (MOCK_FUEL_LOGS as any[])[existingIdx].price_per_liter : 26525),
    total_cost: cost || (existingIdx >= 0 ? (MOCK_FUEL_LOGS as any[])[existingIdx].total_cost : 1000000),
    odometer_km: input.odometer_km ?? (existingIdx >= 0 ? (MOCK_FUEL_LOGS as any[])[existingIdx].odometer_km : 0),
    station: input.station ?? (existingIdx >= 0 ? (MOCK_FUEL_LOGS as any[])[existingIdx].station : ''),
    notes: input.notes ?? (existingIdx >= 0 ? (MOCK_FUEL_LOGS as any[])[existingIdx].notes : undefined),
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = updatedLogObj;
      localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Mutate in-memory
  if (existingIdx >= 0) {
    (MOCK_FUEL_LOGS as any[])[existingIdx] = { ...updatedLogObj };
  }

  // 3. Update Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const payload: Record<string, any> = {};
      if (input.timestamp) payload.timestamp = input.timestamp.includes('T') ? input.timestamp : `${input.timestamp}T12:00:00.000Z`;
      if (input.odometer_km != null) payload.odometer_km = input.odometer_km;
      if (input.fuel_liters != null) payload.fuel_liters = input.fuel_liters;
      if (input.price_per_liter != null) payload.price_per_liter = input.price_per_liter;
      payload.total_cost = cost;
      if (input.station != null) payload.station = input.station;
      if (input.notes != null) payload.notes = input.notes;

      const { data, error } = await supabase
        .from('fuel_logs')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) return mapFuelRow(data);
    } catch (err) {
      console.warn('updateFuelLog Supabase fallback:', err);
    }
  }

  return updatedLogObj;
}

export async function deleteFuelLog(id: string) {
  // 1. Delete from LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      if (stored) {
        const customMap: Record<string, any> = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
      }
    } catch {}
  }

  // 2. Delete from in-memory mock data
  const delIdx = (MOCK_FUEL_LOGS as any[]).findIndex((f: any) => f.id === id);
  if (delIdx >= 0) (MOCK_FUEL_LOGS as any[]).splice(delIdx, 1);

  // 3. Delete from Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('fuel_logs').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteFuelLog Supabase fallback:', err);
    }
  }
}