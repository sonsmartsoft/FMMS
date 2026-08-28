'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Asset, LoanRecord, ExpenseRecord } from '@/types/mobility';
import { getLoanPayments, createLoanPayment, updateLoanPayment, updateLoan, createLoan, updateLoanFull, deleteLoan } from '@/lib/services/loanService';
import { updateAsset } from '@/lib/services/assetService';
import { createExpense, updateExpense, deleteExpense } from '@/lib/services/expenseService';
import {
  DollarSign, TrendingUp, TrendingDown, Wrench, Fuel, ShieldCheck,
  CreditCard, Landmark, PieChart, Plus, X, Edit2, Trash2, CheckCircle2, AlertCircle, ChevronRight, Sliders
} from 'lucide-react';

interface PartItem {
  id?: string;
  name: string;
  category?: string;
  cost: number;
  install_date?: string;
  notes?: string;
}

interface VehicleFinanceOverviewProps {
  asset: Asset;
  loan: LoanRecord | null;
  expenses: ExpenseRecord[];
  parts?: PartItem[];
  onRefresh: () => void;
  onNavigateTab?: (tabId: string) => void;
}

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';

const DEFAULT_BANKS = [
  'Techcombank (TCB)', 'VPBank', 'VIB (Ngân hàng Quốc Tế)', 'TPBank (Tiên Phong)',
  'Shinhan Bank Việt Nam', 'Vietcombank (VCB)', 'BIDV', 'VietinBank',
  'MB Bank (Quân Đội)', 'Sacombank', 'ACB (Á Châu)', 'HDBank', 'MSB (Hàng Hải)', 'Woori Bank / HSBC'
];

