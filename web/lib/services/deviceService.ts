import { createClient } from '@/lib/supabase/client';

export interface DeviceRecord {
  id: string;
  vehicle_id: string | null;
  asset_id?: string | null;
  device_type: string;
  device_name: string;
  mac_address: string | null;
  serial_number?: string | null;
  app_version?: string | null;
  last_seen: string | null;
  status: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getDevices(): Promise<DeviceRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .order('last_seen', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('getDevices error:', error);
    return [];
  }
  return (data ?? []) as DeviceRecord[];
}

export async function updateDevice(
  id: string,
  payload: Partial<DeviceRecord>
): Promise<{ data: DeviceRecord | null; error: any }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('devices')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  return { data: data as DeviceRecord | null, error };
}

export async function assignDeviceToVehicle(
  deviceId: string,
  vehicleId: string | null
): Promise<{ success: boolean; error: any }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('devices')
    .update({
      vehicle_id: vehicleId,
      asset_id: vehicleId, // keep asset_id in sync for backward compatibility
      updated_at: new Date().toISOString(),
    })
    .eq('id', deviceId);

  return { success: !error, error };
}

export async function deleteDevice(id: string, deviceName?: string): Promise<{ success: boolean; error: any }> {
  const supabase = createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  try {
    // 1. Dọn dẹp bảng gps_track_points
    await supabase.from('gps_track_points').delete().eq('device_id', id);
    await supabase.from('gps_track_points').delete().eq('device_name', id);
    if (deviceName) {
      await supabase.from('gps_track_points').delete().eq('device_name', deviceName);
    }

    // 2. Dọn dẹp bảng telemetry_samples
    if (isUuid) {
      await supabase.from('telemetry_samples').delete().eq('device_id', id);
    }

    // 3. Xóa khỏi bảng devices
    let error: any = null;
    if (isUuid) {
      const res = await supabase.from('devices').delete().eq('id', id);
      error = res.error;
    } else {
      const res = await supabase.from('devices').delete().or(`device_name.eq.${id},mac_address.eq.${id}`);
      error = res.error;
    }

    if (deviceName && !error) {
      await supabase.from('devices').delete().eq('device_name', deviceName);
    }

    return { success: !error, error };
  } catch (err: any) {
    return { success: false, error: err };
  }
}
