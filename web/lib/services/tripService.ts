import { createClient } from '@/lib/supabase/client';
import { TripRecord } from '@/types/mobility';
import { resolveAssetId, isValidUuid } from './assetService';
import { REAL_AUGUST_TRIPS } from '@/lib/data/realTripsData';

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
  const parseCoord = (v: any) => {
    if (v == null || v === '') return undefined;
    const num = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(num) ? undefined : num.toFixed(4);
  };
  const startLat = parseCoord(row.start_latitude);
  const startLng = parseCoord(row.start_longitude);
  const endLat = parseCoord(row.end_latitude);
  const endLng = parseCoord(row.end_longitude);
  const startCoord = startLat && startLng ? `${startLat}, ${startLng}` : undefined;
  const endCoord = endLat && endLng ? `${endLat}, ${endLng}` : undefined;

  return {
    id: String(row.id),
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
    start_location: row.notes ? row.notes.split('|')[0] : (row.start_address || startCoord || 'Điểm xuất phát'),
    end_location: row.notes ? row.notes.split('|')[1] : (row.end_address || endCoord || 'Điểm đến'),
  };
}

const LOCAL_TRIPS_KEY = 'fmms_local_trips';

function getLocalTrips(): TripRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_TRIPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTrips(trips: TripRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(trips));
  } catch {}
}

export async function getTrips(assetId?: string): Promise<TripRecord[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let supabaseTrips: TripRecord[] = [];
  
  try {
    const supabase = createClient();
    let query = supabase
      .from('trips')
      .select('*')
      .order('start_time', { ascending: false })
      .limit(500);
      
    if (realId && isValidUuid(realId)) {
      query = query.eq('asset_id', realId);
    } else if (assetId && isValidUuid(assetId)) {
      query = query.eq('asset_id', assetId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      supabaseTrips = data.map(mapTripRow);
    }
  } catch (err) {
    console.warn('getTrips fetch error:', err);
  }

  const localTrips = getLocalTrips().filter(t => {
    if (!assetId) return true;
    const tAssetId = t.asset_id ? resolveAssetId(t.asset_id) : undefined;
    return tAssetId === realId || t.asset_id === assetId;
  });

  const seedTrips = REAL_AUGUST_TRIPS.filter(t => {
    if (!assetId) return true;
    const tAssetId = t.asset_id ? resolveAssetId(t.asset_id) : undefined;
    return tAssetId === realId || t.asset_id === assetId;
  });

  // Seed trips + Supabase live trips + local user entries
  const baseTrips = [...seedTrips, ...supabaseTrips, ...localTrips];

  const map = new Map<string, TripRecord>();
  baseTrips.forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => (b.start_time || '').localeCompare(a.start_time || ''));
}

export async function createTrip(input: TripInput) {
  let duration = input.duration_seconds;
  if (duration == null && input.start_time && input.end_time) {
    duration = Math.max(
      0,
      Math.round((new Date(input.end_time).getTime() - new Date(input.start_time).getTime()) / 1000),
    );
  }

  let createdTrip: TripRecord = {
    id: `TRIP_${Date.now()}`,
    asset_id: input.asset_id,
    start_time: input.start_time,
    end_time: input.end_time ?? input.start_time,
    distance_km: input.distance_km ?? 0,
    duration_seconds: duration ?? 0,
    fuel_used_liters: input.fuel_used_liters ?? 0,
    average_speed_kmh: input.average_speed_kmh ?? 0,
    max_speed_kmh: input.max_speed_kmh ?? 0,
    start_location: input.start_location,
    end_location: input.end_location,
  };

  try {
    const supabase = createClient();
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
          : input.notes || null,
        status: 'COMPLETED',
      })
      .select()
      .single();

    if (!error && data) {
      createdTrip = mapTripRow(data);
    }
  } catch (err) {
    console.warn('Supabase createTrip warning:', err);
  }

  const locals = getLocalTrips().filter(t => t.id !== createdTrip.id);
  saveLocalTrips([createdTrip, ...locals]);

  return createdTrip;
}

export async function updateTrip(id: string, input: Partial<TripInput>) {
  try {
    const supabase = createClient();
    const updatePayload: any = {};
    if (input.start_time) updatePayload.start_time = input.start_time;
    if (input.end_time) updatePayload.end_time = input.end_time;
    if (input.distance_km != null) updatePayload.distance_km = input.distance_km;
    if (input.duration_seconds != null) updatePayload.duration_seconds = input.duration_seconds;
    if (input.fuel_used_liters != null) updatePayload.fuel_used_liters = input.fuel_used_liters;
    if (input.average_speed_kmh != null) updatePayload.average_speed_kmh = input.average_speed_kmh;
    if (input.start_location || input.end_location) {
      updatePayload.notes = `${input.start_location ?? ''}|${input.end_location ?? ''}`;
    }

    await supabase.from('trips').update(updatePayload).eq('id', id);
  } catch (err) {
    console.warn('Supabase updateTrip warning:', err);
  }

  const locals = getLocalTrips();
  const idx = locals.findIndex(t => t.id === id);
  if (idx >= 0) {
    if (input.start_time) locals[idx].start_time = input.start_time;
    if (input.end_time) locals[idx].end_time = input.end_time;
    if (input.distance_km != null) locals[idx].distance_km = input.distance_km;
    if (input.fuel_used_liters != null) locals[idx].fuel_used_liters = input.fuel_used_liters;
    if (input.average_speed_kmh != null) locals[idx].average_speed_kmh = input.average_speed_kmh;
    if (input.start_location != null) locals[idx].start_location = input.start_location;
    if (input.end_location != null) locals[idx].end_location = input.end_location;
    saveLocalTrips(locals);
    return locals[idx];
  }

  return {
    id,
    asset_id: input.asset_id || '',
    start_time: input.start_time || new Date().toISOString(),
    end_time: input.end_time || new Date().toISOString(),
    distance_km: input.distance_km || 0,
    duration_seconds: input.duration_seconds || 0,
    average_speed_kmh: input.average_speed_kmh || 0,
    max_speed_kmh: 0,
    start_location: input.start_location,
    end_location: input.end_location,
  };
}

export async function deleteTrip(id: string) {
  try {
    const supabase = createClient();
    await supabase.from('trips').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteTrip warning:', err);
  }

  const locals = getLocalTrips().filter(t => t.id !== id);
  saveLocalTrips(locals);
  return true;
}
