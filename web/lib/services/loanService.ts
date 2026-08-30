import { createClient } from '@/lib/supabase/client';
import { MOCK_LOAN } from '@/lib/data/mockData';

export interface LoanRow {
  id: string;
  asset_id: string;
  lender: string;
  loan_number_alias?: string;
  principal: number;
  down_payment: number;
  interest_rate_percent: number;
  preferred_rate_percent?: number;
  preferred_months?: number;
  floating_rate_percent?: number;
  loan_ratio_percent?: number;
  term_months: number;
  start_date: string;
  monthly_payment: number;
  payment_day: number;
  current_balance: number;
  status: 'ACTIVE' | 'CLOSED';
  notes?: string;
  bank_contact_name?: string;
  bank_contact_phone?: string;
  bank_hotline?: string;
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
  preferred_rate_percent?: number;
  preferred_months?: number;
  floating_rate_percent?: number;
  loan_ratio_percent?: number;
  term_months: number;
  start_date: string;
  monthly_payment: number;
  payment_day: number;
  current_balance: number;
  status?: 'ACTIVE' | 'CLOSED';
  notes?: string;
  bank_contact_name?: string;
  bank_contact_phone?: string;
  bank_hotline?: string;
}

import { resolveAssetId, isValidUuid } from './assetService';

