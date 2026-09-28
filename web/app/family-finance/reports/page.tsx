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
import DraggableModal from '@/components/ui/DraggableModal';
import FinanceErrorBoundary from '@/components/finance/FinanceErrorBoundary';
import { safeFormatCurrency as fmt, safeFormatDate as fmtDate } from '@/lib/utils/formatters';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  TrendingUp,
  Search,
  ExternalLink,
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
  Clock,
  Users,
  Tag,
  ArrowRight,
  Activity,
  Flame,
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

const getPieLabelPercent = (percent: any) => {
  const n = Number(percent);
  if (isNaN(n) || n <= 0) return 0;
  return Math.round(n > 1 ? n : n * 100);
};

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
  const [selectedWalletId, setSelectedWalletId] = useState<string>('ALL');
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);
  const [activeReportTab, setActiveReportTab] = useState<'CASHFLOW' | 'NET_WORTH' | 'HEALTH'>('CASHFLOW');
  const [activeDrillModal, setActiveDrillModal] = useState<
    'NET_WORTH' | 'CASHFLOW' | 'DTI' | 'EMERGENCY' | 'INCOME' | 'EXPENSE' | 'MOBILITY' | null
  >(null);
  const [drillSearchQuery, setDrillSearchQuery] = useState('');

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

      const isAllYear = selectedMonth === 0;
      const startStr = isAllYear
        ? `${selectedYear}-01-01`
        : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
      const endDay = isAllYear
        ? 31
        : new Date(selectedYear, selectedMonth, 0).getDate();
      const endStr = isAllYear
        ? `${selectedYear}-12-31`
        : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

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

  // Filtered transactions by selected wallet
  const filteredTransactions = useMemo(() => {
    if (selectedWalletId === 'ALL') return transactions;
    return transactions.filter(
      (t) => t.wallet_id === selectedWalletId || t.to_wallet_id === selectedWalletId
    );
  }, [transactions, selectedWalletId]);

  // Calculations:
  // 1. Inflows
  const totalIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.transaction_type === 'INCOME' && !t.exclude_from_reports)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

  // 2. Outflows
  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

  // Net Cash Flow & Savings Rate
  const netCashFlow = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

  // Spendee Velocity Metrics (Average daily expense, Busiest day, Transactions count)
  const isAllYear = selectedMonth === 0;
  const daysInYear = (selectedYear % 4 === 0 && (selectedYear % 100 !== 0 || selectedYear % 400 === 0)) ? 366 : 365;
  const isCurrentYear = new Date().getFullYear() === selectedYear;
  const daysElapsedInYear = isCurrentYear
    ? Math.min(daysInYear, Math.floor((Date.now() - new Date(selectedYear, 0, 1).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : daysInYear;
  const daysInMonth = useMemo(() => isAllYear ? daysInYear : new Date(selectedYear, selectedMonth, 0).getDate(), [isAllYear, daysInYear, selectedMonth, selectedYear]);
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return now.getMonth() + 1 === selectedMonth && now.getFullYear() === selectedYear;
  }, [selectedMonth, selectedYear]);
  const daysElapsed = isAllYear ? daysElapsedInYear : (isCurrentMonth ? Math.min(daysInMonth, new Date().getDate()) : daysInMonth);
  const avgDailyExpense = Math.round(totalExpense / Math.max(1, daysElapsed));

  const busiestDayInfo = useMemo(() => {
    const dayOfWeekTotals: { [key: string]: number } = {
      'Thứ Hai': 0, 'Thứ Ba': 0, 'Thứ Tư': 0, 'Thứ Năm': 0, 'Thứ Sáu': 0, 'Thứ Bảy': 0, 'Chủ Nhật': 0,
    };
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dateTotals: { [key: string]: number } = {};

    filteredTransactions
      .filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports)
      .forEach((t) => {
        const amt = Number(t.amount || 0);
        dateTotals[t.date] = (dateTotals[t.date] || 0) + amt;
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          const dow = dayNames[d.getDay()];
          dayOfWeekTotals[dow] = (dayOfWeekTotals[dow] || 0) + amt;
        }
      });

    let maxDow = 'Chủ Nhật';
    let maxDowAmt = 0;
    Object.entries(dayOfWeekTotals).forEach(([dow, amt]) => {
      if (amt > maxDowAmt) {
        maxDowAmt = amt;
        maxDow = dow;
      }
    });

    let maxDate = '';
    let maxDateAmt = 0;
    Object.entries(dateTotals).forEach(([dt, amt]) => {
      if (amt > maxDateAmt) {
        maxDateAmt = amt;
        maxDate = dt;
      }
    });

    return {
      dow: maxDowAmt > 0 ? maxDow : 'N/A',
      dowAmt: maxDowAmt,
      date: maxDate ? (isAllYear ? fmtDate(maxDate) : `Ngày ${parseInt(maxDate.split('-')[2], 10)}`) : 'N/A',
      dateAmt: maxDateAmt,
    };
  }, [filteredTransactions, isAllYear]);

  const totalExpenseCount = useMemo(() => {
    return filteredTransactions.filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports).length;
  }, [filteredTransactions]);

  // Spendee & MISA Multi-Category Detailed Breakdown
  const categoryBreakdown = useMemo(() => {
    const expTxs = filteredTransactions.filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports);
    const total = expTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const map = new Map<string, {
      id: string;
      name: string;
      color: string;
      icon: string;
      amount: number;
      count: number;
      subcategories: { [key: string]: { name: string; amount: number; count: number } };
      members: { [key: string]: { name: string; amount: number; count: number } };
      transactions: FamilyTransaction[];
    }>();

    const defaultColors = ['#f59e0b', '#3b82f6', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#6366f1', '#f43f5e', '#64748b'];

    expTxs.forEach((t) => {
      const catName = t.category?.name || 'Chi tiêu khác';
      const catId = t.category_id || t.category?.id || catName;
      const color = t.category?.color || defaultColors[map.size % defaultColors.length];
      const icon = t.category?.icon || 'Tag';
      const amt = Number(t.amount || 0);

      if (!map.has(catId)) {
        map.set(catId, {
          id: catId,
          name: catName,
          color,
          icon,
          amount: 0,
          count: 0,
          subcategories: {},
          members: {},
          transactions: [],
        });
      }

      const catItem = map.get(catId)!;
      catItem.amount += amt;
      catItem.count += 1;
      catItem.transactions.push(t);

      // Subcategory breakdown
      const subName = t.description?.split('-')[0]?.trim() || t.payee_vendor || 'Chi phí tiêu chuẩn';
      if (!catItem.subcategories[subName]) {
        catItem.subcategories[subName] = { name: subName, amount: 0, count: 0 };
      }
      catItem.subcategories[subName].amount += amt;
      catItem.subcategories[subName].count += 1;

      // Member breakdown
      const memName = (t as any).user_member?.full_name || (t as any).created_by || 'Gia đình chung';
      if (!catItem.members[memName]) {
        catItem.members[memName] = { name: memName, amount: 0, count: 0 };
      }
      catItem.members[memName].amount += amt;
      catItem.members[memName].count += 1;
    });

    const list = Array.from(map.values())
      .sort((a, b) => b.amount - a.amount)
      .map((c, i) => ({
        ...c,
        color: c.color || defaultColors[i % defaultColors.length],
        percentage: total > 0 ? Math.round((c.amount / total) * 100) : 0,
      }));

    return { list, total };
  }, [filteredTransactions]);

  // Spendee Daily or Monthly Cashflow Trend
  const dailyCashflowData = useMemo(() => {
    if (selectedMonth === 0) {
      const arr = [];
      for (let m = 1; m <= 12; m++) {
        const mPrefix = `${selectedYear}-${String(m).padStart(2, '0')}`;
        const mTxs = filteredTransactions.filter((t) => t.date.startsWith(mPrefix) && !t.exclude_from_reports);
        const income = mTxs.filter((t) => t.transaction_type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
        const expense = mTxs.filter((t) => t.transaction_type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
        arr.push({
          day: `T${m}`,
          dayNum: m,
          date: `Tháng ${m}/${selectedYear}`,
          income,
          expense,
          net: income - expense,
        });
      }
      return arr;
    }
    const days = new Date(selectedYear, selectedMonth, 0).getDate();
    const arr = [];
    for (let d = 1; d <= days; d++) {
      const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTxs = filteredTransactions.filter((t) => t.date === dayStr && !t.exclude_from_reports);
      const income = dayTxs.filter((t) => t.transaction_type === 'INCOME').reduce((s, t) => s + Number(t.amount || 0), 0);
      const expense = dayTxs.filter((t) => t.transaction_type === 'EXPENSE').reduce((s, t) => s + Number(t.amount || 0), 0);
      arr.push({
        day: `N${d}`,
        dayNum: d,
        date: dayStr,
        income,
        expense,
        net: income - expense,
      });
    }
    return arr;
  }, [filteredTransactions, selectedMonth, selectedYear]);

  // Drilldown category detail
  const activeCategory = useMemo(() => {
    if (!selectedCategoryDetail) return null;
    return categoryBreakdown.list.find(
      (c) => c.id === selectedCategoryDetail || c.name === selectedCategoryDetail
    ) || null;
  }, [selectedCategoryDetail, categoryBreakdown]);

  // Active category daily trend (or monthly trend if all year)
  const activeCategoryDailyData = useMemo(() => {
    if (!activeCategory) return [];
    if (selectedMonth === 0) {
      const arr = [];
      for (let m = 1; m <= 12; m++) {
        const mPrefix = `${selectedYear}-${String(m).padStart(2, '0')}`;
        const mTxs = activeCategory.transactions.filter((t) => t.date.startsWith(mPrefix));
        const amount = mTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
        arr.push({
          day: `T${m}`,
          date: `Tháng ${m}/${selectedYear}`,
          amount,
        });
      }
      return arr;
    }
    const days = new Date(selectedYear, selectedMonth, 0).getDate();
    const arr = [];
    for (let d = 1; d <= days; d++) {
      const dayStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayTxs = activeCategory.transactions.filter((t) => t.date === dayStr);
      const amount = dayTxs.reduce((s, t) => s + Number(t.amount || 0), 0);
      arr.push({
        day: `N${d}`,
        date: dayStr,
        amount,
      });
    }
    return arr;
  }, [activeCategory, selectedMonth, selectedYear]);

  // Mobility Outflows vs Household Outflows
  const vehicleExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.transaction_type === 'EXPENSE' && (t.asset_id || t.category?.name?.includes('Phương tiện')))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [filteredTransactions]);

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

  const periodLabel = selectedMonth === 0 ? `Cả năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`;

  const drillTitle = useMemo(() => {
    switch (activeDrillModal) {
      case 'NET_WORTH':
        return `🏛️ Bảng Cân Đối Tài Sản Ròng & Thống Kê Nợ — ${periodLabel}`;
      case 'CASHFLOW':
        return `📊 Sổ Lưu Chuyển Dòng Tiền Toàn Bộ — ${periodLabel}`;
      case 'INCOME':
        return `💰 Danh Sách Chi Tiết Các Khoản Thu Nhập — ${periodLabel}`;
      case 'EXPENSE':
        return `💸 Danh Sách Chi Tiết Mọi Khoản Chi Tiêu — ${periodLabel}`;
      case 'MOBILITY':
        return `🚗 Chi Tiết Toàn Bộ Chi Phí Xe Cộ & Phương Tiện — ${periodLabel}`;
      case 'DTI':
        return `💳 Chi Tiết Các Khoản Vay & Nghĩa Vụ Trả Nợ (DTI) — ${periodLabel}`;
      case 'EMERGENCY':
        return `🛡️ Báo Cáo Quỹ Dự Phòng Khẩn Cấp & Khả Năng Thanh Khoản — ${periodLabel}`;
      default:
        return '';
    }
  }, [activeDrillModal, periodLabel]);

  const drillTransactions = useMemo(() => {
    if (!activeDrillModal) return [];
    let list: FamilyTransaction[] = [];
    if (activeDrillModal === 'INCOME') {
      list = filteredTransactions.filter((t) => t.transaction_type === 'INCOME' && !t.exclude_from_reports);
    } else if (activeDrillModal === 'EXPENSE') {
      list = filteredTransactions.filter((t) => t.transaction_type === 'EXPENSE' && !t.exclude_from_reports);
    } else if (activeDrillModal === 'MOBILITY') {
      list = filteredTransactions.filter(
        (t) =>
          t.transaction_type === 'EXPENSE' &&
          (t.asset_id ||
            t.category?.name?.includes('Phương tiện') ||
            t.category_id?.startsWith('cat-mob') ||
            t.category_id?.includes('car'))
      );
    } else if (activeDrillModal === 'CASHFLOW') {
      list = filteredTransactions.filter((t) => !t.exclude_from_reports);
    }

    if (!drillSearchQuery.trim()) return list;
    const q = drillSearchQuery.toLowerCase();
    return list.filter(
      (t) =>
        (t.description || '').toLowerCase().includes(q) ||
        (t.payee_vendor || '').toLowerCase().includes(q) ||
        (t.category?.name || '').toLowerCase().includes(q) ||
        (t.wallet?.name || '').toLowerCase().includes(q) ||
        String(t.amount || 0).includes(q)
    );
  }, [activeDrillModal, filteredTransactions, drillSearchQuery]);

  const drillTotal = useMemo(() => {
    if (activeDrillModal === 'INCOME') {
      return drillTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    }
    if (activeDrillModal === 'EXPENSE' || activeDrillModal === 'MOBILITY') {
      return drillTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
    }
    if (activeDrillModal === 'CASHFLOW') {
      const inc = drillTransactions
        .filter((t) => t.transaction_type === 'INCOME')
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = drillTransactions
        .filter((t) => t.transaction_type === 'EXPENSE')
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      return inc - exp;
    }
    return 0;
  }, [activeDrillModal, drillTransactions]);

  // Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <FinanceErrorBoundary fallbackTitle="Không thể kết xuất báo cáo tài chính gia đình">
      <div className="min-h-screen space-y-6 w-full print:p-0 print:m-0">
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
            {/* Wallet Filter (Spendee Style) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
              <WalletIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tài khoản:</span>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="bg-transparent font-bold focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="ALL" className="dark:bg-slate-900">
                  Tất cả ví ({wallets.length})
                </option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} className="dark:bg-slate-900">
                    {w.name} ({fmt(w.current_balance)} ₫)
                  </option>
                ))}
              </select>
            </div>

            {/* Month & Year Filter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>Kỳ báo cáo:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold focus:outline-none cursor-pointer"
              >
                <option value={0} className="dark:bg-slate-900 font-bold text-sky-600 dark:text-sky-400">
                  ⭐ Cả năm {selectedYear}
                </option>
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

        {/* ── Executive 4 KPI Gradient Cards (Clickable to Drill-Down) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiGradientCard
            title="TÀI SẢN RÒNG GIA ĐÌNH (NET WORTH)"
            value={fmt(netWorth)}
            unit="₫"
            subtitle={`Tổng tài sản (${fmt(totalAssets)}) - Dư nợ (${fmt(totalLiabilities)})`}
            colorType="emerald"
            icon={ShieldCheck}
            badgeText={netWorth >= 0 ? 'Thịnh vượng • Xem cân đối' : 'Cảnh báo âm • Xem cân đối'}
            badgeType={netWorth >= 0 ? 'success' : 'danger'}
            active={activeDrillModal === 'NET_WORTH'}
            onClick={() => setActiveDrillModal((prev) => (prev === 'NET_WORTH' ? null : 'NET_WORTH'))}
          />

          <KpiGradientCard
            title={selectedMonth === 0 ? `DÒNG TIỀN RÒNG NĂM ${selectedYear}` : `DÒNG TIỀN RÒNG THÁNG ${selectedMonth}/${selectedYear}`}
            value={`${netCashFlow >= 0 ? '+' : ''}${fmt(netCashFlow)}`}
            unit="₫"
            subtitle={`Tỷ lệ tiết kiệm ròng: ${savingsRate}% thu nhập`}
            colorType={netCashFlow >= 0 ? 'cyan' : 'amber'}
            icon={TrendingUp}
            badgeText={netCashFlow >= 0 ? 'Thặng dư • Xem sổ tiền' : 'Thâm hụt • Xem sổ tiền'}
            badgeType={netCashFlow >= 0 ? 'success' : 'warning'}
            active={activeDrillModal === 'CASHFLOW'}
            onClick={() => setActiveDrillModal((prev) => (prev === 'CASHFLOW' ? null : 'CASHFLOW'))}
          />

          <KpiGradientCard
            title="HỆ SỐ GÁNH NẶNG NỢ (DTI RATIO)"
            value={`${dtiRatio}%`}
            unit=""
            subtitle={`Trả nợ tháng (${fmt(monthlyLoanObligation)}) / Thu nhập`}
            colorType={dtiRatio <= 30 ? 'emerald' : dtiRatio <= 40 ? 'amber' : 'rose'}
            icon={CreditCard}
            badgeText={dtiRatio <= 30 ? 'Mức an toàn • Xem nợ' : 'Áp lực cao • Xem nợ'}
            badgeType={dtiRatio <= 30 ? 'success' : 'danger'}
            active={activeDrillModal === 'DTI'}
            onClick={() => setActiveDrillModal((prev) => (prev === 'DTI' ? null : 'DTI'))}
          />

          <KpiGradientCard
            title="QUỸ DỰ PHÒNG KHẨN CẤP"
            value={`${emergencyFundMonths}`}
            unit="tháng"
            subtitle={`Bảo đảm chi tiêu sinh hoạt không thu nhập`}
            colorType={emergencyFundMonths >= 6 ? 'cyan' : emergencyFundMonths >= 3 ? 'amber' : 'rose'}
            icon={PiggyBank}
            badgeText={emergencyFundMonths >= 6 ? 'Vững chắc (≥6T) • Xem ví' : 'Cần tích lũy • Xem ví'}
            badgeType={emergencyFundMonths >= 6 ? 'success' : 'warning'}
            active={activeDrillModal === 'EMERGENCY'}
            onClick={() => setActiveDrillModal((prev) => (prev === 'EMERGENCY' ? null : 'EMERGENCY'))}
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
                    Kỳ báo cáo: {selectedMonth === 0 ? `Cả năm ${selectedYear}` : `Tháng ${selectedMonth}/${selectedYear}`} • Đơn vị tính: Việt Nam Đồng (VND)
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

              {/* ── Spendee Velocity KPI Strip ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Chi tiêu TB / ngày</span>
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white">
                    {fmt(avgDailyExpense)} ₫
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Trung bình {daysElapsed} ngày trong kỳ
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Ngày chi nhiều nhất</span>
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                    {busiestDayInfo.dow}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {busiestDayInfo.date} ({fmt(busiestDayInfo.dateAmt)} ₫)
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tỷ lệ tiết kiệm ròng</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className={`text-base font-black font-mono ${savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : savingsRate >= 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {savingsRate}%
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {netCashFlow >= 0 ? `+${fmt(netCashFlow)} ₫` : `${fmt(netCashFlow)} ₫`}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Số lần giao dịch</span>
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                    {totalExpenseCount} giao dịch
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Phân bổ {categoryBreakdown.list.length} danh mục
                  </div>
                </div>
              </div>

              {/* ── Spendee Category Drill-Down View (When a category is active) ── */}
              {activeCategory ? (
                <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border-2 border-indigo-200 dark:border-indigo-800/80 space-y-5">
                  {/* Breadcrumb Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-indigo-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedCategoryDetail(null)}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-sm transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" /> Báo cáo tổng quan
                      </button>
                      <span className="text-slate-400">/</span>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activeCategory.color }} />
                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {activeCategory.name}
                        </h3>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedCategoryDetail(null)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                    >
                      ✕ Đóng chi tiết
                    </button>
                  </div>

                  {/* Category Top 3 Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Tổng chi danh mục</span>
                      <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                        -{fmt(activeCategory.amount)} ₫
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Chiếm {activeCategory.percentage}% tổng chi tiêu
                      </span>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Số lần giao dịch</span>
                      <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400">
                        {activeCategory.count} giao dịch
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Trong Tháng {selectedMonth}/{selectedYear}
                      </span>
                    </div>

                    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase">Chi tiêu trung bình / lần</span>
                      <span className="text-lg font-black font-mono text-sky-600 dark:text-sky-400">
                        {fmt(Math.round(activeCategory.amount / Math.max(1, activeCategory.count)))} ₫
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Giá trị hóa đơn trung bình
                      </span>
                    </div>
                  </div>

                  {/* Daily Category Changes Chart (Spendee Desktop Style) */}
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                      <span>Biến động chi tiêu danh mục ({activeCategory.name} - Ngày 1 đến {daysInMonth})</span>
                      <span className="text-[11px] font-mono text-slate-400">Đơn vị: ₫</span>
                    </div>
                    <div style={{ height: 160 }} className="w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activeCategoryDailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                          <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 9 }} tickLine={false} />
                          <YAxis tick={{ fill: axisColor, fontSize: 9 }} tickLine={false} tickFormatter={(v) => v > 0 ? `${(v / 1_000_000).toFixed(1)}M` : '0'} />
                          <ReTooltip
                            formatter={(val: any) => [`${fmt(Number(val))} ₫`, 'Chi tiêu']}
                            contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 11 }}
                          />
                          <Bar dataKey="amount" fill={activeCategory.color} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 2 Split Panels: Subcategories & People */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Subcategories (Danh mục con) */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-sky-500" />
                        Phân bổ theo Danh mục con ({Object.keys(activeCategory.subcategories).length})
                      </span>
                      <div className="space-y-2.5">
                        {Object.values(activeCategory.subcategories).map((sub) => {
                          const subPct = activeCategory.amount > 0 ? Math.round((sub.amount / activeCategory.amount) * 100) : 0;
                          return (
                            <div key={sub.name} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-700 dark:text-slate-300">{sub.name} ({sub.count} lần)</span>
                                <span className="font-mono text-slate-900 dark:text-white">{fmt(sub.amount)} ₫ ({subPct}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${subPct}%`, backgroundColor: activeCategory.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* People / Members (Thành viên chi tiêu) */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        Thành viên chi tiêu ({Object.keys(activeCategory.members).length})
                      </span>
                      <div className="space-y-2.5">
                        {Object.values(activeCategory.members).map((mem) => {
                          const memPct = activeCategory.amount > 0 ? Math.round((mem.amount / activeCategory.amount) * 100) : 0;
                          return (
                            <div key={mem.name} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-700 dark:text-slate-300">{mem.name} ({mem.count} giao dịch)</span>
                                <span className="font-mono text-slate-900 dark:text-white">{fmt(mem.amount)} ₫ ({memPct}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${memPct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details in this category */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Lịch sử giao dịch chi tiết ({activeCategory.transactions.length})
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                      {activeCategory.transactions.slice(0, 15).map((t) => (
                        <div key={t.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {t.description || t.payee_vendor || activeCategory.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t.date} • {t.wallet?.name || 'Ví thanh toán'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                            -{fmt(t.amount)} ₫
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Spendee Category Donut & Interactive List + Daily Cashflow ── */
                isMounted && (
                  <div className="space-y-6">
                    {/* Row 1: Spendee Donut + Interactive Category List */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Donut Chart */}
                      <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <PieChart className="w-4 h-4 text-sky-500" />
                            Cơ Cấu Chi Tiêu (Spendee Donut)
                          </span>
                          <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                            {fmt(totalExpense)} ₫
                          </span>
                        </div>

                        <div className="h-52 w-full relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                              <Pie
                                data={categoryBreakdown.list}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="amount"
                                nameKey="name"
                                onClick={(entry: any) => setSelectedCategoryDetail(entry.id)}
                                cursor="pointer"
                              >
                                {categoryBreakdown.list.map((entry, index) => (
                                  <Cell key={`cell-cat-${index}`} fill={entry.color} stroke="transparent" />
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
                                }}
                              />
                            </RePieChart>
                          </ResponsiveContainer>
                          {/* Donut Center Display */}
                          <div className="absolute text-center pointer-events-none">
                            <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">TỔNG CHI</span>
                            <span className="text-sm font-black font-mono text-slate-900 dark:text-white">
                              {totalExpense > 0 ? fmt(totalExpense) : '0'}
                            </span>
                            <span className="text-[10px] text-slate-400 block">VNĐ</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-center text-slate-400">
                          💡 Bấm vào từng lát bánh hoặc danh mục bên cạnh để xem phân tích sâu
                        </p>
                      </div>

                      {/* Interactive Category List (Spendee Phone List Style) */}
                      <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700/60">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Danh Mục Chi Tiêu ({categoryBreakdown.list.length})
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {totalExpenseCount} giao dịch
                          </span>
                        </div>

                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {categoryBreakdown.list.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategoryDetail(cat.id)}
                              className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition-all flex items-center justify-between text-left group"
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {cat.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {cat.count} giao dịch • {cat.percentage}% tổng chi
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                                  -{fmt(cat.amount)} ₫
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Spendee Daily Cashflow Trend (31 days) */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                            {selectedMonth === 0 ? `Biến Động Dòng Tiền 12 Tháng Trong Năm (Monthly Cashflow Trend)` : `Biến Động Dòng Tiền ${daysInMonth} Ngày Trong Kỳ (Daily Cashflow Trend)`}
                          </span>
                          <p className="text-[11px] text-slate-400">
                            {selectedMonth === 0 ? 'Theo dõi nhịp thu chi 12 tháng: Cột xanh (Thu nhập vào), Cột đỏ (Chi tiêu ra)' : 'Theo dõi nhịp thu chi từng ngày: Cột xanh (Thu nhập vào), Cột đỏ (Chi tiêu ra)'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Thu vào
                          </span>
                          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Chi ra
                          </span>
                        </div>
                      </div>

                      <div style={{ height: 200 }} className="w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dailyCashflowData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 9 }} tickLine={false} />
                            <YAxis
                              tick={{ fill: axisColor, fontSize: 9 }}
                              tickLine={false}
                              tickFormatter={(v) => v > 0 ? `${(v / 1_000_000).toFixed(0)}M` : '0'}
                            />
                            <ReTooltip
                              formatter={(val: any, name: string) => [
                                `${fmt(Number(val))} ₫`,
                                name === 'income' ? 'Thu nhập' : 'Chi tiêu',
                              ]}
                              contentStyle={{
                                background: tooltipBg,
                                border: `1px solid ${tooltipBorder}`,
                                borderRadius: 10,
                                fontSize: 11,
                              }}
                            />
                            <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="expense" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )
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
                    <tr
                      onClick={() => setActiveDrillModal('INCOME')}
                      className="bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors group"
                      title="Bấm để mở danh sách chi tiết các khoản thu nhập"
                    >
                      <td colSpan={2} className="py-2.5 px-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                          I. DÒNG TIỀN VÀO (TỔNG THU NHẬP)
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          🔍 Chi tiết thu nhập
                        </span>
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
                    <tr
                      onClick={() => setActiveDrillModal('EXPENSE')}
                      className="bg-rose-50/40 dark:bg-rose-950/20 font-bold text-rose-700 dark:text-rose-300 cursor-pointer hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-colors group"
                      title="Bấm để mở danh sách chi tiết các khoản chi tiêu"
                    >
                      <td colSpan={2} className="py-2.5 px-4 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4 text-rose-500" />
                          II. DÒNG TIỀN RA (TỔNG CHI TIÊU &amp; TRẢ NỢ)
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                          🔍 Chi tiết chi tiêu
                        </span>
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
                    <tr
                      onClick={() => setActiveDrillModal('MOBILITY')}
                      className="cursor-pointer hover:bg-cyan-50/60 dark:hover:bg-cyan-950/30 transition-colors group"
                      title="Bấm để mở chi tiết mọi khoản chi xe cộ"
                    >
                      <td className="py-2 px-8 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                        <span>2. Chi phí phương tiện đi lại (Xe Mazda 2AT)</span>
                        <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity">
                          🔍 Chi tiết xe
                        </span>
                      </td>
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
                    <tr
                      onClick={() => setActiveDrillModal('CASHFLOW')}
                      className="bg-sky-50/60 dark:bg-sky-950/30 font-black text-sky-800 dark:text-sky-200 cursor-pointer hover:bg-sky-100/70 dark:hover:bg-sky-900/50 transition-colors group"
                      title="Bấm để mở toàn bộ nhật ký lưu chuyển dòng tiền"
                    >
                      <td colSpan={2} className="py-3 px-4 text-sm flex items-center justify-between">
                        <span>III. DÒNG TIỀN THẶNG DƯ RÒNG (NET CASH FLOW)</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all">
                          🔍 Toàn bộ dòng tiền
                        </span>
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
                                  const pct = getPieLabelPercent(percent);
                                  if (pct < 3) return null;
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
                                      {`${pct}%`}
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

        {/* ── DrillDownModal (Itemized Drill-down Ledger & Breakdown) ── */}
        {activeDrillModal && (
          <DrillDownModal
            title={drillTitle}
            onClose={() => {
              setActiveDrillModal(null);
              setDrillSearchQuery('');
            }}
          >
            {/* 1. NET WORTH DRILL-DOWN */}
            {activeDrillModal === 'NET_WORTH' && (
              <div className="space-y-5 text-xs">
                {/* 4 Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tài Sản</span>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {fmt(totalAssets)} ₫
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Dư Nợ Phải Trả</span>
                    <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                      {fmt(totalLiabilities)} ₫
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tài Sản Ròng (Net Worth)</span>
                    <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400">
                      {fmt(netWorth)} ₫
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Đòn Bẩy Nợ (D/A)</span>
                    <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                      {debtToAssetRatio}%
                    </span>
                  </div>
                </div>

                {/* 3 Detail Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Liquid Assets */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60 font-bold">
                      <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                        <WalletIcon className="w-4 h-4" /> 1. Tài Sản Thanh Khoản
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white">{fmt(liquidAssets)} ₫</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {wallets
                        .filter((w) => w.status === 'ACTIVE' && w.wallet_type !== 'CREDIT_CARD' && w.wallet_type !== 'SAVINGS' && !w.is_excluded_from_total)
                        .map((w) => (
                          <div key={w.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{w.name}</span>
                              <span className="text-[10px] text-slate-400">{w.bank_name || 'Ví tiền'} • {w.wallet_type}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{fmt(w.current_balance)} ₫</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Column 2: Savings & Vehicle Assets */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60 font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <PiggyBank className="w-4 h-4" /> 2. Tiết Kiệm &amp; Phương Tiện
                      </span>
                      <span className="font-mono text-slate-900 dark:text-white">{fmt(savingsAssets + vehicleAssetValue)} ₫</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {wallets
                        .filter((w) => w.status === 'ACTIVE' && w.wallet_type === 'SAVINGS' && !w.is_excluded_from_total)
                        .map((w) => (
                          <div key={w.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{w.name}</span>
                              <span className="text-[10px] text-emerald-500 font-semibold">Sổ tiết kiệm / Đầu tư</span>
                            </div>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(w.current_balance)} ₫</span>
                          </div>
                        ))}
                      {vehicleAssetValue > 0 && (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">🚗 Xe Mazda 2AT Luxury</span>
                            <span className="text-[10px] text-indigo-500 font-semibold">Định giá thị trường hiện tại</span>
                          </div>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(vehicleAssetValue)} ₫</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 3: Liabilities / Debts */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700/60 font-bold">
                      <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                        <CreditCard className="w-4 h-4" /> 3. Dư Nợ Phải Trả
                      </span>
                      <span className="font-mono text-rose-600 dark:text-rose-400">-{fmt(totalLiabilities)} ₫</span>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {loans
                        .filter((l) => l.status === 'ACTIVE' && l.loan_type === 'BORROW')
                        .map((l) => (
                          <div key={l.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{l.lender_borrower_name || l.title || 'Khoản vay'}</span>
                              <span className="text-[10px] text-slate-400">Gốc ban đầu {fmt(l.principal_amount)} ₫ • {l.interest_rate_percent}%/năm</span>
                            </div>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">-{fmt(l.remaining_balance)} ₫</span>
                          </div>
                        ))}
                      {wallets
                        .filter((w) => w.status === 'ACTIVE' && w.wallet_type === 'CREDIT_CARD')
                        .map((w) => {
                          const used = Math.max(0, (w.credit_limit || 0) - (w.current_balance || 0));
                          return (
                            <div key={w.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">{w.name}</span>
                                <span className="text-[10px] text-slate-400">Hạn mức {fmt(w.credit_limit || 0)} ₫</span>
                              </div>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">-{fmt(used)} ₫</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. DTI DRILL-DOWN */}
            {activeDrillModal === 'DTI' && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trả Nợ Hàng Tháng</span>
                    <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                      {fmt(monthlyLoanObligation)} ₫/tháng
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thu Nhập Hàng Tháng (Benchmark)</span>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {fmt(benchmarkIncome)} ₫/tháng
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hệ Số DTI Thực Tế</span>
                    <span className={`text-base font-black font-mono ${dtiRatio <= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {dtiRatio}% thu nhập
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-500" /> Danh Sách Các Khoản Vay Đang Hoạt Động
                  </h4>
                  <div className="space-y-2">
                    {loans.filter((l) => l.status === 'ACTIVE' && l.loan_type === 'BORROW').map((l) => (
                      <div key={l.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-white block">{l.lender_borrower_name || l.title || 'Khoản vay'}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Số tiền vay: {fmt(l.principal_amount)} ₫ • Lãi suất: {l.interest_rate_percent}%/năm • Kỳ hạn: {l.term_months || 0} tháng
                          </span>
                          <span className="text-[11px] text-indigo-500 font-semibold block">
                            Ngày đóng: Ngày {l.payment_day || 28} hàng tháng
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase">Dư nợ còn lại</span>
                          <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                            {fmt(l.remaining_balance)} ₫
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 block">
                            Trả tháng: {fmt(l.monthly_payment)} ₫
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. EMERGENCY FUND DRILL-DOWN */}
            {activeDrillModal === 'EMERGENCY' && (
              <div className="space-y-5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Thời Gian Chống Chịu</span>
                    <span className={`text-base font-black font-mono ${emergencyFundMonths >= 6 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                      {emergencyFundMonths} tháng chi tiêu
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mức Chi Tiêu Cơ Sở / Tháng</span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {fmt(benchmarkMonthlyExpense)} ₫
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Quỹ Khả Dụng (Tiền &amp; Sổ)</span>
                    <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {fmt(liquidAssets + savingsAssets)} ₫
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-emerald-500" /> Nguồn Tiền Khả Dụng Ngay Cho Quỹ Khẩn Cấp
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wallets
                      .filter((w) => w.status === 'ACTIVE' && w.wallet_type !== 'CREDIT_CARD' && !w.is_excluded_from_total)
                      .map((w) => (
                        <div key={w.id} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{w.name}</span>
                            <span className="text-[10px] text-slate-400">{w.bank_name || 'Ví tiền'} • {w.wallet_type === 'SAVINGS' ? 'Sổ tiết kiệm' : 'Thanh khoản nhanh'}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(w.current_balance)} ₫</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. TRANSACTION-BASED DRILL-DOWNS (CASHFLOW, INCOME, EXPENSE, MOBILITY) */}
            {(activeDrillModal === 'CASHFLOW' || activeDrillModal === 'INCOME' || activeDrillModal === 'EXPENSE' || activeDrillModal === 'MOBILITY') && (
              <div className="space-y-4 text-xs">
                {/* Search & Stat Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm giao dịch, người nhận, ví, số tiền..."
                      value={drillSearchQuery}
                      onChange={(e) => setDrillSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Tổng ({drillTransactions.length} giao dịch)
                      </span>
                      <span className={`text-base font-black font-mono ${drillTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {drillTotal >= 0 ? '+' : ''}{fmt(drillTotal)} ₫
                      </span>
                    </div>

                    <Link
                      href="/family-finance/transactions"
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 rounded-lg shadow-sm transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Sổ giao dịch
                    </Link>
                  </div>
                </div>

                {/* Transaction Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 max-h-[55vh] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Ngày</th>
                        <th className="py-2.5 px-3">Hạng mục</th>
                        <th className="py-2.5 px-3">Nội dung &amp; Đối tác</th>
                        <th className="py-2.5 px-3">Tài khoản ví</th>
                        <th className="py-2.5 px-3">Gắn xe</th>
                        <th className="py-2.5 px-3 text-right">Số tiền (₫)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {drillTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        drillTransactions.map((tx) => {
                          const isInc = tx.transaction_type === 'INCOME';
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                {tx.date}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{
                                    backgroundColor: tx.category?.color ? `${tx.category.color}20` : 'rgba(14,165,233,0.1)',
                                    color: tx.category?.color || '#0ea5e9',
                                  }}
                                >
                                  {tx.category?.name || 'Khác'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                  {tx.description || tx.payee_vendor || 'Không có mô tả'}
                                </span>
                                {tx.payee_vendor && tx.description && (
                                  <span className="text-[10px] text-slate-400">Đối tác: {tx.payee_vendor}</span>
                                )}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                {tx.wallet?.name || 'Ví thanh toán'}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {tx.asset_id ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300">
                                    🚗 Mazda 2AT
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">—</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                                <span className={isInc ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {isInc ? '+' : '-'}{fmt(tx.amount)} ₫
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </DrillDownModal>
        )}
      </div>
    </FinanceErrorBoundary>
  );
}

function DrillDownModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <DraggableModal
      isOpen={true}
      onClose={onClose}
      title={title}
      className="w-[95vw] sm:w-[90vw] md:w-[1200px] max-w-[1200px]"
    >
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-5 no-drag text-slate-900 dark:text-slate-100 max-h-[80vh]"
        style={{ cursor: 'auto' }}
      >
        {children}
      </div>
    </DraggableModal>
  );
}
