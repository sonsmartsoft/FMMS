import { createClient } from '@/lib/supabase/client';
import { resolveAssetId, isValidUuid } from './assetService';

export interface OdometerLogRecord {
  id: string;
  asset_id: string;
  date: string;
  odometer_km: number;
  note: string;
}

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

  const localLogs = getLocalOdoLogs().filter(o => {
    if (!assetId) return true;
    const oAssetId = resolveAssetId(o.asset_id);
    return oAssetId === realId || o.asset_id === assetId || o.asset_id === realId;
  });

  // Merge unique logs by id
  const map = new Map<string, OdometerLogRecord>();
  [...supabaseLogs, ...localLogs].forEach(item => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values()).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function createOdometerLog(input: {
  asset_id: string;
  date: string;
  odometer_km: number;
  note?: string;
}): Promise<OdometerLogRecord> {
  const realId = resolveAssetId(input.asset_id);
  const newLog: OdometerLogRecord = {
    id: `ODO_${Date.now()}`,
    asset_id: realId,
    date: input.date || new Date().toISOString().slice(0, 10),
    odometer_km: input.odometer_km,
    note: input.note || '',
  };

  try {
    const supabase = createClient();
    await supabase.from('odometer_adjustments').insert({
      asset_id: realId,
      previous_value_km: input.odometer_km,
      adjustment_km: 0,
      new_value_km: input.odometer_km,
      reason: input.note || 'Cập nhật Odometer định kỳ',
      source: 'MANUAL',
    });

    await supabase
      .from('assets')
      .update({ current_odometer_km: input.odometer_km, updated_at: new Date().toISOString() })
      .eq('id', realId);
  } catch (err) {
    console.warn('Supabase createOdometerLog warning:', err);
  }

  const locals = getLocalOdoLogs().filter(o => o.id !== newLog.id);
  saveLocalOdoLogs([newLog, ...locals]);

  return newLog;
}

export async function updateOdometerLog(id: string, input: Partial<OdometerLogRecord>): Promise<OdometerLogRecord> {
  try {
    const supabase = createClient();
    const updatePayload: any = {};
    if (input.odometer_km != null) updatePayload.new_value_km = input.odometer_km;
    if (input.note != null) updatePayload.reason = input.note;
    await supabase.from('odometer_adjustments').update(updatePayload).eq('id', id);
  } catch (err) {
    console.warn('Supabase updateOdometerLog warning:', err);
  }

  const locals = getLocalOdoLogs();
  const idx = locals.findIndex(o => o.id === id);
  if (idx >= 0) {
    if (input.date) locals[idx].date = input.date;
    if (input.odometer_km != null) locals[idx].odometer_km = input.odometer_km;
    if (input.note != null) locals[idx].note = input.note;
    saveLocalOdoLogs(locals);
    return locals[idx];
  }

  return {
    id,
    asset_id: input.asset_id || '',
    date: input.date || new Date().toISOString().slice(0, 10),
    odometer_km: input.odometer_km || 0,
    note: input.note || '',
  };
}

export async function deleteOdometerLog(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('odometer_adjustments').delete().eq('id', id);
  } catch (err) {
    console.warn('Supabase deleteOdometerLog warning:', err);
  }

  const locals = getLocalOdoLogs().filter(o => o.id !== id);
  saveLocalOdoLogs(locals);
  return true;
}
