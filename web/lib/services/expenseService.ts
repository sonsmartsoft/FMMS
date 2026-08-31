import { createClient } from '@/lib/supabase/client';
import { ExpenseRecord } from '@/types/mobility';
import { resolveAssetId, isValidUuid } from './assetService';

export interface ExpenseInput {
  asset_id: string;
  date: string;
  category: ExpenseRecord['category'];
  subcategory?: string;
  amount: number;
  currency?: string;
  vendor?: string;
  odometer_km?: number;
  description?: string;
}

export function mapExpenseRow(row: any): ExpenseRecord {
  return {
    id: row.id,
    asset_id: row.asset_id,
    date: row.date,
    category: row.category,
    subcategory: row.subcategory || row.sub_category || undefined,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'VND',
    vendor: row.vendor ?? undefined,
    odometer_km: row.odometer_km != null ? Number(row.odometer_km) : undefined,
    description: row.description ?? '',
  };
}

export async function getExpenses(assetId?: string): Promise<ExpenseRecord[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_expenses');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbExpenses: ExpenseRecord[] = [];
  try {
    const supabase = createClient();
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbExpenses = data.map(mapExpenseRow);
    }
  } catch {}

  let allExpenses: ExpenseRecord[] = [...dbExpenses];

  // Apply custom edits from localStorage
  allExpenses = allExpenses.map(item => customMap[item.id] ? { ...item, ...customMap[item.id] } : item);

  // Add any new locally created items not in DB
  Object.values(customMap).forEach((customItem: any) => {
    if (!allExpenses.some(e => e.id === customItem.id)) {
      if (!assetId || customItem.asset_id === realId || customItem.asset_id === assetId) {
        allExpenses.unshift(customItem);
      }
    }
  });

  return allExpenses.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export async function createExpense(data: ExpenseInput, skipAutoLinks = false): Promise<ExpenseRecord> {
  const realId = resolveAssetId(data.asset_id);
  const supabase = createClient();
  const payload: any = {
    asset_id: realId,
    date: data.date || new Date().toISOString().slice(0, 10),
    category: data.category,
    subcategory: data.subcategory ?? null,
    sub_category: data.subcategory ?? null,
    amount: data.amount,
    currency: data.currency ?? 'VND',
    vendor: data.vendor ?? null,
    odometer_km: data.odometer_km ?? null,
    description: data.description ?? null,
  };

  let newId = `EX_${Date.now()}`;

  // 1. Save to LocalStorage
  const newExpObj: ExpenseRecord = {
    id: newId,
    ...payload,
    currency: payload.currency,
    description: payload.description || '',
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_expenses');
      const customMap = stored ? JSON.parse(stored) : {};
      customMap[newId] = newExpObj;
      localStorage.setItem('fmms_custom_expenses', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Insert to Supabase DB
  try {
    const { data: dbData, error } = await supabase.from('expenses').insert(payload).select().single();
    if (!error && dbData) {
      newExpObj.id = dbData.id;
    }
  } catch {}

  // 3. Auto-link to related services if requested
  if (!skipAutoLinks) {
    if (data.category === 'FUEL') {
      try {
        const { createFuelLog } = await import('./fuelService');
        await createFuelLog({
          asset_id: realId,
          date: data.date,
          liters: 0,
          price_per_liter: 0,
          total_cost: data.amount,
          odometer_km: data.odometer_km,
          notes: data.description,
        });
      } catch {}
    } else if (data.category === 'MAINTENANCE' || data.category === 'PARTS' || data.category === 'LABOR') {
      try {
        const { createMaintenanceRecord } = await import('./maintenanceService');
        await createMaintenanceRecord({
          asset_id: realId,
          date: data.date,
          maintenance_type: data.subcategory || data.description || 'Bảo dưỡng',
          cost: data.amount,
          odometer_km: data.odometer_km,
          vendor: data.vendor,
          notes: data.description,
        });
      } catch {}
    }
  }

  return newExpObj;
}

export async function updateExpense(id: string, data: Partial<ExpenseInput>): Promise<ExpenseRecord> {
  const realAssetId = data.asset_id ? resolveAssetId(data.asset_id) : undefined;
  const supabase = createClient();

  const updatePayload: any = {};
  if (data.date) updatePayload.date = data.date;
  if (data.category) updatePayload.category = data.category;
  if (data.subcategory !== undefined) {
    updatePayload.subcategory = data.subcategory;
    updatePayload.sub_category = data.subcategory;
  }
  if (data.amount !== undefined) updatePayload.amount = data.amount;
  if (data.currency) updatePayload.currency = data.currency;
  if (data.vendor !== undefined) updatePayload.vendor = data.vendor;
  if (data.odometer_km !== undefined) updatePayload.odometer_km = data.odometer_km;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (realAssetId) updatePayload.asset_id = realAssetId;

  try {
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('expenses').update(updatePayload).eq('id', id);
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_expenses');
      const customMap = stored ? JSON.parse(stored) : {};
      const existing = customMap[id] || {};
      customMap[id] = {
        ...existing,
        ...data,
        id,
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };
      localStorage.setItem('fmms_custom_expenses', JSON.stringify(customMap));
    } catch {}
  }

  return { id, ...data } as ExpenseRecord;
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    await supabase.from('expenses').delete().eq('id', id);
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_expenses');
      if (stored) {
        const customMap = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_expenses', JSON.stringify(customMap));
      }
    } catch {}
  }

  return true;
}
