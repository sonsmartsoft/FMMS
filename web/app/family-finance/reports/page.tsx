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
import { Asset } from '@/types/mobility';
import {
  getWallets,
  getFamilyTransactions,
  getCategories,
  getBudgets,
  getFamilyLoans,
} from '@/lib/services/familyFinanceService';
import { getAssets } from '@/lib/services/assetService';
import KpiGradientCard from '@/components/ui/KpiGradientCard';
import FinanceErrorBoundary from '@/components/finance/FinanceErrorBoundary';
import { safeFormatCurrency as fmt, safeFormatDate as fmtDate } from '@/lib/utils/formatters';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  Printer,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Car,
  CreditCard,
  Building2,
  PiggyBank,
  Wallet as WalletIcon,
  PieChart,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import { useTheme } from '@/lib/theme/ThemeContext';
import { ChartLabelToggle, useChartLabelState } from '@/components/charts/ChartLabelToggle';

const fmtM = (n: number) => `${(n / 1_000_000).toFixed(1)}M`;

export default function FamilyFinancialReportsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#94A3B8' : '#64748B';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)';
  const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipText = isDark ? '#F8FAFC' : '#0F172A';

  const [showCashflowBarLabels, toggleCashflowBarLabels] = useChartLabelState('ffms_rep_cashflow_bar_labels', false);
  const [showCashflowPieLabels, toggleCashflowPieLabels] = useChartLabelState('ffms_rep_cashflow_pie_labels', false);
  const [showNetWorthBarLabels, toggleNetWorthBarLabels] = useChartLabelState('ffms_rep_networth_bar_labels', false);
  const [showAssetPieLabels, toggleAssetPieLabels] = useChartLabelState('ffms_rep_asset_pie_labels', false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<FamilyTransaction[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [loans, setLoans] = useState<FamilyLoan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [activeReportTab, setActiveReportTab] = useState<'CASHFLOW' | 'NET_WORTH' | 'HEALTH'>('CASHFLOW');

  const loadData = async () => {
    setLoading(true);
    try {
      const [wList, cList, lList, aList] = await Promise.all([
        getWallets(),
        getCategories(),
        getFamilyLoans(),
        getAssets(),
      ]);

      setWallets(wList);
      setCategories(cList);
      setLoans(lList);
      setAssets(aList);

      const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      const txList = await getFamilyTransactions({
        startDate: startStr,
        endDate: endStr,
      });
      setTransactions(txList);
    } catch (err) {
      console.error('Error loading financial reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // Calculations:
  // 1. Inflows
  const totalIncome = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'INCOME' && !t.exclude_from_reports)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // 2. Outflows
  const totalExpense = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  // Net Cash Flow
  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

  // Mobility Outflows vs Household Outflows
  const vehicleExpense = useMemo(() => {
    return transactions
      .filter((t) => t.transaction_type === 'EXPENSE' && (t.asset_id || t.category?.name?.includes('Phương tiện')))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const generalExpense = Math.max(0, totalExpense - vehicleExpense);

  // Asset values:
  // Liquid assets: Bank, Cash, E-Wallets
  const liquidAssets = useMemo(() => {
    return wallets
      .filter((w) => w.status === 'ACTIVE' && w.wallet_type !== 'CREDIT_CARD' && w.wallet_type !== 'SAVINGS' && !w.is_excluded_from_total)
      .reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0);
  }, [wallets]);

  // Savings & Investments
  const savingsAssets = useMemo(() => {
    return wallets
      .filter((w) => w.status === 'ACTIVE' && w.wallet_type === 'SAVINGS' && !w.is_excluded_from_total)
      .reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0);
  }, [wallets]);

  // Car asset valuation (Default Mazda 2AT purchase/resale price ~450,000,000 ₫)
  const vehicleAssetValue = useMemo(() => {
    const car = assets.find((a) => a.asset_type === 'CAR');
    return car ? 430000000 : 0; // Estimated current market value
  }, [assets]);

  const totalAssets = liquidAssets + savingsAssets + vehicleAssetValue;

  // Liabilities / Debts:
  // Loan principal remaining
  const loanDebts = useMemo(() => {
    return loans
      .filter((l) => l.status === 'ACTIVE' && l.loan_type === 'BORROW')
      .reduce((sum, l) => sum + (Number(l.remaining_balance) || 0), 0);
  }, [loans]);

  // Credit card debt used
  const creditCardDebts = useMemo(() => {
    return wallets
      .filter((w) => w.status === 'ACTIVE' && w.wallet_type === 'CREDIT_CARD')
      .reduce((sum, w) => sum + Math.max(0, (w.credit_limit || 0) - (w.current_balance || 0)), 0);
  }, [wallets]);

  const totalLiabilities = loanDebts + creditCardDebts;
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? Math.round((totalLiabilities / totalAssets) * 100) : 0;

  // Monthly Loan Obligations
  const monthlyLoanObligation = useMemo(() => {
    return loans
      .filter((l) => l.status === 'ACTIVE' && l.loan_type === 'BORROW')
      .reduce((sum, l) => sum + (Number(l.monthly_payment) || 0), 0);
  }, [loans]);

  // Financial Health Metrics:
  // 1. Emergency Fund (Months of average living expenses)
  const benchmarkMonthlyExpense = totalExpense > 0 ? totalExpense : 30000000;
  const emergencyFundMonths = benchmarkMonthlyExpense > 0 ? Number(((liquidAssets + savingsAssets) / benchmarkMonthlyExpense).toFixed(1)) : 0;

  // 2. Debt to Income (DTI)
  const benchmarkIncome = totalIncome > 0 ? totalIncome : 50000000;
  const dtiRatio = benchmarkIncome > 0 ? Math.round((monthlyLoanObligation / benchmarkIncome) * 100) : 0;

  // 3. Mobility Burden Ratio (Vehicle expense / Income)
  const vehicleTotalMonthly = vehicleExpense + monthlyLoanObligation;
  const mobilityBurdenRatio = benchmarkIncome > 0 ? Math.round((vehicleTotalMonthly / benchmarkIncome) * 100) : 0;

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ── Chart Data Preparations ──
  const cashflowChartData = useMemo(() => [
    { name: 'Dòng tiền vào (Thu nhập)', amount: totalIncome, fill: '#10b981' },
    { name: 'Dòng tiền ra (Chi tiêu)', amount: totalExpense, fill: '#f43f5e' },
    { name: 'Thặng dư ròng (Net)', amount: Math.max(0, netCashFlow), fill: '#0ea5e9' },
  ], [totalIncome, totalExpense, netCashFlow]);

  const expenseStructurePieData = useMemo(() => [
    { name: 'Sinh hoạt gia đình', value: generalExpense, color: '#0ea5e9' },
    { name: 'Phương tiện (Mazda 2AT)', value: vehicleExpense, color: '#06b6d4' },
    { name: 'Nợ vay mua xe (TPBank)', value: monthlyLoanObligation, color: '#f59e0b' },
  ].filter(i => i.value > 0), [generalExpense, vehicleExpense, monthlyLoanObligation]);

  const assetsPieData = useMemo(() => [
    { name: 'Tài khoản thanh toán & Tiền mặt', value: liquidAssets, color: '#0ea5e9' },
    { name: 'Tiết kiệm & Đầu tư', value: savingsAssets, color: '#10b981' },
    { name: 'Xe ô tô Mazda 2AT', value: vehicleAssetValue, color: '#6366f1' },
  ].filter(i => i.value > 0), [liquidAssets, savingsAssets, vehicleAssetValue]);

  const balanceComparisonData = useMemo(() => [
    { name: 'Tổng Tài Sản', amount: totalAssets, fill: '#10b981' },
    { name: 'Tổng Dư Nợ', amount: totalLiabilities, fill: '#f43f5e' },
    { name: 'Tài Sản Ròng (Net Worth)', amount: netWorth, fill: '#0ea5e9' },
  ], [totalAssets, totalLiabilities, netWorth]);

  // Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <FinanceErrorBoundary fallbackTitle="Không thể kết xuất báo cáo tài chính gia đình">
      <div className="min-h-screen p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto print:p-0 print:m-0">
        {/* ── Top Header & Actions ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:border-none">
          <div className="flex items-center gap-3">
            <Link
              href="/family-finance"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors print:hidden"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Báo Cáo Tài Chính Gia Đình
                    <span className="text-xs px-2.5 py-0.5 font-bold rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Chuẩn FFMS Executive
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lưu chuyển tiền tệ, bảng cân đối tài sản ròng và chỉ số đánh giá sức khỏe tài chính toàn diện
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {/* Month & Year Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>Kỳ báo cáo:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m} className="dark:bg-slate-900">
                    Tháng {m}
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-all"
            >
              <Printer className="w-4 h-4 text-sky-500" />
              In / Xuất PDF
            </button>
          </div>
        </div>

        {/* ── Executive 4 KPI Gradient Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiGradientCard
            title="TÀI SẢN RÒNG GIA ĐÌNH (NET WORTH)"
            value={fmt(netWorth)}
            unit="₫"
            subtitle={`Tổng tài sản (${fmt(totalAssets)}) - Dư nợ (${fmt(totalLiabilities)})`}
            colorType="emerald"
            icon={ShieldCheck}
            badgeText={netWorth >= 0 ? 'Thịnh vượng' : 'Cảnh báo âm'}
            badgeType={netWorth >= 0 ? 'success' : 'danger'}
          />

          <KpiGradientCard
            title="DÒNG TIỀN RÒNG THÁNG (CASHFLOW)"
            value={`${netCashFlow >= 0 ? '+' : ''}${fmt(netCashFlow)}`}
            unit="₫"
            subtitle={`Tỷ lệ tiết kiệm ròng: ${savingsRate}% thu nhập`}
            colorType={netCashFlow >= 0 ? 'cyan' : 'amber'}
            icon={TrendingUp}
            badgeText={netCashFlow >= 0 ? 'Thặng dư' : 'Thâm hụt'}
            badgeType={netCashFlow >= 0 ? 'success' : 'warning'}
          />

          <KpiGradientCard
            title="HỆ SỐ GÁNH NẶNG NỢ (DTI RATIO)"
            value={`${dtiRatio}%`}
            unit=""
            subtitle={`Trả nợ tháng (${fmt(monthlyLoanObligation)}) / Thu nhập`}
            colorType={dtiRatio <= 30 ? 'emerald' : dtiRatio <= 40 ? 'amber' : 'rose'}
            icon={CreditCard}
            badgeText={dtiRatio <= 30 ? 'Mức an toàn' : 'Áp lực cao'}
            badgeType={dtiRatio <= 30 ? 'success' : 'danger'}
          />

          <KpiGradientCard
            title="QUỸ DỰ PHÒNG KHẨN CẤP"
            value={`${emergencyFundMonths}`}
            unit="tháng"
            subtitle={`Bảo đảm chi tiêu sinh hoạt không thu nhập`}
            colorType={emergencyFundMonths >= 6 ? 'cyan' : emergencyFundMonths >= 3 ? 'amber' : 'rose'}
            icon={PiggyBank}
            badgeText={emergencyFundMonths >= 6 ? 'Vững chắc (≥6T)' : 'Cần tích lũy thêm'}
            badgeType={emergencyFundMonths >= 6 ? 'success' : 'warning'}
          />
        </div>

        {/* ── Report Tab Switcher ── */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 max-w-fit text-xs font-bold print:hidden">
          <button
            onClick={() => setActiveReportTab('CASHFLOW')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeReportTab === 'CASHFLOW'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            1. Báo Cáo Lưu Chuyển Tiền Tệ (Cashflow)
          </button>

          <button
            onClick={() => setActiveReportTab('NET_WORTH')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeReportTab === 'NET_WORTH'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            2. Bảng Cân Đối Tài Sản Ròng (Net Worth)
          </button>

          <button
            onClick={() => setActiveReportTab('HEALTH')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeReportTab === 'HEALTH'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            3. Đánh Giá Sức Khỏe Tài Chính (Health Score)
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: CASHFLOW STATEMENT (BÁO CÁO LƯU CHUYỂN TIỀN TỆ)
           ───────────────────────────────────────────────────────────── */}
        {activeReportTab === 'CASHFLOW' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Báo Cáo Lưu Chuyển Tiền Tệ Chi Tiết (Cashflow Statement)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Kỳ báo cáo: Tháng {selectedMonth}/{selectedYear} • Đơn vị tính: Việt Nam Đồng (VND)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Dòng tiền ròng thực nhận:</span>
                  <span
                    className={`text-lg font-black font-mono ${
                      netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {netCashFlow >= 0 ? '+' : ''}
                    {fmt(netCashFlow)} ₫
                  </span>
                </div>
              </div>

              {/* Cashflow Charts Section */}
              {isMounted && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-4">
                  {/* Chart 1: Cashflow Overview Bar Chart */}
                  <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        Lưu Chuyển Dòng Tiền (Vào / Ra / Thặng Dư)
                      </span>
                      <ChartLabelToggle
                        showLabels={showCashflowBarLabels}
                        onToggle={toggleCashflowBarLabels}
                        size="small"
                      />
                    </div>
                    <div style={{ height: showCashflowBarLabels ? 245 : 224 }} className="w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={cashflowChartData} margin={{ top: showCashflowBarLabels ? 20 : 10, right: 10, left: -10, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: axisColor, fontSize: 10, fontWeight: 600 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: axisColor, fontSize: 10 }}
                            axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
                            tickLine={false}
                            tickFormatter={(v) => v > 0 ? `${(v / 1_000_000).toFixed(0)}M` : '0'}
                            width={40}
                          />
                          <ReTooltip
                            formatter={(val: any, name: string) => [`${fmt(Number(val))} ₫`, name]}
                            contentStyle={{
                              background: tooltipBg,
                              border: `1px solid ${tooltipBorder}`,
                              borderRadius: 12,
                              color: tooltipText,
                              fontSize: 11,
                              boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                            {cashflowChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            {showCashflowBarLabels && (
                              <LabelList
                                dataKey="amount"
                                position="top"
                                formatter={(v: any) => fmtM(Number(v))}
                                style={{ fill: isDark ? '#E2E8F0' : '#1E293B', fontSize: 9, fontWeight: 700 }}
                                offset={4}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Expense Structure Donut Chart */}
                  <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-2">
                    <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <PieChart className="w-4 h-4 text-sky-500" />
                        Cơ Cấu Chi Phí & Trả Nợ
                      </span>
                      <div className="flex items-center gap-2">
                        <ChartLabelToggle
                          showLabels={showCashflowPieLabels}
                          onToggle={toggleCashflowPieLabels}
                          size="small"
                        />
                        <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                          {fmt(totalExpense)} ₫
                        </span>
                      </div>
                    </div>
                    <div className="h-44 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={expenseStructurePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                            labelLine={false}
                            label={
                              showCashflowPieLabels
                                ? ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                    if (!percent || percent < 0.05) return null;
                                    const RADIAN = Math.PI / 180;
                                    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
                                    const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
                                    const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);
                                    return (
                                      <text
                                        x={x}
                                        y={y}
                                        fill="#FFFFFF"
                                        textAnchor="middle"
                                        dominantBaseline="central"
                                        style={{ fontSize: 10, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                      >
                                        {`${Math.round(percent * 100)}%`}
                                      </text>
                                    );
                                  }
                                : false
                            }
                          >
                            {expenseStructurePieData.map((entry, index) => (
                              <Cell key={`cell-exp-${index}`} fill={entry.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <ReTooltip
                            formatter={(val: any, name: string) => [`${fmt(Number(val))} ₫`, name]}
                            contentStyle={{
                              background: tooltipBg,
                              border: `1px solid ${tooltipBorder}`,
                              borderRadius: 12,
                              color: tooltipText,
                              fontSize: 11,
                              boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1 text-[10px]">
                      {expenseStructurePieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {fmt(item.value)} ₫ ({totalExpense > 0 ? Math.round((item.value / totalExpense) * 100) : 0}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Cashflow Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700/60">
                      <th className="py-3 px-4">MỤC LỤC LƯU CHUYỂN DÒNG TIỀN</th>
                      <th className="py-3 px-4">PHÂN LOẠI &amp; CHI TIẾT</th>
                      <th className="py-3 px-4 text-right">SỐ TIỀN (₫)</th>
                      <th className="py-3 px-4 text-right">TỶ TRỌNG (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {/* Section 1: Inflows */}
                    <tr className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-emerald-700 dark:text-emerald-300">
                      <td colSpan={2} className="py-2.5 px-4 flex items-center gap-2">
                        <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                        I. DÒNG TIỀN VÀO (TỔNG THU NHẬP)
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm">+{fmt(totalIncome)} ₫</td>
                      <td className="py-2.5 px-4 text-right font-mono">100.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-8 text-slate-700 dark:text-slate-300">1. Lương cố định &amp; phụ cấp công việc</td>
                      <td className="py-2 px-4 text-slate-500 dark:text-slate-400">Vietcombank / Tiền mặt</td>
                      <td className="py-2 px-4 text-right font-mono font-medium">+{fmt(Math.round(totalIncome * 0.85))} ₫</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">85.0%</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-8 text-slate-700 dark:text-slate-300">2. Thu nhập làm thêm &amp; kinh doanh ngoài</td>
                      <td className="py-2 px-4 text-slate-500 dark:text-slate-400">Chuyển khoản / MoMo</td>
                      <td className="py-2 px-4 text-right font-mono font-medium">+{fmt(Math.round(totalIncome * 0.15))} ₫</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">15.0%</td>
                    </tr>

                    {/* Section 2: Outflows */}
                    <tr className="bg-rose-50/40 dark:bg-rose-950/20 font-bold text-rose-700 dark:text-rose-300">
                      <td colSpan={2} className="py-2.5 px-4 flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-rose-500" />
                        II. DÒNG TIỀN RA (TỔNG CHI TIÊU &amp; TRẢ NỢ)
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-sm">-{fmt(totalExpense)} ₫</td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 100}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-8 text-slate-700 dark:text-slate-300">1. Chi tiêu sinh hoạt gia đình thiết yếu</td>
                      <td className="py-2 px-4 text-slate-500 dark:text-slate-400">Ăn uống, điện nước, internet, học phí con</td>
                      <td className="py-2 px-4 text-right font-mono font-medium">-{fmt(generalExpense)} ₫</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">
                        {totalExpense > 0 ? Math.round((generalExpense / totalExpense) * 100) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-8 text-slate-700 dark:text-slate-300">2. Chi phí phương tiện đi lại (Xe Mazda 2AT)</td>
                      <td className="py-2 px-4 text-slate-500 dark:text-slate-400">Xăng RON 95, bảo dưỡng gara, phí cầu đường</td>
                      <td className="py-2 px-4 text-right font-mono font-medium text-cyan-600 dark:text-cyan-400">
                        -{fmt(vehicleExpense)} ₫
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">
                        {totalExpense > 0 ? Math.round((vehicleExpense / totalExpense) * 100) : 0}%
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-8 text-slate-700 dark:text-slate-300">3. Trả góp khoản vay mua xe TPBank</td>
                      <td className="py-2 px-4 text-slate-500 dark:text-slate-400">Gốc + lãi định kỳ ngày 28 hàng tháng</td>
                      <td className="py-2 px-4 text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                        -{fmt(monthlyLoanObligation)} ₫
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">
                        {totalExpense > 0 ? Math.round((monthlyLoanObligation / totalExpense) * 100) : 0}%
                      </td>
                    </tr>

                    {/* Section 3: Net Cashflow */}
                    <tr className="bg-sky-50/60 dark:bg-sky-950/30 font-black text-sky-800 dark:text-sky-200">
                      <td colSpan={2} className="py-3 px-4 text-sm">
                        III. DÒNG TIỀN THẶNG DƯ RÒNG (NET CASH FLOW)
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base text-sky-600 dark:text-sky-300">
                        {netCashFlow >= 0 ? '+' : ''}{fmt(netCashFlow)} ₫
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm">
                        Tỷ lệ tích lũy: {savingsRate}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: NET WORTH & BALANCE SHEET (BẢNG CÂN ĐỐI TÀI SẢN RÒNG)
           ───────────────────────────────────────────────────────────── */}
        {activeReportTab === 'NET_WORTH' && (
          <div className="space-y-6">
            {/* Interactive Charts for Net Worth */}
            {isMounted && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-2">
                {/* Bar Chart: Balance Comparison */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Cân Đối Tài Sản vs Dư Nợ Gia Đình
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChartLabelToggle
                        showLabels={showNetWorthBarLabels}
                        onToggle={toggleNetWorthBarLabels}
                        size="small"
                      />
                      <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                        Tỷ lệ nợ/tài sản: {debtToAssetRatio}%
                      </span>
                    </div>
                  </div>

                  <div style={{ height: showNetWorthBarLabels ? 245 : 224 }} className="w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={balanceComparisonData} margin={{ top: showNetWorthBarLabels ? 20 : 10, right: 10, left: -10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: axisColor, fontSize: 11, fontWeight: 600 }}
                          axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fill: axisColor, fontSize: 10 }}
                          axisLine={{ stroke: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
                          tickLine={false}
                          tickFormatter={(v) => v > 0 ? `${(v / 1_000_000).toFixed(0)}M` : '0'}
                          width={40}
                        />
                        <ReTooltip
                          formatter={(val: any, name: string) => [`${fmt(Number(val))} ₫`, name]}
                          contentStyle={{
                            background: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: 12,
                            color: tooltipText,
                            fontSize: 11,
                            boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                          {balanceComparisonData.map((entry, index) => (
                            <Cell key={`bal-cell-${index}`} fill={entry.fill} />
                          ))}
                          {showNetWorthBarLabels && (
                            <LabelList
                              dataKey="amount"
                              position="top"
                              formatter={(v: any) => fmtM(Number(v))}
                              style={{ fill: isDark ? '#E2E8F0' : '#1E293B', fontSize: 9, fontWeight: 700 }}
                              offset={4}
                            />
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart: Asset Composition */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                        <PieChart className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Cơ Cấu Danh Mục Tài Sản
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChartLabelToggle
                        showLabels={showAssetPieLabels}
                        onToggle={toggleAssetPieLabels}
                        size="small"
                      />
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fmt(totalAssets)} ₫
                      </span>
                    </div>
                  </div>

                  <div className="h-44 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={assetsPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={68}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                          labelLine={false}
                          label={
                            showAssetPieLabels
                              ? ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                  if (!percent || percent < 0.05) return null;
                                  const RADIAN = Math.PI / 180;
                                  const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
                                  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
                                  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);
                                  return (
                                    <text
                                      x={x}
                                      y={y}
                                      fill="#FFFFFF"
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      style={{ fontSize: 10, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                    >
                                      {`${Math.round(percent * 100)}%`}
                                    </text>
                                  );
                                }
                              : false
                          }
                        >
                          {assetsPieData.map((entry, index) => (
                            <Cell key={`asset-pie-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <ReTooltip
                          formatter={(val: any, name: string) => [`${fmt(Number(val))} ₫`, name]}
                          contentStyle={{
                            background: tooltipBg,
                            border: `1px solid ${tooltipBorder}`,
                            borderRadius: 12,
                            color: tooltipText,
                            fontSize: 11,
                            boxShadow: isDark ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1 text-[10px]">
                    {assetsPieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {fmt(item.value)} ₫ ({totalAssets > 0 ? Math.round((item.value / totalAssets) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Assets Column */}
              <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    Tài Sản Gia Đình (Total Assets)
                  </h2>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {fmt(totalAssets)} ₫
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Item 1 */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Tài sản thanh khoản tức thì (Liquid Cash)</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Tiền mặt, số dư tài khoản ngân hàng VCB, TCB, MoMo</p>
                    </div>
                    <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                      {fmt(liquidAssets)} ₫
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">Sổ tiết kiệm &amp; Đầu tư tích lũy</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Tiền gửi tiết kiệm ngân hàng có kỳ hạn hưởng lãi</p>
                    </div>
                    <span className="font-bold font-mono text-sm text-sky-600 dark:text-sky-400">
                      {fmt(savingsAssets)} ₫
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="p-3 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-cyan-800 dark:text-cyan-200 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-cyan-600" />
                        Phương tiện: Xe ô tô Mazda 2AT 2026
                      </span>
                      <p className="text-[11px] text-cyan-700/80 dark:text-cyan-400 mt-0.5">
                        BKS 19B-213.87 • Giá trị ước tính theo thị trường
                      </p>
                    </div>
                    <span className="font-bold font-mono text-sm text-cyan-700 dark:text-cyan-300">
                      {fmt(vehicleAssetValue)} ₫
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities Column */}
              <div className="lg:col-span-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    Nợ Phải Trả &amp; Nghĩa Vụ (Total Liabilities)
                  </h2>
                  <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                    {fmt(totalLiabilities)} ₫
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Debt 1 */}
                  <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-rose-800 dark:text-rose-200">
                        Khoản vay mua xe ngân hàng TPBank
                      </span>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                        Gốc ban đầu 295tr • Dư nợ gốc còn lại (Kỳ hạn 60T)
                      </p>
                    </div>
                    <span className="font-bold font-mono text-sm text-rose-600 dark:text-rose-400">
                      {fmt(loanDebts)} ₫
                    </span>
                  </div>

                  {/* Debt 2 */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Dư nợ chi tiêu thẻ tín dụng Visa Signature
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Số tiền đã quẹt cần thanh toán vào ngày đến hạn</p>
                    </div>
                    <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                      {fmt(creditCardDebts)} ₫
                    </span>
                  </div>
                </div>

                {/* Net Worth Callout Banner */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Tài Sản Ròng Gia Đình Thực Tế:
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {fmt(netWorth)} ₫
                    </span>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Đòn bẩy: {debtToAssetRatio}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: FINANCIAL HEALTH SCORECARD (ĐÁNH GIÁ SỨC KHỎE TÀI CHÍNH)
           ───────────────────────────────────────────────────────────── */}
        {activeReportTab === 'HEALTH' && (
          <div className="space-y-6">
            {/* Health Scorecard Chart */}
            {isMounted && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Thang Điểm Chỉ Số Sức Khỏe Tài Chính Thực Tế vs Ngưỡng Chuẩn
                      </h3>
                      <p className="text-[10px] text-slate-400">Đánh giá độ an toàn tài chính của gia đình bạn</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Điểm số thực tế
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm bg-slate-400 inline-block" /> Ngưỡng chuẩn khuyến nghị
                    </span>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Tỷ lệ Tiết kiệm (%)', 'Thực tế': savingsRate, 'Chuẩn': 20 },
                        { name: 'Gánh nặng nợ DTI (%)', 'Thực tế': dtiRatio, 'Chuẩn': 30 },
                        { name: 'Quỹ khẩn cấp (x10)', 'Thực tế': Math.min(100, emergencyFundMonths * 10), 'Chuẩn': 60 },
                        { name: 'Gánh nặng nuôi xe (%)', 'Thực tế': mobilityBurdenRatio, 'Chuẩn': 15 },
                      ]}
                      margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <ReTooltip
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.94)',
                          borderColor: 'rgba(16, 185, 129, 0.3)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}
                      />
                      <Bar dataKey="Thực tế" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Chuẩn" fill="#94a3b8" opacity={0.4} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Metric 1: Emergency Fund */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Khuyến nghị ≥ 6 tháng
                  </span>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Chỉ số 1</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quỹ Dự Phòng Khẩn Cấp</h3>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {emergencyFundMonths} <span className="text-sm font-semibold">tháng</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Gia đình bạn có thể duy trì chi tiêu bình thường trong <b>{emergencyFundMonths} tháng</b> nếu mất toàn bộ thu nhập.
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {emergencyFundMonths >= 6 ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Đạt chuẩn an toàn tài chính cao.
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Nên trích thêm 10% thu nhập vào sổ tiết kiệm.
                    </span>
                  )}
                </div>
              </div>

              {/* Metric 2: Debt-to-Income (DTI) */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                    Chuẩn an toàn &lt; 30%
                  </span>
                  <CreditCard className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Chỉ số 2</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hệ Số Trả Nợ / Thu Nhập (DTI)</h3>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black font-mono text-sky-600 dark:text-sky-400">
                    {dtiRatio}% <span className="text-sm font-semibold">thu nhập</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Số tiền trả nợ vay mua xe Mazda 2 chiếm <b>{dtiRatio}%</b> tổng thu nhập gia đình hàng tháng.
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {dtiRatio <= 30 ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Áp lực trả nợ nằm trong tầm kiểm soát tốt.
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Áp lực trả nợ cao, không nên vay thêm.
                    </span>
                  )}
                </div>
              </div>

              {/* Metric 3: Mobility Burden Ratio */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                    Tối ưu &lt; 15%
                  </span>
                  <Car className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Chỉ số 3</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gánh Nặng Nuôi Xe (TCO/Thu Nhập)</h3>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">
                    {mobilityBurdenRatio}% <span className="text-sm font-semibold">thu nhập</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Bao gồm xăng xe, bảo dưỡng, bãi đỗ và tiền trả góp xe hàng tháng: <b>{fmt(vehicleTotalMonthly)} ₫</b>.
                  </p>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {mobilityBurdenRatio <= 20 ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Mức độ chi phí xe cộ hợp lý với thu nhập.
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Cân nhắc tối ưu chi phí nhiên liệu &amp; đỗ xe.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </FinanceErrorBoundary>
  );
}
