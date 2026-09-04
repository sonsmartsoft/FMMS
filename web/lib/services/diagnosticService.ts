import { createClient } from '@/lib/supabase/client';

export interface VehicleDiagnosticScan {
  id: string;
  asset_id: string;
  device_id?: string | null;
  scanned_at: string;
  odometer_km?: number | null;
  mil_status: boolean;
  dtc_count: number;
  scan_type: 'AUTO_BACKGROUND' | 'MANUAL_SCAN';
  source: string;
  created_at: string;
}

export interface VehicleDtcLog {
  id: string;
  scan_id?: string | null;
  asset_id: string;
  device_id?: string | null;
  dtc_code: string;
  status: 'CONFIRMED' | 'PENDING' | 'PERMANENT' | 'CLEARED';
  system_category: 'POWERTRAIN' | 'CHASSIS' | 'BODY' | 'NETWORK';
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  description_vi?: string | null;
  description_en?: string | null;
  freeze_frame?: Record<string, any> | null;
  is_active: boolean;
  source: string;
  first_detected_at: string;
  last_detected_at: string;
  cleared_at?: string | null;
  created_at: string;
}

export interface ObdDtcDictionaryEntry {
  code: string;
  category: string;
  title_vi: string;
  description_vi: string;
  description_en?: string | null;
  symptoms_vi?: string | null;
  possible_causes_vi?: string[] | null;
  severity: string;
}

export const diagnosticService = {
  async getDtcLogs(assetId: string, isActiveOnly: boolean = false) {
    const supabase = createClient();
    let query = supabase
      .from('vehicle_dtc_logs')
      .select('*')
      .eq('asset_id', assetId)
      .order('last_detected_at', { ascending: false });

    if (isActiveOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    return { data: (data as VehicleDtcLog[]) || [], error };
  },

  async getDiagnosticScans(assetId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vehicle_diagnostic_scans')
      .select('*')
      .eq('asset_id', assetId)
      .order('scanned_at', { ascending: false })
      .limit(50);

    return { data: (data as VehicleDiagnosticScan[]) || [], error };
  },

  async resolveDtc(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('vehicle_dtc_logs')
      .update({
        is_active: false,
        status: 'CLEARED',
        cleared_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  },

  async lookupDtcCode(code: string) {
    const supabase = createClient();
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from('obd_dtc_dictionary')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    return { data: (data as ObdDtcDictionaryEntry | null), error };
  },

  async getAllDictionary() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('obd_dtc_dictionary')
      .select('*')
      .order('code', { ascending: true });

    return { data: (data as ObdDtcDictionaryEntry[]) || [], error };
  }
};
