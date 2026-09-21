export type WalletType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'E_WALLET' | 'SAVINGS' | 'INVESTMENT';

export interface Wallet {
  id: string;
  name: string;
  wallet_type: WalletType;
  account_number?: string;
  bank_name?: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  credit_limit?: number;
  statement_day?: number;
  payment_due_day?: number;
  color?: string;
  icon?: string;
  is_excluded_from_total: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export type BudgetBucket = 'NECESSITY' | 'SAVINGS' | 'EDUCATION' | 'PLAY' | 'INVESTMENT' | 'GIVE';

export interface TransactionCategory {
  id: string;
  name: string;
  type: TransactionType;
  parent_id?: string | null;
  color?: string;
  icon?: string;
  budget_bucket?: BudgetBucket;
  is_essential: boolean;
  is_system: boolean;
  display_order: number;
  created_at?: string;
  subcategories?: TransactionCategory[];
}

export interface FamilyTransaction {
  id: string;
  wallet_id: string;
  to_wallet_id?: string | null;
  category_id?: string | null;
  asset_id?: string | null;
  transaction_type: TransactionType;
  amount: number;
  date: string;
  time?: string;
  payee_vendor?: string;
  description?: string;
  notes?: string;
  bill_image_url?: string;
  is_essential: boolean;
  exclude_from_reports: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  wallet?: Wallet;
  to_wallet?: Wallet;
  category?: TransactionCategory;
  asset_name?: string;
}

export interface FamilyBudget {
  id: string;
  category_id?: string;
  bucket_type?: string;
  month: number;
  year: number;
  budget_amount: number;
  alert_threshold_percent: number;
  notes?: string;
  created_at?: string;
  // Joined fields
  category?: TransactionCategory;
  actual_spent?: number;
  spent_percent?: number;
}

export type LoanType = 'BORROW' | 'LEND';
export type LoanCategory = 'BANK_MORTGAGE' | 'BANK_CONSUMER' | 'CAR_LOAN' | 'PERSONAL' | 'CREDIT_INSTALLMENT' | 'OTHER';

export interface FamilyLoan {
  id: string;
  title: string;
  loan_type: LoanType;
  category: LoanCategory;
  lender_borrower_name: string;
  principal_amount: number;
  remaining_balance: number;
  interest_rate_percent: number;
  term_months?: number;
  start_date: string;
  end_date?: string;
  payment_day: number;
  monthly_payment: number;
  linked_wallet_id?: string | null;
  linked_asset_id?: string | null;
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  linked_wallet?: Wallet;
  linked_asset_name?: string;
}

export interface FamilyLoanSchedule {
  id: string;
  loan_id: string;
  period_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  paid_date?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  notes?: string;
  created_at?: string;
}
