import { createClient } from '@/lib/supabase/client';
import { resolveAssetId } from './assetService';

export interface DocumentRow {
  id: string;
  asset_id: string;
  document_type: string;
  title: string;
  document_date?: string;
  expiry_date?: string;
  storage_path: string;
  file_size_bytes?: number;
  created_at: string;
}

export interface DocumentInput {
  asset_id: string;
  document_type: string;
  title: string;
  document_date?: string;
  expiry_date?: string;
  storage_path?: string;
}

export function mapDocumentRow(row: any): DocumentRow {
  return {
    id: row.id,
    asset_id: row.asset_id,
    document_type: row.document_type,
    title: row.title,
    document_date: row.document_date ?? undefined,
    expiry_date: row.expiry_date ?? undefined,
    storage_path: row.storage_path ?? '',
    file_size_bytes: row.file_size_bytes ?? undefined,
    created_at: row.created_at,
  };
}

export async function getDocuments(assetId?: string): Promise<DocumentRow[]> {
  const supabase = createClient();
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let query = supabase.from('asset_documents').select('*').order('expiry_date', { ascending: true });
  if (realId) {
    query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapDocumentRow);
}

export async function createDocument(input: DocumentInput) {
  const realId = resolveAssetId(input.asset_id);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('asset_documents')
    .insert({
      asset_id: realId,
      document_type: input.document_type,
      title: input.title,
      document_date: input.document_date ?? null,
      expiry_date: input.expiry_date ?? null,
      storage_path: input.storage_path ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return mapDocumentRow(data);
}

export async function updateDocument(id: string, input: Partial<DocumentInput>) {
  const supabase = createClient();
  const { data, error } = await supabase.from('asset_documents').update(input).eq('id', id).select().single();
  if (error) throw error;
  return mapDocumentRow(data);
}

export async function deleteDocument(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('asset_documents').delete().eq('id', id);
  if (error) throw error;
}