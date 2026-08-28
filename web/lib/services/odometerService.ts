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

const LOCAL_ODO_KEY = 'fmms_local_odo_logs';

function getLocalOdoLogs(): OdometerLogRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ODO_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalOdoLogs(logs: OdometerLogRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_ODO_KEY, JSON.stringify(logs));
  } catch {}
}

export async function getOdometerLogs(assetId?: string): Promise<OdometerLogRecord[]> {
  const realId = resolveAssetId(assetId || 'f1');
  let supabaseLogs: OdometerLogRecord[] = [];

  if (assetId && isValidUuid(assetId)) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('odometer_adjustments')
        .select('*')
        .eq('asset_id', realId)
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        supabaseLogs = data.map(r => ({
          id: r.id,
          asset_id: r.asset_id,
          date: r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
          odometer_km: r.new_value_km || 0,
          note: r.reason || '',
        }));
      }
    } catch {}
  }

  const localLogs = getLocalOdoLogs().filter(o => !assetId || o.asset_id === realId || o.asset_id === assetId);
  const mockLogs = MOCK_ODOMETER_LOGS.filter(o => !assetId || o.asset_id === realId || o.asset_id === assetId || assetId.includes('19b21387'));

  // Merge unique logs by id
  const map = new Map<string, OdometerLogRecord>();
  [...supabaseLogs, ...localLogs, ...mockLogs].forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function createOdometerLog(data: { asset_id: string; date: string; odometer_km: number; note?: string }) {
  const realId = resolveAssetId(data.asset_id);
  let newId = `ODO_${Date.now()}`;

  if (isValidUuid(data.asset_id)) {
    try {
      const supabase = createClient();
      const { data: inserted, error } = await supabase.from('odometer_adjustments').insert({
        asset_id: realId,
        previous_value_km: 0,
        adjustment_km: 0,
        new_value_km: data.odometer_km,
        reason: data.note || 'Nhật ký Odometer',
        created_at: data.date ? `${data.date}T12:00:00.000Z` : new Date().toISOString(),
      }).select().single();

      if (!error && inserted) {
        newId = inserted.id;
      }

      // Update current asset odometer
      await supabase
        .from('assets')
        .update({ current_odometer_km: data.odometer_km, updated_at: new Date().toISOString() })
        .eq('id', realId);
    } catch (err) {
      console.warn('Supabase createOdometerLog error:', err);
    }
  }

  const newObj: OdometerLogRecord = {
    id: newId,
    asset_id: realId,
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km,
    note: data.note || '',
  };

  const locals = getLocalOdoLogs().filter(o => o.id !== newId);
  saveLocalOdoLogs([newObj, ...locals]);
  (MOCK_ODOMETER_LOGS as any[]).unshift(newObj);

  return newObj;
}

export async function updateOdometerLog(id: string, data: Partial<{ date: string; odometer_km: number; note: string; asset_id?: string }>) {
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const updatePayload: any = {};
      if (data.odometer_km != null) updatePayload.new_value_km = data.odometer_km;
      if (data.note != null) updatePayload.reason = data.note;
      if (data.date != null) updatePayload.created_at = `${data.date}T12:00:00.000Z`;

      await supabase.from('odometer_adjustments').update(updatePayload).eq('id', id);

      if (data.asset_id && isValidUuid(data.asset_id) && data.odometer_km != null) {
        await supabase
          .from('assets')
          .update({ current_odometer_km: data.odometer_km, updated_at: new Date().toISOString() })
          .eq('id', resolveAssetId(data.asset_id));
      }
    } catch (err) {
      console.warn('Supabase updateOdometerLog error:', err);
    }
  }

  const locals = getLocalOdoLogs();
  const locIdx = locals.findIndex(o => o.id === id);
  if (locIdx >= 0) {
    if (data.date != null) locals[locIdx].date = data.date;
    if (data.odometer_km != null) locals[locIdx].odometer_km = data.odometer_km;
    if (data.note != null) locals[locIdx].note = data.note;
    saveLocalOdoLogs(locals);
  }

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
    asset_id: data.asset_id || 'f1',
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km || 0,
    note: data.note || '',
  };
}

export async function deleteOdometerLog(id: string) {
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('odometer_adjustments').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase deleteOdometerLog error:', err);
    }
  }

  const locals = getLocalOdoLogs().filter(o => o.id !== id);
  saveLocalOdoLogs(locals);

  const existingIdx = (MOCK_ODOMETER_LOGS as any[]).findIndex(o => o.id === id);
  if (existingIdx >= 0) {
    (MOCK_ODOMETER_LOGS as any[]).splice(existingIdx, 1);
  }
  return true;
}
