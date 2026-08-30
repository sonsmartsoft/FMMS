'use client';

import React, { useState, useMemo, useEffect } from 'react';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

import { getAssets } from '@/lib/services/assetService';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import { getLoans, getLoanPayments, createLoan, createLoanPayment, updateLoan, LoanRow, LoanPaymentRow, cleanupDuplicateLoanExpenses } from '@/lib/services/loanService';

import { ExpenseRecord, TAXONOMY, getDynamicTaxonomy } from '@/types/mobility';
import { VehicleFinanceOverview } from '@/components/assets/VehicleFinanceOverview';
import { useTheme } from '@/lib/theme/ThemeContext';
import { DollarSign, CreditCard, Plus, X, TrendingDown, CheckCircle2, Clock, AlertTriangle, Edit2, Trash2, Pencil, BarChart3, PieChart as PieIcon } from 'lucide-react';
import DraggableModal from '@/components/ui/DraggableModal';


const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN');

const CAT_LABELS: Record<string, string> = {
  FUEL: 'Nhiên liệu & Pin', MAINTENANCE: 'Bảo dưỡng & Phụ tùng', INSURANCE: 'Bảo hiểm',
  REGISTRATION: 'Đăng ký/Lăn bánh', PARKING: 'Đỗ xe', TOLL: 'Cầu đường',
  PARTS: 'Phụ tùng', LABOR: 'Nhân công', INSPECTION: 'Đăng kiểm',
  LOAN: 'Khoản vay mua xe', LOAN_PAYMENT: 'Trả gốc vay', LOAN_INTEREST: 'Trả lãi vay',
  INITIAL: 'Chi phí mua xe & lăn bánh', UPGRADE: 'Nâng cấp & Đồ chơi', CAR_WASH: 'Rửa xe', OTHER: 'Khác',
};

