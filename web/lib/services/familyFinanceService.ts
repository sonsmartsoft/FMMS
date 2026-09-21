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
import { SAMPLE_FAMILY_CATEGORIES, flattenSampleCategories } from '@/lib/data/sampleFinanceCategories';

// 2. DANH MỤC THU CHI (CATEGORIES)
// ─────────────────────────────────────────────────────────────────────────────
export async function getCategories(): Promise<TransactionCategory[]> {
  try {
    const { data, error } = await supabase
      .from('transaction_categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      if (error) console.warn('getCategories error, using local fallback:', error.message);
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

  if (error) {
    // If Supabase fails or is offline, save to localStorage
    const local = getLocalCategories();
    const newCat: TransactionCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    local.push(newCat);
    saveLocalCategories(local);
    return newCat;
  }
  return data as TransactionCategory;
}

export async function updateCategory(id: string, updates: Partial<TransactionCategory>): Promise<TransactionCategory> {
  const { data, error } = await supabase
    .from('transaction_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const local = getLocalCategories();
    const idx = local.findIndex((c) => c.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...updates };
      saveLocalCategories(local);
      return local[idx];
    }
    throw error;
  }
  return data as TransactionCategory;
}

export async function deleteCategory(id: string): Promise<boolean> {
  // First nullify or delete child categories
  await supabase.from('transaction_categories').delete().eq('parent_id', id);
  const { error } = await supabase.from('transaction_categories').delete().eq('id', id);

  if (error) {
    const local = getLocalCategories();
    const filtered = local.filter((c) => c.id !== id && c.parent_id !== id);
    saveLocalCategories(filtered);
    return true;
  }
  return true;
}

export async function resetToDefaultCategories(): Promise<TransactionCategory[]> {
  const sampleCats = flattenSampleCategories();
  try {
    // Delete existing categories and reseed
    await supabase.from('transaction_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { data, error } = await supabase
      .from('transaction_categories')
      .insert(sampleCats)
      .select();

    if (!error && data) {
      saveLocalCategories(data as TransactionCategory[]);
      return data as TransactionCategory[];
    }
  } catch (err) {
    console.warn('resetToDefaultCategories Supabase error:', err);
  }
  saveLocalCategories(sampleCats);
  return sampleCats;
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

    if (error || !data || data.length === 0) {
      // If family_loans table has no rows or errors, query the real vehicle loans table
      const vehicleLoans = await getRealVehicleLoansAsFamilyLoans();
      if (vehicleLoans.length > 0) return vehicleLoans;
      return getLocalLoans();
    }
    return (data as FamilyLoan[]) || [];
  } catch (err) {
    console.error('getFamilyLoans exception:', err);
    return getLocalLoans();
  }
}

async function getRealVehicleLoansAsFamilyLoans(): Promise<FamilyLoan[]> {
  try {
    const { data: dbLoans } = await supabase
      .from('loans')
      .select('*, assets:asset_id(*)')
      .order('created_at', { ascending: false });

    if (dbLoans && dbLoans.length > 0) {
      return dbLoans.map((l: any) => {
        const carName = l.assets?.name || 'Mazda 2AT 2026';
        const carPlate = l.assets?.license_plate || '19B-213.87';
        return {
          id: l.id,
          title: `Khoản vay mua xe ${carName} (${carPlate})`,
          loan_type: 'BORROW' as const,
          category: 'CAR_LOAN' as const,
          lender_borrower_name: l.lender || 'TPBank',
          principal_amount: Number(l.principal) || 295000000,
          remaining_balance: Number(l.current_balance) || 270918368,
          interest_rate_percent: Number(l.interest_rate_percent) || 8.0,
          term_months: Number(l.term_months) || 60,
          start_date: l.start_date || '2026-04-07',
          payment_day: Number(l.payment_day) || 28,
          monthly_payment: Number(l.monthly_payment) || 7378216,
          linked_asset_id: l.asset_id,
          status: (l.status as any) || 'ACTIVE',
          notes: l.notes || 'Vay ngân hàng TPBank thời hạn 60 tháng, trả nợ ngày 28 hàng tháng',
        };
      });
    }
  } catch (err) {
    console.warn('Failed to load real vehicle loans as family loans:', err);
  }
  return [];
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
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('ffms_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return flattenSampleCategories();
}

function saveLocalCategories(cats: TransactionCategory[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('ffms_categories', JSON.stringify(cats));
    } catch {}
  }
}

function getLocalLoans(): FamilyLoan[] {
  return [
    {
      id: 'loan-mazda-01',
      title: 'Khoản vay mua xe Mazda 2AT 2026 (19B-213.87)',
      loan_type: 'BORROW',
      category: 'CAR_LOAN',
      lender_borrower_name: 'TPBank',
      principal_amount: 295000000,
      remaining_balance: 270918368,
      interest_rate_percent: 8.0,
      term_months: 60,
      start_date: '2026-04-07',
      payment_day: 28,
      monthly_payment: 7378216,
      linked_wallet_id: 'w-tcb-01',
      linked_asset_id: '20260308-0001-4222-8888-19b213872026',
      status: 'ACTIVE',
      notes: 'Khoản vay mua xe Mazda 2AT (1.5L Luxury/AT, BKS 19B-213.87) tại TPBank, trả gốc + lãi ngày 28 hàng tháng.',
    },
  ];
}

