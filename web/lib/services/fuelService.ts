import { createClient } from '@/lib/supabase/client';
import { MOCK_FUEL_LOGS } from '@/lib/data/mockData';

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
  try {
    const supabase = createClient();
    let query = supabase
      .from('fuel_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map(mapFuelRow);
    }
  } catch {}

  return MOCK_FUEL_LOGS as any[];
}

export async function createFuelLog(input: FuelLogInput) {
  const supabase = createClient();
  const payload = {
    asset_id: input.asset_id,
    timestamp: input.timestamp,
    odometer_km: input.odometer_km,
    fuel_liters: input.fuel_liters,
    price_per_liter: input.price_per_liter,
    total_cost: Math.round(input.fuel_liters * input.price_per_liter),
    currency: 'VND',
    station: input.station ?? null,
    tank_full: input.tank_full ?? true,
    notes: input.notes ?? null,
  };
  const { data, error } = await supabase.from('fuel_logs').insert([payload]).select().single();
  if (error) throw error;
  return mapFuelRow(data);
}

export async function updateFuelLog(id: string, input: Partial<FuelLogInput>) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fuel_logs')
    .update({
      ...(input.timestamp ? { timestamp: input.timestamp } : {}),
      ...(input.odometer_km != null ? { odometer_km: input.odometer_km } : {}),
      ...(input.fuel_liters != null ? { fuel_liters: input.fuel_liters } : {}),
      ...(input.price_per_liter != null ? { price_per_liter: input.price_per_liter } : {}),
      ...(input.station != null ? { station: input.station } : {}),
      ...(input.notes != null ? { notes: input.notes } : {}),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapFuelRow(data);
}

export async function deleteFuelLog(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
  if (error) throw error;
}