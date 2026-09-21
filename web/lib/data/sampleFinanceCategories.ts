import { TransactionCategory } from '@/types/finance';

export interface SampleCategoryTreeItem {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  parent_id?: string | null;
  color: string;
  icon: string;
  budget_bucket?: 'NECESSITY' | 'SAVINGS' | 'EDUCATION' | 'PLAY' | 'INVESTMENT' | 'GIVE';
  is_essential: boolean;
  is_system: boolean;
  display_order: number;
  children?: {
    id: string;
    name: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
    color: string;
    icon: string;
    budget_bucket?: 'NECESSITY' | 'SAVINGS' | 'EDUCATION' | 'PLAY' | 'INVESTMENT' | 'GIVE';
    is_essential: boolean;
    is_system: boolean;
    display_order: number;
  }[];
}

export const SAMPLE_FAMILY_CATEGORIES: SampleCategoryTreeItem[] = [
  // 1. ĂN UỐNG & ĐI CHỢ
  {
    id: 'cat-food',
    name: 'Ăn uống & Đi chợ',
    type: 'EXPENSE',
    color: '#f59e0b',
    icon: 'Utensils',
    budget_bucket: 'NECESSITY',
    is_essential: true,
    is_system: true,
    display_order: 1,
    children: [
      { id: 'cat-food-groceries', name: 'Đi chợ & Siêu thị tươi sống', type: 'EXPENSE', color: '#f59e0b', icon: 'ShoppingBag', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 101 },
      { id: 'cat-food-breakfast', name: 'Ăn sáng / Bữa trưa văn phòng', type: 'EXPENSE', color: '#fbbf24', icon: 'Coffee', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 102 },
      { id: 'cat-food-dining', name: 'Ăn nhà hàng, Buffet & Cuối tuần', type: 'EXPENSE', color: '#f97316', icon: 'UtensilsCrossed', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 103 },
      { id: 'cat-food-cafe', name: 'Cafe, Trà sữa & Đồ uống vặt', type: 'EXPENSE', color: '#d97706', icon: 'CupSoda', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 104 },
    ],
  },

  // 2. NHÀ CỬA & SINH HOẠT
  {
    id: 'cat-home',
    name: 'Nhà cửa & Sinh hoạt',
    type: 'EXPENSE',
    color: '#3b82f6',
    icon: 'Home',
    budget_bucket: 'NECESSITY',
    is_essential: true,
    is_system: true,
    display_order: 2,
    children: [
      { id: 'cat-home-bills', name: 'Tiền điện sinh hoạt EVN', type: 'EXPENSE', color: '#38bdf8', icon: 'Zap', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 201 },
      { id: 'cat-home-water', name: 'Tiền nước & Vệ sinh môi trường', type: 'EXPENSE', color: '#0ea5e9', icon: 'Droplets', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 202 },
      { id: 'cat-home-internet', name: 'Internet cáp quang & 4G/5G', type: 'EXPENSE', color: '#60a5fa', icon: 'Wifi', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 203 },
      { id: 'cat-home-furnishing', name: 'Đồ gia dụng & Thiết bị nhà bếp', type: 'EXPENSE', color: '#818cf8', icon: 'Sofa', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 204 },
      { id: 'cat-home-repair', name: 'Sửa chữa điện nước & Bảo dưỡng nhà', type: 'EXPENSE', color: '#6366f1', icon: 'Hammer', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 205 },
    ],
  },

  // 3. PHƯƠNG TIỆN & XE CỘ (LIÊN KẾT FMMS MOBILITY)
  {
    id: 'cat-mobility',
    name: 'Phương tiện & Xe cộ (FMMS)',
    type: 'EXPENSE',
    color: '#06b6d4',
    icon: 'Car',
    budget_bucket: 'NECESSITY',
    is_essential: true,
    is_system: true,
    display_order: 3,
    children: [
      { id: 'cat-mob-fuel', name: 'Xăng RON 95 / Dầu Diesel', type: 'EXPENSE', color: '#06b6d4', icon: 'Fuel', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 301 },
      { id: 'cat-mob-maint', name: 'Bảo dưỡng định kỳ hãng & Gara', type: 'EXPENSE', color: '#0ea5e9', icon: 'Wrench', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 302 },
      { id: 'cat-mob-toll', name: 'Phí cầu đường VETC / ePass', type: 'EXPENSE', color: '#38bdf8', icon: 'CreditCard', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 303 },
      { id: 'cat-mob-parking', name: 'Vé gửi xe tháng & Bãi đỗ', type: 'EXPENSE', color: '#22d3ee', icon: 'SquareParking', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 304 },
      { id: 'cat-mob-insurance', name: 'Bảo hiểm thân vỏ / TNDS & Đăng kiểm', type: 'EXPENSE', color: '#67e8f9', icon: 'ShieldCheck', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 305 },
      { id: 'cat-mob-parts', name: 'Phụ tùng, Nâng cấp & Đồ chơi xe', type: 'EXPENSE', color: '#a5f3fc', icon: 'Cog', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 306 },
      { id: 'cat-mob-wash', name: 'Rửa xe & Chăm sóc Spa xe', type: 'EXPENSE', color: '#bae6fd', icon: 'Sparkles', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 307 },
    ],
  },

  // 4. CON CÁI & GIÁO DỤC
  {
    id: 'cat-education',
    name: 'Con cái & Giáo dục',
    type: 'EXPENSE',
    color: '#8b5cf6',
    icon: 'GraduationCap',
    budget_bucket: 'EDUCATION',
    is_essential: true,
    is_system: true,
    display_order: 4,
    children: [
      { id: 'cat-edu-tuition', name: 'Học phí trường chính khóa', type: 'EXPENSE', color: '#a78bfa', icon: 'School', budget_bucket: 'EDUCATION', is_essential: true, is_system: true, display_order: 401 },
      { id: 'cat-edu-extra', name: 'Học thêm, Tiếng Anh & Năng khiếu', type: 'EXPENSE', color: '#c4b5fd', icon: 'BookOpen', budget_bucket: 'EDUCATION', is_essential: true, is_system: true, display_order: 402 },
      { id: 'cat-edu-books', name: 'Sách vở, Giáo trình & Dụng cụ học tập', type: 'EXPENSE', color: '#ddd6fe', icon: 'PenTool', budget_bucket: 'EDUCATION', is_essential: true, is_system: true, display_order: 403 },
      { id: 'cat-edu-kids', name: 'Sữa, Bỉm & Đồ dùng trẻ em', type: 'EXPENSE', color: '#e0e7ff', icon: 'Baby', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 404 },
    ],
  },

  // 5. SỨC KHỎE & Y TẾ
  {
    id: 'cat-health',
    name: 'Sức khỏe & Y tế',
    type: 'EXPENSE',
    color: '#10b981',
    icon: 'HeartPulse',
    budget_bucket: 'NECESSITY',
    is_essential: true,
    is_system: true,
    display_order: 5,
    children: [
      { id: 'cat-health-meds', name: 'Thuốc men tây y & Đông y gia đình', type: 'EXPENSE', color: '#34d399', icon: 'Pill', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 501 },
      { id: 'cat-health-hospital', name: 'Khám bệnh, Xét nghiệm & Viện phí', type: 'EXPENSE', color: '#6ee7b7', icon: 'Stethoscope', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 502 },
      { id: 'cat-health-insurance', name: 'Bảo hiểm nhân thọ & Sức khỏe VIP', type: 'EXPENSE', color: '#059669', icon: 'Shield', budget_bucket: 'SAVINGS', is_essential: true, is_system: true, display_order: 503 },
      { id: 'cat-health-fitness', name: 'Thể thao, Gym, Yoga & Bơi lội', type: 'EXPENSE', color: '#047857', icon: 'Activity', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 504 },
    ],
  },

  // 6. HƯỞNG THỤ, DU LỊCH & GIẢI TRÍ
  {
    id: 'cat-play',
    name: 'Hưởng thụ & Du lịch',
    type: 'EXPENSE',
    color: '#ec4899',
    icon: 'Plane',
    budget_bucket: 'PLAY',
    is_essential: false,
    is_system: true,
    display_order: 6,
    children: [
      { id: 'cat-play-travel', name: 'Du lịch, Nghỉ dưỡng & Vé máy bay', type: 'EXPENSE', color: '#f472b6', icon: 'Palmtree', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 601 },
      { id: 'cat-play-shopping', name: 'Quần áo, Giày dép & Thời trang', type: 'EXPENSE', color: '#fb7185', icon: 'Shirt', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 602 },
      { id: 'cat-play-cinema', name: 'Xem phim rạp & Sự kiện nghệ thuật', type: 'EXPENSE', color: '#f43f5e', icon: 'Film', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 603 },
      { id: 'cat-play-beauty', name: 'Cắt tóc, Spa & Chăm sóc sắc đẹp', type: 'EXPENSE', color: '#e11d48', icon: 'Scissors', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 604 },
    ],
  },

  // 7. TRẢ GÓP & NGHĨA VỤ KHOẢN VAY
  {
    id: 'cat-debt',
    name: 'Trả góp & Khoản vay ngân hàng',
    type: 'EXPENSE',
    color: '#e11d48',
    icon: 'BadgePercent',
    budget_bucket: 'NECESSITY',
    is_essential: true,
    is_system: true,
    display_order: 7,
    children: [
      { id: 'cat-debt-car-principal', name: 'Gốc vay mua xe ô tô ngân hàng', type: 'EXPENSE', color: '#f43f5e', icon: 'Car', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 701 },
      { id: 'cat-debt-car-interest', name: 'Lãi vay ngân hàng hàng tháng', type: 'EXPENSE', color: '#fb7185', icon: 'Percent', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 702 },
      { id: 'cat-debt-credit-card', name: 'Thanh toán dư nợ sao kê thẻ tín dụng', type: 'EXPENSE', color: '#fda4af', icon: 'CreditCard', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 703 },
    ],
  },

  // 8. CÁC NGUỒN THU NHẬP (INCOME)
  {
    id: 'cat-income',
    name: 'Thu nhập & Doanh thu',
    type: 'INCOME',
    color: '#10b981',
    icon: 'Coins',
    budget_bucket: 'SAVINGS',
    is_essential: true,
    is_system: true,
    display_order: 8,
    children: [
      { id: 'cat-inc-salary', name: 'Lương cố định hàng tháng', type: 'INCOME', color: '#10b981', icon: 'Banknote', budget_bucket: 'SAVINGS', is_essential: true, is_system: true, display_order: 801 },
      { id: 'cat-inc-bonus', name: 'Thưởng KPI & Lễ Tết', type: 'INCOME', color: '#34d399', icon: 'TrendingUp', budget_bucket: 'INVESTMENT', is_essential: false, is_system: true, display_order: 802 },
      { id: 'cat-inc-side', name: 'Thu nhập làm thêm & Kinh doanh ngoài', type: 'INCOME', color: '#059669', icon: 'Briefcase', budget_bucket: 'INVESTMENT', is_essential: false, is_system: true, display_order: 803 },
      { id: 'cat-inc-interest', name: 'Lãi tiền gửi tiết kiệm & Cổ tức', type: 'INCOME', color: '#047857', icon: 'Landmark', budget_bucket: 'INVESTMENT', is_essential: false, is_system: true, display_order: 804 },
    ],
  },

  // 9. CHUYỂN TIỀN NỘI BỘ (TRANSFER)
  {
    id: 'cat-transfer',
    name: 'Chuyển tiền nội bộ giữa các ví',
    type: 'TRANSFER',
    color: '#64748b',
    icon: 'ArrowRightLeft',
    budget_bucket: 'SAVINGS',
    is_essential: false,
    is_system: true,
    display_order: 9,
    children: [
      { id: 'cat-trans-topup', name: 'Nạp tiền ví điện tử / MoMo', type: 'TRANSFER', color: '#64748b', icon: 'Smartphone', budget_bucket: 'SAVINGS', is_essential: false, is_system: true, display_order: 901 },
      { id: 'cat-trans-savings', name: 'Chuyển vào sổ tiết kiệm tích lũy', type: 'TRANSFER', color: '#475569', icon: 'PiggyBank', budget_bucket: 'SAVINGS', is_essential: false, is_system: true, display_order: 902 },
      { id: 'cat-trans-atm', name: 'Rút tiền mặt ATM từ ngân hàng', type: 'TRANSFER', color: '#334155', icon: 'Coins', budget_bucket: 'SAVINGS', is_essential: false, is_system: true, display_order: 903 },
    ],
  },
];

export function flattenSampleCategories(): TransactionCategory[] {
  const result: TransactionCategory[] = [];
  SAMPLE_FAMILY_CATEGORIES.forEach((parent) => {
    const { children, ...parentRow } = parent;
    result.push({
      ...parentRow,
      parent_id: null,
    });
    if (children && children.length > 0) {
      children.forEach((child) => {
        result.push({
          ...child,
          parent_id: parent.id,
        });
      });
    }
  });
  return result;
}
