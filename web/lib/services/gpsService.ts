import { createClient } from '@/lib/supabase/client';

// ============================================================
// GPS Track Types
// ============================================================
export interface GpsTrackPoint {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  device_id: string;
  device_name: string | null;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  heading_deg: number | null;
  accuracy_m: number | null;
  altitude_m: number | null;
  recorded_at: string;
}

export interface VehicleLatestPosition {
  vehicle_id: string;
  device_id: string;
  device_name: string | null;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  heading_deg: number | null;
  recorded_at: string;
  trip_id: string | null;
  // GPS-only mode: no OBD fuel data
  is_gps_only?: boolean;
}

export interface DeviceLatestPosition {
  device_id: string;
  device_name: string | null;
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_kmh: number | null;
  heading_deg: number | null;
  recorded_at: string;
  trip_id: string | null;
}

export interface TripTrack {
  points: GpsTrackPoint[];
  totalDistanceKm: number;
  durationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
}

// ============================================================
// Helpers
// ============================================================
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// 1. Get latest position for each vehicle in a fleet
// ============================================================
export async function getLatestPositions(assetIds: string[]): Promise<VehicleLatestPosition[]> {
  if (assetIds.length === 0) return [];
  const supabase = createClient();

  const { data, error } = await supabase
    .from('gps_track_points')
    .select('vehicle_id, device_id, device_name, lat, lng, speed_kmh, heading_deg, recorded_at, trip_id')
    .in('vehicle_id', assetIds)
    .order('recorded_at', { ascending: false })
    .limit(assetIds.length * 10);

  if (error) throw error;

  const seen = new Set<string>();
  const latest: VehicleLatestPosition[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.vehicle_id)) {
      seen.add(row.vehicle_id);
      latest.push(row as VehicleLatestPosition);
    }
  }
  return latest;
}

// ============================================================
// 1b. Get latest position per DEVICE (for admin device panel)
// ============================================================
export async function getDeviceLatestPositions(assetIds?: string[]): Promise<DeviceLatestPosition[]> {
  const supabase = createClient();
  let query = supabase
    .from('gps_track_points')
    .select('device_id, device_name, vehicle_id, lat, lng, speed_kmh, heading_deg, recorded_at, trip_id')
    .order('recorded_at', { ascending: false })
    .limit(200);

  if (assetIds && assetIds.length > 0) {
    query = query.in('vehicle_id', assetIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Deduplicate: keep most recent per device_id
  const seen = new Set<string>();
  const latest: DeviceLatestPosition[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.device_id)) {
      seen.add(row.device_id);
      latest.push(row as DeviceLatestPosition);
    }
  }
  return latest;
}

// ============================================================
// 2. Get all GPS points for a trip (for replay)
// ============================================================
export async function getTripTrack(tripId: string): Promise<TripTrack> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gps_track_points')
    .select('*')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: true });

  if (error) throw error;

  const points = (data ?? []) as GpsTrackPoint[];

  // Calculate statistics
  let totalDistanceKm = 0;
  let maxSpeedKmh = 0;
  for (let i = 1; i < points.length; i++) {
    totalDistanceKm += haversineKm(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    if ((points[i].speed_kmh ?? 0) > maxSpeedKmh) maxSpeedKmh = points[i].speed_kmh ?? 0;
  }

  const durationSeconds =
    points.length >= 2
      ? (new Date(points[points.length - 1].recorded_at).getTime() - new Date(points[0].recorded_at).getTime()) / 1000
      : 0;

  const avgSpeedKmh = durationSeconds > 0 ? (totalDistanceKm / durationSeconds) * 3600 : 0;

  return { points, totalDistanceKm, durationSeconds, avgSpeedKmh, maxSpeedKmh };
}

// ============================================================
// 3. Get GPS track for a vehicle in a time range
// ============================================================
export async function getVehicleTrack(
  assetId: string,
  from: string, // ISO 8601
  to: string    // ISO 8601
): Promise<GpsTrackPoint[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('gps_track_points')
    .select('*')
    .eq('vehicle_id', assetId)
    .gte('recorded_at', from)
    .lte('recorded_at', to)
    .order('recorded_at', { ascending: true })
    .limit(5000); // Max 5000 points for performance

  if (error) throw error;
  return (data ?? []) as GpsTrackPoint[];
}

// ============================================================
// 4. Subscribe to live GPS updates (Realtime)
// ============================================================
export function subscribeToLivePositions(
  assetIds: string[],
  onUpdate: (point: GpsTrackPoint) => void
): () => void {
  if (assetIds.length === 0) return () => {};
  const supabase = createClient();

  const channel = supabase
    .channel('gps_live')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'gps_track_points',
        // Note: Supabase Realtime filter supports basic equality
        // For multi-vehicle, we filter client-side
      },
      (payload) => {
        const point = payload.new as GpsTrackPoint;
        if (assetIds.includes(point.vehicle_id)) {
          onUpdate(point);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

// ============================================================
// 5. Get trips list for an asset (for replay selection)
// ============================================================
export async function getTripsWithGps(assetId?: string): Promise<Array<{
  id: string;
  asset_id: string;
  started_at: string;
  ended_at: string | null;
  distance_km: number | null;
  point_count: number;
}>> {
  const supabase = createClient();

  let query = supabase
    .from('gps_track_points')
    .select('trip_id, vehicle_id, recorded_at')
    .not('trip_id', 'is', null)
    .order('recorded_at', { ascending: false });

  if (assetId) query = query.eq('vehicle_id', assetId);

  const { data, error } = await query.limit(2000);
  if (error) throw error;

  // Group by trip_id
  const tripMap = new Map<string, { vehicle_id: string; min: string; max: string; count: number }>();
  for (const row of data ?? []) {
    if (!row.trip_id) continue;
    if (!tripMap.has(row.trip_id)) {
      tripMap.set(row.trip_id, { vehicle_id: row.vehicle_id, min: row.recorded_at, max: row.recorded_at, count: 0 });
    }
    const t = tripMap.get(row.trip_id)!;
    if (row.recorded_at < t.min) t.min = row.recorded_at;
    if (row.recorded_at > t.max) t.max = row.recorded_at;
    t.count++;
  }

  return Array.from(tripMap.entries()).map(([id, t]) => ({
    id,
    asset_id: t.vehicle_id,
    started_at: t.min,
    ended_at: t.max,
    distance_km: null,
    point_count: t.count,
  }));
}
