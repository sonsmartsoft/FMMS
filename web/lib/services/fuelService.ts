import { createClient } from '@/lib/supabase/client';
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
  fuel_level_before_pct?: number;
  fuel_liters_before?: number;
  fuel_level_after_pct?: number;
  fuel_liters_after?: number;
  calculated_consumption_l100km?: number;
  prev_odometer_km?: number;
  fuel_consumed_liters?: number;
}

export interface FuelLogInput {
  asset_id: string;
  timestamp?: string;
  date?: string;
  odometer_km?: number;
  fuel_liters?: number;
  liters?: number;
  price_per_liter: number;
  total_cost?: number;
  station?: string;
  tank_full?: boolean;
  notes?: string;
  fuel_level_before_pct?: number;
  fuel_liters_before?: number;
  fuel_level_after_pct?: number;
  fuel_liters_after?: number;
  calculated_consumption_l100km?: number;
  prev_odometer_km?: number;
  fuel_consumed_liters?: number;
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
  tank_full?: boolean;
  notes?: string;
  consumption_l100km?: number;
  fuel_level_before_pct?: number;
  fuel_liters_before?: number;
  fuel_level_after_pct?: number;
  fuel_liters_after?: number;
  calculated_consumption_l100km?: number;
  prev_odometer_km?: number;
  fuel_consumed_liters?: number;
};

/** Map DB row -> shape used by the UI tables */
export function mapFuelRow(row: any): FuelLog {
  const liters = Number(row.fuel_liters ?? row.liters) || 0;
  const dateStr = (row.timestamp ?? row.date ?? '').slice(0, 10);
  const consumption = row.calculated_consumption_l100km != null 
    ? Number(row.calculated_consumption_l100km) 
    : (row.consumption_l100km != null ? Number(row.consumption_l100km) : undefined);

  return {
    id: row.id,
    asset_id: row.asset_id,
    date: dateStr,
    liters,
    price_per_liter: Number(row.price_per_liter) || 0,
    total_cost: Number(row.total_cost) || 0,
    odometer_km: Number(row.odometer_km) || 0,
    station: row.station ?? '',
    tank_full: row.tank_full != null ? Boolean(row.tank_full) : true,
    notes: row.notes ?? undefined,
    consumption_l100km: consumption,
    fuel_level_before_pct: row.fuel_level_before_pct != null ? Number(row.fuel_level_before_pct) : undefined,
    fuel_liters_before: row.fuel_liters_before != null ? Number(row.fuel_liters_before) : undefined,
    fuel_level_after_pct: row.fuel_level_after_pct != null ? Number(row.fuel_level_after_pct) : undefined,
    fuel_liters_after: row.fuel_liters_after != null ? Number(row.fuel_liters_after) : undefined,
    calculated_consumption_l100km: row.calculated_consumption_l100km != null ? Number(row.calculated_consumption_l100km) : undefined,
    prev_odometer_km: row.prev_odometer_km != null ? Number(row.prev_odometer_km) : undefined,
    fuel_consumed_liters: row.fuel_consumed_liters != null ? Number(row.fuel_consumed_liters) : undefined,
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

  let allLogs: FuelLog[] = [...dbLogs];

  // Apply custom edits from localStorage
  allLogs = allLogs.map(item => customMap[item.id] ? { ...item, ...customMap[item.id] } : item);

  // Add any new locally created items not in DB
  Object.values(customMap).forEach((customItem: any) => {
    if (!allLogs.some(l => l.id === customItem.id)) {
      if (!assetId || customItem.asset_id === realId || customItem.asset_id === assetId) {
        allLogs.unshift(customItem);
      }
    }
  });

  return allLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function createFuelLog(input: {
  asset_id: string;
  date?: string;
  timestamp?: string;
  liters?: number;
  fuel_liters?: number;
  price_per_liter: number;
  total_cost?: number;
  odometer_km?: number;
  station?: string;
  tank_full?: boolean;
  notes?: string;
  fuel_level_before_pct?: number;
  fuel_liters_before?: number;
  fuel_level_after_pct?: number;
  fuel_liters_after?: number;
  calculated_consumption_l100km?: number;
  prev_odometer_km?: number;
  fuel_consumed_liters?: number;
}) {
  const liters = Number(input.liters ?? input.fuel_liters) || 0;
  const price = Number(input.price_per_liter) || 0;
  const cost = input.total_cost != null && Number(input.total_cost) > 0 ? Number(input.total_cost) : Math.round(liters * price);
  const realAssetId = resolveAssetId(input.asset_id);
  const logDate = input.date || (input.timestamp ? input.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10));

  let newId = `fuel_${Date.now()}`;
  let dbSuccess = false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert({
        asset_id: realAssetId,
        timestamp: input.timestamp || (input.date ? `${input.date}T00:00:00Z` : new Date().toISOString()),
        odometer_km: input.odometer_km || 0,
        fuel_liters: liters,
        price_per_liter: price,
        total_cost: cost,
        currency: 'VND',
        station: input.station || null,
        tank_full: input.tank_full ?? true,
        notes: input.notes || null,
        fuel_level_before_pct: input.fuel_level_before_pct,
        fuel_liters_before: input.fuel_liters_before,
        fuel_level_after_pct: input.fuel_level_after_pct,
        fuel_liters_after: input.fuel_liters_after,
        calculated_consumption_l100km: input.calculated_consumption_l100km,
        prev_odometer_km: input.prev_odometer_km,
        fuel_consumed_liters: input.fuel_consumed_liters,
      })
      .select()
      .single();

    if (!error && data) {
      newId = data.id;
      dbSuccess = true;
    }
  } catch {}

  const newLogObj: FuelLog = {
    id: newId,
    asset_id: realAssetId,
    date: logDate,
    liters,
    price_per_liter: price,
    total_cost: cost,
    odometer_km: input.odometer_km || 0,
    station: input.station || '',
    tank_full: input.tank_full ?? true,
    notes: input.notes,
    consumption_l100km: input.calculated_consumption_l100km,
    fuel_level_before_pct: input.fuel_level_before_pct,
    fuel_liters_before: input.fuel_liters_before,
    fuel_level_after_pct: input.fuel_level_after_pct,
    fuel_liters_after: input.fuel_liters_after,
    calculated_consumption_l100km: input.calculated_consumption_l100km,
    prev_odometer_km: input.prev_odometer_km,
    fuel_consumed_liters: input.fuel_consumed_liters,
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      const customMap = stored ? JSON.parse(stored) : {};
      customMap[newId] = newLogObj;
      localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
    } catch {}
  }

  return newLogObj;
}

