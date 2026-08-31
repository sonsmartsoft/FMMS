import { createClient } from '@/lib/supabase/client';
import { MaintenanceRecord } from '@/types/mobility';
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

  let allMaint: MaintenanceRecord[] = [...dbMaint];

  // Apply custom edits from localStorage
  allMaint = allMaint.map(item => customMap[item.id] ? { ...item, ...customMap[item.id] } : item);

  // Add any new locally created items not in DB
  Object.values(customMap).forEach((customItem: any) => {
    if (!allMaint.some(m => m.id === customItem.id)) {
      if (!assetId || customItem.asset_id === realId || customItem.asset_id === assetId) {
        allMaint.unshift(customItem);
      }
    }
  });

  return allMaint.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
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

  let newId = `MAINT_${Date.now()}`;

  // 1. Save to LocalStorage
  const newMaintObj: MaintenanceRecord = {
    id: newId,
    asset_id: realId,
    maintenance_type: data.maintenance_type,
    date: payload.date,
    odometer_km: data.odometer_km || 0,
    cost: data.cost || 0,
    vendor: data.vendor || '',
    notes: data.notes,
    next_due_km: data.next_due_km,
    next_due_date: data.next_due_date,
    status: computeStatus(payload),
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      const customMap = stored ? JSON.parse(stored) : {};
      customMap[newId] = newMaintObj;
      localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Insert to Supabase DB
  try {
    const { data: dbData, error } = await supabase.from('maintenance_records').insert(payload).select().single();
    if (!error && dbData) {
      newMaintObj.id = dbData.id;
    }
  } catch {}

  // 3. Auto-sync to expenses
  if (!skipExpenseSync && (data.cost ?? 0) > 0) {
    try {
      const { createExpense } = await import('./expenseService');
      await createExpense({
        asset_id: realId,
        date: payload.date,
        category: 'MAINTENANCE',
        subcategory: data.maintenance_type,
        amount: data.cost ?? 0,
        currency: data.currency ?? 'VND',
        vendor: data.vendor,
        odometer_km: data.odometer_km,
        description: `Bảo dưỡng: ${data.maintenance_type}${data.notes ? ` - ${data.notes}` : ''}`,
      }, true);
    } catch {}
  }

  return newMaintObj;
}

export async function updateMaintenanceRecord(id: string, data: Partial<MaintenanceInput>): Promise<MaintenanceRecord> {
  const realAssetId = data.asset_id ? resolveAssetId(data.asset_id) : undefined;
  const supabase = createClient();

  const updatePayload: any = {};
  if (data.maintenance_type) updatePayload.maintenance_type = data.maintenance_type;
  if (data.date) updatePayload.date = data.date;
  if (data.odometer_km !== undefined) updatePayload.odometer_km = data.odometer_km;
  if (data.cost !== undefined) updatePayload.cost = data.cost;
  if (data.currency) updatePayload.currency = data.currency;
  if (data.vendor !== undefined) updatePayload.vendor = data.vendor;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.next_due_km !== undefined) updatePayload.next_due_km = data.next_due_km;
  if (data.next_due_date !== undefined) updatePayload.next_due_date = data.next_due_date;
  if (data.warranty_until !== undefined) updatePayload.warranty_until = data.warranty_until;
  if (realAssetId) updatePayload.asset_id = realAssetId;

  try {
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('maintenance_records').update(updatePayload).eq('id', id);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_maintenance');
      const customMap = stored ? JSON.parse(stored) : {};
      const existing = customMap[id] || {};
      customMap[id] = {
        ...existing,
        ...data,
        id,
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };
      localStorage.setItem('fmms_custom_maintenance', JSON.stringify(customMap));
    } catch {}
  }

  return { id, ...data } as MaintenanceRecord;
}

export async function deleteMaintenanceRecord(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('maintenance_records').delete().eq('id', id);
  } catch {}

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

  return true;
}