const getCategoryColor = (catName?: string): string => {
  if (!catName) return '#64748B';
  const c = catName.toUpperCase();
  if (c === 'INITIAL' || c.includes('MUA') || c.includes('LĂN BÁNH') || c.includes('PURCHASE')) return '#3B82F6'; // Royal Blue
  if (c === 'FUEL' || c.includes('XĂNG') || c.includes('PIN') || c.includes('NHIÊN LIỆU') || c.includes('RUNNING')) return '#F59E0B'; // Amber
  if (c === 'MAINTENANCE' || c.includes('BẢO DƯỠNG') || c === 'PARTS' || c === 'LABOR') return '#06B6D4'; // Cyan
  if (c === 'UPGRADE' || c.includes('NÂNG CẤP') || c.includes('ĐỒ CHƠI') || c === 'ACCESSORIES') return '#8B5CF6'; // Purple
  if (c === 'INSURANCE' || c.includes('BẢO HIỂM') || c === 'REGISTRATION' || c === 'INSPECTION') return '#10B981'; // Emerald
  if (c === 'LOAN' || c === 'LOAN_PAYMENT' || c === 'LOAN_INTEREST' || c.includes('VAY') || c.includes('TRẢ GÓP')) return '#EC4899'; // Pink
  if (c === 'TOLL' || c === 'PARKING' || c === 'CAR_WASH' || c.includes('RỬA') || c.includes('ĐỖ')) return '#F97316'; // Orange
  return '#64748B';
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? '#0F172A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#334155' : '#E2E8F0';
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A';

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
    amount: '', discount: '', vendor: '', odometer_km: '', description: '',
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
    (async () => {
      await cleanupDuplicateLoanExpenses();
      await loadData();
    })();
  }, []);


  useEffect(() => {
    if (selectedLoanId) {
      getLoanPayments(selectedLoanId).then(setPayments).catch(() => {});
    }
  }, [selectedLoanId]);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expenseSortCol, setExpenseSortCol] = useState<string>('date');
  const [expenseSortDir, setExpenseSortDir] = useState<'asc' | 'desc'>('desc');
  const [loanSortCol, setLoanSortCol] = useState<string>('payment_number');
  const [loanSortDir, setLoanSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (selectedAssetId) {
      list = list.filter(e => isSameAsset(e.asset_id, selectedAssetId));
    }
    if (startDate) {
      list = list.filter(e => e.date && e.date.slice(0, 10) >= startDate);
    }
    if (endDate) {
      list = list.filter(e => e.date && e.date.slice(0, 10) <= endDate);
    }

    return [...list].sort((a, b) => {
      let valA: any = a[expenseSortCol as keyof ExpenseRecord] ?? '';
      let valB: any = b[expenseSortCol as keyof ExpenseRecord] ?? '';
      if (expenseSortCol === 'asset_id') {
        valA = assets.find(x => x.id === a.asset_id)?.name || '';
        valB = assets.find(x => x.id === b.asset_id)?.name || '';
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return expenseSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return expenseSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [expenses, selectedAssetId, startDate, endDate, expenseSortCol, expenseSortDir, assets]);

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

  const loanSchedule = useMemo(() => {
    const sched = selectedLoan ? generateLoanSchedule(selectedLoan, payments) : [];
    return [...sched].sort((a: any, b: any) => {
      const valA = a[loanSortCol] ?? '';
      const valB = b[loanSortCol] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return loanSortDir === 'asc' ? valA - valB : valB - valA;
      }
      return loanSortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'vi')
        : String(valB).localeCompare(String(valA), 'vi');
    });
  }, [selectedLoan, payments, loanSortCol, loanSortDir]);

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
      const label = taxMap[cat]?.label ? taxMap[cat].label.replace(/^[^\s]+\s+/, '') : (CAT_LABELS[cat.toUpperCase()] || cat);
      const color = getCategoryColor(cat) || getCategoryColor(e.category);
      const prev = map.get(cat) || { label, total: 0, color };

      prev.total += e.amount;
      map.set(cat, prev);
    });
    return Array.from(map.entries())
      .map(([k, v]) => ({ category: k, label: v.label, total: v.total, color: v.color }))
      .filter(b => b.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, taxMap]);

  const monthlyExpensesData = useMemo(() => {
    const map = new Map<string, any>();
    filteredExpenses.forEach(e => {
      const d = e.date || '';
      if (!d) return;
      const mKey = d.slice(0, 7);
      const cat = (e.category || 'Other').toUpperCase();
      const prev = map.get(mKey) || {
        monthKey: mKey,
        label: `T${parseInt(mKey.slice(5))}/${mKey.slice(2, 4)}`,
        fuel: 0,
        maint: 0,
        upgrade: 0,
        ins: 0,
        loan: 0,
        other: 0,
        total: 0,
      };
      const amt = e.amount || 0;
      if (cat === 'FUEL' || cat === 'RUNNING') prev.fuel += amt;
      else if (cat === 'MAINTENANCE' || cat === 'PARTS' || cat === 'LABOR') prev.maint += amt;
      else if (cat === 'UPGRADE') prev.upgrade += amt;
      else if (cat === 'INSURANCE' || cat === 'INITIAL' || cat === 'REGISTRATION') prev.ins += amt;
      else if (cat === 'LOAN' || cat === 'LOAN_PAYMENT' || cat === 'LOAN_INTEREST') prev.loan += amt;
      else prev.other += amt;
      prev.total += amt;
      map.set(mKey, prev);
    });
    return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [filteredExpenses]);

  const expensePieData = useMemo(() => {
    return breakdown.map(b => ({
      name: b.label,
      value: b.total,
      color: b.color,
    }));
  }, [breakdown]);


  const openEdit = (e: ExpenseRecord) => {
    setEditId(e.id);
    const norm = normalizeCategory(e.category, e.subcategory);
    setForm({
      asset_id: e.asset_id,
      date: e.date ? e.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      category: norm.category,
      subcategory: norm.subcategory,
      amount: String(e.amount),
      discount: '',
      vendor: e.vendor || '',
      odometer_km: e.odometer_km ? String(e.odometer_km) : '',
      description: e.description || '',
    });
    setOpenModal(true);
  };

  const saveExpense = async () => {
    const subtotal = parseFloat(form.amount) || 0;
    const discount = parseFloat(form.discount) || 0;
    const finalAmount = Math.max(0, subtotal - discount);
    const fullDesc = discount > 0 ? `${form.description || ''} [Giảm giá: -${fmt(discount)}₫]`.trim() : (form.description || undefined);

    const payload = {
      asset_id: form.asset_id || assets[0]?.id,
      date: form.date || new Date().toISOString().slice(0, 10),
      category: form.category,
      subcategory: form.subcategory || undefined,
      amount: finalAmount,
      currency: 'VND',
      vendor: form.vendor || undefined,
      odometer_km: form.odometer_km ? parseFloat(form.odometer_km) : undefined,
      description: fullDesc,
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
          } catch (loanSyncErr) {
            console.warn('Auto loan payment sync warning:', loanSyncErr);
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
    setForm({ asset_id: assets[0]?.id || '', date: '', category: 'Running', subcategory: 'Fuel', amount: '', discount: '', vendor: '', odometer_km: '', description: '' });
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
    if (!confirm('Bạn có chắc chắn muốn xóa khoản vay này? Toàn bộ các kỳ trả nợ và chi phí liên quan đến khoản vay sẽ được dọn dẹp sạch sẽ.')) return;
    try {
      const { deleteLoanWithCascade } = await import('@/lib/services/loanService');
      await deleteLoanWithCascade(loanId);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi xóa khoản vay: ${err?.message ?? 'Không xóa được'}`);
    }
  };

  const confirmPayment = async () => {
    if (!selectedLoan) return;
    const next = loanSchedule.find(p => p.status !== 'PAID');
    const amount = parseFloat(paymentForm.amount) || selectedLoan.monthly_payment;
    const princ = next?.principal_paid ?? Math.round(amount);
    const intr = next?.interest_paid ?? 0;
    const paidDate = paymentForm.paid_date || new Date().toISOString().slice(0, 10);
    const periodNum = next?.payment_number ?? (loanSchedule.length + 1);

    try {
      const { createLoanPayment, updateLoan, syncLoanPaymentExpense, getLoanPayments } = await import('@/lib/services/loanService');
      await createLoanPayment({
        loan_id: selectedLoan.id,
        payment_number: periodNum,
        due_date: next?.due_date ?? paidDate,
        principal_paid: princ,
        interest_paid: intr,
        total_payment: amount,
        paid_date: paidDate,
        status: 'PAID',
        remaining_balance: Math.max(0, selectedLoan.current_balance - princ),
      });

      // Synchronize exact expense records (idempotent, no duplicates)
      await syncLoanPaymentExpense({
        loan: selectedLoan,
        paymentNumber: periodNum,
        status: 'PAID',
        principalPaid: princ,
        interestPaid: intr,
        paidDate,
      });

      // Recalculate remaining loan balance
      const updatedPayments = await getLoanPayments(selectedLoan.id);
      const totalPaidPrincipal = updatedPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.principal_paid || 0), 0);
      await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.principal - totalPaidPrincipal) });

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
    const paidDate = periodForm.status === 'PAID' ? (periodForm.paid_date || new Date().toISOString().slice(0, 10)) : '';

    try {
      const { createLoanPayment, updateLoanPayment, updateLoan, syncLoanPaymentExpense, getLoanPayments } = await import('@/lib/services/loanService');
      const existing = payments.find(pm => pm.payment_number === editingPeriod.payment_number);
      if (existing) {
        await updateLoanPayment(existing.id, {
          due_date: periodForm.due_date,
          principal_paid: princ,
          interest_paid: intr,
          total_payment: tot,
          paid_date: periodForm.status === 'PAID' ? paidDate : undefined,
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
          paid_date: periodForm.status === 'PAID' ? paidDate : undefined,
          status: periodForm.status,
          remaining_balance: editingPeriod.remaining_balance || 0,
        });
      }

      // Synchronize exact expense records (idempotent, deletes if unpaid, updates amounts accurately)
      await syncLoanPaymentExpense({
        loan: selectedLoan,
        paymentNumber: editingPeriod.payment_number,
        status: periodForm.status,
        principalPaid: princ,
        interestPaid: intr,
        paidDate: paidDate || new Date().toISOString().slice(0, 10),
      });

      // Recalculate remaining loan balance
      const updatedPayments = await getLoanPayments(selectedLoan.id);
      const totalPaidPrincipal = updatedPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.principal_paid || 0), 0);
      await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.principal - totalPaidPrincipal) });

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
      const { createLoanPayment, updateLoanPayment, updateLoan, syncLoanPaymentExpense, getLoanPayments } = await import('@/lib/services/loanService');
      const periodNum = item.payment_number;
      const princ = item.principal_paid || 0;
      const intr = item.interest_paid || 0;

      if (item.status === 'PAID') {
        // Chuyển từ ĐÃ TRẢ -> CHƯA TRẢ (PENDING)
        const match = payments.find(p => p.payment_number === periodNum);
        if (match) {
          await updateLoanPayment(match.id, { status: 'PENDING', paid_date: undefined });
        }
        // Dọn sạch chi phí của kỳ này trong bảng expenses
        await syncLoanPaymentExpense({
          loan: selectedLoan,
          paymentNumber: periodNum,
          status: 'PENDING',
          principalPaid: 0,
          interestPaid: 0,
          paidDate: '',
        });
      } else {
        // Chuyển từ CHƯA TRẢ -> ĐÃ TRẢ (PAID)
        const paidDateStr = new Date().toISOString().slice(0, 10);
        const match = payments.find(p => p.payment_number === periodNum);
        if (match) {
          await updateLoanPayment(match.id, {
            status: 'PAID',
            paid_date: paidDateStr,
            principal_paid: princ,
            interest_paid: intr,
            total_payment: item.total_payment,
          });
        } else {
          await createLoanPayment({
            loan_id: selectedLoan.id,
            payment_number: periodNum,
            due_date: item.due_date,
            principal_paid: princ,
            interest_paid: intr,
            total_payment: item.total_payment,
            paid_date: paidDateStr,
            status: 'PAID',
            remaining_balance: Math.max(0, selectedLoan.current_balance - princ),
          });
        }
        // Đồng bộ chi phí: tạo hoặc cập nhật đúng 1 bản ghi gốc và 1 bản ghi lãi
        await syncLoanPaymentExpense({
          loan: selectedLoan,
          paymentNumber: periodNum,
          status: 'PAID',
          principalPaid: princ,
          interestPaid: intr,
          paidDate: paidDateStr,
        });
      }

      // Recalculate remaining loan balance
      const updatedPayments = await getLoanPayments(selectedLoan.id);
      const totalPaidPrincipal = updatedPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.principal_paid || 0), 0);
      await updateLoan(selectedLoan.id, { current_balance: Math.max(0, selectedLoan.principal - totalPaidPrincipal) });

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
          {/* 📅 Date Range Filter Toolbar */}
          <div className="p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
                <span>📅 Lọc thời gian:</span>
              </span>
              <div className="flex items-center space-x-1">
                {[
                  { label: 'Tất cả', start: '', end: '' },
                  { label: 'Hôm nay', start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
                  {
                    label: 'Tháng này',
                    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
                    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
                  },
                  {
                    label: 'Tháng trước',
                    start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 10),
                    end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().slice(0, 10),
                  },
                  {
                    label: 'Năm nay',
                    start: `${new Date().getFullYear()}-01-01`,
                    end: `${new Date().getFullYear()}-12-31`,
                  },
                ].map(preset => {
                  const isActive = startDate === preset.start && endDate === preset.end;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => { setStartDate(preset.start); setEndDate(preset.end); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        isActive ? 'bg-cyan-500 text-white shadow-sm' : 'hover:bg-white/10'
                      }`}
                      style={!isActive ? { background: 'var(--bg-primary)', color: 'var(--text-secondary)' } : {}}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="theme-input text-[11px] py-1 px-2 font-mono"
                  style={{ width: '130px' }}
                />
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="theme-input text-[11px] py-1 px-2 font-mono"
                  style={{ width: '130px' }}
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[10px] font-bold text-rose-400 hover:underline px-1.5 py-1"
                >
                  ✕ Xóa lọc
                </button>
              )}
            </div>
          </div>

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

          {/* 📊 Biểu Đồ Chi Phí Theo Tháng & Cơ Cấu Danh Mục */}
          {filteredExpenses.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Stacked Bar Chart */}
              <div className="lg:col-span-2 p-5 rounded-2xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        Biến Động Chi Phí Theo Tháng
                      </h3>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Phân bổ theo các nhóm chi phí chính qua từng tháng
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">Đơn vị: Triệu ₫ (M)</span>
                </div>

                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyExpensesData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="finFuel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.75}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.08}/>
                        </linearGradient>
                        <linearGradient id="finMaint" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.75}/>
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.08}/>
                        </linearGradient>
                        <linearGradient id="finUpgrade" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.75}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.08}/>
                        </linearGradient>
                        <linearGradient id="finIns" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.75}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0.08}/>
                        </linearGradient>
                        <linearGradient id="finLoan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EC4899" stopOpacity={0.75}/>
                          <stop offset="95%" stopColor="#EC4899" stopOpacity={0.08}/>
                        </linearGradient>
                        <linearGradient id="finOther" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#64748B" stopOpacity={0.75}/>
                          <stop offset="95%" stopColor="#64748B" stopOpacity={0.08}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis dataKey="label" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} />
                      <YAxis tickFormatter={v => v > 0 ? `${(v / 1_000_000).toFixed(1)}M` : '0'} tick={{ fill: axisColor, fontSize: 10 }} axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }} tickLine={false} width={45} />
                      <ReTooltip
                        formatter={(v: number, name: string) => [`${fmt(v)} ₫`, name]}
                        contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      />
                      <Legend formatter={v => <span className="text-slate-700 dark:text-slate-200 text-xs font-semibold">{v}</span>} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                      <Area type="monotone" dataKey="fuel" stackId="exp" name="Nhiên liệu" stroke="#F59E0B" fill="url(#finFuel)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="maint" stackId="exp" name="Bảo dưỡng" stroke="#06B6D4" fill="url(#finMaint)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="upgrade" stackId="exp" name="Nâng cấp" stroke="#8B5CF6" fill="url(#finUpgrade)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="ins" stackId="exp" name="Bảo hiểm/Giấy tờ" stroke="#10B981" fill="url(#finIns)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="loan" stackId="exp" name="Khoản vay" stroke="#EC4899" fill="url(#finLoan)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="other" stackId="exp" name="Khác" stroke="#64748B" fill="url(#finOther)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>


              {/* Donut Chart - Overlap-free design with center stat and clean category list */}
              <div className="p-5 rounded-2xl space-y-3 flex flex-col justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <PieIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
                        Tỷ Trọng Danh Mục
                      </h3>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        Cơ cấu chi tiêu ({breakdown.length} nhóm)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-amber-500 dark:text-amber-400">
                    {(totalExpenses / 1_000_000).toFixed(1)}M ₫
                  </span>
                </div>

                {/* Donut chart with centered summary stat */}
                <div className="relative" style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={3} dataKey="value" nameKey="name" stroke="none">
                        {expensePieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip formatter={(v: number, name: string) => [`${fmt(v)} ₫`, name]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 12, fontSize: 11, color: tooltipText, boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Tổng</span>
                    <span className="text-xs font-black font-mono text-slate-900 dark:text-white">{(totalExpenses / 1_000_000).toFixed(1)}M</span>
                  </div>
                </div>


                {/* Clean, Non-overlapping Scrollable Category Legend List */}
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {breakdown.map((b) => {
                    const pct = totalExpenses > 0 ? ((b.total / totalExpenses) * 100).toFixed(1) : '0';
                    return (
                      <div key={b.category} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl transition hover:bg-white/5" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                          <span className="truncate text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{b.label}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 font-mono">
                          <span className="text-[10px] text-zinc-400">{pct}%</span>
                          <strong className="text-[11px]" style={{ color: b.color }}>{(b.total / 1_000_000).toFixed(1)}M</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}



          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-default)' }}>

            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-default)' }}>
                  {[
                    { key: 'date', label: 'Ngày' },
                    { key: 'asset_id', label: 'Phương tiện' },
                    { key: 'category', label: 'Danh mục' },
                    { key: 'description', label: 'Mô tả' },
                    { key: 'vendor', label: 'Nhà cung cấp' },
                    { key: 'amount', label: 'Số tiền' },
                  ].map(col => {
                    const isSorted = expenseSortCol === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (expenseSortCol === col.key) {
                            setExpenseSortDir(p => p === 'asc' ? 'desc' : 'asc');
                          } else {
                            setExpenseSortCol(col.key);
                            setExpenseSortDir('asc');
                          }
                        }}
                        className="text-left px-4 py-3 font-semibold uppercase text-[10px] tracking-wide cursor-pointer select-none hover:text-cyan-400 transition"
                        style={{ color: isSorted ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
                      >
                        <div className="flex items-center space-x-1">
                          <span>{col.label}</span>
                          <span className="text-[9px]">{isSorted ? (expenseSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((e, i) => (
                  <tr key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-hover)' }}>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{assets.find(a => a.id === e.asset_id)?.name?.split(' ')[0] || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: `${getCategoryColor(e.category)}22`, color: getCategoryColor(e.category) }}>
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

              {/* 📊 THANH TIẾN ĐỘ TRẢ NỢ VÀ DƯ NỢ TỔNG HỢP */}
              {(() => {
                const princ = selectedLoan.principal || 0;
                const bal = selectedLoan.current_balance || 0;
                const paidP = Math.max(0, princ - bal);
                const progressPct = princ > 0 ? Math.min(100, Math.max(0, (paidP / princ) * 100)).toFixed(1) : '0';
                const totalPaidInterest = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + (p.interest_paid || 0), 0);
                const paidPeriodsCount = loanSchedule.filter(p => p.status === 'PAID').length;
                const nextPendingPeriod = loanSchedule.find(p => p.status !== 'PAID');

                return (
                  <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm" style={{ color: 'var(--text-primary)' }}>
                            Tiến Độ Trả Nợ &amp; Dư Nợ Khoản Vay ({selectedLoan.lender})
                          </h4>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            Hạn thanh toán ngày {selectedLoan.payment_day || 15} hàng tháng • Lãi suất: {selectedLoan.interest_rate_percent}%/năm
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Đã trả {progressPct}% gốc
                        </span>
                        <span className="text-xs font-bold px-3 py-1 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-mono">
                          {paidPeriodsCount}/{selectedLoan.term_months} kỳ
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Visual */}
                    <div className="space-y-1.5">
                      <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200 dark:border-slate-700/60 shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-500 flex items-center justify-center text-[9px] font-black text-white shadow-sm"
                          style={{
                            width: `${progressPct}%`,
                            background: 'linear-gradient(90deg, #10B981, #059669)',
                          }}
                        >
                          {Number(progressPct) > 12 ? `${progressPct}%` : ''}
                        </div>
                        <div
                          className="h-full rounded-full transition-all duration-500 opacity-80 ml-0.5"
                          style={{
                            width: `${100 - Number(progressPct)}%`,
                            background: isDark ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #FDBA74, #FB923C)',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] px-1 font-semibold">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Đã trả gốc: <strong>{fmt(paidP)} ₫</strong>
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Dư nợ gốc còn: <strong>{fmt(bal)} ₫</strong>
                        </span>
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Gốc vay ban đầu:</span>
                        <p className="font-extrabold text-sm mt-0.5 font-mono text-slate-900 dark:text-slate-100">{fmt(princ)} ₫</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Tổng gốc đã trả:</span>
                        <p className="font-extrabold text-sm mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">{fmt(paidP)} ₫</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Tổng tiền lãi đã đóng:</span>
                        <p className="font-extrabold text-sm mt-0.5 font-mono text-rose-600 dark:text-rose-400">{fmt(totalPaidInterest)} ₫</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Kỳ thanh toán tiếp theo:</span>
                        <p className="font-extrabold text-xs mt-1 text-cyan-600 dark:text-cyan-400 truncate">
                          {nextPendingPeriod ? `Kỳ ${nextPendingPeriod.payment_number} (${fmtDate(nextPendingPeriod.due_date)})` : 'Đã hoàn tất 🎉'}
                        </p>
                      </div>
                    </div>
                  </div>
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
                        {[
                          { key: 'payment_number', label: 'Kỳ #' },
                          { key: 'due_date', label: 'Hạn đóng' },
                          { key: 'principal_paid', label: 'Tiền gốc (₫)' },
                          { key: 'interest_paid', label: 'Tiền lãi (₫)' },
                          { key: 'total_payment', label: 'Tổng trả (₫)' },
                          { key: 'remaining_balance', label: 'Dư nợ còn lại (₫)' },
                          { key: 'status', label: 'Trạng thái' },
                        ].map(col => {
                          const isSorted = loanSortCol === col.key;
                          return (
                            <th
                              key={col.key}
                              onClick={() => {
                                if (loanSortCol === col.key) {
                                  setLoanSortDir(p => p === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setLoanSortCol(col.key);
                                  setLoanSortDir('asc');
                                }
                              }}
                              className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-emerald-400 transition"
                              style={{ color: isSorted ? 'var(--status-green)' : 'var(--text-muted)' }}
                            >
                              <div className="flex items-center space-x-1">
                                <span>{col.label}</span>
                                <span className="text-[9px]">{isSorted ? (loanSortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                          );
                        })}
                        <th className="text-left px-3.5 py-2.5 font-semibold uppercase text-[10px] tracking-wide whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Thao tác</th>
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
        <DraggableModal isOpen={true} onClose={() => setOpenAddLoanModal(false)}>
<div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
</DraggableModal>

      )}

      {/* ─── Add/Edit Expense Modal ─── */}
      {openModal && (
        <DraggableModal isOpen={true} onClose={() => setOpenModal(false)}>
<div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số tiền gốc (₫) *</label>
                  <input type="number" className="theme-input font-mono font-bold" placeholder="500000" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase text-amber-400">🎁 Giảm giá / Voucher (₫)</label>
                  <input type="number" className="theme-input font-mono font-bold text-amber-400" placeholder="0" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} />
                </div>
              </div>

              {parseFloat(form.discount) > 0 && (
                <div className="p-2.5 rounded-xl text-xs flex justify-between items-center font-bold" style={{ background: 'var(--bg-hover)', border: '1px dashed var(--border-default)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thực chi sau giảm giá:</span>
                  <span className="font-mono text-emerald-400 text-sm">
                    {fmt(Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.discount) || 0)))} ₫
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Số Odometer (KM hiện tại)</label>
                  <input
                    type="number"
                    className="theme-input font-mono"
                    placeholder={String(assets.find(a => a.id === form.asset_id)?.current_odometer_km || 0)}
                    value={form.odometer_km}
                    onChange={e => setForm(p => ({ ...p, odometer_km: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Nhà cung cấp / Cây xăng / Đơn vị</label>
                  <input type="text" className="theme-input" placeholder="VD: Cây xăng Thaco, Garage..." value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} />
                </div>
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
</DraggableModal>

      )}

      {/* ─── Record Payment Modal ─── */}
      {showPaymentModal && selectedLoan && (
        <DraggableModal isOpen={true} onClose={() => setShowPaymentModal(false)}>
<div className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }} onClick={e => e.stopPropagation()}>
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
</DraggableModal>

      )}

      {/* ─── Edit Single Period Payment Modal ─── */}
      {openEditPeriodModal && editingPeriod && (
        <DraggableModal isOpen={true} onClose={() => setOpenEditPeriodModal(false)}>
<div
              className="cursor-grab active:cursor-grabbing relative rounded-2xl w-[90vw] sm:w-[600px] max-w-lg flex flex-col shadow-2xl overflow-hidden"
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
</DraggableModal>

      )}
    </div>
  );
}
