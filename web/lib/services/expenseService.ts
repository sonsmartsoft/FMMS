import { createClient } from '@/lib/supabase/client';
import { ExpenseRecord } from '@/types/mobility';
import { MOCK_EXPENSES } from '@/lib/data/mockData';
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

  try {
    const supabase = createClient();
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      const rows = data.map(mapExpenseRow);
      return rows.map(r => customMap[r.id] ? { ...r, ...customMap[r.id] } : r);
    }
  } catch {}

  const mergedMock = MOCK_EXPENSES.map(e => customMap[e.id] ? { ...e, ...customMap[e.id] } : e);
  return mergedMock.filter(e => 
    !assetId || 
    e.asset_id === realId || 
    e.asset_id === assetId
  );
}

export async function createExpense(data: ExpenseInput) {
  const realId = resolveAssetId(data.asset_id);
  const supabase = createClient();
  const payload: any = {
    asset_id: realId,
    date: data.date,
    category: data.category,
    subcategory: data.subcategory ?? null,
    sub_category: data.subcategory ?? null,
    amount: data.amount,
    currency: data.currency ?? 'VND',
    vendor: data.vendor ?? null,
    odometer_km: data.odometer_km ?? null,
    description: data.description ?? null,
  };

  const newExpObj = {
    id: `EX_${Date.now()}`,
    ...payload,
    currency: payload.currency,
    description: payload.description || '',
  } as ExpenseRecord;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_expenses');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[newExpObj.id] = newExpObj;
      localStorage.setItem('fmms_custom_expenses', JSON.stringify(customMap));
    } catch {}
  }

  (MOCK_EXPENSES as any[]).unshift(newExpObj);

  try {
    let { data: created, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error && error.message?.includes('subcategory')) {
      delete payload.subcategory;
      const res2 = await supabase
        .from('expenses')
        .insert(payload)
        .select()
        .maybeSingle();
      created = res2.data;
      error = res2.error;
    }

    if (error) {
      console.warn('Supabase createExpense warning:', error.message);
    } else if (created) {
      return mapExpenseRow(created);
    }
  } catch (err) {
    console.warn('createExpense Supabase fallback:', err);
  }
  return newExpObj;
}

export async function updateExpense(id: string, data: Partial<ExpenseInput>) {
  const realAssetId = data.asset_id ? resolveAssetId(data.asset_id) : undefined;
  
  const existingIdx = (MOCK_EXPENSES as any[]).findIndex((e: any) => e.id === id);
  if (existingIdx >= 0) {
    const target = (MOCK_EXPENSES as any[])[existingIdx];
    if (data.date != null) target.date = data.date;
    if (data.category != null) target.category = data.category;
    if (data.subcategory != null) target.subcategory = data.subcategory;
    if (data.amount != null) target.amount = data.amount;
    if (data.vendor != null) target.vendor = data.vendor;
    if (data.odometer_km != null) target.odometer_km = data.odometer_km;
    if (data.description != null) target.description = data.description;
    if (realAssetId != null) target.asset_id = realAssetId;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_expenses');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = {
        id,
        asset_id: realAssetId || (existingIdx >= 0 ? (MOCK_EXPENSES as any[])[existingIdx].asset_id : '22222222-2222-2222-2222-222222222222'),
        date: data.date,
        category: data.category,
        subcategory: data.subcategory,
        amount: data.amount,
        vendor: data.vendor,
        odometer_km: data.odometer_km,
        description: data.description,
      };
      localStorage.setItem('fmms_custom_expenses', JSON.stringify(customMap));
    } catch {}
  }

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const updatePayload: any = {
        ...(data.date ? { date: data.date } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.amount != null ? { amount: data.amount } : {}),
        ...(data.vendor !== undefined ? { vendor: data.vendor } : {}),
        ...(data.odometer_km !== undefined ? { odometer_km: data.odometer_km } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(realAssetId ? { asset_id: realAssetId } : {}),
      };

      if (data.subcategory !== undefined) {
        updatePayload.subcategory = data.subcategory;
        updatePayload.sub_category = data.subcategory;
      }

      let { data: updated, error } = await supabase
        .from('expenses')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error && error.message?.includes('subcategory')) {
        delete updatePayload.subcategory;
        const res2 = await supabase
          .from('expenses')
          .update(updatePayload)
          .eq('id', id)
          .select()
          .maybeSingle();
        updated = res2.data;
        error = res2.error;
      }

      if (error) {
        console.warn('Supabase updateExpense warning:', error.message);
      } else if (updated) {
        return mapExpenseRow(updated);
      }
    } catch (err) {
      console.warn('updateExpense Supabase fallback:', err);
    }
  }

  return mapExpenseRow({
    id,
    asset_id: realAssetId || '22222222-2222-2222-2222-222222222222',
    date: data.date || new Date().toISOString().slice(0, 10),
    category: data.category || 'Running',
    subcategory: data.subcategory,
    amount: data.amount || 0,
    currency: data.currency || 'VND',
    vendor: data.vendor,
    odometer_km: data.odometer_km,
    description: data.description || '',
  });
}

export async function deleteExpense(id: string) {
  const delIdx = (MOCK_EXPENSES as any[]).findIndex((e: any) => e.id === id);
  if (delIdx >= 0) (MOCK_EXPENSES as any[]).splice(delIdx, 1);

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

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('expenses').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteExpense Supabase fallback:', err);
    }
  }
}