import { createClient } from '@/lib/supabase/client';

export interface LoanRow {
  id: string;
  asset_id: string;
  lender: string;
  loan_number_alias?: string;
  principal: number;
  down_payment: number;
  interest_rate_percent: number;
  term_months: number;
  start_date: string;
  monthly_payment: number;
  payment_day: number;
  current_balance: number;
  status: 'ACTIVE' | 'CLOSED';
  notes?: string;
}

export interface LoanPaymentRow {
  id: string;
  loan_id: string;
  payment_number: number;
  due_date: string;
  principal_paid: number;
  interest_paid: number;
  total_payment: number;
  paid_date?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  remaining_balance: number;
}

export interface LoanPaymentInput {
  loan_id: string;
  payment_number: number;
  due_date: string;
  principal_paid: number;
  interest_paid: number;
  total_payment: number;
  paid_date?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  remaining_balance: number;
}

export interface LoanInput {
  asset_id: string;
  lender: string;
  principal: number;
  down_payment: number;
  interest_rate_percent: number;
  term_months: number;
  start_date: string;
  monthly_payment: number;
  payment_day: number;
  current_balance: number;
  status?: 'ACTIVE' | 'CLOSED';
  notes?: string;
}

export async function createLoan(input: LoanInput) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('loans')
    .insert({
      asset_id: input.asset_id,
      lender: input.lender,
      principal: input.principal,
      down_payment: input.down_payment,
      interest_rate_percent: input.interest_rate_percent,
      term_months: input.term_months,
      start_date: input.start_date,
      monthly_payment: input.monthly_payment,
      payment_day: input.payment_day,
      current_balance: input.current_balance,
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as LoanRow;
}

export async function getLoans(assetId?: string): Promise<LoanRow[]> {
  const supabase = createClient();
  let query = supabase.from('loans').select('*').order('created_at', { ascending: false });
  if (assetId) {
    query = query.eq('asset_id', assetId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    principal: Number(r.principal),
    down_payment: Number(r.down_payment) || 0,
    interest_rate_percent: Number(r.interest_rate_percent),
    term_months: Number(r.term_months),
    monthly_payment: Number(r.monthly_payment),
    payment_day: Number(r.payment_day) || 15,
    current_balance: Number(r.current_balance),
  }));
}

export async function getLoadByAsset(assetId: string): Promise<LoanRow | null> {
  const loans = await getLoans(assetId);
  return loans[0] ?? null;
}

export async function getLoanPayments(loanId: string): Promise<LoanPaymentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('loan_payments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_number', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    principal_paid: Number(r.principal_paid),
    interest_paid: Number(r.interest_paid),
    total_payment: Number(r.total_payment),
    remaining_balance: Number(r.remaining_balance),
  }));
}

export async function createLoanPayment(input: LoanPaymentInput) {
  const supabase = createClient();
  const { data, error } = await supabase.from('loan_payments').insert([input]).select().single();
  if (error) throw error;
  return data as LoanPaymentRow;
}

export async function updateLoanPayment(id: string, data: Partial<LoanPaymentRow>) {
  const supabase = createClient();
  const { error } = await supabase.from('loan_payments').update(data).eq('id', id);
  if (error) throw error;
}

export async function updateLoan(id: string, data: Partial<Pick<LoanRow, 'current_balance' | 'status'>>) {
  const supabase = createClient();
  const { error } = await supabase.from('loans').update(data).eq('id', id);
  if (error) throw error;
}