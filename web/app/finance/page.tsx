'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { getAssets } from '@/lib/services/assetService';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import { getLoans, getLoanPayments, createLoan, createLoanPayment, updateLoan, LoanRow, LoanPaymentRow } from '@/lib/services/loanService';
import { ExpenseRecord, TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';
import { VehicleFinanceOverview } from '@/components/assets/VehicleFinanceOverview';
import { DollarSign, CreditCard, Plus, X, TrendingDown, CheckCircle2, Clock, AlertTriangle, Edit2, Trash2, Pencil } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

const CAT_LABELS: Record<string, string> = {
  FUEL: 'Nhiên liệu', MAINTENANCE: 'Bảo dưỡng', INSURANCE: 'Bảo hiểm',
  REGISTRATION: 'Đăng ký/Lăn bánh', PARKING: 'Đỗ xe', TOLL: 'Cầu đường',
  PARTS: 'Phụ tùng', LABOR: 'Nhân công', INSPECTION: 'Đăng kiểm',
  LOAN: 'Khoản vay', LOAN_PAYMENT: 'Trả gốc vay', LOAN_INTEREST: 'Trả lãi vay',
  INITIAL: 'Vốn mua xe', UPGRADE: 'Nâng cấp/Đồ chơi', CAR_WASH: 'Rửa xe', OTHER: 'Khác',
};
const CAT_COLORS: Record<string, string> = {
  FUEL: '#F59E0B', MAINTENANCE: '#38BDF8', INSURANCE: '#A78BFA',
  REGISTRATION: '#34D399', PARKING: '#94A3B8', TOLL: '#CBD5E1',
  PARTS: '#FB923C', LABOR: '#60A5FA', INSPECTION: '#4ADE80',
  LOAN: '#EC4899', LOAN_PAYMENT: '#8B5CF6', LOAN_INTEREST: '#EF4444',
  INITIAL: '#10B981', UPGRADE: '#6366F1', CAR_WASH: '#06B6D4', OTHER: '#6B7280',
};

// Generate loan payment schedule (with custom per-period overrides)
function generateLoanSchedule(loan: LoanRow, payments: LoanPaymentRow[]) {
  const monthly = loan.monthly_payment;
  const rate = (loan.interest_rate_percent || 0) / 100 / 12;
  const start = new Date(loan.start_date || new Date().toISOString().slice(0, 10));
  let balance = loan.principal;
  const schedule = [];
  
  const paymentMap = new Map<number, LoanPaymentRow>();
  payments.forEach(p => {
    paymentMap.set(p.payment_number, p);
  });

  for (let i = 1; i <= loan.term_months; i++) {
    const customPayment = paymentMap.get(i);
    let interest = Math.round(balance * rate);
    let principal = Math.round(monthly - interest);
    let total = monthly;
    let dueStr = '';
    let status: 'PAID' | 'PENDING' | 'OVERDUE' = 'PENDING';
    let paidDate: string | undefined = undefined;

    if (customPayment) {
      dueStr = customPayment.due_date ? customPayment.due_date.slice(0, 10) : '';
      principal = Number(customPayment.principal_paid) || principal;
      interest = Number(customPayment.interest_paid) || interest;
      total = Number(customPayment.total_payment) || (principal + interest);
      status = customPayment.status;
      paidDate = customPayment.paid_date;
    }

    if (!dueStr) {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i - 1);
      due.setDate(loan.payment_day || 15);
      dueStr = due.toISOString().split('T')[0];
    }

    const today = new Date();
    if (!customPayment) {
      if (new Date(dueStr) < today) status = 'OVERDUE';
    }

    balance = Math.max(0, balance - principal);

    schedule.push({
      payment_number: i,
      due_date: dueStr,
      principal_paid: principal,
      interest_paid: interest,
      total_payment: total,
      status,
      paid_date: paidDate,
      remaining_balance: balance,
    });
  }
  return schedule;
}

