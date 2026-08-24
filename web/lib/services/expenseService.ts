import { createClient } from '@/lib/supabase/client';
import { ExpenseRecord } from '@/types/mobility';
import { MOCK_EXPENSES } from '@/lib/data/mockData';
import { resolveAssetId, isValidUuid } from './assetService';

export interface ExpenseInput {
  asset_id: string;
  date: string;
  category: ExpenseRecord['category'];
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
    subcategory: row.subcategory ?? undefined,
    amount: Number(row.amount) || 0,
    currency: row.currency || 'VND',
    vendor: row.vendor ?? undefined,
    odometer_km: row.odometer_km != null ? Number(row.odometer_km) : undefined,
    description: row.description ?? '',
  };
}

export async function getExpenses(assetId?: string): Promise<ExpenseRecord[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  try {
    const supabase = createClient();
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map(mapExpenseRow);
    }
  } catch {}

  return MOCK_EXPENSES.filter(e => 
    !assetId || 
    e.asset_id === realId || 
    e.asset_id === assetId
  );
}

export async function createExpense(data: ExpenseInput) {
  const realId = resolveAssetId(data.asset_id);
  const supabase = createClient();
  const payload = {
    asset_id: realId,
    date: data.date,
    category: data.category,
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

  (MOCK_EXPENSES as any[]).unshift(newExpObj);

  try {
    const { data: created, error } = await supabase
      .from('expenses')
      .insert(payload)
      .select()
      .maybeSingle();
    if (!error && created) return mapExpenseRow(created);
  } catch (err) {
    console.warn('createExpense Supabase fallback:', err);
  }
  return newExpObj;
}

export async function updateExpense(id: string, data: Partial<ExpenseInput>) {
  const existingIdx = (MOCK_EXPENSES as any[]).findIndex((e: any) => e.id === id);
  if (existingIdx >= 0) {
    const target = (MOCK_EXPENSES as any[])[existingIdx];
    if (data.date != null) target.date = data.date;
    if (data.category != null) target.category = data.category;
    if (data.amount != null) target.amount = data.amount;
    if (data.vendor != null) target.vendor = data.vendor;
    if (data.odometer_km != null) target.odometer_km = data.odometer_km;
    if (data.description != null) target.description = data.description;
    if (data.asset_id != null) target.asset_id = resolveAssetId(data.asset_id);
  }

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      const { data: updated, error } = await supabase
        .from('expenses')
        .update({
          ...(data.date ? { date: data.date } : {}),
          ...(data.category ? { category: data.category } : {}),
          ...(data.amount != null ? { amount: data.amount } : {}),
          ...(data.vendor != null ? { vendor: data.vendor } : {}),
          ...(data.odometer_km != null ? { odometer_km: data.odometer_km } : {}),
          ...(data.description != null ? { description: data.description } : {}),
        })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (!error && updated) return mapExpenseRow(updated);
    } catch (err) {
      console.warn('updateExpense Supabase fallback:', err);
    }
  }

  return mapExpenseRow({
    id,
    asset_id: resolveAssetId(data.asset_id),
    date: data.date || new Date().toISOString().slice(0, 10),
    category: data.category || 'FUEL',
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

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('expenses').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteExpense Supabase fallback:', err);
    }
  }
}