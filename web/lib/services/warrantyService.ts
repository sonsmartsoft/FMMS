import { createClient } from '@/lib/supabase/client';
import { resolveAssetId } from './assetService';

export interface WarrantyRecord {
  id: string;
  asset_id: string;
  item_type: 'VEHICLE' | 'PART' | 'UPGRADE' | 'OTHER';
  item_name: string;
  provider: string;
  policy_number?: string;
  start_date: string;
  expiry_date?: string;
  expiry_km?: number;
  coverage_details?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOID';
  created_at?: string;
}

export interface WarrantyClaimRecord {
  id: string;
  warranty_id?: string;
  asset_id: string;
  claim_date: string;
  description: string;
  amount_claimed: number;
  amount_approved: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'IN_PROGRESS' | 'RESOLVED';
  vendor?: string;
  resolution_notes?: string;
  created_at?: string;
}

export async function getWarranties(assetId?: string) {
  const supabase = createClient();
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let query = supabase.from('warranties').select('*').order('created_at', { ascending: false });
  if (realId) {
    query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
  }
  return await query;
}

export async function createWarranty(data: Omit<WarrantyRecord, 'id' | 'created_at'>) {
  const realId = resolveAssetId(data.asset_id);
  const supabase = createClient();
  return await supabase.from('warranties').insert([{ ...data, asset_id: realId }]).select().single();
}

export async function updateWarranty(id: string, data: Partial<WarrantyRecord>) {
  const supabase = createClient();
  return await supabase.from('warranties').update(data).eq('id', id).select().single();
}

export async function deleteWarranty(id: string) {
  const supabase = createClient();
  return await supabase.from('warranties').delete().eq('id', id);
}

export async function getWarrantyClaims(assetId?: string) {
  const supabase = createClient();
  let query = supabase.from('warranty_claims').select('*').order('claim_date', { ascending: false });
  if (assetId) query = query.eq('asset_id', assetId);
  return await query;
}

export async function createWarrantyClaim(data: Omit<WarrantyClaimRecord, 'id' | 'created_at'>) {
  const supabase = createClient();
  return await supabase.from('warranty_claims').insert([data]).select().single();
}
