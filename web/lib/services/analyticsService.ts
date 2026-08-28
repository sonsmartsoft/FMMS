import { createClient } from '@/lib/supabase/client';

export interface MonthlySummary {
  id: string;
  asset_id: string;
  year: number;
  month: number;
  total_distance_km: number;
  total_fuel_liters: number;
  total_fuel_cost: number;
  total_maintenance_cost: number;
  total_expenses: number;
}

export interface DailySummary {
  id: string;
  asset_id: string;
  date: string;
  distance_km: number;
  fuel_cost: number;
  expenses: number;
}

export async function getMonthlySummaries(assetId?: string) {
  const supabase = createClient();
  let query = supabase.from('monthly_summaries').select('*').order('year', { ascending: false }).order('month', { ascending: false }).limit(12);
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  return await query;
}

export async function getDailySummaries(assetId?: string, days?: number) {
  const supabase = createClient();
  let query = supabase.from('daily_summaries').select('*').order('date', { ascending: false });
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  if (days) {
    query = query.limit(days);
  }
  return await query;
}