export async function createLoan(input: LoanInput): Promise<LoanRow> {
  const realAssetId = resolveAssetId(input.asset_id);
  const supabase = createClient();
  const payload: Record<string, any> = {
    asset_id: realAssetId,
    start_date: input.start_date,
    lender: input.lender,
    principal: input.principal,
    down_payment: input.down_payment,
    interest_rate_percent: input.interest_rate_percent,
    preferred_rate_percent: input.preferred_rate_percent,
    preferred_months: input.preferred_months,
    floating_rate_percent: input.floating_rate_percent,
    loan_ratio_percent: input.loan_ratio_percent,
    term_months: input.term_months,
    monthly_payment: input.monthly_payment,
    payment_day: input.payment_day,
    current_balance: input.current_balance,
    status: input.status ?? 'ACTIVE',
    notes: input.notes ?? null,
  };
  if (input.bank_contact_name) payload.bank_contact_name = input.bank_contact_name;
  if (input.bank_contact_phone) payload.bank_contact_phone = input.bank_contact_phone;
  if (input.bank_hotline) payload.bank_hotline = input.bank_hotline;

  const newLoan: LoanRow = {
    id: `loan_${Date.now()}`,
    asset_id: realAssetId,
    start_date: input.start_date,
    lender: input.lender,
    principal: Number(payload.principal),
    down_payment: Number(payload.down_payment) || 0,
    interest_rate_percent: Number(payload.interest_rate_percent),
    preferred_rate_percent: input.preferred_rate_percent,
    preferred_months: input.preferred_months,
    floating_rate_percent: input.floating_rate_percent,
    loan_ratio_percent: input.loan_ratio_percent,
    term_months: Number(payload.term_months),
    monthly_payment: Number(payload.monthly_payment),
    payment_day: Number(payload.payment_day) || 15,
    current_balance: Number(payload.current_balance),
    status: (payload.status ?? 'ACTIVE') as LoanRow['status'],
    notes: input.notes,
    bank_contact_name: input.bank_contact_name,
    bank_contact_phone: input.bank_contact_phone,
    bank_hotline: input.bank_hotline,
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loans');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[newLoan.id] = newLoan;
      if (realAssetId) customMap[`asset_${realAssetId}`] = newLoan;
      localStorage.setItem('fmms_custom_loans', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Save to Supabase
  try {
    const { data, error } = await supabase
      .from('loans')
      .insert(payload)
      .select()
      .maybeSingle();
    if (!error && data) return data as LoanRow;
  } catch (err) {
    console.warn('createLoan Supabase fallback:', err);
  }

  return newLoan;
}

export async function getLoans(assetId?: string): Promise<LoanRow[]> {
  const realId = assetId ? resolveAssetId(assetId) : undefined;
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loans');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbLoans: LoanRow[] = [];
  try {
    const supabase = createClient();
    let query = supabase.from('loans').select('*').order('created_at', { ascending: false });
    if (realId) {
      query = query.or(`asset_id.eq.${realId},asset_id.eq.${assetId}`);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      dbLoans = data.map((r: any) => ({
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
  } catch {}

  let allLoans: LoanRow[] = dbLoans.length > 0
    ? dbLoans
    : (assetId && (assetId === 'CAR01' || assetId === '22222222-2222-2222-2222-222222222222' || realId === '20260308-0001-4222-8888-19b213872026')
        ? [MOCK_LOAN as LoanRow]
        : (!assetId ? [MOCK_LOAN as LoanRow] : []));

  // Apply custom edits from localStorage
  allLoans = allLoans.map(l => {
    const custom = customMap[l.id] || (realId ? customMap[`asset_${realId}`] : undefined);
    return custom ? { ...l, ...custom } : l;
  });

  // Check if there's a custom loan for this asset not in list
  if (realId && customMap[`asset_${realId}`] && !allLoans.some(l => l.id === customMap[`asset_${realId}`].id)) {
    allLoans.unshift(customMap[`asset_${realId}`]);
  }

  return allLoans;
}

export async function getLoadByAsset(assetId: string): Promise<LoanRow | null> {
  const loans = await getLoans(assetId);
  return loans[0] ?? null;
}

export async function getLoanPayments(loanId: string): Promise<LoanPaymentRow[]> {
  let customMap: Record<string, any> = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loan_payments');
      if (stored) customMap = JSON.parse(stored);
    } catch {}
  }

  let dbPayments: LoanPaymentRow[] = [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_number', { ascending: true });
    if (!error && data) {
      dbPayments = data.map((r: any) => ({
        ...r,
        principal_paid: Number(r.principal_paid),
        interest_paid: Number(r.interest_paid),
        total_payment: Number(r.total_payment),
        remaining_balance: Number(r.remaining_balance),
      }));
    }
  } catch {}

  // Apply local edits
  let payments = dbPayments.map(p => customMap[p.id] ? { ...p, ...customMap[p.id] } : p);

  // Add custom payments created locally
  Object.values(customMap).forEach((cp: any) => {
    if (cp.loan_id === loanId && !payments.some(p => p.id === cp.id || p.payment_number === cp.payment_number)) {
      payments.push(cp);
    } else if (cp.loan_id === loanId) {
      const idx = payments.findIndex(p => p.payment_number === cp.payment_number);
      if (idx >= 0) payments[idx] = { ...payments[idx], ...cp };
    }
  });

  return payments.sort((a, b) => a.payment_number - b.payment_number);
}

export async function createLoanPayment(input: LoanPaymentInput): Promise<LoanPaymentRow> {
  const newPayment: LoanPaymentRow = {
    id: `LP_${Date.now()}_${input.payment_number}`,
    ...input,
  };

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loan_payments');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[newPayment.id] = newPayment;
      customMap[`loan_${input.loan_id}_num_${input.payment_number}`] = newPayment;
      localStorage.setItem('fmms_custom_loan_payments', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Save to Supabase
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('loan_payments').insert([input]).select().maybeSingle();
    if (!error && data) return data as LoanPaymentRow;
  } catch (err) {
    console.warn('createLoanPayment Supabase fallback:', err);
  }

  return newPayment;
}

export async function updateLoanPayment(id: string, data: Partial<LoanPaymentRow>) {
  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loan_payments');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = { ...(customMap[id] || {}), ...data };
      localStorage.setItem('fmms_custom_loan_payments', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Update Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('loan_payments').update(data).eq('id', id);
    } catch (err) {
      console.warn('updateLoanPayment Supabase fallback:', err);
    }
  }
}

export async function updateLoan(id: string, data: Partial<Pick<LoanRow, 'current_balance' | 'status'>>) {
  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loans');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = { ...(customMap[id] || {}), ...data };
      localStorage.setItem('fmms_custom_loans', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Update Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('loans').update(data).eq('id', id);
    } catch (err) {
      console.warn('updateLoan Supabase fallback:', err);
    }
  }
}

export async function updateLoanFull(id: string, data: Partial<LoanInput>) {
  const realAssetId = data.asset_id ? resolveAssetId(data.asset_id) : undefined;
  const payload: Record<string, any> = {};
  if (data.asset_id !== undefined) payload.asset_id = realAssetId || data.asset_id;
  if (data.lender !== undefined) payload.lender = data.lender;
  if (data.principal !== undefined) payload.principal = data.principal;
  if (data.down_payment !== undefined) payload.down_payment = data.down_payment;
  if (data.interest_rate_percent !== undefined) payload.interest_rate_percent = data.interest_rate_percent;
  if (data.preferred_rate_percent !== undefined) payload.preferred_rate_percent = data.preferred_rate_percent;
  if (data.preferred_months !== undefined) payload.preferred_months = data.preferred_months;
  if (data.floating_rate_percent !== undefined) payload.floating_rate_percent = data.floating_rate_percent;
  if (data.loan_ratio_percent !== undefined) payload.loan_ratio_percent = data.loan_ratio_percent;
  if (data.term_months !== undefined) payload.term_months = data.term_months;
  if (data.start_date !== undefined) payload.start_date = data.start_date;
  if (data.monthly_payment !== undefined) payload.monthly_payment = data.monthly_payment;
  if (data.payment_day !== undefined) payload.payment_day = data.payment_day;
  if (data.current_balance !== undefined) payload.current_balance = data.current_balance;
  if (data.status !== undefined) payload.status = data.status;
  if (data.notes !== undefined) payload.notes = data.notes;
  if (data.bank_contact_name !== undefined) payload.bank_contact_name = data.bank_contact_name;
  if (data.bank_contact_phone !== undefined) payload.bank_contact_phone = data.bank_contact_phone;
  if (data.bank_hotline !== undefined) payload.bank_hotline = data.bank_hotline;

  // 1. Save to LocalStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loans');
      const customMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      customMap[id] = { ...(customMap[id] || {}), ...payload, id };
      if (realAssetId) customMap[`asset_${realAssetId}`] = { ...(customMap[`asset_${realAssetId}`] || {}), ...payload, id };
      localStorage.setItem('fmms_custom_loans', JSON.stringify(customMap));
    } catch {}
  }

  // 2. Update Supabase
  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('loans').update(payload).eq('id', id);
    } catch (err) {
      console.warn('updateLoanFull Supabase fallback:', err);
    }
  }
}

