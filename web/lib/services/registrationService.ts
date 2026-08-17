import { createClient } from '@/lib/supabase/client';

export interface RegistrationRow {
  id: string;
  asset_id: string;
  registration_number?: string;
  inspection_date?: string;
  inspection_expiry?: string;
  road_fee_expiry?: string;
  cost: number;
  document_url?: string;
}

export interface RegistrationInput {
  asset_id: string;
  registration_number?: string;
  inspection_date?: string;
  inspection_expiry?: string;
  road_fee_expiry?: string;
  cost?: number;
  document_url?: string;
}

export function mapRegistrationRow(row: any): RegistrationRow {
  return {
    id: row.id,
    asset_id: row.asset_id,
    registration_number: row.registration_number ?? undefined,
    inspection_date: row.inspection_date ?? undefined,
    inspection_expiry: row.inspection_expiry ?? undefined,
    road_fee_expiry: row.road_fee_expiry ?? undefined,
    cost: Number(row.cost) || 0,
    document_url: row.document_url ?? undefined,
  };
}

export async function getRegistrations(assetId?: string): Promise<RegistrationRow[]> {
  const supabase = createClient();
  let query = supabase.from('registrations').select('*').order('created_at', { ascending: false });
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapRegistrationRow);
}

export async function createRegistration(input: RegistrationInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('registrations')
    .insert({
      asset_id: input.asset_id,
      registration_number: input.registration_number ?? null,
      inspection_date: input.inspection_date ?? null,
      inspection_expiry: input.inspection_expiry ?? null,
      road_fee_expiry: input.road_fee_expiry ?? null,
      cost: input.cost ?? 0,
      document_url: input.document_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRegistrationRow(data);
}