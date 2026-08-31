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

/** Map DB row -> shape used by the UI tables */
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
  date: string;
  liters: number;
  price_per_liter: number;
  total_cost?: number;
  odometer_km?: number;
  station?: string;
  notes?: string;
}) {
  const liters = Number(input.liters) || 0;
  const price = Number(input.price_per_liter) || 0;
  const cost = input.total_cost != null && Number(input.total_cost) > 0 ? Number(input.total_cost) : Math.round(liters * price);
  const realAssetId = resolveAssetId(input.asset_id);

  let newId = `fuel_${Date.now()}`;
  let dbSuccess = false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('fuel_logs')
      .insert({
        asset_id: realAssetId,
        timestamp: input.date ? `${input.date}T00:00:00Z` : new Date().toISOString(),
        odometer_km: input.odometer_km || 0,
        fuel_liters: liters,
        price_per_liter: price,
        total_cost: cost,
        currency: 'VND',
        station: input.station || null,
        tank_full: true,
        notes: input.notes || null,
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
    date: input.date || new Date().toISOString().slice(0, 10),
    liters,
    price_per_liter: price,
    total_cost: cost,
    odometer_km: input.odometer_km || 0,
    station: input.station || '',
    notes: input.notes,
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

export async function updateFuelLog(id: string, input: Partial<FuelLog>) {
  const realAssetId = input.asset_id ? resolveAssetId(input.asset_id) : undefined;
  const liters = input.liters != null ? Number(input.liters) : undefined;
  const price = input.price_per_liter != null ? Number(input.price_per_liter) : undefined;
  const cost = input.total_cost != null ? Number(input.total_cost) : undefined;

  try {
    const supabase = createClient();
    const updatePayload: any = {};
    if (input.date) updatePayload.timestamp = `${input.date}T00:00:00Z`;
    if (liters != null) updatePayload.fuel_liters = liters;
    if (price != null) updatePayload.price_per_liter = price;
    if (cost != null) updatePayload.total_cost = cost;
    if (input.odometer_km != null) updatePayload.odometer_km = input.odometer_km;
    if (input.station != null) updatePayload.station = input.station;
    if (input.notes != null) updatePayload.notes = input.notes;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('fuel_logs').update(updatePayload).eq('id', id);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_fuel_logs');
      const customMap = stored ? JSON.parse(stored) : {};
      const existing = customMap[id] || {};
      customMap[id] = {
        ...existing,
        ...input,
        id,
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };
      localStorage.setItem('fmms_custom_fuel_logs', JSON.stringify(customMap));
    } catch {}
  }

  return { id, ...input } as FuelLog;
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
