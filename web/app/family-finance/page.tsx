'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  FamilyTransaction,
  FamilyBudget,
  FamilyLoan,
  TransactionCategory,
} from '@/types/finance';
import {
  getWallets,
  getFamilyTransactions,
  getCategories,
  getBudgets,
  getFamilyLoans,
  deleteFamilyTransaction,
} from '@/lib/services/familyFinanceService';
import KpiGradientCard from '@/components/ui/KpiGradientCard';
import QuickTransactionModal from '@/components/finance/QuickTransactionModal';
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  CreditCard,
  Plus,
  Car,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  PieChart,
  ChevronRight,
  Banknote,
  Building2,
  Smartphone,
  PiggyBank,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (d: string) => {
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

export default function FamilyFinanceDashboard() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [budgets, setBudgets] = useState<FamilyBudget[]>([]);
  const [loans, setLoans] = useState<FamilyLoan[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [budgetModel, setBudgetModel] = useState<'6_JARS' | '50_30_20'>('6_JARS');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');

  // Load all finance data
  const loadData = async () => {
    setLoading(true);
    try {
      const [wData, cData, bData, lData] = await Promise.all([
        getWallets(),
        getCategories(),
        getBudgets(selectedMonth, selectedYear),
        getFamilyLoans(),
      ]);

      setWallets(wData);
      setCategories(cData);
      setBudgets(bData);
      setLoans(lData);

      // Load transactions for the selected month/year
      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      const txData = await getFamilyTransactions({
        startDate: startStr,
        endDate: endStr,
      });
      setTransactions(txData);
    } catch (err) {
      console.error('Error loading finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Calculations
  // 1. Total Net Liquid Assets (Cash, Bank, E-Wallets, Savings - excluding credit card debt)
  const totalAvailableBalance = useMemo(() => {
    return wallets
      .filter((w) => w.status === 'ACTIVE' && !w.is_excluded_from_total && w.wallet_type !== 'CREDIT_CARD')
      .reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0);
  }, [wallets]);

  // 2. Monthly Income
  const monthlyIncome = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'INCOME' && !t.exclude_from_reports)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // 3. Monthly Expenses (General + Vehicle)
  const monthlyExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // Breakdown: Vehicle vs General
  const vehicleExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && (t.asset_id || t.category?.name?.includes('Phương tiện')))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const generalExpenses = Math.max(0, monthlyExpenses - vehicleExpenses);
  const vehiclePercent = monthlyExpenses > 0 ? Math.round((vehicleExpenses / monthlyExpenses) * 100) : 0;

  // 4. Total Family Debt & Loans
  const totalDebt = useMemo(() => {
    const loanBal = loans
      .filter((l) => l.status === 'ACTIVE')
      .reduce((sum, l) => sum + (Number(l.remaining_balance) || 0), 0);

    const creditBal = wallets
      .filter((w) => w.wallet_type === 'CREDIT_CARD' && w.status === 'ACTIVE')
      .reduce((sum, w) => sum + Math.max(0, (w.credit_limit || 0) - (w.current_balance || 0)), 0);

    return loanBal + creditBal;
  }, [loans, wallets]);

  // 6 Jars Calculation
  // NECESSITY 55%, SAVINGS 10%, EDUCATION 10%, PLAY 10%, INVESTMENT 10%, GIVE 5%
  const jarsConfig = [
    { key: 'NECESSITY', label: 'Thiết yếu (NEC)', percent: 55, color: 'bg-emerald-500', text: 'text-emerald-500' },
    { key: 'SAVINGS', label: 'Tiết kiệm dài hạn (LTSS)', percent: 10, color: 'bg-sky-500', text: 'text-sky-500' },
    { key: 'EDUCATION', label: 'Giáo dục & Học tập (EDU)', percent: 10, color: 'bg-purple-500', text: 'text-purple-500' },
    { key: 'PLAY', label: 'Hưởng thụ & Du lịch (PLAY)', percent: 10, color: 'bg-amber-500', text: 'text-amber-500' },
    { key: 'INVESTMENT', label: 'Tự do tài chính (FFA)', percent: 10, color: 'bg-indigo-500', text: 'text-indigo-500' },
    { key: 'GIVE', label: 'Cho đi & Biếu tặng (GIVE)', percent: 5, color: 'bg-rose-500', text: 'text-rose-500' },
  ];

  const jarStats = useMemo(() => {
    // Base standard target income or 50,000,000 fallback for target display
    const baseIncome = monthlyIncome > 0 ? monthlyIncome : 50000000;

    return jarsConfig.map((jar) => {
      const budgetCap = (baseIncome * jar.percent) / 100;
      // Sum expenses belonging to this bucket
      const spent = transactions
        .filter((t) => t.transaction_type === 'EXPENSE' && t.category?.budget_bucket === jar.key)
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const ratio = budgetCap > 0 ? Math.min(200, Math.round((spent / budgetCap) * 100)) : 0;
      return {
        ...jar,
        budgetCap,
        spent,
        ratio,
      };
    });
  }, [jarsConfig, monthlyIncome, transactions]);

  // 50/30/20 Calculation
  const rule503020Stats = useMemo(() => {
    const baseIncome = monthlyIncome > 0 ? monthlyIncome : 50000000;
    const needsBudget = baseIncome * 0.5;
    const wantsBudget = baseIncome * 0.3;
    const savingsBudget = baseIncome * 0.2;

    const needsSpent = transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && t.is_essential)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const wantsSpent = transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.is_essential)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    return [
      {
        label: 'Nhu cầu thiết yếu (Needs 50%)',
        budgetCap: needsBudget,
        spent: needsSpent,
        ratio: needsBudget > 0 ? Math.min(200, Math.round((needsSpent / needsBudget) * 100)) : 0,
        color: 'bg-sky-500',
        text: 'text-sky-500',
        desc: 'Tiền ăn uống, nhà cửa, xe cộ, xăng dầu, học phí bắt buộc',
      },
      {
        label: 'Mong muốn & Sở thích (Wants 30%)',
        budgetCap: wantsBudget,
        spent: wantsSpent,
        ratio: wantsBudget > 0 ? Math.min(200, Math.round((wantsSpent / wantsBudget) * 100)) : 0,
        color: 'bg-amber-500',
        text: 'text-amber-500',
        desc: 'Du lịch, cà phê bạn bè, mua sắm giải trí, spa',
      },
      {
        label: 'Tiết kiệm & Đầu tư (Savings/Invest 20%)',
        budgetCap: savingsBudget,
        spent: Math.max(0, monthlyIncome - monthlyExpenses),
        ratio: savingsBudget > 0 ? Math.min(200, Math.round((Math.max(0, monthlyIncome - monthlyExpenses) / savingsBudget) * 100)) : 0,
        color: 'bg-emerald-500',
        text: 'text-emerald-500',
        desc: 'Tích lũy tài sản, trả nợ trước hạn, quỹ khẩn cấp',
      },
    ];
  }, [monthlyIncome, monthlyExpenses, transactions]);

  const handleDeleteTx = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa giao dịch này?')) {
      try {
        await deleteFamilyTransaction(id);
        loadData();
      } catch (err) {
        alert('Xóa thất bại');
      }
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'BANK': return Building2;
      case 'CREDIT_CARD': return CreditCard;
      case 'E_WALLET': return Smartphone;
      case 'SAVINGS': return PiggyBank;
      default: return Banknote;
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EXECUTIVE ACTIONS
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Quản lý Tài chính Gia đình
                <span className="text-xs px-2.5 py-0.5 font-bold rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  FFMS Core
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toàn cảnh tài sản, ngân sách hũ thông minh, chi phí xe cộ & quản trị dư nợ gia đình
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Tháng</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m} className="dark:bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
            <span>/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="dark:bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setModalDefaultType('TRANSFER');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-all"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" />
            Chuyển ví
          </button>

          <button
            onClick={() => {
              setModalDefaultType('EXPENSE');
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 active:scale-[0.98] rounded-xl shadow-md shadow-sky-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Ghi chép nhanh
          </button>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. 4 QMS GRADIENT KPI CARDS (EXECUTIVE METRICS)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiGradientCard
          title="TỔNG TÀI SẢN KHẢ DỤNG"
          value={fmt(totalAvailableBalance)}
          unit="₫"
          subtitle="Số dư khả dụng các ví & ngân hàng"
          colorType="emerald"
          icon={WalletIcon}
          badgeText="Ổn định"
          badgeType="success"
          href="/family-finance/wallets"
        />

        <KpiGradientCard
          title="THU NHẬP THÁNG NÀY"
          value={fmt(monthlyIncome)}
          unit="₫"
          subtitle={`Tháng ${selectedMonth}/${selectedYear} (Lương & phụ)`}
          colorType="cyan"
          icon={ArrowDownLeft}
          badgeText="Dòng tiền vào"
          badgeType="info"
          href="/family-finance/transactions?type=INCOME"
        />

        <KpiGradientCard
          title="TỔNG CHI TIÊU THÁNG NÀY"
          value={fmt(monthlyExpenses)}
          unit="₫"
          subtitle={`Trong đó Xe cộ: ${fmt(vehicleExpenses)} ₫ (${vehiclePercent}%)`}
          colorType="amber"
          icon={ArrowUpRight}
          badgeText={vehicleExpenses > 0 ? `Xe: ${vehiclePercent}%` : 'Chi ra'}
          badgeType="warning"
          href="/family-finance/transactions?type=EXPENSE"
        />

        <KpiGradientCard
          title="TỔNG DƯ NỢ & KHOẢN VAY"
          value={fmt(totalDebt)}
          unit="₫"
          subtitle="Gồm vay xe Mazda 2 & nợ thẻ tín dụng"
          colorType="rose"
          icon={CreditCard}
          badgeText="Dư nợ"
          badgeType="danger"
          href="/family-finance/loans"
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. TWO-COLUMN ANALYTICS: SMART BUDGET ALLOCATION & MOBILITY TCO
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Smart Budget Allocation (6 Jars / 50-30-20) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-500" />
                Cơ cấu Ngân sách Gia đình
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kiểm soát ngân sách thông minh và cảnh báo vượt hạn mức chi
              </p>
            </div>

            {/* Model switch */}
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
              <button
                onClick={() => setBudgetModel('6_JARS')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  budgetModel === '6_JARS'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                6 Chiếc Hũ (6 Jars)
              </button>
              <button
                onClick={() => setBudgetModel('50_30_20')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  budgetModel === '50_30_20'
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Quy tắc 50/30/20
              </button>
            </div>
          </div>

          {/* 6 JARS VIEW */}
          {budgetModel === '6_JARS' ? (
            <div className="space-y-3.5">
              {jarStats.map((jar) => (
                <div key={jar.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${jar.color}`} />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{jar.label}</span>
                      <span className="text-slate-400">({jar.percent}%)</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-medium">
                      <span className={jar.spent > jar.budgetCap ? 'text-rose-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                        {fmt(jar.spent)} ₫
                      </span>
                      <span className="text-slate-400">/ {fmt(jar.budgetCap)} ₫</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          jar.ratio > 100
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : jar.ratio >= 80
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {jar.ratio}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        jar.ratio > 100 ? 'bg-rose-500' : jar.ratio >= 80 ? 'bg-amber-500' : jar.color
                      }`}
                      style={{ width: `${Math.min(100, jar.ratio)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 50/30/20 VIEW */
            <div className="space-y-4">
              {rule503020Stats.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {fmt(item.spent)} ₫ / {fmt(item.budgetCap)} ₫
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                          item.ratio > 100
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : item.ratio >= 80
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {item.ratio}% hạn mức
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.ratio > 100 ? 'bg-rose-500' : item.ratio >= 80 ? 'bg-amber-500' : item.color
                      }`}
                      style={{ width: `${Math.min(100, item.ratio)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-400">
              * Tỷ lệ tính toán dựa trên thu nhập tháng hoặc định mức chuẩn gia đình.
            </span>
            <Link
              href="/family-finance/budgets"
              className="text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
            >
              Cấu hình ngân sách
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Mobility TCO Linkage */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-cyan-500" />
                  Chi phí Phương tiện (FMMS TCO)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tỷ trọng chi phí xe cộ trong tổng chi tiêu gia đình
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                {vehiclePercent}% tổng chi
              </span>
            </div>

            {/* Split Comparison Box */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400">Sinh hoạt thông thường</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1">
                  {fmt(generalExpenses)} ₫
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {100 - vehiclePercent}% tổng ngân sách
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/60">
                <span className="text-xs text-cyan-700 dark:text-cyan-300 font-semibold">Chi phí Xe cộ (Mobility)</span>
                <div className="text-lg font-bold text-cyan-700 dark:text-cyan-300 font-mono mt-1">
                  {fmt(vehicleExpenses)} ₫
                </div>
                <div className="text-[11px] text-cyan-600/80 dark:text-cyan-400 mt-0.5">
                  Xăng dầu, bảo dưỡng, phí đỗ
                </div>
              </div>
            </div>

            {/* Visual Bar Ratio */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-400">Sinh hoạt ({100 - vehiclePercent}%)</span>
                <span className="text-cyan-600 dark:text-cyan-400">Xe cộ ({vehiclePercent}%)</span>
              </div>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-500"
                  style={{ width: `${100 - vehiclePercent}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-sky-500 transition-all duration-500"
                  style={{ width: `${vehiclePercent}%` }}
                />
              </div>
            </div>

            {/* Mazda 2 Loan Card Highlight */}
            {loans.length > 0 && (
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Khoản vay xe đang theo dõi
                  </span>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Trả ngày {loans[0].payment_day} hàng tháng
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {loans[0].title}: Dư nợ gốc còn <b>{fmt(loans[0].remaining_balance)} ₫</b>. Định kỳ:{' '}
                  <b>{fmt(loans[0].monthly_payment)} ₫/tháng</b>.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Liên kết tự động với FMMS</span>
            <Link
              href="/fuel"
              className="font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              Xem nhật ký nhiên liệu & bảo dưỡng
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. WALLETS & PAYMENT ACCOUNTS STRIP
         ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-sky-500" />
            Tài khoản & Ví thanh toán
          </h2>
          <Link
            href="/family-finance/wallets"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            Quản lý tất cả ví ({wallets.length})
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {wallets.map((wallet) => {
            const IconComponent = getWalletIcon(wallet.wallet_type);
            const isCredit = wallet.wallet_type === 'CREDIT_CARD';
            const usedCredit = isCredit ? Math.max(0, (wallet.credit_limit || 0) - (wallet.current_balance || 0)) : 0;
            const creditUsageRatio = isCredit && wallet.credit_limit ? Math.round((usedCredit / wallet.credit_limit) * 100) : 0;

            return (
              <div
                key={wallet.id}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-sky-400 dark:hover:border-sky-600 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: wallet.color || '#0284c7' }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {wallet.wallet_type}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={wallet.name}>
                    {wallet.name}
                  </h3>
                  {wallet.bank_name && (
                    <p className="text-[10px] text-slate-400 truncate">{wallet.bank_name}</p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                    {fmt(wallet.current_balance)} ₫
                  </div>
                  {isCredit && wallet.credit_limit && (
                    <div className="mt-1 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Đã tiêu: {creditUsageRatio}%</span>
                        <span>HM: {fmt(wallet.credit_limit)}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${creditUsageRatio > 70 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, creditUsageRatio)}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-slate-400">
                        Sao kê {wallet.statement_day} • Hạn {wallet.payment_due_day}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. RECENT TRANSACTIONS LEDGER
         ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sky-500" />
              Giao dịch Gần nhất
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhật ký thu chi gia đình và các khoản chi tiêu liên quan đến xe
            </p>
          </div>
          <Link
            href="/family-finance/transactions"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            Xem tất cả sổ thu chi
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            Chưa có giao dịch nào trong tháng này.{' '}
            <button
              onClick={() => {
                setModalDefaultType('EXPENSE');
                setIsModalOpen(true);
              }}
              className="text-sky-600 font-bold underline"
            >
              Ghi chép ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700/60">
                <tr>
                  <th className="py-2.5 px-3">Ngày</th>
                  <th className="py-2.5 px-3">Hạng mục & Diễn giải</th>
                  <th className="py-2.5 px-3">Tài khoản / Ví</th>
                  <th className="py-2.5 px-3">Xe liên kết</th>
                  <th className="py-2.5 px-3 text-right">Số tiền</th>
                  <th className="py-2.5 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {transactions.slice(0, 10).map((tx) => {
                  const isExpense = tx.transaction_type === 'EXPENSE';
                  const isIncome = tx.transaction_type === 'INCOME';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-500">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tx.category?.color || '#94a3b8' }}
                          />
                          {tx.category?.name || 'Khác'}
                        </div>
                        {tx.payee_vendor && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {tx.payee_vendor} {tx.notes ? `• ${tx.notes}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {tx.wallet?.name || 'Ví'}
                          {tx.to_wallet && ` ➜ ${tx.to_wallet.name}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {tx.asset_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-[11px] font-bold">
                            <Car className="w-3 h-3" />
                            Mazda 2
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap font-mono font-bold">
                        <span
                          className={
                            isIncome
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isExpense
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-sky-600 dark:text-sky-400'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {fmt(tx.amount)} ₫
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="text-slate-400 hover:text-rose-600 text-[11px] font-medium transition-colors"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Transaction Modal */}
      <QuickTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        defaultType={modalDefaultType}
      />
    </div>
  );
}