export default function FinancePage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [payments, setPayments] = useState<LoanPaymentRow[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'expenses' | 'loans'>('expenses');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paid_date: '', notes: '' });
  const [form, setForm] = useState({
    asset_id: '', date: '', category: 'Running', subcategory: 'Fuel',
    amount: '', vendor: '', description: '',
  });
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [openAddLoanModal, setOpenAddLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRow | null>(null);
  const [loanForm, setLoanForm] = useState({
    asset_id: '',
    lender: 'Ngân hàng Techcombank',
    principal: '400000000',
    down_payment: '100000000',
    interest_rate_percent: '8.5',
    term_months: '36',
    start_date: new Date().toISOString().slice(0, 10),
    monthly_payment: '',
    payment_day: '15',
    bank_contact_name: '',
    bank_contact_phone: '',
    bank_hotline: '',
    notes: '',
  });

  const isSameAsset = (recAssetId: string, targetAssetId: string) => {
    if (recAssetId === targetAssetId) return true;
    const targetAsset = assets.find(a => a.id === targetAssetId);
    if (targetAsset?.license_plate === '19B-213.87' && (recAssetId === 'CAR01' || recAssetId === '22222222-2222-2222-2222-222222222222' || recAssetId === '20260308-0001-4222-8888-19b213872026')) return true;
    if (targetAsset?.license_plate === '88C1-210.63' && (recAssetId === 'BIKE01' || recAssetId === '20170801-0002-4111-8888-88c121063016')) return true;
    if (targetAsset?.license_plate === '88L1-604.36' && (recAssetId === 'BIKE02' || recAssetId === '20210405-0003-4333-8888-88l160436021')) return true;
    if (targetAsset?.license_plate === 'MTB 26-555' && (recAssetId === 'BIKE03' || recAssetId === '20240310-0004-4444-8888-00000mtb2605')) return true;
    if (targetAsset?.license_plate === 'MTB 20-999' && (recAssetId === 'BIKE04' || recAssetId === '20240310-0005-4555-8888-00000mtb2005')) return true;
    return false;
  };

  const loadData = async () => {
    try {
      const [a, e, l] = await Promise.all([getAssets(), getExpenses(), getLoans()]);
      setAssets(a);
      setExpenses(e);
      setLoans(l);
      if (a.length > 0 && !form.asset_id) setForm(p => ({ ...p, asset_id: a[0].id }));
      if (a.length > 0 && !loanForm.asset_id) setLoanForm(p => ({ ...p, asset_id: a[0].id }));
      if (l.length > 0) {
        const targetId = selectedLoanId && l.some(x => x.id === selectedLoanId) ? selectedLoanId : l[0].id;
        setSelectedLoanId(targetId);
        setPayments(await getLoanPayments(targetId));
      }
    } catch {
      /* ignore */
    }
  };

  const [taxMap, setTaxMap] = useState<Record<string, { label: string; subcategories: Record<string, string> }>>(TAXONOMY);

  useEffect(() => {
    setTaxMap(getDynamicTaxonomy());
    const handleUpdate = () => setTaxMap(getDynamicTaxonomy());
    window.addEventListener('fmms_master_updated', handleUpdate);
    return () => window.removeEventListener('fmms_master_updated', handleUpdate);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedLoanId) {
      getLoanPayments(selectedLoanId).then(setPayments).catch(() => {});
    }
  }, [selectedLoanId]);

  const filteredExpenses = useMemo(() => {
    if (!selectedAssetId) return expenses;
    return expenses.filter(e => isSameAsset(e.asset_id, selectedAssetId));
  }, [expenses, selectedAssetId, assets]);

  const filteredLoans = useMemo(() => {
    if (!selectedAssetId) return loans;
    return loans.filter(l => isSameAsset(l.asset_id, selectedAssetId));
  }, [loans, selectedAssetId, assets]);

  const selectedLoan = useMemo(() => {
    if (selectedAssetId) {
      return filteredLoans[0] || null;
    }
    return loans.find(l => l.id === selectedLoanId) || loans[0] || null;
  }, [loans, filteredLoans, selectedAssetId, selectedLoanId]);

  // Auto-calculate monthly payment (EMI formula)
  const calculatedMonthly = useMemo(() => {
    const p = parseFloat(loanForm.principal) || 0;
    const r = (parseFloat(loanForm.interest_rate_percent) || 0) / 100 / 12;
    const n = parseInt(loanForm.term_months) || 12;
    if (p > 0 && r > 0 && n > 0) {
      const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      return Math.round(emi);
    }
    return 0;
  }, [loanForm.principal, loanForm.interest_rate_percent, loanForm.term_months]);

  const loanSchedule = useMemo(() => selectedLoan ? generateLoanSchedule(selectedLoan, payments) : [], [selectedLoan, payments]);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const paidPrincipal = selectedLoan ? selectedLoan.principal - selectedLoan.current_balance : 0;
  const loanProgress = selectedLoan && selectedLoan.principal > 0 ? (paidPrincipal / selectedLoan.principal) * 100 : 0;
  const paidPayments = loanSchedule.filter(p => p.status === 'PAID').length;
  const overduePayments = loanSchedule.filter(p => p.status === 'OVERDUE').length;

  const normalizeCategory = (cat?: string, sub?: string) => {
    if (!cat) return { category: 'Running', subcategory: 'Fuel' };
    if (taxMap[cat]) {
      const subKeys = Object.keys(taxMap[cat]?.subcategories || {});
      const matchedSub = sub && subKeys.includes(sub) ? sub : (subKeys[0] || 'Other');
      return { category: cat, subcategory: matchedSub };
    }

    const legacyMap: Record<string, { cat: string; sub: string }> = {
      FUEL: { cat: 'Running', sub: 'Fuel' },
      MAINTENANCE: { cat: 'Maintenance', sub: 'General Service' },
      PARTS: { cat: 'Maintenance', sub: 'Brake' },
      LABOR: { cat: 'Maintenance', sub: 'General Service' },
      INSURANCE: { cat: 'Initial', sub: 'Insurance' },
      REGISTRATION: { cat: 'Initial', sub: 'Registration' },
      INSPECTION: { cat: 'Initial', sub: 'Registration' },
      TOLL: { cat: 'Running', sub: 'Epass Fee' },
      PARKING: { cat: 'Running', sub: 'Parking' },
      WASH: { cat: 'Running', sub: 'Car Wash' },
      CAR_WASH: { cat: 'Running', sub: 'Car Wash' },
      UPGRADE: { cat: 'Upgrade', sub: 'Accessorie' },
      LOAN: { cat: 'Loan', sub: 'Monthly Payment' },
      LOAN_PAYMENT: { cat: 'Loan', sub: 'Monthly Payment' },
      LOAN_INTEREST: { cat: 'Loan', sub: 'Interest' },
      INITIAL: { cat: 'Initial', sub: 'Purchase' },
      OTHER: { cat: 'Maintenance', sub: 'Other' },
    };

    const upperCat = cat.toUpperCase();
    if (legacyMap[upperCat]) {
      const found = legacyMap[upperCat];
      const validSub = sub && taxMap[found.cat]?.subcategories?.[sub] ? sub : found.sub;
      return { category: found.cat, subcategory: validSub };
    }

    for (const [cKey, cVal] of Object.entries(taxMap)) {
      if (cKey.toLowerCase() === cat.toLowerCase()) {
        const subKeys = Object.keys(cVal.subcategories || {});
        return { category: cKey, subcategory: sub && subKeys.includes(sub) ? sub : (subKeys[0] || 'Other') };
      }
      for (const sKey of Object.keys(cVal.subcategories || {})) {
        if (sKey.toLowerCase() === cat.toLowerCase() || (sub && sKey.toLowerCase() === sub.toLowerCase())) {
          return { category: cKey, subcategory: sKey };
        }
      }
    }

    return { category: Object.keys(taxMap)[0] || 'Running', subcategory: 'Fuel' };
  };

  const breakdown = useMemo(() => {
    const map = new Map<string, { label: string; total: number; color: string }>();
    filteredExpenses.forEach(e => {
      const norm = normalizeCategory(e.category, e.subcategory);
      const cat = norm.category;
      const label = taxMap[cat]?.label ? taxMap[cat].label.replace(/^[^\s]+\s+/, '') : (CAT_LABELS[cat] || cat);
      const color = CAT_COLORS[cat] || CAT_COLORS[e.category] || '#6B7280';
      const prev = map.get(cat) || { label, total: 0, color };
      prev.total += e.amount;
      map.set(cat, prev);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ category: k, label: v.label, total: v.total, color: v.color }))
      .filter(b => b.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, taxMap]);

  const openEdit = (e: ExpenseRecord) => {
    setEditId(e.id);
    const norm = normalizeCategory(e.category, e.subcategory);
    setForm({
      asset_id: e.asset_id,
      date: e.date ? e.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      category: norm.category,
      subcategory: norm.subcategory,
      amount: String(e.amount),
      vendor: e.vendor || '',
      description: e.description || '',
    });
    setOpenModal(true);
  };

  const saveExpense = async () => {
    const payload = {
      asset_id: form.asset_id || assets[0]?.id,
      date: form.date || new Date().toISOString().slice(0, 10),
      category: form.category,
      subcategory: form.subcategory || undefined,
      amount: parseFloat(form.amount) || 0,
      currency: 'VND',
      vendor: form.vendor || undefined,
      description: form.description || undefined,
    };
    try {
      if (editId) {
        const updated = await updateExpense(editId, payload);
        setExpenses(prev => prev.map(e => e.id === editId ? updated : e));
      } else {
        const created = await createExpense(payload);
        setExpenses(prev => [created, ...prev]);

        // Auto-link loan payment if this expense is a Loan payment
        if (payload.category === 'Loan' || payload.category === 'LOAN' || payload.category === 'LOAN_PAYMENT' || payload.subcategory === 'Monthly Payment') {
          try {
            const targetAssetId = payload.asset_id;
            const assetLoans = loans.filter(l => l.asset_id === targetAssetId);
            if (assetLoans.length > 0) {
              const activeLoan = assetLoans[0];
              const payments = await getLoanPayments(activeLoan.id);
              const sched = generateLoanSchedule(activeLoan, payments);
              const nextPending = sched.find((s: any) => s.status !== 'PAID');
              if (nextPending) {
                const existingPayment = payments.find(p => p.payment_number === nextPending.payment_number);
                const princ = nextPending.principal_paid;
                const intr = nextPending.interest_paid;
                const tot = payload.amount || nextPending.total_payment;
                if (existingPayment) {
                  const { updateLoanPayment } = await import('@/lib/services/loanService');
                  await updateLoanPayment(existingPayment.id, {
                    status: 'PAID',
                    paid_date: payload.date || new Date().toISOString().slice(0, 10),
                    total_payment: tot,
                  });
                } else {
                  await createLoanPayment({
                    loan_id: activeLoan.id,
                    payment_number: nextPending.payment_number,
                    due_date: nextPending.due_date,
                    principal_paid: princ,
                    interest_paid: intr,
                    total_payment: tot,
                    paid_date: payload.date || new Date().toISOString().slice(0, 10),
                    status: 'PAID',
                    remaining_balance: Math.max(0, activeLoan.current_balance - princ),
                  });
                }
                await updateLoan(activeLoan.id, { current_balance: Math.max(0, activeLoan.current_balance - princ) });
              }
            }
        // Auto-link part if this expense is an Upgrade or Maintenance part
        if ((payload.category === 'Upgrade' || payload.category === 'Maintenance') && payload.amount > 0 && payload.description) {
          try {
            const { createPart } = await import('@/lib/services/partService');
            await createPart({
              asset_id: payload.asset_id,
              part_name: payload.description,
              brand: payload.vendor || undefined,
              supplier: payload.category === 'Upgrade' ? 'Nâng cấp' : 'Bảo dưỡng',
              installation_date: payload.date,
              cost: payload.amount,
              notes: `Tự động tạo từ chi phí ${payload.subcategory || payload.category}`,
            });
          } catch (partSyncErr) {
            console.warn('Auto part sync warning:', partSyncErr);
          }
        }
      }
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi lưu: ${err?.message ?? 'Không lưu được'}`);
    }
    setOpenModal(false); setEditId(null);
    setForm({ asset_id: assets[0]?.id || '', date: '', category: 'Running', subcategory: 'Fuel', amount: '', vendor: '', description: '' });
  };

  const deleteExpenseHandler = async (id: string) => {
    if (!confirm('Xóa chi phí này?')) return;
    try {
      await deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      alert(`Lỗi khi xóa: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const openAddLoan = () => {
    setEditingLoan(null);
    setLoanForm({
      asset_id: assets[0]?.id || '',
      lender: 'Ngân hàng Techcombank',
      principal: '400000000',
      down_payment: '100000000',
      interest_rate_percent: '8.5',
      term_months: '36',
      start_date: new Date().toISOString().slice(0, 10),
      monthly_payment: '',
      payment_day: '15',
      bank_contact_name: '',
      bank_contact_phone: '',
      bank_hotline: '',
      notes: '',
    });
    setOpenAddLoanModal(true);
  };

  const openEditLoan = (l: LoanRow) => {
    setEditingLoan(l);
    setLoanForm({
      asset_id: l.asset_id,
      lender: l.lender || '',
      principal: String(l.principal),
      down_payment: String(l.down_payment || 0),
      interest_rate_percent: String(l.interest_rate_percent),
      term_months: String(l.term_months),
      start_date: l.start_date ? l.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      monthly_payment: String(l.monthly_payment),
      payment_day: String(l.payment_day || 15),
      bank_contact_name: l.bank_contact_name || '',
      bank_contact_phone: l.bank_contact_phone || '',
      bank_hotline: l.bank_hotline || '',
      notes: l.notes || '',
    });
    setOpenAddLoanModal(true);
  };

  const handleSaveLoan = async () => {
    const p = parseFloat(loanForm.principal) || 0;
    const m = parseFloat(loanForm.monthly_payment) || calculatedMonthly;
    const input = {
      asset_id: loanForm.asset_id || assets[0]?.id,
      lender: loanForm.lender || 'Ngân hàng',
      principal: p,
      down_payment: parseFloat(loanForm.down_payment) || 0,
      interest_rate_percent: parseFloat(loanForm.interest_rate_percent) || 8.5,
      term_months: parseInt(loanForm.term_months) || 36,
      start_date: loanForm.start_date || new Date().toISOString().slice(0, 10),
      monthly_payment: m,
      payment_day: parseInt(loanForm.payment_day) || 15,
      current_balance: editingLoan ? editingLoan.current_balance : p,
      bank_contact_name: loanForm.bank_contact_name || undefined,
      bank_contact_phone: loanForm.bank_contact_phone || undefined,
      bank_hotline: loanForm.bank_hotline || undefined,
      notes: loanForm.notes || undefined,
    };

    try {
      if (editingLoan) {
        const { updateLoanFull } = await import('@/lib/services/loanService');
        await updateLoanFull(editingLoan.id, input);
      } else {
        const created = await createLoan(input);
        setSelectedLoanId(created.id);
      }
      await loadData();
      setOpenAddLoanModal(false);
      setEditingLoan(null);
    } catch (err: any) {
      alert(`Lỗi khi lưu khoản vay: ${err?.message ?? 'Không lưu được'}`);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản vay này?')) return;
    try {
      const { deleteLoan } = await import('@/lib/services/loanService');
      await deleteLoan(loanId);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi xóa khoản vay: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const confirmPayment = async () => {
    if (!selectedLoan) return;
    const next = loanSchedule.find(p => p.status !== 'PAID');
    const amount = parseFloat(paymentForm.amount) || selectedLoan.monthly_payment;
    try {
      await createLoanPayment({
        loan_id: selectedLoan.id,
        payment_number: next?.payment_number ?? (loanSchedule.length + 1),
        due_date: next?.due_date ?? new Date().toISOString().slice(0, 10),
        principal_paid: next?.principal_paid ?? Math.round(amount),
        interest_paid: next?.interest_paid ?? 0,
        total_payment: amount,
        paid_date: paymentForm.paid_date || new Date().toISOString().slice(0, 10),
        status: 'PAID',
        remaining_balance: Math.max(0, selectedLoan.current_balance - amount),
      });
      await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.current_balance - amount) });
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi ghi thanh toán: ${err?.message ?? 'Không ghi được'}`);
    }
    setShowPaymentModal(false);
    setPaymentForm({ amount: '', paid_date: '', notes: '' });
  };

  const [openEditPeriodModal, setOpenEditPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any | null>(null);
  const [periodForm, setPeriodForm] = useState({
    payment_number: 1,
    due_date: '',
    principal_paid: '',
    interest_paid: '',
    total_payment: '',
    paid_date: '',
    status: 'PENDING' as 'PAID' | 'PENDING' | 'OVERDUE',
  });

  const handleOpenEditPeriod = (p: any) => {
    setEditingPeriod(p);
    setPeriodForm({
      payment_number: p.payment_number,
      due_date: p.due_date ? p.due_date.slice(0, 10) : '',
      principal_paid: String(p.principal_paid || ''),
      interest_paid: String(p.interest_paid || ''),
      total_payment: String(p.total_payment || (p.principal_paid + p.interest_paid) || ''),
      paid_date: p.paid_date ? p.paid_date.slice(0, 10) : (p.status === 'PAID' ? (p.due_date ? p.due_date.slice(0, 10) : new Date().toISOString().slice(0, 10)) : ''),
      status: p.status || 'PENDING',
    });
    setOpenEditPeriodModal(true);
  };

  const handleSavePeriod = async () => {
    if (!selectedLoan || !editingPeriod) return;
    const princ = parseFloat(periodForm.principal_paid) || 0;
    const intr = parseFloat(periodForm.interest_paid) || 0;
    const tot = parseFloat(periodForm.total_payment) || (princ + intr);
    try {
      const { createLoanPayment, updateLoanPayment } = await import('@/lib/services/loanService');
      const existing = payments.find(pm => pm.payment_number === editingPeriod.payment_number);
      if (existing) {
        await updateLoanPayment(existing.id, {
          due_date: periodForm.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: tot,
          paid_date: periodForm.status === 'PAID' ? (periodForm.paid_date || new Date().toISOString().slice(0, 10)) : undefined,
          status: periodForm.status,
        });
      } else {
        await createLoanPayment({
          loan_id: selectedLoan.id,
          payment_number: editingPeriod.payment_number,
          due_date: periodForm.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: tot,
          paid_date: periodForm.status === 'PAID' ? (periodForm.paid_date || new Date().toISOString().slice(0, 10)) : undefined,
          status: periodForm.status,
          remaining_balance: editingPeriod.remaining_balance || 0,
        });
      }
      await loadData();
      setOpenEditPeriodModal(false);
      setEditingPeriod(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật kỳ thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const toggleSchedulePayment = async (item: any) => {
    if (!selectedLoan) return;
    try {
      if (item.status === 'PAID') {
        const match = payments.find(p => p.payment_number === item.payment_number);
        if (match) {
          const { updateLoanPayment } = await import('@/lib/services/loanService');
          await updateLoanPayment(match.id, { status: 'PENDING', paid_date: undefined });
          await updateLoan(selectedLoan.id, { current_balance: Math.min(selectedLoan.principal, selectedLoan.current_balance + item.principal_paid) });
        }
      } else {
        await createLoanPayment({
          loan_id: selectedLoan.id,
          payment_number: item.payment_number,
          due_date: item.due_date,
          principal_paid: item.principal_paid,
          interest_paid: item.interest_paid,
          total_payment: item.total_payment,
          paid_date: new Date().toISOString().slice(0, 10),
          status: 'PAID',
          remaining_balance: Math.max(0, selectedLoan.current_balance - item.principal_paid),
        });
        await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.current_balance - item.principal_paid) });
      }
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const statusBadge = (s: 'PAID' | 'PENDING' | 'OVERDUE') => {
    const map = {
      PAID: { label: '✓ Đã trả', color: 'var(--status-green)', bg: 'rgba(52,211,153,0.12)' },
      PENDING: { label: '⏳ Chưa đến hạn', color: 'var(--text-muted)', bg: 'var(--bg-hover)' },
      OVERDUE: { label: '⚠ Quá hạn', color: 'var(--status-red)', bg: 'rgba(248,113,113,0.12)' },
    };
    return map[s] || map.PENDING;
  };

  const selectedVehicleObj = assets.find(a => a.id === selectedAssetId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Chi Phí &amp; Khoản Vay</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {selectedAssetId ? (
              <span>Phương tiện: <strong className="text-cyan-400">{selectedVehicleObj?.name}</strong> · Chi phí: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalExpenses)} ₫</strong></span>
            ) : (
              <span>Toàn bộ {assets.length} xe · Tổng chi phí: <strong style={{ color: 'var(--status-red)' }}>{fmt(totalExpenses)} ₫</strong></span>
            )}
            {overduePayments > 0 && <span className="ml-3" style={{ color: 'var(--status-red)' }}>⚠ {overduePayments} khoản vay quá hạn</span>}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {activeSection === 'expenses' ? (
            <button onClick={() => { setEditId(null); if (selectedAssetId) setForm(p => ({ ...p, asset_id: selectedAssetId })); setOpenModal(true); }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shadow-md cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>
              <Plus className="w-4 h-4" /><span>Thêm chi phí</span>
            </button>
          ) : (
            <button onClick={() => { if (selectedAssetId) setLoanForm(p => ({ ...p, asset_id: selectedAssetId })); openAddLoan(); }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-white text-xs font-bold transition hover:opacity-90 shadow-md cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <Plus className="w-4 h-4" /><span>Tạo khoản vay mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Vehicle Filter Bar ─── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Lọc tài chính theo phương tiện ({assets.length} xe)
          </p>
          {selectedAssetId && (
            <button 
              onClick={() => setSelectedAssetId(null)} 
              className="text-[11px] font-bold underline transition hover:opacity-80 flex items-center space-x-1 cursor-pointer"
              style={{ color: 'var(--accent-cyan)' }}
            >
              <span>Xem tất cả phương tiện</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Option: Tất cả */}
          <div
            onClick={() => setSelectedAssetId(null)}
            className={`p-3 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-between ${
              selectedAssetId === null ? 'shadow-md ring-2 ring-cyan-500 scale-[1.02]' : 'hover:border-cyan-500/50'
            }`}
            style={{
              background: selectedAssetId === null ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-secondary)',
              borderColor: selectedAssetId === null ? 'var(--accent-cyan)' : 'var(--border-default)',
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ background: 'var(--accent-cyan)', color: '#fff' }}>
                ALL
              </div>
              <div className="overflow-hidden">
                <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>Tất cả xe</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {loans.length > 0 ? `${loans.length} khoản vay · ` : ''}{expenses.length} chi phí
                </p>
              </div>
            </div>
            <p className="text-right text-[11px] font-extrabold mt-2" style={{ color: 'var(--status-red)' }}>
              {fmt(expenses.reduce((s, e) => s + e.amount, 0))} ₫
            </p>
          </div>

          {/* Vehicle Cards */}
          {assets.map(a => {
            const isSelected = selectedAssetId === a.id;
            const assetExps = expenses.filter(e => isSameAsset(e.asset_id, a.id));
            const assetCost = assetExps.reduce((s, e) => s + e.amount, 0);
            const assetLoan = loans.find(l => isSameAsset(l.asset_id, a.id));

            return (
              <div
                key={a.id}
                onClick={() => setSelectedAssetId(isSelected ? null : a.id)}
                className={`p-3 rounded-2xl cursor-pointer border transition-all duration-200 flex flex-col justify-between ${
                  isSelected ? 'shadow-md ring-2 ring-cyan-500 scale-[1.02]' : 'hover:border-cyan-500/50 opacity-90 hover:opacity-100'
                }`}
                style={{
                  background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'var(--bg-secondary)',
                  borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-default)',
                }}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}>
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs" style={{ color: 'var(--accent-cyan)' }}>
                        {a.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-extrabold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{a.license_plate || a.model}</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  {assetLoan ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                      🏦 Có vay
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-500">
                      {assetExps.length} mục
                    </span>
                  )}
                  <p className="text-right text-[11px] font-extrabold" style={{ color: 'var(--status-red)' }}>
                    {fmt(assetCost)} ₫
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tab */}
      <div className="flex space-x-2">
        {(['expenses', 'loans'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSection(tab)}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition"
            style={activeSection === tab
              ? { background: 'var(--accent-cyan-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--accent-cyan-border)' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            {tab === 'expenses' ? '💳 Chi Phí Phát Sinh' : '🏦 Khoản Vay & Lịch Trả Nợ'}
          </button>
        ))}
      </div>

      {/* ─── EXPENSES ─── */}
      {activeSection === 'expenses' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {breakdown.map(b => (
              <div key={b.category} className="p-4 rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: b.color }} />
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{b.label}</span>
                </div>
                <p className="text-sm font-extrabold" style={{ color: b.color }}>{(b.total / 1_000_000).toFixed(1)}M ₫</p>
                <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{((b.total / (totalExpenses || 1)) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  {['Ngày', 'Phương tiện', 'Danh mục', 'Mô tả', 'Nhà cung cấp', 'Số tiền', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{assets.find(a => a.id === e.asset_id)?.name?.split(' ')[0] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${CAT_COLORS[e.category] || '#6B7280'}22`, color: CAT_COLORS[e.category] || 'var(--text-muted)' }}>
                        {CAT_LABELS[e.category] || e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{e.description || '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{e.vendor || '—'}</td>
                    <td className="px-4 py-3 font-extrabold" style={{ color: 'var(--status-red)' }}>{fmt(e.amount)} ₫</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <button onClick={() => openEdit(e)} className="p-1 rounded hover:opacity-70 transition" style={{ color: 'var(--accent-cyan)' }} title="Sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteExpenseHandler(e.id)} className="p-1 rounded hover:opacity-70 transition" style={{ color: 'var(--status-red)' }} title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      Không có chi phí nào cho phương tiện này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─── LOANS ─── */}
      {activeSection === 'loans' && (
        <div className="space-y-5">
          {/* Active Loans Overview Cards when ALL is selected */}
          {!selectedAssetId && loans.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {loans.map(l => {
                const asset = assets.find(a => a.id === l.asset_id);
                const isCurrentLoan = selectedLoan?.id === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedLoanId(l.id)}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                      isCurrentLoan ? 'ring-2 ring-emerald-500 shadow-lg' : 'hover:border-emerald-500/50'
                    }`}
                    style={{
                      background: isCurrentLoan ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-secondary)',
                      borderColor: isCurrentLoan ? 'var(--status-green)' : 'var(--border-default)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {asset?.name || 'Xe'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                        {l.lender}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-2">
                      <span style={{ color: 'var(--text-muted)' }}>Gốc vay:</span>
                      <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(l.principal)} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span style={{ color: 'var(--text-muted)' }}>Dư nợ còn:</span>
                      <span className="font-mono font-bold text-amber-400">{fmt(l.current_balance)} ₫</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* If specific vehicle is selected and has no loan */}
          {selectedAssetId && filteredLoans.length === 0 ? (
            <div className="p-8 rounded-2xl text-center space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <CreditCard className="w-10 h-10 mx-auto opacity-40 text-cyan-400" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {selectedVehicleObj?.name || 'Phương tiện này'} chưa có khoản vay mua xe
              </p>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                Bạn có thể tạo khoản vay mua xe trả góp cho {selectedVehicleObj?.name || 'phương tiện'} để tự động tính lịch trả nợ dư nợ giảm dần.
              </p>
              <button
                onClick={() => {
                  setEditingLoan(null);
                  setLoanForm(p => ({ ...p, asset_id: selectedAssetId || '' }));
                  setOpenAddLoanModal(true);
                }}
                className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                + Tạo khoản vay cho {selectedVehicleObj?.name || 'xe này'}
              </button>
            </div>
          ) : loans.length === 0 ? (
            <div className="p-8 rounded-2xl text-center space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <CreditCard className="w-10 h-10 mx-auto opacity-40 text-cyan-400" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Chưa có khoản vay mua xe nào</p>
              <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
                Bạn có thể tạo khoản vay mua xe trả góp cho bất kỳ phương tiện nào trong gia đình để tự động tính lịch trả nợ dư nợ giảm dần.
              </p>
              <button onClick={openAddLoan} className="px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-md" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                + Tạo khoản vay đầu tiên
              </button>
            </div>
          ) : null}

          {selectedLoan && (
            <div className="space-y-6">
              {(() => {
                const targetAsset = assets.find(a => a.id === selectedLoan.asset_id);
                if (!targetAsset) return null;
                return (
                  <VehicleFinanceOverview
                    asset={targetAsset}
                    loan={selectedLoan as any}
                    expenses={expenses.filter(e => isSameAsset(e.asset_id, selectedLoan.asset_id))}
                    onRefresh={loadData}
                  />
                );
              })()}

              {/* 📋 Monthly Repayment Schedule Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      <span>📋 Lịch Trả Nợ Chi Tiết Theo Tháng ({selectedLoan.term_months} kỳ)</span>
                    </h4>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Bảng tính dư nợ giảm dần, bấm <strong>"✓ Đã trả"</strong> để cập nhật tiến độ trả nợ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEditLoan(selectedLoan)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:opacity-90 transition">
                      ✏️ Sửa khoản vay
                    </button>
                    <button onClick={() => handleDeleteLoan(selectedLoan.id)} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 transition">
                      ❌ Xóa khoản vay
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                        {['Kỳ #', 'Hạn đóng', 'Tiền gốc (₫)', 'Tiền lãi (₫)', 'Tổng trả (₫)', 'Dư nợ còn lại (₫)', 'Trạng thái', 'Thao tác'].map(h => (
                          <th key={h} className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loanSchedule.map((p: any, i: number) => (
                        <tr key={p.payment_number} style={{ borderBottom: '1px solid var(--border-subtle)', background: p.status === 'OVERDUE' ? 'rgba(248,113,113,0.05)' : i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                          <td className="px-3.5 py-2.5 font-bold" style={{ color: 'var(--text-muted)' }}>Kỳ {p.payment_number}</td>
                          <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--text-secondary)' }}>{fmtDate(p.due_date)}</td>
                          <td className="px-3.5 py-2.5 font-mono font-medium text-emerald-400">{fmt(p.principal_paid)} ₫</td>
                          <td className="px-3.5 py-2.5 font-mono text-amber-400">{fmt(p.interest_paid)} ₫</td>
                          <td className="px-3.5 py-2.5 font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(p.total_payment)} ₫</td>
                          <td className="px-3.5 py-2.5 font-mono" style={{ color: 'var(--text-muted)' }}>{fmt(p.remaining_balance)} ₫</td>
                          <td className="px-3.5 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                              background: p.status === 'PAID' ? 'rgba(52,211,153,0.15)' : p.status === 'OVERDUE' ? 'rgba(248,113,113,0.15)' : 'var(--bg-hover)',
                              color: p.status === 'PAID' ? 'var(--status-green)' : p.status === 'OVERDUE' ? 'var(--status-red)' : 'var(--text-muted)',
                            }}>
                              {p.status === 'PAID' ? '✓ Đã trả' : p.status === 'OVERDUE' ? '⚠ Quá hạn' : '⏳ Chưa trả'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => handleOpenEditPeriod(p)}
                                className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/15 transition"
                                title="Sửa chi tiết kỳ này (tiền lãi thực tế, gốc, ngày đến hạn...)"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleSchedulePayment(p)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition hover:opacity-80"
                                style={p.status === 'PAID'
                                  ? { background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }
                                  : { background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)', border: '1px solid rgba(52,211,153,0.3)' }}
                              >
                                {p.status === 'PAID' ? '↺ Chưa trả' : '✓ Đã trả'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Add / Edit Loan Modal ─── */}
      {openAddLoanModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenAddLoanModal(false)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>{editingLoan ? '✏️ Chỉnh sửa thông tin khoản vay' : '🏦 Thêm khoản vay mua xe mới'}</span>
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Nhập thông tin hợp đồng tín dụng, lãi suất và lịch trả nợ định kỳ</p>
              </div>
              <button onClick={() => setOpenAddLoanModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              {/* Section 1: Thông tin chung */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">1. Thông tin Hợp đồng &amp; Phương tiện</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện vay *</label>
                    <select className="theme-select font-semibold" value={loanForm.asset_id} onChange={e => setLoanForm(p => ({ ...p, asset_id: e.target.value }))}>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.brand})</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngân hàng / Đơn vị cho vay *</label>
                    <input type="text" className="theme-input" placeholder="VD: Techcombank, VPBank..." value={loanForm.lender} onChange={e => setLoanForm(p => ({ ...p, lender: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ghi chú / Tên hợp đồng</label>
                    <input type="text" className="theme-input" placeholder="VD: Vay mua xe trả góp 4 năm" value={loanForm.notes} onChange={e => setLoanForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section 2: Gốc vay & Lãi suất */}
              <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-cyan-400">2. Số tiền vay &amp; Lãi suất trả góp</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Gốc vay (₫) *</label>
                    <input type="number" className="theme-input font-mono font-bold text-cyan-400" placeholder="400000000" value={loanForm.principal} onChange={e => setLoanForm(p => ({ ...p, principal: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Trả trước (₫)</label>
                    <input type="number" className="theme-input font-mono" placeholder="100000000" value={loanForm.down_payment} onChange={e => setLoanForm(p => ({ ...p, down_payment: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Lãi suất (%/năm) *</label>
                    <input type="number" step="0.1" className="theme-input font-mono" placeholder="8.5" value={loanForm.interest_rate_percent} onChange={e => setLoanForm(p => ({ ...p, interest_rate_percent: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Kỳ hạn (tháng) *</label>
                    <input type="number" className="theme-input font-mono" placeholder="36" value={loanForm.term_months} onChange={e => setLoanForm(p => ({ ...p, term_months: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày bắt đầu vay *</label>
                    <input type="date" className="theme-input" value={loanForm.start_date} onChange={e => setLoanForm(p => ({ ...p, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Hạn đóng định kỳ (Ngày)</label>
                    <input type="number" min="1" max="31" className="theme-input font-mono" placeholder="15" value={loanForm.payment_day} onChange={e => setLoanForm(p => ({ ...p, payment_day: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số tiền trả hàng tháng (₫)</label>
                    <input
                      type="number"
                      className="theme-input font-mono font-bold text-emerald-400"
                      placeholder={calculatedMonthly > 0 ? String(calculatedMonthly) : 'Tự động tính'}
                      value={loanForm.monthly_payment}
                      onChange={e => setLoanForm(p => ({ ...p, monthly_payment: e.target.value }))}
                    />
                    {calculatedMonthly > 0 && !loanForm.monthly_payment && (
                      <p className="text-[10px] mt-0.5 text-cyan-400 font-semibold">Gợi ý EMI: {fmt(calculatedMonthly)} ₫/tháng</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Cán bộ tín dụng */}
              <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <h4 className="font-bold text-xs uppercase tracking-wider text-purple-400">3. Liên hệ Cán bộ tín dụng &amp; Tổng đài Ngân hàng</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" placeholder="Tên cán bộ tín dụng (VD: Anh Tuấn TPBank)..." className="theme-input text-xs" value={loanForm.bank_contact_name} onChange={e => setLoanForm(p => ({ ...p, bank_contact_name: e.target.value }))} />
                  <input type="tel" placeholder="SĐT cán bộ tín dụng..." className="theme-input text-xs font-mono font-bold" value={loanForm.bank_contact_phone} onChange={e => setLoanForm(p => ({ ...p, bank_contact_phone: e.target.value }))} />
                  <input type="tel" placeholder="Hotline/Tổng đài ngân hàng..." className="theme-input text-xs font-mono" value={loanForm.bank_hotline} onChange={e => setLoanForm(p => ({ ...p, bank_hotline: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={handleSaveLoan} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                {editingLoan ? 'Cập nhật khoản vay' : 'Lưu khoản vay mới'}
              </button>
              <button onClick={() => setOpenAddLoanModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ─── Add/Edit Expense Modal ─── */}
      {openModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenModal(false)}>

          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">

            <div className="relative rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{editId ? 'Sửa chi phí' : 'Thêm chi phí phát sinh'}</h3>
              <button onClick={() => setOpenModal(false)} className="p-1 rounded-lg hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Phương tiện *</label>
                <select className="theme-select" value={form.asset_id} onChange={e => setForm(p => ({ ...p, asset_id: e.target.value }))}>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày thực hiện *</label>
                <input type="date" className="theme-input" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Danh mục chính (Category) *</label>
                <select
                  className="theme-select font-semibold"
                  value={form.category}
                  onChange={e => {
                    const newCat = e.target.value;
                    const firstSub = Object.keys(taxMap[newCat]?.subcategories || {})[0] || 'Fuel';
                    setForm(p => ({ ...p, category: newCat, subcategory: firstSub }));
                  }}
                >
                  {Object.entries(taxMap).map(([catKey, catVal]) => (
                    <option key={catKey} value={catKey}>{catVal.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Danh mục con (SubCategory) *</label>
                <select
                  className="theme-select"
                  value={form.subcategory}
                  onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))}
                >
                  {Object.entries(taxMap[form.category]?.subcategories || { Other: 'Khác' }).map(([subKey, subLabel]) => (
                    <option key={subKey} value={subKey}>{subLabel} ({subKey})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số tiền (₫) *</label>
                <input type="number" className="theme-input font-mono font-bold" placeholder="500000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Nhà cung cấp / Đơn vị</label>
                <input type="text" className="theme-input" placeholder="VD: Showroom, Zestech, TPBank..." value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Mô tả ngắn gọn</label>
                <input type="text" className="theme-input" placeholder="Nội dung mô tả chi phí" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={saveExpense} className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}>Lưu chi phí</button>
              <button onClick={() => setOpenModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ─── Record Payment Modal ─── */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setShowPaymentModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">
            <div className="relative rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Ghi nhận thanh toán khoản vay</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
                <p style={{ color: 'var(--accent-cyan)' }}>Thanh toán chuẩn: <strong>{fmt(selectedLoan.monthly_payment)} ₫</strong></p>
                <p style={{ color: 'var(--text-muted)' }} className="mt-0.5">Hạn đóng: Ngày {selectedLoan.payment_day}/tháng</p>
              </div>
              {[
                { label: 'Số tiền thanh toán (₫)', el: <input type="number" className="theme-input" placeholder={String(selectedLoan.monthly_payment)} value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} /> },
                { label: 'Ngày thanh toán', el: <input type="date" className="theme-input" value={paymentForm.paid_date} onChange={e => setPaymentForm(p => ({ ...p, paid_date: e.target.value }))} /> },
                { label: 'Ghi chú', el: <input type="text" className="theme-input" placeholder="VD: Chuyển khoản ngân hàng..." value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} /> },
              ].map(({ label, el }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{label}</label>
                  {el}
                </div>
              ))}
            </div>
            <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
              <button onClick={confirmPayment}
                className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />Xác nhận
              </button>
              <button onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>Hủy</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ─── Edit Single Period Payment Modal ─── */}
      {openEditPeriodModal && editingPeriod && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpenEditPeriodModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6 pt-20">
            <div
              className="relative rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden"
              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)', maxHeight: 'min(85vh, 620px)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <span>✏️ Chỉnh Sửa Kỳ Trả Góp #{periodForm.payment_number}</span>
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Cập nhật số tiền gốc, lãi thực tế theo thông báo ngân hàng</p>
                </div>
                <button onClick={() => setOpenEditPeriodModal(false)} className="p-1.5 rounded-xl hover:bg-white/10 transition" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl text-xs space-y-1" style={{ background: 'var(--accent-cyan-bg)', border: '1px solid var(--accent-cyan-border)' }}>
                  <p className="font-bold text-cyan-400">ℹ️ Lưu ý ngân hàng tính theo ngày làm việc thực tế</p>
                  <p style={{ color: 'var(--text-secondary)' }}>Số tiền lãi và hạn đóng từng tháng có thể lệch nhẹ so với dự kiến. Bạn hãy nhập chính xác số tiền theo sao kê ngân hàng.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Hạn thanh toán *</label>
                    <input
                      type="date"
                      className="theme-input font-mono"
                      value={periodForm.due_date}
                      onChange={e => setPeriodForm(p => ({ ...p, due_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Trạng thái thanh toán *</label>
                    <select
                      className="theme-select font-bold"
                      value={periodForm.status}
                      onChange={e => setPeriodForm(p => ({ ...p, status: e.target.value as any }))}
                    >
                      <option value="PENDING">⏳ Chưa thanh toán (Pending)</option>
                      <option value="PAID">✓ Đã thanh toán (Paid)</option>
                      <option value="OVERDUE">⚠ Quá hạn (Overdue)</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400">Chi tiết số tiền kỳ này</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tiền gốc thực tế (₫) *</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-emerald-400"
                        value={periodForm.principal_paid}
                        onChange={e => {
                          const val = e.target.value;
                          setPeriodForm(p => {
                            const newP = parseFloat(val) || 0;
                            const intr = parseFloat(p.interest_paid) || 0;
                            return { ...p, principal_paid: val, total_payment: String(newP + intr) };
                          });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tiền lãi thực tế (₫) *</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-amber-400"
                        value={periodForm.interest_paid}
                        onChange={e => {
                          const val = e.target.value;
                          setPeriodForm(p => {
                            const newI = parseFloat(val) || 0;
                            const princ = parseFloat(p.principal_paid) || 0;
                            return { ...p, interest_paid: val, total_payment: String(princ + newI) };
                          });
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Tổng tiền thanh toán kỳ này (₫)</label>
                      <input
                        type="number"
                        className="theme-input font-mono font-bold text-cyan-400"
                        value={periodForm.total_payment}
                        onChange={e => setPeriodForm(p => ({ ...p, total_payment: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {periodForm.status === 'PAID' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Ngày thanh toán thực tế</label>
                    <input
                      type="date"
                      className="theme-input font-mono"
                      value={periodForm.paid_date}
                      onChange={e => setPeriodForm(p => ({ ...p, paid_date: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="p-4 shrink-0 border-t flex space-x-2 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
                <button
                  onClick={handleSavePeriod}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs hover:opacity-90 shadow-md transition"
                  style={{ background: 'linear-gradient(135deg, #0EA5E9, #3B82F6)' }}
                >
                  Lưu kỳ thanh toán
                </button>
                <button
                  onClick={() => setOpenEditPeriodModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-white/10 transition"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
