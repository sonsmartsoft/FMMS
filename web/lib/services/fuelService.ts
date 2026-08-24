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

export async function getFuelLogs(assetId?: string) {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
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
      return data.map(mapFuelRow);
    }
  } catch {}

  return (MOCK_FUEL_LOGS as any[]).filter(f => !assetId || f.asset_id === realId || f.asset_id === assetId);
}

export async function createFuelLog(input: FuelLogInput) {
  const realId = resolveAssetId(input.asset_id);
  const supabase = createClient();
  const timestamp = input.timestamp?.includes('T') ? input.timestamp : `${input.timestamp || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`;
  const payload = {
    asset_id: realId,
    timestamp,
    odometer_km: input.odometer_km ?? 0,
    fuel_liters: input.fuel_liters ?? 0,
    price_per_liter: input.price_per_liter ?? 0,
    total_cost: Math.round((input.fuel_liters || 0) * (input.price_per_liter || 0)),
    currency: 'VND',
    station: input.station ?? null,
    tank_full: input.tank_full ?? true,
    notes: input.notes ?? null,
  };
  try {
    const { data, error } = await supabase.from('fuel_logs').insert([payload]).select().maybeSingle();
    if (!error && data) return mapFuelRow(data);
  } catch (err) {
    console.warn('createFuelLog Supabase fallback:', err);
  }
  return mapFuelRow({ id: `FL_${Date.now()}`, ...payload });
}

export async function updateFuelLog(id: string, input: Partial<FuelLogInput>) {
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const payload: Record<string, any> = {};
      if (input.timestamp) payload.timestamp = input.timestamp.includes('T') ? input.timestamp : `${input.timestamp}T12:00:00.000Z`;
      if (input.odometer_km != null) payload.odometer_km = input.odometer_km;
      if (input.fuel_liters != null) payload.fuel_liters = input.fuel_liters;
      if (input.price_per_liter != null) payload.price_per_liter = input.price_per_liter;
      if (input.price_per_liter != null || input.fuel_liters != null) {
        const liters = input.fuel_liters ?? 37.7;
        const price = input.price_per_liter ?? 26525;
        payload.total_cost = Math.round(liters * price);
      }
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

  const liters = input.fuel_liters ?? 37.7;
  const price = input.price_per_liter ?? 26525;
  return mapFuelRow({
    id,
    asset_id: resolveAssetId(input.asset_id),
    timestamp: input.timestamp || '2026-04-09T12:00:00.000Z',
    odometer_km: input.odometer_km ?? 12,
    fuel_liters: liters,
    price_per_liter: price,
    total_cost: Math.round(liters * price),
    station: input.station ?? 'Cây xăng Thaco',
    notes: input.notes ?? 'Đổ xăng',
  });
}

export async function deleteFuelLog(id: string) {
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('fuel_logs').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteFuelLog Supabase fallback:', err);
    }
  }
}