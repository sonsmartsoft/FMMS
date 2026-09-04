import { createClient } from '@/lib/supabase/client';
import { TAXONOMY } from '@/types/mobility';

export const DEFAULT_MAINT_CATEGORIES = [
  'Thay dầu máy', 'Thay lọc dầu / Lọc nhớt', 'Thay lọc gió động cơ', 'Thay lọc gió điều hòa',
  'Thay bugi đánh lửa', 'Thay lốp xe', 'Kiểm tra & Thay má phanh', 'Thay ắc-quy', 'Nước làm mát', 'Thay dầu hộp số', 'Sửa chữa & Khác'
];

export const DEFAULT_EXP_CATEGORIES = [
  'Mua xe & Lăn bánh ban đầu', 'Nhiên liệu', 'Bảo dưỡng & Sửa chữa', 'Phí cầu đường (BOT)', 'Gửi xe & Bãi đỗ',
  'Rửa xe & Chăm sóc', 'Bảo hiểm vật chất', 'Bảo hiểm TNDS', 'Nâng cấp & Phụ kiện', 'Phạt vi phạm', 'Khác'
];

export const DEFAULT_VENDORS = [
  'Mazda Hà Đông', 'Honda Tây Hồ', 'Zestech Việt Nam', 'Bảo hiểm Quân Đội (MIC)', 'Bảo Việt Insurance', 'PV OIL', 'Petrolimex', 'Garage Chuyên Nghiệp'
];

export const DEFAULT_BANKS = [
  'Techcombank (TCB)', 'VPBank', 'VIB (Ngân hàng Quốc Tế)', 'TPBank (Tiên Phong)',
  'Shinhan Bank Việt Nam', 'Vietcombank (VCB)', 'BIDV', 'VietinBank',
  'MB Bank (Quân Đội)', 'Sacombank', 'ACB (Á Châu)', 'HDBank', 'MSB (Hàng Hải)', 'Woori Bank / Standard Chartered / HSBC'
];

export async function getMasterData<T>(key: string, fallback: T): Promise<T> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('master_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (!error && data && data.data) {
      const val = data.data as T;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(key, JSON.stringify(val));
        } catch {}
      }
      return val;
    }
  } catch (err) {
    console.warn(`Supabase getMasterData error for key ${key}:`, err);
  }

  // Fallback to localStorage or default
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch {}
  }

  return fallback;
}

export async function saveMasterData<T>(key: string, data: T): Promise<boolean> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // 1. Update local cache immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new Event('fmms_master_updated'));
    } catch {}
  }

  // 2. Persist to Supabase
  try {
    await supabase
      .from('master_data')
      .upsert({
        key,
        data: data as any,
        updated_at: now,
      });
    return true;
  } catch (err) {
    console.warn(`Supabase saveMasterData error for key ${key}:`, err);
    return false;
  }
}

export async function getMasterMaintenanceCategories(): Promise<string[]> {
  return getMasterData<string[]>('fmms_master_maint', DEFAULT_MAINT_CATEGORIES);
}

export async function saveMasterMaintenanceCategories(categories: string[]): Promise<boolean> {
  return saveMasterData<string[]>('fmms_master_maint', categories);
}

export async function getMasterExpenseCategories(): Promise<string[]> {
  return getMasterData<string[]>('fmms_master_exp', DEFAULT_EXP_CATEGORIES);
}

export async function saveMasterExpenseCategories(categories: string[]): Promise<boolean> {
  return saveMasterData<string[]>('fmms_master_exp', categories);
}

export async function getMasterVendors(): Promise<string[]> {
  return getMasterData<string[]>('fmms_master_vendors', DEFAULT_VENDORS);
}

export async function saveMasterVendors(vendors: string[]): Promise<boolean> {
  return saveMasterData<string[]>('fmms_master_vendors', vendors);
}

export async function getMasterBanks(): Promise<string[]> {
  return getMasterData<string[]>('fmms_master_banks', DEFAULT_BANKS);
}

export async function saveMasterBanks(banks: string[]): Promise<boolean> {
  return saveMasterData<string[]>('fmms_master_banks', banks);
}

export async function getMasterTaxonomy(): Promise<Record<string, { label: string; subcategories: Record<string, string> }>> {
  return getMasterData('fmms_master_taxonomy', TAXONOMY);
}

export async function saveMasterTaxonomy(taxonomy: Record<string, { label: string; subcategories: Record<string, string> }>): Promise<boolean> {
  return saveMasterData('fmms_master_taxonomy', taxonomy);
}
