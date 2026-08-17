import { createClient } from '@/lib/supabase/client';

export interface OdometerAdjustmentRecord {
  id?: string;
  asset_id: string;
  previous_value_km: number;
  adjustment_km: number;
  new_value_km: number;
  reason: string;
  source?: string;
  created_at?: string;
}

export async function getOdometerAdjustments(assetId?: string) {
  const supabase = createClient();
  let query = supabase.from('odometer_adjustments').select('*').order('created_at', { ascending: false });
  if (assetId) query = query.eq('asset_id', assetId);
  return await query;
}

export async function createOdometerAdjustment(data: OdometerAdjustmentRecord) {
  const supabase = createClient();
  // 1. Create adjustment record
  const { data: record, error } = await supabase.from('odometer_adjustments').insert([data]).select().single();
  if (error) throw error;

  // 2. Update asset's current_odometer_km
  await supabase
    .from('assets')
    .update({ current_odometer_km: data.new_value_km, updated_at: new Date().toISOString() })
    .eq('id', data.asset_id);

  return record;
}
