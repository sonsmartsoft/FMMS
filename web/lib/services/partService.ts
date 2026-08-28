import { createClient } from '@/lib/supabase/client';
import { PartRecord, MOCK_PARTS } from '@/lib/data/mockData';

export interface PartInput {
  asset_id: string;
  part_name: string;
  part_number?: string;
  brand?: string;
  supplier?: string;
  purchase_date?: string;
  installation_date?: string;
  cost?: number;
  installed_odometer_km?: number;
  notes?: string;
}

export function mapPartRow(row: any): PartRecord {
  return {
    id: row.id,
    name: row.part_name,
    brand: row.brand ?? '',
    category: row.supplier || 'Khác',
    install_date: row.installation_date ?? row.purchase_date ?? '',
    cost: Number(row.cost) || 0,
    odometer_km: Number(row.installed_odometer_km) || 0,
    notes: row.notes ?? undefined,
  };
}

export async function getParts(assetId?: string): Promise<PartRecord[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('parts').select('*').order('installation_date', { ascending: false });
    if (assetId) {
      query = query.eq('asset_id', assetId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map(mapPartRow);
    }
  } catch {}

  return MOCK_PARTS;
}

export async function createPart(input: PartInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('parts')
    .insert({
      asset_id: input.asset_id,
      part_name: input.part_name,
      part_number: input.part_number ?? null,
      brand: input.brand ?? null,
      supplier: input.supplier ?? null,
      purchase_date: input.purchase_date ?? input.installation_date ?? null,
      installation_date: input.installation_date ?? null,
      cost: input.cost ?? 0,
      installed_odometer_km: input.installed_odometer_km ?? null,
      notes: input.notes ?? null,
      status: 'INSTALLED',
    })
    .select()
    .single();
  if (error) throw error;
  return mapPartRow(data);
}

export async function updatePart(id: string, input: Partial<PartInput>) {
  const existingIdx = (MOCK_PARTS as any[]).findIndex((p: any) => p.id === id);
  if (existingIdx >= 0) {
    const target = (MOCK_PARTS as any[])[existingIdx];
    if (input.part_name != null) target.name = input.part_name;
    if (input.brand != null) target.brand = input.brand;
    if (input.supplier != null) target.category = input.supplier;
    if (input.installation_date != null) target.install_date = input.installation_date;
    if (input.cost != null) target.cost = input.cost;
    if (input.installed_odometer_km != null) target.odometer_km = input.installed_odometer_km;
    if (input.notes != null) target.notes = input.notes;
  }
  return {
    id,
    name: input.part_name || 'Phụ tùng',
    brand: input.brand || '',
    category: input.supplier || 'Khác',
    install_date: input.installation_date || new Date().toISOString().slice(0, 10),
    cost: input.cost || 0,
    odometer_km: input.installed_odometer_km || 0,
    notes: input.notes,
  };
}

export async function deletePart(id: string) {
  const existingIdx = (MOCK_PARTS as any[]).findIndex((p: any) => p.id === id);
  if (existingIdx >= 0) {
    (MOCK_PARTS as any[]).splice(existingIdx, 1);
  }
  return true;
}