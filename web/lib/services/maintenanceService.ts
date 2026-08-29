import { createClient } from '@/lib/supabase/client';
import { MaintenanceRecord } from '@/types/mobility';
import { MOCK_MAINTENANCE_RECORDS } from '@/lib/data/mockData';
import { resolveAssetId, isValidUuid } from './assetService';

export interface MaintenanceInput {
  asset_id: string;
  maintenance_type: string;
  date: string;
  odometer_km?: number;
  cost?: number;
  currency?: string;
  vendor?: string;
  notes?: string;
  next_due_km?: number;
  next_due_date?: string;
  warranty_until?: string;
}

/** Compute 'OK' | 'DUE_SOON' | 'OVERDUE' from next_due_date */
function computeStatus(row: any): MaintenanceRecord['status'] {
  if (!row.next_due_date) return 'OK';
  const days = Math.ceil(
    (new Date(row.next_due_date).getTime() - Date.now()) / 86400000,
  );
  if (days < 0) return 'OVERDUE';
  if (days <= 30) return 'DUE_SOON';
  return 'OK';
}

export function mapMaintenanceRow(row: any): MaintenanceRecord {
  return {
    id: row.id,
    asset_id: row.asset_id,
    maintenance_type: row.maintenance_type,
    date: row.date ? row.date.slice(0, 10) : '',
    odometer_km: Number(row.odometer_km) || 0,
    cost: Number(row.cost) || 0,
    vendor: row.vendor ?? '',
    notes: row.notes ?? undefined,
    next_due_km: row.next_due_km != null ? Number(row.next_due_km) : undefined,
    next_due_date: row.next_due_date ?? undefined,
    status: computeStatus(row),
  };
}

export async function getMaintenanceRecords(assetId?: string): Promise<MaintenanceRecord[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbMaint: MaintenanceRecord[] = [];
  try {
    const supabase = createClient();
    let query = supabase.from('maintenance_records').select('*').order('date', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbMaint = data.map(mapMaintenanceRow);
    }
  } catch {}

  let allMaint: MaintenanceRecord[] = dbMaint.length > 0
    ? dbMaint
    : (MOCK_MAINTENANCE_RECORDS as any[]).filter(m => 
        !assetId || 
        m.asset_id === realId || 
        m.asset_id === assetId || 
        (assetId === 'CAR01' && m.asset_id === '22222222-2222-2222-2222-222222222222') || 
        (m.asset_id === 'CAR01' && assetId === '22222222-2222-2222-2222-222222222222')
      );

  // Apply custom edits from localStorage
  allMaint = allMaint.map(item => customMap[item.id] ? { ...item, ...customMap[item.id] } : item);

  // Add any new locally created items not in DB/mock
  Object.values(customMap).forEach((customItem: any) => {
    if (!allMaint.some(m => m.id === customItem.id)) {
      if (!assetId || customItem.asset_id === realId || customItem.asset_id === assetId) {
        allMaint.unshift(customItem);
      }
    }
  });

  return allMaint;
}

