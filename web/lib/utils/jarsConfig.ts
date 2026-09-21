import { BudgetBucket } from '@/types/finance';

export interface JarItemConfig {
  key: BudgetBucket;
  name: string;
  percent: number;
  color: string;
  bgBar: string;
  desc: string;
}

export const DEFAULT_6JARS_CONFIG: JarItemConfig[] = [
  {
    key: 'NECESSITY',
    name: 'Hũ Thiết Yếu (NEC)',
    percent: 55,
    color: '#10b981',
    bgBar: 'bg-emerald-500',
    desc: 'Chi phí sinh hoạt tối cần thiết: Ăn uống, thuê/mua nhà, hóa đơn điện nước, xăng xe, bảo dưỡng xe Mazda 2, học phí',
  },
  {
    key: 'SAVINGS',
    name: 'Hũ Tiết Kiệm Dài Hạn (LTSS)',
    percent: 10,
    color: '#0ea5e9',
    bgBar: 'bg-sky-500',
    desc: 'Quỹ dự phòng khẩn cấp 3-6 tháng, mua sắm tài sản lớn trong tương lai, bảo hiểm nhân thọ',
  },
  {
    key: 'EDUCATION',
    name: 'Hũ Giáo Dục & Học Tập (EDU)',
    percent: 10,
    color: '#8b5cf6',
    bgBar: 'bg-purple-500',
    desc: 'Học phí con cái, sách vở giáo trình, khóa học nâng cao kỹ năng cho bố mẹ',
  },
  {
    key: 'PLAY',
    name: 'Hũ Hưởng Thụ & Du Lịch (PLAY)',
    percent: 10,
    color: '#f59e0b',
    bgBar: 'bg-amber-500',
    desc: 'Du lịch cuối tuần, ăn ngoài nhà hàng cao cấp, mua sắm giải trí, spa (chi tiêu không hối tiếc)',
  },
  {
    key: 'INVESTMENT',
    name: 'Hũ Tự Do Tài Chính (FFA)',
    percent: 10,
    color: '#6366f1',
    bgBar: 'bg-indigo-500',
    desc: 'Đầu tư sinh lời: Cổ phiếu, trái phiếu, kinh doanh phụ, tích lũy tạo dòng thu nhập thụ động',
  },
  {
    key: 'GIVE',
    name: 'Hũ Cho Đi & Biếu Tặng (GIVE)',
    percent: 5,
    color: '#f43f5e',
    bgBar: 'bg-rose-500',
    desc: 'Biếu ông bà cha mẹ, làm từ thiện, quà sinh nhật & hiếu hỉ người thân',
  },
];

const STORAGE_KEY = 'ffms_6jars_config';
const BASE_INCOME_KEY = 'ffms_base_monthly_income';
export const DEFAULT_BASE_INCOME = 50000000; // 50 triệu VNĐ

export function get6JarsConfig(): JarItemConfig[] {
  if (typeof window === 'undefined') return DEFAULT_6JARS_CONFIG;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 6) {
        // Merge with defaults to keep colors, names, descriptions
        return DEFAULT_6JARS_CONFIG.map((def) => {
          const matched = parsed.find((p: any) => p.key === def.key);
          return matched ? { ...def, percent: Number(matched.percent) || def.percent } : def;
        });
      }
    }
  } catch {}
  return DEFAULT_6JARS_CONFIG;
}

export function save6JarsConfig(config: JarItemConfig[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('ffms_6jars_updated'));
  } catch {}
}

export function reset6JarsConfig(): JarItemConfig[] {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event('ffms_6jars_updated'));
    } catch {}
  }
  return DEFAULT_6JARS_CONFIG;
}

export function getBaseMonthlyIncome(): number {
  if (typeof window === 'undefined') return DEFAULT_BASE_INCOME;
  try {
    const saved = localStorage.getItem(BASE_INCOME_KEY);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num) && num > 0) return num;
    }
  } catch {}
  return DEFAULT_BASE_INCOME;
}

export function saveBaseMonthlyIncome(amount: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BASE_INCOME_KEY, amount.toString());
    window.dispatchEvent(new Event('ffms_6jars_updated'));
  } catch {}
}
