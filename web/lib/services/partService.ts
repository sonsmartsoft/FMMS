import { createClient } from '@/lib/supabase/client';
import { resolveAssetId, isValidUuid } from './assetService';

export interface PartRecord {
  id: string;
  asset_id?: string;
  name: string;
  brand: string;
  category: string;
  install_date: string;
  cost: number;
  odometer_km: number;
  warranty_months?: number;
  notes?: string;
}

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

  let allParts: PartRecord[] = [...dbParts];

  // Apply custom edits from localStorage
  allParts = allParts.map(p => customMap[p.id] ? { ...p, ...customMap[p.id] } : p);

  // Add any locally created parts not in DB (avoid duplicating if matching name + install_date + cost exists)
  Object.values(customMap).forEach((customPart: any) => {
    if (!customPart || !customPart.id) return;
    const isAlreadyInDb = allParts.some(p => 
      p.id === customPart.id || 
      (customPart.id.startsWith('PR_') && p.name === customPart.name && p.install_date === customPart.install_date && Number(p.cost) === Number(customPart.cost))
    );
    if (!isAlreadyInDb) {
      const cAssetId = customPart.asset_id ? resolveAssetId(customPart.asset_id) : undefined;
      if (!assetId || cAssetId === realId || customPart.asset_id === assetId || customPart.asset_id === realId) {
        allParts.unshift(customPart);
      }
    }
  });

  const seenIds = new Set<string>();
  const uniqueParts: PartRecord[] = [];
  for (const part of allParts) {
    if (!seenIds.has(part.id)) {
      seenIds.add(part.id);
      uniqueParts.push(part);
    }
  }

  return uniqueParts.sort((a, b) => (b.install_date || '').localeCompare(a.install_date || ''));
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

  let newPartObj: PartRecord;

  // 1. Insert to Supabase DB first
  try {
    const { data, error } = await supabase.from('parts').insert(payload).select().single();
    if (!error && data) {
      newPartObj = mapPartRow(data);
      // Clean up matching temporary local custom items
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('fmms_custom_parts');
          if (stored) {
            const customMap = JSON.parse(stored);
            Object.keys(customMap).forEach(k => {
              if (k.startsWith('PR_') && customMap[k].name === input.part_name && Number(customMap[k].cost) === Number(input.cost)) {
                delete customMap[k];
              }
            });
            localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
          }
        } catch {}
      }
      return newPartObj;
    }
  } catch {}

  // 2. Fallback to LocalStorage if DB insert fails
  const tempId = `PR_${Date.now()}`;
  newPartObj = {
    id: tempId,
    name: input.part_name,
    brand: input.brand || '',
    category: input.supplier || 'Khác',
    install_date: payload.installation_date,
    cost: Number(input.cost) || 0,
    odometer_km: Number(input.installed_odometer_km) || 0,
    notes: input.notes,
    asset_id: realId,
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      const customMap = stored ? JSON.parse(stored) : {};
      customMap[tempId] = newPartObj;
      localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
    } catch {}
  }

  return newPartObj;
}

export async function updatePart(id: string, input: Partial<PartInput>): Promise<PartRecord> {
  const realAssetId = input.asset_id ? resolveAssetId(input.asset_id) : undefined;
  const supabase = createClient();

  const updatePayload: any = {};
  if (input.part_name) updatePayload.part_name = input.part_name;
  if (input.brand !== undefined) updatePayload.brand = input.brand;
  if (input.supplier !== undefined) updatePayload.supplier = input.supplier;
  if (input.installation_date) updatePayload.installation_date = input.installation_date;
  if (input.cost !== undefined) updatePayload.cost = input.cost;
  if (input.installed_odometer_km !== undefined) updatePayload.installed_odometer_km = input.installed_odometer_km;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (realAssetId) updatePayload.asset_id = realAssetId;

  try {
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('parts').update(updatePayload).eq('id', id);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      const customMap = stored ? JSON.parse(stored) : {};
      const existing = customMap[id] || {};
      customMap[id] = {
        ...existing,
        ...input,
        id,
        name: input.part_name || existing.name,
        category: input.supplier || existing.category,
        install_date: input.installation_date || existing.install_date,
        cost: input.cost !== undefined ? Number(input.cost) : existing.cost,
        odometer_km: input.installed_odometer_km !== undefined ? Number(input.installed_odometer_km) : existing.odometer_km,
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };
      localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
    } catch {}
  }

  return {
    id,
    name: input.part_name || '',
    brand: input.brand || '',
    category: input.supplier || 'Khác',
    install_date: input.installation_date || '',
    cost: Number(input.cost) || 0,
    odometer_km: Number(input.installed_odometer_km) || 0,
    notes: input.notes,
    asset_id: realAssetId,
  };
}

export async function deletePart(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('parts').delete().eq('id', id);
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_parts');
      if (stored) {
        const customMap = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_parts', JSON.stringify(customMap));
      }
    } catch {}
  }

  return true;
}
