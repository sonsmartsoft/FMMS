import { createClient } from '@/lib/supabase/client';
import {
  Wallet,
  TransactionCategory,
  FamilyTransaction,
  FamilyBudget,
  FamilyLoan,
  FamilyLoanSchedule,
  TransactionType,
} from '@/types/finance';

const supabase = createClient();

// ─────────────────────────────────────────────────────────────────────────────
// 1. VÍ & TÀI KHOẢN THANH TOÁN (WALLETS & CREDIT CARDS)
// ─────────────────────────────────────────────────────────────────────────────
export async function getWallets(): Promise<Wallet[]> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('getWallets query error, falling back to local defaults:', error.message);
      return getLocalWallets();
    }
    return (data as Wallet[]) || [];
  } catch (err) {
    console.error('getWallets exception:', err);
    return getLocalWallets();
  }
}

export async function createWallet(wallet: Omit<Wallet, 'id' | 'created_at' | 'updated_at'>): Promise<Wallet> {
  const { data, error } = await supabase
    .from('wallets')
    .insert([wallet])
    .select()
    .single();

  if (error) throw error;
  return data as Wallet;
}

export async function updateWallet(id: string, updates: Partial<Wallet>): Promise<Wallet> {
  const { data, error } = await supabase
    .from('wallets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Wallet;
}

export async function deleteWallet(id: string): Promise<boolean> {
  const { error } = await supabase.from('wallets').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DANH MỤC THU CHI (CATEGORIES)
// ─────────────────────────────────────────────────────────────────────────────
export async function getCategories(): Promise<TransactionCategory[]> {
  try {
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.warn('getCategories error, using local fallback:', error.message);
      return getLocalCategories();
    }
    return (data as TransactionCategory[]) || [];
  } catch (err) {
    console.error('getCategories exception:', err);
    return getLocalCategories();
  }
}

export async function createCategory(cat: Omit<TransactionCategory, 'id' | 'created_at'>): Promise<TransactionCategory> {
  const { data, error } = await supabase
    .from('transaction_categories')
    .insert([cat])
    .select()
    .single();

  if (error) throw error;
  return data as TransactionCategory;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GIAO DỊCH THU CHI GIA ĐÌNH (FAMILY TRANSACTIONS)
// ─────────────────────────────────────────────────────────────────────────────
export interface TransactionFilter {
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
  walletId?: string;
  categoryId?: string;
  assetId?: string;
  type?: TransactionType;
}

export async function getFamilyTransactions(filter?: TransactionFilter): Promise<FamilyTransaction[]> {
  try {
    let query = supabase
      .from('family_transactions')
      .select(`
        *,
        wallet:wallets!wallet_id(*),
        to_wallet:wallets!to_wallet_id(*),
        category:transaction_categories!category_id(*)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filter?.walletId) {
      query = query.or(`wallet_id.eq.${filter.walletId},to_wallet_id.eq.${filter.walletId}`);
    }
    if (filter?.categoryId) {
      query = query.eq('category_id', filter.categoryId);
    }
    if (filter?.assetId) {
      query = query.eq('asset_id', filter.assetId);
    }
    if (filter?.type) {
      query = query.eq('transaction_type', filter.type);
    }
    if (filter?.startDate) {
      query = query.gte('date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('date', filter.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('getFamilyTransactions error, falling back:', error.message);
      return [];
    }
    return (data as FamilyTransaction[]) || [];
  } catch (err) {
    console.error('getFamilyTransactions exception:', err);
    return [];
  }
}

export async function createFamilyTransaction(
  tx: Omit<FamilyTransaction, 'id' | 'created_at' | 'updated_at'>
): Promise<FamilyTransaction> {
  const { data, error } = await supabase
    .from('family_transactions')
    .insert([tx])
    .select(`
      *,
      wallet:wallets!wallet_id(*),
      category:transaction_categories!category_id(*)
    `)
    .single();

  if (error) throw error;
  return data as FamilyTransaction;
}

export async function deleteFamilyTransaction(id: string): Promise<boolean> {
  const { error } = await supabase.from('family_transactions').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. KẾ HOẠCH NGÂN SÁCH (BUDGETS)
// ─────────────────────────────────────────────────────────────────────────────
export async function getBudgets(month: number, year: number): Promise<FamilyBudget[]> {
  try {
    const { data, error } = await supabase
      .from('family_budgets')
      .select(`
        *,
        category:transaction_categories!category_id(*)
      `)
      .eq('month', month)
      .eq('year', year);

    if (error) {
      console.warn('getBudgets error:', error.message);
      return [];
    }
    return (data as FamilyBudget[]) || [];
  } catch (err) {
    console.error('getBudgets exception:', err);
    return [];
  }
}

export async function saveBudget(budget: Omit<FamilyBudget, 'id' | 'created_at'>): Promise<FamilyBudget> {
  const { data, error } = await supabase
    .from('family_budgets')
    .upsert([budget], { onConflict: 'category_id,month,year' })
    .select()
    .single();

  if (error) throw error;
  return data as FamilyBudget;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. KHOẢN VAY & TÍN DỤNG GIA ĐÌNH (LOANS & CREDIT CARDS)
// ─────────────────────────────────────────────────────────────────────────────
export async function getFamilyLoans(): Promise<FamilyLoan[]> {
  try {
    const { data, error } = await supabase
      .from('family_loans')
      .select(`
        *,
        linked_wallet:wallets!linked_wallet_id(*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('getFamilyLoans error, using fallback:', error.message);
      return getLocalLoans();
    }
    return (data as FamilyLoan[]) || [];
  } catch (err) {
    console.error('getFamilyLoans exception:', err);
    return getLocalLoans();
  }
}

export async function createFamilyLoan(loan: Omit<FamilyLoan, 'id' | 'created_at' | 'updated_at'>): Promise<FamilyLoan> {
  const { data, error } = await supabase
    .from('family_loans')
    .insert([loan])
    .select()
    .single();

  if (error) throw error;
  return data as FamilyLoan;
}

export async function updateFamilyLoan(id: string, updates: Partial<FamilyLoan>): Promise<FamilyLoan> {
  const { data, error } = await supabase
    .from('family_loans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as FamilyLoan;
}

export async function deleteFamilyLoan(id: string): Promise<boolean> {
  const { error } = await supabase.from('family_loans').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL DEFAULTS / FALLBACKS
// ─────────────────────────────────────────────────────────────────────────────
function getLocalWallets(): Wallet[] {
  return [
    { id: 'w-cash-01', name: 'Tiền mặt gia đình', wallet_type: 'CASH', initial_balance: 15000000, current_balance: 15000000, currency: 'VND', color: '#10b981', icon: 'Banknote', is_excluded_from_total: false, status: 'ACTIVE' },
    { id: 'w-tcb-01', name: 'Techcombank Chi tiêu', wallet_type: 'BANK', bank_name: 'Techcombank', initial_balance: 38500000, current_balance: 38500000, currency: 'VND', color: '#ef4444', icon: 'Building2', is_excluded_from_total: false, status: 'ACTIVE' },
    { id: 'w-vcb-01', name: 'Vietcombank Lương & Dự phòng', wallet_type: 'BANK', bank_name: 'Vietcombank', initial_balance: 85000000, current_balance: 85000000, currency: 'VND', color: '#059669', icon: 'CreditCard', is_excluded_from_total: false, status: 'ACTIVE' },
    { id: 'w-tcb-credit', name: 'Techcombank Visa Signature', wallet_type: 'CREDIT_CARD', bank_name: 'Techcombank', initial_balance: 0, current_balance: 0, currency: 'VND', credit_limit: 100000000, statement_day: 20, payment_due_day: 5, color: '#6366f1', icon: 'CreditCard', is_excluded_from_total: false, status: 'ACTIVE' },
    { id: 'w-momo-01', name: 'Ví MoMo', wallet_type: 'E_WALLET', initial_balance: 2500000, current_balance: 2500000, currency: 'VND', color: '#ec4899', icon: 'Smartphone', is_excluded_from_total: false, status: 'ACTIVE' },
    { id: 'w-savings-01', name: 'Sổ tiết kiệm ngân hàng', wallet_type: 'SAVINGS', bank_name: 'Techcombank', initial_balance: 150000000, current_balance: 150000000, currency: 'VND', color: '#38bdf8', icon: 'PiggyBank', is_excluded_from_total: false, status: 'ACTIVE' },
  ];
}

function getLocalCategories(): TransactionCategory[] {
  return [
    { id: 'cat-food', name: 'Ăn uống & Đi chợ', type: 'EXPENSE', color: '#f59e0b', icon: 'Utensils', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 1 },
    { id: 'cat-home', name: 'Nhà cửa & Tiện ích', type: 'EXPENSE', color: '#3b82f6', icon: 'Home', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 2 },
    { id: 'cat-mobility', name: 'Phương tiện & Đi lại (Xe)', type: 'EXPENSE', color: '#06b6d4', icon: 'Car', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 3 },
    { id: 'cat-education', name: 'Con cái & Giáo dục', type: 'EXPENSE', color: '#8b5cf6', icon: 'GraduationCap', budget_bucket: 'EDUCATION', is_essential: true, is_system: true, display_order: 4 },
    { id: 'cat-health', name: 'Sức khỏe & Y tế', type: 'EXPENSE', color: '#10b981', icon: 'HeartPulse', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 5 },
    { id: 'cat-play', name: 'Hưởng thụ & Du lịch', type: 'EXPENSE', color: '#ec4899', icon: 'Plane', budget_bucket: 'PLAY', is_essential: false, is_system: true, display_order: 6 },
    { id: 'cat-debt', name: 'Trả góp & Khoản vay', type: 'EXPENSE', color: '#e11d48', icon: 'BadgePercent', budget_bucket: 'NECESSITY', is_essential: true, is_system: true, display_order: 7 },
    { id: 'cat-inc-salary', name: 'Lương cố định hàng tháng', type: 'INCOME', color: '#10b981', icon: 'Coins', budget_bucket: 'SAVINGS', is_essential: true, is_system: true, display_order: 8 },
    { id: 'cat-inc-bonus', name: 'Thưởng & Thu nhập phụ', type: 'INCOME', color: '#34d399', icon: 'TrendingUp', budget_bucket: 'INVESTMENT', is_essential: false, is_system: true, display_order: 9 },
    { id: 'cat-transfer', name: 'Chuyển tiền nội bộ giữa các ví', type: 'TRANSFER', color: '#64748b', icon: 'ArrowRightLeft', budget_bucket: 'SAVINGS', is_essential: false, is_system: true, display_order: 10 },
  ];
}

function getLocalLoans(): FamilyLoan[] {
  return [
    {
      id: 'loan-mazda-01',
      title: 'Khoản vay mua xe Mazda 2 Deluxe',
      loan_type: 'BORROW',
      category: 'CAR_LOAN',
      lender_borrower_name: 'Techcombank',
      principal_amount: 300000000,
      remaining_balance: 245000000,
      interest_rate_percent: 8.5,
      term_months: 60,
      start_date: '2026-03-08',
      payment_day: 15,
      monthly_payment: 6250000,
      linked_wallet_id: 'w-tcb-01',
      linked_asset_id: '20260308-0001-4222-8888-19b213872026',
      status: 'ACTIVE',
      notes: 'Gốc + Lãi trả ngày 15 hàng tháng tự động từ Techcombank',
    },
  ];
}
