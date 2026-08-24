import { createClient } from '@/lib/supabase/client';

export interface InsuranceRow {
  id: string;
  asset_id: string;
  provider: string;
  policy_number: string;
  policy_type: 'MANDATORY' | 'COMPREHENSIVE' | 'OTHER';
  start_date: string;
  expiry_date: string;
  cost: number;
  coverage_amount?: number;
  document_url?: string;
  agent_name?: string;
  agent_phone?: string;
  provider_hotline?: string;
}

export interface InsuranceInput {
  asset_id: string;
  provider: string;
  policy_number: string;
  policy_type: InsuranceRow['policy_type'];
  start_date: string;
  expiry_date: string;
  cost: number;
  coverage_amount?: number;
  document_url?: string;
  agent_name?: string;
  agent_phone?: string;
  provider_hotline?: string;
}

export const POLICY_TYPE_LABELS: Record<InsuranceRow['policy_type'], string> = {
  COMPREHENSIVE: 'Bảo hiểm vật chất',
  MANDATORY: 'Bảo hiểm TNDS bắt buộc',
  OTHER: 'Khác',
};

export function mapInsuranceRow(row: any): InsuranceRow {
  return {
    id: row.id,
    asset_id: row.asset_id,
    provider: row.provider,
    policy_number: row.policy_number,
    policy_type: row.policy_type ?? 'OTHER',
    start_date: row.start_date,
    expiry_date: row.expiry_date,
    cost: Number(row.cost) || 0,
    coverage_amount: row.coverage_amount != null ? Number(row.coverage_amount) : undefined,
    document_url: row.document_url ?? undefined,
    agent_name: row.agent_name ?? undefined,
    agent_phone: row.agent_phone ?? undefined,
    provider_hotline: row.provider_hotline ?? undefined,
  };
}

export async function getInsurancePolicies(assetId?: string): Promise<InsuranceRow[]> {
  const supabase = createClient();
  let query = supabase.from('insurance_policies').select('*').order('expiry_date', { ascending: false });
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapInsuranceRow);
}

export async function createInsurancePolicy(input: InsuranceInput) {
  const supabase = createClient();
  const { data, error } = await supabase.from('insurance_policies').insert([input]).select().single();
  if (error) throw error;
  return mapInsuranceRow(data);
}

export async function updateInsurancePolicy(id: string, input: Partial<InsuranceInput>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('insurance_policies').update(input).eq('id', id).select().single();
  if (error) throw error;
  return mapInsuranceRow(data);
}

export async function deleteInsurancePolicy(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
  if (error) throw error;
}