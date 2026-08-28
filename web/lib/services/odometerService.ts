import { createClient } from '@/lib/supabase/client';
import { MOCK_ODOMETER_LOGS, OdometerLogRecord } from '@/lib/data/mockData';
import { resolveAssetId, isValidUuid } from './assetService';

export type { OdometerLogRecord };

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
  const { data: record, error } = await supabase.from('odometer_adjustments').insert([data]).select().single();
  if (error) throw error;

  await supabase
    .from('assets')
    .update({ current_odometer_km: data.new_value_km, updated_at: new Date().toISOString() })
    .eq('id', data.asset_id);

  return record;
}

export async function getOdometerLogs(assetId?: string): Promise<OdometerLogRecord[]> {
  const realId = resolveAssetId(assetId || 'f1');
  if (assetId && isValidUuid(assetId)) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('odometer_adjustments')
        .select('*')
        .eq('asset_id', realId)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map(r => ({
          id: r.id,
          asset_id: r.asset_id,
          date: r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          odometer_km: r.new_value_km || 0,
          note: r.reason || '',
        }));
      }
    } catch {}
  }
  return MOCK_ODOMETER_LOGS.filter(o => !assetId || o.asset_id === realId || o.asset_id === assetId || assetId.includes('19b21387'));
}

export async function createOdometerLog(data: { asset_id: string; date: string; odometer_km: number; note?: string }) {
  const realId = resolveAssetId(data.asset_id);
  const newObj: OdometerLogRecord = {
    id: `ODO_${Date.now()}`,
    asset_id: realId,
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km,
    note: data.note || '',
  };
  (MOCK_ODOMETER_LOGS as any[]).unshift(newObj);

  if (isValidUuid(data.asset_id)) {
    try {
      const supabase = createClient();
      await supabase.from('odometer_adjustments').insert({
        asset_id: realId,
        previous_value_km: 0,
        adjustment_km: 0,
        new_value_km: data.odometer_km,
        reason: data.note || 'Nhật ký Odometer',
      });
    } catch {}
  }
  return newObj;
}

export async function updateOdometerLog(id: string, data: Partial<{ date: string; odometer_km: number; note: string }>) {
  const existingIdx = (MOCK_ODOMETER_LOGS as any[]).findIndex(o => o.id === id);
  if (existingIdx >= 0) {
    const target = MOCK_ODOMETER_LOGS[existingIdx];
    if (data.date != null) target.date = data.date;
    if (data.odometer_km != null) target.odometer_km = data.odometer_km;
    if (data.note != null) target.note = data.note;
    return target;
  }
  return {
    id,
    asset_id: 'f1',
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km || 0,
    note: data.note || '',
  };
}

export async function deleteOdometerLog(id: string) {
  const existingIdx = (MOCK_ODOMETER_LOGS as any[]).findIndex(o => o.id === id);
  if (existingIdx >= 0) {
    (MOCK_ODOMETER_LOGS as any[]).splice(existingIdx, 1);
  }
  return true;
}