export async function deleteLoan(id: string) {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('fmms_custom_loans');
      if (stored) {
        const customMap: Record<string, any> = JSON.parse(stored);
        delete customMap[id];
        localStorage.setItem('fmms_custom_loans', JSON.stringify(customMap));
      }
    } catch {}
  }

  if (isValidUuid(id)) {
    try {
      const supabase = createClient();
      await supabase.from('loans').delete().eq('id', id);
    } catch (err) {
      console.warn('deleteLoan Supabase fallback:', err);
    }
  }
}

/**
 * 🔄 Đồng bộ tự động chi phí khi thay đổi kỳ trả nợ (tránh nhân đôi, xóa khi chưa trả, sửa cập nhật đúng số tiền)
 */
export async function syncLoanPaymentExpense(params: {
  loan: LoanRow | any;
  paymentNumber: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  principalPaid: number;
  interestPaid: number;
  paidDate: string;
}) {
  const { loan, paymentNumber, status, principalPaid, interestPaid, paidDate } = params;
  if (!loan || !loan.asset_id) return;

  try {
    const { getExpenses, createExpense, updateExpense, deleteExpense } = await import('./expenseService');
    const allExpenses = await getExpenses(loan.asset_id);
    const lenderName = loan.lender || 'Ngân hàng';
    const periodTag = `kỳ ${paymentNumber}`;

    // Tìm tất cả chi phí liên quan đến khoản vay và kỳ thanh toán này
    const matchingExpenses = allExpenses.filter(e => {
      if (e.asset_id !== loan.asset_id) return false;
      const cat = (e.category || '').toUpperCase();
      if (cat !== 'LOAN') return false;
      const desc = e.description || '';
      return desc.includes(periodTag) && (desc.includes(lenderName) || desc.includes('khoản vay') || desc.includes('gốc') || desc.includes('lãi'));
    });

    if (status !== 'PAID') {
      // Chuyển sang CHƯA TRẢ / PENDING -> Xoá sạch các bản ghi chi phí của kỳ này
      for (const exp of matchingExpenses) {
        await deleteExpense(exp.id);
      }
      return;
    }

    // Trạng thái ĐÃ TRẢ (PAID)
    const princExpenses = matchingExpenses.filter(e =>
      e.subcategory === 'Monthly Payment' || e.description?.includes('Trả gốc') || e.description?.includes('gốc')
    );
    const intrExpenses = matchingExpenses.filter(e =>
      e.subcategory === 'Interest' || e.description?.includes('Tiền lãi') || e.description?.includes('lãi')
    );

    // 1. Đồng bộ Chi phí Trả gốc
    if (principalPaid > 0) {
      if (princExpenses.length > 0) {
        await updateExpense(princExpenses[0].id, {
          date: paidDate,
          amount: principalPaid,
          vendor: lenderName,
          description: `Trả gốc khoản vay kỳ ${paymentNumber} (${lenderName})`,
        });
        // Dọn dẹp các bản ghi trùng lặp (nếu có từ trước)
        for (let i = 1; i < princExpenses.length; i++) {
          await deleteExpense(princExpenses[i].id);
        }
      } else {
        await createExpense({
          asset_id: loan.asset_id,
          date: paidDate,
          category: 'Loan',
          subcategory: 'Monthly Payment',
          amount: principalPaid,
          currency: 'VND',
          vendor: lenderName,
          description: `Trả gốc khoản vay kỳ ${paymentNumber} (${lenderName})`,
        });
      }
    } else {
      for (const exp of princExpenses) {
        await deleteExpense(exp.id);
      }
    }

    // 2. Đồng bộ Chi phí Trả lãi
    if (interestPaid > 0) {
      if (intrExpenses.length > 0) {
        await updateExpense(intrExpenses[0].id, {
          date: paidDate,
          amount: interestPaid,
          vendor: lenderName,
          description: `Tiền lãi khoản vay kỳ ${paymentNumber} (${lenderName})`,
        });
        // Dọn dẹp các bản ghi trùng lặp (nếu có từ trước)
        for (let i = 1; i < intrExpenses.length; i++) {
          await deleteExpense(intrExpenses[i].id);
        }
      } else {
        await createExpense({
          asset_id: loan.asset_id,
          date: paidDate,
          category: 'Loan',
          subcategory: 'Interest',
          amount: interestPaid,
          currency: 'VND',
          vendor: lenderName,
          description: `Tiền lãi khoản vay kỳ ${paymentNumber} (${lenderName})`,
        });
      }
    } else {
      for (const exp of intrExpenses) {
        await deleteExpense(exp.id);
      }
    }
  } catch (err) {
    console.warn('syncLoanPaymentExpense error:', err);
  }
}

