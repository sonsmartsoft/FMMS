import { BudgetBucket } from '@/types/finance';
import { ExpenseRecord } from '@/types/mobility';

export interface MappedCategoryInfo {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  bucket: BudgetBucket;
}

/**
 * Maps a vehicle expense (category, subcategory, description) to the standardized Family Finance category.
 */
export function mapExpenseCategoryToFamilyCategory(
  category: string,
  subcategory?: string,
  description?: string
): MappedCategoryInfo {
  const cat = (category || '').toUpperCase().trim();
  const sub = ((subcategory || '') + ' ' + (description || '')).toLowerCase();

  // 1. Nhiên liệu / Xăng dầu
  if (cat === 'FUEL' || sub.includes('xăng') || sub.includes('dầu') || sub.includes('ron 95') || sub.includes('diesel')) {
    return {
      categoryId: 'cat-mob-fuel',
      categoryName: 'Xăng RON 95 / Dầu Diesel',
      icon: 'Fuel',
      color: '#06b6d4',
      bucket: 'NECESSITY',
    };
  }

  // 2. Bảo dưỡng & Sửa chữa định kỳ
  if (cat === 'MAINTENANCE' || cat === 'LABOR' || sub.includes('bảo dưỡng') || sub.includes('thay dầu') || sub.includes('nhớt') || sub.includes('sửa chữa') || sub.includes('gara') || sub.includes('hãng')) {
    return {
      categoryId: 'cat-mob-maint',
      categoryName: 'Bảo dưỡng định kỳ hãng & Gara',
      icon: 'Wrench',
      color: '#0ea5e9',
      bucket: 'NECESSITY',
    };
  }

  // 3. Phí cầu đường BOT, VETC, ePass
  if (cat === 'TOLL' || sub.includes('vetc') || sub.includes('epass') || sub.includes('cầu đường') || sub.includes('bot') || sub.includes('cao tốc')) {
    return {
      categoryId: 'cat-mob-toll',
      categoryName: 'Phí cầu đường VETC / ePass',
      icon: 'CreditCard',
      color: '#38bdf8',
      bucket: 'NECESSITY',
    };
  }

  // 4. Vé gửi xe, đỗ xe tháng & bãi xe
  if (cat === 'PARKING' || sub.includes('gửi xe') || sub.includes('đỗ xe') || sub.includes('bãi đỗ') || sub.includes('vé xe')) {
    return {
      categoryId: 'cat-mob-parking',
      categoryName: 'Vé gửi xe tháng & Bãi đỗ',
      icon: 'SquareParking',
      color: '#22d3ee',
      bucket: 'NECESSITY',
    };
  }

  // 5. Bảo hiểm thân vỏ, TNDS & Đăng kiểm xe
  if (cat === 'INSURANCE' || cat === 'REGISTRATION' || cat === 'INSPECTION' || sub.includes('bảo hiểm') || sub.includes('tnds') || sub.includes('thân vỏ') || sub.includes('đăng kiểm')) {
    return {
      categoryId: 'cat-mob-insurance',
      categoryName: 'Bảo hiểm thân vỏ / TNDS & Đăng kiểm',
      icon: 'ShieldCheck',
      color: '#67e8f9',
      bucket: 'NECESSITY',
    };
  }

  // 6. Phụ tùng, Nâng cấp, Đồ chơi xe
  if (cat === 'PARTS' || cat === 'UPGRADE' || sub.includes('phụ tùng') || sub.includes('đồ chơi') || sub.includes('nâng cấp') || sub.includes('lắp thêm') || sub.includes('cam hành trình') || sub.includes('dán phim')) {
    return {
      categoryId: 'cat-mob-parts',
      categoryName: 'Phụ tùng, Nâng cấp & Đồ chơi xe',
      icon: 'Cog',
      color: '#a5f3fc',
      bucket: 'PLAY',
    };
  }

  // 7. Rửa xe, Dọn nội thất, Spa xe
  if (cat === 'CAR_WASH' || sub.includes('rửa xe') || sub.includes('spa') || sub.includes('dọn nội thất') || sub.includes('vệ sinh khoang')) {
    return {
      categoryId: 'cat-mob-wash',
      categoryName: 'Rửa xe & Chăm sóc Spa xe',
      icon: 'Sparkles',
      color: '#bae6fd',
      bucket: 'PLAY',
    };
  }

  // 8. Vay mua xe: Gốc vay ngân hàng
  if (cat === 'LOAN' || cat === 'LOAN_PAYMENT' || sub.includes('gốc vay') || sub.includes('tiền gốc')) {
    return {
      categoryId: 'cat-debt-car-principal',
      categoryName: 'Gốc vay mua xe ô tô ngân hàng',
      icon: 'Car',
      color: '#f43f5e',
      bucket: 'NECESSITY',
    };
  }

  // 9. Vay mua xe: Lãi vay ngân hàng
  if (cat === 'LOAN_INTEREST' || sub.includes('lãi vay') || sub.includes('tiền lãi')) {
    return {
      categoryId: 'cat-debt-car-interest',
      categoryName: 'Lãi vay ngân hàng hàng tháng',
      icon: 'Percent',
      color: '#fb7185',
      bucket: 'NECESSITY',
    };
  }

  // Mặc định: Nhóm Phương tiện FMMS tổng quát
  return {
    categoryId: 'cat-mobility',
    categoryName: 'Phương tiện & Xe cộ (FMMS)',
    icon: 'Car',
    color: '#06b6d4',
    bucket: 'NECESSITY',
  };
}

/**
 * Maps a Family Finance category ID to the corresponding Vehicle Expense category enum.
 */
export function mapFamilyCategoryToExpenseCategory(categoryId?: string | null): ExpenseRecord['category'] {
  if (!categoryId) return 'OTHER';
  switch (categoryId) {
    case 'cat-mob-fuel':
      return 'FUEL';
    case 'cat-mob-maint':
      return 'MAINTENANCE';
    case 'cat-mob-toll':
      return 'TOLL';
    case 'cat-mob-parking':
      return 'PARKING';
    case 'cat-mob-insurance':
      return 'INSURANCE';
    case 'cat-mob-parts':
      return 'PARTS';
    case 'cat-mob-wash':
      return 'CAR_WASH';
    case 'cat-debt-car-principal':
      return 'LOAN';
    case 'cat-debt-car-interest':
      return 'LOAN_INTEREST';
    default:
      if (categoryId.startsWith('cat-mob')) return 'MAINTENANCE';
      if (categoryId.startsWith('cat-debt')) return 'LOAN';
      return 'OTHER';
  }
}
