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

export async function createInsurancePolicy(input: InsuranceInput): Promise<InsuranceRow> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from('insurance_policies').insert([input]).select().single();
    if (!error && data) return mapInsuranceRow(data);
    if (error && error.message.includes('column')) throw error;
    if (error) throw error;
    if (!data) throw new Error('Không thể tạo hợp đồng bảo hiểm');
    return mapInsuranceRow(data);
  } catch (err: any) {
    if (err?.message?.includes('column') || err?.code === 'PGRST204') {
      // Fallback to core columns if database schema has not been migrated yet
      const basePayload = {
        asset_id: input.asset_id,
        provider: input.provider,
        policy_number: input.policy_number,
        policy_type: input.policy_type,
        start_date: input.start_date,
        expiry_date: input.expiry_date,
        cost: input.cost,
        coverage_amount: input.coverage_amount,
        document_url: input.document_url,
      };
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('insurance_policies')
        .insert([basePayload])
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      if (!fallbackData) throw new Error('Không thể tạo hợp đồng bảo hiểm');
      return mapInsuranceRow({ ...fallbackData, agent_name: input.agent_name, agent_phone: input.agent_phone, provider_hotline: input.provider_hotline });
    }
    throw err;
  }
}

export async function updateInsurancePolicy(id: string, input: Partial<InsuranceInput>): Promise<InsuranceRow> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase.from('insurance_policies').update(input).eq('id', id).select().single();
    if (!error && data) return mapInsuranceRow(data);
    if (error && error.message.includes('column')) throw error;
    if (error) throw error;
    if (!data) throw new Error('Không thể cập nhật hợp đồng bảo hiểm');
    return mapInsuranceRow(data);
  } catch (err: any) {
    if (err?.message?.includes('column') || err?.code === 'PGRST204') {
      const basePayload: Record<string, any> = {};
      if ('asset_id' in input) basePayload.asset_id = input.asset_id;
      if ('provider' in input) basePayload.provider = input.provider;
      if ('policy_number' in input) basePayload.policy_number = input.policy_number;
      if ('policy_type' in input) basePayload.policy_type = input.policy_type;
      if ('start_date' in input) basePayload.start_date = input.start_date;
      if ('expiry_date' in input) basePayload.expiry_date = input.expiry_date;
      if ('cost' in input) basePayload.cost = input.cost;
      if ('coverage_amount' in input) basePayload.coverage_amount = input.coverage_amount;
      if ('document_url' in input) basePayload.document_url = input.document_url;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('insurance_policies')
        .update(basePayload)
        .eq('id', id)
        .select()
        .single();
      if (fallbackError) throw fallbackError;
      if (!fallbackData) throw new Error('Không thể cập nhật hợp đồng bảo hiểm');
      return mapInsuranceRow({ ...fallbackData, ...input });
    }
    throw err;
  }
}

export async function deleteInsurancePolicy(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
  if (error) throw error;
}