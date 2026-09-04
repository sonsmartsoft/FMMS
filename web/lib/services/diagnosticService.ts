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

import { LOCAL_OBD_DICTIONARY, parseObdCodeDynamically } from '@/lib/data/obdDictionary';

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
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { data: null, error: null };

    // 1. Thử lấy từ Cloud Supabase nếu có
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('obd_dtc_dictionary')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (data && !error) {
        return { data: (data as ObdDtcDictionaryEntry), error: null };
      }
    } catch {
      // Supabase table chưa tạo hoặc offline -> dùng từ điển local
    }

    // 2. Tra cứu Từ điển Offline Local tích hợp sẵn
    const localEntry = LOCAL_OBD_DICTIONARY[cleanCode];
    if (localEntry) {
      return { data: (localEntry as ObdDtcDictionaryEntry), error: null };
    }

    // 3. Phân tích tự động cấu trúc mã SAE J2012
    const dynamicEntry = parseObdCodeDynamically(cleanCode);
    if (dynamicEntry) {
      return { data: (dynamicEntry as ObdDtcDictionaryEntry), error: null };
    }

    return { data: null, error: null };
  },

  async getAllDictionary() {
    let cloudData: ObdDtcDictionaryEntry[] = [];
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('obd_dtc_dictionary')
        .select('*')
        .order('code', { ascending: true });
      if (data) cloudData = data as ObdDtcDictionaryEntry[];
    } catch {
      // Ignore
    }

    const dictMap = new Map<string, ObdDtcDictionaryEntry>();
    Object.values(LOCAL_OBD_DICTIONARY).forEach(item => {
      dictMap.set(item.code, item as ObdDtcDictionaryEntry);
    });
    cloudData.forEach(item => {
      dictMap.set(item.code, item);
    });

    const combined = Array.from(dictMap.values()).sort((a, b) => a.code.localeCompare(b.code));
    return { data: combined, error: null };
  }
};
