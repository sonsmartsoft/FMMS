import { createClient } from '@/lib/supabase/client';
import { PartRecord, MOCK_PARTS } from '@/lib/data/mockData';
import { resolveAssetId, isValidUuid } from './assetService';

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
    asset_id: row.asset_id ?? undefined,
    name: row.part_name,
    brand: row.brand ?? '',
    category: row.supplier || 'Khác',
    install_date: (row.installation_date ?? row.purchase_date ?? '').slice(0, 10),
    cost: Number(row.cost) || 0,
    odometer_km: Number(row.installed_odometer_km) || 0,
    notes: row.notes ?? undefined,
  };
}

export async function getParts(assetId?: string): Promise<PartRecord[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbParts: PartRecord[] = [];
  try {
    const supabase = createClient();
    let query = supabase.from('parts').select('*').order('installation_date', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbParts = data.map(mapPartRow);
    }
  } catch {}

  let allParts: PartRecord[] = dbParts.length > 0
    ? dbParts
    : (MOCK_PARTS as any[]).filter(p => {
        if (!assetId) return true;
        const pAssetId = (p as any).asset_id ? resolveAssetId((p as any).asset_id) : '20260308-0001-4222-8888-19b213872026';
        return pAssetId === realId || (p as any).asset_id === assetId || (p as any).asset_id === realId;
      });

  // Apply custom edits from localStorage
  allParts = allParts.map(p => customMap[p.id] ? { ...p, ...customMap[p.id] } : p);

  // Add any locally created parts
  Object.values(customMap).forEach((customPart: any) => {
    if (!allParts.some(p => p.id === customPart.id)) {
      const cAssetId = customPart.asset_id ? resolveAssetId(customPart.asset_id) : undefined;
      if (!assetId || cAssetId === realId || customPart.asset_id === assetId || customPart.asset_id === realId) {
        allParts.unshift(customPart);
      }
    }
  });

  return allParts;
}

export async function createPart(input: PartInput): Promise<PartRecord> {
  const realId = resolveAssetId(input.asset_id);
  const supabase = createClient();
  const payload = {
    asset_id: realId,
    part_name: input.part_name,
    part_number: input.part_number ?? null,
    brand: input.brand ?? null,
    supplier: input.supplier ?? null,
    purchase_date: input.purchase_date ?? input.installation_date ?? null,
    installation_date: input.installation_date ?? new Date().toISOString().slice(0, 10),
    cost: input.cost ?? 0,
    installed_odometer_km: input.installed_odometer_km ?? null,
    notes: input.notes ?? null,
    status: 'INSTALLED',
  };

  const newPartObj: PartRecord = {
    id: `PR_${Date.now()}`,
    name: input.part_name,
    brand: input.brand || '',
    category: input.supplier || 'Khác',
    install_date: payload.installation_date,
    cost: payload.cost,
    odometer_km: payload.installed_odometer_km || 0,
    notes: input.notes,
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[newPartObj.id] = { ...newPartObj, asset_id: realId };
      localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Mutate in-memory
  (MOCK_PARTS as any[]).unshift(newPartObj);

  // 3. Save to Supabase
  try {
    const { data, error } = await supabase
      .from('parts')
      .insert(payload)
      .select()
      .maybeSingle();
    if (!error && data) return mapPartRow(data);
  } catch (err) {
    console.warn('createPart Supabase fallback:', err);
  }

  return newPartObj;
}

export async function updatePart(id: string, input: Partial<PartInput>): Promise<PartRecord> {
  const existingIdx = (MOCK_PARTS as any[]).findIndex((p: any) => p.id === id);
  const updatedPart: PartRecord = {
    id,
    name: input.part_name || (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].name : 'Phụ tùng'),
    brand: input.brand || (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].brand : ''),
    category: input.supplier || (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].category : 'Khác'),
    install_date: input.installation_date || (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].install_date : new Date().toISOString().slice(0, 10)),
    cost: input.cost ?? (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].cost : 0),
    odometer_km: input.installed_odometer_km ?? (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].odometer_km : 0),
    notes: input.notes ?? (existingIdx >= 0 ? (MOCK_PARTS as any[])[existingIdx].notes : undefined),
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = { ...(customMap[id] || {}), ...updatedPart };
      localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Mutate in-memory
  if (existingIdx >= 0) {
    (MOCK_PARTS as any[])[existingIdx] = updatedPart;
  }

  // 3. Update Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const payload: Record<string, any> = {};
      if (input.part_name != null) payload.part_name = input.part_name;
      if (input.brand != null) payload.brand = input.brand;
      if (input.supplier != null) payload.supplier = input.supplier;
      if (input.installation_date != null) payload.installation_date = input.installation_date;
      if (input.cost != null) payload.cost = input.cost;
      if (input.installed_odometer_km != null) payload.installed_odometer_km = input.installed_odometer_km;
      if (input.notes != null) payload.notes = input.notes;

      const { data, error } = await supabase.from('parts').update(payload).eq('id', id).select().maybeSingle();
      if (!error && data) return mapPartRow(data);
    } catch (err) {
      console.warn('updatePart Supabase fallback:', err);
    }
  }

  return updatedPart;
}

export async function deletePart(id: string) {
  // 1. Delete from LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      if (stored) {
        const customMap: Record<string, any> = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
      }
    } catch {}
  }

  // 2. Mutate in-memory
  const existingIdx = (MOCK_PARTS as any[]).findIndex((p: any) => p.id === id);
  if (existingIdx >= 0) {
    (MOCK_PARTS as any[]).splice(existingIdx, 1);
  }

  // 3. Delete from Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('parts').delete().eq('id', id);
    } catch (err) {
      console.warn('deletePart Supabase fallback:', err);
    }
  }
  return true;
}