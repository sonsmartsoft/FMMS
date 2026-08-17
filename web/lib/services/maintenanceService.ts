import { createClient } from '@/lib/supabase/client';
import { MaintenanceRecord } from '@/types/mobility';

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
    date: row.date,
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
  const supabase = createClient();
  let query = supabase.from('maintenance_records').select('*').order('date', { ascending: false });
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapMaintenanceRow);
}

export async function createMaintenanceRecord(data: MaintenanceInput) {
  const supabase = createClient();
  const { data: created, error } = await supabase
    .from('maintenance_records')
    .insert({
      asset_id: data.asset_id,
      maintenance_type: data.maintenance_type,
      date: data.date,
      odometer_km: data.odometer_km ?? null,
      cost: data.cost ?? 0,
      currency: data.currency ?? 'VND',
      vendor: data.vendor ?? null,
      notes: data.notes ?? null,
      next_due_km: data.next_due_km ?? null,
      next_due_date: data.next_due_date ?? null,
      warranty_until: data.warranty_until ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapMaintenanceRow(created);
}

export async function updateMaintenanceRecord(id: string, data: Partial<MaintenanceInput>) {
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
    .single();
  if (error) throw error;
  return mapMaintenanceRow(updated);
}

export async function deleteMaintenanceRecord(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('maintenance_records').delete().eq('id', id);
  if (error) throw error;
}