export async function updateFuelLog(id: string, input: {
  asset_id?: string;
  date?: string;
  timestamp?: string;
  liters?: number;
  fuel_liters?: number;
  price_per_liter?: number;
  total_cost?: number;
  odometer_km?: number;
  station?: string;
  tank_full?: boolean;
  notes?: string;
  consumption_l100km?: number;
  fuel_level_before_pct?: number;
  fuel_liters_before?: number;
  fuel_level_after_pct?: number;
  fuel_liters_after?: number;
  calculated_consumption_l100km?: number;
  prev_odometer_km?: number;
  fuel_consumed_liters?: number;
}) {
  const realAssetId = input.asset_id ? resolveAssetId(input.asset_id) : undefined;
  const liters = input.liters != null ? Number(input.liters) : (input.fuel_liters != null ? Number(input.fuel_liters) : undefined);
  const price = input.price_per_liter != null ? Number(input.price_per_liter) : undefined;
  const cost = input.total_cost != null ? Number(input.total_cost) : undefined;

  try {
    const supabase = createClient();
    const updatePayload: any = {};
    if (input.timestamp) updatePayload.timestamp = input.timestamp;
    else if (input.date) updatePayload.timestamp = `${input.date}T00:00:00Z`;
    if (liters != null) updatePayload.fuel_liters = liters;
    if (price != null) updatePayload.price_per_liter = price;
    if (cost != null) updatePayload.total_cost = cost;
    if (input.odometer_km != null) updatePayload.odometer_km = input.odometer_km;
    if (input.station != null) updatePayload.station = input.station;
    if (input.tank_full != null) updatePayload.tank_full = input.tank_full;
    if (input.notes != null) updatePayload.notes = input.notes;
    if (input.fuel_level_before_pct != null) updatePayload.fuel_level_before_pct = input.fuel_level_before_pct;
    if (input.fuel_liters_before != null) updatePayload.fuel_liters_before = input.fuel_liters_before;
    if (input.fuel_level_after_pct != null) updatePayload.fuel_level_after_pct = input.fuel_level_after_pct;
    if (input.fuel_liters_after != null) updatePayload.fuel_liters_after = input.fuel_liters_after;
    if (input.calculated_consumption_l100km != null) updatePayload.calculated_consumption_l100km = input.calculated_consumption_l100km;
    if (input.prev_odometer_km != null) updatePayload.prev_odometer_km = input.prev_odometer_km;
    if (input.fuel_consumed_liters != null) updatePayload.fuel_consumed_liters = input.fuel_consumed_liters;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('fuel_logs').update(updatePayload).eq('id', id);
    }
  } catch {}

  const logDate = input.date || (input.timestamp ? input.timestamp.slice(0, 10) : undefined);

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      const customMap = stored ? JSON.parse(stored) : {};
      const existing = customMap[id] || {};
      customMap[id] = {
        ...existing,
        ...input,
        id,
        ...(logDate ? { date: logDate } : {}),
        ...(liters != null ? { liters } : {}),
        ...(price != null ? { price_per_liter: price } : {}),
        ...(cost != null ? { total_cost: cost } : {}),
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };
      localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
    } catch {}
  }

  return {
    id,
    ...input,
    date: logDate || '',
    liters: liters || 0,
    price_per_liter: price || 0,
    total_cost: cost || 0,
    odometer_km: input.odometer_km || 0,
    station: input.station || '',
  } as FuelLog;
}

export async function deleteFuelLog(id: string) {
  try {
    const supabase = createClient();
    await supabase.from('fuel_logs').delete().eq('id', id);
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      if (stored) {
        const customMap = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
      }
    } catch {}
  }

  return true;
}