/**
 * 🗑️ Xoá toàn bộ khoản vay + cascade dọn sạch lịch sử kỳ trả nợ và toàn bộ chi phí liên quan
 */
export async function deleteLoanWithCascade(loanId: string) {
  try {
    const { getExpenses, deleteExpense } = await import('./expenseService');
    const loans = await getLoans();
    const targetLoan = loans.find(l => l.id === loanId);

    // 1. Xoá tất cả kỳ trả nợ (loan_payments)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fmms_custom_loan_payments');
        if (stored) {
          const customMap: Record<string, any> = JSON.parse(stored);
          Object.keys(customMap).forEach(k => {
            if (customMap[k]?.loan_id === loanId || k.startsWith(`loan_${loanId}_`)) {
              delete customMap[k];
            }
          });
          localStorage.setItem('fmms_custom_loan_payments', JSON.stringify(customMap));
        }
      } catch {}
    }

    if (isValidUuid(loanId)) {
      try {
        const supabase = createClient();
        await supabase.from('loan_payments').delete().eq('loan_id', loanId);
      } catch (err) {
        console.warn('Cascade delete loan_payments warning:', err);
      }
    }

    // 2. Xoá tất cả chi phí gốc và lãi của khoản vay này trong bảng expenses
    if (targetLoan && targetLoan.asset_id) {
      const allExpenses = await getExpenses(targetLoan.asset_id);
      const lenderName = targetLoan.lender || 'Ngân hàng';
      const relatedExpenses = allExpenses.filter(e => {
        if (e.asset_id !== targetLoan.asset_id) return false;
        const cat = (e.category || '').toUpperCase();
        if (cat !== 'LOAN') return false;
        const desc = e.description || '';
        return desc.includes(lenderName) || desc.includes('khoản vay') || desc.includes('Trả gốc') || desc.includes('Tiền lãi');
      });

      for (const exp of relatedExpenses) {
        await deleteExpense(exp.id);
      }
    }

    // 3. Xoá bản thân khoản vay
    await deleteLoan(loanId);
  } catch (err) {
    console.warn('deleteLoanWithCascade error:', err);
    await deleteLoan(loanId);
  }
}

/**
 * 🧹 Tự động dọn sạch các bản ghi chi phí khoản vay bị nhân đôi từ trước
 */
export async function cleanupDuplicateLoanExpenses() {
  if (typeof window === 'undefined') return;
  try {
    const { getExpenses, deleteExpense } = await import('./expenseService');
    const allExpenses = await getExpenses();
    const loanExpenses = allExpenses.filter(e => (e.category || '').toUpperCase() === 'LOAN');
    const seen = new Set<string>();
    for (const exp of loanExpenses) {
      const key = `${exp.asset_id}_${exp.subcategory || ''}_${(exp.description || '').trim()}_${exp.date}_${exp.amount}`;
      if (seen.has(key)) {
        await deleteExpense(exp.id);
      } else {
        seen.add(key);
      }
    }
  } catch (err) {
    console.warn('cleanupDuplicateLoanExpenses warning:', err);
  }
}