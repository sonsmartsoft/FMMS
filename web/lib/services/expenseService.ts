import { createClient } from '@/lib/supabase/client';
import { ExpenseRecord } from '@/types/mobility';

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

export async function getExpenses(assetId?: string): Promise<ExpenseRecord[]> {
  const supabase = createClient();
  let query = supabase.from('expenses').select('*').order('date', { ascending: false });
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapExpenseRow);
}

export async function createExpense(data: ExpenseInput) {
  const supabase = createClient();
  const { data: created, error } = await supabase
    .from('expenses')
    .insert({
      asset_id: data.asset_id,
      date: data.date,
      category: data.category,
      amount: data.amount,
      currency: data.currency ?? 'VND',
      vendor: data.vendor ?? null,
      odometer_km: data.odometer_km ?? null,
      description: data.description ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapExpenseRow(created);
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