export async function createMaintenanceRecord(data: MaintenanceInput, skipExpenseSync = false): Promise<MaintenanceRecord> {
  const realId = resolveAssetId(data.asset_id);
  const supabase = createClient();
  const payload = {
    asset_id: realId,
    maintenance_type: data.maintenance_type,
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km ?? null,
    cost: data.cost ?? 0,
    currency: data.currency ?? 'VND',
    vendor: data.vendor ?? null,
    notes: data.notes ?? null,
    next_due_km: data.next_due_km ?? null,
    next_due_date: data.next_due_date ?? null,
    warranty_until: data.warranty_until ?? null,
  };

  const newMaintObj: MaintenanceRecord = {
    id: `MT_${Date.now()}`,
    asset_id: realId,
    maintenance_type: data.maintenance_type,
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km ?? 0,
    cost: data.cost ?? 0,
    vendor: data.vendor ?? '',
    notes: data.notes ?? undefined,
    next_due_km: data.next_due_km ?? undefined,
    next_due_date: data.next_due_date ?? undefined,
    status: computeStatus(payload),
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[newMaintObj.id] = newMaintObj;
      localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Mutate in-memory mock data
  (MOCK_MAINTENANCE_RECORDS as any[]).unshift(newMaintObj);

  // 3. Auto-sync to Expense Service
  if (!skipExpenseSync && (data.cost || 0) > 0) {
    try {
      const { createExpense } = await import('./expenseService');
      await createExpense({
        asset_id: realId,
        date: data.date || new Date().toISOString().slice(0, 10),
        category: 'Maintenance',
        subcategory: 'Maintenance',
        amount: data.cost || 0,
        currency: 'VND',
        vendor: data.vendor || undefined,
        odometer_km: data.odometer_km || undefined,
        description: `Bảo dưỡng: ${data.maintenance_type}${data.vendor ? ` tại ${data.vendor}` : ''}${data.notes ? ` (${data.notes})` : ''}`,
      }, true); // skip auto link back
    } catch (eErr) {
      console.warn('Auto expense sync warning from createMaintenanceRecord:', eErr);
    }
  }

  // 4. Save to Supabase
  try {
    const { data: created, error } = await supabase
      .from('maintenance_records')
      .insert(payload)
      .select()
      .maybeSingle();
    if (!error && created) {
      return mapMaintenanceRow(created);
    }
  } catch (err) {
    console.warn('createMaintenanceRecord Supabase fallback:', err);
  }

  return newMaintObj;
}

export async function updateMaintenanceRecord(id: string, data: Partial<MaintenanceInput>) {
  const realAssetId = data.asset_id ? resolveAssetId(data.asset_id) : undefined;

  const existingIdx = (MOCK_MAINTENANCE_RECORDS as any[]).findIndex((m: any) => m.id === id);
  if (existingIdx >= 0) {
    const target = (MOCK_MAINTENANCE_RECORDS as any[])[existingIdx];
    if (data.maintenance_type != null) target.maintenance_type = data.maintenance_type;
    if (data.date != null) target.date = data.date;
    if (data.odometer_km != null) target.odometer_km = data.odometer_km;
    if (data.cost != null) target.cost = data.cost;
    if (data.vendor != null) target.vendor = data.vendor;
    if (data.notes != null) target.notes = data.notes;
    if (data.next_due_km != null) target.next_due_km = data.next_due_km;
    if (data.next_due_date != null) {
      target.next_due_date = data.next_due_date;
      target.status = computeStatus({ next_due_date: data.next_due_date });
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = {
        id,
        asset_id: realAssetId || (existingIdx >= 0 ? (MOCK_MAINTENANCE_RECORDS as any[])[existingIdx].asset_id : '22222222-2222-2222-2222-222222222222'),
        maintenance_type: data.maintenance_type,
        date: data.date,
        odometer_km: data.odometer_km,
        cost: data.cost,
        vendor: data.vendor,
        notes: data.notes,
        next_due_km: data.next_due_km,
        next_due_date: data.next_due_date,
      };
      localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
    } catch {}
  }

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from('maintenance_records')
        .update({
          ...(data.maintenance_type ? { maintenance_type: data.maintenance_type } : {}),
          ...(data.date ? { date: data.date } : {}),
          ...(data.odometer_km != null ? { odometer_km: data.odometer_km } : {}),
          ...(data.cost != null ? { cost: data.cost } : {}),
          ...(data.vendor != null ? { vendor: data.vendor } : {}),
          ...(data.notes != null ? { notes: data.notes } : {}),
          ...(data.next_due_km != null ? { next_due_km: data.next_due_km } : {}),
          ...(data.next_due_date != null ? { next_due_date: data.next_due_date } : {}),
        })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (!error && updated) return mapMaintenanceRow(updated);
    } catch (err) {
      console.warn('updateMaintenanceRecord Supabase fallback:', err);
    }
  }

  return mapMaintenanceRow({
    id,
    asset_id: realAssetId || '22222222-2222-2222-2222-222222222222',
    maintenance_type: data.maintenance_type || 'Bảo dưỡng',
    date: data.date || new Date().toISOString().slice(0, 10),
    odometer_km: data.odometer_km || 0,
    cost: data.cost || 0,
    vendor: data.vendor || '',
    notes: data.notes,
    next_due_km: data.next_due_km,
    next_due_date: data.next_due_date,
  });
}

export async function deleteMaintenanceRecord(id: string) {
  const existingIdx = (MOCK_MAINTENANCE_RECORDS as any[]).findIndex((m: any) => m.id === id);
  if (existingIdx >= 0) {
    (MOCK_MAINTENANCE_RECORDS as any[]).splice(existingIdx, 1);
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      if (stored) {
        const customMap = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
      }
    } catch {}
  }

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('maintenance_records').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteMaintenanceRecord Supabase fallback:', err);
    }
  }
}