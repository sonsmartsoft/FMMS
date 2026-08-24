import { createClient } from '@/lib/supabase/client';
import { ExpenseRecord } from '@/types/mobility';
import { MOCK_EXPENSES } from '@/lib/data/mockData';

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
    amount: Number(row.amount) || 0,
    currency: row.currency || 'VND',
    vendor: row.vendor ?? undefined,
    odometer_km: row.odometer_km != null ? Number(row.odometer_km) : undefined,
    description: row.description ?? '',
  };
}

import { resolveAssetId } from './assetService';

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
  return {
    id: `EX_${Date.now()}`,
    ...payload,
    currency: payload.currency,
    description: payload.description || '',
  } as ExpenseRecord;
}

export async function updateExpense(id: string, data: Partial<ExpenseInput>) {
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
    .single();
  if (error) throw error;
  return mapExpenseRow(updated);
}

export async function deleteExpense(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}