function generate2TierLoanSchedule(loan: LoanRecord | null, payments: any[]) {
  if (!loan) return [];
  const start = new Date(loan.start_date || new Date().toISOString().slice(0, 10));
  let balance = loan.principal;
  const schedule = [];
  const paidKeys = new Set(payments.filter(p => p.status === 'PAID' || p.paid_date).map(p => {
    const d = new Date(p.due_date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }));

  const prefMonths = loan.preferred_months || 0;
  const prefRate = (loan.preferred_rate_percent || loan.interest_rate_percent) / 100 / 12;
  const floatRate = (loan.floating_rate_percent || loan.interest_rate_percent) / 100 / 12;

  for (let i = 1; i <= loan.term_months; i++) {
    const isPreferred = i <= prefMonths;
    const rate = isPreferred ? prefRate : floatRate;
    const interest = Math.round(balance * rate);

    // Calculate monthly EMI installment
    const n = loan.term_months - i + 1;
    const emi = (balance > 0 && rate > 0 && n > 0)
      ? Math.round((balance * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1))
      : Math.round(loan.monthly_payment);

    const monthlyTotal = emi > 0 ? emi : Math.round(loan.monthly_payment);
    const principalPaid = Math.max(0, monthlyTotal - interest);
    balance = Math.max(0, balance - principalPaid);

    const due = new Date(start);
    due.setMonth(due.getMonth() + i - 1);
    due.setDate(loan.payment_day || 15);
    const dueStr = due.toISOString().split('T')[0];
    const today = new Date();
    const key = `${due.getFullYear()}-${due.getMonth()}`;

    let status: 'PAID' | 'PENDING' | 'OVERDUE' = 'PENDING';
    if (paidKeys.has(key)) status = 'PAID';
    else if (new Date(dueStr) < today) status = 'OVERDUE';

    schedule.push({
      payment_number: i,
      due_date: dueStr,
      principal_paid: principalPaid,
      interest_paid: interest,
      total_payment: monthlyTotal,
      is_preferred: isPreferred,
      rate_percent: isPreferred ? (loan.preferred_rate_percent || loan.interest_rate_percent) : (loan.floating_rate_percent || loan.interest_rate_percent),
      status,
      remaining_balance: balance,
    });
  }
  return schedule;
}

export function VehicleFinanceOverview({ asset, loan, expenses, parts = [], onRefresh, onNavigateTab }: VehicleFinanceOverviewProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [bankList, setBankList] = useState<string[]>(DEFAULT_BANKS);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Editable forms
  const [marketValueInput, setMarketValueInput] = useState<string>(String(asset.current_market_value || asset.current_value || asset.purchase_price));
  const [purchasePriceInput, setPurchasePriceInput] = useState<string>(String(asset.purchase_price || 0));

  const [loanForm, setLoanForm] = useState({
    lender: loan?.lender || 'Techcombank (TCB)',
    vehicle_price: String(asset.purchase_price || 500000000),
    loan_ratio_percent: String(loan?.loan_ratio_percent || 80),
    principal: String(loan?.principal || 400000000),
    down_payment: String(loan?.down_payment || 100000000),
    interest_rate_percent: String(loan?.interest_rate_percent || 8.5),
    preferred_rate_percent: String(loan?.preferred_rate_percent || 7.5),
    preferred_months: String(loan?.preferred_months || 12),
    floating_rate_percent: String(loan?.floating_rate_percent || 10.5),
    term_months: String(loan?.term_months || 36),
    start_date: loan?.start_date ? loan.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    monthly_payment: String(loan?.monthly_payment || ''),
    payment_day: String(loan?.payment_day || 15),
    bank_contact_name: loan?.bank_contact_name || '',
    bank_contact_phone: loan?.bank_contact_phone || '',
    bank_hotline: loan?.bank_hotline || '',
    notes: loan?.notes || '',
  });

  const [upgradeForm, setUpgradeForm] = useState({ description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) });
  const [runningForm, setRunningForm] = useState({ category: 'FUEL', description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) });
  const [initialForm, setInitialForm] = useState({ category: 'Lệ phí trước bạ', description: '', amount: '', vendor: '' });

  useEffect(() => {
    // Load Master Banks
    try {
      const saved = localStorage.getItem('fmms_master_banks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setBankList(parsed);
      }
    } catch {}

    if (loan) {
      getLoanPayments(loan.id).then(setPayments).catch(() => {});
    }
  }, [loan]);

  // 1. Mandatory Initial Rollout Fees (Trước bạ, Đăng kiểm, Phí biển số, BH Thân vỏ, Phí NH, BH Khoản vay)
  const initialRolloutExpenses = useMemo(() => {
    return expenses.filter(e => {
      const c = (e.category || '').toUpperCase();
      const sc = (e.subcategory || '').toLowerCase();
      if (c === 'REGISTRATION' || c === 'INSURANCE' || sc === 'registration' || sc === 'insurance' || sc === 'loan fee' || sc === 'loan insurance') {
        return true;
      }
      return c === 'INITIAL' && sc !== 'purchase';
    });
  }, [expenses]);

  // System-wide Dynamic Formulas for ALL Vehicles:
  // 1. Initial Rollout Fees (Lệ phí lăn bánh ban đầu)
  const initialFeesTotal = useMemo(() => {
    return initialRolloutExpenses.reduce((s, e) => s + e.amount, 0);
  }, [initialRolloutExpenses]);

  // 2. Down Payment & Purchase Price
  const purchasePrice = asset.purchase_price || 0;
  const downPayment = loan ? loan.down_payment : purchasePrice;

  // 3. Investment (Vốn tự có ban đầu = Trả trước + Chi phí lăn bánh ban đầu)
  const investment = downPayment + initialFeesTotal;

  // 4. Upgrades Total (Tổng chi phí Nâng cấp & Đồ chơi)
  const totalUpgradeCost = useMemo(() => {
    const expUpgrades = expenses.filter(e => {
      const c = (e.category || '').toUpperCase();
      const sc = (e.subcategory || '').toLowerCase();
      if (sc === 'car wash' || sc === 'fuel' || sc === 'epass fee' || sc === 'parking' || sc === 'running fine' || sc === 'monthly payment' || sc === 'interest' || sc === 'purchase' || sc === 'registration' || sc === 'loan fee' || sc === 'loan insurance') {
        return false;
      }
      return c === 'UPGRADE' || c === 'PARTS';
    }).reduce((s, e) => s + e.amount, 0);

    if (expUpgrades > 0) return expUpgrades;
    return parts.reduce((s, p) => s + (p.cost || 0), 0);
  }, [expenses, parts]);

  // 5. Running Costs Total (Chi phí vận hành: Xăng, Trạm epass, Đỗ xe, Rửa xe...)
  const totalRunningCost = useMemo(() => {
    return expenses.filter(e => {
      const c = (e.category || '').toUpperCase();
      const sc = (e.subcategory || '').toLowerCase();
      return c === 'RUNNING' || c === 'FUEL' || c === 'TOLL' || c === 'PARKING' || c === 'CAR_WASH' ||
        sc === 'fuel' || sc === 'car wash' || sc === 'epass fee' || sc === 'parking' || sc === 'running fine';
    }).reduce((s, e) => s + e.amount, 0);
  }, [expenses]);

  // 6. Loan Payments & Interest
  const schedule = useMemo(() => generate2TierLoanSchedule(loan, payments), [loan, payments]);
  
  const paidInterest = useMemo(() => {
    const expInterest = expenses.filter(e => e.category === 'LOAN_INTEREST' || e.description?.includes('Thanh toán lãi')).reduce((sum, e) => sum + e.amount, 0);
    if (expInterest > 0) return expInterest;
    return schedule.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.interest_paid, 0);
  }, [expenses, schedule]);

  const paidPrincipal = useMemo(() => {
    const expPaid = expenses.filter(e => e.category === 'LOAN_PAYMENT' || e.description?.includes('Thanh toán gốc')).reduce((sum, e) => sum + e.amount, 0);
    if (expPaid > 0) return expPaid;
    return schedule.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.principal_paid, 0);
  }, [expenses, schedule]);

  const totalInterest = paidInterest;

  // 7. Total Cost (Investment + Upgrade + Running + Interest)
  const totalCost = investment + totalUpgradeCost + totalRunningCost + totalInterest;

  // 8. Cash Out (Total Cost + Paid Principal)
  const cashOut = totalCost + paidPrincipal;

  // 9. Total Value (Giá xe + Phí lăn bánh)
  const totalValue = purchasePrice + initialFeesTotal;

  // 10. Remaining (Dư nợ vay còn lại)
  const remainingLoan = loan ? (schedule.filter(s => s.status !== 'PAID').reduce((sum, s) => sum + s.total_payment, 0) || loan.current_balance) : 0;

  // 11. Ownership Cost (Total Cost + Remaining Loan)
  const ownershipCost = totalCost + remainingLoan;

  const toggleSchedulePaymentRow = async (pRow: any) => {
    if (!loan) return;
    try {
      if (pRow.status === 'PAID') {
        const match = payments.find(x => x.payment_number === pRow.payment_number);
        if (match) {
          await updateLoanPayment(match.id, { status: 'PENDING', paid_date: undefined });
          await updateLoan(loan.id, { current_balance: Math.min(loan.principal, loan.current_balance + pRow.principal_paid) });
        }
      } else {
        await createLoanPayment({
          loan_id: loan.id,
          payment_number: pRow.payment_number,
          due_date: pRow.due_date,
          principal_paid: pRow.principal_paid,
          interest_paid: pRow.interest_paid,
          total_payment: pRow.total_payment,
          paid_date: new Date().toISOString().slice(0, 10),
          status: 'PAID',
          remaining_balance: Math.max(0, loan.current_balance - pRow.principal_paid),
        });
        await updateLoan(loan.id, { current_balance: Math.max(0, loan.current_balance - pRow.principal_paid) });
      }
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi cập nhật thanh toán: ${err?.message ?? 'Lỗi'}`);
    }
  };

  // Auto calculate principal from loan ratio %
  const applyLoanRatio = (ratio: number) => {
    const vp = parseFloat(loanForm.vehicle_price) || investment || 500000000;
    const p = Math.round(vp * (ratio / 100));
    const dp = Math.max(0, vp - p);
    setLoanForm(prev => ({
      ...prev,
      loan_ratio_percent: String(ratio),
      principal: String(p),
      down_payment: String(dp),
    }));
  };

  const handleSaveLoanConfig = async () => {
    const vp = parseFloat(loanForm.vehicle_price) || investment;
    const p = parseFloat(loanForm.principal) || 0;
    const dp = parseFloat(loanForm.down_payment) || (vp - p);
    const prefR = parseFloat(loanForm.preferred_rate_percent) || parseFloat(loanForm.interest_rate_percent) || 8.5;
    const floatR = parseFloat(loanForm.floating_rate_percent) || prefR;
    const prefM = parseInt(loanForm.preferred_months) || 12;
    const termM = parseInt(loanForm.term_months) || 36;
    const r = prefR / 100 / 12;
    const emi = (p > 0 && r > 0 && termM > 0) ? Math.round((p * r * Math.pow(1 + r, termM)) / (Math.pow(1 + r, termM) - 1)) : 0;

    const input = {
      asset_id: asset.id,
      lender: loanForm.lender || 'Techcombank (TCB)',
      principal: p,
      down_payment: dp,
      interest_rate_percent: prefR,
      preferred_rate_percent: prefR,
      preferred_months: prefM,
      floating_rate_percent: floatR,
      loan_ratio_percent: parseFloat(loanForm.loan_ratio_percent) || 80,
      term_months: termM,
      start_date: loanForm.start_date || new Date().toISOString().slice(0, 10),
      monthly_payment: parseFloat(loanForm.monthly_payment) || emi,
      payment_day: parseInt(loanForm.payment_day) || 15,
      current_balance: loan ? loan.current_balance : p,
      bank_contact_name: loanForm.bank_contact_name || undefined,
      bank_contact_phone: loanForm.bank_contact_phone || undefined,
      bank_hotline: loanForm.bank_hotline || undefined,
      notes: loanForm.notes || undefined,
    };

    try {
      if (loan) {
        await updateLoanFull(loan.id, input);
      } else {
        await createLoan(input);
      }
      onRefresh();
      setActiveModal(null);
    } catch (err: any) {
      alert(`Lỗi khi lưu khoản vay: ${err?.message ?? 'Không lưu được'}`);
    }
  };

  const handleSaveMarketValue = async () => {
    const val = parseFloat(marketValueInput) || 0;
    try {
      await updateAsset(asset.id, { current_market_value: val, current_value: val });
      onRefresh();
      setActiveModal(null);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật giá trị thị trường: ${err?.message ?? 'Không lưu được'}`);
    }
  };

  const handleAddInitialItem = async (presetDesc?: string) => {
    const desc = presetDesc || initialForm.description || initialForm.category;
    if (!initialForm.amount && !presetDesc) return;
    try {
      await createExpense({
        asset_id: asset.id,
        date: new Date().toISOString().slice(0, 10),
        category: 'Initial',
        subcategory: 'Registration',
        amount: parseFloat(initialForm.amount) || 0,
        currency: 'VND',
        vendor: initialForm.vendor || undefined,
        description: desc,
      });
      onRefresh();
      setInitialForm({ category: 'Lệ phí trước bạ', description: '', amount: '', vendor: '' });
    } catch (err: any) {
      alert(`Lỗi khi thêm chi phí ban đầu: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const handleAddUpgradeItem = async () => {
    if (!upgradeForm.amount) return;
    try {
      await createExpense({
        asset_id: asset.id,
        date: upgradeForm.date || new Date().toISOString().slice(0, 10),
        category: 'Upgrade',
        subcategory: 'Accessorie',
        amount: parseFloat(upgradeForm.amount) || 0,
        currency: 'VND',
        vendor: upgradeForm.vendor || undefined,
        description: upgradeForm.description || 'Đồ độ / Nâng cấp xe',
      });
      onRefresh();
      setUpgradeForm({ description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) });
    } catch (err: any) {
      alert(`Lỗi khi thêm nâng cấp: ${err?.message ?? 'Lỗi'}`);
    }
  };

  const handleAddRunningItem = async () => {
    if (!runningForm.amount) return;
    try {
      await createExpense({
        asset_id: asset.id,
        date: runningForm.date || new Date().toISOString().slice(0, 10),
        category: 'Running',
        subcategory: runningForm.category === 'CAR_WASH' ? 'Car Wash' : runningForm.category === 'PARKING' ? 'Parking' : runningForm.category === 'TOLL' ? 'Epass Fee' : 'Fuel',
        amount: parseFloat(runningForm.amount) || 0,
        currency: 'VND',
        vendor: runningForm.vendor || undefined,
        description: runningForm.description || 'Chi phí vận hành',
      });
      onRefresh();
      setRunningForm({ category: 'FUEL', description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) });
    } catch (err: any) {
      alert(`Lỗi khi thêm chi phí: ${err?.message ?? 'Lỗi'}`);
    }
  };

  // Card Navigation / Modal Trigger
  const handleCardClick = (cardId: string) => {
    if (onNavigateTab) {
      if (cardId === 'upgrade') {
        onNavigateTab('parts');
        return;
      }
      if (cardId === 'running') {
        onNavigateTab('expenses');
        return;
      }
      if (cardId === 'interest' || cardId === 'remaining') {
        onNavigateTab('finance');
        return;
      }
    }
    setActiveModal(cardId);
  };

  // 9 Summary Cards Config
  const CARDS = [
    {
      id: 'investment',
      title: 'Investment',
      sub: 'Vốn tự có ban đầu',
      value: `${fmt(investment)} ₫`,
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.3)',
      icon: Landmark,
      detailText: `Trả trước ${fmt(downPayment)}₫ + Phí lăn bánh ${fmt(initialFeesTotal)}₫`,
    },
    {
      id: 'upgrade',
      title: 'Upgrade',
      sub: 'Đồ độ & Nâng cấp',
      value: `${fmt(totalUpgradeCost)} ₫`,
      color: '#A78BFA',
      bg: 'rgba(167,139,250,0.12)',
      border: 'rgba(167,139,250,0.3)',
      icon: Wrench,
      detailText: `${parts.length + expenses.filter(e => e.category === 'UPGRADE' || e.category === 'PARTS').length} món độ — Mở tab Phụ tùng`,
    },
    {
      id: 'running',
      title: 'Running',
      sub: 'Chi phí vận hành',
      value: `${fmt(totalRunningCost)} ₫`,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.3)',
      icon: Fuel,
      detailText: 'Xăng, Đổ bê tông/Gửi xe, BOT, Rửa xe... — Mở tab Chi phí',
    },
    {
      id: 'interest',
      title: 'Interest',
      sub: 'Lãi vay ngân hàng',
      value: `${fmt(totalInterest)} ₫`,
      color: '#EC4899',
      bg: 'rgba(236,72,153,0.12)',
      border: 'rgba(236,72,153,0.3)',
      icon: TrendingUp,
      detailText: loan ? `Ưu đãi ${loan.preferred_rate_percent || loan.interest_rate_percent}% + Thả nổi ${loan.floating_rate_percent || loan.interest_rate_percent}% — Mở Khoản vay` : 'Chưa có khoản vay',
    },
    {
      id: 'totalCost',
      title: 'Total Cost',
      sub: 'Tổng chi phí toàn bộ',
      value: `${fmt(totalCost)} ₫`,
      color: '#0EA5E9',
      bg: 'rgba(14,165,233,0.12)',
      border: 'rgba(14,165,233,0.3)',
      icon: PieChart,
      detailText: 'Vốn tự có + Nâng cấp + Vận hành + Lãi vay',
    },
    {
      id: 'cashOut',
      title: 'Cash Out',
      sub: 'Thực chi từ túi',
      value: `${fmt(cashOut)} ₫`,
      color: '#F43F5E',
      bg: 'rgba(244,63,94,0.12)',
      border: 'rgba(244,63,94,0.3)',
      icon: DollarSign,
      detailText: 'Tổng chi phí + Gốc vay đã thanh toán',
    },
    {
      id: 'totalValue',
      title: 'Total Value',
      sub: 'Tổng giá trị xe & lăn bánh',
      value: `${fmt(totalValue)} ₫`,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.3)',
      icon: ShieldCheck,
      detailText: `Giá xe ${fmt(purchasePrice)}₫ + Phí lăn bánh ${fmt(initialFeesTotal)}₫`,
    },
    {
      id: 'remaining',
      title: 'Remaining (Loan)',
      sub: 'Dư nợ vay còn lại',
      value: `${fmt(remainingLoan)} ₫`,
      color: '#FB923C',
      bg: 'rgba(251,146,60,0.12)',
      border: 'rgba(251,146,60,0.3)',
      icon: CreditCard,
      detailText: loan ? `Còn ${loan.term_months - schedule.filter(s => s.status === 'PAID').length} kỳ đóng — Mở Khoản vay` : 'Không có dư nợ',
    },
    {
      id: 'ownership',
      title: 'Ownership Cost',
      sub: 'Tổng chi phí cam kết & thực tế',
      value: `${fmt(ownershipCost)} ₫`,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.12)',
      border: 'rgba(139,92,246,0.3)',
      icon: TrendingDown,
      detailText: 'Total Cost + Dư nợ khoản vay còn lại',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-extrabold flex items-center space-x-2" style={{ color: 'var(--text-primary)' }}>
            <PieChart className="w-5 h-5 text-cyan-400" />
            <span>BẢNG ĐIỀU KHIỂN TÀI CHÍNH XE &amp; TCO (9 METRIC CARDS)</span>
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Click vào từng thẻ để chuyển thẳng màn hình chi tiết hoặc chỉnh sửa thông số
          </p>
        </div>
        <button
          onClick={() => setActiveModal('loan_config')}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        >
          <Landmark className="w-4 h-4" />
          <span>{loan ? 'Cấu hình khoản vay (Lãi 2 Giai Đoạn)' : '+ Thêm khoản vay mới'}</span>
        </button>
      </div>

      {/* 9 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className="glass-card p-4 rounded-2xl cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg relative overflow-hidden group"
              style={{ background: 'var(--bg-secondary)', border: `1px solid ${card.border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                    <Icon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: card.color }}>{card.title}</h4>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{card.sub}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition" style={{ color: card.color }} />
              </div>

              <div className="mt-1">
                <p className="text-lg sm:text-xl font-black font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
                <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--text-faint)' }}>{card.detailText}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── MODAL DRILL-DOWNS ─── */}

      {/* 1. Investment Modal (Mandatory Initial Rollout Expenses) */}
      {activeModal === 'investment' && (
        <DrillDownModal title="💵 Investment — Chi phí mua xe &amp; Lăn bánh ban đầu" onClose={() => setActiveModal(null)}>
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl space-y-2 font-sans" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex justify-between"><span>Giá niêm yết xe:</span><strong className="font-mono text-cyan-400">{fmt(investment)} ₫</strong></div>
              <div className="flex justify-between"><span>Tổng chi phí lăn bánh ban đầu:</span><strong className="font-mono text-purple-400">{fmt(initialFeesTotal)} ₫</strong></div>
              <div className="flex justify-between border-t pt-2 mt-1" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="font-bold text-xs uppercase" style={{ color: 'var(--text-primary)' }}>TỔNG ĐẦU TƯ BAN ĐẦU:</span>
                <strong className="font-mono text-base text-emerald-400 font-black">{fmt(totalValue)} ₫</strong>
              </div>
            </div>

            {/* Edit Purchase Price */}
            <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
              <label className="text-[11px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Chỉnh sửa giá mua xe gốc (₫)</label>
              <div className="flex gap-2">
                <input type="number" className="theme-input font-mono font-bold text-xs flex-1" value={purchasePriceInput} onChange={e => setPurchasePriceInput(e.target.value)} />
                <button onClick={async () => {
                  await updateAsset(asset.id, { purchase_price: parseFloat(purchasePriceInput) || 0 });
                  onRefresh();
                }} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white font-bold text-xs shrink-0">
                  Lưu giá xe
                </button>
              </div>
            </div>

            {/* Mandatory Initial Rollout Items Form */}
            <div className="p-3.5 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <h5 className="font-bold uppercase text-[11px]" style={{ color: 'var(--accent-cyan)' }}>
                + Khai báo các chi phí lăn bánh bắt buộc (Trước bạ, Đăng kiểm, BH, Phí vay...)
              </h5>
              
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Thêm nhanh:</span>
                {[
                  'Lệ phí trước bạ',
                  'Đăng kiểm & đường bộ',
                  'Phí dịch vụ đăng ký',
                  'Bảo hiểm thân vỏ',
                  'Phí dịch vụ ngân hàng',
                  'Phí bảo hiểm khoản vay'
                ].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setInitialForm(p => ({ ...p, category: preset, description: preset }))}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold hover:opacity-80 transition"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Mô tả khoản chi (VD: Lệ phí trước bạ 10%)..."
                  className="theme-input text-xs col-span-2"
                  value={initialForm.description}
                  onChange={e => setInitialForm(p => ({ ...p, description: e.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Số tiền (₫)..."
                  className="theme-input text-xs font-mono font-bold"
                  value={initialForm.amount}
                  onChange={e => setInitialForm(p => ({ ...p, amount: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Đơn vị / Nơi thu (VD: Thuế, Đăng kiểm, BH...)"
                  className="theme-input text-xs"
                  value={initialForm.vendor}
                  onChange={e => setInitialForm(p => ({ ...p, vendor: e.target.value }))}
                />
              </div>

              <button onClick={() => handleAddInitialItem()} className="w-full py-2 rounded-xl bg-purple-500 text-white font-bold text-xs">
                + Thêm chi phí ban đầu này
              </button>
            </div>

            {/* List of Initial Rollout Expenses */}
            <div className="space-y-2">
              <h5 className="font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Danh sách chi phí ban đầu đã ghi nhận ({initialRolloutExpenses.length})
              </h5>
              <div className="max-h-52 overflow-y-auto space-y-2">
                {initialRolloutExpenses.map(item => (
                  <div key={item.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{item.description}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtDate(item.date)} {item.vendor ? `• ${item.vendor}` : ''}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-purple-400">{fmt(item.amount)} ₫</span>
                      <button onClick={async () => { await deleteExpense(item.id); onRefresh(); }} className="text-rose-400 hover:opacity-70 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {initialRolloutExpenses.length === 0 && (
                  <p className="text-[11px] text-center py-3" style={{ color: 'var(--text-muted)' }}>Chưa khai báo thêm chi phí lăn bánh ban đầu</p>
                )}
              </div>
            </div>
          </div>
        </DrillDownModal>
      )}

      {/* 2. Upgrade Modal */}
      {activeModal === 'upgrade' && (
        <DrillDownModal title="🛠️ Upgrade — Danh sách đồ độ &amp; Nâng cấp" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl text-xs space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <h5 className="font-bold uppercase text-[11px]" style={{ color: 'var(--accent-cyan)' }}>+ Thêm món độ / phụ tùng nâng cấp mới</h5>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Tên món độ (VD: Màn Zestech, Lớp dán 3M)..." className="theme-input text-xs col-span-2" value={upgradeForm.description} onChange={e => setUpgradeForm(p => ({ ...p, description: e.target.value }))} />
                <input type="number" placeholder="Chi phí (₫)" className="theme-input text-xs font-mono font-bold" value={upgradeForm.amount} onChange={e => setUpgradeForm(p => ({ ...p, amount: e.target.value }))} />
                <input type="text" placeholder="Nơi làm (Garage/Đại lý)" className="theme-input text-xs" value={upgradeForm.vendor} onChange={e => setUpgradeForm(p => ({ ...p, vendor: e.target.value }))} />
              </div>
              <button onClick={handleAddUpgradeItem} className="w-full py-2 rounded-xl bg-purple-500 text-white font-bold text-xs">+ Thêm vào danh sách độ</button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {expenses.filter(e => e.category === 'UPGRADE' || e.category === 'PARTS').map(item => (
                <div key={item.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.description}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtDate(item.date)} {item.vendor ? `• ${item.vendor}` : ''}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-purple-400">{fmt(item.amount)} ₫</span>
                    <button onClick={async () => { await deleteExpense(item.id); onRefresh(); }} className="text-rose-400 hover:opacity-70 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DrillDownModal>
      )}

      {/* 3. Running Modal */}
      {activeModal === 'running' && (
        <DrillDownModal title="⛽ Running — Chi phí vận hành &amp; Bảo dưỡng" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl text-xs space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <h5 className="font-bold uppercase text-[11px]" style={{ color: 'var(--status-amber)' }}>+ Thêm chi phí vận hành</h5>
              <div className="grid grid-cols-2 gap-2">
                <select className="theme-select text-xs" value={runningForm.category} onChange={e => setRunningForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="FUEL">Nhiên liệu / Xăng / Điện</option>
                  <option value="MAINTENANCE">Bảo dưỡng &amp; Sửa chữa</option>
                  <option value="INSURANCE">Bảo hiểm</option>
                  <option value="TOLL">Cầu đường (BOT)</option>
                  <option value="PARKING">Đỗ xe &amp; Gửi xe</option>
                  <option value="REGISTRATION">Đăng kiểm / Phí đường bộ</option>
                  <option value="OTHER">Khác</option>
                </select>
                <input type="number" placeholder="Số tiền (₫)" className="theme-input text-xs font-mono font-bold" value={runningForm.amount} onChange={e => setRunningForm(p => ({ ...p, amount: e.target.value }))} />
                <input type="text" placeholder="Mô tả" className="theme-input text-xs col-span-2" value={runningForm.description} onChange={e => setRunningForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <button onClick={handleAddRunningItem} className="w-full py-2 rounded-xl bg-amber-500 text-white font-bold text-xs">+ Thêm chi phí vận hành</button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {expenses.filter(e => e.category !== 'UPGRADE' && e.category !== 'PARTS').map(item => (
                <div key={item.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{item.description || item.category}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtDate(item.date)} • {item.category}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-amber-400">{fmt(item.amount)} ₫</span>
                    <button onClick={async () => { await deleteExpense(item.id); onRefresh(); }} className="text-rose-400 hover:opacity-70 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DrillDownModal>
      )}

      {/* 4. Interest Modal */}
      {activeModal === 'interest' && (
        <DrillDownModal title="🏦 Interest — Chi tiết lãi vay &amp; Lãi 2 Giai Đoạn" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex justify-between"><span>Lãi suất ưu đãi ban đầu:</span><strong className="text-emerald-400 font-bold">{loan?.preferred_rate_percent || loan?.interest_rate_percent}%/năm ({loan?.preferred_months || 12} tháng đầu)</strong></div>
              <div className="flex justify-between"><span>Lãi suất thả nổi các năm sau:</span><strong className="text-amber-400 font-bold">{loan?.floating_rate_percent || loan?.interest_rate_percent}%/năm</strong></div>
              <div className="flex justify-between"><span>Tổng lãi đã trả đến nay:</span><strong className="font-mono text-pink-400">{fmt(paidInterest)} ₫</strong></div>
              <div className="flex justify-between"><span>Dự tính tổng lãi vay:</span><strong className="font-mono text-rose-400">{fmt(totalInterest)} ₫</strong></div>
            </div>

            {/* Quick Call Bank Contacts */}
            {(loan?.bank_contact_phone || loan?.bank_hotline) && (
              <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)' }}>
                <span className="font-bold uppercase text-[11px] text-cyan-400">📞 Gọi nhanh hỗ trợ Ngân hàng:</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {loan?.bank_contact_phone && (
                    <a href={`tel:${loan.bank_contact_phone}`} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90">
                      <span>👤 {loan.bank_contact_name || 'Cán bộ tín dụng'}: {loan.bank_contact_phone}</span>
                    </a>
                  )}
                  {loan?.bank_hotline && (
                    <a href={`tel:${loan.bank_hotline}`} className="px-3 py-1.5 rounded-lg bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 hover:opacity-90" style={{ border: '1px solid rgba(14,165,233,0.4)' }}>
                      <span>☎️ Tổng đài {loan.lender}: {loan.bank_hotline}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            <button onClick={() => setActiveModal('loan_config')} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs">
              ✏️ Điều chỉnh lãi suất &amp; Cấu hình khoản vay
            </button>
          </div>
        </DrillDownModal>
      )}

      {/* 7. Total Value Modal */}
      {activeModal === 'totalValue' && (
        <DrillDownModal title="🛡️ Total Value — Cập nhật giá trị thị trường xe" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-xs">
            <p style={{ color: 'var(--text-muted)' }}>
              Cập nhật định giá thị trường xe hiện tại để tính chính xác Chi phí sở hữu (Ownership Cost).
            </p>
            <div className="space-y-1">
              <label className="font-bold" style={{ color: 'var(--text-muted)' }}>Giá trị xe ước tính hiện tại (₫)</label>
              <input type="number" className="theme-input font-mono font-bold" value={marketValueInput} onChange={e => setMarketValueInput(e.target.value)} />
            </div>
            <button onClick={handleSaveMarketValue} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs">
              Lưu định giá xe
            </button>
          </div>
        </DrillDownModal>
      )}

      {/* 8. Remaining Loan Schedule Modal */}
      {activeModal === 'remaining' && (
        <DrillDownModal title="📋 Remaining Loan — Lịch trả nợ dư nợ giảm dần" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-xs">
            <div className="max-h-80 overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th className="p-2 text-left">Kỳ</th>
                    <th className="p-2 text-left">Hạn đóng</th>
                    <th className="p-2 text-left">Lãi %</th>
                    <th className="p-2 text-left">Gốc</th>
                    <th className="p-2 text-left">Lãi</th>
                    <th className="p-2 text-left">Tổng trả</th>
                    <th className="p-2 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(s => (
                    <tr key={s.payment_number} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="p-2 font-bold">Kỳ {s.payment_number}</td>
                      <td className="p-2 font-mono">{fmtDate(s.due_date)}</td>
                      <td className="p-2 font-bold" style={{ color: s.is_preferred ? 'var(--status-green)' : 'var(--status-amber)' }}>
                        {s.is_preferred ? `⭐ ${s.rate_percent}%` : `📈 ${s.rate_percent}%`}
                      </td>
                      <td className="p-2 font-mono">{fmt(s.principal_paid)} ₫</td>
                      <td className="p-2 font-mono text-pink-400">{fmt(s.interest_paid)} ₫</td>
                      <td className="p-2 font-mono font-bold">{fmt(s.total_payment)} ₫</td>
                      <td className="p-2">
                        <button
                          onClick={() => toggleSchedulePaymentRow(s)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={s.status === 'PAID' ? { background: 'rgba(52,211,153,0.15)', color: 'var(--status-green)' } : { background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                        >
                          {s.status === 'PAID' ? '✓ Đã trả' : 'Chờ trả'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DrillDownModal>
      )}

      {/* Loan Config Modal (2-Tier Rate & Ratio Calculator) */}
      {activeModal === 'loan_config' && (
        <DrillDownModal title="🏦 Cấu hình khoản vay &amp; Lãi suất 2 giai đoạn" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-xs">
            {/* Bank Selector */}
            <div className="space-y-1">
              <label className="font-bold uppercase text-[11px]" style={{ color: 'var(--text-muted)' }}>Tổ chức tín dụng / Ngân hàng vay *</label>
              <select className="theme-select font-bold" value={loanForm.lender} onChange={e => setLoanForm(p => ({ ...p, lender: e.target.value }))}>
                {bankList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Ratio % Calculator */}
            <div className="space-y-2 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[11px] uppercase" style={{ color: 'var(--accent-cyan)' }}>Chọn % Vay trên giá xe</span>
                <span className="font-mono font-bold text-cyan-400">{loanForm.loan_ratio_percent}% Vay</span>
              </div>
              <div className="flex space-x-2">
                {[70, 75, 80, 85].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => applyLoanRatio(r)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-bold transition"
                    style={parseFloat(loanForm.loan_ratio_percent) === r
                      ? { background: 'var(--accent-cyan)', color: 'white' }
                      : { background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>Gốc vay (₫)</label>
                <input type="number" className="theme-input font-mono font-bold text-cyan-400" value={loanForm.principal} onChange={e => setLoanForm(p => ({ ...p, principal: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>Trả trước (₫)</label>
                <input type="number" className="theme-input font-mono font-bold" value={loanForm.down_payment} onChange={e => setLoanForm(p => ({ ...p, down_payment: e.target.value }))} />
              </div>
            </div>

            {/* 2-Tier Rate Config */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <div className="space-y-1">
                <label className="font-bold text-[10px] uppercase text-emerald-400">Lãi ưu đãi %/năm</label>
                <input type="number" step="0.1" className="theme-input font-mono font-bold" value={loanForm.preferred_rate_percent} onChange={e => setLoanForm(p => ({ ...p, preferred_rate_percent: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[10px] uppercase text-emerald-400">Số tháng ưu đãi</label>
                <input type="number" className="theme-input font-mono" value={loanForm.preferred_months} onChange={e => setLoanForm(p => ({ ...p, preferred_months: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[10px] uppercase text-amber-400">Lãi thả nổi %/năm</label>
                <input type="number" step="0.1" className="theme-input font-mono font-bold" value={loanForm.floating_rate_percent} onChange={e => setLoanForm(p => ({ ...p, floating_rate_percent: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>Kỳ hạn (tháng)</label>
                <input type="number" className="theme-input font-mono" value={loanForm.term_months} onChange={e => setLoanForm(p => ({ ...p, term_months: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>Ngày đóng hàng tháng</label>
                <input type="number" min="1" max="31" className="theme-input font-mono" value={loanForm.payment_day} onChange={e => setLoanForm(p => ({ ...p, payment_day: e.target.value }))} />
              </div>
            </div>

            {/* Bank Officer & Hotline Contact Information */}
            <div className="p-3 rounded-xl space-y-2 font-sans" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
              <span className="font-bold text-[11px] uppercase flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
                📞 Liên hệ Cán bộ tín dụng &amp; Tổng đài Ngân hàng
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Tên cán bộ tín dụng (VD: Anh Nam TCB)..." className="theme-input text-xs" value={loanForm.bank_contact_name} onChange={e => setLoanForm(p => ({ ...p, bank_contact_name: e.target.value }))} />
                <input type="tel" placeholder="SĐT cán bộ tín dụng..." className="theme-input text-xs font-mono font-bold" value={loanForm.bank_contact_phone} onChange={e => setLoanForm(p => ({ ...p, bank_contact_phone: e.target.value }))} />
                <input type="tel" placeholder="Hotline/Tổng đài ngân hàng..." className="theme-input text-xs font-mono col-span-2" value={loanForm.bank_hotline} onChange={e => setLoanForm(p => ({ ...p, bank_hotline: e.target.value }))} />
              </div>
            </div>

            <button onClick={handleSaveLoanConfig} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md">
              Lưu cấu hình khoản vay
            </button>
          </div>
        </DrillDownModal>
      )}
    </div>
  );
}

function DrillDownModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 backdrop-blur-md overflow-hidden" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="glass-panel rounded-2xl w-full max-w-lg my-auto max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-primary)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-5 border-b shrink-0 z-20" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-secondary)' }}>
          <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
