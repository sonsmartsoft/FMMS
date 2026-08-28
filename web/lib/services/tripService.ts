import { createClient } from '@/lib/supabase/client';
import { TripRecord } from '@/types/mobility';

export interface TripInput {
  asset_id: string;
  start_time: string;
  end_time?: string;
  distance_km?: number;
  duration_seconds?: number;
  fuel_used_liters?: number;
  average_speed_kmh?: number;
  max_speed_kmh?: number;
  start_location?: string;
  end_location?: string;
  notes?: string;
}

export function mapTripRow(row: any): TripRecord {
  return {
    id: row.id,
    asset_id: row.asset_id,
    start_time: row.start_time,
    end_time: row.end_time ?? row.start_time,
    distance_km: Number(row.distance_km) || 0,
    duration_seconds: Number(row.duration_seconds) || 0,
    fuel_used_liters: row.fuel_used_liters != null ? Number(row.fuel_used_liters) : undefined,
    average_consumption_l100km:
      row.average_consumption_l100km != null ? Number(row.average_consumption_l100km) : undefined,
    average_speed_kmh: Number(row.average_speed_kmh) || 0,
    max_speed_kmh: Number(row.max_speed_kmh) || 0,
    start_location: row.notes ? row.notes.split('|')[0] : undefined,
    end_location: row.notes ? row.notes.split('|')[1] : undefined,
  };
}

export async function getTrips(assetId?: string): Promise<TripRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from('trips')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(100);
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapTripRow);
}

export async function createTrip(input: TripInput) {
  const supabase = createClient();
  let duration = input.duration_seconds;
  if (duration == null && input.start_time && input.end_time) {
    duration = Math.max(
      0,
      Math.round((new Date(input.end_time).getTime() - new Date(input.start_time).getTime()) / 1000),
    );
  }
  const { data, error } = await supabase
    .from('trips')
    .insert({
      asset_id: input.asset_id,
      start_time: input.start_time,
      end_time: input.end_time ?? input.start_time,
      distance_km: input.distance_km ?? 0,
      duration_seconds: duration ?? 0,
      fuel_used_liters: input.fuel_used_liters ?? 0,
      average_speed_kmh: input.average_speed_kmh ?? 0,
      max_speed_kmh: input.max_speed_kmh ?? 0,
      notes: input.start_location || input.end_location
        ? `${input.start_location ?? ''}|${input.end_location ?? ''}`
        : null,
      status: 'COMPLETED',
    })
    .select()
    .single();
  if (error) throw error;
  return mapTripRow(data);
}